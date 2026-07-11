// Runtime mirror of compose.ts (types stripped).
import { canvas } from "./tokens.mjs";

export function composeSVG(o) {
  const viewBox = o.viewBox ?? canvas.viewBox;
  const width = o.width ?? canvas.width;
  const height = o.height ?? canvas.height;
  void o.idPrefix;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ` +
    `width="${width}" height="${height}" role="img" aria-label="${o.ariaLabel}">` +
    o.defs +
    `<style>${o.style}</style>` +
    o.body +
    `</svg>`
  );
}
