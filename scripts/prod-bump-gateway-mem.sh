#!/usr/bin/env bash
# Gateway runs via tsx (memory-hungry) but inherits the 120m anchor → OOM (exit 137) crash-loop.
# Bump to 512m and recreate.
set -euo pipefail
cd /root/projects/sipera/infra/docker

python3 - <<'PY'
f = "docker-compose.prod.yml"
s = open(f).read()
needle = "    container_name: sipera-gateway\n"
if "    container_name: sipera-gateway\n    mem_limit:" in s:
    print("already patched"); raise SystemExit(0)
assert needle in s, "gateway container_name line not found"
override = needle + "    mem_limit: 512m\n    memswap_limit: 512m\n"
open(f, "w").write(s.replace(needle, override, 1))
print("patched: gateway mem_limit 120m -> 512m")
PY

echo "--- recreating gateway ---"
docker compose -f docker-compose.prod.yml --env-file .env up -d gateway
echo "--- waiting 12s for stability ---"
sleep 12
echo "--- status + last logs ---"
docker ps --format '{{.Names}} | {{.Status}}' | grep gateway
docker logs --tail 6 sipera-gateway 2>&1
echo "DONE-GW-MEM"
