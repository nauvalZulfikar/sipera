import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ no_telp: '081234567890', password: 'Masuk123@' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, {
    'status is 201': (r) => r.status === 201,
    'has api_token': (r) => r.json('api_token') !== undefined,
  });
  sleep(1);
}
