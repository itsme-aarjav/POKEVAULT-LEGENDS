# ==============================================================================
# POKÉVAULT LEGENDS — MULTI-STAGE PRODUCTION DOCKERFILE
# Stage 1: Build Frontend Artifacts (Vite)
# Stage 2: Lean Production Runtime (Node.js Express + Static Dist)
# ==============================================================================

# ─── STAGE 1: BUILD ENVIRONMENT ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Build multi-page Vite production bundle into dist/
RUN npm run build

# ─── STAGE 2: PRODUCTION RUNTIME ────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5001
ENV HOST=0.0.0.0

# Install curl for container health check
RUN apk add --no-cache curl

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built frontend assets and server application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/src ./src
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/favicon.ico ./favicon.ico

# Security Best Practice: Run as non-root user
USER node

# Expose Express server port
EXPOSE 5001

# Liveness & Readiness Healthcheck
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5001/api/health || exit 1

# Start production server
CMD ["node", "server/index.js"]
