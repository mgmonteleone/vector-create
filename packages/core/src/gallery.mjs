// Renders a batch of candidate genomes into a single self-contained review
// HTML: each candidate is a fully-inlined SVG (inlined, NOT <object>, so it
// renders in the VFS web viewer) with a UNIQUE id prefix so multiple animated
// SVGs on one page never collide. Each card shows the 400px hero, a 140px
// squint copy, the candidate id, and a short label describing its genome diff.
import { blackhole } from "./concepts/blackhole.mjs";
import { describe } from "./genome.mjs";

/**
 * Build the review HTML for a generation.
 *  gen       number     generation index (for titles + prefixes)
 *  genomes   genome[]   the candidates to show
 *  meta      object     { prompt, matched, seed } shown in the header
 * Returns { html, cards:[{id, prefix, genome, label}] }.
 */
export function buildGallery(gen, genomes, meta = {}) {
  const cards = genomes.map((genome, i) => {
    const id = `G${gen}C${i + 1}`; // e.g. G1C3
    const prefix = `${id}_`; // per-svg namespace, e.g. G1C3_
    const big = blackhole(prefix, genome);
    const small = blackhole(`${id}s_`, genome); // separate namespace for squint copy
    const label = describe(genome);
    return { id, prefix, genome, label, big, small };
  });

  const header = `
    <div class="hd">
      <h1>Wormhole aggregator \u2014 generation ${gen}</h1>
      <div class="meta">
        ${meta.prompt ? `<span>prompt: \u201c${escapeHtml(meta.prompt)}\u201d</span>` : ""}
        ${meta.matched && meta.matched.length ? `<span>nudges: ${meta.matched.join(", ")}</span>` : ""}
        ${meta.seed != null ? `<span>seed: ${meta.seed}</span>` : ""}
      </div>
      <p class="hint">Pick one or more by id (e.g. \u201ckeep ${cards[0]?.id}\u201d) or steer (\u201c${cards[0]?.id} but wider &amp; slower\u201d).</p>
    </div>`;

  const grid = cards
    .map(
      (c) => `
    <figure class="card">
      <div class="big">${c.big}</div>
      <figcaption>
        <span class="cid">${c.id}</span>
        <span class="lbl">${escapeHtml(c.label)}</span>
        <span class="squint">${c.small}</span>
      </figcaption>
    </figure>`
    )
    .join("");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Wormhole gen ${gen}</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;background:#000;color:#ededf0;font-family:ui-monospace,Menlo,monospace}
  .hd{padding:24px 28px 8px}
  .hd h1{font-size:15px;font-weight:600;letter-spacing:.04em;margin:0 0 8px}
  .meta{display:flex;gap:18px;flex-wrap:wrap;color:#8a8a90;font-size:11px}
  .hint{color:#5ccc76;font-size:11px;margin:10px 0 0}
  .grid{display:flex;flex-wrap:wrap;gap:22px;padding:18px 28px 40px}
  .card{margin:0;background:#0a0a0b;border:1px solid #1b1b1f;border-radius:10px;padding:14px;display:flex;flex-direction:column;align-items:center;gap:10px}
  .big{width:300px}
  .big svg{width:100%;height:auto;display:block}
  figcaption{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%}
  .cid{color:#5ccc76;font-size:13px;font-weight:600;letter-spacing:.08em}
  .lbl{color:#8a8a90;font-size:10px;text-align:center;min-height:1.2em}
  .squint{width:120px;opacity:.9}
  .squint svg{width:100%;height:auto;display:block}
</style></head>
<body>${header}<div class="grid">${grid}</div></body></html>`;

  return { html, cards: cards.map(({ big, small, ...rest }) => rest) };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
