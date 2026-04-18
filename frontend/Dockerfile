# syntax=docker/dockerfile:1.6

############################################################
# Stage 1 — Build (SSR bundle)
############################################################
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json astro.config.mjs ./
COPY public ./public
COPY src ./src

RUN npm run build

############################################################
# Stage 2 — Runtime
############################################################
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache wget

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist

RUN addgroup -S astro && adduser -S astro -G astro \
    && chown -R astro:astro /app
USER astro

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:4321/ || exit 1

CMD ["node", "./dist/server/entry.mjs"]
