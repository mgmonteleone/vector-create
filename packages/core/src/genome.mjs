// The variation genome: the tunable axes of the wormhole aggregator, each with
// a valid range and a step used for mutation. The sampler draws candidates
// inside these bounds; the promptMap nudges specific genes. Bounds are chosen
// so EVERY point in the space is still on-brand and readable at squint size —
// the engine cannot wander off the approved look.
//
// `kind: "num"`  -> clamped to [min,max], mutated by +/- up to `step`.
// `kind: "list"` -> a per-band array; mutated element-wise within [min,max].
import { BASE_GENOME } from "./concepts/blackhole.mjs";

export const GENES = {
  // --- Funnel geometry ---
  throatR: { kind: "num", min: 4, max: 12, step: 2, label: "throat radius" },
  mouthRx: { kind: "num", min: 96, max: 122, step: 7, label: "mouth width" },
  ellipseK: { kind: "num", min: 0.24, max: 0.42, step: 0.05, label: "perspective" },
  flare: { kind: "num", min: 0.6, max: 0.9, step: 0.08, label: "concavity" },
  heightScale: { kind: "num", min: 96, max: 150, step: 14, label: "height" },
  latCount: { kind: "num", min: 12, max: 20, step: 2, int: true, label: "ring density" },
  lonCount: { kind: "num", min: 18, max: 30, step: 3, int: true, label: "meridian density" },
  // --- Mesh styling ---
  ringOpacity: { kind: "num", min: 0.22, max: 0.55, step: 0.08, label: "ring opacity" },
  meridianOpacity: { kind: "num", min: 0.2, max: 0.5, step: 0.08, label: "meridian opacity" },
  // --- Animation timing ---
  revealDuration: { kind: "num", min: 2.8, max: 4.6, step: 0.5, label: "cycle length" },
  litFraction: { kind: "num", min: 0.7, max: 0.9, step: 0.06, label: "lit fraction" },
  ringDurations: {
    kind: "list",
    min: 2.2,
    max: 5.0,
    step: 0.6,
    label: "ring pulse speeds",
  },
};

export const GENE_KEYS = Object.keys(GENES);

/** The approved baseline as a genome object (seed / elite anchor). */
export const baseGenome = () => ({ ...BASE_GENOME });

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Coerce/clamp an arbitrary genome to valid, on-brand bounds. */
export function sanitize(genome) {
  const g = { ...BASE_GENOME, ...genome };
  for (const key of GENE_KEYS) {
    const spec = GENES[key];
    if (spec.kind === "num") {
      let v = clamp(Number(g[key]), spec.min, spec.max);
      if (spec.int) v = Math.round(v);
      g[key] = spec.int ? v : Number(v.toFixed(3));
    } else if (spec.kind === "list") {
      const arr = Array.isArray(g[key]) ? g[key] : BASE_GENOME[key];
      g[key] = arr.map((x) => Number(clamp(Number(x), spec.min, spec.max).toFixed(2)));
    }
  }
  return g;
}

/** A short, human-readable label describing how a genome differs from base. */
export function describe(genome) {
  const g = sanitize(genome);
  const base = BASE_GENOME;
  const diffs = [];
  for (const key of GENE_KEYS) {
    const spec = GENES[key];
    if (spec.kind === "num" && g[key] !== base[key]) {
      const arrow = g[key] > base[key] ? "\u2191" : "\u2193";
      diffs.push(`${spec.label} ${arrow}`);
    }
  }
  return diffs.length ? diffs.slice(0, 3).join(" \u00b7 ") : "baseline";
}
