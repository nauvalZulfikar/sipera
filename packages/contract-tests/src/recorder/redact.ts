const REDACTED = '<REDACTED>';

export function redactHeaders(
  headers: Record<string, string>,
  redactList: string[],
): Record<string, string> {
  const lowerSet = new Set(redactList.map((h) => h.toLowerCase()));
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = lowerSet.has(key.toLowerCase()) ? REDACTED : value;
  }
  return out;
}

export function redactBody(body: unknown, fields: string[]): unknown {
  if (body === null || typeof body !== 'object') return body;
  if (Array.isArray(body)) return body.map((item) => redactBody(item, fields));
  const fieldSet = new Set(fields.map((f) => f.toLowerCase()));
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    out[key] = fieldSet.has(key.toLowerCase()) ? REDACTED : redactBody(value, fields);
  }
  return out;
}
