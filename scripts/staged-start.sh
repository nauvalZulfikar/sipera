#!/bin/bash
# Staged startup — spin up containers bertahap supaya gak OOM di VPS shared.
# Total 14 container. Start 3 batch dengan jeda + memory limit.

set -euo pipefail
cd "$(dirname "$0")/.."
ENV_FILE=infra/docker/.env
COMPOSE="docker compose --env-file $ENV_FILE -f infra/docker/docker-compose.prod.yml"

echo "[batch 1/4] Infra (postgres + redis)"
$COMPOSE up -d postgres redis
echo "  → wait 15s for DB healthy..."
sleep 15

echo "[batch 2/4] Core services (identity + master + spatial)"
$COMPOSE up -d identity master spatial
sleep 10

echo "[batch 3/4] Workflow services (permohonan + document + notification + admin)"
$COMPOSE up -d permohonan document notification admin
sleep 10

echo "[batch 4/4] Edge services (reporting + public-api + gateway + frontends)"
$COMPOSE up -d reporting public-api gateway frontend-warga frontend-dinas
sleep 5

echo ""
echo "=== STATUS ==="
$COMPOSE ps
echo ""
echo "=== MEMORY ==="
free -h | head -2
echo ""
echo "Done. Test: curl -I https://sipera.aureonforge.com"
