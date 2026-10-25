# syntax=docker/dockerfile:1

# --- build: install everything, test the engine, build the web app -------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm test && npm run build

# --- runtime: just the server and the built files ----------------------------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
RUN npm ci --omit=dev --workspace @poker/server --no-audit --no-fund && npm cache clean --force
COPY apps/server/server.js apps/server/
COPY --from=build /app/apps/web/dist apps/web/dist
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "apps/server/server.js"]
