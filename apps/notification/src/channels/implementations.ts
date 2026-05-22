import type { NotificationChannel, NotificationPayload, DeliveryResult } from './types.js';

/** Default dev channel: cuma print ke console. Production swap dengan TwilioSms / SendGridEmail. */
export class ConsoleSmsChannel implements NotificationChannel {
  name = 'sms' as const;
  private sent: NotificationPayload[] = [];

  send(payload: NotificationPayload): Promise<DeliveryResult> {
    this.sent.push(payload);
    console.log(`[sms:console] → ${payload.to}: ${payload.body}`);
    return Promise.resolve({ ok: true, providerId: `console-${Date.now()}` });
  }

  /** Inspection helper untuk test. */
  getSent(): readonly NotificationPayload[] {
    return this.sent;
  }
}

export class ConsoleEmailChannel implements NotificationChannel {
  name = 'email' as const;
  private sent: NotificationPayload[] = [];

  send(payload: NotificationPayload): Promise<DeliveryResult> {
    this.sent.push(payload);
    console.log(`[email:console] → ${payload.to} | ${payload.subject ?? ''}\n${payload.body}`);
    return Promise.resolve({ ok: true, providerId: `console-${Date.now()}` });
  }

  getSent(): readonly NotificationPayload[] {
    return this.sent;
  }
}

/** WebSocket channel — push ke client yang lagi connect. Implementasi via Socket.IO server. */
export class WebSocketChannel implements NotificationChannel {
  name = 'websocket' as const;

  constructor(private readonly emit: (userId: string, event: string, data: unknown) => void) {}

  send(payload: NotificationPayload): Promise<DeliveryResult> {
    this.emit(payload.to, 'notification', { body: payload.body, variables: payload.variables });
    return Promise.resolve({ ok: true });
  }
}

/** In-app channel — simpan ke DB (notifikasi tab), user fetch via API. */
export class InAppChannel implements NotificationChannel {
  name = 'inapp' as const;

  constructor(
    private readonly save: (userId: string, body: string, meta?: unknown) => Promise<void>,
  ) {}

  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    await this.save(payload.to, payload.body, payload.variables);
    return { ok: true };
  }
}
