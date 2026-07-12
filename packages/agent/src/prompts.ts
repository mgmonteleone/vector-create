/**
 * Prompt builders. The agent is asked to return STRICT JSON only, so the ops
 * can parse a machine answer out of its text. Bounds and the current genome are
 * inlined so the model proposes concrete, in-range values rather than prose.
 */
import type { Concept, Genome, GenomeSpec } from "@vector-create/core";

/** Render the concept's gene bounds as a compact table for the prompt. */
function genomeSpecTable(spec: GenomeSpec): string {
  const rows: string[] = [];
  for (const [key, gene] of Object.entries(spec)) {
    rows.push(
      `- ${key} (${gene.label}): ${gene.kind}, min=${gene.min}, max=${gene.max}, step=${gene.step}` +
        (gene.kind === "num" && gene.int ? ", integer" : "")
    );
  }
  return rows.join("\n");
}

/**
 * Prompt for steering: given a concept's tunable genes, its current genome, and
 * a natural-language instruction, ask for concrete new gene values. The model
 * returns only the genes it wants to change; unlisted genes are left as-is and
 * everything is clamped by core afterward.
 */
export function buildSteerPrompt(concept: Concept, current: Genome, instruction: string): string {
  return [
    `You tune the "${concept.title}" generative vector graphic by adjusting its genome.`,
    "",
    "Tunable genes (stay within [min,max]; list genes are arrays of numbers):",
    genomeSpecTable(concept.genomeSpec),
    "",
    `Current genome (JSON): ${JSON.stringify(current)}`,
    "",
    `Instruction: "${instruction}"`,
    "",
    "Respond with STRICT JSON only, no prose, in this exact shape:",
    '{"genome": { "<geneName>": <number | number[]> , ... }, "rationale": "<one short sentence>"}',
    "Include only the genes you are changing. Values must respect the bounds above.",
  ].join("\n");
}

/**
 * Prompt for authoring a new concept. The agent does NOT return executable code
 * — it returns a declarative scene the package deterministically compiles into a
 * render function using core's toolkit primitives, so no untrusted code runs.
 */
export function buildCreatePrompt(description: string): string {
  return [
    "You design a new animated SVG concept for a generative vector-graphics studio.",
    "The canvas is 400x400 (viewBox 0 0 400 400). You do NOT write code; you return a",
    "declarative scene that is compiled deterministically into an animated SVG.",
    "",
    `Concept description: "${description}"`,
    "",
    "Respond with STRICT JSON only, no prose, in this exact shape:",
    "{",
    '  "id": "<kebab-case-id>",',
    '  "title": "<human title>",',
    '  "genomeSpec": { "<gene>": {"kind":"num","min":<n>,"max":<n>,"step":<n>,"label":"<label>","int":<bool?>} , ... },',
    '  "baseGenome": { "<gene>": <number> , ... },',
    '  "scene": {',
    '    "core": {"x":<0-400>,"y":<0-400>,"radius":<n>},',
    '    "nodes": [ {"x":<0-400>,"y":<0-400>,"r":<n?>} , ... ],',
    '    "flows": [ {"from":[<x>,<y>],"to":[<x>,<y>]} , ... ],',
    '    "cards": [ {"x":<0-400>,"y":<0-400>,"w":<n>,"h":<n>} , ... ]',
    "  }",
    "}",
    "Keep 2-6 genes, all numeric. Every coordinate must be inside the 400x400 canvas.",
    "The scene should visually express the description: a core, some data nodes,",
    "animated flow connectors between points, and optional output cards.",
  ].join("\n");
}
