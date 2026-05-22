# Deployment Guide

## Target

- **VPS:** root@72.60.196.21
- **Domain:** sipera.aureonforge.com (warga), admin-sipera.aureonforge.com (dinas)
- **Image registry:** GitHub Container Registry (ghcr.io)

## First-time Setup (sekali aja)

### 1. Setup GitHub Secrets

Pergi ke https://github.com/nauvalZulfikar/sipera/settings/secrets/actions, tambah:

| Secret name   | Value                                         |
| ------------- | --------------------------------------------- |
| `VPS_HOST`    | `72.60.196.21`                                |
| `VPS_USER`    | `root`                                        |
| `VPS_SSH_KEY` | private SSH key (isi dari `~/.ssh/id_rsa` lo) |

### 2. Pointing DNS

Di Cloudflare / DNS provider domain `aureonforge.com`:

- `sipera.aureonforge.com` → A record → `72.60.196.21`
- `admin-sipera.aureonforge.com` → A record → `72.60.196.21`

### 3. Push pertama ke main

```bash
cd C:/Users/Lenovo/sipera-rebuild
git add .
git commit -m "feat: initial Sipera rebuild"
git push -u origin main
```

Otomatis trigger GitHub Actions → build 12 images → push ke ghcr.io.
Tunggu ~10-15 menit (build cold cache).

### 4. SSH ke VPS + run bootstrap

```bash
ssh root@72.60.196.21
curl -fsSL https://raw.githubusercontent.com/nauvalZulfikar/sipera/main/scripts/bootstrap-vps.sh | bash
```

Script bakal:

- Install docker/git/nginx/certbot kalau belum
- Clone repo ke `/root/projects/sipera`
- Generate `.env` random secrets (BACKUP file ini!)
- Pull images dari ghcr.io
- Start docker compose
- Setup nginx vhost + Let's Encrypt SSL

### 5. Verifikasi

- https://sipera.aureonforge.com → halaman login warga
- https://admin-sipera.aureonforge.com → halaman login dinas

Login dengan: `081234567890` / `Masuk123@` (admin demo — ganti sebelum publik).

## Update / Re-deploy

Cuma `git push origin main` → CI/CD auto-deploy:

1. Build images baru
2. SSH ke VPS, `docker compose pull && up -d`
3. Zero-downtime (1-by-1 container restart)

## Troubleshooting

### Lihat logs service

```bash
docker compose -f /root/projects/sipera/infra/docker/docker-compose.prod.yml logs -f identity
docker compose -f /root/projects/sipera/infra/docker/docker-compose.prod.yml logs -f permohonan
```

### Reset DB (DESTRUCTIVE)

```bash
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d
```

### Renew SSL (auto via cron, tapi manual:)

```bash
certbot renew
```

### Backup DB harian

Add cron di VPS:

```bash
echo "0 2 * * * docker exec sipera-pg pg_dump -U sipera sipera | gzip > /root/backups/sipera-\$(date +\%F).sql.gz" | crontab -
```

## Cost

- VPS: ~Rp 200-500rb/bln (4 vCPU + 8GB RAM cukup)
- Domain: udah ada (aureonforge.com)
- SSL: gratis (Let's Encrypt)
- GHCR: gratis (public/private repo up to limits)

Total: **<Rp 500rb/bln** operational.
