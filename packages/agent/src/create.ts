/**
 * Author a brand-new concept from a natural-language description.
 *
 * LLM mode: the agent returns a declarative scene + genome schema, which is
 * validated and compiled into a real animated-SVG render function using core's
 * toolkit primitives, registered via core.registerConcept, and previewed.
 * Fallback: concept authoring genuinely requires the LLM, so when the agent is
 * unavailable (or fails) this returns a `fallback` result carrying an error
 * explaining that `auggie-v2` is required — it never throws.
 */
import { registerConcept, render } from "@vector-create/core";
import { type ConceptSpec, conceptFromSpec, validateConceptSpec } from "./buildConcept";
import type { AgentClient } from "./client";
import { buildCreatePrompt } from "./prompts";
import { extractJson, withTimeout } from "./robust";
import { type CreateResult, DEFAULT_TIMEOUT_MS } from "./types";

const UNAVAILABLE_MESSAGE =
  "Concept authoring requires the auggie-v2 LLM agent, which is unavailable. " +
  "Install it (npm install -g @augmentcode/auggie@prerelease) to author new concepts. " +
  "Steering existing concepts still works via the deterministic fallback.";

/**
 * LLM concept authoring with a graceful unavailable-fallback. `client` may be
 * `null` (no agent), in which case the unavailable error is returned.
 */
export async function createConceptOp(
  client: AgentClient | null,
  description: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CreateResult> {
  if (!client) {
    return { source: "fallback", error: UNAVAILABLE_MESSAGE };
  }

  try {
    await withTimeout(client.promptAndWait(buildCreatePrompt(description)), timeoutMs);
    const { text } = await withTimeout(client.getLastAssistantTextTyped(), timeoutMs);
    const parsed = extractJson(text);
    const spec: ConceptSpec | null = validateConceptSpec(parsed);
    if (!spec) {
      return {
        source: "fallback",
        error: "The agent did not return a valid concept specification.",
      };
    }
    const concept = conceptFromSpec(spec);
    registerConcept(concept);
    // A preview of the new concept's baseline confirms the render function works.
    const svg = render(concept.id, concept.baseGenome);
    return { concept, svg, source: "llm" };
  } catch {
    return { source: "fallback", error: UNAVAILABLE_MESSAGE };
  }
}
