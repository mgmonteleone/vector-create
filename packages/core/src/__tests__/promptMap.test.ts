import { describe, expect, test } from "bun:test";
import { wormholeConcept } from "../concepts/wormhole";
import { mapPrompt } from "../promptMap";

describe("mapPrompt (wormhole)", () => {
  test("'wider' biases mouthRx up", () => {
    const { bias } = mapPrompt(wormholeConcept, "make it wider");
    expect(bias.mouthRx).toBe(1);
  });

  test("'narrower' biases mouthRx down", () => {
    const { bias } = mapPrompt(wormholeConcept, "narrower mouths");
    expect(bias.mouthRx).toBe(-1);
  });

  test("'slower' biases the flow slower (revealDuration + flowDuration up)", () => {
    const { bias } = mapPrompt(wormholeConcept, "slower and calmer");
    expect(bias.revealDuration).toBe(1);
    expect(bias.flowDuration).toBe(1);
  });

  test("'faster' biases the flow faster", () => {
    const { bias } = mapPrompt(wormholeConcept, "snappier, faster");
    expect(bias.flowDuration).toBe(-1);
  });

  test("intensity words scale the rate", () => {
    expect(mapPrompt(wormholeConcept, "a bit wider").rate).toBe(0.5);
    expect(mapPrompt(wormholeConcept, "way wider").rate).toBe(1.6);
    expect(mapPrompt(wormholeConcept, "wider").rate).toBe(1);
  });

  test("unknown words are ignored", () => {
    const { bias, matched } = mapPrompt(wormholeConcept, "banana zebra");
    expect(Object.keys(bias)).toHaveLength(0);
    expect(matched).toHaveLength(0);
  });
});
