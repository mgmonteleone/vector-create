/**
 * Prompt routing. A single terminal prompt bar accepts BOTH natural-language
 * steering of the current concept ("wider mouths, slower flow") AND requests to
 * author a brand-new concept ("make a pyramid", "something about
 * communication"). This module decides which intent a line expresses so the app
 * can route steering -> POST /api/steer and creation -> POST /api/concepts.
 */

/** The two prompt intents the terminal understands. */
export type PromptIntent = "steer" | "create";

// Phrases that signal the user wants a NEW concept authored rather than the
// current one steered. Kept intentionally conservative: creation is the
// heavier, agent-only path, so we only route there on a clear creation verb.
const CREATE_PATTERNS: RegExp[] = [
  /\b(make|create|generate|build|draw|design|invent)\s+(me\s+)?(a|an|some)\b/i,
  /\bnew\s+concept\b/i,
  /\bsomething\s+(about|like|that)\b/i,
  /\b(a|an)\s+concept\s+(for|about|of)\b/i,
  /\bconcept\s*:/i,
];

/**
 * Classify a prompt line as steering or concept-creation. Empty input defaults
 * to "steer" (the caller guards against empty submits anyway).
 */
export function classifyPrompt(raw: string): PromptIntent {
  const text = raw.trim();
  if (!text) {
    return "steer";
  }
  return CREATE_PATTERNS.some((re) => re.test(text)) ? "create" : "steer";
}
