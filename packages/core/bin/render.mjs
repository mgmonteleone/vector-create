#!/usr/bin/env node
// Renders a concept to an SVG file.
//   vector-create-render <conceptId> [outPath] [idPrefix]
// e.g. vector-create-render wormhole ./wormhole.svg WH1
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getConcept, listConcepts, render } from "../dist/index.js";

const [, , conceptId = "wormhole", outArg, prefixArg] = process.argv;

if (!getConcept(conceptId)) {
  process.stderr.write(
    `Unknown concept "${conceptId}". Known: ${listConcepts()
      .map((c) => c.id)
      .join(", ")}\n`
  );
  process.exit(1);
}

const svg = render(conceptId, undefined, prefixArg);
const outPath = resolve(process.cwd(), outArg ?? `${conceptId}.svg`);

writeFileSync(outPath, `${svg}\n`, "utf8");
process.stderr.write(`Wrote ${outPath} (${svg.length} bytes)\n`);
