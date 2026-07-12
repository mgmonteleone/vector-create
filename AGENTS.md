# vector-create — agent & contributor guide

Agent-powered generative vector-graphics studio. A deterministic vector toolkit
produces animated SVG "concepts" (the first is a wormhole/black-hole
aggregator); an LLM agent (via the Cosmos Agent SDK) steers concept parameters
in natural language and can author entirely new concepts. Three interfaces sit
on top: a retro-terminal SPA, a REST + gRPC service, and a hosted MCP server.

## Toolchain

- **Bun** (`>=1.1`) for install / build / test across the workspace.
- **TypeScript** (`^5`), ESM everywhere (`"type": "module"`).
- **Biome** for lint/format (matches the SDK's own toolchain).
- Monorepo via Bun workspaces under `packages/*`.

```bash
bun install            # install all workspace deps
bun run build          # build every package
bun test               # test every package
bun run lint           # lint every package
bun run dev:server     # run the REST/gRPC/MCP service in watch mode
bun run dev:spa        # run the SPA dev server
```

## Packages

- **`packages/core`** (`@vector-create/core`) — the framework-free vector
  toolkit: primitives, compose, keyframes, tokens, and the variation engine
  (`genome`, `sampler`, `promptMap`). Exposes a **concept registry** so concepts
  (wormhole, pyramid, …) register a `{ id, render(genome), genomeSpec }`
  contract. Pure, dependency-light, isomorphic (runs in Node/Bun and browser).
  This is the single source of truth for rendering; every interface calls it.
- **`packages/agent`** (`@vector-create/agent`) — wraps
  `@augmentcode/cosmos-agent-sdk` (`AuggieClient`, which spawns `auggie-v2`).
  Exposes agent tools: `render_genome`, `steer_genome(prompt)`,
  `create_concept(description)`, `list_concepts`. MUST degrade gracefully to the
  deterministic `promptMap` when the `auggie-v2` binary is absent.
- **`packages/server`** (`@vector-create/server`) — one service, three faces
  sharing core+agent: **REST** (Hono), **gRPC** (`@grpc/grpc-js`, proto-first
  from `proto/`), and a hosted **MCP** server (`@modelcontextprotocol/sdk`).
- **`packages/spa`** (`@vector-create/spa`) — Vite + a light framework, styled
  as a retro ASCII / terminal UI. Live animated SVG preview, prompt box, genome
  sliders, gallery/history, SVG+PNG download & save. Talks to the server over
  REST.

## Runtime dependency: auggie-v2

The agent package needs the `auggie-v2` binary on PATH. Install it from the
`@augmentcode/auggie-v2` package:

```bash
npm install -g @augmentcode/auggie-v2
# or
bun add -g @augmentcode/auggie-v2
```

When the binary is unavailable, the agent falls back to the deterministic
keyword `promptMap` so the app still functions (concept authoring is disabled in
that mode).

## Conventions

- **Proto-first** for gRPC: edit `proto/*.proto` before implementing service
  changes; REST/MCP/gRPC all map onto the same core operations.
- **Core stays pure**: no server/DOM imports in `packages/core`. Interfaces
  depend on core, never the reverse.
- Conventional commits; every commit references the ticket key when there is one.
- Branch names start with the username (e.g. `mgmonteleone/vc-1-...`).
