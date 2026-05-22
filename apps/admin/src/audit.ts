/**
 * Audit log store. Production: DB table dengan partitioning per bulan.
 * Dev: in-memory ring buffer + optional file persistence.
 */

export interface AuditEntry {
  id: number;
  timestamp: string;
  actor: string; // user id atau service name
  action: string; // mis. 'permohonan.approve', 'setting.update'
  resource: string; // mis. 'permohonan/123'
  ip?: string;
  meta?: Record<string, unknown>;
}

export class AuditStore {
  private entries: AuditEntry[] = [];
  private nextId = 1;
  private maxEntries: number;

  constructor(maxEntries = 10000) {
    this.maxEntries = maxEntries;
  }

  log(input: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const entry: AuditEntry = {
      id: this.nextId++,
      timestamp: new Date().toISOString(),
      ...input,
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
    return entry;
  }

  query(
    filter: {
      actor?: string;
      action?: string;
      resource?: string;
      from?: string;
      to?: string;
      limit?: number;
    } = {},
  ): AuditEntry[] {
    let result = this.entries;
    if (filter.actor) result = result.filter((e) => e.actor === filter.actor);
    if (filter.action) result = result.filter((e) => e.action.startsWith(filter.action!));
    if (filter.resource) result = result.filter((e) => e.resource.startsWith(filter.resource!));
    if (filter.from) result = result.filter((e) => e.timestamp >= filter.from!);
    if (filter.to) result = result.filter((e) => e.timestamp <= filter.to!);
    return result.slice(-1 * (filter.limit ?? 100)).reverse();
  }

  count(): number {
    return this.entries.length;
  }
}
