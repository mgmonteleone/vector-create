/**
 * Compile an agent-authored declarative "scene" into a real core `Concept`.
 *
 * The agent never returns executable code (that would be an eval/injection
 * risk). It returns a validated JSON scene, and this module turns it into a
 * pure `render(genome, prefix)` built ENTIRELY from core's exported toolkit
 * primitives (composeSVG, flowConnector, dataNode, coreDisc, outputCard) and
 * keyframe composers (flowStreams, growPulse). The result is an animated SVG,
 * on-brand by construction, that plugs into the registry like any built-in.
 */
import {
  type Concept,
  composeSVG,
  coreDisc,
  dataNode,
  flowConnector,
  flowStreams,
  type Genome,
  type GenomeSpec,
  glowFilters,
  growPulse,
  outputCard,
  palette,
  radialBloom,
  radialFillGradient,
  stroke,
} from "@vector-create/core";

const CANVAS = 400;

/** The declarative scene the agent returns; every field is optional/validated. */
export type ConceptScene = {
  core?: { x: number; y: number; radius: number };
  nodes?: { x: number; y: number; r?: number }[];
  flows?: { from: [number, number]; to: [number, number] }[];
  cards?: { x: number; y: number; w: number; h: number }[];
};

/** The full author payload the agent produces for a new concept. */
export type ConceptSpec = {
  id: string;
  title: string;
  genomeSpec: GenomeSpec;
  baseGenome: Genome;
  scene: ConceptScene;
};

const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clampCanvas = (v: number): number => Math.min(CANVAS, Math.max(0, v));

/** Validate one gene-spec entry, returning `null` when malformed. */
function validateGene(gene: unknown): GenomeSpec[string] | null {
  if (!gene || typeof gene !== "object") {
    return null;
  }
  const g = gene as Record<string, unknown>;
  const kind = g.kind === "list" ? "list" : "num";
  if (!(isFiniteNum(g.min) && isFiniteNum(g.max) && isFiniteNum(g.step))) {
    return null;
  }
  const label = typeof g.label === "string" && g.label ? g.label : "value";
  if (kind === "num") {
    return {
      kind: "num",
      min: g.min,
      max: g.max,
      step: g.step,
      label,
      ...(g.int === true ? { int: true } : {}),
    };
  }
  return { kind: "list", min: g.min, max: g.max, step: g.step, label };
}

/**
 * Coerce an arbitrary parsed payload into a valid {@link ConceptSpec}, or return
 * `null` when it cannot be salvaged. This is the trust boundary: nothing past
 * here assumes the agent behaved.
 */
export function validateConceptSpec(raw: unknown): ConceptSpec | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id.trim() : "";
  const title = typeof r.title === "string" ? r.title.trim() : "";
  if (!(id && title)) {
    return null;
  }

  const specIn = r.genomeSpec;
  const genomeSpec: GenomeSpec = {};
  if (specIn && typeof specIn === "object") {
    for (const [key, gene] of Object.entries(specIn as Record<string, unknown>)) {
      const validated = validateGene(gene);
      if (validated) {
        genomeSpec[key] = validated;
      }
    }
  }
  if (Object.keys(genomeSpec).length === 0) {
    return null;
  }

  const baseGenome: Genome = {};
  const baseIn = r.baseGenome;
  for (const key of Object.keys(genomeSpec)) {
    const gene = genomeSpec[key];
    const raw =
      baseIn && typeof baseIn === "object" ? (baseIn as Record<string, unknown>)[key] : undefined;
    if (isFiniteNum(raw) && gene) {
      baseGenome[key] = raw;
    } else if (gene && gene.kind !== "color") {
      // Default missing baseline to the midpoint so the concept is on-brand.
      baseGenome[key] = (gene.min + gene.max) / 2;
    }
  }

  const scene = validateScene(r.scene);
  return { id, title, genomeSpec, baseGenome, scene };
}

/** Validate/clamp the scene geometry; drop malformed entries, keep valid ones. */
function validateScene(raw: unknown): ConceptScene {
  const scene: ConceptScene = {};
  if (!raw || typeof raw !== "object") {
    return scene;
  }
  const s = raw as Record<string, unknown>;

  const core = s.core as Record<string, unknown> | undefined;
  if (core && isFiniteNum(core.x) && isFiniteNum(core.y) && isFiniteNum(core.radius)) {
    scene.core = {
      x: clampCanvas(core.x),
      y: clampCanvas(core.y),
      radius: Math.max(2, Math.min(120, core.radius)),
    };
  }

  if (Array.isArray(s.nodes)) {
    scene.nodes = s.nodes
      .filter((n): n is Record<string, unknown> => !!n && typeof n === "object")
      .filter((n) => isFiniteNum(n.x) && isFiniteNum(n.y))
      .map((n) => ({
        x: clampCanvas(n.x as number),
        y: clampCanvas(n.y as number),
        ...(isFiniteNum(n.r) ? { r: Math.max(1, Math.min(10, n.r)) } : {}),
      }));
  }

  if (Array.isArray(s.flows)) {
    scene.flows = s.flows
      .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
      .filter(
        (f) =>
          Array.isArray(f.from) &&
          Array.isArray(f.to) &&
          isFiniteNum(f.from[0]) &&
          isFiniteNum(f.from[1]) &&
          isFiniteNum(f.to[0]) &&
          isFiniteNum(f.to[1])
      )
      .map((f) => ({
        from: [
          clampCanvas((f.from as number[])[0] as number),
          clampCanvas((f.from as number[])[1] as number),
        ] as [number, number],
        to: [
          clampCanvas((f.to as number[])[0] as number),
          clampCanvas((f.to as number[])[1] as number),
        ] as [number, number],
      }));
  }

  if (Array.isArray(s.cards)) {
    scene.cards = s.cards
      .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
      .filter((c) => isFiniteNum(c.x) && isFiniteNum(c.y) && isFiniteNum(c.w) && isFiniteNum(c.h))
      .map((c) => ({
        x: clampCanvas(c.x as number),
        y: clampCanvas(c.y as number),
        w: Math.max(4, Math.min(80, c.w as number)),
        h: Math.max(4, Math.min(80, c.h as number)),
      }));
  }

  return scene;
}

/** A gentle cubic path between two points, bowed toward the core for flow feel. */
function flowPath(from: [number, number], to: [number, number]): string {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2;
  return `M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

/**
 * Build an animated render function for a validated scene. The genome is
 * accepted (and drives animation timing) so the concept still varies, but the
 * geometry comes from the fixed scene — the agent authored the LAYOUT, the
 * genome tunes its FEEL.
 */
function buildRender(scene: ConceptScene): (genome?: Genome, prefix?: string) => string {
  return (genome: Genome = {}, prefix = "GEN") => {
    const flows = scene.flows ?? [];
    const nodes = scene.nodes ?? [];
    const cards = scene.cards ?? [];
    const core = scene.core;

    // Animation timing: read a "speed"-ish gene if present, else a sane default.
    const speedGene = Object.entries(genome).find(([k]) => /speed|duration|flow|rate/i.test(k));
    const duration =
      typeof speedGene?.[1] === "number" ? Math.max(1, Math.min(8, speedGene[1] as number)) : 3;

    const { css: flowCss, classes: flowClasses } = flowStreams(prefix, Math.max(flows.length, 1), {
      duration,
    });

    let pulseCss = "";
    let pulseClass: string | undefined;
    if (core) {
      const grow = growPulse(prefix, 1, {
        origin: `${core.x}px ${core.y}px`,
        durations: [duration + 0.6],
        startScale: 0.3,
      });
      pulseCss = grow.css;
      pulseClass = grow.classes[0];
    }

    const defs =
      glowFilters(prefix) +
      (core ? radialFillGradient(prefix, core.x, core.y, Math.max(core.radius * 2, 40)) : "");
    const style = flowCss + pulseCss;

    const parts: string[] = [];

    if (core) {
      parts.push(radialBloom(prefix, core.x, core.y, Math.max(core.radius * 2, 40)));
    }

    flows.forEach((f, i) => {
      parts.push(
        flowConnector(flowPath(f.from, f.to), flowClasses[i] as string, {
          color: palette.active,
          width: stroke.primary,
          baseOpacity: 0.3,
          filter: `${prefix}_eg`,
        })
      );
    });

    for (const n of nodes) {
      parts.push(dataNode(n.x, n.y, n.r ?? 2.8));
    }

    for (const c of cards) {
      parts.push(
        outputCard(c.x, c.y, c.w, c.h, {
          fill: palette.cardFill,
          stroke: palette.active,
          opacity: 0.95,
        })
      );
    }

    if (core) {
      const disc = coreDisc(prefix, core.x, core.y, core.radius);
      parts.push(pulseClass ? `<g class="${pulseClass}">${disc}</g>` : disc);
    }

    return composeSVG({
      ariaLabel: "Agent-authored animated concept (data flows through a central core)",
      idPrefix: prefix,
      defs,
      style,
      body: parts.join(""),
    });
  };
}

/** Turn a validated {@link ConceptSpec} into a registrable core `Concept`. */
export function conceptFromSpec(spec: ConceptSpec): Concept {
  return {
    id: spec.id,
    title: spec.title,
    genomeSpec: spec.genomeSpec,
    baseGenome: spec.baseGenome,
    render: buildRender(spec.scene),
  };
}
