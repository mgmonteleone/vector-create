/**
 * REST client for the vector-create server. Codes to the documented shapes
 * under /api (see the brief); exact shapes are reconciled with the server
 * package at integration. Base URL defaults to same-origin (empty string) in
 * production, and http://localhost:8787 in Vite dev. Overridable via VITE_API_BASE.
 *
 * Every method throws on network/HTTP failure so callers can fall back to the
 * client-side core.render preview and surface a terminal-styled error.
 */
import type {
  ConceptSummary,
  CreateConceptResult,
  Genome,
  SteerResult,
  VariationsResult,
} from "./types";

export const API_BASE: string =
  (import.meta.env?.VITE_API_BASE as string | undefined) ??
  (import.meta.env?.DEV ? "http://localhost:8787" : "");

/** True LLM agent availability as reported by the server. */
export type AgentStatus = { available: boolean; mode: string };

/** Thrown when a server call fails — callers treat this as "degrade to client". */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch (cause) {
    throw new ApiError(`network error: ${String((cause as Error)?.message ?? cause)}`);
  }
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status} on ${path}`, res.status);
  }
  return (await res.json()) as T;
}

/** GET /api/concepts -> { concepts: [{ id, title, genomeSpec, baseGenome }] }. */
export async function listConcepts(): Promise<ConceptSummary[]> {
  const body = await requestJson<{ concepts: ConceptSummary[] }>("/api/concepts");
  return body.concepts;
}

/** POST /api/render { conceptId, genome, prefix } -> { svg }. */
export function render(
  conceptId: string,
  genome: Genome,
  prefix?: string
): Promise<{ svg: string }> {
  return requestJson<{ svg: string }>("/api/render", {
    method: "POST",
    body: JSON.stringify({ conceptId, genome, prefix }),
  });
}

/** POST /api/steer { conceptId, genome, prompt } -> SteerResult. */
export function steer(conceptId: string, genome: Genome, prompt: string): Promise<SteerResult> {
  return requestJson<SteerResult>("/api/steer", {
    method: "POST",
    body: JSON.stringify({ conceptId, genome, prompt }),
  });
}

/** POST /api/variations { conceptId, n, seed?, anchor? } -> VariationsResult. */
export function variations(
  conceptId: string,
  n: number,
  opts: { seed?: number; anchor?: Genome } = {}
): Promise<VariationsResult> {
  return requestJson<VariationsResult>("/api/variations", {
    method: "POST",
    body: JSON.stringify({ conceptId, n, ...opts }),
  });
}

/** POST /api/concepts { description } -> CreateConceptResult. */
export function createConcept(description: string): Promise<CreateConceptResult> {
  return requestJson<CreateConceptResult>("/api/concepts", {
    method: "POST",
    body: JSON.stringify({ description }),
  });
}

/** POST /api/export/png { svg, width?, height? } -> image/png blob. */
export async function exportPng(svg: string, width?: number, height?: number): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/export/png`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ svg, width, height }),
    });
  } catch (cause) {
    throw new ApiError(`network error: ${String((cause as Error)?.message ?? cause)}`);
  }
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status} on /api/export/png`, res.status);
  }
  return await res.blob();
}

/** Cheap reachability probe. Resolves true if the server answers /api/concepts. */
export async function ping(): Promise<boolean> {
  try {
    await listConcepts();
    return true;
  } catch {
    return false;
  }
}

/** GET /api/agent/status — whether auggie/LLM is live vs heuristic-only. */
export async function agentStatus(): Promise<AgentStatus> {
  return requestJson<AgentStatus>("/api/agent/status");
}
