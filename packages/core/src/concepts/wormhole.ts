/**
 * Concept: wormhole / black-hole aggregator.
 *
 * Data flows in from the left into the TOP mouth of a wireframe wormhole,
 * through the throat, and emerges from the BOTTOM mouth out to organized
 * outputs on the right. `render(genome, prefix)` returns a self-contained
 * animated SVG string; partial genomes fall back to BASE_GENOME so every
 * candidate is on-brand by construction.
 */
import { composeSVG } from "../compose";
import type { Concept, Genome, GenomeSpec, PromptRule } from "../concept";
import { flowStreams, growPulse } from "../keyframes";
import {
  dataNode,
  flowConnector,
  funnelCore,
  glowFilters,
  outputCard,
  radialBloom,
  radialFillGradient,
} from "../primitives";
import { NON_SCALING, palette, stroke } from "../tokens";

const CORE_X = 176;
const CORE_Y = 170;

// Flow topology: data flows LEFT -> into the TOP mouth, through the throat, and
// EMERGES from the BOTTOM mouth -> out to the RIGHT.
const MOUTH_OFFSET = 120; // = BASE_GENOME.heightScale
const TOP_MOUTH = { x: CORE_X, y: CORE_Y - MOUTH_OFFSET };
const BOT_MOUTH = { x: CORE_X, y: CORE_Y + MOUTH_OFFSET };

// Left-edge inbound sources, all flowing rightward and up into the top mouth.
const INBOUND_SOURCES = [
  { x: 20, y: 70, entryDx: -34 },
  { x: 20, y: 120, entryDx: -12 },
  { x: 20, y: 170, entryDx: 12 },
  { x: 20, y: 220, entryDx: 34 },
];

// Right-edge output cards, fed by streams emerging from the bottom mouth.
const OUTPUT_ROWS = [206, 246, 286, 326, 366];
const OUTPUT_X = 372;
const CARD_W = 26;
const CARD_H = 18;
const EXIT_DX = [-40, -20, 0, 20, 40];

/**
 * The locked baseline genome (the approved wormhole). The variation engine
 * passes partial overrides; anything omitted falls back here so every generated
 * candidate is on-brand by construction.
 */
export const BASE_GENOME: Genome = {
  // --- Funnel geometry ---
  throatR: 7,
  mouthRx: 102,
  ellipseK: 0.32,
  latCount: 16,
  lonCount: 24,
  heightScale: 120,
  flare: 0.78,
  // --- Mesh styling ---
  ringOpacity: 0.34,
  meridianOpacity: 0.3,
  // --- Animation timing ---
  revealDuration: 3.5,
  litFraction: 0.82,
  ringDurations: [3.2, 4.2, 2.6],
  // Continuous flow of material along the streams (seconds per traversal).
  flowDuration: 3.0,
  flowDash: 0.14,
  flowGap: 0.5,
};

/**
 * The wormhole's tunable axes. Bounds keep every candidate on-brand. Preserved
 * exactly from the approved baseline (e.g. mouthRx min 96, step 7).
 */
export const WORMHOLE_SPEC: GenomeSpec = {
  // --- Funnel geometry ---
  throatR: { kind: "num", min: 4, max: 12, step: 2, label: "throat radius" },
  mouthRx: { kind: "num", min: 96, max: 122, step: 7, label: "mouth width" },
  ellipseK: { kind: "num", min: 0.24, max: 0.42, step: 0.05, label: "perspective" },
  flare: { kind: "num", min: 0.6, max: 0.9, step: 0.08, label: "concavity" },
  heightScale: { kind: "num", min: 96, max: 150, step: 14, label: "height" },
  latCount: { kind: "num", min: 12, max: 20, step: 2, int: true, label: "ring density" },
  lonCount: { kind: "num", min: 18, max: 30, step: 3, int: true, label: "meridian density" },
  // --- Mesh styling ---
  ringOpacity: { kind: "num", min: 0.22, max: 0.55, step: 0.08, label: "ring opacity" },
  meridianOpacity: { kind: "num", min: 0.2, max: 0.5, step: 0.08, label: "meridian opacity" },
  // --- Animation timing ---
  revealDuration: { kind: "num", min: 2.8, max: 4.6, step: 0.5, label: "cycle length" },
  litFraction: { kind: "num", min: 0.7, max: 0.9, step: 0.06, label: "lit fraction" },
  ringDurations: { kind: "list", min: 2.2, max: 5.0, step: 0.6, label: "ring pulse speeds" },
};

/** Wormhole-specific prompt steering rules (extend the shared set). */
export const WORMHOLE_PROMPT_RULES: PromptRule[] = [
  // --- mouth width ---
  { test: /\b(wider|broader|bigger mouths?|flared out|open(er)?)\b/, bias: { mouthRx: 1 } },
  { test: /\b(narrower|tighter mouths?|smaller mouths?)\b/, bias: { mouthRx: -1 } },
  // --- throat ---
  { test: /\b(tighter throat|pinch(ed)?|smaller throat|thinner waist)\b/, bias: { throatR: -1 } },
  { test: /\b(fatter throat|wider throat|open throat)\b/, bias: { throatR: 1 } },
  // --- concavity / funnel depth ---
  { test: /\b(deeper|more concave|steeper|more funnel|more gravity)\b/, bias: { flare: 1 } },
  { test: /\b(shallower|less concave|flatter|straighter)\b/, bias: { flare: -1 } },
  // --- vertical extent ---
  { test: /\b(taller|longer|stretch(ed)?)\b/, bias: { heightScale: 1 } },
  { test: /\b(shorter|squ(a|i)sh(ed)?|compact(er)?)\b/, bias: { heightScale: -1 } },
  // --- perspective tilt ---
  { test: /\b(more perspective|more 3d|deeper angle|more tilt)\b/, bias: { ellipseK: 1 } },
  { test: /\b(flatter angle|less perspective|top ?down|less 3d)\b/, bias: { ellipseK: -1 } },
  // --- mesh density ---
  {
    test: /\b(denser|finer mesh|more (rings|lines|mesh)|tighter mesh)\b/,
    bias: { latCount: 1, lonCount: 1 },
  },
  {
    test: /\b(sparser|coarser|fewer (rings|lines)|looser mesh|simpler mesh)\b/,
    bias: { latCount: -1, lonCount: -1 },
  },
  // --- mesh brightness / prominence ---
  {
    test: /\b(brighter mesh|stronger mesh|bolder mesh|more visible mesh|mesh pop)\b/,
    bias: { ringOpacity: 1, meridianOpacity: 1 },
  },
  {
    test: /\b(fainter mesh|subtler mesh|dimmer mesh|softer mesh|ghost(ly)? mesh)\b/,
    bias: { ringOpacity: -1, meridianOpacity: -1 },
  },
  // --- animation speed ---
  {
    test: /\b(slower|calmer|gentler|relax(ed)?)\b/,
    bias: { revealDuration: 1, ringDurations: 1, flowDuration: 1 },
  },
  {
    test: /\b(faster|snappier|quicker|energetic|livelier)\b/,
    bias: { revealDuration: -1, ringDurations: -1, flowDuration: -1 },
  },
  // --- lit dwell ---
  { test: /\b(longer (glow|dwell|hold)|linger)\b/, bias: { litFraction: 1 } },
  { test: /\b(shorter (glow|dwell|hold)|blink|flash)\b/, bias: { litFraction: -1 } },
];

const num = (g: Genome, key: string): number => Number(g[key]);
const list = (g: Genome, key: string): number[] => g[key] as number[];

export function wormhole(prefix = "BH1", genome: Genome = {}): string {
  const g: Genome = { ...BASE_GENOME, ...genome };
  const inboundCount = INBOUND_SOURCES.length;
  const outputCount = OUTPUT_ROWS.length;
  const totalPhases = inboundCount + outputCount;

  // Continuous flow (not pulse): one travelling-dash animation per stream,
  // phase-staggered so material streams along every path continuously.
  const { css: flowCss, classes: flowClasses } = flowStreams(prefix, totalPhases, {
    duration: num(g, "flowDuration"),
    dash: num(g, "flowDash"),
    gap: num(g, "flowGap"),
  });
  const inboundClasses = flowClasses.slice(0, inboundCount);
  const outputClasses = flowClasses.slice(inboundCount);

  const ringDurations = list(g, "ringDurations");
  const { css: growCss, classes: ringClasses } = growPulse(prefix, ringDurations.length, {
    origin: `${CORE_X}px ${CORE_Y}px`,
    durations: ringDurations,
    startScale: 0.2,
  });

  const defs = glowFilters(prefix) + radialFillGradient(prefix, CORE_X, CORE_Y, 120);
  const style = flowCss + growCss;

  const parts: string[] = [];

  parts.push(radialBloom(prefix, CORE_X, CORE_Y, 120));

  // Entry/exit points on the near-side arc of each mouth ellipse.
  const mouthRx = num(g, "mouthRx");
  const ellipseK = num(g, "ellipseK");
  const mouthRy = mouthRx * ellipseK;
  const rimY = (dx: number): number => {
    const t = Math.min(1, Math.abs(dx) / mouthRx);
    return mouthRy * Math.sqrt(Math.max(0, 1 - t * t));
  };
  const inEntry = (i: number) => {
    const dx = (INBOUND_SOURCES[i] as (typeof INBOUND_SOURCES)[number]).entryDx;
    return { x: TOP_MOUTH.x + dx, y: TOP_MOUTH.y + rimY(dx) };
  };
  const outExit = (i: number) => {
    const dx = EXIT_DX[i] as number;
    return { x: BOT_MOUTH.x + dx, y: BOT_MOUTH.y + rimY(dx) };
  };

  // Live inbound streams: material flowing from the left edge, up-and-in to the
  // top mouth and down the throat.
  for (let i = 0; i < inboundCount; i++) {
    const s = INBOUND_SOURCES[i] as (typeof INBOUND_SOURCES)[number];
    const e = inEntry(i);
    parts.push(
      flowConnector(intoTop(s.x, s.y, e.x, e.y, CORE_X, CORE_Y), inboundClasses[i] as string, {
        color: palette.active,
        width: stroke.primary,
        baseOpacity: 0.3,
        filter: `${prefix}_eg`,
      }) + dataNode(s.x, s.y, 2.6)
    );
  }

  parts.push(
    funnelCore(prefix, CORE_X, CORE_Y, {
      throatR: num(g, "throatR"),
      mouthRx,
      ellipseK,
      latCount: num(g, "latCount"),
      lonCount: num(g, "lonCount"),
      heightScale: num(g, "heightScale"),
      flare: num(g, "flare"),
      ringOpacity: num(g, "ringOpacity"),
      meridianOpacity: num(g, "meridianOpacity"),
      ringClasses,
    })
  );
  parts.push(dataNode(CORE_X, CORE_Y, 2.4, palette.active));

  // Live output streams: emerging from the bottom mouth, flowing down-and-out
  // to the right cards.
  for (let i = 0; i < outputCount; i++) {
    const row = OUTPUT_ROWS[i] as number;
    const termX = OUTPUT_X - CARD_W - 6;
    const x = outExit(i);
    const d = outOfBottom(CORE_X, CORE_Y, x.x, x.y, termX, row);
    parts.push(
      flowConnector(d, outputClasses[i] as string, {
        color: palette.active,
        width: stroke.primary,
        baseOpacity: 0.3,
        filter: `${prefix}_eg`,
      }) +
        dataNode(termX, row, 2.8) +
        outputCard(OUTPUT_X - CARD_W + 2, row - CARD_H / 2, CARD_W, CARD_H, {
          fill: palette.cardFill,
          stroke: palette.active,
          opacity: 0.95,
        }) +
        `<line x1="${OUTPUT_X - CARD_W + 8}" y1="${row}" x2="${OUTPUT_X - 6}" y2="${row}" style="stroke:${palette.active};stroke-width:${stroke.primary};opacity:0.9;${NON_SCALING}"/>`
    );
  }

  const body = parts.join("");

  return composeSVG({
    ariaLabel:
      "Wormhole aggregator: data flows in from the left into the top of a wireframe wormhole, through the throat, and emerges from the bottom out to organized outputs on the right (animated)",
    idPrefix: prefix,
    defs,
    style,
    body,
  });
}

/**
 * Full inbound flow: left-edge source -> top-mouth rim -> DOWN THE THROAT to the
 * central core. Two segments joined into one continuous path.
 */
function intoTop(sx: number, sy: number, rx: number, ry: number, tx: number, ty: number): string {
  const a1x = sx + (rx - sx) * 0.55;
  const a1y = sy;
  const a2x = rx;
  const a2y = ry + 40;
  const b1x = rx + (tx - rx) * 0.35;
  const b1y = ry + (ty - ry) * 0.55;
  const b2x = tx + (rx - tx) * 0.18;
  const b2y = ty - (ty - ry) * 0.28;
  return (
    `M${sx} ${sy} C ${a1x.toFixed(2)} ${a1y.toFixed(2)}, ${a2x.toFixed(2)} ${a2y.toFixed(2)}, ${rx.toFixed(2)} ${ry.toFixed(2)} ` +
    `C ${b1x.toFixed(2)} ${b1y.toFixed(2)}, ${b2x.toFixed(2)} ${b2y.toFixed(2)}, ${tx.toFixed(2)} ${ty.toFixed(2)}`
  );
}

/**
 * Full outbound flow: central core -> DOWN THE THROAT to the bottom-mouth rim ->
 * out to the right card. Mirror of intoTop.
 */
function outOfBottom(
  tx: number,
  ty: number,
  rx: number,
  ry: number,
  ex: number,
  ey: number
): string {
  const a1x = tx + (rx - tx) * 0.18;
  const a1y = ty + (ry - ty) * 0.28;
  const a2x = rx + (tx - rx) * 0.35;
  const a2y = ry - (ry - ty) * 0.55;
  const b1x = rx;
  const b1y = ry + 40;
  const b2x = rx + (ex - rx) * 0.5;
  const b2y = ey;
  return (
    `M${tx.toFixed(2)} ${ty.toFixed(2)} C ${a1x.toFixed(2)} ${a1y.toFixed(2)}, ${a2x.toFixed(2)} ${a2y.toFixed(2)}, ${rx.toFixed(2)} ${ry.toFixed(2)} ` +
    `C ${b1x.toFixed(2)} ${b1y.toFixed(2)}, ${b2x.toFixed(2)} ${b2y.toFixed(2)}, ${ex.toFixed(2)} ${ey.toFixed(2)}`
  );
}

/** The wormhole concept object. */
export const wormholeConcept: Concept = {
  id: "wormhole",
  title: "Wormhole aggregator",
  render: (genome?: Genome, prefix?: string) => wormhole(prefix, genome),
  genomeSpec: WORMHOLE_SPEC,
  baseGenome: BASE_GENOME,
  promptRules: WORMHOLE_PROMPT_RULES,
};
