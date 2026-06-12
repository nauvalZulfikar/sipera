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
