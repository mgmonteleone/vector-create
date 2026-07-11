/**
 * Availability detection for the `auggie-v2` binary.
 *
 * The agent package MUST degrade gracefully when the LLM runtime is absent, so
 * every public op checks availability first. Detection is a PATH lookup only —
 * we never spawn the binary here (spawning is the SDK's job, done lazily on the
 * first real prompt), so detection stays cheap and side-effect-free.
 */

import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";

/** The binary the Cosmos Agent SDK spawns. */
export const AUGGIE_BINARY = "auggie-v2";

/** On Windows an executable may carry any of these extensions. */
const WIN_EXE_EXTS = [".exe", ".cmd", ".bat", ".com"];

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve whether `binary` is an executable on PATH. Pure filesystem probing;
 * never throws — an unreadable PATH entry just doesn't match.
 */
export function isOnPath(binary: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const pathVar = env.PATH ?? env.Path ?? "";
  if (!pathVar) {
    return false;
  }
  const isWin = process.platform === "win32";
  const candidates = isWin ? ["", ...WIN_EXE_EXTS] : [""];
  for (const dir of pathVar.split(delimiter)) {
    if (!dir) {
      continue;
    }
    for (const ext of candidates) {
      if (isExecutable(join(dir, binary + ext))) {
        return true;
      }
    }
  }
  return false;
}

/** True when the `auggie-v2` binary the SDK needs is available on PATH. */
export function detectAuggie(env: NodeJS.ProcessEnv = process.env): boolean {
  return isOnPath(AUGGIE_BINARY, env);
}
