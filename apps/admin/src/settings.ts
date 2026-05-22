/**
 * Settings store. Production: pakai DB table `system_settings`.
 * Dev: in-memory + JSON file persistence.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
  updatedBy?: string;
}

export class SettingsStore {
  private cache = new Map<string, Setting>();
  private loaded = false;

  constructor(private readonly filePath: string) {}

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const data = JSON.parse(raw) as Setting[];
      for (const s of data) this.cache.set(s.key, s);
    } catch {
      // first run, no file yet — start with defaults
      for (const s of DEFAULTS) this.cache.set(s.key, s);
      await this.persist();
    }
    this.loaded = true;
  }

  async get(key: string): Promise<Setting | null> {
    await this.ensureLoaded();
    return this.cache.get(key) ?? null;
  }

  async list(): Promise<Setting[]> {
    await this.ensureLoaded();
    return [...this.cache.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  async set(key: string, value: string, updatedBy?: string): Promise<Setting> {
    await this.ensureLoaded();
    const s: Setting = {
      key,
      value,
      updatedAt: new Date().toISOString(),
      ...(updatedBy ? { updatedBy } : {}),
    };
    this.cache.set(key, s);
    await this.persist();
    return s;
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify([...this.cache.values()], null, 2));
  }
}

const DEFAULTS: Setting[] = [
  { key: 'permohonan.max_per_day', value: '10', updatedAt: new Date(0).toISOString() },
  { key: 'permohonan.expire_days', value: '30', updatedAt: new Date(0).toISOString() },
  { key: 'otp.ttl_seconds', value: '300', updatedAt: new Date(0).toISOString() },
  { key: 'otp.max_per_hour', value: '5', updatedAt: new Date(0).toISOString() },
  { key: 'jwt.ttl_hours', value: '24', updatedAt: new Date(0).toISOString() },
  {
    key: 'notification.default_channels',
    value: 'sms,inapp',
    updatedAt: new Date(0).toISOString(),
  },
];
