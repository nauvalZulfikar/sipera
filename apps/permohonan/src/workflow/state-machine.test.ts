import { describe, expect, it } from 'vitest';
import { transition, isTerminal, allowedActions } from './state-machine.js';

describe('state machine', () => {
  it('Baru → Verifikasi via mulai-verifikasi', () => {
    const r = transition('Baru', 'mulai-verifikasi');
    expect(r.ok).toBe(true);
    expect(r.nextStatus).toBe('Verifikasi');
    expect(r.event).toBe('PermohonanReviewing');
  });

  it('Verifikasi → Disetujui via setujui', () => {
    const r = transition('Verifikasi', 'setujui');
    expect(r.nextStatus).toBe('Disetujui');
  });

  it('Verifikasi → Revisi via minta-revisi', () => {
    expect(transition('Verifikasi', 'minta-revisi').nextStatus).toBe('Revisi');
  });

  it('Revisi → Verifikasi via submit-revisi', () => {
    expect(transition('Revisi', 'submit-revisi').nextStatus).toBe('Verifikasi');
  });

  it('Disetujui → Selesai via selesaikan', () => {
    expect(transition('Disetujui', 'selesaikan').nextStatus).toBe('Selesai');
  });

  it('cannot setujui from Baru (must mulai-verifikasi first)', () => {
    expect(transition('Baru', 'setujui').ok).toBe(false);
  });

  it('cannot revert from Disetujui to Verifikasi', () => {
    expect(transition('Disetujui', 'mulai-verifikasi').ok).toBe(false);
  });

  it('terminal states have no transitions', () => {
    expect(isTerminal('Selesai')).toBe(true);
    expect(isTerminal('Ditolak')).toBe(true);
    expect(isTerminal('Kadaluarsa')).toBe(true);
    expect(isTerminal('Baru')).toBe(false);
  });

  it('expire from any non-terminal state', () => {
    expect(transition('Baru', 'expire').nextStatus).toBe('Kadaluarsa');
    expect(transition('Verifikasi', 'expire').nextStatus).toBe('Kadaluarsa');
    expect(transition('Revisi', 'expire').nextStatus).toBe('Kadaluarsa');
  });

  it('allowedActions returns valid actions for each state', () => {
    expect(allowedActions('Baru')).toEqual(['mulai-verifikasi', 'expire']);
    expect(allowedActions('Selesai')).toEqual([]);
  });
});
