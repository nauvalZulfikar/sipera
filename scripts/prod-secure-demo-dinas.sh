#!/usr/bin/env bash
# Rotate the 4 demo DINAS accounts to fresh random strong passwords.
# Warga demo (081234567890) is intentionally NOT touched.
set -euo pipefail
PG=sipera-pg

NOS=(081111111111 082222222222 083333333333 084444444444)
ROLES=(admin operator reviewer kabid)

# Generate strong random passwords (random 12 alnum + guaranteed-complexity suffix)
PWS=()
for i in 0 1 2 3; do
  rnd=$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | cut -c1-12)
  PWS[$i]="${rnd}Xy7#"
done

# Build {no_telp: password} JSON for the hasher
JSON="{"
for i in 0 1 2 3; do JSON="${JSON}\"${NOS[$i]}\":\"${PWS[$i]}\","; done
JSON="${JSON%,}}"

# Hasher emits UPDATE statements (bcrypt hashes are SQL-safe: no single quotes)
cat > /tmp/hashpw.js <<'JS'
const bcrypt = require('bcryptjs');
const m = JSON.parse(process.env.PWMAP);
for (const k in m) {
  const h = bcrypt.hashSync(m[k], 10);
  console.log(`UPDATE users SET password='${h}' WHERE no_telp='${k}';`);
}
JS

SQL=$(docker run --rm -v /tmp/hashpw.js:/h.js -e PWMAP="$JSON" node:20 \
  sh -c "cd /tmp && npm init -y >/dev/null 2>&1 && npm i bcryptjs@2 >/dev/null 2>&1 && NODE_PATH=/tmp/node_modules node /h.js")

echo "--- applying password updates ---"
printf '%s\n' "$SQL" | docker exec -i "$PG" psql -U sipera -d sipera -v ON_ERROR_STOP=1

echo "--- confirm warga demo untouched (should still be 1 row, role warga) ---"
docker exec "$PG" psql -U sipera -d sipera -tAc "SELECT no_telp||' '||role FROM users WHERE no_telp='081234567890';"

echo "=== NEW DINAS CREDENTIALS ==="
for i in 0 1 2 3; do
  printf "%s | %-8s | %s\n" "${NOS[$i]}" "${ROLES[$i]}" "${PWS[$i]}"
done
echo "DONE-SECURE-DINAS"
