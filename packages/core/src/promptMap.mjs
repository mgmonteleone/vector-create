// Rule-based prompt -> genome-nudge mapper. Turns plain steering language
// ("wider, brighter mesh, slower") into a directional bias map the sampler
// applies. Deliberately NOT an LLM: a fixed keyword dictionary is predictable,
// reviewable, and cannot push the genome off-brand (the sampler still clamps to
// GENES bounds). Unknown words are ignored; matched words accumulate.
//
// Each rule: /regex/ -> { gene: +1|-1, ... }. Multiple rules can hit; later
// hits on the same gene overwrite earlier ones (last word wins).

const RULES = [
  // --- mouth width ---
  [/\b(wider|broader|bigger mouths?|flared out|open(er)?)\b/, { mouthRx: +1 }],
  [/\b(narrower|tighter mouths?|smaller mouths?)\b/, { mouthRx: -1 }],

  // --- throat ---
  [/\b(tighter throat|pinch(ed)?|smaller throat|thinner waist)\b/, { throatR: -1 }],
  [/\b(fatter throat|wider throat|open throat)\b/, { throatR: +1 }],

  // --- concavity / funnel depth ---
  [/\b(deeper|more concave|steeper|more funnel|more gravity)\b/, { flare: +1 }],
  [/\b(shallower|less concave|flatter|straighter)\b/, { flare: -1 }],

  // --- vertical extent ---
  [/\b(taller|longer|stretch(ed)?)\b/, { heightScale: +1 }],
  [/\b(shorter|squ(a|i)sh(ed)?|compact(er)?)\b/, { heightScale: -1 }],

  // --- perspective tilt ---
  [/\b(more perspective|more 3d|deeper angle|more tilt)\b/, { ellipseK: +1 }],
  [/\b(flatter angle|less perspective|top ?down|less 3d)\b/, { ellipseK: -1 }],

  // --- mesh density ---
  [/\b(denser|finer mesh|more (rings|lines|mesh)|tighter mesh)\b/, { latCount: +1, lonCount: +1 }],
  [/\b(sparser|coarser|fewer (rings|lines)|looser mesh|simpler mesh)\b/, { latCount: -1, lonCount: -1 }],

  // --- mesh brightness / prominence ---
  [/\b(brighter mesh|stronger mesh|bolder mesh|more visible mesh|mesh pop)\b/, { ringOpacity: +1, meridianOpacity: +1 }],
  [/\b(fainter mesh|subtler mesh|dimmer mesh|softer mesh|ghost(ly)? mesh)\b/, { ringOpacity: -1, meridianOpacity: -1 }],

  // --- animation speed ---
  [/\b(slower|calmer|gentler|relax(ed)?)\b/, { revealDuration: +1, ringDurations: +1 }],
  [/\b(faster|snappier|quicker|energetic|livelier)\b/, { revealDuration: -1, ringDurations: -1 }],

  // --- lit dwell ---
  [/\b(longer (glow|dwell|hold)|linger)\b/, { litFraction: +1 }],
  [/\b(shorter (glow|dwell|hold)|blink|flash)\b/, { litFraction: -1 }],
];

/**
 * Parse a steering prompt into { bias, rate, matched[] }.
 *  - bias: gene -> +1/-1 directional nudge
 *  - rate: mutation strength ("a bit" -> 0.5, "much"/"way" -> 1.6, else 1)
 *  - matched: the human-readable genes that were nudged (for the review label)
 */
export function mapPrompt(prompt) {
  const text = String(prompt || "").toLowerCase();
  const bias = {};
  const matched = [];
  for (const [re, nudge] of RULES) {
    if (re.test(text)) {
      for (const [gene, dir] of Object.entries(nudge)) {
        bias[gene] = dir;
        matched.push(`${gene}${dir > 0 ? "+" : "-"}`);
      }
    }
  }
  let rate = 1;
  if (/\b(a bit|slightly|a little|touch|subtle)\b/.test(text)) rate = 0.5;
  if (/\b(much|way|a lot|dramatically|far)\b/.test(text)) rate = 1.6;
  return { bias, rate, matched };
}
