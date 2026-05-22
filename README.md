# Sipera Rebuild

Decoupled, modular rebuild of Sipera (Sistem Perizinan Tata Ruang) — replacing the obfuscated vendor delivery with a maintainable, testable monorepo.

## Stack

- **Backend:** TypeScript strict, NestJS (per module), Prisma, PostgreSQL + PostGIS, Redis, BullMQ
- **Frontend:** React 18, Vite, Tanstack Query/Router, shadcn/ui, Tailwind
- **Infra:** Docker Compose dev, GitHub Actions CI, OpenTelemetry observability
- **Test:** Vitest (unit), Testcontainers (integration), Playwright (E2E), k6 (load)

## Layout

```
sipera/
├── apps/
│   ├── api-gateway/        Fastify reverse proxy + feature flags
│   ├── identity/           Auth, users, OTP
│   ├── master/             Wilayah, KBLI, kategori-zona
│   ├── document/           Upload, PDF generate, S3
│   ├── notification/       SMS/email/WS/in-app
│   ├── spatial/            PostGIS intersect, ITBX rules, GeoServer
│   ├── permohonan/         Workflow orchestrator (state machine)
│   ├── reporting/          Dashboard, exports
│   ├── admin/              Workflow config, audit log viewer
│   ├── public-api/         REST + GraphQL for 3rd parties
│   ├── frontend-warga/     Public-facing React app
│   └── frontend-dinas/     Admin-facing React app
├── packages/
│   ├── shared-types/       Zod schemas + TS types shared FE/BE
│   ├── data-access/        Prisma + repository pattern
│   ├── ui-kit/             Shared React components (Storybook)
│   ├── contract-tests/     Recorded vendor contracts → Vitest
│   └── test-utils/         Testcontainers helpers, fixtures
├── infra/
│   ├── docker/             docker-compose.dev.yml + service Dockerfiles
│   ├── k8s/                Production manifests
│   ├── grafana/            Dashboards
│   ├── prometheus/         Alert rules
│   └── k6/                 Load test scripts
└── docs/                   ADRs, runbooks, architecture
```

## Quickstart

```bash
# 1. Install deps
pnpm install

# 2. Start dev infra (Postgres + Redis + MinIO + Mailhog)
pnpm dev

# 3. Run quality gates
pnpm typecheck
pnpm lint
pnpm test

# 4. Stop dev infra
pnpm dev:stop
```

## Phases

Eksekusi progress 18 fase rebuild di [docs/PHASES.md](docs/PHASES.md). Setiap fase punya gate test wajib lulus sebelum lanjut.

## Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`...)
- **Branch:** `feature/<phase>-<short-desc>`, PR ke `main` butuh 1 review
- **Code:** TS strict mode, naming Bahasa Indonesia di domain logic, English di infrastructure
- **Tests:** ≥80% coverage per module, contract test 100% lulus sebelum cutover

## License

Internal Dinas use only.
