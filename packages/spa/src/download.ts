/**
 * Download / export helpers. SVG is built entirely client-side from a blob;
 * PNG is rasterized by the server (POST /api/export/png) and downloaded as the
 * returned image/png blob.
 */
import { exportPng } from "./api";

/** Trigger a browser download of a Blob under `filename`. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Build a Blob for a raw SVG string. */
export function svgBlob(svg: string): Blob {
  return new Blob([svg], { type: "image/svg+xml" });
}

/** Download the current SVG string as a .svg file (fully client-side). */
export function downloadSvg(svg: string, name: string): void {
  downloadBlob(svgBlob(svg), `${name}.svg`);
}

/**
 * Download the current SVG as a PNG by asking the server to rasterize it.
 * Throws (ApiError) if the server is unreachable so the caller can surface a
 * terminal-styled error and keep PNG disabled in offline mode.
 */
export async function downloadPng(
  svg: string,
  name: string,
  width?: number,
  height?: number
): Promise<void> {
  const blob = await exportPng(svg, width, height);
  downloadBlob(blob, `${name}.png`);
}
