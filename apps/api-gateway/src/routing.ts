import type { GatewayConfig, RouteRule, UpstreamTarget } from './config.js';

/**
 * Match path ke route rule pertama yang cocok.
 * Pattern `/auth/*` cocokin semua path yang mulai `/auth/`.
 */
export function matchRoute(rules: RouteRule[], path: string): RouteRule | null {
  for (const r of rules) {
    if (matches(r.pattern, path)) return r;
  }
  return null;
}

function matches(pattern: string, path: string): boolean {
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return path === prefix || path.startsWith(prefix + '/');
  }
  if (pattern.endsWith('*')) {
    return path.startsWith(pattern.slice(0, -1));
  }
  return path === pattern;
}

/**
 * Tentukan upstream berdasarkan feature flag environment variable.
 * Default: legacy. Hanya `=new` yang flip ke modul baru.
 */
export function resolveUpstream(
  config: GatewayConfig,
  rule: RouteRule,
  env: NodeJS.ProcessEnv,
): UpstreamTarget {
  const flag = (env[rule.flagEnv] ?? 'legacy').toLowerCase();
  const upstreamName = flag === 'new' ? rule.newUpstream : rule.legacyUpstream;
  const upstream = config.upstreams[upstreamName];
  if (!upstream) {
    throw new Error(`upstream '${upstreamName}' not configured (route ${rule.pattern})`);
  }
  return upstream;
}
