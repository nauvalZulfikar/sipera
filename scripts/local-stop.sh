#!/usr/bin/env bash
# Stop semua process sipera lokal + tear down infra docker.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Killing node/tsx/vite processes on sipera ports..."
for port in 4002 4003 4006 4007 4008 4009 4012 4013 4018 5173 5174 5200; do
  pid=$(lsof -ti ":$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "  :$port → kill $pid"
    kill "$pid" 2>/dev/null || true
  fi
done

echo "Down infra..."
docker compose -f infra/docker/docker-compose.dev.yml down

echo "Done. Run scripts/local-bootstrap.sh untuk start lagi."
