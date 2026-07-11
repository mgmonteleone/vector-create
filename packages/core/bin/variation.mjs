#!/usr/bin/env node
// Variation session controller for a concept.
//
// Usage:
//   vector-create-variation init [conceptId]          first batch (5 around base)
//   vector-create-variation gen "wider, slower"       next batch, steered by prompt
//   vector-create-variation keep G2C3 [G2C1 ...]      mark candidate(s) as elites
//   vector-create-variation status                    show session state
//
// State lives in ./variation-session.json in the CWD. Each generation writes
// ./review-gen-N.html (5 inlined, namespaced SVGs).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildGallery } from "../dist/cli.js";
import { getConcept, mapPrompt, sampleConcept, sanitize } from "../dist/index.js";

const OUT_DIR = process.cwd();
const STATE = resolve(OUT_DIR, "variation-session.json");
const BATCH = 5;

const gallery = buildGallery;

function loadState() {
  if (existsSync(STATE)) {
    return JSON.parse(readFileSync(STATE, "utf8"));
  }
  return { conceptId: "wormhole", gen: 0, elites: [], history: [], lastBatch: [] };
}
function saveState(s) {
  writeFileSync(STATE, JSON.stringify(s, null, 2));
}
function conceptFor(state) {
  const c = getConcept(state.conceptId);
  if (!c) {
    process.stderr.write(`Unknown concept "${state.conceptId}".\n`);
    process.exit(1);
  }
  return c;
}

function findGenome(state, id) {
  const rec = state.history.find((h) => id.startsWith(`G${h.gen}C`));
  if (!rec) {
    return null;
  }
  const idx = Number(id.split("C")[1]) - 1;
  return rec.genomes[idx] ? sanitize(state.conceptId, rec.genomes[idx]) : null;
}

function writeGeneration(state, genomes, meta) {
  const { html, cards } = gallery(conceptFor(state), state.gen, genomes, meta);
  const file = resolve(OUT_DIR, `review-gen-${state.gen}.html`);
  writeFileSync(file, html);
  state.history.push({ gen: state.gen, genomes, meta, ids: cards.map((c) => c.id) });
  state.lastBatch = cards.map((c) => c.id);
  saveState(state);
  return { file, cards };
}

function report(file, cards) {
  process.stdout.write(`Wrote ${file}\n`);
  for (const c of cards) {
    process.stdout.write(`  ${c.id}: ${c.label}\n`);
  }
}

function cmdInit(state, conceptId) {
  if (conceptId) {
    state.conceptId = conceptId;
  }
  const concept = conceptFor(state);
  state.gen = 1;
  const { seed, genomes } = sampleConcept(state.conceptId, BATCH, {
    anchor: concept.baseGenome,
    rate: 1,
  });
  genomes[0] = concept.baseGenome; // slot 1 = exact approved baseline
  const { file, cards } = writeGeneration(state, genomes, {
    seed,
    note: "initial spread around approved baseline",
  });
  report(file, cards);
}

function cmdGen(state, prompt) {
  if (state.gen === 0) {
    return cmdInit(state);
  }
  const concept = conceptFor(state);
  state.gen += 1;
  const { bias, rate, matched } = mapPrompt(concept, prompt);
  const anchor = state.elites[0] ? sanitize(state.conceptId, state.elites[0]) : concept.baseGenome;
  const { seed, genomes } = sampleConcept(state.conceptId, BATCH, {
    elites: state.elites.map((e) => sanitize(state.conceptId, e)),
    bias,
    rate,
    anchor,
  });
  const { file, cards } = writeGeneration(state, genomes, { seed, prompt, matched });
  report(file, cards);
}

function cmdKeep(state, ids) {
  const kept = [];
  for (const id of ids) {
    const g = findGenome(state, id);
    if (g) {
      state.elites.unshift(g);
      kept.push(id);
    }
  }
  state.elites = state.elites.slice(0, 3);
  saveState(state);
  process.stdout.write(`Kept as elites: ${kept.join(", ") || "(none matched)"}\n`);
}

function cmdStatus(state) {
  process.stdout.write(
    `${JSON.stringify(
      {
        conceptId: state.conceptId,
        gen: state.gen,
        lastBatch: state.lastBatch,
        elites: state.elites.length,
      },
      null,
      2
    )}\n`
  );
}

const [, , cmd = "status", ...rest] = process.argv;
const state = loadState();
if (cmd === "init") {
  cmdInit(state, rest[0]);
} else if (cmd === "gen") {
  cmdGen(state, rest.join(" "));
} else if (cmd === "keep") {
  cmdKeep(state, rest);
} else {
  cmdStatus(state);
}
