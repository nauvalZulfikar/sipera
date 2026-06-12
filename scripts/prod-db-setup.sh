#!/usr/bin/env bash
# One-shot prod DB bootstrap for sipera (NEW server 72.61.101.167).
# Creates schema (prisma db push) + seeds 5 demo users. DB is empty → safe.
# Run ON the server:  bash /root/projects/sipera/scripts/prod-db-setup.sh
set -euo pipefail
cd /root/projects/sipera

PW=$(grep ^POSTGRES_PASSWORD= infra/docker/.env | cut -d= -f2)
PG=$(docker ps --format '{{.Names}}' | grep -iE 'pg|postgres|postgis' | head -1)
NET=$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$PG" | awk '{print $1}')
echo "[i] postgres container=$PG  network=$NET"

echo "[1/3] generate schema SQL offline + apply via psql..."
docker run --rm \
  -v "$PWD/packages/data-access:/da" -w /da \
  node:20 sh -c "npx -y prisma@5.22.0 migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script" \
  > /tmp/sipera-schema.sql
echo "    generated $(wc -l < /tmp/sipera-schema.sql) lines of SQL"
docker exec -i "$PG" psql -U sipera -d sipera -v ON_ERROR_STOP=1 < /tmp/sipera-schema.sql

echo "[2/3] compute bcrypt hash for Masuk123@ ..."
HASH=$(docker run --rm node:20-slim sh -c "npm i -s bcryptjs@2 >/dev/null 2>&1 && node -e \"console.log(require('bcryptjs').hashSync('Masuk123@',10))\"")
echo "    hash=${HASH:0:12}..."

echo "[3/3] seed 5 users (1 warga + 4 dinas)..."
docker exec -i "$PG" psql -U sipera -d sipera -v ON_ERROR_STOP=1 <<SQL
INSERT INTO users (nama, no_telp, role, password, status, updated_at) VALUES
  ('Warga Test',     '081234567890', 'warga',    '$HASH', 'active', NOW()),
  ('Admin Dinas',    '081111111111', 'admin',    '$HASH', 'active', NOW()),
  ('Operator Dinas', '082222222222', 'operator', '$HASH', 'active', NOW()),
  ('Reviewer Dinas', '083333333333', 'reviewer', '$HASH', 'active', NOW()),
  ('Kabid Dinas',    '084444444444', 'kabid',    '$HASH', 'active', NOW())
ON CONFLICT (no_telp) DO UPDATE SET password=EXCLUDED.password, role=EXCLUDED.role;
SELECT no_telp, role, nama FROM users ORDER BY role;
SQL

echo "✅ DONE — login: 081234567890 / Masuk123@"
