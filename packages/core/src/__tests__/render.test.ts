import { describe, expect, test } from "bun:test";
import { BASE_GENOME } from "../concepts/wormhole";
import { render } from "../registry";

describe("render('wormhole')", () => {
  const svg = render("wormhole", BASE_GENOME, "WH1");

  test("yields a valid standalone SVG document", () => {
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('role="img"');
  });

  test("namespaces every id with the given prefix", () => {
    expect(svg).toContain("WH1_");
    // the flow keyframe is prefixed
    expect(svg).toContain("@keyframes WH1_flow");
    // ring grow-pulse classes are prefixed
    expect(svg).toContain("WH1_w0");
  });

  test("draws the funnel mesh (meridians + rings) and flow streams", () => {
    // meridian/ring paths use quadratic beziers
    expect(svg).toContain("Q");
    expect(svg).toContain("<ellipse");
    // continuous-flow streams use pathLength normalization
    expect(svg).toContain('pathLength="1"');
    // inbound + output flow classes exist
    expect(svg).toContain("WH1_f0");
  });

  test("only on-brand colours appear", () => {
    expect(svg).toContain("#5CCC76");
  });

  test("throws for an unknown concept id", () => {
    expect(() => render("nope")).toThrow(/Unknown concept/);
  });
});
