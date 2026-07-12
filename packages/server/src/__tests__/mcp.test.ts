/**
 * MCP tool-list / tool-call test via an in-memory transport pair (no socket).
 */
import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../faces/mcp";
import { Operations } from "../operations";

const stubRaster = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 3, 3, 3]);

async function connectedClient() {
  const ops = new Operations({ agent: null, rasterize: stubRaster });
  const server = createMcpServer(ops);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return { client, server };
}

type TextResult = { content: Array<{ type: string; text?: string; data?: string }> };

function firstText(result: unknown): unknown {
  const text = (result as TextResult).content.find((c) => c.type === "text")?.text ?? "null";
  return JSON.parse(text);
}

describe("MCP face", () => {
  test("lists all six tools", async () => {
    const { client } = await connectedClient();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      ["create_concept", "export_png", "list_concepts", "render", "steer", "variations"].sort()
    );
  });

  test("list_concepts returns wormhole", async () => {
    const { client } = await connectedClient();
    const res = await client.callTool({ name: "list_concepts", arguments: {} });
    const concepts = firstText(res) as Array<{ id: string }>;
    expect(concepts.map((c) => c.id)).toContain("wormhole");
  });

  test("render returns svg", async () => {
    const { client } = await connectedClient();
    const res = await client.callTool({ name: "render", arguments: { conceptId: "wormhole" } });
    const out = firstText(res) as { svg: string };
    expect(out.svg).toContain("<svg");
  });

  test("steer returns a steered genome", async () => {
    const { client } = await connectedClient();
    const res = await client.callTool({
      name: "steer",
      arguments: { conceptId: "wormhole", prompt: "wider" },
    });
    const out = firstText(res) as { svg: string; source: string };
    expect(out.svg).toContain("<svg");
    expect(out.source).toBe("heuristic");
  });

  test("variations returns n entries", async () => {
    const { client } = await connectedClient();
    const res = await client.callTool({
      name: "variations",
      arguments: { conceptId: "wormhole", n: 2, seed: 1 },
    });
    const out = firstText(res) as { genomes: unknown[]; svgs: string[] };
    expect(out.genomes).toHaveLength(2);
    expect(out.svgs).toHaveLength(2);
  });

  test("export_png returns a base64 image content block", async () => {
    const { client } = await connectedClient();
    const render = await client.callTool({
      name: "render",
      arguments: { conceptId: "wormhole" },
    });
    const { svg } = firstText(render) as { svg: string };

    const res = (await client.callTool({
      name: "export_png",
      arguments: { svg },
    })) as TextResult;
    const image = res.content.find((c) => c.type === "image");
    expect(image?.data).toBeDefined();
    expect((image?.data ?? "").length).toBeGreaterThan(0);
  });
});
