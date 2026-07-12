/**
 * The Concept contract and its genome-spec types. A Concept is a self-describing
 * renderable: it owns its genome schema (`genomeSpec`), an on-brand baseline
 * (`baseGenome`), and a pure `render(genome, prefix?)` that returns an animated
 * SVG string. The registry, sampler, promptMap and genome utilities are all
 * concept-agnostic — they operate on whatever `genomeSpec` a concept declares,
 * so new concepts (wormhole, pyramid, …) plug in behind one typed contract.
 */

/** A genome is a flat bag of tunable values keyed by gene name. */
export type Genome = Record<string, GeneValue>;

/** A gene is a single number, a per-band list of numbers, or a colour hex. */
export type GeneValue = number | number[] | string;

/** A numeric gene: clamped to [min,max], mutated by +/- up to `step`. */
export type NumGeneSpec = {
  kind: "num";
  min: number;
  max: number;
  step: number;
  /** Round to an integer after clamping. */
  int?: boolean;
  /** Human-readable label used by `describe` and prompt matching. */
  label: string;
};

/** A list gene: a per-band array, mutated element-wise within [min,max]. */
export type ListGeneSpec = {
  kind: "list";
  min: number;
  max: number;
  step: number;
  label: string;
};

/**
 * A colour gene: a hex string chosen from a fixed, on-brand `palette`. Colour
 * genes are prompt-first — they are steerable by the agent but deliberately
 * excluded from mutation/sampling so variations never shuffle the palette.
 */
export type ColorGeneSpec = {
  kind: "color";
  /** The allowed hex values (e.g. "#5CCC76"); the first is a safe default. */
  palette: string[];
  label: string;
};

export type GeneSpec = NumGeneSpec | ListGeneSpec | ColorGeneSpec;

/**
 * The tunable axes of a concept, keyed by gene name. Bounds are chosen so every
 * point in the space stays on-brand and readable — the engine cannot wander off
 * the approved look.
 */
export type GenomeSpec = Record<string, GeneSpec>;

/**
 * A single prompt-steering rule for a concept: a keyword regex mapped to a
 * directional bias over genes (+1 pushes the gene up, -1 down).
 */
export type PromptRule = {
  test: RegExp;
  bias: Record<string, 1 | -1>;
};

/** The contract every concept implements. */
export type Concept = {
  /** Stable machine id, e.g. "wormhole". */
  id: string;
  /** Human title, e.g. "Wormhole aggregator". */
  title: string;
  /** Render an animated SVG string from a (partial) genome + id prefix. */
  render: (genome?: Genome, prefix?: string) => string;
  /** The concept's genome schema. */
  genomeSpec: GenomeSpec;
  /** The approved on-brand baseline genome. */
  baseGenome: Genome;
  /** Optional concept-specific prompt-steering rules (extend the shared set). */
  promptRules?: PromptRule[];
};
