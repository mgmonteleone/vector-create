/**
 * Concept-authoring tests. Fallback mode (no agent) must return an unavailable
 * error, not throw. LLM mode (mocked) must validate the agent's declarative
 * scene, register a real concept, and produce a render function that returns
 * animated SVG.
 */
import { describe, expect, it } from "bun:test";
import { getConcept } from "@vector-create/core";
import { VectorAgent } from "../agent";
import type { AgentClient } from "../client";

function mockClient(reply: string): AgentClient {
  return {
    promptAndWait: () => Promise.resolve(),
    getLastAssistantTextTyped: () => Promise.resolve({ text: reply }),
    close: () => {},
  };
}

const VALID_CONCEPT_JSON = JSON.stringify({
  id: "test-nebula",
  title: "Test Nebula",
  genomeSpec: {
    flowSpeed: { kind: "num", min: 1, max: 6, step: 0.5, label: "flow speed" },
    coreSize: { kind: "num", min: 4, max: 40, step: 2, label: "core size" },
  },
  baseGenome: { flowSpeed: 3, coreSize: 20 },
  scene: {
    core: { x: 200, y: 200, radius: 20 },
    nodes: [
      { x: 40, y: 60 },
      { x: 40, y: 340 },
    ],
    flows: [
      { from: [40, 60], to: [200, 200] },
      { from: [200, 200], to: [360, 340] },
    ],
    cards: [{ x: 340, y: 180, w: 30, h: 20 }],
  },
});

describe("createConcept fallback (no agent)", () => {
  it("returns an unavailable error without throwing", async () => {
    const agent = await VectorAgent.create({ available: false });
    expect(agent.mode).toBe("fallback");

    const result = await agent.createConcept("a spiral galaxy aggregator");
    agent.close();

    expect(result.source).toBe("fallback");
    expect(result.concept).toBeUndefined();
    expect(result.svg).toBeUndefined();
    expect(result.error).toContain("auggie-v2");
  });
});

describe("createConcept (LLM, mocked)", () => {
  it("registers a concept whose render() returns animated SVG", async () => {
    const agent = await VectorAgent.create({ clientFactory: () => mockClient(VALID_CONCEPT_JSON) });
    const result = await agent.createConcept("a nebula that aggregates streams");
    agent.close();

    expect(result.source).toBe("llm");
    expect(result.concept?.id).toBe("test-nebula");
    expect(result.svg).toContain("<svg");
    // Animated: the compiled render emits keyframe CSS.
    expect(result.svg).toContain("@keyframes");

    // The concept is registered and re-renderable via the registry.
    const registered = getConcept("test-nebula");
    expect(registered).toBeDefined();
    const reRender = registered?.render(registered.baseGenome);
    expect(reRender).toContain("<svg");
  });

  it("returns a fallback error when the agent's spec is invalid", async () => {
    const agent = await VectorAgent.create({
      clientFactory: () => mockClient('{"nonsense":true}'),
    });
    const result = await agent.createConcept("something");
    agent.close();

    expect(result.source).toBe("fallback");
    expect(result.error).toBeDefined();
  });
});
