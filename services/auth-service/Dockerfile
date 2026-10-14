FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
USER node
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src ./src

EXPOSE 5001
CMD ["node", "src/index.js"]
