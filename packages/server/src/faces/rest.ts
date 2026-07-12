/**
 * REST face (Hono). A thin adapter: it parses JSON, calls the shared
 * {@link Operations} layer, and serializes the result. No business logic lives
 * here — that is the whole point of the operations module.
 */
import type { Genome } from "@vector-create/core";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Operations } from "../operations";

type Bias = Record<string, 1 | -1>;

/** JSON body shapes accepted by the REST endpoints. */
type RenderBody = { conceptId: string; genome?: Genome; prefix?: string };
type SteerBody = { conceptId: string; genome?: Genome; prompt: string };
type VariationsBody = {
  conceptId: string;
  n?: number;
  seed?: number;
  anchor?: Genome;
  bias?: Bias;
  rate?: number;
};
type CreateConceptBody = { description: string };
type ExportPngBody = { svg: string; width?: number; height?: number };

/** Build the Hono app wired to a given operations instance. */
export function createRestApp(ops: Operations): Hono {
  const app = new Hono();
  app.use("/api/*", cors());

  app.get("/healthz", (c) => c.json({ status: "ok" }));

  // GET /api/concepts -> { concepts: ConceptSummary[] }
  app.get("/api/concepts", (c) => c.json({ concepts: ops.listConcepts() }));

  // POST /api/render { conceptId, genome?, prefix? } -> { svg }
  app.post("/api/render", async (c) => {
    const body = await c.req.json<RenderBody>();
    if (!body?.conceptId) {
      return c.json({ error: "conceptId is required" }, 400);
    }
    try {
      return c.json(ops.render(body.conceptId, body.genome, body.prefix));
    } catch (err) {
      return c.json({ error: message(err) }, 400);
    }
  });

  // POST /api/steer { conceptId, genome?, prompt } -> { genome, svg, rationale, source }
  app.post("/api/steer", async (c) => {
    const body = await c.req.json<SteerBody>();
    if (!body?.conceptId || typeof body.prompt !== "string") {
      return c.json({ error: "conceptId and prompt are required" }, 400);
    }
    try {
      return c.json(await ops.steer(body.conceptId, body.genome ?? {}, body.prompt));
    } catch (err) {
      return c.json({ error: message(err) }, 400);
    }
  });

  // POST /api/variations { conceptId, n?, seed?, anchor?, bias?, rate? }
  //   -> { genomes: Genome[], svgs: string[] }
  app.post("/api/variations", async (c) => {
    const body = await c.req.json<VariationsBody>();
    if (!body?.conceptId) {
      return c.json({ error: "conceptId is required" }, 400);
    }
    try {
      return c.json(
        ops.variations(body.conceptId, body.n ?? 6, {
          seed: body.seed,
          anchor: body.anchor,
          bias: body.bias,
          rate: body.rate,
        })
      );
    } catch (err) {
      return c.json({ error: message(err) }, 400);
    }
  });

  // POST /api/concepts { description } -> { conceptId, title, svg, source }
  app.post("/api/concepts", async (c) => {
    const body = await c.req.json<CreateConceptBody>();
    if (typeof body?.description !== "string" || !body.description.trim()) {
      return c.json({ error: "description is required" }, 400);
    }
    try {
      return c.json(await ops.createConcept(body.description));
    } catch (err) {
      return c.json({ error: message(err) }, 400);
    }
  });

  // POST /api/export/png { svg, width?, height? } -> image/png
  app.post("/api/export/png", async (c) => {
    const body = await c.req.json<ExportPngBody>();
    if (typeof body?.svg !== "string" || !body.svg) {
      return c.json({ error: "svg is required" }, 400);
    }
    try {
      const png = ops.exportPng(body.svg, body.width, body.height);
      return c.body(toArrayBuffer(png), 200, { "Content-Type": "image/png" });
    } catch (err) {
      return c.json({ error: message(err) }, 400);
    }
  });

  return app;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Copy PNG bytes into a fresh ArrayBuffer for Hono's body writer. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
