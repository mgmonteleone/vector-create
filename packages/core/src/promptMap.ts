/**
 * Rule-based prompt -> genome-nudge mapper. Turns plain steering language
 * ("wider, brighter mesh, slower") into a directional bias map the sampler
 * applies. Deliberately NOT an LLM: a fixed keyword dictionary is predictable,
 * reviewable, and cannot push the genome off-brand (the sampler still clamps to
 * the concept's genomeSpec). Unknown words are ignored; matched words
 * accumulate, and later hits on the same gene overwrite earlier ones.
 *
 * The rule set is concept-supplied (`concept.promptRules`) so each concept
 * steers its own genes with the same shared machinery.
 */
import type { Concept, PromptRule } from "./concept";
import type { Bias } from "./sampler";

export type PromptSteer = {
  /** gene -> +1/-1 directional nudge. */
  bias: Bias;
  /** Mutation strength ("a bit" -> 0.5, "much"/"way" -> 1.6, else 1). */
  rate: number;
  /** The genes that were nudged, e.g. "mouthRx+" (for the review label). */
  matched: string[];
};

const A_BIT = /\b(a bit|slightly|a little|touch|subtle)\b/;
const A_LOT = /\b(much|way|a lot|dramatically|far)\b/;

/** Parse a steering prompt against an explicit rule set. */
export function mapPromptWithRules(prompt: string, rules: PromptRule[]): PromptSteer {
  const text = String(prompt || "").toLowerCase();
  const bias: Bias = {};
  const matched: string[] = [];
  for (const rule of rules) {
    if (rule.test.test(text)) {
      for (const [gene, dir] of Object.entries(rule.bias)) {
        bias[gene] = dir;
        matched.push(`${gene}${dir > 0 ? "+" : "-"}`);
      }
    }
  }
  let rate = 1;
  if (A_BIT.test(text)) {
    rate = 0.5;
  }
  if (A_LOT.test(text)) {
    rate = 1.6;
  }
  return { bias, rate, matched };
}

/** Parse a steering prompt using a concept's own promptRules. */
export function mapPrompt(concept: Concept, prompt: string): PromptSteer {
  return mapPromptWithRules(prompt, concept.promptRules ?? []);
}
