export interface OtpDeliveryProvider {
  send(noTelp: string, code: string, purpose: string): Promise<void>;
  name: string;
}

/**
 * Console provider — print OTP to stdout. Default untuk dev.
 * Production WAJIB swap ke TwilioProvider / WavecellProvider.
 */
export class ConsoleOtpProvider implements OtpDeliveryProvider {
  name = 'console';

  send(noTelp: string, code: string, purpose: string): Promise<void> {
    console.log(`[otp:console] ${purpose} → ${noTelp} → ${code}`);
    return Promise.resolve();
  }
}

/**
 * Twilio provider stub — implementasi sebenarnya butuh akun Twilio (account SID + auth token).
 * Saat aktif: hit https://api.twilio.com/2010-04-01/Accounts/.../Messages.json
 */
export class TwilioOtpProvider implements OtpDeliveryProvider {
  name = 'twilio';

  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly fromNumber: string,
  ) {}

  async send(noTelp: string, code: string, purpose: string): Promise<void> {
    if (!this.accountSid || !this.authToken) {
      throw new Error('twilio credentials missing');
    }
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: noTelp,
      From: this.fromNumber,
      Body: `Kode ${purpose} Sipera: ${code}. Berlaku 5 menit. Jangan dibagikan.`,
    });
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${auth}`,
      },
      body,
    });
    if (!res.ok) {
      throw new Error(`twilio send failed: ${res.status} ${await res.text()}`);
    }
  }
}
