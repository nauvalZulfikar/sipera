/**
 * Recording = satu interaksi request/response yang dicapture dari sistem vendor.
 * Jadi sumber kebenaran untuk contract test modul baru.
 */
export interface Recording {
  id: string;
  recordedAt: string;
  request: {
    method: string;
    path: string;
    query: Record<string, string>;
    headers: Record<string, string>;
    body: unknown;
  };
  response: {
    status: number;
    headers: Record<string, string>;
    body: unknown;
    durationMs: number;
  };
}

export interface RecorderConfig {
  upstreamUrl: string;
  outputDir: string;
  port: number;
  /** Header sensitif yang di-redact dari recording (mis. Authorization, Cookie) */
  redactHeaders: string[];
  /** Field body yang di-redact (mis. password, otp_code) */
  redactBodyFields: string[];
}
