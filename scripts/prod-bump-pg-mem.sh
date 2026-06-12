#!/usr/bin/env bash
# Raise postgres container memory so PostGIS can load (was 120m → OOM-killed on CREATE EXTENSION postgis).
# Safe: DB has no tables yet; backup taken; only postgres is recreated.
set -euo pipefail
cd /root/projects/sipera/infra/docker

cp -n docker-compose.prod.yml docker-compose.prod.yml.bak || true

python3 - <<'PY'
f = "docker-compose.prod.yml"
s = open(f).read()
needle = "    container_name: sipera-pg\n"
if "mem_limit: 1g" in s:
    print("already patched"); raise SystemExit(0)
assert needle in s, "postgres container_name line not found"
override = needle + "    mem_limit: 1g\n    memswap_limit: 1g\n    cpus: 0.5\n    shm_size: 256m\n"
open(f, "w").write(s.replace(needle, override, 1))
print("patched compose: postgres mem_limit 120m -> 1g")
PY

echo "--- recreating postgres with new limits ---"
docker compose -f docker-compose.prod.yml --env-file .env up -d postgres
echo "--- waiting for healthy ---"
for i in $(seq 1 20); do
  st=$(docker inspect -f '{{.State.Health.Status}}' sipera-pg 2>/dev/null || echo none)
  echo "  health=$st"
  [ "$st" = "healthy" ] && break
  sleep 3
done
echo "--- new mem limit (bytes) ---"
docker inspect sipera-pg --format '{{.HostConfig.Memory}}'
echo "DONE-BUMP"
