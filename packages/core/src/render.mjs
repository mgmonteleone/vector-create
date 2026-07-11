#!/usr/bin/env node
// Tiny zero-dependency CLI: renders a concept to an SVG file.
//   node render.mjs <concept> [outPath] [idPrefix]
// e.g. node render.mjs blackhole ../blackhole-aggregator.svg BH1
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { blackhole } from "./concepts/blackhole.mjs";

const CONCEPTS = { blackhole };

const here = dirname(fileURLToPath(import.meta.url));
const [, , conceptArg = "blackhole", outArg, prefixArg] = process.argv;

const concept = CONCEPTS[conceptArg];
if (!concept) {
  process.stderr.write(
    `Unknown concept "${conceptArg}". Known: ${Object.keys(CONCEPTS).join(", ")}\n`
  );
  process.exit(1);
}

const svg = concept(prefixArg ?? "BH1");
const defaultOut = resolve(here, "..", "blackhole-aggregator.svg");
const outPath = outArg ? resolve(process.cwd(), outArg) : defaultOut;

writeFileSync(outPath, `${svg}\n`, "utf8");
process.stderr.write(`Wrote ${outPath} (${svg.length} bytes)\n`);
