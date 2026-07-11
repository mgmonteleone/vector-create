/**
 * REST smoke test via Hono's built-in `app.request` test client (no socket).
 */
import { describe, expect, test } from "bun:test";
import { createRestApp } from "../faces/rest";
import { Operations } from "../operations";

const stubRaster = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 9, 9, 9, 9]);

function app() {
  return createRestApp(new Operations({ agent: null, rasterize: stubRaster }));
}

describe("REST face", () => {
  test("GET /healthz", async () => {
    const res = await app().request("/healthz");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  test("GET /api/concepts lists wormhole", async () => {
    const res = await app().request("/api/concepts");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { concepts: Array<{ id: string }> };
    expect(body.concepts.map((c) => c.id)).toContain("wormhole");
  });

  test("POST /api/render returns svg", async () => {
    const res = await app().request("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conceptId: "wormhole" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { svg: string };
    expect(body.svg).toContain("<svg");
  });

  test("POST /api/render 400 without conceptId", async () => {
    const res = await app().request("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  test("POST /api/steer returns steered genome", async () => {
    const res = await app().request("/api/steer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conceptId: "wormhole", prompt: "wider" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { svg: string; source: string };
    expect(body.svg).toContain("<svg");
    expect(body.source).toBe("heuristic");
  });

  test("POST /api/variations returns n genomes", async () => {
    const res = await app().request("/api/variations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conceptId: "wormhole", n: 3, seed: 1 }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { genomes: unknown[]; svgs: string[] };
    expect(body.genomes).toHaveLength(3);
    expect(body.svgs).toHaveLength(3);
  });

  test("POST /api/concepts creates (heuristic) draft", async () => {
    const res = await app().request("/api/concepts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "a swirling nebula" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { conceptId: string; source: string };
    expect(body.source).toBe("heuristic");
    expect(body.conceptId).toBeDefined();
  });

  test("POST /api/export/png returns image/png bytes", async () => {
    const render = await app().request("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conceptId: "wormhole" }),
    });
    const { svg } = (await render.json()) as { svg: string };

    const res = await app().request("/api/export/png", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ svg }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    const buf = new Uint8Array(await res.arrayBuffer());
    expect(buf.byteLength).toBeGreaterThan(0);
  });
});
