// Runtime mirror of keyframes.ts (types stripped).
export function staggeredReveal(prefix, count, opts = {}) {
  const {
    duration = 3.5,
    litFraction = 0.78,
    rampFraction = 0.11,
    order = Array.from({ length: count }, (_, i) => i),
  } = opts;

  const slot = 100 / count;
  const parts = [];
  const classes = [];

  for (let idx = 0; idx < count; idx++) {
    const groupIndex = order[idx];
    const cls = `${prefix}_o${groupIndex}`;
    const kf = `${prefix}_k${groupIndex}`;
    classes[groupIndex] = cls;

    const slotStart = idx * slot;
    const slotEnd = (idx + 1) * slot;
    const inStart = slotStart;
    const inEnd = slotStart + slot * rampFraction;
    const outStart = slotStart + slot * litFraction;
    const outEnd = slotEnd;

    const pct = (v) => `${v.toFixed(2)}%`;
    parts.push(
      `.${cls}{opacity:0;animation:${kf} ${duration}s linear infinite}` +
        `@keyframes ${kf}{0%,${pct(inStart)}{opacity:0}${pct(inEnd)},${pct(outStart)}{opacity:1}${pct(outEnd)},100%{opacity:0}}`
    );
  }

  return { css: parts.join(""), classes };
}

// Continuous FLOW along paths (not a pulse). Emits one shared keyframe that
// scrolls stroke-dashoffset from 1 -> 0 over a normalized path (pathLength=1),
// plus one class per stream with a staggered negative animation-delay so the
// travelling dashes are phase-shifted between streams. Pair with flowConnector,
// which draws a faint always-on base line under the moving dash so the route is
// always visible and the motion reads as material streaming through it.
export function flowStreams(prefix, count, opts = {}) {
  const {
    duration = 2.6, // seconds for one dash to traverse a full path
    dash = 0.12, // lit segment length as fraction of the path
    gap = 0.5, // gap between lit segments as fraction of the path
  } = opts;

  const classes = [];
  const parts = [];
  const period = dash + gap; // dashoffset travels one period per cycle

  for (let i = 0; i < count; i++) {
    const cls = `${prefix}_f${i}`;
    classes.push(cls);
    // Stagger each stream by a fraction of the duration so they don't pulse in
    // unison; negative delay starts them mid-flight (already flowing at t=0).
    const delay = -((i / count) * duration).toFixed(3);
    parts.push(
      `.${cls}{stroke-dasharray:${dash} ${gap};animation:${prefix}_flow ${duration}s linear infinite;animation-delay:${delay}s}`
    );
  }
  // One period of travel per cycle keeps speed constant regardless of duration.
  parts.push(
    `@keyframes ${prefix}_flow{from{stroke-dashoffset:${period.toFixed(3)}}to{stroke-dashoffset:0}}`
  );

  return { css: parts.join(""), classes };
}

export function growPulse(prefix, count, opts) {
  const {
    origin,
    startScale = 0.12,
    durations = Array.from({ length: count }, () => 3),
  } = opts;

  const classes = [];
  const parts = [];

  for (let i = 0; i < count; i++) {
    const cls = `${prefix}_w${i}`;
    classes.push(cls);
    parts.push(
      `.${cls}{transform-box:view-box;transform-origin:${origin};opacity:0;animation:${prefix}_grow ${durations[i]}s ease-in-out infinite}`
    );
  }
  parts.push(
    `@keyframes ${prefix}_grow{0%{transform:scale(${startScale});opacity:0}14%{opacity:1}72%{transform:scale(1);opacity:1}92%{transform:scale(1);opacity:0}100%{transform:scale(${startScale});opacity:0}}`
  );

  return { css: parts.join(""), classes };
}
