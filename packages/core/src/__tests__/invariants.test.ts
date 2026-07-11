/**
 * User-approved wormhole render invariants. These assert the *structural*
 * guarantees the reviewer signed off on — the funnel mesh, the continuous-flow
 * (stroke-dashoffset) animation, and the wide-mouth bounds — survive packaging
 * and rendering. A drift here is a regression, not a test to "fix": if the
 * approved output legitimately changes, update these deliberately.
 */
import { describe, expect, test } from "bun:test";
import { BASE_GENOME, WORMHOLE_SPEC } from "../concepts/wormhole";
import { render } from "../registry";

const count = (svg: string, re: RegExp): number => (svg.match(re) ?? []).length;

describe("wormhole render invariants", () => {
  const svg = render("wormhole", BASE_GENOME, "WH1");

  test("renders a complete SVG document", () => {
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  test("contains the funnel mesh: latitude ring ellipses + meridian paths", () => {
    // The funnel mesh is drawn as concentric ring <ellipse>s plus meridian
    // <path>s; the approved baseline has a rich mesh (many of each).
    expect(count(svg, /<ellipse/g)).toBeGreaterThanOrEqual(8);
    expect(count(svg, /<path/g)).toBeGreaterThanOrEqual(8);
    // Ring pulses are grouped under grow-pulse classes (transform-origin at core).
    expect(svg).toContain("transform-origin:176px 170px");
  });

  test("uses continuous-flow animation via stroke-dashoffset (not pulse)", () => {
    expect(svg).toContain("stroke-dashoffset");
    // The flow keyframe travels the dash from a positive offset to 0.
    expect(svg).toMatch(
      /@keyframes WH1_flow\{from\{stroke-dashoffset:[\d.]+\}to\{stroke-dashoffset:0\}\}/
    );
    expect(svg).toContain("stroke-dasharray");
  });

  test("honors the wide-mouth bounds (mouthRx min 96)", () => {
    // Spec floor is 96; the approved baseline mouth is 102.
    expect(WORMHOLE_SPEC.mouthRx).toMatchObject({ min: 96 });
    expect(Number(BASE_GENOME.mouthRx)).toBeGreaterThanOrEqual(96);
    // The rendered mouth ellipses carry the baseline rx.
    expect(svg).toContain('rx="102"');
  });

  test("baseline is byte-stable (locks the approved geometry + animation)", () => {
    expect(svg.length).toBe(21701);
  });
});
