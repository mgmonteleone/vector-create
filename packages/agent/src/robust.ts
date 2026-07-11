/**
 * Robustness helpers shared by every op: bounded waits and tolerant JSON
 * extraction. The invariant these enforce is that an agent failure — a hang, a
 * crash, or unparseable output — becomes a deterministic fallback, never a
 * thrown error across the public API.
 */

/** Thrown internally when an agent turn exceeds its budget. Never escapes the API. */
export class AgentTimeoutError extends Error {
  constructor(ms: number) {
    super(`Agent did not respond within ${ms}ms.`);
    this.name = "AgentTimeoutError";
  }
}

/**
 * Race a promise against a timeout. Resolves with the promise's value if it
 * settles in time, otherwise rejects with {@link AgentTimeoutError}. The timer
 * is always cleared so a slow-but-eventual resolution cannot leak a handle.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new AgentTimeoutError(ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/**
 * Extract the first balanced JSON object from arbitrary agent text. LLMs wrap
 * JSON in prose, fenced code blocks, or trailing commentary; this pulls out the
 * first `{...}` whose braces balance (ignoring braces inside strings) and parses
 * it. Returns `null` when nothing parseable is found — the caller then falls
 * back deterministically rather than throwing.
 */
export function extractJson<T = unknown>(text: string | null | undefined): T | null {
  if (!text) {
    return null;
  }
  const start = text.indexOf("{");
  if (start === -1) {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = text.slice(start, i + 1);
        try {
          return JSON.parse(slice) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
