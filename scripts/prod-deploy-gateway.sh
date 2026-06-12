#!/usr/bin/env bash
# Deploy the api-gateway fix (spatial /zona, /rdtr strip, /reports route).
# Run ON the server AFTER CI has pushed a new api-gateway:latest to GHCR.
#   1. Patch gateway env: add REPORTING_UPSTREAM_URL + ROUTE_REPORTS (idempotent)
#   2. Pull latest gateway image
#   3. Recreate gateway container
#   4. Print live /_routes
set -euo pipefail
cd /root/projects/sipera/infra/docker

echo "[1/4] patch gateway env (reporting upstream + route flag)..."
python3 - <<'PY'
f = "docker-compose.prod.yml"
s = open(f).read()
if "ROUTE_REPORTS:" in s:
    print("    env already present → skip"); raise SystemExit(0)
needle = "      ROUTE_RTRW: new\n"
assert needle in s, "gateway ROUTE_RTRW line not found"
add = needle + "      ROUTE_REPORTS: new\n      REPORTING_UPSTREAM_URL: http://reporting:4012\n"
open(f, "w").write(s.replace(needle, add, 1))
print("    added ROUTE_REPORTS + REPORTING_UPSTREAM_URL")
PY

echo "[2/4] pull latest gateway image..."
docker compose -f docker-compose.prod.yml --env-file .env pull gateway

echo "[3/4] recreate gateway..."
docker compose -f docker-compose.prod.yml --env-file .env up -d gateway
sleep 5

echo "[4/4] live routes:"
docker exec sipera-gateway wget -qO- http://localhost:5200/_routes 2>/dev/null \
  || curl -s http://localhost:5200/_routes 2>/dev/null \
  || echo "(routes endpoint check skipped)"
echo
echo "DONE-GATEWAY-DEPLOY"
