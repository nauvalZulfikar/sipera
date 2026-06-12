#!/usr/bin/env bash
# Create nginx vhost for admin-sipera.aureonforge.com on the NEW server.
# fe-dinas already runs at 127.0.0.1:8091. API shares the same gateway :5200.
# HTTP-only for now; certbot adds SSL once DNS points here.
set -euo pipefail
CONF=/etc/nginx/sites-available/admin-sipera.aureonforge.com

cat > "$CONF" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name admin-sipera.aureonforge.com;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'" always;
    client_max_body_size 50M;

    location ~ ^/(auth|users|wilayah|kbli|kategori-zona|permohonan|rdtr|rtrw|zona|reports|_health|_routes)(/|$) {
        proxy_pass http://127.0.0.1:5200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:5200/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /ws/ {
        proxy_pass http://127.0.0.1:4007/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }
    location / {
        proxy_pass http://127.0.0.1:8091;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

ln -sf "$CONF" /etc/nginx/sites-enabled/admin-sipera.aureonforge.com

echo "--- nginx -t ---"
if nginx -t 2>&1; then
  systemctl reload nginx
  echo "vhost installed + nginx reloaded"
else
  echo "nginx test FAILED → removing vhost"
  rm -f /etc/nginx/sites-enabled/admin-sipera.aureonforge.com
  exit 1
fi
echo "DONE-ADMIN-VHOST"
