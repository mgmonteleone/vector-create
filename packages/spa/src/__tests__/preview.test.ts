import { describe, expect, it } from "vitest";
import { isLocalConcept, localConcepts, renderLocal, uniquePrefix } from "../preview";

describe("preview helpers", () => {
  it("exposes core's built-in concepts", () => {
    const ids = localConcepts().map((c) => c.id);
    expect(ids).toContain("wormhole");
    expect(isLocalConcept("wormhole")).toBe(true);
    expect(isLocalConcept("nope")).toBe(false);
  });

  it("mints a unique prefix per instance so animation ids never collide", () => {
    const prefixes = new Set(Array.from({ length: 50 }, () => uniquePrefix()));
    expect(prefixes.size).toBe(50);
  });

  it("renders a concept locally via core", () => {
    const svg = renderLocal("wormhole", {}, uniquePrefix("t"));
    expect(svg).toContain("<svg");
  });
});
