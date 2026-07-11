/**
 * Steer a concept's genome from natural language.
 *
 * LLM mode: prompt the agent with the concept's genomeSpec + current genome,
 * parse concrete gene deltas/values from its reply, apply them, clamp via
 * core.sanitize, and re-render. Fallback (or ANY agent failure): use core's
 * deterministic promptMap (core.steer) + core.mutateGenome. Either way the
 * result genome is always run through core.sanitize, so it can never go
 * off-brand, and this function never throws for an agent failure.
 */
import {
  describe as describeGenome,
  type Genome,
  getConcept,
  mutateGenome,
  render,
  sanitize,
  steer as steerRules,
} from "@vector-create/core";
import type { AgentClient } from "./client";
import { buildSteerPrompt } from "./prompts";
import { extractJson, withTimeout } from "./robust";
import { DEFAULT_TIMEOUT_MS, type SteerResult } from "./types";

/** Shape the agent is asked to return for a steer. */
type SteerReply = { genome?: Record<string, unknown>; rationale?: unknown };

/**
 * Deterministic steer: map the prompt to a directional bias with the concept's
 * own promptRules, mutate the current genome that way, and clamp. Always
 * succeeds and never depends on the LLM.
 */
export function steerFallback(conceptId: string, current: Genome, prompt: string): SteerResult {
  const concept = getConcept(conceptId);
  if (!concept) {
    // Unknown concept: return the input untouched with an explanatory rationale
    // rather than throwing across the public API.
    return {
      genome: current,
      svg: "",
      rationale: `Unknown concept "${conceptId}".`,
      source: "fallback",
    };
  }
  const nudge = steerRules(concept, prompt);
  const mutated = mutateGenome(concept, current, nudge.rate, nudge.bias);
  const genome = sanitize(concept, mutated);
  const matched = nudge.matched.length
    ? describeGenome(concept, genome)
    : "no matching steer keywords";
  return {
    genome,
    svg: render(conceptId, genome),
    rationale: `Deterministic steer (${matched}).`,
    source: "fallback",
  };
}

/**
 * LLM steer with deterministic fallback. `client` may be `null` (no agent
 * available), in which case we go straight to {@link steerFallback}.
 */
export async function steerGenomeOp(
  client: AgentClient | null,
  conceptId: string,
  current: Genome,
  prompt: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<SteerResult> {
  const concept = getConcept(conceptId);
  if (!concept) {
    return steerFallback(conceptId, current, prompt);
  }
  if (!client) {
    return steerFallback(conceptId, current, prompt);
  }

  try {
    const sanitizedCurrent = sanitize(concept, current);
    await withTimeout(
      client.promptAndWait(buildSteerPrompt(concept, sanitizedCurrent, prompt)),
      timeoutMs
    );
    const { text } = await withTimeout(client.getLastAssistantTextTyped(), timeoutMs);
    const parsed = extractJson<SteerReply>(text);
    if (!parsed?.genome || typeof parsed.genome !== "object") {
      return steerFallback(conceptId, current, prompt);
    }

    // Merge the agent's proposed genes over the current genome, then clamp. Any
    // out-of-range or nonsense value is corrected by sanitize.
    const merged: Genome = { ...sanitizedCurrent };
    for (const [key, value] of Object.entries(parsed.genome)) {
      if (
        typeof value === "number" ||
        (Array.isArray(value) && value.every((v) => typeof v === "number"))
      ) {
        merged[key] = value as Genome[string];
      }
    }
    const genome = sanitize(concept, merged);
    const rationale =
      typeof parsed.rationale === "string" && parsed.rationale.trim()
        ? parsed.rationale.trim()
        : `Steered: ${describeGenome(concept, genome)}.`;
    return { genome, svg: render(conceptId, genome), rationale, source: "llm" };
  } catch {
    // Timeout, transport error, unparseable output — degrade deterministically.
    return steerFallback(conceptId, current, prompt);
  }
}
