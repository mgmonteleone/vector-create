/**
 * Session persistence. Named sessions ({ conceptId, genome, promptHistory })
 * are stored in localStorage so a studio session survives a reload and can be
 * reloaded by name.
 */
import type { Genome, SavedSession } from "./types";

const STORAGE_KEY = "vector-create.sessions.v1";

function readAll(): SavedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedSession[]) : [];
  } catch {
    return [];
  }
}

function writeAll(sessions: SavedSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

/**
 * Every saved session, newest first. Ties on `savedAt` (two saves within the
 * same millisecond) fall back to storage order so ordering stays deterministic.
 */
export function listSessions(): SavedSession[] {
  const all = readAll();
  return all
    .map((session, index) => ({ session, index }))
    .sort((a, b) => b.session.savedAt - a.session.savedAt || b.index - a.index)
    .map(({ session }) => session);
}

/**
 * Save (or overwrite by name) a session. Returns the stored record. Overwriting
 * by name keeps the list free of duplicate slots for the same save name.
 */
export function saveSession(
  name: string,
  conceptId: string,
  genome: Genome,
  promptHistory: string[]
): SavedSession {
  const record: SavedSession = {
    name,
    conceptId,
    genome,
    promptHistory,
    savedAt: Date.now(),
  };
  const next = readAll().filter((s) => s.name !== name);
  next.push(record);
  writeAll(next);
  return record;
}

/** Load a session by name, or undefined if it does not exist. */
export function loadSession(name: string): SavedSession | undefined {
  return readAll().find((s) => s.name === name);
}

/** Delete a session by name. Returns true if a record was removed. */
export function deleteSession(name: string): boolean {
  const all = readAll();
  const next = all.filter((s) => s.name !== name);
  if (next.length === all.length) {
    return false;
  }
  writeAll(next);
  return true;
}
