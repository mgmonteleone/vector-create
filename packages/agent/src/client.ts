/**
 * The narrow agent-client surface this package drives, plus the factory that
 * builds the real `AuggieClient` from the Cosmos Agent SDK.
 *
 * Every op only needs three things from the SDK: send a prompt and wait for the
 * turn to finish, read back the agent's final text, and close the session. We
 * model exactly that as {@link AgentClient} so tests can inject an in-memory
 * fake (or drive the SDK's own `FakeTransport`) without spawning `auggie`,
 * and so the public API never leaks the full SDK type surface.
 */
import { AuggieClient } from "@augmentcode/cosmos-agent-sdk";

/**
 * The minimal client contract the steer/create ops depend on. Deliberately a
 * subset of the SDK's `AuggieClient` so any conforming stand-in (test fake,
 * alternate transport) works without change.
 */
export type AgentClient = {
  /** Send one prompt and resolve when the turn completes. */
  promptAndWait(message: string): Promise<void>;
  /** The agent's last assistant text, or `null` if it produced none. */
  getLastAssistantTextTyped(): Promise<{ text: string | null }>;
  /** Terminate the underlying session/process. */
  close(): void;
};

/**
 * A factory that produces an {@link AgentClient}. Injecting a factory (rather
 * than a live client) lets `VectorAgent` own the client lifecycle and lets
 * tests swap the whole implementation.
 */
export type AgentClientFactory = () => AgentClient | Promise<AgentClient>;

/**
 * Build a real SDK-backed client that spawns the auggie CLI (`auggie --mode
 * rpc`; the v2 runtime installed via `@augmentcode/auggie-v2`).
 *
 * The extension-UI handler auto-cancels every request: this package drives the
 * agent head-lessly (no human at a UI to answer prompts), so cancelling is the
 * correct, safe default. Auth is handled by the SDK over its own session
 * channel — we never touch or pass tokens here.
 */
export function spawnAuggieClient(): AgentClient {
  return new AuggieClient({
    // No interactive UI in this headless context; decline every UI request.
    extensionUIHandler: () => undefined,
  });
}
