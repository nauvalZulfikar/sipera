import { describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { IUserRepository, UserRecord } from '@sipera/data-access';
import { LoginService } from './login.service.js';

function fakeUser(over: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 1,
    nama: 'Test',
    username: 'test',
    email: 'test@test',
    noTelp: '081',
    role: 'admin',
    password: bcrypt.hashSync('correct', 8),
    foto: null,
    status: 'aktif',
    catatan: null,
    instansi: 'Dinas',
    blockedAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

function mockUsers(user: UserRecord | null): IUserRepository {
  return {
    findByNoTelp: vi.fn().mockResolvedValue(user),
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    listActive: vi.fn(),
    countActive: vi.fn(),
  };
}

const secret = 'test-secret';

describe('LoginService', () => {
  it('returns user + JWT on valid credentials', async () => {
    const svc = new LoginService({
      users: mockUsers(fakeUser()),
      jwtSecret: secret,
      jwtTtlSeconds: 60,
    });
    const r = await svc.login({ noTelp: '081', password: 'correct' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const decoded = jwt.verify(r.user.api_token, secret) as { id: number; role: string };
      expect(decoded.id).toBe(1);
      expect(decoded.role).toBe('admin');
    }
  });

  it('rejects unknown user', async () => {
    const svc = new LoginService({ users: mockUsers(null), jwtSecret: secret, jwtTtlSeconds: 60 });
    const r = await svc.login({ noTelp: '999', password: 'x' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('user_not_found');
  });

  it('rejects wrong password', async () => {
    const svc = new LoginService({
      users: mockUsers(fakeUser()),
      jwtSecret: secret,
      jwtTtlSeconds: 60,
    });
    const r = await svc.login({ noTelp: '081', password: 'wrong' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('invalid_password');
  });

  it('rejects blocked user', async () => {
    const svc = new LoginService({
      users: mockUsers(fakeUser({ blockedAt: new Date() })),
      jwtSecret: secret,
      jwtTtlSeconds: 60,
    });
    const r = await svc.login({ noTelp: '081', password: 'correct' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('blocked');
  });

  it('rejects deleted user', async () => {
    const svc = new LoginService({
      users: mockUsers(fakeUser({ deletedAt: new Date() })),
      jwtSecret: secret,
      jwtTtlSeconds: 60,
    });
    const r = await svc.login({ noTelp: '081', password: 'correct' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('deleted');
  });
});
