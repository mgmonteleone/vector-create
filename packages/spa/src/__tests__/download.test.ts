import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadPng, downloadSvg, svgBlob } from "../download";

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>';

describe("SVG download", () => {
  it("builds an image/svg+xml blob with the raw SVG content", async () => {
    const blob = svgBlob(SVG);
    expect(blob.type).toBe("image/svg+xml");
    expect(await blob.text()).toBe(SVG);
  });

  it("downloadSvg names the file with a .svg extension and clicks a link", () => {
    const createUrl = vi.fn((_obj: Blob | MediaSource) => "blob:svg");
    const revokeUrl = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadSvg(SVG, "wormhole-42");

    expect(createUrl).toHaveBeenCalledOnce();
    const blobArg = createUrl.mock.calls[0]?.[0] as Blob | undefined;
    expect(blobArg?.type).toBe("image/svg+xml");
    expect(clickSpy).toHaveBeenCalledOnce();

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});

describe("PNG download", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:png"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("POSTs the SVG + dimensions to /api/export/png and downloads the returned blob", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), { status: 200 })
    );

    await downloadPng(SVG, "wormhole-42", 800, 600);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/export/png");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ svg: SVG, width: 800, height: 600 });
  });
});
