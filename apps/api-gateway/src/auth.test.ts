import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { isAuthorized } from './auth.js';

const SECRET = 'test-secret';

/** Mint a JWT the way identity's HS256 signer does — no external dep. */
function mint(
  payload: Record<string, unknown>,
  opts: { secret?: string; alg?: string } = {},
): string {
  const b64 = (o: object): string => Buffer.from(JSON.stringify(o)).toString('base64url');
  const header = b64({ alg: opts.alg ?? 'HS256', typ: 'JWT' });
  const body = b64(payload);
  const sig = createHmac('sha256', opts.secret ?? SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

describe('isAuthorized', () => {
  it('accepts a valid Bearer token', () => {
    expect(isAuthorized(`Bearer ${mint({ sub: 1 })}`, SECRET)).toBe(true);
  });

  it('rejects when header is missing', () => {
    expect(isAuthorized(undefined, SECRET)).toBe(false);
  });

  it('rejects header without Bearer prefix', () => {
    expect(isAuthorized(mint({ sub: 1 }), SECRET)).toBe(false);
  });

  it('rejects empty Bearer token', () => {
    expect(isAuthorized('Bearer ', SECRET)).toBe(false);
  });

  it('rejects token signed with a different secret', () => {
    expect(isAuthorized(`Bearer ${mint({ sub: 1 }, { secret: 'other' })}`, SECRET)).toBe(false);
  });

  it('rejects an expired token', () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    expect(isAuthorized(`Bearer ${mint({ sub: 1, exp: past })}`, SECRET)).toBe(false);
  });

  it('accepts a not-yet-expired token', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(isAuthorized(`Bearer ${mint({ sub: 1, exp: future })}`, SECRET)).toBe(true);
  });

  it('rejects the alg-confusion "none" token', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ sub: 1 })).toString('base64url');
    expect(isAuthorized(`Bearer ${header}.${body}.`, SECRET)).toBe(false);
  });

  it('rejects a malformed token', () => {
    expect(isAuthorized('Bearer not.a.jwt', SECRET)).toBe(false);
  });

  it('handles array header (takes first value)', () => {
    expect(isAuthorized([`Bearer ${mint({ sub: 1 })}`], SECRET)).toBe(true);
  });
});
