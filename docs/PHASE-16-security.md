# Phase 16 — Security Hardening Checklist

## Static Analysis (CI)

- [ ] **Snyk** untuk dependency scanning + license audit
- [ ] **Semgrep** SAST dengan ruleset `p/owasp-top-ten` + `p/typescript`
- [ ] **gitleaks** scan repo untuk secret leak
- [ ] **Dependabot** auto-update vulnerable packages

## Dynamic Analysis

- [ ] **OWASP ZAP** weekly scan terjadwal di CI
- [ ] **Burp Suite** manual pen-test sebelum production launch

## Application

- [ ] CSP header strict (`default-src 'self'`)
- [ ] HSTS dengan `max-age=31536000; includeSubDomains; preload`
- [ ] CORS whitelist explicit (jangan `*`)
- [ ] Rate limit per user (bukan cuma per IP)
- [ ] CSRF token untuk state-changing operations
- [ ] Input validation di SETIAP boundary (Zod schemas)
- [ ] Output encoding (React default escape, tapi audit `dangerouslySetInnerHTML`)
- [ ] SQL injection: Prisma parameterized queries only (jangan `$queryRaw` tanpa sanitize)
- [ ] File upload: type whitelist, size limit, virus scan (ClamAV)
- [ ] JWT: short TTL (24h), refresh token, signing key rotation
- [ ] Password: bcrypt cost ≥10, no plaintext logging
- [ ] OTP: TTL 5min, max 5 attempts, lockout 1h

## Infrastructure

- [ ] **Secret management** via Vault / cloud KMS (NO `.env` in repo)
- [ ] Container scanning (Trivy) di registry push
- [ ] Image base: `node:20-alpine` (smaller attack surface) atau distroless
- [ ] Non-root container user
- [ ] Network policy: db hanya bisa diakses dari module service
- [ ] TLS everywhere (mTLS untuk service-to-service)

## Compliance

- [ ] UU PDP (Perlindungan Data Pribadi) compliance review
- [ ] Audit log: setiap akses data sensitive ter-log
- [ ] Data retention policy (auto-delete >5 thn)
- [ ] User right to export & deletion (GDPR-style)
- [ ] DPIA (Data Protection Impact Assessment) sebelum launch

## Sign-off Gates

- Snyk: zero high/critical
- ZAP: zero finding ≥ medium
- Pen-test report: closed all P1/P2 findings
- Security architect approval (external auditor)
