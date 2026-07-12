/**
 * Cross-face parity: the SAME operation, invoked directly on the shared
 * {@link Operations} layer and through the MCP in-memory transport, must agree.
 * This guards the "thin adapter, one source of truth" contract — MCP (and by
 * construction REST/gRPC) must never re-implement or drift from operations.ts.
 *
 * Both faces share ONE Operations instance so any nondeterminism would be in
 * the adapter, not the underlying data. Agent absent (CI fallback path).
 */
import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../faces/mcp";
import { Operations } from "../operations";

const stubRaster = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 7, 7, 7]);

async function harness() {
  const ops = new Operations({ agent: null, rasterize: stubRaster });
  const server = createMcpServer(ops);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "parity", version: "0.0.0" });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return { ops, client };
}

type TextResult = { content: Array<{ type: string; text?: string }> };
function mcpJson(result: unknown): unknown {
  const text = (result as TextResult).content.find((c) => c.type === "text")?.text ?? "null";
  return JSON.parse(text);
}

describe("cross-face parity (operations.ts vs MCP transport)", () => {
  test("render agrees byte-for-byte", async () => {
    const { ops, client } = await harness();
    const direct = ops.render("wormhole");
    const viaMcp = mcpJson(
      await client.callTool({ name: "render", arguments: { conceptId: "wormhole" } })
    ) as { svg: string };
    expect(viaMcp.svg).toBe(direct.svg);
  });

  test("steer agrees structurally across faces", async () => {
    // The agent-absent heuristic applies an UNSEEDED on-brand jitter, so the
    // genome/svg are intentionally non-reproducible call-to-call. Parity here is
    // about the adapter not transforming the result: same source, same rationale,
    // same genome key set, and a real SVG from both faces.
    const { ops, client } = await harness();
    const direct = await ops.steer("wormhole", {}, "wider");
    const viaMcp = mcpJson(
      await client.callTool({
        name: "steer",
        arguments: { conceptId: "wormhole", prompt: "wider" },
      })
    ) as { genome: Record<string, unknown>; svg: string; rationale: string; source: string };
    expect(viaMcp.source).toBe(direct.source);
    expect(viaMcp.rationale).toBe(direct.rationale);
    expect(Object.keys(viaMcp.genome).sort()).toEqual(Object.keys(direct.genome).sort());
    expect(viaMcp.svg).toContain("<svg");
    expect(direct.svg).toContain("<svg");
  });

  test("variations agrees for a fixed seed", async () => {
    const { ops, client } = await harness();
    const direct = ops.variations("wormhole", 4, { seed: 99 });
    const viaMcp = mcpJson(
      await client.callTool({
        name: "variations",
        arguments: { conceptId: "wormhole", n: 4, seed: 99 },
      })
    ) as { genomes: unknown[]; svgs: string[] };
    expect(viaMcp.genomes).toEqual(direct.genomes);
    expect(viaMcp.svgs).toEqual(direct.svgs);
  });

  test("list_concepts agrees", async () => {
    const { ops, client } = await harness();
    const direct = ops.listConcepts();
    const viaMcp = mcpJson(await client.callTool({ name: "list_concepts", arguments: {} }));
    expect(viaMcp).toEqual(direct);
  });
});
