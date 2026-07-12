import { describe, expect, test } from "bun:test";
import { BASE_GENOME, WORMHOLE_SPEC } from "../concepts/wormhole";
import { describe as describeGenome, sanitize } from "../genome";

describe("sanitize (concept-aware clamp)", () => {
  test("clamps numeric genes to their bounds", () => {
    const g = sanitize(WORMHOLE_SPEC, BASE_GENOME, {
      mouthRx: 9999, // above max 122
      throatR: -50, // below min 4
    });
    expect(g.mouthRx).toBe(122);
    expect(g.throatR).toBe(4);
  });

  test("respects the wormhole's exact preserved bounds (mouthRx min 96)", () => {
    const g = sanitize(WORMHOLE_SPEC, BASE_GENOME, { mouthRx: 0 });
    expect(g.mouthRx).toBe(96);
    expect(WORMHOLE_SPEC.mouthRx).toMatchObject({ min: 96, step: 7 });
  });

  test("rounds integer genes", () => {
    const g = sanitize(WORMHOLE_SPEC, BASE_GENOME, { latCount: 15.7 });
    expect(g.latCount).toBe(16);
    expect(Number.isInteger(g.latCount)).toBe(true);
  });

  test("clamps list genes element-wise", () => {
    const g = sanitize(WORMHOLE_SPEC, BASE_GENOME, {
      ringDurations: [100, -100, 3],
    });
    expect(g.ringDurations).toEqual([5, 2.2, 3]);
  });

  test("missing genes fall back to base", () => {
    const g = sanitize(WORMHOLE_SPEC, BASE_GENOME, {});
    expect(g.mouthRx).toBe(BASE_GENOME.mouthRx);
  });
});

describe("describe", () => {
  test("baseline reads as 'baseline'", () => {
    expect(describeGenome(WORMHOLE_SPEC, BASE_GENOME, BASE_GENOME)).toBe("baseline");
  });

  test("reports direction of change with arrows", () => {
    const label = describeGenome(WORMHOLE_SPEC, BASE_GENOME, { mouthRx: 122 });
    expect(label).toContain("mouth width");
    expect(label).toContain("\u2191");
  });
});
