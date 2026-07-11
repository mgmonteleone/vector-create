/**
 * Boot all three faces (REST http, gRPC, MCP streamable-http) over one shared
 * {@link Operations} instance and a single VectorAgent that is closed on
 * shutdown. Ports are configurable via PORT_REST / PORT_GRPC / PORT_MCP.
 *
 * Defaults: REST 8787, gRPC 50051, MCP 8788.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import * as grpc from "@grpc/grpc-js";
import { serve } from "@hono/node-server";
import { createAgent } from "./agent";
import { createGrpcServer } from "./faces/grpc";
import { createMcpServer, createStreamableHttpTransport } from "./faces/mcp";
import { createRestApp } from "./faces/rest";
import { Operations } from "./operations";

const PORT_REST = Number(process.env.PORT_REST ?? 8787);
const PORT_GRPC = Number(process.env.PORT_GRPC ?? 50051);
const PORT_MCP = Number(process.env.PORT_MCP ?? 8788);

async function main(): Promise<void> {
  const agent = await createAgent();
  const ops = new Operations({ agent });

  // --- REST (Hono over the node adapter for an explicit port) ---
  const restApp = createRestApp(ops);
  const restServer = serve({ fetch: restApp.fetch, port: PORT_REST });
  log(`REST  listening on http://localhost:${PORT_REST}`);

  // --- gRPC ---
  const grpcServer = createGrpcServer(ops);
  await new Promise<void>((resolve, reject) => {
    grpcServer.bindAsync(`0.0.0.0:${PORT_GRPC}`, grpc.ServerCredentials.createInsecure(), (err) =>
      err ? reject(err) : resolve()
    );
  });
  log(`gRPC  listening on 0.0.0.0:${PORT_GRPC}`);

  // --- MCP (streamable-http, stateless: one transport+server per request) ---
  const mcpHttp = createServer((req, res) => {
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
  mcpHttp.listen(PORT_MCP, () => log(`MCP   listening on http://localhost:${PORT_MCP}/mcp`));

  const shutdown = async () => {
    log("shutting down…");
    restServer.close();
    mcpHttp.close();
    grpcServer.forceShutdown();
    await ops.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

/** Handle a single stateless MCP HTTP request. */
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
