# Phase 18 — Public API & SDK Spec

## Goal

Sipera jadi platform — pihak ketiga (bank, e-signature, OSS, e-government) bisa integrasi resmi tanpa scraping atau bayar vendor.

## API Surface

### REST (public-api service, port 4018)

```
POST   /v1/permohonan                 Submit baru (OAuth2 scope: permohonan:write)
GET    /v1/permohonan/:id             Status (scope: permohonan:read)
GET    /v1/zona/intersect             Cek izin per polygon (scope: spatial:read)
POST   /v1/webhook/subscriptions      Subscribe event (scope: webhook:manage)
```

### GraphQL (alternatif)

```graphql
type Query {
  permohonan(id: ID!): Permohonan
  zonaIntersect(polygon: Polygon!): [ZonaOverlap!]!
}
type Mutation {
  createPermohonan(input: PermohonanInput!): Permohonan!
}
type Subscription {
  permohonanStatusChanged(id: ID!): Permohonan!
}
```

### Webhooks

Event publish ke subscriber:

- `permohonan.created`
- `permohonan.approved`
- `permohonan.rejected`
- `permohonan.revised`
- `dokumen.generated`

Format: HMAC-signed JSON POST ke subscriber URL. Retry 3x exponential backoff.

## Auth

- OAuth 2.0 Client Credentials Flow
- Developer mendaftar via portal → dapat `client_id` + `client_secret`
- Token JWT 1 jam TTL, refresh token 30 hari
- Scope-based authorization

## Rate Limit

- Free tier: 100 req/menit, 10k/hari
- Partner tier: 1000 req/menit, unlimited/hari (kontrak)

## SDKs

- `@sipera/sdk-js` — npm package, TS types auto-generated dari OpenAPI
- `sipera-sdk` (Python) — PyPI, type stubs included
- `sipera-sdk-php` — Composer

Auto-generated dari OpenAPI 3.1 spec pakai `openapi-generator`. CI publish ke registry on release tag.

## Developer Portal

- Static site (Astro / Next.js) di `docs.sipera.bandung.go.id`
- OpenAPI playground (Swagger UI)
- Code samples per language
- Webhook tester sandbox
- Quota & analytics per client
