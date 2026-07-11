/**
 * Shared SPA-level types. Concept/genome types come from @vector-create/core;
 * the shapes below mirror the documented server REST contract (see api.ts).
 */
import type { GeneSpec, Genome, GenomeSpec } from "@vector-create/core";

export type { GeneSpec, Genome, GenomeSpec };

/** A concept summary as returned by GET /api/concepts. */
export type ConceptSummary = {
  id: string;
  title: string;
  genomeSpec: GenomeSpec;
  baseGenome: Genome;
};

/** Whether an agent-backed result came from the LLM or the deterministic fallback. */
export type AgentSource = "llm" | "fallback";

/** POST /api/steer response. */
export type SteerResult = {
  genome: Genome;
  svg: string;
  rationale: string;
  source: AgentSource;
};

/** POST /api/variations response. */
export type VariationsResult = {
  genomes: Genome[];
  svgs: string[];
};

/** POST /api/concepts response. */
export type CreateConceptResult = {
  conceptId: string;
  title: string;
  svg: string;
  source: AgentSource;
};

/** A single line in the terminal log pane. */
export type LogLevel = "info" | "ok" | "warn" | "err" | "agent";

export type LogLine = {
  id: number;
  level: LogLevel;
  text: string;
};

/** A persisted session saved to localStorage. */
export type SavedSession = {
  name: string;
  conceptId: string;
  genome: Genome;
  promptHistory: string[];
  savedAt: number;
};
