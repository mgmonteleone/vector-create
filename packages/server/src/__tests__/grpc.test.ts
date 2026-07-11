/**
 * gRPC handler test. Calls the handler methods directly (no socket) with fake
 * ServerUnaryCall objects, asserting they delegate to the shared operations
 * layer and (de)serialize JSON genomes at the boundary. Also confirms the proto
 * loads and defines the six RPCs.
 */
import { describe, expect, test } from "bun:test";
import { createGrpcHandlers, loadVectorCreateProto } from "../faces/grpc";
import { Operations } from "../operations";

const stubRaster = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 5, 5]);

function handlers() {
  return createGrpcHandlers(new Operations({ agent: null, rasterize: stubRaster }));
}

// A handler as stored on the service impl: takes a call + node-style callback.
type Handler = (call: unknown, cb: (err: unknown, res?: unknown) => void) => void | Promise<void>;

// Promisify a callback-style handler, feeding it a fake ServerUnaryCall that
// carries just `.request` (all the handlers read).
function invoke<Res>(fn: unknown, request: unknown): Promise<Res> {
  return new Promise((resolve, reject) => {
    const result = (fn as Handler)({ request }, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res as Res);
      }
    });
    if (result instanceof Promise) {
      result.catch(reject);
    }
  });
}

describe("gRPC proto", () => {
  test("loads and defines the six RPCs", () => {
    const svc = loadVectorCreateProto();
    const methods = Object.keys(svc.service);
    for (const rpc of [
      "ListConcepts",
      "Render",
      "Steer",
      "Variations",
      "CreateConcept",
      "ExportPng",
    ]) {
      expect(methods).toContain(rpc);
    }
  });
});

describe("gRPC handlers", () => {
  test("ListConcepts includes wormhole with JSON schema", async () => {
    const h = handlers();
    const res = await invoke<{ concepts: Array<{ id: string; genome_spec: string }> }>(
      h.ListConcepts,
      {}
    );
    const wormhole = res.concepts.find((c) => c.id === "wormhole");
    expect(wormhole).toBeDefined();
    expect(JSON.parse(wormhole?.genome_spec ?? "{}")).toBeTypeOf("object");
  });

  test("Render returns svg", async () => {
    const h = handlers();
    const res = await invoke<{ svg: string }>(h.Render, { concept_id: "wormhole" });
    expect(res.svg).toContain("<svg");
  });

  test("Steer round-trips a JSON genome", async () => {
    const h = handlers();
    const res = await invoke<{ genome: string; svg: string; source: string }>(h.Steer, {
      concept_id: "wormhole",
      genome: JSON.stringify({ throatR: 6 }),
      prompt: "wider",
    });
    expect(JSON.parse(res.genome)).toBeTypeOf("object");
    expect(res.svg).toContain("<svg");
    expect(res.source).toBe("heuristic");
  });

  test("Variations returns n genomes + svgs", async () => {
    const h = handlers();
    const res = await invoke<{ genomes: string[]; svgs: string[] }>(h.Variations, {
      concept_id: "wormhole",
      n: 3,
      seed: 7,
    });
    expect(res.genomes).toHaveLength(3);
    expect(res.svgs).toHaveLength(3);
  });

  test("ExportPng returns png bytes", async () => {
    const h = handlers();
    const render = await invoke<{ svg: string }>(h.Render, { concept_id: "wormhole" });
    const res = await invoke<{ png: Buffer }>(h.ExportPng, { svg: render.svg });
    expect(res.png.byteLength).toBeGreaterThan(0);
  });

  test("Render reports an error for an unknown concept", async () => {
    const h = handlers();
    await expect(invoke(h.Render, { concept_id: "nope" })).rejects.toBeDefined();
  });
});
