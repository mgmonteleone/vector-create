/**
 * @vector-create/core — the single rendering source of truth for every
 * vector-create interface (SPA, server, agent). Pure and isomorphic: no
 * Node-only or DOM-only imports in this entrypoint (fs/CLI code lives in ./cli).
 *
 * The public surface is concept-first: look a concept up in the registry, then
 * render / sample / steer its genome. All variation helpers are concept-aware —
 * they take a concept (or its spec + baseGenome) so new concepts work for free.
 */

// --- Concept contract types ---
export type {
  ColorGeneSpec,
  Concept,
  GeneSpec,
  GeneValue,
  Genome,
  GenomeSpec,
  ListGeneSpec,
  NumGeneSpec,
  PromptRule,
} from "./concept";
// --- Variation engine (concept-aware) ---
export {
  describe as describeGenome,
  geneKeys,
  sanitize as sanitizeGenome,
} from "./genome";
export type { PromptSteer } from "./promptMap";
export { mapPrompt, mapPromptWithRules } from "./promptMap";
// --- Registry ---
export {
  getConcept,
  listConcepts,
  registerConcept,
  render,
} from "./registry";
export type { Bias, Rng, SampleBatchOptions, SampleBatchResult } from "./sampler";
export { mutate, sampleBatch } from "./sampler";

// --- Concept-scoped convenience API ---
import type { Concept, Genome } from "./concept";
import { describe as describeImpl, sanitize as sanitizeImpl } from "./genome";
import { mapPrompt as mapPromptImpl, type PromptSteer } from "./promptMap";
import { getConcept } from "./registry";
import {
  type Bias,
  mutate as mutateImpl,
  type Rng,
  type SampleBatchResult,
  sampleBatch as sampleBatchImpl,
} from "./sampler";

function resolveConcept(concept: string | Concept): Concept {
  const c = typeof concept === "string" ? getConcept(concept) : concept;
  if (!c) {
    throw new Error(`Unknown concept "${String(concept)}".`);
  }
  return c;
}

/** Clamp a genome to a concept's on-brand bounds. */
export function sanitize(concept: string | Concept, genome: Genome = {}): Genome {
  const c = resolveConcept(concept);
  return sanitizeImpl(c.genomeSpec, c.baseGenome, genome);
}

/** Short human label describing how a genome differs from the concept baseline. */
export function describe(concept: string | Concept, genome: Genome): string {
  const c = resolveConcept(concept);
  return describeImpl(c.genomeSpec, c.baseGenome, genome);
}

/** Parse a steering prompt into a directional bias for a concept. */
export function steer(concept: string | Concept, prompt: string): PromptSteer {
  return mapPromptImpl(resolveConcept(concept), prompt);
}

/** Mutate one genome within a concept's bounds. */
export function mutateGenome(
  concept: string | Concept,
  genome: Genome,
  rate = 1,
  bias: Bias = {},
  rand?: Rng
): Genome {
  const c = resolveConcept(concept);
  return mutateImpl(c.genomeSpec, c.baseGenome, genome, rate, bias, rand);
}

/** Produce a batch of candidate genomes for a concept. */
export function sampleConcept(
  concept: string | Concept,
  n: number,
  opts: Parameters<typeof sampleBatchImpl>[3] = {}
): SampleBatchResult {
  const c = resolveConcept(concept);
  return sampleBatchImpl(c.genomeSpec, c.baseGenome, n, opts);
}

export type { ComposeOptions } from "./compose";
// --- Low-level toolkit (for concept authors) ---
export { composeSVG } from "./compose";
// --- Built-in concepts ---
export {
  BASE_GENOME as WORMHOLE_BASE_GENOME,
  WORMHOLE_COLOR_PALETTE,
  WORMHOLE_PROMPT_RULES,
  WORMHOLE_SPEC,
  wormhole,
  wormholeConcept,
} from "./concepts/wormhole";
export * from "./keyframes";
export * from "./primitives";
export * from "./tokens";
