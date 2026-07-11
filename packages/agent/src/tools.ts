/**
 * Plain, typed tool functions — the interface-agnostic op surface every server
 * face (REST, gRPC, MCP) maps onto so all three expose the SAME operations.
 *
 * Each function is self-contained: `renderGenome` and `listConcepts` are pure
 * core calls (no agent needed); `steerGenome` and `createConcept` accept an
 * optional `VectorAgent` so a host can share one long-lived agent, or omit it
 * to get a per-call agent that is created and closed automatically. None of
 * these throw for an agent failure — they degrade to `source: "fallback"`.
 */
import {
  type Concept,
  listConcepts as coreListConcepts,
  type Genome,
  getConcept,
  render,
  sanitize,
} from "@vector-create/core";
import { VectorAgent } from "./agent";
import type { CreateResult, SteerResult } from "./types";

/** A concept summary safe to serialize across a wire (no functions). */
export type ConceptSummary = {
  id: string;
  title: string;
  genomeSpec: Concept["genomeSpec"];
  baseGenome: Genome;
};

/**
 * Render a concept's genome to an animated SVG string. Pure core call; the
 * genome is clamped first so an out-of-range request still renders on-brand.
 * Throws only for a genuinely unknown concept id (a caller error, not an agent
 * failure) — consistent with core.render.
 */
export function renderGenome(conceptId: string, genome: Genome = {}): string {
  const concept = getConcept(conceptId);
  if (!concept) {
    return render(conceptId, genome); // Let core throw its descriptive error.
  }
  return render(conceptId, sanitize(concept, genome));
}

/** Every registered concept as a serializable summary. */
export function listConcepts(): ConceptSummary[] {
  return coreListConcepts().map((c) => ({
    id: c.id,
    title: c.title,
    genomeSpec: c.genomeSpec,
    baseGenome: c.baseGenome,
  }));
}

/** Run `op` with a caller-supplied agent, or a per-call one that is auto-closed. */
async function withAgent<T>(
  agent: VectorAgent | undefined,
  op: (a: VectorAgent) => Promise<T>
): Promise<T> {
  if (agent) {
    return op(agent);
  }
  const ephemeral = await VectorAgent.create();
  try {
    return await op(ephemeral);
  } finally {
    ephemeral.close();
  }
}

/**
 * Steer a concept's genome from natural language. Pass a shared `agent` to
 * reuse one LLM session, or omit it for a self-managed per-call agent. Never
 * throws for an agent failure — degrades to a deterministic `fallback` result.
 */
export function steerGenome(
  conceptId: string,
  currentGenome: Genome,
  prompt: string,
  agent?: VectorAgent
): Promise<SteerResult> {
  return withAgent(agent, (a) => a.steerGenome(conceptId, currentGenome, prompt));
}

/**
 * Author a new concept from a description. Pass a shared `agent` to reuse one
 * LLM session, or omit it for a self-managed per-call agent. In fallback mode
 * resolves to `{ source: "fallback", error }`; never throws.
 */
export function createConcept(description: string, agent?: VectorAgent): Promise<CreateResult> {
  return withAgent(agent, (a) => a.createConcept(description));
}
