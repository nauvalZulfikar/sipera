import { describe, expect, it } from 'vitest';
import { NotificationWsServer } from './ws-server.js';

describe('NotificationWsServer', () => {
  it('starts with zero connections', () => {
    const s = new NotificationWsServer();
    expect(s.stats().total).toBe(0);
  });

  it('pushTo returns 0 when no connections', () => {
    const s = new NotificationWsServer();
    const sent = s.pushTo('user-1', { msg: 'hi' });
    expect(sent).toBe(0);
  });

  it('broadcast returns 0 with no connections', () => {
    const s = new NotificationWsServer();
    expect(s.broadcast({ msg: 'all' })).toBe(0);
  });
});
