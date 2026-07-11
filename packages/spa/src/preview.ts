/**
 * Client-side preview helpers built on @vector-create/core — the single
 * rendering source of truth. We never re-implement rendering here; we only call
 * core.render for instant local previews and mint unique animation-id prefixes
 * so multiple SVG instances (preview + gallery) never collide on their SMIL ids.
 */
import { getConcept, listConcepts, render } from "@vector-create/core";
import type { ConceptSummary, Genome } from "./types";

let prefixCounter = 0;

/**
 * Mint a unique, SVG-id-safe prefix for one rendered instance. Passed to
 * core.render(conceptId, genome, prefix) so animation ids stay isolated.
 */
export function uniquePrefix(tag = "vc"): string {
  prefixCounter += 1;
  return `${tag}${prefixCounter}x${Math.random().toString(36).slice(2, 6)}`;
}

/** Render a concept locally via core. Throws if the concept id is unknown. */
export function renderLocal(conceptId: string, genome: Genome, prefix?: string): string {
  return render(conceptId, genome, prefix ?? uniquePrefix());
}

/** The concepts bundled into core, in the summary shape the SPA consumes. */
export function localConcepts(): ConceptSummary[] {
  return listConcepts().map((c) => ({
    id: c.id,
    title: c.title,
    genomeSpec: c.genomeSpec,
    baseGenome: c.baseGenome,
  }));
}

/** Whether a concept id can be rendered locally (registered in core). */
export function isLocalConcept(conceptId: string): boolean {
  return getConcept(conceptId) !== undefined;
}
