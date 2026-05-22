import { randomUUID } from 'node:crypto';
import {
  transition,
  allowedActions,
  type PermohonanStatus,
  type PermohonanAction,
} from './workflow/state-machine.js';
import type { EventBus } from './events/event-bus.js';

export interface Permohonan {
  id: string;
  nomor: string;
  pemohonId: number;
  namaPemohon: string;
  status: PermohonanStatus;
  jenisIzin: 'KKPR' | 'PMP-UMKM';
  catatanRevisi: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePermohonanInput {
  pemohonId: number;
  namaPemohon: string;
  jenisIzin: 'KKPR' | 'PMP-UMKM';
}

export interface PermohonanRepository {
  save(p: Permohonan): Promise<void>;
  findById(id: string): Promise<Permohonan | null>;
  list(filter?: { status?: PermohonanStatus; pemohonId?: number }): Promise<Permohonan[]>;
}

/** In-memory implementation untuk Phase 9 demo. Production swap ke Prisma-backed. */
export class InMemoryPermohonanRepo implements PermohonanRepository {
  private store = new Map<string, Permohonan>();

  save(p: Permohonan): Promise<void> {
    this.store.set(p.id, { ...p });
    return Promise.resolve();
  }

  findById(id: string): Promise<Permohonan | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  list(filter: { status?: PermohonanStatus; pemohonId?: number } = {}): Promise<Permohonan[]> {
    const all = [...this.store.values()];
    return Promise.resolve(
      all.filter((p) => {
        if (filter.status && p.status !== filter.status) return false;
        if (filter.pemohonId && p.pemohonId !== filter.pemohonId) return false;
        return true;
      }),
    );
  }
}

let counter = 0;
function generateNomor(): string {
  counter++;
  const year = new Date().getFullYear();
  return `KKPR-${year}-${String(counter).padStart(5, '0')}`;
}

export class PermohonanService {
  constructor(
    private readonly repo: PermohonanRepository,
    private readonly bus: EventBus,
  ) {}

  async create(input: CreatePermohonanInput): Promise<Permohonan> {
    const now = new Date().toISOString();
    const p: Permohonan = {
      id: randomUUID(),
      nomor: generateNomor(),
      pemohonId: input.pemohonId,
      namaPemohon: input.namaPemohon,
      status: 'Baru',
      jenisIzin: input.jenisIzin,
      catatanRevisi: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.save(p);
    await this.bus.emit({
      type: 'PermohonanCreated',
      permohonanId: p.id,
      timestamp: now,
      payload: { nomor: p.nomor, namaPemohon: p.namaPemohon, jenisIzin: p.jenisIzin },
    });
    return p;
  }

  async act(
    id: string,
    action: PermohonanAction,
    meta: { catatan?: string } = {},
  ): Promise<{ ok: true; permohonan: Permohonan } | { ok: false; error: string }> {
    const p = await this.repo.findById(id);
    if (!p) return { ok: false, error: 'permohonan_not_found' };

    const t = transition(p.status, action);
    if (!t.ok || !t.nextStatus || !t.event) {
      return { ok: false, error: t.error ?? 'invalid_transition' };
    }

    const updated: Permohonan = {
      ...p,
      status: t.nextStatus,
      updatedAt: new Date().toISOString(),
      catatanRevisi:
        action === 'minta-revisi' && meta.catatan
          ? [...p.catatanRevisi, meta.catatan]
          : p.catatanRevisi,
    };
    await this.repo.save(updated);
    await this.bus.emit({
      type: t.event,
      permohonanId: id,
      timestamp: updated.updatedAt,
      payload: {
        nomor: updated.nomor,
        namaPemohon: updated.namaPemohon,
        ...(meta.catatan ? { catatan: meta.catatan } : {}),
      },
    });
    return { ok: true, permohonan: updated };
  }

  async findById(id: string): Promise<Permohonan | null> {
    return this.repo.findById(id);
  }

  async list(
    filter: { status?: PermohonanStatus; pemohonId?: number } = {},
  ): Promise<Permohonan[]> {
    return this.repo.list(filter);
  }

  availableActions(status: PermohonanStatus): PermohonanAction[] {
    return allowedActions(status);
  }
}
