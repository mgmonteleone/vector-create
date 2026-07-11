/**
 * composeSVG — assembles a valid standalone <svg> from the pieces a concept
 * builder produces. Framework-free; returns a string.
 */

import { canvas } from "./tokens";

export type ComposeOptions = {
  /** viewBox, defaults to the house canvas "0 0 400 400". */
  viewBox?: string;
  width?: number;
  height?: number;
  /** Accessibility label (role="img"). */
  ariaLabel: string;
  /** Per-file id prefix (also documented; not injected automatically). */
  idPrefix: string;
  /** defs markup (filters, gradients). */
  defs: string;
  /** Inline CSS body (without surrounding <style> tags). */
  style: string;
  /** The drawn body markup. */
  body: string;
};

export function composeSVG(o: ComposeOptions): string {
  const viewBox = o.viewBox ?? canvas.viewBox;
  const width = o.width ?? canvas.width;
  const height = o.height ?? canvas.height;
  // idPrefix is threaded through by the caller into defs/style/body; kept in
  // the signature so a single value drives every namespaced id in the file.
  void o.idPrefix;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ` +
    `width="${width}" height="${height}" role="img" aria-label="${o.ariaLabel}">` +
    o.defs +
    `<style>${o.style}</style>` +
    o.body +
    "</svg>"
  );
}
