/** Dinas-specific API: action endpoints (approve/reject/revisi). */
import { api, type Permohonan } from './api.js';

export const dinasApi = {
  listAll: (token: string, status?: string) =>
    api<{ data: Permohonan[] }>(
      `/permohonan${status ? `?status=${encodeURIComponent(status)}` : ''}`,
      {
        token,
      },
    ),
  // List items don't carry availableActions — fetch the full record for the
  // detail panel so the action buttons (verifikasi/setujui/tolak/…) render.
  byId: (id: string, token: string) => api<Permohonan>(`/permohonan/${id}`, { token }),
  act: (
    id: string,
    action:
      | 'mulai-verifikasi'
      | 'setujui'
      | 'tolak'
      | 'minta-revisi'
      | 'submit-revisi'
      | 'selesaikan'
      | 'expire',
    token: string,
    catatan?: string,
  ) =>
    api<Permohonan>(`/permohonan/${id}/action`, {
      method: 'POST',
      body: catatan ? { action, catatan } : { action },
      token,
    }),
};
