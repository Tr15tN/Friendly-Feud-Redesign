#!/usr/bin/env bash
# Build the image on this machine and send it to the server (the e2-micro is too small to build Next.js).
# Usage: deploy/ship.sh user@server-ip [domain]
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:?usage: deploy/ship.sh user@server-ip [domain]}"
DOMAIN="${2:-m0usetrap.ee}"
IMAGE=famf-feud:latest

docker build -f Dockerfile.allinone \
  --build-arg NEXT_PUBLIC_TITLE_URL="$DOMAIN" \
  --build-arg NEXT_PUBLIC_APP_VERSION="$(git rev-parse --short HEAD 2>/dev/null || echo dev)" \
  -t "$IMAGE" .

ssh "$TARGET" 'mkdir -p ~/feud/data'
scp deploy/docker-compose.prod.yml deploy/Caddyfile "$TARGET":~/feud/
docker save "$IMAGE" | gzip | ssh "$TARGET" 'gunzip | docker load'
ssh "$TARGET" 'cd ~/feud && test -f .env || { echo "Missing ~/feud/.env (copy deploy/.env.example)"; exit 1; }; docker compose -f docker-compose.prod.yml --env-file .env up -d'
echo "Deployed. Check https://$DOMAIN/api/health"
