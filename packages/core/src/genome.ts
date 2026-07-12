/**
 * Concept-aware genome utilities. `sanitize`, `describe` and the gene helpers
 * operate on a concept's `genomeSpec` + `baseGenome` rather than one hard-coded
 * gene table, so every concept shares the same clamp/label machinery.
 */
import type { Genome, GenomeSpec } from "./concept";

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Normalise a hex string to lowercase, or null if it is not a #rrggbb hex. */
function normHex(value: unknown): string | null {
  return typeof value === "string" && HEX.test(value.trim()) ? value.trim().toLowerCase() : null;
}

/** Parse #rrggbb into [r,g,b]. Assumes a validated hex. */
function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Snap a hex to the closest palette entry by squared RGB distance. */
function nearestColor(hex: string, palette: string[]): string {
  const [r, g, b] = rgb(hex);
  let best = palette[0] as string;
  let bestD = Number.POSITIVE_INFINITY;
  for (const c of palette) {
    const [pr, pg, pb] = rgb(c.toLowerCase());
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

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
    if (gene.kind === "color") {
      // Prompt-first colour gene: accept a hex, snap to the nearest allowed
      // palette entry (preserving that entry's canonical casing), and fall back
      // to the base colour on anything garbage.
      const wanted = normHex(g[key]);
      const exact = wanted ? gene.palette.find((c) => c.toLowerCase() === wanted) : undefined;
      if (exact) {
        g[key] = exact;
      } else if (wanted) {
        g[key] = nearestColor(wanted, gene.palette);
      } else {
        const baseHex = normHex(base[key]);
        const baseEntry = baseHex
          ? gene.palette.find((c) => c.toLowerCase() === baseHex)
          : undefined;
        g[key] = baseEntry ?? (base[key] as string) ?? (gene.palette[0] as string);
      }
    } else if (gene.kind === "num") {
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
    if (!gene || g[key] === base[key]) {
      continue;
    }
    if (gene.kind === "num") {
      const arrow = (g[key] as number) > (base[key] as number) ? "\u2191" : "\u2193";
      diffs.push(`${gene.label} ${arrow}`);
    } else if (gene.kind === "color") {
      diffs.push(`${gene.label} ■`);
    }
  }
  return diffs.length ? diffs.slice(0, 3).join(" \u00b7 ") : "baseline";
}
