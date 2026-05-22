/**
 * Konfigurasi gateway. Mapping endpoint → upstream + feature flag (legacy vs new).
 *
 * Saat strangler-rebuild jalan, tiap endpoint bisa di-flip per env var
 * tanpa redeploy gateway. Default: semua route ke vendor (legacy).
 */

export interface UpstreamTarget {
  /** Nama upstream (mis. 'legacy-vendor', 'identity', 'master'). */
  name: string;
  /** Base URL upstream. */
  url: string;
}

export interface RouteRule {
  /** Path pattern. Mendukung wildcard `*`. */
  pattern: string;
  /** Pilih upstream berdasarkan env flag, kalau gak ada → fallback. */
  flagEnv: string;
  /** Upstream kalau flag-nya 'new'. */
  newUpstream: string;
  /** Upstream kalau flag legacy / gak di-set. */
  legacyUpstream: string;
  /** Apakah route ini butuh JWT valid. */
  requireAuth: boolean;
}

export interface GatewayConfig {
  port: number;
  upstreams: Record<string, UpstreamTarget>;
  routes: RouteRule[];
  jwtSecret: string;
  rateLimit: { max: number; timeWindow: string };
  cors: { origin: string[] };
}

export function loadConfig(): GatewayConfig {
  const legacyUrl = process.env.LEGACY_UPSTREAM_URL ?? 'http://localhost:4001';
  const identityUrl = process.env.IDENTITY_UPSTREAM_URL ?? 'http://localhost:4002';
  const masterUrl = process.env.MASTER_UPSTREAM_URL ?? 'http://localhost:4003';
  const permohonanUrl = process.env.PERMOHONAN_UPSTREAM_URL ?? 'http://localhost:4009';
  const spatialUrl = process.env.SPATIAL_UPSTREAM_URL ?? 'http://localhost:4008';

  return {
    port: Number(process.env.GATEWAY_PORT ?? 3001),
    upstreams: {
      'legacy-vendor': { name: 'legacy-vendor', url: legacyUrl },
      identity: { name: 'identity', url: identityUrl },
      master: { name: 'master', url: masterUrl },
      permohonan: { name: 'permohonan', url: permohonanUrl },
      spatial: { name: 'spatial', url: spatialUrl },
    },
    routes: [
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
      {
        pattern: '/wilayah/*',
        flagEnv: 'ROUTE_WILAYAH',
        newUpstream: 'master',
        legacyUpstream: 'legacy-vendor',
        requireAuth: false,
      },
      {
        pattern: '/kbli/*',
        flagEnv: 'ROUTE_KBLI',
        newUpstream: 'master',
        legacyUpstream: 'legacy-vendor',
        requireAuth: true,
      },
      {
        pattern: '/kategori-zona/*',
        flagEnv: 'ROUTE_KATEGORI_ZONA',
        newUpstream: 'master',
        legacyUpstream: 'legacy-vendor',
        requireAuth: false,
      },
      {
        pattern: '/permohonan/*',
        flagEnv: 'ROUTE_PERMOHONAN',
        newUpstream: 'permohonan',
        legacyUpstream: 'legacy-vendor',
        requireAuth: true,
      },
      {
        pattern: '/rdtr/*',
        flagEnv: 'ROUTE_RDTR',
        newUpstream: 'spatial',
        legacyUpstream: 'legacy-vendor',
        requireAuth: false,
      },
      {
        pattern: '/rtrw/*',
        flagEnv: 'ROUTE_RTRW',
        newUpstream: 'spatial',
        legacyUpstream: 'legacy-vendor',
        requireAuth: false,
      },
      {
        pattern: '/api*',
        flagEnv: 'ROUTE_SWAGGER',
        newUpstream: 'legacy-vendor',
        legacyUpstream: 'legacy-vendor',
        requireAuth: false,
      },
    ],
    jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
    rateLimit: {
      max: Number(process.env.RATE_LIMIT_MAX ?? 100),
      timeWindow: process.env.RATE_LIMIT_WINDOW ?? '1 minute',
    },
    cors: {
      origin: (process.env.CORS_ORIGINS ?? 'http://localhost:8087,http://localhost:8086').split(
        ',',
      ),
    },
  };
}
