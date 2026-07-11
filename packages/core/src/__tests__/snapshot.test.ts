import { describe, expect, test } from "bun:test";
import { BASE_GENOME } from "../concepts/wormhole";
import { render } from "../registry";

describe("wormhole SVG snapshot", () => {
  test("baseline render is stable (locks the approved geometry + animation)", () => {
    const svg = render("wormhole", BASE_GENOME, "WH1");
    // Full-document snapshot: any geometry/animation drift fails this test.
    expect(svg).toMatchSnapshot();
  });

  test("baseline byte length is unchanged", () => {
    const svg = render("wormhole", BASE_GENOME, "WH1");
    expect(svg.length).toBe(21701);
  });
});
