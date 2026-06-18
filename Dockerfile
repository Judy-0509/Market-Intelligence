# syntax=docker/dockerfile:1
# Market Intelligence — Next.js (App Router) full-stack, standalone output.

# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    CONTENT_DIR=/app/content/reports

# Run as the unprivileged "node" user that ships with the base image.
# Standalone build: minimal server + only the production deps it needs.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Ship the default reports; mount a volume here to add your own .md files.
COPY --from=builder --chown=node:node /app/content ./content

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=8s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
