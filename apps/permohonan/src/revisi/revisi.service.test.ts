import { describe, expect, it, vi } from 'vitest';
import { RevisiService, InMemoryRevisiRepo } from './revisi.service.js';

function makeService(stateOk = true) {
  const repo = new InMemoryRevisiRepo();
  const trigger = vi.fn().mockResolvedValue({ ok: stateOk });
  const audit = vi.fn().mockResolvedValue(undefined);
  const svc = new RevisiService({
    repo,
    triggerStateMachine: trigger,
    logAudit: audit,
  });
  return { svc, repo, trigger, audit };
}

const validInput = {
  permohonanId: 'perm-1',
  catatanPerbaikan: 'NPWP tidak jelas, mohon upload ulang dengan resolusi lebih tinggi.',
  replacementFiles: [
    {
      slot: 'NIB_OSS',
      fileName: 'nib-baru.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      storageKey: 'perm-1/NIB_OSS/abc',
      sha256: 'a'.repeat(64),
      replacesId: 5,
    },
  ],
};

describe('RevisiService.submitRevisi', () => {
  it('records history + triggers state + logs audit on happy path', async () => {
    const { svc, trigger, audit } = makeService(true);
    const r = await svc.submitRevisi(validInput, 'warga1');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.history.fileCount).toBe(1);
      expect(r.history.submittedBy).toBe('warga1');
      expect(r.stateTransitioned).toBe(true);
    }
    expect(trigger).toHaveBeenCalledOnce();
    expect(audit).toHaveBeenCalledOnce();
  });

  it('rejects catatan terlalu pendek', async () => {
    const { svc } = makeService();
    const r = await svc.submitRevisi({ ...validInput, catatanPerbaikan: 'x' }, 'warga');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('catatan_too_short');
  });

  it('rejects kalau tidak ada file replacement', async () => {
    const { svc } = makeService();
    const r = await svc.submitRevisi({ ...validInput, replacementFiles: [] }, 'warga');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('no_files');
  });

  it('history listed newest first', async () => {
    const { svc } = makeService();
    await svc.submitRevisi(validInput, 'warga');
    await new Promise((r) => setTimeout(r, 5));
    await svc.submitRevisi(
      { ...validInput, catatanPerbaikan: 'Revisi kedua untuk dokumen lainnya juga' },
      'warga',
    );
    const history = await svc.listHistory('perm-1');
    expect(history).toHaveLength(2);
    expect(history[0]?.catatan).toContain('kedua');
    expect(history[1]?.catatan).toContain('NPWP');
  });

  it('records still happens even if state transition fails (no rollback by design)', async () => {
    const { svc, repo } = makeService(false);
    const r = await svc.submitRevisi(validInput, 'warga');
    expect(r.ok).toBe(true); // history saved
    if (r.ok) expect(r.stateTransitioned).toBe(false);
    const all = await repo.listHistory('perm-1');
    expect(all).toHaveLength(1);
  });
});
