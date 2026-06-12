#!/usr/bin/env bash
# SPA cache bug: index.html is served with NO Cache-Control → browsers heuristically
# cache the app shell and keep running a stale bundle (which can be a broken old build).
# Fix: hashed /assets/* stay immutable (already correct from the container), but the
# HTML shell must be no-cache so every load picks up the current bundle hash.
# Done at the host nginx: split /assets/ (passthrough) from / (HTML → no-cache).
set -euo pipefail
CONF=/etc/nginx/sites-available/sipera.aureonforge.com
BAK="${CONF}.bak-spacache"
cp "$CONF" "$BAK"

CSP="default-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"

CONF="$CONF" CSP="$CSP" python3 - <<'PY'
import os
conf = os.environ["CONF"]; csp = os.environ["CSP"]
s = open(conf).read()
if "location /assets/" in s:
    print("already patched → skip"); raise SystemExit(0)

old = """    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }"""
assert old in s, "warga `location /` block not found verbatim"

new = """    # Hashed, content-addressed assets — cache forever (immutable from upstream).
    location /assets/ {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    # SPA shell (index.html + client routes) — never cache, always revalidate,
    # so a fixed deploy reaches users immediately instead of a stale cached bundle.
    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        # add_header in a location resets inherited headers — re-declare security set.
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Content-Security-Policy "%s" always;
    }""" % csp

s = s.replace(old, new, 1)
open(conf, "w").write(s)
print("patched: split /assets/ (immutable) from / (no-cache HTML)")
PY

echo "--- nginx -t ---"
if nginx -t 2>&1; then
  systemctl reload nginx
  echo "reloaded OK"
else
  echo "nginx test FAILED → rollback"; cp "$BAK" "$CONF"; exit 1
fi

echo "--- verify cache headers ---"
printf "index: "; curl -s -D - -o /dev/null https://sipera.aureonforge.com/ | grep -i cache-control || echo "(none!)"
printf "asset: "; curl -s -D - -o /dev/null "https://sipera.aureonforge.com/assets/index-CL1jkQXD.js" | grep -i cache-control || echo "(none)"
echo "DONE-SPA-CACHE"
