/**
 * MCP face (@modelcontextprotocol/sdk). Exposes the six canonical operations as
 * MCP tools. Thin adapter: each tool handler parses its args, calls the shared
 * {@link Operations} layer, and returns MCP content. Serves over
 * streamable-http (hostable) and stdio (local); export_png returns base64 PNG.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Genome } from "@vector-create/core";
import { z } from "zod";
import type { Operations } from "../operations";

const genomeSchema = z.record(z.string(), z.union([z.number(), z.array(z.number())]));
const biasSchema = z.record(z.string(), z.union([z.literal(1), z.literal(-1)]));

function textContent(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

/**
 * Build an McpServer with the six vector-create tools registered against the
 * shared operations layer. Returned unconnected so a caller can attach any
 * transport (stdio, streamable-http, or an in-memory pair for tests).
 */
export function createMcpServer(ops: Operations): McpServer {
  const server = new McpServer({ name: "vector-create", version: "0.1.0" });

  server.registerTool(
    "list_concepts",
    {
      title: "List concepts",
      description: "List every registered concept with its genome schema and baseline.",
      inputSchema: {},
    },
    () => textContent(ops.listConcepts())
  );

  server.registerTool(
    "render",
    {
      title: "Render",
      description: "Render a concept's (partial) genome to an animated SVG string.",
      inputSchema: {
        conceptId: z.string(),
        genome: genomeSchema.optional(),
        prefix: z.string().optional(),
      },
    },
    ({ conceptId, genome, prefix }) => textContent(ops.render(conceptId, genome as Genome, prefix))
  );

  server.registerTool(
    "steer",
    {
      title: "Steer",
      description: "Steer a genome with a natural-language prompt (agent if available).",
      inputSchema: {
        conceptId: z.string(),
        genome: genomeSchema.optional(),
        prompt: z.string(),
      },
    },
    async ({ conceptId, genome, prompt }) =>
      textContent(await ops.steer(conceptId, (genome as Genome) ?? {}, prompt))
  );

  server.registerTool(
    "variations",
    {
      title: "Variations",
      description: "Produce n on-brand candidate genomes and their rendered SVGs.",
      inputSchema: {
        conceptId: z.string(),
        n: z.number().int().positive().optional(),
        seed: z.number().int().optional(),
        anchor: genomeSchema.optional(),
        bias: biasSchema.optional(),
        rate: z.number().optional(),
      },
    },
    ({ conceptId, n, seed, anchor, bias, rate }) =>
      textContent(
        ops.variations(conceptId, n ?? 6, {
          seed,
          anchor: anchor as Genome | undefined,
          bias: bias as Record<string, 1 | -1> | undefined,
          rate,
        })
      )
  );

  server.registerTool(
    "create_concept",
    {
      title: "Create concept",
      description: "Author a new concept from a natural-language description (agent if available).",
      inputSchema: { description: z.string() },
    },
    async ({ description }) => textContent(await ops.createConcept(description))
  );

  server.registerTool(
    "export_png",
    {
      title: "Export PNG",
      description: "Rasterize an SVG string to a PNG, returned as a base64 image resource.",
      inputSchema: {
        svg: z.string(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      },
    },
    ({ svg, width, height }) => {
      const png = ops.exportPng(svg, width, height);
      const base64 = Buffer.from(png).toString("base64");
      return {
        content: [
          {
            type: "image" as const,
            data: base64,
            mimeType: "image/png",
          },
        ],
      };
    }
  );

  return server;
}

/** Connect an McpServer to stdio (local usage). */
export async function serveMcpStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/**
 * Build a streamable-http transport in stateless mode (fresh transport per
 * request-less lifetime is handled by the caller/HTTP layer). Returned so the
 * boot module can hand it HTTP requests.
 */
export function createStreamableHttpTransport(): StreamableHTTPServerTransport {
  return new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
}
