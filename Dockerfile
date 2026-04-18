# syntax=docker/dockerfile:1.7

FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1-alpine AS runner
WORKDIR /app

USER root
RUN apk add --no-cache wget

ENV NODE_ENV=production
ENV PORT=13100
ENV DB_PATH=/app/data/news.db

COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock* bunfig.toml tsconfig.json ./
COPY src ./src

RUN mkdir -p /app/data && chown -R bun:bun /app

USER bun

EXPOSE 13100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:13100/health || exit 1

CMD ["bun", "run", "src/index.ts"]
