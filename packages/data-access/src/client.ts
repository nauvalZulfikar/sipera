import { PrismaClient } from '@prisma/client';

let _client: PrismaClient | undefined;

/**
 * Singleton Prisma client. Lazy-initialized supaya test bisa swap before first call.
 */
export function getPrisma(): PrismaClient {
  if (!_client) {
    _client = new PrismaClient({
      log: process.env.PRISMA_LOG === '1' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return _client;
}

export function setPrismaForTest(client: PrismaClient): void {
  _client = client;
}

export function resetPrismaForTest(): void {
  _client = undefined;
}
