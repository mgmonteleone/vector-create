/**
 * Concept Registry. The single lookup point every interface uses to find a
 * concept and render it. Ships with the wormhole registered; future concepts
 * (pyramid, …) register the same `{ id, title, render, genomeSpec, baseGenome }`
 * contract and become available everywhere for free.
 */
import type { Concept, Genome } from "./concept";
import { wormholeConcept } from "./concepts/wormhole";

const concepts = new Map<string, Concept>();

/** Register (or replace) a concept by its id. */
export function registerConcept(concept: Concept): void {
  concepts.set(concept.id, concept);
}

/** Look up a concept by id, or undefined if not registered. */
export function getConcept(id: string): Concept | undefined {
  return concepts.get(id);
}

/** Every registered concept, in registration order. */
export function listConcepts(): Concept[] {
  return Array.from(concepts.values());
}

/** Render a concept by id. Throws if the id is unknown. */
export function render(conceptId: string, genome?: Genome, prefix?: string): string {
  const concept = getConcept(conceptId);
  if (!concept) {
    throw new Error(
      `Unknown concept "${conceptId}". Known: ${listConcepts()
        .map((c) => c.id)
        .join(", ")}`
    );
  }
  return concept.render(genome, prefix);
}

// Built-in concepts.
registerConcept(wormholeConcept);
