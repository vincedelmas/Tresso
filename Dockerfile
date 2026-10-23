ARG BUN_VERSION=1.4.4
FROM oven/bun:${BUN_VERSION} AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .


ARG VITE_BASE_URL
RUN test -n "$VITE_BASE_URL"
RUN mkdir -p /tmp/build-db && \
    VITE_BASE_URL="$VITE_BASE_URL" \
    DATABASE_URL=/tmp/build-db/site.db \
    SKIP_ENV_VALIDATION=true \
    BETTER_AUTH_SECRET=build-only-not-a-runtime-secret \
    GOOGLE_CLIENT_ID=build-only-placeholder \
    GOOGLE_CLIENT_SECRET=build-only-placeholder \
    bun run build


FROM oven/bun:${BUN_VERSION} AS runtime
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL=/data/db/site.db \
    BASE_UPLOADS_LOCATION=/data/images


COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/dist ./dist
COPY --chown=bun:bun package.json bun.lock server.ts drizzle.config.ts tsconfig.json ./
COPY --chown=bun:bun src ./src
COPY --chown=bun:bun drizzle ./drizzle
COPY --chown=bun:bun public ./public
RUN mkdir -p /data/db /data/images && chown -R bun:bun /data
USER bun
EXPOSE 3000


CMD ["bun", "server.ts"]
