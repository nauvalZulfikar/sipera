# @sipera/admin

**Port:** 4013  
**Description:** Workflow config CRUD, ITBX matrix editor, role/permission, audit log viewer, feature-flag UI

## Status

- [x] Scaffold (Fastify + cors + healthcheck)
- [ ] Domain entities & repositories (extend @sipera/data-access)
- [ ] Service layer (business logic)
- [ ] HTTP routes (Zod validation)
- [ ] Unit tests (≥80% coverage)
- [ ] Contract tests (lock vendor behavior)
- [ ] Shadow mode via gateway flag `ROUTE_ADMIN=new`
- [ ] Cutover when shadow zero-mismatch 1 week

## Run

```bash
pnpm --filter @sipera/admin run dev
curl http://localhost:4013/_health
```

## Gate (definition of done)

1. Typecheck strict mode pass
2. Lint zero warnings
3. Unit + contract tests pass
4. Live smoke vs vendor: behavior match
5. Load test: P95 < 500ms sustained 100 req/s
6. Security scan: zero high/critical
7. ADR documented in /docs
