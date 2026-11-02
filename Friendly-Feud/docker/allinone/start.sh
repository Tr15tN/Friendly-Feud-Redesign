#!/usr/bin/env bash
set -o pipefail
set -e

FAMF_STORE=${FAMF_STORE:-memory}

cd /app

# The image already contains a production build; only rebuild if it is missing.
if [ ! -f .next/BUILD_ID ]; then
  npm run build
fi
./Cold-Friendly-Feud --game_store "$FAMF_STORE" &
nginx -g 'daemon off;' &
npm run start &

wait -n
