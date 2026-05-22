import { expect, test } from '@playwright/test';

const GATEWAY = process.env.GATEWAY_URL ?? 'http://localhost:5200';

test.describe('API smoke via gateway', () => {
  test('gateway health', async ({ request }) => {
    const res = await request.get(`${GATEWAY}/_health`);
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');
  });

  test('POST /auth/login returns 201 + JWT', async ({ request }) => {
    const res = await request.post(`${GATEWAY}/auth/login`, {
      data: { no_telp: '081234567890', password: 'Masuk123@' },
    });
    expect(res.status()).toBe(201);
    const body = (await res.json()) as { api_token: string; role: string };
    expect(body.api_token).toBeTruthy();
    expect(body.role).toBe('admin');
  });

  test('POST /spatial/intersect returns zona + ITBX decision', async ({ request }) => {
    const res = await request.post(`${GATEWAY}/rdtr/intersect`, {
      data: {
        polygon: {
          coordinates: [
            [107.55, -6.95],
            [107.56, -6.95],
            [107.56, -6.94],
            [107.55, -6.94],
          ],
        },
        kbliCodes: ['41011'],
      },
    });
    if (res.status() === 404) test.skip(); // route not flipped to 'new' yet
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as {
      decision?: { decision: string };
      zonas: unknown[];
    };
    expect(body.zonas.length).toBeGreaterThan(0);
  });
});
