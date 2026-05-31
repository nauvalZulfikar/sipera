# Local dev — quickstart

Tested on Windows 11 (git-bash) + macOS (Mac mini).

## Prasyarat sekali setup

- Docker Desktop running
- Node.js 20+
- pnpm 10+ (`npm i -g pnpm`)
- Git

## Setup (fresh clone)

```bash
git clone https://github.com/nauvalZulfikar/sipera.git sipera-rebuild
cd sipera-rebuild
pnpm install
bash scripts/local-bootstrap.sh
```

`local-bootstrap.sh` ngerjain:

1. Up infra docker (postgres+redis+minio+mailhog)
2. Prisma schema push + client generate
3. Seed 5 user (1 warga + 4 dinas roles)
4. Start 9 backend services + gateway + 2 frontends di background
5. Smoke-test login per role

Outputnya akhir kasih URL siap-pakai:

- **Warga:** http://localhost:5173 (login `081234567890`)
- **Dinas:** http://localhost:5174 (login `081111111111`)
- Password semua: `Masuk123@`

## Test seluruh fitur

```bash
bash scripts/local-smoke-test.sh
```

Ngecek 30+ endpoint: identity (login per role, OTP), master (KBLI bulk-import), permohonan (full state machine), spatial, document, notification, admin audit, reporting, public-api OAuth + frontends.

## Akun & role

| HP           | Role     | Akses frontend |
| ------------ | -------- | -------------- |
| 081234567890 | warga    | :5173 (warga)  |
| 081111111111 | admin    | :5174 (dinas)  |
| 082222222222 | operator | :5174 (dinas)  |
| 083333333333 | reviewer | :5174 (dinas)  |
| 084444444444 | kabid    | :5174 (dinas)  |

Frontend dinas nolak role di luar `admin|operator|reviewer|kabid` (cek `apps/frontend-dinas/src/pages/AdminLoginPage.tsx`).

## Stop

```bash
bash scripts/local-stop.sh
```

Kill semua process pakai port 4002–4018+5173/5174/5200, lalu down infra docker.

## Logs

```bash
tail -f .logs/identity.log .logs/permohonan.log    # ikuti satu service
tail -f .logs/*.log                                 # semua
```

## Reset DB (kalau seed kacau / schema berubah)

```bash
docker compose -f infra/docker/docker-compose.dev.yml down -v
bash scripts/local-bootstrap.sh
```

`-v` hapus volume postgres + minio, balik ke clean state.

## Port map

| Port      | Service               |
| --------- | --------------------- |
| 5532      | postgres (host)       |
| 6479      | redis (host)          |
| 9100/9101 | minio API / console   |
| 1125/8125 | mailhog SMTP / web UI |
| 4002      | identity              |
| 4003      | master                |
| 4006      | document              |
| 4007      | notification          |
| 4008      | spatial               |
| 4009      | permohonan            |
| 4012      | reporting             |
| 4013      | admin                 |
| 4018      | public-api            |
| 5200      | api-gateway           |
| 5173      | frontend-warga (Vite) |
| 5174      | frontend-dinas (Vite) |

## Troubleshooting

- **`lsof` not found on Windows** — pakai git-bash (sudah include lsof), atau install [busybox-w32](https://frippery.org/busybox/)
- **bcryptjs not found** — `pnpm install` aja, modul ada di `apps/identity/node_modules/`
- **Postgres connection refused** — tunggu ~10 detik habis `docker compose up`, healthcheck retry 10× di compose
- **Port udah dipake** — `bash scripts/local-stop.sh` dulu, atau cek port mana yg bentrok via `netstat -an | grep LISTEN`
