/**
 * End-to-end REST integration test. Boots the REAL Hono app over a real HTTP
 * socket (via @hono/node-server on an ephemeral port) with the REAL resvg
 * rasterizer, and exercises the full REST surface end to end.
 *
 * The agent is absent (agent: null) — this is exactly the deterministic path CI
 * exercises when auggie-v2 is not installed. No live auggie-v2 is required.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { serve } from "@hono/node-server";
import { createRestApp } from "../faces/rest";
import { Operations } from "../operations";

const SOURCES_ON_BRAND = new Set(["llm", "fallback", "heuristic"]);

let base: string;
let server: ReturnType<typeof serve>;

beforeAll(async () => {
  // Real ops, real rasterizer (no stub), agent absent — the CI fallback path.
  const ops = new Operations({ agent: null });
  const app = createRestApp(ops);
  server = serve({ fetch: app.fetch, port: 0 });
  const address = await new Promise<{ port: number }>((resolve) => {
    server.once("listening", () => resolve(server.address() as { port: number }));
  });
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(() => {
  server.close();
});

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`);
  expect(res.status).toBe(200);
  return (await res.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as T;
}

describe("REST E2E (real socket, agent absent)", () => {
  test("GET /healthz answers ok", async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  test("GET /api/concepts wraps summaries in { concepts: [...] }", async () => {
    const body = await getJson<{
      concepts: Array<{ id: string; title: string; genomeSpec: unknown; baseGenome: unknown }>;
    }>("/api/concepts");
    expect(Array.isArray(body.concepts)).toBe(true);
    expect(body.concepts.length).toBeGreaterThan(0);
    const wormhole = body.concepts.find((c) => c.id === "wormhole");
    expect(wormhole).toBeDefined();
    expect(wormhole?.title).toBeTruthy();
    expect(wormhole?.genomeSpec).toBeDefined();
    expect(wormhole?.baseGenome).toBeDefined();
  });

  test("POST /api/render returns a valid SVG document", async () => {
    const { svg } = await postJson<{ svg: string }>("/api/render", { conceptId: "wormhole" });
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg.length).toBeGreaterThan(1000);
  });

  test("POST /api/steer clamps the genome and reports an on-brand source", async () => {
    const body = await postJson<{
      genome: Record<string, unknown>;
      svg: string;
      rationale: string;
      source: string;
    }>("/api/steer", {
      conceptId: "wormhole",
      // Deliberately out-of-range input to prove the result is clamped on-brand.
      genome: { mouthRx: 9999, throatR: -100 },
      prompt: "make it wider",
    });
    expect(body.svg).toContain("<svg");
    expect(typeof body.rationale).toBe("string");
    expect(SOURCES_ON_BRAND.has(body.source)).toBe(true);
    // Clamped to the wormhole spec bounds (mouthRx 96..122, throatR 4..12).
    expect(Number(body.genome.mouthRx)).toBeLessThanOrEqual(122);
    expect(Number(body.genome.mouthRx)).toBeGreaterThanOrEqual(96);
    expect(Number(body.genome.throatR)).toBeGreaterThanOrEqual(4);
    expect(Number(body.genome.throatR)).toBeLessThanOrEqual(12);
  });

  test("POST /api/variations returns n parallel arrays, deterministic for a fixed seed", async () => {
    const first = await postJson<{ genomes: unknown[]; svgs: string[] }>("/api/variations", {
      conceptId: "wormhole",
      n: 5,
      seed: 1234,
    });
    expect(first.genomes).toHaveLength(5);
    expect(first.svgs).toHaveLength(5);
    for (const svg of first.svgs) {
      expect(svg).toContain("<svg");
    }
    // Same seed -> byte-identical genomes + svgs (deterministic).
    const second = await postJson<{ genomes: unknown[]; svgs: string[] }>("/api/variations", {
      conceptId: "wormhole",
      n: 5,
      seed: 1234,
    });
    expect(second.genomes).toEqual(first.genomes);
    expect(second.svgs).toEqual(first.svgs);
  });

  test("POST /api/export/png returns real PNG bytes with the PNG magic number", async () => {
    const { svg } = await postJson<{ svg: string }>("/api/render", { conceptId: "wormhole" });
    const res = await fetch(`${base}/api/export/png`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ svg, width: 128 }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(8);
    // PNG magic: 89 50 4E 47 0D 0A 1A 0A
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  test("POST /api/concepts synthesizes a draft on the agent-absent path", async () => {
    const body = await postJson<{ conceptId: string; title: string; svg: string; source: string }>(
      "/api/concepts",
      { description: "a swirling nebula that collapses inward" }
    );
    expect(body.conceptId).toBeTruthy();
    expect(body.svg).toContain("<svg");
    expect(SOURCES_ON_BRAND.has(body.source)).toBe(true);
  });
});
