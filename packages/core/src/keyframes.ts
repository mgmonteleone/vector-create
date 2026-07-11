/**
 * Keyframe / animation composers — the two proven timeline patterns from the
 * reference SVGs, emitted as pure inline CSS (a <style> block body).
 *
 * Pattern 1 (cosmos-01): a shared linear-infinite timeline where N groups
 *   reveal in staggered opacity windows — a sequential "reveal".
 * Pattern 2 (cosmos-04): per-element scale+opacity "grow from the core" with
 *   slightly different durations so elements pulse organically.
 *
 * All class names and @keyframes ids are namespaced with the per-file prefix.
 */

type StaggeredRevealOpts = {
  /** Total loop duration in seconds. Default 3.5s (matches cosmos-01). */
  duration?: number;
  /** Fraction of each slot the element stays lit (0..1). Default 0.78. */
  litFraction?: number;
  /** Fade in/out ramp as a fraction of a slot. Default 0.11. */
  rampFraction?: number;
  /**
   * Order in which the N classes appear on the shared timeline. Defaults to
   * 0,1,2,...,count-1. Pass a permutation to reveal groups out of index order.
   */
  order?: number[];
};

/**
 * Emit the cosmos-01 staggered-reveal CSS. Returns the <style> body (no
 * surrounding <style> tags) plus the class names to apply to your groups.
 *
 * The i-th class (`${prefix}_o${i}`) lights up in the slot determined by its
 * position in `order`, so inbound streams can converge in sequence.
 */
export function staggeredReveal(
  prefix: string,
  count: number,
  opts: StaggeredRevealOpts = {}
): { css: string; classes: string[] } {
  const {
    duration = 3.5,
    litFraction = 0.78,
    rampFraction = 0.11,
    order = Array.from({ length: count }, (_, i) => i),
  } = opts;

  const slot = 100 / count;
  const parts: string[] = [];
  const classes: string[] = [];

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

    const pct = (v: number): string => `${v.toFixed(2)}%`;
    parts.push(
      `.${cls}{opacity:0;animation:${kf} ${duration}s linear infinite}` +
        `@keyframes ${kf}{0%,${pct(inStart)}{opacity:0}${pct(inEnd)},${pct(outStart)}{opacity:1}${pct(outEnd)},100%{opacity:0}}`
    );
  }

  return { css: parts.join(""), classes };
}

type GrowPulseOpts = {
  /** transform-origin, e.g. "200px 180px". */
  origin: string;
  /** Per-element durations in seconds. Length = count. */
  durations?: number[];
  /** Starting scale of the grow. Default 0.12 (matches cosmos-04). */
  startScale?: number;
};

/**
 * Emit the cosmos-04 grow/pulse CSS. Each of the N classes scales up from the
 * core (transform-origin) with its own duration, so rings/petals pulse
 * organically. Returns the <style> body plus the class names.
 */
export function growPulse(
  prefix: string,
  count: number,
  opts: GrowPulseOpts
): { css: string; classes: string[] } {
  const {
    origin,
    startScale = 0.12,
    durations = Array.from({ length: count }, () => 3),
  } = opts;

  const classes: string[] = [];
  const parts: string[] = [];

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
