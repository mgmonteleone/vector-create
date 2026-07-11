#!/usr/bin/env node
// Variation session controller for the wormhole aggregator.
//
// Usage:
//   node variation-cli.mjs init                      first batch (5 around base)
//   node variation-cli.mjs gen "wider, slower mesh"  next batch, steered by prompt
//   node variation-cli.mjs keep G2C3 [G2C1 ...]      mark candidate(s) as elites
//   node variation-cli.mjs status                    show session state
//
// State lives in ../variation-session.json next to the concept output.
// Each generation writes ../review-gen-N.html (5 inlined, namespaced SVGs).
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sampleBatch } from "./sampler.mjs";
import { mapPrompt } from "./promptMap.mjs";
import { buildGallery } from "./gallery.mjs";
import { baseGenome, sanitize } from "./genome.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(here, "..");
const STATE = resolve(OUT_DIR, "variation-session.json");
const BATCH = 5;

function loadState() {
  if (existsSync(STATE)) return JSON.parse(readFileSync(STATE, "utf8"));
  return { gen: 0, elites: [], history: [], lastBatch: [] };
}
function saveState(s) {
  writeFileSync(STATE, JSON.stringify(s, null, 2));
}

function findGenome(state, id) {
  // id like G2C3 -> generation 2, candidate 3 (1-based) in that batch's record.
  const rec = state.history.find((h) => id.startsWith(`G${h.gen}C`));
  if (!rec) return null;
  const idx = Number(id.split("C")[1]) - 1;
  return rec.genomes[idx] ? sanitize(rec.genomes[idx]) : null;
}

function writeGeneration(state, genomes, meta) {
  const { html, cards } = buildGallery(state.gen, genomes, meta);
  const file = resolve(OUT_DIR, `review-gen-${state.gen}.html`);
  writeFileSync(file, html);
  state.history.push({ gen: state.gen, genomes, meta, ids: cards.map((c) => c.id) });
  state.lastBatch = cards.map((c) => c.id);
  saveState(state);
  return { file, cards };
}

function cmdInit(state) {
  state.gen = 1;
  const { seed, genomes } = sampleBatch(BATCH, { anchor: baseGenome(), rate: 1 });
  // Slot 1 = exact approved baseline, so every session starts anchored.
  genomes[0] = baseGenome();
  const { file, cards } = writeGeneration(state, genomes, { seed, note: "initial spread around approved baseline" });
  report(file, cards);
}

function cmdGen(state, prompt) {
  if (state.gen === 0) return cmdInit(state);
  state.gen += 1;
  const { bias, rate, matched } = mapPrompt(prompt);
  const anchor = state.elites[0] ? sanitize(state.elites[0]) : baseGenome();
  const { seed, genomes } = sampleBatch(BATCH, {
    elites: state.elites.map(sanitize),
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
      state.elites.unshift(g); // newest-first; sampler treats elites[0] as anchor
      kept.push(id);
    }
  }
  state.elites = state.elites.slice(0, 3); // keep top 3 elites
  saveState(state);
  process.stdout.write(`Kept as elites: ${kept.join(", ") || "(none matched)"}\n`);
  process.stdout.write(`Elite anchor is now the first kept. Run: node variation-cli.mjs gen "<steer>"\n`);
}

function cmdStatus(state) {
  process.stdout.write(JSON.stringify({ gen: state.gen, lastBatch: state.lastBatch, elites: state.elites.length }, null, 2) + "\n");
}

function report(file, cards) {
  process.stdout.write(`Wrote ${file}\n`);
  for (const c of cards) process.stdout.write(`  ${c.id}: ${c.label}\n`);
}

const [, , cmd = "status", ...rest] = process.argv;
const state = loadState();
mkdirSync(OUT_DIR, { recursive: true });
if (cmd === "init") cmdInit(state);
else if (cmd === "gen") cmdGen(state, rest.join(" "));
else if (cmd === "keep") cmdKeep(state, rest);
else cmdStatus(state);
