// Runtime mirror of tokens.ts (types stripped). Source of truth lives in the
// .ts files; these .mjs files let `node render.mjs` run with zero deps.
export const palette = {
  structure: "#ededf0",
  active: "#5CCC76",
  glowGreen: "#1AA049",
  mint: "#99F7A9",
  signal: "#F45E0F",
  cardFill: "#0c0c0e",
  coreFill: "#0a0a0b",
  mutedNode: "#bcbcc2",
  mutedNodeLight: "#cfcfd4",
};
export const stroke = { fine: 0.7, primary: 1.1 };
export const dash = { scaffolding: "2 5" };
export const opacity = {
  scaffoldingMin: 0.1,
  scaffoldingMax: 0.5,
  activeMin: 0.85,
  activeMax: 1,
};
export const canvas = { viewBox: "0 0 400 400", width: 400, height: 400 };
export const NON_SCALING = "vector-effect:non-scaling-stroke";
