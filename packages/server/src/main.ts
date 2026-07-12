/**
 * Boot the public HTTP surface (REST + SPA + MCP path) and optional internal
 * faces over one shared {@link Operations} instance and a single VectorAgent
 * closed on shutdown.
 *
 * Cloud Run / single-port mode (default when `PORT` is set, or when
 * `SERVE_SINGLE_PORT=1`):
 *   - Public HTTP on `$PORT` (fallback 8787): REST API, MCP at `/mcp`, SPA static
 *   - Optional gRPC still binds PORT_GRPC (default 50051) for in-cluster use
 *
 * Multi-port local/dev mode (default when `PORT` is unset):
 *   - REST 8787, gRPC 50051, MCP 8788 — same as the original three-face boot.
 *
 * Env:
 *   PORT / PORT_REST / PORT_GRPC / PORT_MCP
 *   SERVE_SINGLE_PORT=1          force single public HTTP port
 *   SPA_DIST=/path/to/spa/dist   serve the SPA from this dir (single-port)
 *   ENABLE_GRPC=0                skip gRPC bind (default: on)
 */
import { existsSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize } from "node:path";
import * as grpc from "@grpc/grpc-js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createAgent } from "./agent";
import { createGrpcServer } from "./faces/grpc";
import { createMcpServer, createStreamableHttpTransport } from "./faces/mcp";
import { createRestApp } from "./faces/rest";
import { Operations } from "./operations";

const SINGLE_PORT =
  process.env.SERVE_SINGLE_PORT === "1" ||
  process.env.SERVE_SINGLE_PORT === "true" ||
  process.env.PORT != null;

const PORT_PUBLIC = Number(process.env.PORT ?? process.env.PORT_REST ?? 8787);
const PORT_REST = Number(process.env.PORT_REST ?? 8787);
const PORT_GRPC = Number(process.env.PORT_GRPC ?? 50051);
const PORT_MCP = Number(process.env.PORT_MCP ?? 8788);
const ENABLE_GRPC = process.env.ENABLE_GRPC !== "0" && process.env.ENABLE_GRPC !== "false";
const SPA_DIST = process.env.SPA_DIST?.trim() || "";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".map": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function main(): Promise<void> {
  const agent = await createAgent();
  const ops = new Operations({ agent });
  log(`agent mode=${agent.mode} available=${agent.available}`);

  let restServer: { close: () => void } | null = null;
  let mcpHttp: ReturnType<typeof createServer> | null = null;
  let grpcServer: grpc.Server | null = null;

  if (SINGLE_PORT) {
    // One public HTTP port: REST + MCP path + SPA (Cloud Run friendly).
    const app = buildPublicApp(ops);
    restServer = serve({ fetch: app.fetch, port: PORT_PUBLIC, hostname: "0.0.0.0" });
    log(`public HTTP listening on 0.0.0.0:${PORT_PUBLIC} (REST + /mcp${SPA_DIST ? " + SPA" : ""})`);
  } else {
    const restApp = createRestApp(ops);
    restServer = serve({ fetch: restApp.fetch, port: PORT_REST, hostname: "0.0.0.0" });
    log(`REST  listening on http://0.0.0.0:${PORT_REST}`);

    mcpHttp = createServer((req, res) => {
      if (req.method === "GET" && req.url === "/healthz") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }
      handleMcpRequest(ops, req, res).catch((err) => {
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
        }
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      });
    });
    mcpHttp.listen(PORT_MCP, "0.0.0.0", () => log(`MCP   listening on http://0.0.0.0:${PORT_MCP}/mcp`));
  }

  if (ENABLE_GRPC) {
    grpcServer = createGrpcServer(ops);
    await new Promise<void>((resolve, reject) => {
      grpcServer!.bindAsync(`0.0.0.0:${PORT_GRPC}`, grpc.ServerCredentials.createInsecure(), (err) =>
        err ? reject(err) : resolve()
      );
    });
    log(`gRPC  listening on 0.0.0.0:${PORT_GRPC}`);
  }

  const shutdown = async () => {
    log("shutting down\u2026");
    restServer?.close();
    mcpHttp?.close();
    grpcServer?.forceShutdown();
    await ops.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

/** Build the single-port Hono app: REST routes + MCP path + SPA static files. */
function buildPublicApp(ops: Operations): Hono {
  const app = new Hono();
  const rest = createRestApp(ops);
  app.route("/", rest);

  // Full MCP streamable-http still binds PORT_MCP in multi-port mode. On the
  // single public Cloud Run port we expose REST + SPA only for the first deploy.
  app.all("/mcp", (c) =>
    c.json(
      {
        error:
          "MCP streamable-http is not mounted on the single public port in this revision. Use REST /api/* for the hosted demo, or run multi-port mode (unset PORT) to serve MCP on PORT_MCP.",
        rest: ["/api/concepts", "/api/render", "/api/steer", "/api/variations", "/api/export/png"],
      },
      501
    )
  );

  if (SPA_DIST && existsSync(SPA_DIST)) {
    app.get("*", (c) => {
      const url = new URL(c.req.url);
      let path = decodeURIComponent(url.pathname);
      if (path === "/" || path === "") path = "/index.html";
      // Prevent path escape outside SPA_DIST.
      let file = normalize(join(SPA_DIST, path));
      if (!file.startsWith(normalize(SPA_DIST))) {
        return c.text("forbidden", 403);
      }
      if (!existsSync(file)) {
        file = join(SPA_DIST, "index.html");
      }
      const body = readFileSync(file);
      const type = MIME[extname(file)] ?? "application/octet-stream";
      return c.body(body, 200, { "Content-Type": type });
    });
    log(`SPA static root: ${SPA_DIST}`);
  } else if (SPA_DIST) {
    log(`SPA_DIST set but missing: ${SPA_DIST}`);
  }

  return app;
}

/** Handle a single stateless MCP HTTP request (multi-port Node server). */
async function handleMcpRequest(
  ops: Operations,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const body = await readJsonBody(req);
  const server = createMcpServer(ops);
  const transport = createStreamableHttpTransport();
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) {
    return undefined;
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : undefined;
}

function log(msg: string): void {
  process.stdout.write(`[vector-create/server] ${msg}\n`);
}

main().catch((err) => {
  process.stderr.write(`[vector-create/server] fatal: ${err instanceof Error ? err.stack : err}\n`);
  process.exit(1);
});
