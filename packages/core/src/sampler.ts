/**
 * Concept-aware stochastic candidate sampler.
 *
 *  - mutate(spec, base, genome, ...): jitter each gene by up to its `step`,
 *    optionally biased in a direction (from a prompt nudge).
 *  - sampleBatch(spec, base, n, ...): produce n candidates. The first `elites`
 *    slots keep the best-so-far genomes verbatim (elitism); the rest are
 *    mutations of the anchor.
 */
import type { Genome, GenomeSpec } from "./concept";
import { geneKeys, sanitize } from "./genome";

/** Directional bias: gene -> +1 (up) / -1 (down). */
export type Bias = Record<string, 1 | -1>;

/** A pseudo-random source in [0,1). */
export type Rng = () => number;

/** Small deterministic PRNG (mulberry32) so a batch is reproducible. */
function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mutate one genome. `bias` gives a preferred direction per gene (from the
 * prompt mapper); biased genes move mostly that way, others jitter both ways.
 */
export function mutate(
  spec: GenomeSpec,
  base: Genome,
  genome: Genome,
  rate = 1,
  bias: Bias = {},
  rand: Rng = Math.random
): Genome {
  const g = sanitize(spec, base, genome);
  for (const key of geneKeys(spec)) {
    const gene = spec[key];
    if (!gene) {
      continue;
    }
    const dir = bias[key];
    if (gene.kind === "num") {
      const u = dir ? 0.25 + rand() * 0.75 : rand() * 2 - 1;
      const signed = dir ? dir * u : u;
      g[key] = (g[key] as number) + signed * gene.step * rate;
    } else {
      g[key] = (g[key] as number[]).map((x) => {
        const u = dir ? dir * (0.25 + rand() * 0.75) : rand() * 2 - 1;
        return x + u * gene.step * rate;
      });
    }
  }
  return sanitize(spec, base, g);
}

export type SampleBatchOptions = {
  /** Reproducibility seed (default: time-based). */
  seed?: number;
  /** Best-so-far genomes kept verbatim in the front slots. */
  elites?: Genome[];
  /** Directional nudge (from prompt). */
  bias?: Bias;
  /** Mutation strength multiplier (default 1). */
  rate?: number;
  /** What mutations are drawn around (default: first elite or base). */
  anchor?: Genome;
};

export type SampleBatchResult = {
  seed: number;
  genomes: Genome[];
};

/** Produce a batch of n candidate genomes for a concept. */
export function sampleBatch(
  spec: GenomeSpec,
  base: Genome,
  n: number,
  opts: SampleBatchOptions = {}
): SampleBatchResult {
  const { seed = Date.now() % 2147483647, elites = [], bias = {}, rate = 1, anchor } = opts;
  const rand = rng(seed);
  const out: Genome[] = [];
  const anchorGenome = anchor ?? elites[0] ?? base;

  // Elitism: carry the top genomes through unchanged (up to n-1 so there's
  // always at least one fresh mutant).
  const keep = Math.min(elites.length, Math.max(0, n - 1));
  for (let i = 0; i < keep; i++) {
    out.push(sanitize(spec, base, elites[i] as Genome));
  }

  // Fill remaining slots with mutations around the anchor, escalating the
  // mutation rate slightly for later slots to widen exploration.
  for (let i = out.length; i < n; i++) {
    const spread = rate * (1 + (i - keep) * 0.2);
    out.push(mutate(spec, base, anchorGenome, spread, bias, rand));
  }
  return { seed, genomes: out };
}
