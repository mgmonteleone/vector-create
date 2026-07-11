/**
 * Operations unit tests. The agent is mocked (no live auggie-v2) so these
 * exercise the shared layer's core-only paths plus the agent-delegation path.
 */
import { describe, expect, test } from "bun:test";
import type { Genome } from "@vector-create/core";
import type { VectorAgentLike } from "../agent";
import { Operations } from "../operations";

/** A tiny mock agent that reports itself available and echoes deterministic data. */
function mockAgent(overrides: Partial<VectorAgentLike> = {}): VectorAgentLike {
  return {
    available: true,
    mode: "llm",
    steerGenome: (_c, genome, prompt) => ({
      genome: { ...genome, steered: 1 } as Genome,
      svg: "<svg><!-- agent steer --></svg>",
      rationale: `agent: ${prompt}`,
      source: "llm",
    }),
    createConcept: (description) => ({
      concept: { id: "agent-concept", title: `Agent: ${description}` },
      svg: "<svg><!-- agent concept --></svg>",
      source: "llm",
    }),
    close: () => {},
    ...overrides,
  };
}

/** A rasterizer stub so PNG tests don't depend on the native module. */
const stubRaster = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

describe("Operations (core-only)", () => {
  const ops = new Operations({ agent: null, rasterize: stubRaster });

  test("listConcepts includes wormhole", () => {
    const ids = ops.listConcepts().map((c) => c.id);
    expect(ids).toContain("wormhole");
    const wormhole = ops.listConcepts().find((c) => c.id === "wormhole");
    expect(wormhole?.genomeSpec).toBeDefined();
    expect(wormhole?.baseGenome).toBeDefined();
  });

  test("render returns an SVG string", () => {
    const { svg } = ops.render("wormhole");
    expect(svg).toContain("<svg");
    expect(svg.length).toBeGreaterThan(100);
  });

  test("render throws on unknown concept", () => {
    expect(() => ops.render("nope")).toThrow(/Unknown concept/);
  });

  test("steer (heuristic) returns genome + svg + source", async () => {
    const r = await ops.steer("wormhole", {}, "make it much wider and brighter");
    expect(r.svg).toContain("<svg");
    expect(r.genome).toBeDefined();
    expect(typeof r.rationale).toBe("string");
    expect(r.source).toBe("heuristic");
  });

  test("variations returns n genomes and n svgs", () => {
    const r = ops.variations("wormhole", 4, { seed: 1 });
    expect(r.genomes).toHaveLength(4);
    expect(r.svgs).toHaveLength(4);
    for (const svg of r.svgs) {
      expect(svg).toContain("<svg");
    }
  });

  test("variations is deterministic for a fixed seed", () => {
    const a = ops.variations("wormhole", 3, { seed: 42 });
    const b = ops.variations("wormhole", 3, { seed: 42 });
    expect(a.genomes).toEqual(b.genomes);
  });

  test("exportPng returns a non-empty buffer", () => {
    const { svg } = ops.render("wormhole");
    const png = ops.exportPng(svg);
    expect(png.byteLength).toBeGreaterThan(0);
  });

  test("exportPng rejects empty svg", () => {
    expect(() => ops.exportPng("")).toThrow();
  });

  test("createConcept falls back to a heuristic draft", async () => {
    const r = await ops.createConcept("a spinning galaxy");
    expect(r.source).toBe("heuristic");
    expect(r.svg).toContain("<svg");
    expect(r.conceptId).toBe("wormhole");
  });
});

describe("Operations (agent-backed)", () => {
  test("steer delegates to the agent when available", async () => {
    const ops = new Operations({ agent: mockAgent(), rasterize: stubRaster });
    const r = await ops.steer("wormhole", { throatR: 5 }, "brighter");
    expect(r.source).toBe("llm");
    expect(r.rationale).toBe("agent: brighter");
    expect(r.genome.steered).toBe(1);
  });

  test("createConcept delegates to the agent when available", async () => {
    const ops = new Operations({ agent: mockAgent(), rasterize: stubRaster });
    const r = await ops.createConcept("a fractal tree");
    expect(r.source).toBe("llm");
    expect(r.conceptId).toBe("agent-concept");
    expect(r.title).toContain("fractal tree");
  });

  test("an unavailable agent is treated as core-only", async () => {
    const ops = new Operations({
      agent: mockAgent({ available: false }),
      rasterize: stubRaster,
    });
    const r = await ops.steer("wormhole", {}, "wider");
    expect(r.source).toBe("heuristic");
  });

  test("close() closes the agent", async () => {
    let closed = false;
    const ops = new Operations({
      agent: mockAgent({
        close: () => {
          closed = true;
        },
      }),
      rasterize: stubRaster,
    });
    await ops.close();
    expect(closed).toBe(true);
  });
});
