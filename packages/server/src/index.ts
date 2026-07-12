/**
 * @vector-create/server — one service, three faces (REST, gRPC, MCP) over a
 * single shared operations layer. This entrypoint re-exports the operations
 * façade, the agent interface, and each face's factory so embedders can host
 * any subset in-process.
 */
export type { VectorAgentLike } from "./agent";
export { createAgent } from "./agent";
export {
  createGrpcHandlers,
  createGrpcServer,
  loadVectorCreateProto,
  PROTO_PATH,
} from "./faces/grpc";
export {
  createMcpServer,
  createStreamableHttpTransport,
  serveMcpStdio,
} from "./faces/mcp";
export { createRestApp } from "./faces/rest";
export type {
  ConceptSummary,
  CreateConceptResult,
  OperationsDeps,
  RenderResult,
  SteerResult,
  SvgRasterizer,
  VariationsOptions,
  VariationsResult,
} from "./operations";
export { Operations } from "./operations";
