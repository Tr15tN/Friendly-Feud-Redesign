#!/usr/bin/env bash
# Run a Go command for the backend inside a throwaway golang container (no Go needed on the host).
# Module and build caches live in named docker volumes.
# Usage: scripts/go-run.sh go test ./api/...
set -euo pipefail
cd "$(dirname "$0")/../backend"

exec docker run --rm -t \
  -e CGO_ENABLED=1 \
  -v "$PWD":/src \
  -v famf_go_mod:/go/pkg/mod \
  -v famf_go_build:/root/.cache/go-build \
  -w /src \
  golang:1.25-alpine \
  sh -c 'apk add --no-cache gcc musl-dev >/dev/null 2>&1; exec "$@"' sh "$@"
