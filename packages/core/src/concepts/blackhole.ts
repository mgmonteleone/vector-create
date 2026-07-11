/**
 * Concept: black-hole / accretion-disc aggregator.
 *
 * Story told over one animation loop:
 *   INGEST  — inbound dashed streams from the left/top/bottom carry green
 *             data-node dots that converge on the core (staggered reveal,
 *             cosmos-01 pattern), = ingesting information / agent sessions.
 *   COMBINE — a double-funnel / hourglass core whose perspective rim ellipses
 *             pulse/grow from the waist (grow pattern, cosmos-04), = combination.
 *   EMIT    — an ordered, evenly-spaced fan of connectors on the right lights
 *             up in sequence AFTER the inbound streams, terminating in aligned
 *             output cards, = organized output.
 *
 * Everything is pure geometry + tokens; output is one valid standalone SVG
 * with pure-CSS animation and no JS/SMIL/external URLs.
 */

import { composeSVG } from "../compose";
import { growPulse, staggeredReveal } from "../keyframes";
import {
  connector,
  dataNode,
  funnelCore,
  glowFilters,
  outputCard,
  radialBloom,
  radialFillGradient,
  streamOfNodes,
} from "../primitives";
import { NON_SCALING, palette, stroke } from "../tokens";

const CORE_X = 176;
const CORE_Y = 170;

/** Inbound stream source points, on the left/top/bottom edges. */
const INBOUND_SOURCES: Array<{ x: number; y: number }> = [
  { x: 26, y: 96 },
  { x: 26, y: 244 },
  { x: 118, y: 30 },
  { x: 96, y: 300 },
];

/** Output fan target rows on the right, evenly spaced and aligned. */
const OUTPUT_ROWS = [96, 136, 176, 216, 256];
const OUTPUT_X = 348;
const CARD_W = 26;
const CARD_H = 18;

export function blackhole(prefix = "BH1"): string {
  const inboundCount = INBOUND_SOURCES.length;
  const outputCount = OUTPUT_ROWS.length;
  const totalPhases = inboundCount + outputCount;

  // Shared timeline: inbound streams reveal first (phases 0..inboundCount-1),
  // then output connectors reveal (later windows) so ingest precedes emit.
  const { css: revealCss, classes } = staggeredReveal(prefix, totalPhases, {
    duration: 3.5,
    litFraction: 0.82,
  });
  const inboundClasses = classes.slice(0, inboundCount);
  const outputClasses = classes.slice(inboundCount);

  // Grow/pulse for the funnel rim ellipses (combination at the core waist).
  const ringDurations = [3.2, 4.2, 2.6];
  const { css: growCss, classes: ringClasses } = growPulse(
    prefix,
    ringDurations.length,
    { origin: `${CORE_X}px ${CORE_Y}px`, durations: ringDurations, startScale: 0.2 }
  );

  const defs =
    glowFilters(prefix) +
    radialFillGradient(prefix, CORE_X, CORE_Y, 120);

  const style = revealCss + growCss;

  // ---- BODY ----
  const parts: string[] = [];

  // Faint radial green bloom behind the core.
  parts.push(radialBloom(prefix, CORE_X, CORE_Y, 120));

  // Static scaffolding: faint inbound guide curves (always visible, dashed).
  for (const s of INBOUND_SOURCES) {
    const d = curveTo(s.x, s.y, CORE_X, CORE_Y);
    parts.push(
      connector(d, {
        color: palette.structure,
        width: stroke.fine,
        opacity: 0.22,
        dashed: true,
      })
    );
  }

  // Static scaffolding: faint output guide connectors + terminal nodes.
  for (const row of OUTPUT_ROWS) {
    const d = fanTo(CORE_X, CORE_Y, OUTPUT_X - CARD_W - 6, row);
    parts.push(
      connector(d, {
        color: palette.structure,
        width: stroke.fine,
        opacity: 0.28,
      })
    );
    parts.push(dataNode(OUTPUT_X - CARD_W - 6, row, 2.2, palette.mutedNodeLight));
    // Static output card outline (dim; lights up via the animated group).
    parts.push(
      outputCard(OUTPUT_X - CARD_W + 2, row - CARD_H / 2, CARD_W, CARD_H, {
        stroke: palette.structure,
        opacity: 0.4,
      })
    );
  }

  // Animated INBOUND streams (ingest) — reveal first, converging on core.
  for (let i = 0; i < inboundCount; i++) {
    const s = INBOUND_SOURCES[i];
    const d = curveTo(s.x, s.y, CORE_X, CORE_Y);
    parts.push(
      `<g class="${inboundClasses[i]}">` +
        connector(d, {
          color: palette.active,
          width: stroke.primary,
          opacity: 1,
          filter: `${prefix}_eg`,
        }) +
        streamOfNodes(s.x, s.y, CORE_X, CORE_Y, 5, { r: 1.8 }) +
        dataNode(s.x, s.y, 2.6) +
        `</g>`
    );
  }

  // The double-funnel / hourglass core (drawn after inbound so streams sink
  // "into" the waist). Rim ellipses breathe via the grow/pulse ringClasses.
  parts.push(
    funnelCore(prefix, CORE_X, CORE_Y, {
      throatR: 7,
      mouthRx: 102,
      ellipseK: 0.32,
      latCount: 16,
      lonCount: 24,
      heightScale: 120,
      flare: 0.78,
      ringClasses,
    })
  );
  parts.push(dataNode(CORE_X, CORE_Y, 2.4, palette.active));

  // Animated OUTPUT fan (emit) — reveal after inbound windows, in order.
  for (let i = 0; i < outputCount; i++) {
    const row = OUTPUT_ROWS[i];
    const termX = OUTPUT_X - CARD_W - 6;
    const d = fanTo(CORE_X, CORE_Y, termX, row);
    parts.push(
      `<g class="${outputClasses[i]}">` +
        connector(d, {
          color: palette.active,
          width: stroke.primary,
          opacity: 1,
          filter: `${prefix}_eg`,
        }) +
        dataNode(termX, row, 2.8) +
        outputCard(OUTPUT_X - CARD_W + 2, row - CARD_H / 2, CARD_W, CARD_H, {
          fill: palette.cardFill,
          stroke: palette.active,
          opacity: 0.95,
        }) +
        // small aligned tick inside the card to read as "organized"
        `<line x1="${OUTPUT_X - CARD_W + 8}" y1="${row}" x2="${OUTPUT_X - 6}" y2="${row}" style="stroke:${palette.active};stroke-width:${stroke.primary};opacity:0.9;${NON_SCALING}"/>` +
        `</g>`
    );
  }

  const body = parts.join("");

  return composeSVG({
    ariaLabel:
      "Black-hole aggregator ingesting data streams, combining them at a dark core, and emitting organized output (animated)",
    idPrefix: prefix,
    defs,
    style,
    body,
  });
}

/** A quadratic-ish converging curve from a source to the core. */
function curveTo(x1: number, y1: number, x2: number, y2: number): string {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 + (y1 < y2 ? -18 : 18);
  return `M${x1} ${y1} Q ${cx.toFixed(2)} ${cy.toFixed(2)}, ${x2} ${y2}`;
}

/** An outward fan curve from the core to an aligned output row. */
function fanTo(x1: number, y1: number, x2: number, y2: number): string {
  const midX = x1 + (x2 - x1) * 0.55;
  return `M${x1} ${y1} C ${midX.toFixed(2)} ${y1}, ${midX.toFixed(2)} ${y2}, ${x2} ${y2}`;
}
