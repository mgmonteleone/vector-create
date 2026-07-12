# Vector Create — Cloud Run image
# Single public HTTP port ($PORT): REST API + SPA.
# LLM runtime: auggie-v2 SEA binary (RPC mode) + AUGMENT_SESSION_AUTH env
# injected from Secret Manager at deploy time.

# ---- build ----
FROM oven/bun:1.3.14-debian AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/core/package.json packages/core/package.json
COPY packages/agent/package.json packages/agent/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/spa/package.json packages/spa/package.json
COPY proto proto
RUN bun install --frozen-lockfile

COPY packages packages
COPY AGENTS.md ./
ENV VITE_API_BASE=
RUN bun run --filter @vector-create/core build \
 && bun run --filter @vector-create/agent build \
 && bun run --filter @vector-create/server build \
 && bun run --filter @vector-create/spa build

# ---- runtime ----
FROM oven/bun:1.3.14-debian AS runtime
WORKDIR /app

# auggie-v2 SEA binary (public release; RPC mode + env-token auth).
# v1 `auggie` from npm is NOT usable headless (ACP-only, rejects token auth).
ARG AUGGIE_V2_VERSION=v1.0.46
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl libatomic1 \
 && rm -rf /var/lib/apt/lists/* \
 && curl -fsSL -o /tmp/auggie-v2.tgz \
      "https://github.com/augmentcode/auggie/releases/download/${AUGGIE_V2_VERSION}/auggie-v2-sea-linux-x64.tar.gz" \
 && mkdir -p /opt/auggie \
 && tar xzf /tmp/auggie-v2.tgz -C /opt/auggie \
 && rm /tmp/auggie-v2.tgz \
 && ln -sf /opt/auggie/auggie-v2 /usr/local/bin/auggie-v2 \
 && /usr/local/bin/auggie-v2 --version

COPY --from=build /app/package.json /app/bun.lock /app/
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/core /app/packages/core
COPY --from=build /app/packages/agent /app/packages/agent
COPY --from=build /app/packages/server /app/packages/server
COPY --from=build /app/packages/spa/dist /app/packages/spa/dist
COPY --from=build /app/proto /app/proto

ENV NODE_ENV=production \
    SERVE_SINGLE_PORT=1 \
    ENABLE_GRPC=0 \
    SPA_DIST=/app/packages/spa/dist \
    AUGGIE_COMMAND=auggie-v2 \
    PORT=8080

EXPOSE 8080
CMD ["bun", "run", "packages/server/src/main.ts"]
