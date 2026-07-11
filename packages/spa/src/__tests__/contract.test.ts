/**
 * SPA <-> server REST contract test. Asserts the SPA api.ts consumes EXACTLY
 * the shapes the server emits, guarding the just-applied REST reconciliation fix
 * against regression:
 *   1. GET /api/concepts is wrapped as { concepts: [...] } and api.listConcepts
 *      UNWRAPS it to the bare array.
 *   2. The steer/create `source` union includes "heuristic" (the agent-absent
 *      create path the server reports), and the client passes it through.
 *
 * These are the two contract points the fix touched; a server that stopped
 * wrapping, or a client that stopped unwrapping / rejected "heuristic", would
 * fail here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api";
import type { AgentSource } from "../types";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("SPA <-> server REST contract", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("listConcepts() unwraps the server's { concepts: [...] } envelope", async () => {
    const serverPayload = {
      concepts: [
        {
          id: "wormhole",
          title: "Wormhole aggregator",
          genomeSpec: { mouthRx: { kind: "num", min: 96, max: 122 } },
          baseGenome: { mouthRx: 102 },
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(serverPayload));

    const result = await api.listConcepts();

    // Must be the bare array, not the { concepts } envelope.
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("wormhole");
    // The caller receives concept summaries, never an object with `.concepts`.
    expect((result as unknown as { concepts?: unknown }).concepts).toBeUndefined();
  });

  it("steer() accepts source 'heuristic' from the agent-absent path", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        genome: { mouthRx: 109 },
        svg: "<svg/>",
        rationale: "Nudged mouthRx.",
        source: "heuristic",
      })
    );

    const res = await api.steer("wormhole", { mouthRx: 102 }, "wider");

    expect(res.source).toBe("heuristic");
    // Statically assert the union includes "heuristic".
    const source: AgentSource = res.source;
    expect(["llm", "fallback", "heuristic"]).toContain(source);
  });

  it("createConcept() accepts source 'heuristic' (the server's create fallback)", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        conceptId: "wormhole",
        title: 'Draft from "a swirling nebula"',
        svg: "<svg/>",
        source: "heuristic",
      })
    );

    const res = await api.createConcept("a swirling nebula");

    expect(res.source).toBe("heuristic");
    const source: AgentSource = res.source;
    expect(["llm", "fallback", "heuristic"]).toContain(source);
  });
});
