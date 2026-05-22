import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface StoredFile {
  key: string;
  size: number;
  sha256: string;
  mimeType: string;
  storedAt: string;
}

export interface FileStorage {
  name: string;
  put(key: string, data: Buffer, mimeType: string): Promise<StoredFile>;
  get(key: string): Promise<Buffer | null>;
  stat(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
}

/** Local filesystem storage — default untuk dev. */
export class LocalFileStorage implements FileStorage {
  name = 'local';
  private metaCache = new Map<string, StoredFile>();

  constructor(private readonly rootDir: string) {}

  async put(key: string, data: Buffer, mimeType: string): Promise<StoredFile> {
    const path = this.pathFor(key);
    await mkdir(this.pathFor(key).split(/[\\/]/).slice(0, -1).join('/'), { recursive: true });
    await writeFile(path, data);
    const sha256 = createHash('sha256').update(data).digest('hex');
    const meta: StoredFile = {
      key,
      size: data.length,
      sha256,
      mimeType,
      storedAt: new Date().toISOString(),
    };
    this.metaCache.set(key, meta);
    return meta;
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.pathFor(key));
    } catch {
      return null;
    }
  }

  async stat(key: string): Promise<StoredFile | null> {
    const cached = this.metaCache.get(key);
    if (cached) return cached;
    try {
      const s = await stat(this.pathFor(key));
      const data = await readFile(this.pathFor(key));
      const sha256 = createHash('sha256').update(data).digest('hex');
      return {
        key,
        size: s.size,
        sha256,
        mimeType: 'application/octet-stream',
        storedAt: s.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const { unlink } = await import('node:fs/promises');
    try {
      await unlink(this.pathFor(key));
      this.metaCache.delete(key);
    } catch {
      /* ignore */
    }
  }

  private pathFor(key: string): string {
    return resolve(join(this.rootDir, key));
  }
}

/** Stub buat S3/MinIO. Implementasi via @aws-sdk/client-s3 — perlu tim setup credentials. */
export class S3FileStorage implements FileStorage {
  name = 's3';
  constructor(
    private readonly bucket: string,
    private readonly endpoint?: string,
  ) {}

  put(_key: string, _data: Buffer, _mimeType: string): Promise<StoredFile> {
    throw new Error(
      `S3FileStorage.put not implemented yet (bucket=${this.bucket} endpoint=${this.endpoint ?? 'aws'})`,
    );
  }
  get(_key: string): Promise<Buffer | null> {
    throw new Error('S3FileStorage.get not implemented');
  }
  stat(_key: string): Promise<StoredFile | null> {
    throw new Error('S3FileStorage.stat not implemented');
  }
  delete(_key: string): Promise<void> {
    throw new Error('S3FileStorage.delete not implemented');
  }
}
