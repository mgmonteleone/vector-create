/**
 * Adapter over @vector-create/agent's runtime surface.
 *
 * The server depends only on the small slice of the agent it actually uses:
 * the stateful {@link VectorAgent} (`.available` / `.mode` / `steerGenome` /
 * `createConcept` / `close`). {@link VectorAgentLike} captures exactly that
 * slice so the real class satisfies it structurally and tests can supply a
 * lightweight mock. `createAgent()` constructs the real agent via its documented
 * `VectorAgent.create()` factory, which never throws — it downgrades to
 * deterministic fallback mode when `auggie-v2` is absent.
 */

import { type SteerResult, VectorAgent } from "@vector-create/agent";
import type { Genome } from "@vector-create/core";

/** Result of authoring a new concept: `concept`/`svg` are absent on fallback. */
export type CreateConceptResult = {
  concept?: { id: string; title: string };
  svg?: string;
  source: string;
  error?: string;
};

/**
 * The subset of the agent's runtime the server depends on. The real
 * {@link VectorAgent} satisfies this structurally.
 */
export type VectorAgentLike = {
  /** Whether the agent is wired to a live model. */
  readonly available: boolean;
  /** Operating mode: "llm" when the model is reachable, else "fallback". */
  readonly mode: string;
  steerGenome(
    conceptId: string,
    genome: Genome,
    prompt: string
  ): Promise<SteerResult> | SteerResult;
  createConcept(description: string): Promise<CreateConceptResult> | CreateConceptResult;
  close(): Promise<void> | void;
};

/**
 * Construct the real VectorAgent. Never throws: `VectorAgent.create()` probes
 * for `auggie-v2` and downgrades to deterministic fallback when it is absent, so
 * the operations layer can always call every op regardless of environment.
 */
export async function createAgent(): Promise<VectorAgentLike> {
  return VectorAgent.create();
}
