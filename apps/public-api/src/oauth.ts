import { createHmac, randomBytes } from 'node:crypto';

/**
 * Simple OAuth2 Client Credentials store.
 * Production: pakai DB + Vault untuk secret. Dev: in-memory.
 */

export interface ApiClient {
  clientId: string;
  clientSecret: string;
  name: string;
  scopes: string[];
  createdAt: string;
}

export interface AccessToken {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt: number;
}

export class OAuthStore {
  private clients = new Map<string, ApiClient>();
  private tokens = new Map<string, AccessToken>();

  registerClient(name: string, scopes: string[]): ApiClient {
    const clientId = `cli_${randomBytes(8).toString('hex')}`;
    const clientSecret = `sec_${randomBytes(24).toString('hex')}`;
    const c: ApiClient = {
      clientId,
      clientSecret,
      name,
      scopes,
      createdAt: new Date().toISOString(),
    };
    this.clients.set(clientId, c);
    return c;
  }

  issueToken(clientId: string, clientSecret: string): AccessToken | null {
    const c = this.clients.get(clientId);
    if (!c) return null;
    if (c.clientSecret !== clientSecret) return null;
    const token = `tok_${randomBytes(24).toString('hex')}`;
    const at: AccessToken = {
      token,
      clientId,
      scopes: c.scopes,
      expiresAt: Date.now() + 3600 * 1000,
    };
    this.tokens.set(token, at);
    return at;
  }

  verifyToken(token: string, requiredScope?: string): AccessToken | null {
    const at = this.tokens.get(token);
    if (!at) return null;
    if (at.expiresAt < Date.now()) {
      this.tokens.delete(token);
      return null;
    }
    if (requiredScope && !at.scopes.includes(requiredScope)) return null;
    return at;
  }

  listClients(): ApiClient[] {
    return [...this.clients.values()];
  }
}

/**
 * Webhook delivery: HMAC-signed POST ke subscriber URL.
 */
export interface WebhookSubscription {
  id: string;
  clientId: string;
  url: string;
  events: string[];
  secret: string;
}

export class WebhookStore {
  private subs = new Map<string, WebhookSubscription>();

  subscribe(clientId: string, url: string, events: string[]): WebhookSubscription {
    const id = `whk_${randomBytes(6).toString('hex')}`;
    const secret = `whs_${randomBytes(24).toString('hex')}`;
    const s: WebhookSubscription = { id, clientId, url, events, secret };
    this.subs.set(id, s);
    return s;
  }

  unsubscribe(id: string): boolean {
    return this.subs.delete(id);
  }

  /** Deliver event ke semua subscriber relevant. */
  async deliver(event: string, payload: unknown): Promise<{ delivered: number; failed: number }> {
    let delivered = 0;
    let failed = 0;
    for (const s of this.subs.values()) {
      if (!s.events.includes(event) && !s.events.includes('*')) continue;
      try {
        const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
        const signature = createHmac('sha256', s.secret).update(body).digest('hex');
        const res = await fetch(s.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-sipera-signature': signature,
            'x-sipera-event': event,
          },
          body,
        });
        if (res.ok) delivered++;
        else failed++;
      } catch {
        failed++;
      }
    }
    return { delivered, failed };
  }

  list(clientId: string): WebhookSubscription[] {
    return [...this.subs.values()].filter((s) => s.clientId === clientId);
  }
}
