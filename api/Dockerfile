FROM oven/bun:1.3.12-alpine

WORKDIR /app

USER root
RUN apk add --no-cache wget

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN chown -R bun:bun /app

USER bun

ENV NODE_ENV=production
ENV APP_ENV=production
ENV PORT=13100
ENV DB_PATH=/app/data/news.db

EXPOSE 13100

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:13100/health || exit 1

CMD ["bun", "run", "src/index.ts"]
