# ── Stage 1: build ───────────────────────────────────────────
FROM oven/bun:1.3-alpine AS builder

WORKDIR /app

# Copy manifests first for layer caching
COPY package.json bun.lock* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY web/package.json ./web/
COPY e2e/package.json ./e2e/

RUN bun install --frozen-lockfile

# Copy full source
COPY . .

# Generate Prisma client
RUN cd server && bunx prisma generate

# Build Vite frontend
RUN bun run --cwd web build

# ── Stage 2: production image ─────────────────────────────────
FROM oven/bun:1.3-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Only copy what the server needs at runtime
COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server ./server
COPY --from=builder /app/web/dist ./web/dist

# Install production deps only (skips devDependencies)
RUN bun install --frozen-lockfile --production

EXPOSE 4000

# Run migrations then start the server
CMD ["sh", "-c", "cd server && bunx prisma migrate deploy && bun src/index.ts"]
