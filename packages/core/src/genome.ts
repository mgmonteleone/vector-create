/**
 * Concept-aware genome utilities. `sanitize`, `describe` and the gene helpers
 * operate on a concept's `genomeSpec` + `baseGenome` rather than one hard-coded
 * gene table, so every concept shares the same clamp/label machinery.
 */
import type { Genome, GenomeSpec } from "./concept";

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** The gene keys of a spec. */
export function geneKeys(spec: GenomeSpec): string[] {
  return Object.keys(spec);
}

/**
 * Coerce/clamp an arbitrary genome to a concept's valid, on-brand bounds.
 * Missing genes fall back to `base`; unknown keys are dropped from the spec's
 * perspective but preserved so a concept can carry non-tunable constants.
 */
export function sanitize(spec: GenomeSpec, base: Genome, genome: Genome = {}): Genome {
  const g: Genome = { ...base, ...genome };
  for (const key of geneKeys(spec)) {
    const gene = spec[key];
    if (!gene) {
      continue;
    }
    if (gene.kind === "num") {
      let v = clamp(Number(g[key]), gene.min, gene.max);
      if (gene.int) {
        v = Math.round(v);
      }
      g[key] = gene.int ? v : Number(v.toFixed(3));
    } else {
      const raw = Array.isArray(g[key]) ? (g[key] as number[]) : (base[key] as number[]);
      g[key] = raw.map((x) => Number(clamp(Number(x), gene.min, gene.max).toFixed(2)));
    }
  }
  return g;
}

/** A short, human-readable label describing how a genome differs from base. */
export function describe(spec: GenomeSpec, base: Genome, genome: Genome): string {
  const g = sanitize(spec, base, genome);
  const diffs: string[] = [];
  for (const key of geneKeys(spec)) {
    const gene = spec[key];
    if (gene && gene.kind === "num" && g[key] !== base[key]) {
      const arrow = (g[key] as number) > (base[key] as number) ? "\u2191" : "\u2193";
      diffs.push(`${gene.label} ${arrow}`);
    }
  }
  return diffs.length ? diffs.slice(0, 3).join(" \u00b7 ") : "baseline";
}
