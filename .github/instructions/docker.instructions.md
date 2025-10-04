---
applyTo: "Dockerfile*"
description: "Docker and containerization best practices"
---

# Docker Guidelines

## Dockerfile Best Practices

```dockerfile
# ✅ Use specific version tags
FROM node:20.18.1-slim AS base

# ✅ Set working directory early
WORKDIR /app

# ✅ Multi-stage builds for smaller images
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    pnpm install --frozen-lockfile --prod

FROM base AS builder
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

# ✅ Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
USER nextjs

# ✅ Expose port
EXPOSE 3000

# ✅ Use exec form for CMD
CMD ["node_modules/.bin/next", "start"]
```

## Layer Optimization

```dockerfile
# ✅ Order layers from least to most frequently changing
FROM node:20-slim

# 1. Install system dependencies (rarely changes)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# 2. Copy package files (changes occasionally)
COPY package.json pnpm-lock.yaml ./

# 3. Install dependencies (changes occasionally)
RUN pnpm install --frozen-lockfile

# 4. Copy source code (changes frequently)
COPY . .

# 5. Build (changes frequently)
RUN pnpm build
```

## Security

```dockerfile
# ✅ Use minimal base images
FROM node:20-alpine

# ✅ Don't run as root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# ✅ Use COPY instead of ADD
COPY --chown=appuser:appgroup . .

# ✅ Don't expose secrets
# ❌ Bad
ENV API_KEY=secret123
# ✅ Good - use build args or runtime env
ARG BUILD_ENV
ENV NODE_ENV=${BUILD_ENV}

# ✅ Scan for vulnerabilities
# Run: docker scan <image-name>
```

## .dockerignore

```gitignore
# ✅ Comprehensive .dockerignore
node_modules
npm-debug.log
.next
out
dist
build
coverage
.git
.gitignore
.env*
!.env.example
.vscode
.idea
*.md
!README.md
Dockerfile*
docker-compose*
.dockerignore
.DS_Store
*.log
.firebase
```

## Health Checks

```dockerfile
# ✅ Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# healthcheck.js
const http = require('http');

const options = {
  host: 'localhost',
  port: 3000,
  path: '/api/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', () => process.exit(1));
request.end();
```

## Docker Compose

```yaml
# ✅ Docker Compose for development
version: "3.8"

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_ENV=development
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
    env_file:
      - .env.local
    depends_on:
      - firebase-emulator
    networks:
      - app-network

  firebase-emulator:
    image: node:20-slim
    working_dir: /app
    command: npx firebase emulators:start
    ports:
      - "4000:4000" # Emulator UI
      - "8080:8080" # Firestore
      - "9099:9099" # Auth
      - "9199:9199" # Storage
    volumes:
      - .:/app
      - firebase-data:/app/.firebase
    networks:
      - app-network

volumes:
  firebase-data:

networks:
  app-network:
    driver: bridge
```

## Build Arguments

```dockerfile
# ✅ Use build arguments for flexibility
ARG NODE_VERSION=20
ARG PNPM_VERSION=9.12.3

FROM node:${NODE_VERSION}-slim

RUN corepack enable && \
    corepack prepare pnpm@${PNPM_VERSION} --activate

ARG BUILD_ENV=production
ENV NODE_ENV=${BUILD_ENV}

# Build with: docker build --build-arg NODE_VERSION=22 .
```

## Environment Variables

```dockerfile
# ✅ Document required environment variables
ENV PORT=3000 \
    NODE_ENV=production \
    # Firebase configuration
    NEXT_PUBLIC_FIREBASE_API_KEY="" \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="" \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="" \
    # App configuration
    NEXT_PUBLIC_APP_URL=""

# ✅ Validate required env vars at runtime
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
```

## Entrypoint Script

```bash
#!/usr/bin/env bash
# docker-entrypoint.sh

set -euo pipefail

# ✅ Validate required environment variables
required_vars=(
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  "NEXT_PUBLIC_FIREBASE_API_KEY"
)

for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌ Required environment variable ${var} is not set"
    exit 1
  fi
done

echo "✅ Environment validation passed"

# ✅ Run migrations or setup if needed
if [[ "${RUN_MIGRATIONS:-false}" == "true" ]]; then
  echo "🔧 Running migrations..."
  pnpm run migrate
fi

# ✅ Execute the main command
exec "$@"
```

## Image Size Optimization

```dockerfile
# ✅ Use alpine base images
FROM node:20-alpine

# ✅ Clean up in same layer
RUN apk add --no-cache python3 make g++ && \
    pnpm install && \
    apk del python3 make g++

# ✅ Remove unnecessary files
RUN rm -rf \
    /tmp/* \
    /var/cache/apk/* \
    ~/.npm \
    ~/.pnpm-store

# ✅ Use .dockerignore to exclude files
```

## CI/CD Integration

```yaml
# GitHub Actions example
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NODE_VERSION=20
            BUILD_ENV=production
```

## Testing Docker Images

```bash
#!/usr/bin/env bash
# test-docker.sh

set -euo pipefail

echo "🔧 Building Docker image..."
docker build -t scheduler-test:latest .

echo "🔧 Running security scan..."
docker scan scheduler-test:latest || true

echo "🔧 Testing image size..."
size=$(docker images scheduler-test:latest --format "{{.Size}}")
echo "Image size: ${size}"

echo "🔧 Starting container..."
container_id=$(docker run -d -p 3000:3000 scheduler-test:latest)

echo "⏳ Waiting for app to start..."
sleep 5

echo "🔧 Testing health endpoint..."
if curl -f http://localhost:3000/api/health; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    docker logs "${container_id}"
    exit 1
fi

echo "🔧 Cleaning up..."
docker stop "${container_id}"
docker rm "${container_id}"

echo "✅ All Docker tests passed"
```

## Best Practices Checklist

- [ ] Use specific version tags for base images
- [ ] Implement multi-stage builds
- [ ] Run as non-root user
- [ ] Use .dockerignore file
- [ ] Order layers for optimal caching
- [ ] Add health checks
- [ ] Document required environment variables
- [ ] Validate env vars in entrypoint
- [ ] Keep images small (use alpine when possible)
- [ ] Scan images for vulnerabilities
- [ ] Use BuildKit for better performance
- [ ] Implement proper logging
- [ ] Tag images with version and SHA
