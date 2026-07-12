import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("api client routing", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("steer() POSTs to /api/steer with conceptId, genome and prompt", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      jsonResponse({ genome: { throatR: 9 }, svg: "<svg/>", rationale: "wider", source: "llm" })
    );

    const res = await api.steer("wormhole", { throatR: 7 }, "wider mouths");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(`${api.API_BASE}/api/steer`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      conceptId: "wormhole",
      genome: { throatR: 7 },
      prompt: "wider mouths",
    });
    expect(res.source).toBe("llm");
  });

  it("createConcept() POSTs to /api/concepts with description", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      jsonResponse({ conceptId: "pyramid", title: "Pyramid", svg: "<svg/>", source: "fallback" })
    );

    const res = await api.createConcept("make a pyramid");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(`${api.API_BASE}/api/concepts`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ description: "make a pyramid" });
    expect(res.conceptId).toBe("pyramid");
  });

  it("ping() resolves false when the server is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await api.ping()).toBe(false);
  });

  it("throws ApiError on non-ok responses", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("nope", { status: 500 }));
    await expect(api.render("wormhole", {})).rejects.toBeInstanceOf(api.ApiError);
  });
});
