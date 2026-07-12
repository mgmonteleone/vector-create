/**
 * Brand tokens — the single source of truth for the house style. Every colour,
 * stroke weight, dash and opacity band used by the primitives comes from here
 * so the whole toolkit stays on-brand by construction.
 */

/** Approved palette. These are the ONLY hexes that may appear in output. */
export const palette = {
  /** Faint scaffolding: grids, static geometry, connector lines. */
  structure: "#ededf0",
  /** Active / "live" animated elements and data nodes. */
  active: "#5CCC76",
  /** Radial green glow gradients only. */
  glowGreen: "#1AA049",
  /** Optional secondary accent. */
  mint: "#99F7A9",
  /** Signal orange — at most ONE focal point, optional. */
  signal: "#F45E0F",
  /** Near-black card / core fills. */
  cardFill: "#0c0c0e",
  coreFill: "#0a0a0b",
  /** Inactive / static nodes. */
  mutedNode: "#bcbcc2",
  mutedNodeLight: "#cfcfd4",
} as const;

/** Stroke weights. */
export const stroke = {
  /** Fine scaffolding. */
  fine: 0.7,
  /** Primary / active lines. */
  primary: 1.1,
} as const;

/** Dashed-scaffolding dash pattern. */
export const dash = {
  scaffolding: "2 5",
} as const;

/** Layered opacity bands. */
export const opacity = {
  scaffoldingMin: 0.1,
  scaffoldingMax: 0.5,
  activeMin: 0.85,
  activeMax: 1,
} as const;

/** The house canvas. */
export const canvas = {
  viewBox: "0 0 400 400",
  width: 400,
  height: 400,
} as const;

/** Always-on stroke behaviour: strokes must not scale with the element. */
export const NON_SCALING = "vector-effect:non-scaling-stroke" as const;
