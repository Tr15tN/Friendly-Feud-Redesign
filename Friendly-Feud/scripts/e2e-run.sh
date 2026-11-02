#!/usr/bin/env bash
# Run the Playwright suite in the official Playwright image against the live-reload dev stack
# (start it first with: make local-dev docker_registry=local).
# Usage: scripts/e2e-run.sh [playwright args, e.g. tests/buzzer.spec.ts]
set -euo pipefail
cd "$(dirname "$0")/.."

UID_GID="$(id -u):$(id -g)"
VOLUME=famf_node_modules_pw
BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:8082}"

if ! docker volume inspect "$VOLUME" >/dev/null 2>&1; then
  docker volume create "$VOLUME" >/dev/null
  docker run --rm -v "$VOLUME":/m alpine chown "$UID_GID" /m
fi

exec docker run --rm --network host --ipc=host \
  --user "$UID_GID" \
  -e HOME=/tmp \
  -e npm_config_cache=/tmp/.npm \
  -e PLAYWRIGHT_BASE_URL="$BASE_URL" \
  -e DEMO_SHOTS \
  -v "$PWD":/app \
  -v "$VOLUME":/app/node_modules \
  -w /app \
  mcr.microsoft.com/playwright:v1.57.0-noble \
  sh -c 'if [ ! -f node_modules/.package-lock.json ]; then npm ci --ignore-scripts --no-audit --no-fund; fi; cd e2e && exec npx playwright test --config playwright.config.ts "$@"' sh "$@"
