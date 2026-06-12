#!/usr/bin/env bash
# Reporting service (tsx) OOMs at 120m (exit 137) on request handling → ECONNRESET to gateway
# → /reports/export.csv 500. Bump to 512m and recreate.
set -euo pipefail
cd /root/projects/sipera/infra/docker

python3 - <<'PY'
f = "docker-compose.prod.yml"
s = open(f).read()
needle = "    container_name: sipera-reporting\n"
if "    container_name: sipera-reporting\n    mem_limit:" in s:
    print("already patched"); raise SystemExit(0)
assert needle in s, "reporting container_name line not found"
open(f, "w").write(s.replace(needle, needle + "    mem_limit: 512m\n    memswap_limit: 512m\n", 1))
print("patched: reporting mem_limit 120m -> 512m")
PY

echo "--- recreating reporting ---"
docker compose -f docker-compose.prod.yml --env-file .env up -d reporting
sleep 10
docker ps --format '{{.Names}} | {{.Status}}' | grep reporting
docker inspect -f 'restarts={{.RestartCount}}' sipera-reporting
echo "DONE-RPT-MEM"
