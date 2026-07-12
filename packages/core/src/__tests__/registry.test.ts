import { describe, expect, test } from "bun:test";
import type { Concept } from "../concept";
import { getConcept, listConcepts, registerConcept } from "../registry";

describe("registry", () => {
  test("lists the built-in wormhole concept", () => {
    const ids = listConcepts().map((c) => c.id);
    expect(ids).toContain("wormhole");
  });

  test("getConcept returns the wormhole with a full contract", () => {
    const c = getConcept("wormhole");
    expect(c).toBeDefined();
    expect(c?.id).toBe("wormhole");
    expect(c?.title).toBe("Wormhole aggregator");
    expect(typeof c?.render).toBe("function");
    expect(c?.genomeSpec.mouthRx).toBeDefined();
    expect(c?.baseGenome.mouthRx).toBe(102);
  });

  test("getConcept returns undefined for unknown ids", () => {
    expect(getConcept("does-not-exist")).toBeUndefined();
  });

  test("registerConcept adds and replaces concepts", () => {
    const fake: Concept = {
      id: "test-fake",
      title: "Fake",
      render: () => "<svg></svg>",
      genomeSpec: {},
      baseGenome: {},
    };
    registerConcept(fake);
    expect(getConcept("test-fake")?.title).toBe("Fake");
    registerConcept({ ...fake, title: "Fake v2" });
    expect(getConcept("test-fake")?.title).toBe("Fake v2");
  });
});
