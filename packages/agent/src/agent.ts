/**
 * `VectorAgent` — the stateful wrapper that owns an agent-client lifecycle and
 * exposes the two LLM ops (steer, create) plus availability metadata.
 *
 * Construction is via the async {@link VectorAgent.create} factory so
 * availability can be probed before the object exists. When `auggie-v2` is
 * absent the agent still constructs — in `fallback` mode — and every op
 * degrades deterministically. A caller can therefore always `create()` and
 * always call the ops; graceful degradation is a property of the object, not
 * something the caller has to branch on.
 */
import type { Genome } from "@vector-create/core";
import { type AgentClient, type AgentClientFactory, spawnAuggieClient } from "./client";
import { createConceptOp } from "./create";
import { detectAuggie } from "./detect";
import { steerGenomeOp } from "./steer";
import { type AgentMode, type CreateResult, DEFAULT_TIMEOUT_MS, type SteerResult } from "./types";

/** Options for {@link VectorAgent.create}. All optional. */
export type VectorAgentOptions = {
  /**
   * Override client construction (used by tests to inject a fake, and by hosts
   * that manage their own transport). When provided, this takes precedence over
   * auto-detection and the agent runs in `llm` mode.
   */
  clientFactory?: AgentClientFactory;
  /**
   * Force availability instead of probing PATH. Mainly for tests; a host can
   * also set it when it knows the runtime out-of-band.
   */
  available?: boolean;
  /** Default per-op LLM timeout in ms before deterministic fallback. */
  timeoutMs?: number;
};

export class VectorAgent {
  /** Whether the LLM runtime is available (drives `mode`). */
  readonly available: boolean;
  /** `"llm"` when the agent can call the model, else `"fallback"`. */
  readonly mode: AgentMode;

  private readonly timeoutMs: number;
  private client: AgentClient | null;
  private closed = false;

  private constructor(available: boolean, client: AgentClient | null, timeoutMs: number) {
    this.available = available;
    this.mode = available ? "llm" : "fallback";
    this.client = client;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Build a `VectorAgent`, probing (or being told) whether the LLM runtime is
   * available. Never throws: a client-construction failure downgrades to
   * fallback mode rather than propagating.
   */
  static async create(options: VectorAgentOptions = {}): Promise<VectorAgent> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const available = options.clientFactory != null || (options.available ?? detectAuggie());
    if (!available) {
      return new VectorAgent(false, null, timeoutMs);
    }
    try {
      const factory = options.clientFactory ?? spawnAuggieClient;
      const client = await factory();
      return new VectorAgent(true, client, timeoutMs);
    } catch {
      // Could not bring up the agent — degrade gracefully to fallback.
      return new VectorAgent(false, null, timeoutMs);
    }
  }

  /**
   * Steer a concept's genome from natural language. In `llm` mode this asks the
   * agent for concrete gene values; in `fallback` mode it uses core's
   * deterministic promptMap. The result is always clamped and never throws.
   */
  steerGenome(conceptId: string, currentGenome: Genome, prompt: string): Promise<SteerResult> {
    return steerGenomeOp(this.liveClient(), conceptId, currentGenome, prompt, this.timeoutMs);
  }

  /**
   * Author a new concept from a description. Requires the LLM; in `fallback`
   * mode this resolves to `{ source: "fallback", error }` explaining that
   * `auggie-v2` is required. Never throws.
   */
  createConcept(description: string): Promise<CreateResult> {
    return createConceptOp(this.liveClient(), description, this.timeoutMs);
  }

  /** Release the underlying agent process/session. Idempotent. */
  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    try {
      this.client?.close();
    } catch {
      // Closing a dead/absent client must never throw.
    }
    this.client = null;
  }

  /** The client to use for an op, or `null` once closed / in fallback mode. */
  private liveClient(): AgentClient | null {
    return this.closed ? null : this.client;
  }
}
