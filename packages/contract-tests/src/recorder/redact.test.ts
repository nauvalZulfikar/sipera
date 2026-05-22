import { describe, expect, it } from 'vitest';
import { redactBody, redactHeaders } from './redact.js';

describe('redactHeaders', () => {
  it('replaces matched headers case-insensitively', () => {
    const out = redactHeaders({ Authorization: 'Bearer xyz', Accept: 'application/json' }, [
      'authorization',
    ]);
    expect(out['Authorization']).toBe('<REDACTED>');
    expect(out['Accept']).toBe('application/json');
  });

  it('leaves untouched headers alone', () => {
    const out = redactHeaders({ 'X-Trace-Id': 'abc' }, ['authorization']);
    expect(out['X-Trace-Id']).toBe('abc');
  });
});

describe('redactBody', () => {
  it('redacts top-level fields', () => {
    const out = redactBody({ username: 'admin', password: 's3cret' }, ['password']);
    expect(out).toEqual({ username: 'admin', password: '<REDACTED>' });
  });

  it('redacts nested fields recursively', () => {
    const out = redactBody({ user: { name: 'a', otp_code: '123456' } }, ['otp_code']);
    expect(out).toEqual({ user: { name: 'a', otp_code: '<REDACTED>' } });
  });

  it('handles arrays of objects', () => {
    const out = redactBody([{ password: 'x' }, { password: 'y' }], ['password']);
    expect(out).toEqual([{ password: '<REDACTED>' }, { password: '<REDACTED>' }]);
  });

  it('passes through primitives', () => {
    expect(redactBody(42, ['password'])).toBe(42);
    expect(redactBody('hello', ['password'])).toBe('hello');
    expect(redactBody(null, ['password'])).toBe(null);
  });

  it('is case-insensitive for field names', () => {
    const out = redactBody({ Password: 'abc' }, ['password']);
    expect(out).toEqual({ Password: '<REDACTED>' });
  });
});
