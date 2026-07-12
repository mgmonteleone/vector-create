/**
 * Availability detection for the auggie CLI binary.
 *
 * Both auggie v1 and the v2 prerelease are invoked with the same command name,
 * `auggie` (there is no separate `auggie-v2` executable — "v2" is the installed
 * package `@augmentcode/auggie-v2`, not the command). This package requires the
 * v2 runtime specifically, but detection can only probe the shared `auggie`
 * command on PATH.
 *
 * The agent package MUST degrade gracefully when the LLM runtime is absent, so
 * every public op checks availability first. Detection is a PATH lookup only —
 * we never spawn the binary here (spawning is the SDK's job, done lazily on the
 * first real prompt), so detection stays cheap and side-effect-free.
 */

import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";

/**
 * The binary the Cosmos Agent SDK spawns. The v2 runtime ships as the
 * `auggie-v2` SEA binary (with an `auggie-v2.d/` sidecar); some hosts also
 * alias it as `auggie`. Detection honours the same env overrides the client
 * factory uses (AUGGIE_COMMAND / AUGGIE_BINARY) and otherwise probes
 * `auggie-v2` first, then `auggie`.
 */
export const AUGGIE_BINARY = "auggie-v2";

/** Fallback command name when `auggie-v2` is not on PATH. */
export const AUGGIE_BINARY_FALLBACK = "auggie";

/**
 * The command the SDK should spawn on this host: the env override when set,
 * else the first of `auggie-v2` / `auggie` found on PATH (defaulting to
 * `auggie-v2` when neither is present so failures name the expected binary).
 */
export function resolveAuggieCommand(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.AUGGIE_COMMAND?.trim() || env.AUGGIE_BINARY?.trim();
  if (override) {
    return override;
  }
  if (isOnPath(AUGGIE_BINARY, env)) {
    return AUGGIE_BINARY;
  }
  if (isOnPath(AUGGIE_BINARY_FALLBACK, env)) {
    return AUGGIE_BINARY_FALLBACK;
  }
  return AUGGIE_BINARY;
}

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

/** True when an auggie binary the SDK can spawn is available on PATH. */
export function detectAuggie(env: NodeJS.ProcessEnv = process.env): boolean {
  return isOnPath(resolveAuggieCommand(env), env);
}
