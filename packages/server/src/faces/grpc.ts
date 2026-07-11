/**
 * gRPC face (@grpc/grpc-js). Proto-first: the service contract lives in
 * proto/vector_create.proto and is loaded at runtime via @grpc/proto-loader
 * (no code generation, no bazel). Handlers are thin — every one delegates to
 * the shared {@link Operations} layer. Genomes cross the wire as JSON strings
 * (see the proto), so handlers only (de)serialize at the boundary.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import type { Genome } from "@vector-create/core";
import type { Operations } from "../operations";

/**
 * Absolute path to the shared proto definition. Resolved by walking up from
 * this module's location until `proto/vector_create.proto` is found, so it works
 * identically from source (packages/server/src/faces) and from the bundle
 * (packages/server/dist), whose depths differ.
 */
export const PROTO_PATH = resolveProtoPath();

function resolveProtoPath(): string {
  const rel = join("proto", "vector_create.proto");
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, rel);
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error(`Could not locate ${rel} above ${fileURLToPath(import.meta.url)}`);
}

type UnaryCall<Req> = grpc.ServerUnaryCall<Req, unknown>;
type UnaryCb<Res> = grpc.sendUnaryData<Res>;

type Bias = Record<string, 1 | -1>;

function parseGenome(json: string | undefined): Genome | undefined {
  if (!json) {
    return undefined;
  }
  return JSON.parse(json) as Genome;
}

function fail(cb: UnaryCb<unknown>, err: unknown): void {
  cb({
    code: grpc.status.INVALID_ARGUMENT,
    message: err instanceof Error ? err.message : String(err),
  });
}

/**
 * Build the plain handler object for the VectorCreate service. Exported on its
 * own so tests can call the methods directly without standing up a socket.
 */
export function createGrpcHandlers(ops: Operations) {
  return {
    ListConcepts(_call: UnaryCall<unknown>, cb: UnaryCb<unknown>): void {
      try {
        const concepts = ops.listConcepts().map((c) => ({
          id: c.id,
          title: c.title,
          genome_spec: JSON.stringify(c.genomeSpec),
          base_genome: JSON.stringify(c.baseGenome),
        }));
        cb(null, { concepts });
      } catch (err) {
        fail(cb, err);
      }
    },

    Render(
      call: UnaryCall<{ concept_id: string; genome?: string; prefix?: string }>,
      cb: UnaryCb<unknown>
    ): void {
      try {
        const { concept_id, genome, prefix } = call.request;
        cb(null, ops.render(concept_id, parseGenome(genome), prefix || undefined));
      } catch (err) {
        fail(cb, err);
      }
    },

    async Steer(
      call: UnaryCall<{ concept_id: string; genome?: string; prompt: string }>,
      cb: UnaryCb<unknown>
    ): Promise<void> {
      try {
        const { concept_id, genome, prompt } = call.request;
        const r = await ops.steer(concept_id, parseGenome(genome) ?? {}, prompt);
        cb(null, {
          genome: JSON.stringify(r.genome),
          svg: r.svg,
          rationale: r.rationale,
          source: r.source,
        });
      } catch (err) {
        fail(cb, err);
      }
    },

    Variations(
      call: UnaryCall<{
        concept_id: string;
        n?: number;
        seed?: number;
        anchor?: string;
        bias?: string;
        rate?: number;
      }>,
      cb: UnaryCb<unknown>
    ): void {
      try {
        const { concept_id, n, seed, anchor, bias, rate } = call.request;
        const r = ops.variations(concept_id, n || 6, {
          seed: seed || undefined,
          anchor: parseGenome(anchor),
          bias: bias ? (JSON.parse(bias) as Bias) : undefined,
          rate: rate || undefined,
        });
        cb(null, {
          genomes: r.genomes.map((g) => JSON.stringify(g)),
          svgs: r.svgs,
        });
      } catch (err) {
        fail(cb, err);
      }
    },

    async CreateConcept(
      call: UnaryCall<{ description: string }>,
      cb: UnaryCb<unknown>
    ): Promise<void> {
      try {
        const r = await ops.createConcept(call.request.description);
        cb(null, {
          concept_id: r.conceptId,
          title: r.title,
          svg: r.svg,
          source: r.source,
        });
      } catch (err) {
        fail(cb, err);
      }
    },

    ExportPng(
      call: UnaryCall<{ svg: string; width?: number; height?: number }>,
      cb: UnaryCb<unknown>
    ): void {
      try {
        const { svg, width, height } = call.request;
        const png = ops.exportPng(svg, width || undefined, height || undefined);
        cb(null, { png: Buffer.from(png) });
      } catch (err) {
        fail(cb, err);
      }
    },
  };
}

/** Load the proto and return the VectorCreate service definition + client ctor. */
export function loadVectorCreateProto() {
  const pkgDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const grpcObj = grpc.loadPackageDefinition(pkgDef) as unknown as {
    vector_create: { v1: { VectorCreate: grpc.ServiceClientConstructor } };
  };
  return grpcObj.vector_create.v1.VectorCreate;
}

/**
 * Construct (but do not start) a grpc.Server with the VectorCreate service
 * registered against the shared operations layer.
 */
export function createGrpcServer(ops: Operations): grpc.Server {
  const server = new grpc.Server();
  const VectorCreate = loadVectorCreateProto();
  server.addService(
    VectorCreate.service,
    createGrpcHandlers(ops) as grpc.UntypedServiceImplementation
  );
  return server;
}
