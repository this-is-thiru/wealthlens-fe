# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Build stage: install dependencies and compile the Angular app
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

# Angular project name (angular.json -> projects.<name>); output goes to dist/<name>/browser
ARG APP_NAME=wealthlens
# Angular build configuration: production | development | staging | testing
ARG BUILD_CONFIG=production

WORKDIR /app

# Install dependencies first so this layer is cached until the lockfile changes
COPY package.json package-lock.json ./
# --ignore-scripts: no dependency lifecycle scripts; native deps ship prebuilt binaries
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY . .
# Use the project's own Angular CLI via the "build" script (npx could fetch packages on demand)
RUN npm run build -- --configuration="${BUILD_CONFIG}" \
 && test -f "dist/${APP_NAME}/browser/index.html"

# ---------------------------------------------------------------------------
# Runtime stage: static files served by unprivileged nginx on port 8080
# ---------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime

ARG APP_NAME=wealthlens

COPY nginx.conf /etc/nginx/conf.d/default.conf
# Owned by root (read-only for the nginx user) so the running server can't modify the site
COPY --from=build /app/dist/${APP_NAME}/browser/ /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1

# Base image already runs as the non-root "nginx" user with `nginx -g 'daemon off;'`
