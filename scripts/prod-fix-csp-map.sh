#!/usr/bin/env bash
# The hardening CSP blocks the public map: Leaflet (unpkg CDN) + OSM tiles.
# Whitelist exactly those origins. Tests nginx config; auto-rollback on error.
set -euo pipefail
CONF=/etc/nginx/sites-available/sipera.aureonforge.com
BAK="${CONF}.bak-csp"

OLD="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"
NEW="default-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"

cp "$CONF" "$BAK"

OLD="$OLD" NEW="$NEW" CONF="$CONF" python3 - <<'PY'
import os
conf, old, new = os.environ["CONF"], os.environ["OLD"], os.environ["NEW"]
s = open(conf).read()
if new in s:
    print("CSP already relaxed → skip"); raise SystemExit(0)
n = s.count(old)
assert n >= 1, "old CSP string not found"
open(conf, "w").write(s.replace(old, new))
print(f"CSP updated in {n} location(s)")
PY

echo "--- nginx -t ---"
if nginx -t 2>&1; then
  systemctl reload nginx
  echo "nginx reloaded OK"
else
  echo "nginx test FAILED → rolling back"
  cp "$BAK" "$CONF"
  exit 1
fi
echo "--- live CSP ---"
curl -s -m 8 -D - -o /dev/null https://sipera.aureonforge.com/ | grep -i content-security-policy
echo "DONE-CSP-FIX"
