#!/bin/bash
# Run all 8 backend services + gateway + 2 frontends NATIVELY (no Docker).
# Faster iteration than docker-compose.full.yml for dev.
# Usage: bash scripts/run-all-native.sh
#
# Required: pnpm install sudah selesai + postgres lokal (atau pakai infra/docker/docker-compose.dev.yml)

set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
LOGDIR="$ROOT/.logs"
mkdir -p "$LOGDIR"

DATABASE_URL="${DATABASE_URL:-postgresql://gsbandung:gsbandung123@localhost:5442/geoportal}"

PIDS=()
trap 'echo "Stopping..."; for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null; done; exit 0' INT TERM

start() {
  local name=$1 cmd=$2 port=$3
  echo "[start] $name on :$port"
  bash -c "cd $ROOT && $cmd" > "$LOGDIR/$name.log" 2>&1 &
  PIDS+=($!)
}

DATABASE_URL=$DATABASE_URL \
  JWT_SECRET=dev-only-change-me \
  PORT=4002 \
  start identity "npx pnpm --filter @sipera/identity start" 4002

DATABASE_URL=$DATABASE_URL \
  PORT=4003 \
  start master "npx pnpm --filter @sipera/master start" 4003

PORT=4006 STORAGE_ROOT=$ROOT/.storage \
  start document "npx pnpm --filter @sipera/document start" 4006

PORT=4007 \
  start notification "npx pnpm --filter @sipera/notification start" 4007

PORT=4008 \
  start spatial "npx pnpm --filter @sipera/spatial start" 4008

PORT=4009 \
  start permohonan "npx pnpm --filter @sipera/permohonan start" 4009

PORT=4012 PERMOHONAN_URL=http://localhost:4009 \
  start reporting "npx pnpm --filter @sipera/reporting start" 4012

PORT=4013 SETTINGS_FILE=$ROOT/.data/settings.json \
  start admin "npx pnpm --filter @sipera/admin start" 4013

PORT=4018 PERMOHONAN_URL=http://localhost:4009 \
  start public-api "npx pnpm --filter @sipera/public-api start" 4018

GATEWAY_PORT=5200 \
  LEGACY_UPSTREAM_URL=http://localhost:3001 \
  IDENTITY_UPSTREAM_URL=http://localhost:4002 \
  MASTER_UPSTREAM_URL=http://localhost:4003 \
  PERMOHONAN_UPSTREAM_URL=http://localhost:4009 \
  SPATIAL_UPSTREAM_URL=http://localhost:4008 \
  ROUTE_AUTH=new ROUTE_USERS=new ROUTE_WILAYAH=new ROUTE_KBLI=new ROUTE_KATEGORI_ZONA=new \
  ROUTE_PERMOHONAN=new ROUTE_RDTR=new ROUTE_RTRW=new \
  CORS_ORIGINS=http://localhost:5173,http://localhost:5174 \
  start gateway "npx pnpm --filter @sipera/api-gateway start" 5200

echo ""
echo "All services starting. Tail logs at $LOGDIR/*.log"
echo "Frontends:  pnpm --filter @sipera/frontend-warga dev   (port 5173)"
echo "            pnpm --filter @sipera/frontend-dinas dev   (port 5174)"
echo ""
echo "Press Ctrl+C to stop all."
wait
