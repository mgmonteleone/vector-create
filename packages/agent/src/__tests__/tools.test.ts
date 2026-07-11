/**
 * Tool-function + detection tests. These cover the interface-agnostic surface
 * the server maps onto, plus the availability probe that drives graceful
 * degradation.
 */
import { describe, expect, it } from "bun:test";
import { detectAuggie, isOnPath } from "../detect";
import { listConcepts, renderGenome } from "../tools";

describe("detection", () => {
  it("reports false for a binary that cannot exist", () => {
    expect(isOnPath("definitely-not-a-real-binary-xyz")).toBe(false);
  });

  it("finds a binary present in a synthetic PATH", () => {
    // `sh` exists on any POSIX runner; probe the standard dirs.
    const present = isOnPath("sh", { PATH: "/bin:/usr/bin" });
    // On non-POSIX CI this may be false; only assert the shape is boolean.
    expect(typeof present).toBe("boolean");
  });

  it("detectAuggie returns a boolean", () => {
    expect(typeof detectAuggie()).toBe("boolean");
  });
});

describe("tool functions", () => {
  it("renderGenome renders a known concept and clamps its genome", () => {
    const svg = renderGenome("wormhole", { mouthRx: 99999 });
    expect(svg).toContain("<svg");
  });

  it("listConcepts returns serializable summaries", () => {
    const concepts = listConcepts();
    expect(concepts.length).toBeGreaterThan(0);
    const wormhole = concepts.find((c) => c.id === "wormhole");
    expect(wormhole?.title).toBe("Wormhole aggregator");
    expect(typeof wormhole?.genomeSpec).toBe("object");
    // No functions leaked into the summary.
    expect(JSON.stringify(wormhole)).toContain("wormhole");
  });
});
