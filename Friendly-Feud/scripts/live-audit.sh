#!/usr/bin/env bash
# Drive a real game on the deployed site (default https://m0usetrap.ee) and save screenshots to e2e/live/screens.
# Creates two live rooms (they expire after 24 h). Usage: scripts/live-audit.sh [base-url]
set -euo pipefail
cd "$(dirname "$0")/.."

UID_GID="$(id -u):$(id -g)"
VOLUME=famf_node_modules_pw

exec docker run --rm --network host --ipc=host \
  --user "$UID_GID" \
  -e HOME=/tmp \
  -e AUDIT_BASE_URL="${1:-https://m0usetrap.ee}" \
  -v "$PWD":/app \
  -v "$VOLUME":/app/node_modules \
  -w /app \
  mcr.microsoft.com/playwright:v1.57.0-noble \
  node e2e/live/audit.mjs
