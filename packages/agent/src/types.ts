/**
 * Public result/option types for the agent ops. Kept in one module so the tool
 * functions, the `VectorAgent` class, and the server integration all share one
 * vocabulary.
 */
import type { Concept, Genome } from "@vector-create/core";

/** Which engine produced a result: the LLM agent, or core's deterministic path. */
export type Source = "llm" | "fallback";

/** Operating mode of a `VectorAgent`: mirrors availability at create() time. */
export type AgentMode = "llm" | "fallback";

/** Result of steering a genome from natural language. */
export type SteerResult = {
  /** The new, sanitized (clamped) genome. */
  genome: Genome;
  /** The freshly rendered SVG for the new genome. */
  svg: string;
  /** A short human-readable explanation of what changed and why. */
  rationale: string;
  /** Which engine produced this result. */
  source: Source;
};

/** Result of authoring a brand-new concept from a description. */
export type CreateResult = {
  /** The registered concept, or `undefined` when authoring was unavailable. */
  concept?: Concept;
  /** A preview render of the new concept's baseline, or `undefined` on failure. */
  svg?: string;
  /** Which engine produced this result. */
  source: Source;
  /** Present only on failure/fallback: why authoring could not happen. */
  error?: string;
};

/** Options accepted by the steer/create ops (all optional). */
export type OpOptions = {
  /**
   * Milliseconds to wait for the agent before falling back deterministically.
   * Applies per LLM turn. Defaults to {@link DEFAULT_TIMEOUT_MS}.
   */
  timeoutMs?: number;
};

/** Default per-turn LLM timeout before deterministic fallback kicks in. */
export const DEFAULT_TIMEOUT_MS = 60_000;
