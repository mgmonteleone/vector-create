/**
 * @vector-create/agent — an LLM agent that steers concept genomes from natural
 * language and authors brand-new concepts, wrapping the Cosmos Agent SDK with a
 * hard graceful-degradation guarantee: every operation works (deterministically)
 * when the `auggie-v2` binary is absent.
 *
 * Two ways in:
 *   - {@link VectorAgent} — a stateful client owning one agent session, with
 *     `.available` / `.mode` and `steerGenome` / `createConcept` / `close`.
 *   - The plain tool functions ({@link renderGenome}, {@link steerGenome},
 *     {@link createConcept}, {@link listConcepts}) — the interface-agnostic
 *     surface the server maps onto REST / gRPC / MCP.
 */

// --- Stateful agent ---
export { VectorAgent, type VectorAgentOptions } from "./agent";
// --- Concept authoring internals (useful for hosts/tests) ---
export {
  type ConceptScene,
  type ConceptSpec,
  conceptFromSpec,
  validateConceptSpec,
} from "./buildConcept";
// --- Client surface (for hosts that manage their own transport) ---
export {
  type AgentClient,
  type AgentClientFactory,
  spawnAuggieClient,
} from "./client";
// --- Availability detection ---
export { AUGGIE_BINARY, detectAuggie, isOnPath } from "./detect";
// --- Deterministic steer (exposed for hosts that want fallback directly) ---
export { steerFallback } from "./steer";
// --- Plain typed tool functions ---
export {
  type ConceptSummary,
  createConcept,
  listConcepts,
  renderGenome,
  steerGenome,
} from "./tools";
// --- Shared result/option types ---
export {
  type AgentMode,
  type CreateResult,
  DEFAULT_TIMEOUT_MS,
  type OpOptions,
  type Source,
  type SteerResult,
} from "./types";
