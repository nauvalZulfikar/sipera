#!/usr/bin/env bash
# Bootstrap sipera-rebuild lokal di mesin baru (Mac mini / Linux / Windows-bash).
# Setelah pnpm install + Docker Desktop jalan, script ini:
#   1. Up infra (postgres+redis+minio+mailhog)
#   2. Push schema Prisma
#   3. Generate Prisma client
#   4. Seed 5 user (1 warga + 4 dinas roles), password Masuk123@
#   5. Start 9 backend services + gateway + 2 frontends (background)
#   6. Smoke-test login per role
#
# Usage:  bash scripts/local-bootstrap.sh
# Stop:   bash scripts/local-stop.sh
#
# Requirements: docker, pnpm, node 20+

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DB_PORT=5532
DB_URL="postgresql://sipera:sipera_dev_pwd@localhost:${DB_PORT}/sipera?schema=public"
LOG="$ROOT/.logs"
mkdir -p "$LOG" "$ROOT/.storage" "$ROOT/.data"
[ -f "$ROOT/.data/settings.json" ] || echo '{}' > "$ROOT/.data/settings.json"

echo "[1/6] Up infra (postgres+redis+minio+mailhog)..."
docker compose -f infra/docker/docker-compose.dev.yml up -d >/dev/null

echo "[2/6] Wait for postgres..."
until docker exec sipera-rb-postgres pg_isready -U sipera -d sipera 2>/dev/null | grep -q accepting; do sleep 2; done

echo "[3/6] Prisma push schema..."
( cd packages/data-access && DATABASE_URL="$DB_URL" pnpm exec prisma db push --skip-generate --accept-data-loss >/dev/null )

echo "[4/6] Prisma generate client..."
( cd packages/data-access && DATABASE_URL="$DB_URL" pnpm exec prisma generate >/dev/null 2>&1 )

echo "[5/6] Seed 5 users (warga + 4 dinas roles)..."
HASH=$(node -e "const b=require('./apps/identity/node_modules/bcryptjs');console.log(b.hashSync('Masuk123@',10))")
docker exec -i sipera-rb-postgres psql -U sipera -d sipera -v ON_ERROR_STOP=1 <<SQL >/dev/null
INSERT INTO users (nama, no_telp, role, password, status, updated_at) VALUES
  ('Warga Test',     '081234567890', 'warga',    '$HASH', 'active', NOW()),
  ('Admin Dinas',    '081111111111', 'admin',    '$HASH', 'active', NOW()),
  ('Operator Dinas', '082222222222', 'operator', '$HASH', 'active', NOW()),
  ('Reviewer Dinas', '083333333333', 'reviewer', '$HASH', 'active', NOW()),
  ('Kabid Dinas',    '084444444444', 'kabid',    '$HASH', 'active', NOW())
ON CONFLICT (no_telp) DO UPDATE SET password=EXCLUDED.password, role=EXCLUDED.role;
SQL

echo "[6/6] Start services (background, logs in .logs/)..."
start_svc() {
  local name=$1 port=$2 svc=$3 extra=$4
  if lsof -i ":$port" 2>/dev/null | grep -q LISTEN || netstat -an 2>/dev/null | grep -E "LISTEN.*[.:]$port " >/dev/null; then
    echo "  - $name :$port already running, skip"
    return
  fi
  eval "$extra DATABASE_URL='$DB_URL' PORT=$port pnpm --filter @sipera/$svc start" > "$LOG/$name.log" 2>&1 &
  echo "  - $name :$port (pid $!)"
}

start_svc identity     4002 identity     "JWT_SECRET=dev-only-change-me"
start_svc master       4003 master       ""
start_svc document     4006 document     "STORAGE_ROOT='$ROOT/.storage'"
start_svc notification 4007 notification ""
start_svc spatial      4008 spatial      ""
start_svc permohonan   4009 permohonan   ""
start_svc reporting    4012 reporting    "PERMOHONAN_URL=http://localhost:4009"
start_svc admin        4013 admin        "SETTINGS_FILE='$ROOT/.data/settings.json'"
start_svc public-api   4018 public-api   "PERMOHONAN_URL=http://localhost:4009"

sleep 8

GATEWAY_PORT=5200 \
LEGACY_UPSTREAM_URL=http://localhost:3001 \
IDENTITY_UPSTREAM_URL=http://localhost:4002 \
MASTER_UPSTREAM_URL=http://localhost:4003 \
PERMOHONAN_UPSTREAM_URL=http://localhost:4009 \
SPATIAL_UPSTREAM_URL=http://localhost:4008 \
ROUTE_AUTH=new ROUTE_USERS=new ROUTE_WILAYAH=new ROUTE_KBLI=new ROUTE_KATEGORI_ZONA=new \
ROUTE_PERMOHONAN=new ROUTE_RDTR=new ROUTE_RTRW=new \
CORS_ORIGINS=http://localhost:5173,http://localhost:5174 \
  pnpm --filter @sipera/api-gateway start > "$LOG/gateway.log" 2>&1 &
echo "  - gateway :5200 (pid $!)"

VITE_API_URL=http://localhost:5200 pnpm --filter @sipera/frontend-warga dev --port 5173 --host > "$LOG/fe-warga.log" 2>&1 &
echo "  - fe-warga :5173 (pid $!)"
VITE_API_URL=http://localhost:5200 pnpm --filter @sipera/frontend-dinas dev --port 5174 --host > "$LOG/fe-dinas.log" 2>&1 &
echo "  - fe-dinas :5174 (pid $!)"

sleep 6
echo ""
echo "=== Smoke test login ==="
for hp in 081234567890 081111111111 082222222222 083333333333 084444444444; do
  printf "  %s → " "$hp"
  curl -s -m 5 -X POST http://localhost:5200/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"no_telp\":\"$hp\",\"password\":\"Masuk123@\"}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const r=JSON.parse(d);console.log(r.role?'OK ['+r.role+'] '+r.nama:'FAIL '+JSON.stringify(r))}catch{console.log('parse-err')}})"
done

echo ""
echo "================================================================"
echo "  Frontend warga:  http://localhost:5173/   (login 081234567890)"
echo "  Frontend dinas:  http://localhost:5174/   (login 081111111111)"
echo "  Gateway health:  http://localhost:5200/_health"
echo "  Password semua:  Masuk123@"
echo "================================================================"
echo "  Logs: tail -f .logs/*.log"
echo "  Stop: bash scripts/local-stop.sh"
echo "================================================================"
