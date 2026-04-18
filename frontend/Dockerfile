# syntax=docker/dockerfile:1.6

############################################################
# Stage 1 — Dependencies locked by pnpm-lock.yaml
############################################################
FROM node:24-alpine AS deps

WORKDIR /app

ENV ASTRO_TELEMETRY_DISABLED=1
ENV PNPM_CONFIG_UPDATE_NOTIFIER=false

RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

############################################################
# Stage 2 — Build (SSR bundle)
############################################################
FROM deps AS builder

COPY tsconfig.json astro.config.mjs ./
COPY public ./public
COPY src ./src

RUN pnpm build

############################################################
# Stage 3 — Runtime
############################################################
FROM node:24-alpine AS runner

WORKDIR /app

RUN apk add --no-cache wget

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN addgroup -S astro && adduser -S astro -G astro \
    && chown -R astro:astro /app
USER astro

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:4321/ || exit 1

CMD ["node", "./dist/server/entry.mjs"]
