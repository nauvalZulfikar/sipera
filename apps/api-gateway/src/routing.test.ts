import { describe, expect, it } from 'vitest';
import { matchRoute, resolveUpstream } from './routing.js';
import { loadConfig, type RouteRule, type GatewayConfig } from './config.js';

describe('matchRoute', () => {
  const rules: RouteRule[] = [
    {
      pattern: '/auth/*',
      flagEnv: 'ROUTE_AUTH',
      newUpstream: 'identity',
      legacyUpstream: 'legacy-vendor',
      requireAuth: false,
    },
    {
      pattern: '/users/*',
      flagEnv: 'ROUTE_USERS',
      newUpstream: 'identity',
      legacyUpstream: 'legacy-vendor',
      requireAuth: true,
    },
  ];

  it('matches wildcard suffix', () => {
    expect(matchRoute(rules, '/auth/login')?.pattern).toBe('/auth/*');
    expect(matchRoute(rules, '/auth/otp/generate')?.pattern).toBe('/auth/*');
  });

  it('returns null for unmatched path', () => {
    expect(matchRoute(rules, '/permohonan/baru')).toBeNull();
  });

  it('matches first rule (order-sensitive)', () => {
    const r = matchRoute(rules, '/users/me');
    expect(r?.pattern).toBe('/users/*');
  });
});

describe('resolveUpstream', () => {
  const cfg: GatewayConfig = loadConfig();
  const authRule = cfg.routes.find((r) => r.pattern === '/auth/*');
  if (!authRule) throw new Error('auth rule missing in config');

  it('defaults to legacy when flag unset', () => {
    const env: NodeJS.ProcessEnv = {};
    expect(resolveUpstream(cfg, authRule, env).name).toBe('legacy-vendor');
  });

  it('routes to new when flag=new', () => {
    const env: NodeJS.ProcessEnv = { ROUTE_AUTH: 'new' };
    expect(resolveUpstream(cfg, authRule, env).name).toBe('identity');
  });

  it('case-insensitive flag value', () => {
    const env: NodeJS.ProcessEnv = { ROUTE_AUTH: 'NEW' };
    expect(resolveUpstream(cfg, authRule, env).name).toBe('identity');
  });

  it('falls back to legacy on unknown flag value', () => {
    const env: NodeJS.ProcessEnv = { ROUTE_AUTH: 'experimental' };
    expect(resolveUpstream(cfg, authRule, env).name).toBe('legacy-vendor');
  });
});

describe('spatial + reporting routes (regression: frontend feature wiring)', () => {
  const cfg = loadConfig();

  it('exposes /zona and routes it to spatial', () => {
    const r = matchRoute(cfg.routes, '/zona');
    expect(r?.newUpstream).toBe('spatial');
    expect(resolveUpstream(cfg, r!, { ROUTE_RDTR: 'new' }).name).toBe('spatial');
  });

  it('strips /rdtr prefix so /rdtr/intersect → /intersect on spatial', () => {
    const r = matchRoute(cfg.routes, '/rdtr/intersect');
    expect(r?.newUpstream).toBe('spatial');
    expect(r?.stripPrefix).toBe('/rdtr');
  });

  it('routes /reports/* to reporting upstream (auth required)', () => {
    const r = matchRoute(cfg.routes, '/reports/summary');
    expect(r?.newUpstream).toBe('reporting');
    expect(r?.requireAuth).toBe(true);
    expect(cfg.upstreams.reporting).toBeDefined();
    expect(resolveUpstream(cfg, r!, { ROUTE_REPORTS: 'new' }).name).toBe('reporting');
  });
});
