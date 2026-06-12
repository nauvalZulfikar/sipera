# Project state log — appended by MACS after every mutating turn.

# Newest entry at top. Each entry shows: timestamp, user prompt, status, persisted files.

---

ts: 2026-06-12T15:30:00+07:00
turn: pake browser-agent, test login pake test account smp gaada error
status:
done: "Login prod sipera.aureonforge.com FIXED & verified. Root causes: (1) DB no schema → prod-db-setup.sh (offline SQL via prisma migrate diff + psql apply + seed 5 users); (2) postgres mem_limit 120m → OOM on CREATE EXTENSION postgis → prod-bump-pg-mem.sh bumped to 1g. Verified: API 201+JWT, browser screenshot warga dashboard."
next: "Commit docker-compose.prod.yml mem_limit fix to repo (currently server-only drift). Optional: migrate admin-sipera to new server; kill demo acct before wide public."
blocked: "—"
persisted: [scripts/prod-db-setup.sh, scripts/prod-bump-pg-mem.sh]

---

---

ts: 2026-06-12T16:45:00+07:00
turn: list down all features di sipera, test terus each smp gaada eror atau bugs
status:
done: "Audited all sipera features + tested via API/browser. Found & FIXED 3 broken: (1) gateway missing /zona, /reports routes + /rdtr prefix mismatch → config.ts/server.ts + reporting upstream (c1232e3, 25/25 tests); (2) gateway+reporting OOM at 120m → bumped 512m; (3) public map blank — hardening CSP blocked Leaflet/OSM → relaxed CSP. All verified: /zona 200, /rdtr/intersect 200, /reports 200, burst 30/30, map renders zona polygons (browser screenshot run-1781259281). Infra drift committed (b01e2e2)."
next: "Optional: bump remaining tsx services off 120m proactively; migrate admin-sipera (dinas UI) to new server; kill demo acct before wide public."
blocked: "—"
persisted: [apps/api-gateway/src/config.ts, apps/api-gateway/src/server.ts, apps/api-gateway/src/routing.test.ts, infra/docker/docker-compose.prod.yml, infra/nginx/sipera.aureonforge.com.conf, scripts/prod-deploy-gateway.sh, scripts/prod-bump-gateway-mem.sh, scripts/prod-bump-reporting-mem.sh, scripts/prod-fix-csp-map.sh]

---

---

ts: 2026-06-12T17:30:00+07:00
turn: sembunyikan demo, kasih creds demo, pindahin halaman dinas (admin) ke server baru
status:
done: "Demo hidden from login (warga+dinas: cleared prefill + removed hint, commit 26c87be, deployed, browser-verified blank form). Demo creds handed to user. Dinas migrated to new server: nginx vhost admin-sipera→:8091+gateway installed & verified (dinas HTML + admin login 200 via Host header)."
next: "User repoints DNS admin-sipera A → 72.61.101.167 in Hostinger; then I run certbot for SSL. (vhost is HTTP-only until DNS moves.)"
blocked: "SSL admin-sipera waits on user DNS repoint at Hostinger (no DNS API access)."
persisted: [apps/frontend-warga/src/pages/LoginPage.tsx, apps/frontend-dinas/src/pages/AdminLoginPage.tsx, scripts/prod-setup-admin-vhost.sh]

---

---

ts: 2026-06-12T18:35:00+07:00
turn: done, wait for hostinger (DNS admin-sipera)
status:
done: "Dinas migration COMPLETE. DNS admin-sipera→72.61.101.167 (user), SSL via certbot (Let's Encrypt exp 2026-09-10, http→https redirect). Verified: HTTPS 200 'Sipera — Dashboard Dinas', admin login 081111111111 → 200, demo-prefill blank (browser screenshot run-1781267496). Warga + Dinas both fully live on new server with HTTPS + demo hidden."
next: "Optional: secure demo dinas accounts (rotate/disable) before real staff use; clean orphaned sipera-dinas stack on old server (do NOT decommission old server — hosts shakaai etc.)."
blocked: "—"
persisted: []

---

---

ts: 2026-06-12T19:40:00+07:00
turn: sipera login warga pas submit gaada perubahan, gua restart baru berubah
status:
done: "FIXED warga login 'no nav until reload': auth-store useUser() had per-component useState → App shell never saw LoginPage setUser. Replaced with shared module store via useSyncExternalStore (warga+dinas, commit 1be5aa6). Deployed (new bundle BxhNlbS4). Verified DETERMINISTICALLY via Playwright (venv python): click Masuk → dashboard 'Permohonan Saya' without reload (/tmp/login_result.png). Also fixed SPA cache (index.html no-cache) via prod-fix-spa-cache.sh."
next: "Optional: fix NotifBell ws /ws/notifikasi 502; patch dinas vhost SPA cache; bump 120m anchor before traffic; sync nginx template to repo."
blocked: "—"
persisted: [apps/frontend-warga/src/lib/auth-store.ts, apps/frontend-dinas/src/lib/auth-store.ts, scripts/prod-fix-spa-cache.sh]

---

---

ts: 2026-06-12T20:30:00+07:00
turn: login admin-siperanya msh error
status:
done: "FIXED dinas login 'Failed to fetch': frontend images baked API_URL=warga-domain → dinas fetched cross-origin → CSP blocked. Fix: build with empty API_URL/WS_URL → relative same-origin; NotifBell derives ws from location (commit 6f3a848). Deployed. Verified via Playwright: dinas admin login → 201 on admin-sipera origin → dashboard 'Semua Permohonan' (/tmp/dinas_result.png); warga no regression (LOGGED_IN_DASHBOARD)."
next: "Optional: fix /ws/notifikasi 502; patch dinas vhost SPA cache; bump 120m anchor; sync nginx template to repo."
blocked: "—"
persisted: [.github/workflows/deploy.yml, apps/frontend-warga/src/components/NotifBell.tsx]

---
