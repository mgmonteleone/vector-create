/**
 * CLI-support layer (the /cli subpath export). Pure, isomorphic helpers used by
 * the bin/ scripts and any interface that wants a review gallery. The Node-only
 * fs/process glue lives in bin/*.mjs, NOT here, so this module stays importable
 * in the browser too.
 */
import type { Concept, Genome } from "./concept";
import { describe as describeGenome } from "./genome";

export type GalleryMeta = {
  prompt?: string;
  matched?: string[];
  seed?: number;
  note?: string;
};

export type GalleryCard = {
  id: string;
  prefix: string;
  genome: Genome;
  label: string;
};

export type GalleryResult = {
  html: string;
  cards: GalleryCard[];
};

function escapeHtml(s: string): string {
  return String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string
  );
}

/**
 * Build a self-contained review HTML for one generation: each candidate is a
 * fully-inlined animated SVG with a UNIQUE id prefix so multiple animated SVGs
 * on one page never collide.
 */
export function buildGallery(
  concept: Concept,
  gen: number,
  genomes: Genome[],
  meta: GalleryMeta = {}
): GalleryResult {
  const cards = genomes.map((genome, i) => {
    const id = `G${gen}C${i + 1}`;
    const prefix = `${id}_`;
    const big = concept.render(genome, prefix);
    const small = concept.render(genome, `${id}s_`);
    const label = describeGenome(concept.genomeSpec, concept.baseGenome, genome);
    return { id, prefix, genome, label, big, small };
  });

  const first = cards[0];
  const header = `
    <div class="hd">
      <h1>${escapeHtml(concept.title)} \u2014 generation ${gen}</h1>
      <div class="meta">
        ${meta.prompt ? `<span>prompt: \u201c${escapeHtml(meta.prompt)}\u201d</span>` : ""}
        ${meta.matched?.length ? `<span>nudges: ${meta.matched.join(", ")}</span>` : ""}
        ${meta.seed != null ? `<span>seed: ${meta.seed}</span>` : ""}
      </div>
      <p class="hint">Pick one or more by id (e.g. \u201ckeep ${first?.id}\u201d) or steer (\u201c${first?.id} but wider &amp; slower\u201d).</p>
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
<title>${escapeHtml(concept.title)} gen ${gen}</title>
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

  return {
    html,
    cards: cards.map(({ id, prefix, genome, label }) => ({ id, prefix, genome, label })),
  };
}
