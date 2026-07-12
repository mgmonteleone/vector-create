import { beforeEach, describe, expect, it } from "vitest";
import { deleteSession, listSessions, loadSession, saveSession } from "../storage";

describe("session storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a saved creation", () => {
    const genome = { throatR: 9, ringDurations: [3.2, 4.2, 2.6] };
    const history = ["wider mouths", "slower flow"];

    saveSession("my-hole", "wormhole", genome, history);
    const loaded = loadSession("my-hole");

    expect(loaded).toBeDefined();
    expect(loaded?.conceptId).toBe("wormhole");
    expect(loaded?.genome).toEqual(genome);
    expect(loaded?.promptHistory).toEqual(history);
    expect(typeof loaded?.savedAt).toBe("number");
  });

  it("overwrites a session with the same name instead of duplicating", () => {
    saveSession("slot", "wormhole", { throatR: 4 }, []);
    saveSession("slot", "wormhole", { throatR: 12 }, ["tweak"]);

    const all = listSessions();
    expect(all.filter((s) => s.name === "slot")).toHaveLength(1);
    expect(loadSession("slot")?.genome).toEqual({ throatR: 12 });
  });

  it("lists sessions newest-first and deletes by name", () => {
    saveSession("a", "wormhole", {}, []);
    saveSession("b", "wormhole", {}, []);
    expect(listSessions().map((s) => s.name)).toEqual(["b", "a"]);

    expect(deleteSession("a")).toBe(true);
    expect(deleteSession("missing")).toBe(false);
    expect(listSessions().map((s) => s.name)).toEqual(["b"]);
  });

  it("survives corrupt storage without throwing", () => {
    localStorage.setItem("vector-create.sessions.v1", "{not json");
    expect(listSessions()).toEqual([]);
  });
});
