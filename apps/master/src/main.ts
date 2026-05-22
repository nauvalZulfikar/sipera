import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getPrisma, WilayahRepository, KbliRepository } from '@sipera/data-access';
import { WilayahService } from './wilayah/wilayah.service.js';
import { KbliService } from './kbli/kbli.service.js';
import { registerRoutes } from './http/routes.js';

async function main() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  await app.register(cors, { origin: true });

  const prisma = getPrisma();
  const wilayah = new WilayahService(new WilayahRepository(prisma));
  const kbli = new KbliService(new KbliRepository(prisma));

  registerRoutes(app, { wilayah, kbli });

  const port = Number(process.env.PORT ?? 4003);
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info({ port }, 'master module listening');
}

main().catch((err: unknown) => {
  console.error('master startup failed:', err);
  process.exit(1);
});
