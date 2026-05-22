export interface NotificationPayload {
  to: string;
  subject?: string;
  body: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export interface DeliveryResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}

export interface NotificationChannel {
  name: 'sms' | 'email' | 'websocket' | 'inapp';
  send(payload: NotificationPayload): Promise<DeliveryResult>;
}
