/**
 * DB-backed ITBX matrix. Sumber kebenaran: tabel `itbx_matrix`.
 * Admin bisa edit lewat endpoint /admin/itbx (CRUD).
 *
 * Fallback: kalau tabel kosong → pake hardcoded `itbx.ts` rules (sample subset).
 */
import type { PrismaClient } from '@sipera/data-access';
import { checkItbx as checkItbxStatic, type ItbxStatus, ITBX_LABEL } from './itbx.js';

export interface ItbxRule {
  zonaPrefix: string;
  kbliPrefix: string;
  status: ItbxStatus;
  catatan?: string;
  priority: number;
}

export class HybridItbxService {
  private cachedRules: ItbxRule[] | null = null;
  private lastFetchMs = 0;
  private cacheMs: number;

  constructor(
    private readonly prisma: PrismaClient | null,
    cacheMs = 60_000, // 1 menit cache
  ) {
    this.cacheMs = cacheMs;
  }

  async getRules(): Promise<ItbxRule[]> {
    const now = Date.now();
    if (this.cachedRules && now - this.lastFetchMs < this.cacheMs) {
      return this.cachedRules;
    }
    if (!this.prisma) {
      this.cachedRules = [];
      return [];
    }
    try {
      const rows = await this.prisma.itbxMatrix.findMany({
        orderBy: [{ priority: 'desc' }, { id: 'asc' }],
      });
      this.cachedRules = rows.map((r) => ({
        zonaPrefix: r.zonaPrefix,
        kbliPrefix: r.kbliPrefix,
        status: r.status as ItbxStatus,
        ...(r.catatan ? { catatan: r.catatan } : {}),
        priority: r.priority,
      }));
      this.lastFetchMs = now;
      return this.cachedRules;
    } catch {
      this.cachedRules = [];
      return [];
    }
  }

  async checkItbx(
    zonaCode: string,
    kbliCode: string,
  ): Promise<{ status: ItbxStatus; label: string; catatan?: string; source: 'db' | 'static' }> {
    const rules = await this.getRules();
    if (rules.length === 0) {
      // Fallback ke hardcoded
      const s = checkItbxStatic(zonaCode, kbliCode);
      return { status: s, label: ITBX_LABEL[s], source: 'static' };
    }

    const kbliPrefix = kbliCode.slice(0, 2);
    // Rules sorted desc by priority → first match wins
    for (const rule of rules) {
      if (!zonaCode.startsWith(rule.zonaPrefix)) continue;
      if (rule.kbliPrefix !== '' && kbliPrefix !== rule.kbliPrefix) continue;
      return {
        status: rule.status,
        label: ITBX_LABEL[rule.status],
        ...(rule.catatan ? { catatan: rule.catatan } : {}),
        source: 'db',
      };
    }
    // Default: B (bersyarat) — conservative
    return { status: 'B', label: ITBX_LABEL.B, source: 'db' };
  }

  invalidateCache(): void {
    this.cachedRules = null;
    this.lastFetchMs = 0;
  }

  /** Untuk endpoint admin: list semua rules. */
  async listRules(): Promise<ItbxRule[]> {
    return this.getRules();
  }

  /** Buat seed initial rules dari hardcoded `itbx.ts` ke DB. */
  async seedFromStatic(seedBy: string): Promise<{ inserted: number }> {
    if (!this.prisma) return { inserted: 0 };
    // Import static rules at runtime to keep coupling loose
    const { default: defaultRules } = await import('./itbx-seed-rules.js');
    let inserted = 0;
    for (const r of defaultRules) {
      try {
        await this.prisma.itbxMatrix.create({
          data: {
            zonaPrefix: r.zonaPrefix,
            kbliPrefix: r.kbliPrefix,
            status: r.status,
            priority: 0,
            updatedBy: seedBy,
          },
        });
        inserted++;
      } catch {
        // duplicate (unique zonaPrefix+kbliPrefix) — skip
      }
    }
    this.invalidateCache();
    return { inserted };
  }
}
