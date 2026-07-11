// Stochastic candidate sampler for the wormhole genome.
//
//  - mutate(genome, rate): jitter each gene by up to its `step`, optionally
//    biased in a direction (from a prompt nudge) so "wider", "faster" etc.
//    reliably push the right axis.
//  - sampleBatch(n, {seed, elite, bias, rate}): produce n candidates. The
//    first `elite` slots keep the best-so-far genomes verbatim (elitism); the
//    rest are mutations of the seed/elites, so a batch always contains the
//    current favourites plus fresh exploration around them.
import { GENES, GENE_KEYS, sanitize, baseGenome } from "./genome.mjs";

// Small deterministic PRNG (mulberry32) so a batch is reproducible from a seed.
function rng(seed) {
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
 * Mutate one genome. `bias` is an optional map gene -> +1/-1 giving a preferred
 * direction (from the prompt mapper); biased genes move mostly that way.
 */
export function mutate(genome, rate = 1, bias = {}, rand = Math.random) {
  const g = sanitize(genome);
  for (const key of GENE_KEYS) {
    const spec = GENES[key];
    const dir = bias[key]; // +1 / -1 / undefined
    if (spec.kind === "num") {
      // Biased genes step mostly in the requested direction; others jitter both ways.
      const u = dir ? 0.25 + rand() * 0.75 : rand() * 2 - 1;
      const signed = dir ? dir * u : u;
      g[key] = g[key] + signed * spec.step * rate;
    } else if (spec.kind === "list") {
      g[key] = g[key].map((x) => {
        const u = dir ? dir * (0.25 + rand() * 0.75) : rand() * 2 - 1;
        return x + u * spec.step * rate;
      });
    }
  }
  return sanitize(g);
}

/**
 * Produce a batch of n candidate genomes.
 *  opts.seed    number    reproducibility seed (default: time-based)
 *  opts.elites  genome[]  best-so-far kept verbatim in the front slots
 *  opts.bias    map       gene -> +1/-1 directional nudge (from prompt)
 *  opts.rate    number    mutation strength multiplier (default 1)
 *  opts.anchor  genome    what mutations are drawn around (default: last elite or base)
 */
export function sampleBatch(n, opts = {}) {
  const {
    seed = Date.now() % 2147483647,
    elites = [],
    bias = {},
    rate = 1,
    anchor,
  } = opts;
  const rand = rng(seed);
  const out = [];
  const base = anchor ?? elites[0] ?? baseGenome();

  // Elitism: carry the top genomes through unchanged (up to n-1 so there's
  // always at least one fresh mutant).
  const keep = Math.min(elites.length, Math.max(0, n - 1));
  for (let i = 0; i < keep; i++) out.push(sanitize(elites[i]));

  // Fill remaining slots with mutations around the anchor, escalating the
  // mutation rate slightly for later slots to widen exploration.
  for (let i = out.length; i < n; i++) {
    const spread = rate * (1 + (i - keep) * 0.2);
    out.push(mutate(base, spread, bias, rand));
  }
  return { seed, genomes: out };
}
