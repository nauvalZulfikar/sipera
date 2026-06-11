import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { LoginService } from '../auth/login.service.js';
import type { OtpService } from '../otp/otp.service.js';

const loginSchema = z.object({
  no_telp: z.string().min(8).max(20),
  password: z.string().min(1).max(128),
});

const otpGenerateSchema = z.object({
  no_telp: z.string().min(8).max(20),
  purpose: z.enum(['Login', 'Register', 'ResetPassword']).default('Login'),
});

const otpValidateSchema = z.object({
  no_telp: z.string().min(8).max(20),
  purpose: z.enum(['Login', 'Register', 'ResetPassword']).default('Login'),
  code: z.string().length(6),
});

export interface RouteDeps {
  loginService: LoginService;
  otpService: OtpService;
}

export function registerRoutes(app: FastifyInstance, deps: RouteDeps): void {
  app.get('/_health', () => ({ status: 'ok', service: 'identity' }));

  app.post('/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_error', issues: parsed.error.issues };
    }
    const result = await deps.loginService.login({
      noTelp: parsed.data.no_telp,
      password: parsed.data.password,
    });
    if (!result.ok) {
      reply.code(401);
      return { error: 'login_failed', code: result.code };
    }
    reply.code(201);
    return result.user;
  });

  app.post('/auth/otp/generate', async (req, reply) => {
    const parsed = otpGenerateSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_error', issues: parsed.error.issues };
    }
    const r = await deps.otpService.generate({
      noTelp: parsed.data.no_telp,
      purpose: parsed.data.purpose,
    });
    if (!r.ok) {
      reply.code(429);
      return { error: 'rate_limit', retryAfter: r.retryAfterSeconds };
    }
    return { sent: true, ttlSeconds: r.ttlSeconds };
  });

  app.post('/auth/otp/validate', async (req, reply) => {
    const parsed = otpValidateSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_error', issues: parsed.error.issues };
    }
    const r = await deps.otpService.validate(
      parsed.data.no_telp,
      parsed.data.purpose,
      parsed.data.code,
    );
    if (!r.ok) {
      if (r.code === 'locked_out') {
        reply.code(429);
        return { error: 'otp_locked', retryAfter: r.retryAfterSeconds };
      }
      reply.code(401);
      return { error: 'invalid_otp' };
    }
    return { valid: true };
  });
}
