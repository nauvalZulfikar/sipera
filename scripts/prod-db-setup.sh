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

echo "[1/3] ensure schema (idempotent)..."
HAS_USERS=$(docker exec "$PG" psql -U sipera -d sipera -tAc "SELECT to_regclass('public.users') IS NOT NULL;")
if [ "$HAS_USERS" = "t" ]; then
  echo "    users table already exists → skip schema"
else
  docker run --rm \
    -v "$PWD/packages/data-access:/da" -w /da \
    node:20 sh -c "npx -y prisma@5.22.0 migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script" \
    > /tmp/sipera-schema.sql
  echo "    generated $(wc -l < /tmp/sipera-schema.sql) lines of SQL"
  docker exec -i "$PG" psql -U sipera -d sipera -v ON_ERROR_STOP=1 < /tmp/sipera-schema.sql
fi

echo "[2/3] compute bcrypt hash for Masuk123@ ..."
cat > /tmp/sipera-genhash.js <<'JS'
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('Masuk123@', 10));
JS
HASH=$(docker run --rm -v /tmp/sipera-genhash.js:/genhash.js node:20 \
  sh -c "cd /tmp && npm init -y >/dev/null 2>&1 && npm i bcryptjs@2 >/dev/null 2>&1 && NODE_PATH=/tmp/node_modules node /genhash.js")
echo "    hash=${HASH:0:12}..."
[ -n "$HASH" ] || { echo "ERROR: empty hash"; exit 1; }

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
