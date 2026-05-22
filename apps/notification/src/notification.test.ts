import { describe, expect, it } from 'vitest';
import { NotificationQueue } from './queue/queue.js';
import { ConsoleSmsChannel, ConsoleEmailChannel } from './channels/implementations.js';
import { NotificationService } from './notification.service.js';
import { renderTemplate } from './templates/templates.js';

describe('renderTemplate', () => {
  it('renders id locale with variables', () => {
    const r = renderTemplate('permohonan.approved.sms.id', { nomorPermohonan: 'KKPR-001' });
    expect(r?.body).toContain('KKPR-001');
    expect(r?.body).toContain('DISETUJUI');
  });

  it('returns null for unknown template', () => {
    expect(renderTemplate('unknown.key', {})).toBeNull();
  });

  it('keeps placeholder when variable missing', () => {
    const r = renderTemplate('auth.otp.sms.id', { code: '123456' });
    expect(r?.body).toContain('123456');
    expect(r?.body).toContain('{{purpose}}'); // not provided → kept as-is
  });
});

describe('NotificationService.dispatch + Queue', () => {
  it('enqueues + delivers via SMS + Email in parallel', async () => {
    const queue = new NotificationQueue();
    const sms = new ConsoleSmsChannel();
    const email = new ConsoleEmailChannel();
    queue.registerChannel(sms);
    queue.registerChannel(email);
    const svc = new NotificationService(queue);

    svc.dispatch({
      event: 'permohonan.approved',
      to: '081234567890',
      channels: ['sms', 'email'],
      variables: { nomorPermohonan: 'P-001', namaPemohon: 'Budi' },
    });

    await queue.drain();
    const results = queue.getResults();
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.result.ok)).toBe(true);
    expect(sms.getSent()[0]?.body).toContain('P-001');
    expect(email.getSent()[0]?.subject).toContain('P-001');
  });

  it('retries failing channel up to maxAttempts', async () => {
    const queue = new NotificationQueue();
    let attempt = 0;
    queue.registerChannel({
      name: 'sms',
      send: async () => {
        attempt++;
        if (attempt < 3) throw new Error('boom');
        return { ok: true };
      },
    });
    const svc = new NotificationService(queue);
    svc.dispatch({ event: 'auth.otp', to: '081', channels: ['sms'], variables: { code: '1' } });
    await queue.drain();
    expect(attempt).toBe(3);
    expect(queue.getResults()[0]?.result.ok).toBe(true);
  });

  it('returns fallback for unknown event', async () => {
    const queue = new NotificationQueue();
    const sms = new ConsoleSmsChannel();
    queue.registerChannel(sms);
    const svc = new NotificationService(queue);
    svc.dispatch({ event: 'unknown.event', to: '081', channels: ['sms'] });
    await queue.drain();
    expect(sms.getSent()[0]?.body).toContain('Event: unknown.event');
  });
});
