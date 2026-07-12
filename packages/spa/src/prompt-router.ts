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
// current one steered. Intentionally strict: creation is the heavier,
// agent-only path. Conversational steers like "can we make some of the lines
// blue?" must NOT match — they are steer intents against the current concept.
const CREATE_PATTERNS: RegExp[] = [
  // "make/create a pyramid", "generate me an icon" — noun after article, not
  // "make some of the lines …" (partitive "some of" is steer, not create).
  /\b(make|create|generate|build|draw|design|invent)\s+(me\s+)?(a|an)\s+(?!bit\b|little\b)[\w-]+/i,
  /\b(make|create|generate|build|draw|design|invent)\s+(me\s+)?some\s+(?!of\b)[\w-]+/i,
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
