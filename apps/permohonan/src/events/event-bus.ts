import type { PermohonanEventType } from '../workflow/state-machine.js';

export interface DomainEvent<T = unknown> {
  type: PermohonanEventType;
  permohonanId: string;
  timestamp: string;
  payload: T;
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => void | Promise<void>;

/**
 * Simple in-process event bus. Production swap dengan Kafka/NATS/Redis pub-sub.
 * Modul lain (notification, document, audit) subscribe ke event ini.
 */
export class EventBus {
  private handlers = new Map<PermohonanEventType, EventHandler[]>();

  on<T = unknown>(eventType: PermohonanEventType, handler: EventHandler<T>): void {
    const arr = this.handlers.get(eventType) ?? [];
    arr.push(handler as EventHandler);
    this.handlers.set(eventType, arr);
  }

  async emit<T = unknown>(event: DomainEvent<T>): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    for (const h of handlers) {
      try {
        await h(event);
      } catch (err) {
        // event handlers tidak boleh nge-block main flow — log & continue
        console.error(`[event-bus] handler failed for ${event.type}:`, err);
      }
    }
  }

  registeredTypes(): PermohonanEventType[] {
    return [...this.handlers.keys()];
  }
}
