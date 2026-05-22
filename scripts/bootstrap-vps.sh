#!/bin/bash
# Bootstrap Sipera di VPS root@72.60.196.21
# Run sekali sebagai root. Idempotent — aman kalau di-rerun.
#
# Usage:
#   ssh root@72.60.196.21
#   curl -fsSL https://raw.githubusercontent.com/nauvalZulfikar/sipera/main/scripts/bootstrap-vps.sh | bash

set -euo pipefail

PROJECT_DIR=/root/projects/sipera
DOMAIN=sipera.aureonforge.com
ADMIN_DOMAIN=admin-sipera.aureonforge.com

echo "[1/8] Pastikan tools terinstall..."
command -v docker >/dev/null || { echo "Install Docker dulu: https://docs.docker.com/engine/install/"; exit 1; }
command -v git >/dev/null    || apt-get install -y git
command -v nginx >/dev/null  || apt-get install -y nginx
command -v certbot >/dev/null || apt-get install -y certbot python3-certbot-nginx

echo "[2/8] Clone repo kalau belum ada..."
if [ ! -d "$PROJECT_DIR" ]; then
  mkdir -p /root/projects
  git clone https://github.com/nauvalZulfikar/sipera.git "$PROJECT_DIR"
else
  cd "$PROJECT_DIR" && git pull origin main
fi

cd "$PROJECT_DIR"

echo "[3/8] Generate .env.prod kalau belum ada..."
ENV_FILE=infra/docker/.env
if [ ! -f "$ENV_FILE" ]; then
  POSTGRES_PASSWORD=$(openssl rand -hex 24)
  JWT_SECRET=$(openssl rand -hex 32)
  cat > "$ENV_FILE" <<EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
# Isi di bawah ini setelah lo daftar akun:
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
SENDGRID_API_KEY=
EOF
  echo "  → Generated $ENV_FILE (random POSTGRES_PASSWORD + JWT_SECRET)"
  echo "  → BACKUP file ini! Kalau hilang DB & token gak bisa di-decrypt"
else
  echo "  → $ENV_FILE sudah ada, skip"
fi

echo "[4/8] Pull images dari GHCR..."
cd "$PROJECT_DIR/infra/docker"
docker compose -f docker-compose.prod.yml --env-file .env pull || \
  echo "  ⚠️ Pull gagal — pastikan GitHub Actions sudah jalan minimal sekali"

echo "[5/8] Start stack..."
docker compose -f docker-compose.prod.yml --env-file .env up -d

echo "[6/8] Setup nginx vhost..."
NGINX_CONF=/etc/nginx/sites-available/sipera.aureonforge.com
if [ ! -f "$NGINX_CONF" ]; then
  cp "$PROJECT_DIR/infra/nginx/sipera.aureonforge.com.conf" "$NGINX_CONF"
  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
  echo "  → Vhost installed & reloaded"
else
  echo "  → Vhost sudah ada, skip"
fi

echo "[7/8] Setup SSL via Let's Encrypt..."
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  certbot --nginx -d "$DOMAIN" -d "$ADMIN_DOMAIN" --non-interactive --agree-tos --email nauval.saga@gmail.com
  echo "  → SSL aktif"
else
  echo "  → SSL sudah ada"
fi

echo "[8/8] Health check..."
sleep 5
docker compose -f docker-compose.prod.yml ps
echo ""
echo "=========================================="
echo "✅ DONE"
echo "Warga:  https://$DOMAIN"
echo "Dinas:  https://$ADMIN_DOMAIN"
echo "Logs:   docker compose -f $PROJECT_DIR/infra/docker/docker-compose.prod.yml logs -f"
echo "=========================================="
