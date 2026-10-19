#!/usr/bin/env bash
# Run a command inside a throwaway node:24 container with this project mounted.
# node_modules lives in the named docker volume "famf_node_modules" so the host tree stays clean.
# Usage: scripts/node-run.sh npx vitest run
set -euo pipefail
cd "$(dirname "$0")/.."

UID_GID="$(id -u):$(id -g)"
VOLUME=famf_node_modules

if ! docker volume inspect "$VOLUME" >/dev/null 2>&1; then
  docker volume create "$VOLUME" >/dev/null
  docker run --rm -v "$VOLUME":/m alpine chown "$UID_GID" /m
fi

exec docker run --rm -t \
  --user "$UID_GID" \
  -e HOME=/tmp \
  -e npm_config_cache=/tmp/.npm \
  -v "$PWD":/app \
  -v "$VOLUME":/app/node_modules \
  -w /app \
  node:24-alpine \
  sh -c 'if [ ! -f node_modules/.package-lock.json ]; then npm ci --ignore-scripts --no-audit --no-fund; fi; exec "$@"' sh "$@"
