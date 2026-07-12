import { describe, expect, test } from "bun:test";
import { BASE_GENOME, WORMHOLE_SPEC } from "../concepts/wormhole";
import { geneKeys } from "../genome";
import { mutate, sampleBatch } from "../sampler";

const keys = geneKeys(WORMHOLE_SPEC);

function withinBounds(genome: Record<string, number | number[] | string>): boolean {
  for (const key of keys) {
    const gene = WORMHOLE_SPEC[key];
    if (!gene || gene.kind === "color") {
      continue;
    }
    const v = genome[key];
    if (gene.kind === "num") {
      if ((v as number) < gene.min || (v as number) > gene.max) {
        return false;
      }
    } else {
      for (const x of v as number[]) {
        if (x < gene.min || x > gene.max) {
          return false;
        }
      }
    }
  }
  return true;
}

describe("sampleBatch", () => {
  test("returns exactly n candidates", () => {
    const { genomes } = sampleBatch(WORMHOLE_SPEC, BASE_GENOME, 5, { seed: 1 });
    expect(genomes).toHaveLength(5);
  });

  test("is deterministic for a fixed seed", () => {
    const a = sampleBatch(WORMHOLE_SPEC, BASE_GENOME, 5, { seed: 42 });
    const b = sampleBatch(WORMHOLE_SPEC, BASE_GENOME, 5, { seed: 42 });
    expect(a.genomes).toEqual(b.genomes);
  });

  test("respects elitism: elites are kept verbatim in front slots", () => {
    const elite = { ...BASE_GENOME, mouthRx: 96 };
    const { genomes } = sampleBatch(WORMHOLE_SPEC, BASE_GENOME, 5, {
      seed: 7,
      elites: [elite],
    });
    expect(genomes[0]?.mouthRx).toBe(96);
  });

  test("every candidate stays within bounds", () => {
    const { genomes } = sampleBatch(WORMHOLE_SPEC, BASE_GENOME, 8, {
      seed: 99,
      rate: 3,
    });
    for (const g of genomes) {
      expect(withinBounds(g)).toBe(true);
    }
  });

  test("sampled variations keep the anchor's colours unchanged", () => {
    const anchor = { ...BASE_GENOME, meshColor: "#9A7BFF" };
    const { genomes } = sampleBatch(WORMHOLE_SPEC, BASE_GENOME, 6, { seed: 3, anchor, rate: 3 });
    for (const g of genomes) {
      expect(g.meshColor).toBe("#9A7BFF");
    }
  });
});

describe("mutate", () => {
  test("never mutates colour genes (variations keep the palette)", () => {
    const anchor = { ...BASE_GENOME, meshColor: "#4FA3E3" };
    const rand = () => 0.9;
    const mutated = mutate(WORMHOLE_SPEC, BASE_GENOME, anchor, 5, { meshColor: 1 } as never, rand);
    expect(mutated.meshColor).toBe("#4FA3E3");
    expect(mutated.streamColor).toBe(BASE_GENOME.streamColor);
  });

  test("biased gene moves in the requested direction", () => {
    // Anchor below max so a +1 bias can raise it.
    const anchor = { ...BASE_GENOME, mouthRx: 96 };
    const seq = [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9];
    let i = 0;
    const rand = () => seq[i++ % seq.length] as number;
    const mutated = mutate(WORMHOLE_SPEC, BASE_GENOME, anchor, 1, { mouthRx: 1 }, rand);
    expect(mutated.mouthRx as number).toBeGreaterThan(96);
  });
});
