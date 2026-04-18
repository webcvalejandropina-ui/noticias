FROM node:20.20.2-alpine

WORKDIR /app

RUN apk add --no-cache wget

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && chown -R node:node /app

COPY --chown=node:node dist ./dist

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:4321/ || exit 1

USER node
CMD ["node", "./dist/server/entry.mjs"]
