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
