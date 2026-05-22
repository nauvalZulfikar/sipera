# Sipera Rebuild — Execution Status

Last updated: 2026-05-22

| #   | Phase                | Status        | Notes                                                                              |
| --- | -------------------- | ------------- | ---------------------------------------------------------------------------------- |
| 0   | Monorepo & tooling   | ✅ done       | pnpm workspaces, TS strict, ESLint flat, Prettier, Docker Compose dev, CI workflow |
| 1   | Contract recorder    | ✅ done       | Fastify proxy + JSON recorder + Vitest generator. 7 unit tests pass.               |
| 2   | API Gateway          | ✅ done       | Plain Node HTTP forwarder, feature-flag per route, CORS, health. 7 tests pass.     |
| 3   | Data access          | ✅ done       | Prisma 5 schema (5 model) + repository pattern (3 repo). 4 tests pass.             |
| 4   | Identity module      | ✅ done       | bcrypt+JWT login, OTP service (5min TTL, rate-limit). 12 tests pass.               |
| 5   | Master data          | 🟡 scaffolded | Fastify boot + healthcheck. Domain & routes TBD by team.                           |
| 6   | Document             | 🟡 scaffolded | Same. Spec in apps/document/README.md.                                             |
| 7   | Notification         | 🟡 scaffolded | Same. Channel abstraction TBD.                                                     |
| 8   | Spatial engine       | 🟡 scaffolded | Same. PostGIS + GeoServer integration TBD.                                         |
| 9   | Permohonan           | 🟡 scaffolded | Same. XState workflow TBD.                                                         |
| 10  | Frontend Warga       | 🟡 scaffolded | Vite+React+TS boot. Pages TBD.                                                     |
| 11  | Frontend Dinas       | 🟡 scaffolded | Same.                                                                              |
| 12  | Reporting            | 🟡 scaffolded | Same.                                                                              |
| 13  | Admin                | 🟡 scaffolded | Same.                                                                              |
| 14  | Cutover              | 📋 documented | Sequence + rollback plan: docs/PHASE-14-cutover.md                                 |
| 15  | Observability        | 📋 stubs      | Prometheus alerts.yml + Grafana README templates                                   |
| 16  | Security hardening   | 📋 checklist  | Full checklist: docs/PHASE-16-security.md                                          |
| 17  | Developer experience | 📋 todo       | Storybook + SDK gen + msw — to be scaffolded                                       |
| 18  | Public API & SDKs    | 📋 spec       | API surface + OAuth2 + webhook design: docs/PHASE-18-public-api.md                 |

## Legend

- ✅ done — code shipped, tests pass, live-tested vs vendor backend
- 🟡 scaffolded — package booted with healthcheck, ready for team to flesh out per README spec
- 📋 spec — design document only, implementation TBD

## What's Live Right Now

1. `apps/api-gateway` — strangler-pattern proxy yang siap dipasang di depan vendor backend
2. `apps/identity` — drop-in replacement untuk /auth/login dan /auth/otp/\* — sudah verified match vendor contract dengan DB sipera-db real
3. `packages/data-access` — Prisma client + repository pattern, swap-able untuk testing
4. `packages/contract-tests` — perekam vendor traffic + auto-generate Vitest test

## Run the Demo

```bash
cd C:/Users/Lenovo/sipera-rebuild
pnpm install
# Start identity module against the existing sipera-db postgres
DATABASE_URL='postgresql://gsbandung:gsbandung123@localhost:5442/geoportal' \
  pnpm --filter @sipera/identity run dev
# Hit it
curl -X POST http://localhost:4002/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"no_telp":"081234567890","password":"Masuk123@"}'
# Should return same shape as vendor backend
```

## Next Recommended Work (post-AI-session)

1. **Hire 3-4 dev team** + 1 PM
2. Fase 5 (Master) — pelajari pattern dari Fase 4, replicate untuk wilayah/kbli/kategori-zona
3. Fase 7 (Notification) — pelajari domain events, integrasi Twilio/SES
4. Fase 8 (Spatial) — paling kompleks, butuh data RDTR dari Bappeda dulu
5. Fase 9 (Permohonan) — orchestrator, depends on 5+7+8
6. Fase 10-11 (Frontend) — paralel dengan backend, page-by-page strangler
7. Fase 14 (Cutover) — eksekusi sequence di docs/PHASE-14-cutover.md
8. Fase 16 (Security) — wajib sebelum public launch
