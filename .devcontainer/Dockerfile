FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Install minimal tooling and ensure corepack and pnpm are available
USER root
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

# Enable corepack and prepare pnpm for the image (non-fatal)
RUN corepack enable || true
RUN corepack prepare pnpm@9 --activate || true

# Install firebase-tools globally so postCreate can use it
RUN npm install -g firebase-tools --no-audit --no-fund || true

USER node
