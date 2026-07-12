/**
 * The canonical vector-create operation set — the ONE place that combines
 * @vector-create/core (deterministic rendering + variation) with the optional
 * @vector-create/agent (LLM steering / authoring). REST, gRPC and MCP are thin
 * adapters over this module and must never re-implement any of this logic, so
 * the three faces can never drift.
 *
 * Every op degrades gracefully: when the agent is unavailable, Steer/CreateConcept
 * fall back to core's deterministic heuristics (prompt mapping + sampling) and
 * report `source: "heuristic"`.
 */

import { Resvg } from "@resvg/resvg-js";
import {
  type Concept,
  listConcepts as coreListConcepts,
  render as coreRender,
  steer as coreSteer,
  type Genome,
  getConcept,
  sampleConcept,
  sanitize,
} from "@vector-create/core";
import type { VectorAgentLike } from "./agent";

/** A concept as exposed over the wire: schema + baseline travel as plain data. */
export type ConceptSummary = {
  id: string;
  title: string;
  genomeSpec: Concept["genomeSpec"];
  baseGenome: Genome;
};

export type RenderResult = { svg: string };

export type SteerResult = {
  genome: Genome;
  svg: string;
  rationale: string;
  source: string;
};

export type VariationsOptions = {
  seed?: number;
  anchor?: Genome;
  bias?: Record<string, 1 | -1>;
  rate?: number;
};

export type VariationsResult = { genomes: Genome[]; svgs: string[] };

export type CreateConceptResult = {
  conceptId: string;
  title: string;
  svg: string;
  source: string;
};

/** Rasterize an SVG string into PNG bytes (resvg — pure Rust, Bun-friendly). */
export type SvgRasterizer = (svg: string, width?: number, height?: number) => Uint8Array;

/** Everything the operations layer needs, injected for testability. */
export type OperationsDeps = {
  /** Optional live agent; when null/`available:false` ops run core-only. */
  agent?: VectorAgentLike | null;
  /** SVG->PNG rasterizer; defaults to the resvg-backed implementation. */
  rasterize?: SvgRasterizer;
};

function resolveConcept(conceptId: string): Concept {
  const c = getConcept(conceptId);
  if (!c) {
    const known = coreListConcepts()
      .map((k) => k.id)
      .join(", ");
    throw new Error(`Unknown concept "${conceptId}". Known: ${known}`);
  }
  return c;
}

/** True when a live, available agent is wired in. */
function agentReady(agent: VectorAgentLike | null | undefined): agent is VectorAgentLike {
  return Boolean(agent?.available);
}

/** A minimal structural check that a value could be a genome (keyed numbers). */
function isGenome(value: unknown): value is Genome {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The operations façade. Construct once (per process, sharing one agent) and
 * hand the same instance to every face.
 */
export class Operations {
  private readonly agent: VectorAgentLike | null;
  private readonly rasterize: SvgRasterizer;

  constructor(deps: OperationsDeps = {}) {
    this.agent = deps.agent ?? null;
    this.rasterize = deps.rasterize ?? defaultRasterize;
  }

  /** Every registered concept with its schema + on-brand baseline. */
  listConcepts(): ConceptSummary[] {
    return coreListConcepts().map((c) => ({
      id: c.id,
      title: c.title,
      genomeSpec: c.genomeSpec,
      baseGenome: c.baseGenome,
    }));
  }

  /** Agent availability (true LLM path vs heuristic fallback). */
  agentStatus(): { available: boolean; mode: string } {
    return {
      available: Boolean(this.agent?.available),
      mode: this.agent?.mode ?? "fallback",
    };
  }

  /** Render a concept's (partial) genome to an animated SVG string. */
  render(conceptId: string, genome?: Genome, prefix?: string): RenderResult {
    resolveConcept(conceptId);
    return { svg: coreRender(conceptId, genome, prefix) };
  }

  /**
   * Steer a genome with a natural-language prompt. Uses the agent when
   * available; otherwise applies core's deterministic prompt→bias mapping and
   * one sampling step, reporting `source: "heuristic"`.
   *
   * Steer is a total function: it never throws and always resolves to a valid,
   * on-brand (clamped) genome plus a real SVG. A live agent that throws or
   * returns garbage (out-of-range genes, a non-SVG string, a non-string
   * rationale) is not trusted verbatim — the genome is re-clamped through
   * core.sanitize and the SVG re-rendered from it, and any thrown error degrades
   * to the deterministic heuristic path.
   */
  async steer(conceptId: string, genome: Genome, prompt: string): Promise<SteerResult> {
    const concept = resolveConcept(conceptId);
    if (agentReady(this.agent)) {
      try {
        const r = await this.agent.steerGenome(conceptId, genome, prompt);
        const safeGenome = sanitize(concept, isGenome(r?.genome) ? r.genome : genome);
        const svg =
          typeof r?.svg === "string" && r.svg.includes("<svg")
            ? r.svg
            : coreRender(conceptId, safeGenome);
        const rationale =
          typeof r?.rationale === "string" && r.rationale.trim()
            ? r.rationale
            : `Steered "${prompt}".`;
        const source = typeof r?.source === "string" && r.source ? r.source : "llm";
        return { genome: safeGenome, svg, rationale, source };
      } catch {
        // A live agent that throws must not break the op — fall through to the
        // deterministic heuristic so steer stays total.
      }
    }

    return this.steerHeuristic(concept, conceptId, genome, prompt);
  }

  /** Deterministic, agent-free steer. Always succeeds; source "heuristic". */
  private steerHeuristic(
    concept: Concept,
    conceptId: string,
    genome: Genome,
    prompt: string
  ): SteerResult {
    const start = sanitize(concept, genome);
    const { bias, rate, matched } = coreSteer(concept, prompt);
    const { genomes } = sampleConcept(concept, 1, { anchor: start, bias, rate });
    const next = genomes[0] ?? start;
    const svg = coreRender(conceptId, next);
    const rationale = matched.length
      ? `Nudged ${matched.join(", ")} to follow "${prompt}".`
      : `No matching steer rule for "${prompt}"; applied a small on-brand jitter.`;
    return { genome: next, svg, rationale, source: "heuristic" };
  }

  /** Produce n on-brand candidate genomes and their rendered SVGs. */
  variations(conceptId: string, n: number, opts: VariationsOptions = {}): VariationsResult {
    const concept = resolveConcept(conceptId);
    const count = Math.max(1, Math.floor(n));
    const { genomes } = sampleConcept(concept, count, {
      seed: opts.seed,
      anchor: opts.anchor,
      bias: opts.bias,
      rate: opts.rate,
    });
    const svgs = genomes.map((g) => coreRender(conceptId, g));
    return { genomes, svgs };
  }

  /**
   * Author an entirely new concept from a description. Requires the agent; when
   * unavailable this returns a heuristic stub rendered from the wormhole
   * baseline so the face still responds (source: "heuristic").
   */
  async createConcept(description: string): Promise<CreateConceptResult> {
    if (agentReady(this.agent)) {
      const r = await this.agent.createConcept(description);
      // The agent may still report a soft failure (concept/svg absent) even
      // when available; only trust a result that actually authored a concept.
      if (r.concept && r.svg) {
        return {
          conceptId: r.concept.id,
          title: r.concept.title,
          svg: r.svg,
          source: r.source,
        };
      }
    }

    const fallback = coreListConcepts()[0];
    if (!fallback) {
      throw new Error("No concepts registered; cannot synthesize a fallback.");
    }
    const svg = coreRender(fallback.id);
    return {
      conceptId: fallback.id,
      title: `Draft from "${description.slice(0, 48)}"`,
      svg,
      source: "heuristic",
    };
  }

  /** Rasterize an SVG string to PNG bytes. */
  exportPng(svg: string, width?: number, height?: number): Uint8Array {
    if (!svg?.includes("<svg")) {
      throw new Error("exportPng requires a non-empty SVG string.");
    }
    return this.rasterize(svg, width, height);
  }

  /** Close the shared agent (if any). Safe to call more than once. */
  async close(): Promise<void> {
    if (this.agent) {
      await this.agent.close();
    }
  }
}

/** resvg-backed SVG->PNG rasterizer. Tests inject a stub via OperationsDeps. */
function defaultRasterize(svg: string, width?: number, height?: number): Uint8Array {
  const fitTo =
    width && width > 0
      ? ({ mode: "width", value: width } as const)
      : height && height > 0
        ? ({ mode: "height", value: height } as const)
        : ({ mode: "original" } as const);
  const resvg = new Resvg(svg, { fitTo });
  return resvg.render().asPng();
}
