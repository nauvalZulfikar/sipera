import { describe, expect, it, vi } from 'vitest';
import { PermohonanService, InMemoryPermohonanRepo } from './permohonan.service.js';
import { EventBus } from './events/event-bus.js';

describe('PermohonanService', () => {
  it('create → emits PermohonanCreated', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('PermohonanCreated', handler);
    const svc = new PermohonanService(new InMemoryPermohonanRepo(), bus);
    const p = await svc.create({ pemohonId: 1, namaPemohon: 'Budi', jenisIzin: 'KKPR' });
    expect(p.status).toBe('Baru');
    expect(p.nomor).toMatch(/^KKPR-\d{4}-\d{5}$/);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('happy path: Baru → Verifikasi → Disetujui → Selesai', async () => {
    const svc = new PermohonanService(new InMemoryPermohonanRepo(), new EventBus());
    const p = await svc.create({ pemohonId: 1, namaPemohon: 'A', jenisIzin: 'KKPR' });
    const r1 = await svc.act(p.id, 'mulai-verifikasi');
    expect(r1.ok && r1.permohonan.status).toBe('Verifikasi');
    const r2 = await svc.act(p.id, 'setujui');
    expect(r2.ok && r2.permohonan.status).toBe('Disetujui');
    const r3 = await svc.act(p.id, 'selesaikan');
    expect(r3.ok && r3.permohonan.status).toBe('Selesai');
  });

  it('revisi loop: Verifikasi → Revisi → Verifikasi → Disetujui', async () => {
    const svc = new PermohonanService(new InMemoryPermohonanRepo(), new EventBus());
    const p = await svc.create({ pemohonId: 1, namaPemohon: 'A', jenisIzin: 'KKPR' });
    await svc.act(p.id, 'mulai-verifikasi');
    const revisi = await svc.act(p.id, 'minta-revisi', { catatan: 'NPWP gak jelas' });
    expect(revisi.ok && revisi.permohonan.status).toBe('Revisi');
    if (revisi.ok) {
      expect(revisi.permohonan.catatanRevisi).toContain('NPWP gak jelas');
    }
    const resub = await svc.act(p.id, 'submit-revisi');
    expect(resub.ok && resub.permohonan.status).toBe('Verifikasi');
    const ok = await svc.act(p.id, 'setujui');
    expect(ok.ok && ok.permohonan.status).toBe('Disetujui');
  });

  it('rejects invalid transition', async () => {
    const svc = new PermohonanService(new InMemoryPermohonanRepo(), new EventBus());
    const p = await svc.create({ pemohonId: 1, namaPemohon: 'A', jenisIzin: 'KKPR' });
    const r = await svc.act(p.id, 'setujui'); // can't approve from Baru
    expect(r.ok).toBe(false);
  });

  it('expires from Baru', async () => {
    const svc = new PermohonanService(new InMemoryPermohonanRepo(), new EventBus());
    const p = await svc.create({ pemohonId: 1, namaPemohon: 'A', jenisIzin: 'KKPR' });
    const r = await svc.act(p.id, 'expire');
    expect(r.ok && r.permohonan.status).toBe('Kadaluarsa');
  });

  it('events fired in correct sequence', async () => {
    const bus = new EventBus();
    const log: string[] = [];
    bus.on('PermohonanCreated', () => {
      log.push('created');
    });
    bus.on('PermohonanReviewing', () => {
      log.push('reviewing');
    });
    bus.on('PermohonanApproved', () => {
      log.push('approved');
    });
    const svc = new PermohonanService(new InMemoryPermohonanRepo(), bus);
    const p = await svc.create({ pemohonId: 1, namaPemohon: 'A', jenisIzin: 'KKPR' });
    await svc.act(p.id, 'mulai-verifikasi');
    await svc.act(p.id, 'setujui');
    expect(log).toEqual(['created', 'reviewing', 'approved']);
  });

  it('list filters by status', async () => {
    const svc = new PermohonanService(new InMemoryPermohonanRepo(), new EventBus());
    const a = await svc.create({ pemohonId: 1, namaPemohon: 'A', jenisIzin: 'KKPR' });
    await svc.create({ pemohonId: 1, namaPemohon: 'B', jenisIzin: 'KKPR' });
    await svc.act(a.id, 'mulai-verifikasi');
    const verifikasi = await svc.list({ status: 'Verifikasi' });
    expect(verifikasi).toHaveLength(1);
    expect(verifikasi[0]?.namaPemohon).toBe('A');
  });
});
