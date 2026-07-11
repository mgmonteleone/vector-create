import { describe, expect, it } from "vitest";
import { classifyPrompt } from "../prompt-router";

describe("classifyPrompt", () => {
  it("routes steering language to 'steer'", () => {
    for (const p of [
      "wider mouths, slower flow",
      "tighter throat and brighter mesh",
      "make it faster",
      "deeper funnel",
    ]) {
      expect(classifyPrompt(p)).toBe("steer");
    }
  });

  it("routes creation language to 'create'", () => {
    for (const p of [
      "make a pyramid",
      "create an aggregator concept",
      "something about communication",
      "new concept: dataflow",
      "generate a concept for messaging",
    ]) {
      expect(classifyPrompt(p)).toBe("create");
    }
  });

  it("defaults empty input to steer", () => {
    expect(classifyPrompt("")).toBe("steer");
    expect(classifyPrompt("   ")).toBe("steer");
  });
});
