// Runtime mirror of primitives.ts (types stripped).
import { NON_SCALING, palette, stroke } from "./tokens.mjs";

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export function smoothPath(points) {
  if (points.length === 0) {
    return "";
  }
  if (points.length < 3) {
    const [first, ...rest] = points;
    return `M${fmt(first[0])} ${fmt(first[1])}${rest
      .map((pt) => ` L${fmt(pt[0])} ${fmt(pt[1])}`)
      .join("")}`;
  }
  const [startX, startY] = points[0];
  let d = `M${fmt(startX)} ${fmt(startY)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : points.length - 1];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return d;
}

export function glowFilters(p) {
  return `<defs>
    <filter id="${p}_gl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="${p}_glg" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="${p}_eg" x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation="0.9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="${p}_ng" x="-160%" y="-160%" width="420%" height="420%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="${p}_bw"><stop offset="0%" stop-color="#fff" stop-opacity=".09"/><stop offset="72%" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="${p}_bg"><stop offset="0%" stop-color="${palette.glowGreen}" stop-opacity=".34"/><stop offset="70%" stop-color="${palette.glowGreen}" stop-opacity="0"/></radialGradient>
  </defs>`;
}

export function radialFillGradient(p, cx, cy, r) {
  return `<defs><radialGradient id="${p}_grad" gradientUnits="userSpaceOnUse" cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}"><stop offset="0%" stop-color="${palette.structure}" stop-opacity="0.02"/><stop offset="45%" stop-color="${palette.glowGreen}" stop-opacity="0.05"/><stop offset="80%" stop-color="${palette.glowGreen}" stop-opacity="0.14"/><stop offset="100%" stop-color="${palette.active}" stop-opacity="0.26"/></radialGradient></defs>`;
}

export function radialBloom(p, cx, cy, r) {
  return `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="url(#${p}_bg)"/>`;
}

export function dataNode(cx, cy, r = 2.8, fill = palette.active) {
  return `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="${fill}"/>`;
}

export function connector(d, opts = {}) {
  const {
    color = palette.structure,
    width = stroke.primary,
    opacity = 0.85,
    filter,
    dashed = false,
  } = opts;
  const dashDecl = dashed ? ";stroke-dasharray:2 5" : "";
  const filterAttr = filter ? ` filter="url(#${filter})"` : "";
  return `<path d="${d}" style="stroke:${color};stroke-width:${width};opacity:${opacity};fill:none;${NON_SCALING}${dashDecl}"${filterAttr}/>`;
}

// A CONTINUOUS-FLOW connector: a faint always-on base line so the route reads
// even between dashes, plus an overlaid path whose travelling dash (driven by a
// flowStreams class) makes material appear to stream ALONG the path. The moving
// path uses pathLength="1" so dash lengths are path-length-independent and every
// stream flows at the same visual speed regardless of its actual length.
export function flowConnector(d, flowClass, opts = {}) {
  const {
    color = palette.active,
    width = stroke.primary,
    baseColor = color,
    baseOpacity = 0.28,
    filter,
  } = opts;
  const filterAttr = filter ? ` filter="url(#${filter})"` : "";
  const base = `<path d="${d}" style="stroke:${baseColor};stroke-width:${width};opacity:${baseOpacity};fill:none;${NON_SCALING}"/>`;
  const flow = `<path class="${flowClass}" d="${d}" pathLength="1" style="stroke:${color};stroke-width:${width};opacity:1;fill:none;stroke-linecap:round;${NON_SCALING}"${filterAttr}/>`;
  return base + flow;
}

export function dashedRing(cx, cy, rx, ry = rx, opts = {}) {
  const {
    opacity = 0.48,
    color = palette.structure,
    width = stroke.fine,
  } = opts;
  return `<ellipse cx="${fmt(cx)}" cy="${fmt(cy)}" rx="${fmt(rx)}" ry="${fmt(ry)}" style="stroke:${color};stroke-width:${width};opacity:${opacity};fill:none;${NON_SCALING};stroke-dasharray:2 5"/>`;
}

export function coreDisc(p, cx, cy, r, opts = {}) {
  const { fill = palette.coreFill, edgeOpacity = 0.6 } = opts;
  return (
    `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="${fill}"/>` +
    `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" style="stroke:${palette.active};stroke-width:${stroke.primary};opacity:${edgeOpacity};fill:none;${NON_SCALING}" filter="url(#${p}_eg)"/>`
  );
}

export function funnelCore(p, cx, cy, opts = {}) {
  const {
    throatR = 7,
    mouthRx = 52,
    ellipseK = 0.32,
    latCount = 16,
    lonCount = 24,
    heightScale = 150,
    ringOpacity = 0.34,
    meridianOpacity = 0.3,
    // Concavity of the funnel wall, 0..1. Higher = the wall hugs the axis
    // longer before flaring, i.e. a deeper trumpet/gravity-well. The control
    // point of each meridian half sits at (throat_x, mouth_y*flare above the
    // throat); flare near 1 => steep-then-flare concave funnel.
    flare = 0.78,
    tilt = 0,
    ringClasses,
  } = opts;

  // Half-height from throat plane to a mouth plane.
  const mouthOffset = heightScale;
  const mouthRy = mouthRx * ellipseK;

  // The funnel wall as a quadratic Bezier, parameterised by theta (angle around
  // the axis) for the TOP half: mouth-rim -> throat. Control point is placed
  // narrow (throat x) and high (near the mouth y) so the wall descends steeply
  // near the throat and flares only near the mouth => CONCAVE funnel (the LEFT
  // shape in the compare reference). t=0 at throat, t=1 at mouth.
  const wallTop = (theta) => {
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const mouth = [cx + mouthRx * cosT, cy - mouthOffset + mouthRy * sinT];
    const throat = [cx + throatR * cosT, cy + throatR * ellipseK * sinT];
    // control: throat's x, raised by `flare` of the mouth offset
    const ctrl = [
      cx + throatR * cosT,
      cy - mouthOffset * flare + throatR * ellipseK * sinT,
    ];
    return { mouth, ctrl, throat };
  };
  // Evaluate the top-half quadratic at parameter tt (0=throat .. 1=mouth).
  const qAt = (P0, P1, P2, tt) => [
    (1 - tt) ** 2 * P0[0] + 2 * (1 - tt) * tt * P1[0] + tt ** 2 * P2[0],
    (1 - tt) ** 2 * P0[1] + 2 * (1 - tt) * tt * P1[1] + tt ** 2 * P2[1],
  ];

  const parts = [];

  // --- Latitude rings: sample the wall radius at fractions from throat->mouth
  // and draw a perspective ellipse there (top + mirrored bottom). Using theta=0
  // gives the true radius at that height.
  const ringFracs = [];
  for (let i = 1; i <= latCount; i++) ringFracs.push(i / latCount);
  const bands = ringClasses?.length ?? 0;
  const buckets = Array.from({ length: Math.max(bands, 1) }, () => []);
  const emitRingPair = (frac) => {
    const w = wallTop(0);
    const [px] = qAt(w.throat, w.ctrl, w.mouth, frac);
    const rx = px - cx;
    const ry = rx * ellipseK;
    const yTop = cy - mouthOffset * (frac ** 1); // approx height by frac
    const yWall = qAt(w.throat, w.ctrl, w.mouth, frac)[1];
    const ry2 = ry;
    const style = (op) =>
      `style="stroke:${palette.structure};stroke-width:${stroke.fine};opacity:${op};fill:none;${NON_SCALING}"`;
    return (
      `<ellipse cx="${fmt(cx)}" cy="${fmt(yWall)}" rx="${fmt(rx)}" ry="${fmt(ry2)}" ${style(ringOpacity)}/>` +
      `<ellipse cx="${fmt(cx)}" cy="${fmt(2 * cy - yWall)}" rx="${fmt(rx)}" ry="${fmt(ry2)}" ${style(ringOpacity)}/>`
    );
  };
  ringFracs.forEach((frac, idx) => {
    const svg = emitRingPair(frac);
    if (bands > 0) {
      const b = Math.min(bands - 1, Math.floor((idx / latCount) * bands));
      buckets[b].push(svg);
    } else {
      parts.push(svg);
    }
  });
  if (bands > 0) {
    for (let b = 0; b < bands; b++) {
      parts.push(`<g class="${ringClasses?.[b]}">${buckets[b].join("")}</g>`);
    }
  }

  // --- Longitude meridians: for each theta, one quadratic mouth->throat for the
  // top half and its mirror for the bottom half, forming the concave funnel
  // wall. The narrow-and-high control point is what makes it concave.
  const meridians = [];
  for (let m = 0; m < lonCount; m++) {
    const theta = (m / lonCount) * Math.PI * 2;
    const w = wallTop(theta);
    const cM = w.mouth;
    const cC = w.ctrl;
    const tP = w.throat;
    const dTop =
      `M${fmt(cM[0])} ${fmt(cM[1])} Q${fmt(cC[0])} ${fmt(cC[1])} ${fmt(tP[0])} ${fmt(tP[1])}`;
    const dBot =
      `M${fmt(cM[0])} ${fmt(2 * cy - cM[1])} Q${fmt(cC[0])} ${fmt(2 * cy - cC[1])} ${fmt(tP[0])} ${fmt(2 * cy - tP[1])}`;
    const highlight = m % 6 === 0;
    const color = highlight ? palette.active : palette.structure;
    const op = highlight ? meridianOpacity + 0.12 : meridianOpacity;
    const st = `style="stroke:${color};stroke-width:${stroke.fine};opacity:${op};fill:none;${NON_SCALING}"`;
    meridians.push(`<path d="${dTop}" ${st}/><path d="${dBot}" ${st}/>`);
  }
  parts.push(`<g>${meridians.join("")}</g>`);

  parts.push(
    `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(throatR)}" fill="${palette.coreFill}"/>` +
      `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(throatR)}" style="stroke:${palette.active};stroke-width:${stroke.primary};opacity:0.7;fill:none;${NON_SCALING}" filter="url(#${p}_eg)"/>`
  );

  const inner = parts.join("");
  return tilt
    ? `<g transform="rotate(${fmt(tilt)} ${fmt(cx)} ${fmt(cy)})">${inner}</g>`
    : inner;
}

export function streamOfNodes(x1, y1, x2, y2, count, opts = {}) {
  const { r = 1.6, fill = palette.active, skipEnds = true } = opts;
  const dots = [];
  const start = skipEnds ? 1 : 0;
  const end = skipEnds ? count - 1 : count;
  for (let i = start; i < end; i++) {
    const t = count > 1 ? i / (count - 1) : 0;
    dots.push(dataNode(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, r, fill));
  }
  return dots.join("");
}

export function outputCard(x, y, w, h, opts = {}) {
  const {
    rx = 4,
    fill = palette.cardFill,
    opacity = 0.9,
    stroke: strokeColor = palette.active,
  } = opts;
  return `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${fmt(rx)}" fill="${fill}" style="stroke:${strokeColor};stroke-width:${stroke.primary};opacity:${opacity};${NON_SCALING}"/>`;
}
