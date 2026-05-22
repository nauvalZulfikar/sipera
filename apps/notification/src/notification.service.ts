import type { NotificationChannel } from './channels/types.js';
import type { NotificationQueue } from './queue/queue.js';
import { renderTemplate } from './templates/templates.js';

export interface DispatchInput {
  event: string;
  to: string;
  channels: NotificationChannel['name'][];
  variables?: Record<string, string>;
  locale?: 'id' | 'en';
}

export class NotificationService {
  constructor(private readonly queue: NotificationQueue) {}

  dispatch(input: DispatchInput): { enqueued: { channel: string; jobId: string }[] } {
    const locale = input.locale ?? 'id';
    const out: { channel: string; jobId: string }[] = [];
    for (const ch of input.channels) {
      const key = `${input.event}.${ch}.${locale}`;
      const rendered = renderTemplate(key, input.variables ?? {});
      if (!rendered) {
        // fallback: kirim raw event sebagai body
        const jobId = this.queue.enqueue(ch, {
          to: input.to,
          body: `Event: ${input.event} ${JSON.stringify(input.variables ?? {})}`,
        });
        out.push({ channel: ch, jobId });
        continue;
      }
      const jobId = this.queue.enqueue(ch, {
        to: input.to,
        ...(rendered.subject ? { subject: rendered.subject } : {}),
        body: rendered.body,
        ...(input.variables ? { variables: input.variables } : {}),
      });
      out.push({ channel: ch, jobId });
    }
    return { enqueued: out };
  }
}
