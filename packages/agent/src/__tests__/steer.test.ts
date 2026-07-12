/**
 * Steering tests. Exercise both engines without a live `auggie-v2`: the
 * fallback path drives core's deterministic promptMap directly; the LLM path
 * injects a mock client so we control the "model" reply and assert that deltas
 * are applied and out-of-range values are clamped by core.sanitize.
 */
import { describe, expect, it } from "bun:test";
import { getConcept, sanitize } from "@vector-create/core";
import { VectorAgent } from "../agent";
import type { AgentClient } from "../client";
import { steerFallback } from "../steer";

const CONCEPT = "wormhole";

/** A mock AgentClient whose "assistant reply" is a fixed string we supply. */
function mockClient(reply: string): AgentClient {
  return {
    promptAndWait: () => Promise.resolve(),
    getLastAssistantTextTyped: () => Promise.resolve({ text: reply }),
    close: () => {},
  };
}

describe("steerFallback", () => {
  it("maps 'wider' to a larger mouth within bounds", () => {
    const base = getConcept(CONCEPT)?.baseGenome ?? {};
    const result = steerFallback(CONCEPT, base, "make the mouths a lot wider");

    const spec = getConcept(CONCEPT)?.genomeSpec.mouthRx;
    expect(spec?.kind).toBe("num");
    const mouthRx = result.genome.mouthRx as number;
    // Widened relative to baseline...
    expect(mouthRx).toBeGreaterThan(base.mouthRx as number);
    // ...and still inside the concept's approved bounds.
    if (spec && spec.kind === "num") {
      expect(mouthRx).toBeGreaterThanOrEqual(spec.min);
      expect(mouthRx).toBeLessThanOrEqual(spec.max);
    }
    expect(result.source).toBe("fallback");
    expect(result.svg).toContain("<svg");
  });
});

describe("VectorAgent.steerGenome (LLM, mocked)", () => {
  it("applies the agent's proposed gene deltas and re-renders", async () => {
    const agent = await VectorAgent.create({
      clientFactory: () => mockClient('{"genome":{"mouthRx":118},"rationale":"wider mouths"}'),
    });
    expect(agent.mode).toBe("llm");

    const base = getConcept(CONCEPT)?.baseGenome ?? {};
    const result = await agent.steerGenome(CONCEPT, base, "wider please");
    agent.close();

    expect(result.source).toBe("llm");
    expect(result.genome.mouthRx).toBe(118);
    expect(result.rationale).toBe("wider mouths");
    expect(result.svg).toContain("<svg");
  });

  it("clamps out-of-range values the agent proposes", async () => {
    const agent = await VectorAgent.create({
      // 9999 is far above mouthRx.max — core.sanitize must clamp it.
      clientFactory: () => mockClient('{"genome":{"mouthRx":9999}}'),
    });
    const base = getConcept(CONCEPT)?.baseGenome ?? {};
    const result = await agent.steerGenome(CONCEPT, base, "as wide as possible");
    agent.close();

    const spec = getConcept(CONCEPT)?.genomeSpec.mouthRx;
    if (spec && spec.kind === "num") {
      expect(result.genome.mouthRx).toBe(spec.max);
    }
    expect(result.source).toBe("llm");
  });

  it("falls back deterministically when the agent returns garbage", async () => {
    const agent = await VectorAgent.create({
      clientFactory: () => mockClient("sorry, I cannot help with that"),
    });
    const base = getConcept(CONCEPT)?.baseGenome ?? {};
    const result = await agent.steerGenome(CONCEPT, base, "wider");
    agent.close();

    expect(result.source).toBe("fallback");
    // Result is still a valid, clamped genome.
    expect(result.genome).toEqual(sanitize(CONCEPT, result.genome));
  });
});
