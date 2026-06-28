# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies first so this layer caches until package.json changes.
COPY package.json package-lock.json ./
RUN npm ci

# VITE_* vars are embedded into the client bundle at build time.
# Pass them as build args: docker build --build-arg VITE_SUPABASE_URL=...
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

COPY . .
RUN npm run build

# ── Stage 2: Runtime ────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Copy only the nitro output — no source, no node_modules needed at runtime.
COPY --from=builder /app/.output ./.output

ENV NODE_ENV=production
# Cloud Run injects PORT=8080; nitro node-server respects it automatically.
ENV PORT=8080
EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]
