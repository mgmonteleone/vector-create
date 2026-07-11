// Runtime mirror of concepts/blackhole.ts (types stripped).
import { composeSVG } from "../compose.mjs";
import { flowStreams, growPulse, staggeredReveal } from "../keyframes.mjs";
import {
  connector,
  dataNode,
  flowConnector,
  funnelCore,
  glowFilters,
  outputCard,
  radialBloom,
  radialFillGradient,
  streamOfNodes,
} from "../primitives.mjs";
import { NON_SCALING, palette, stroke } from "../tokens.mjs";

const CORE_X = 176;
const CORE_Y = 170;

// Flow topology: data flows LEFT -> into the TOP mouth of the wormhole, through
// the throat, and EMERGES from the BOTTOM mouth -> out to the RIGHT.
// Mouth-plane centers are derived from the funnel geometry
// (top mouth y = CORE_Y - heightScale, bottom mouth y = CORE_Y + heightScale).
const MOUTH_OFFSET = 120; // = BASE_GENOME.heightScale
const TOP_MOUTH = { x: CORE_X, y: CORE_Y - MOUTH_OFFSET }; // (176, 50)
const BOT_MOUTH = { x: CORE_X, y: CORE_Y + MOUTH_OFFSET }; // (176, 290)

// Left-edge inbound sources: staggered vertically, all flowing rightward and up
// into the top mouth rim. Entry x-offsets spread them across the mouth ellipse.
const INBOUND_SOURCES = [
  { x: 20, y: 70, entryDx: -34 },
  { x: 20, y: 120, entryDx: -12 },
  { x: 20, y: 170, entryDx: 12 },
  { x: 20, y: 220, entryDx: 34 },
];

// Right-edge output cards: fed by streams emerging from the bottom mouth rim.
const OUTPUT_ROWS = [206, 246, 286, 326, 366];
const OUTPUT_X = 372;
const CARD_W = 26;
const CARD_H = 18;
// Exit x-offsets spread the emerging streams across the bottom mouth ellipse.
const EXIT_DX = [-40, -20, 0, 20, 40];

// The locked baseline genome (the approved wormhole). The variation engine
// passes partial overrides of these keys; anything omitted falls back here so
// every generated candidate is on-brand by construction.
export const BASE_GENOME = {
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
  // Lower = faster flow. This replaces the old on/off pulse.
  flowDuration: 3.0,
  flowDash: 0.14,
  flowGap: 0.5,
};

export function blackhole(prefix = "BH1", genome = {}) {
  const g = { ...BASE_GENOME, ...genome };
  const inboundCount = INBOUND_SOURCES.length;
  const outputCount = OUTPUT_ROWS.length;
  const totalPhases = inboundCount + outputCount;

  // Continuous flow (not pulse): one travelling-dash animation per stream, all
  // sharing a keyframe but phase-staggered so material streams along every path
  // continuously. Inbound streams flow source->throat; output streams flow
  // throat->card; together they read as one uninterrupted current through the
  // wormhole.
  const { css: flowCss, classes: flowClasses } = flowStreams(prefix, totalPhases, {
    duration: g.flowDuration,
    dash: g.flowDash,
    gap: g.flowGap,
  });
  const inboundClasses = flowClasses.slice(0, inboundCount);
  const outputClasses = flowClasses.slice(inboundCount);

  const ringDurations = g.ringDurations;
  const { css: growCss, classes: ringClasses } = growPulse(
    prefix,
    ringDurations.length,
    {
      origin: `${CORE_X}px ${CORE_Y}px`,
      durations: ringDurations,
      startScale: 0.2,
    }
  );

  const defs =
    glowFilters(prefix) + radialFillGradient(prefix, CORE_X, CORE_Y, 120);

  const style = flowCss + growCss;

  const parts = [];

  parts.push(radialBloom(prefix, CORE_X, CORE_Y, 120));

  // Entry/exit points on the FRONT (near-side, lower) arc of each mouth ellipse,
  // so streams visibly land on the rim closest to the viewer. mouthRy is the
  // ellipse's vertical radius; +mouthRy pushes the point to the front lip.
  const mouthRy = g.mouthRx * g.ellipseK;
  const rimY = (dx) => {
    // y-offset on the near arc for a given horizontal offset dx across the mouth
    const t = Math.min(1, Math.abs(dx) / g.mouthRx);
    return mouthRy * Math.sqrt(Math.max(0, 1 - t * t));
  };
  const inEntry = (i) => {
    const dx = INBOUND_SOURCES[i].entryDx;
    return { x: TOP_MOUTH.x + dx, y: TOP_MOUTH.y + rimY(dx) };
  };
  const outExit = (i) => {
    const dx = EXIT_DX[i];
    return { x: BOT_MOUTH.x + dx, y: BOT_MOUTH.y + rimY(dx) };
  };

  // Live inbound streams: material flowing from the left edge, up-and-in to the
  // top mouth and down the throat. flowConnector draws a faint always-on base
  // line plus a travelling dash so it reads as continuous flow, not a pulse.
  for (let i = 0; i < inboundCount; i++) {
    const s = INBOUND_SOURCES[i];
    const e = inEntry(i);
    parts.push(
      flowConnector(intoTop(s.x, s.y, e.x, e.y, CORE_X, CORE_Y), inboundClasses[i], {
        color: palette.active,
        width: stroke.primary,
        baseOpacity: 0.3,
        filter: `${prefix}_eg`,
      }) + dataNode(s.x, s.y, 2.6)
    );
  }

  parts.push(
    funnelCore(prefix, CORE_X, CORE_Y, {
      throatR: g.throatR,
      mouthRx: g.mouthRx,
      ellipseK: g.ellipseK,
      latCount: g.latCount,
      lonCount: g.lonCount,
      heightScale: g.heightScale,
      flare: g.flare,
      ringOpacity: g.ringOpacity,
      meridianOpacity: g.meridianOpacity,
      ringClasses,
    })
  );
  parts.push(dataNode(CORE_X, CORE_Y, 2.4, palette.active));

  // Live output streams: emerging from the bottom mouth, flowing down-and-out
  // to the right cards.
  for (let i = 0; i < outputCount; i++) {
    const row = OUTPUT_ROWS[i];
    const termX = OUTPUT_X - CARD_W - 6;
    const x = outExit(i);
    const d = outOfBottom(CORE_X, CORE_Y, x.x, x.y, termX, row);
    parts.push(
      flowConnector(d, outputClasses[i], {
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

// Full inbound flow: left-edge source -> top-mouth rim -> DOWN THE THROAT to the
// central core. Two segments joined into one continuous path so the stream
// visibly threads into the mouth and descends the funnel wall to the throat.
//   (sx,sy)   left source
//   (rx,ry)   landing point on the top-mouth front rim
//   (tx,ty)   throat / core center
function intoTop(sx, sy, rx, ry, tx, ty) {
  // Segment A: source -> rim (sweep right, then hook up into the rim).
  const a1x = sx + (rx - sx) * 0.55, a1y = sy;
  const a2x = rx, a2y = ry + 40; // approach rim from below
  // Segment B: rim -> throat, bowing toward the funnel axis so it hugs the wall.
  const b1x = rx + (tx - rx) * 0.35, b1y = ry + (ty - ry) * 0.55;
  const b2x = tx + (rx - tx) * 0.18, b2y = ty - (ty - ry) * 0.28;
  return (
    `M${sx} ${sy} C ${a1x.toFixed(2)} ${a1y.toFixed(2)}, ${a2x.toFixed(2)} ${a2y.toFixed(2)}, ${rx.toFixed(2)} ${ry.toFixed(2)} ` +
    `C ${b1x.toFixed(2)} ${b1y.toFixed(2)}, ${b2x.toFixed(2)} ${b2y.toFixed(2)}, ${tx.toFixed(2)} ${ty.toFixed(2)}`
  );
}

// Full outbound flow: central core -> UP/DOWN THE THROAT to the bottom-mouth rim
// -> out to the right card. Mirror of intoTop: emerges from the throat, climbs
// the lower funnel wall to the rim, then sweeps out.
//   (tx,ty)   throat / core center
//   (rx,ry)   exit point on the bottom-mouth front rim
//   (ex,ey)   card terminal on the right
function outOfBottom(tx, ty, rx, ry, ex, ey) {
  // Segment A: throat -> rim, bowing toward the axis so it hugs the lower wall.
  const a1x = tx + (rx - tx) * 0.18, a1y = ty + (ry - ty) * 0.28;
  const a2x = rx + (tx - rx) * 0.35, a2y = ry - (ry - ty) * 0.55;
  // Segment B: rim -> card (drop below rim, then sweep right).
  const b1x = rx, b1y = ry + 40;
  const b2x = rx + (ex - rx) * 0.5, b2y = ey;
  return (
    `M${tx.toFixed(2)} ${ty.toFixed(2)} C ${a1x.toFixed(2)} ${a1y.toFixed(2)}, ${a2x.toFixed(2)} ${a2y.toFixed(2)}, ${rx.toFixed(2)} ${ry.toFixed(2)} ` +
    `C ${b1x.toFixed(2)} ${b1y.toFixed(2)}, ${b2x.toFixed(2)} ${b2y.toFixed(2)}, ${ex.toFixed(2)} ${ey.toFixed(2)}`
  );
}
