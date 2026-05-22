import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getPrisma, UserRepository, registerObservability } from '@sipera/data-access';
import { LoginService } from './auth/login.service.js';
import { OtpService, InMemoryOtpStore } from './otp/otp.service.js';
import { ConsoleOtpProvider } from './otp/providers.js';
import { registerRoutes } from './http/routes.js';

async function main() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  await app.register(cors, { origin: true });

  const prisma = getPrisma();
  const users = new UserRepository(prisma);
  const loginService = new LoginService({
    users,
    jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
    jwtTtlSeconds: Number(process.env.JWT_TTL ?? 60 * 60 * 24),
  });

  const otpStore = new InMemoryOtpStore();
  const otpProvider = new ConsoleOtpProvider();
  const otpService = new OtpService({ store: otpStore, provider: otpProvider });

  registerObservability(app, 'identity');
  registerRoutes(app, { loginService, otpService });

  const port = Number(process.env.PORT ?? 4002);
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info({ port }, 'identity module listening');
}

main().catch((err: unknown) => {
  console.error('identity startup failed:', err);
  process.exit(1);
});
