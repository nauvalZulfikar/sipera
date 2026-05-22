export type PermohonanStatus =
  | 'Baru'
  | 'Verifikasi'
  | 'Revisi'
  | 'Disetujui'
  | 'Ditolak'
  | 'Selesai'
  | 'Kadaluarsa';

export type PermohonanEventType =
  | 'PermohonanCreated'
  | 'PermohonanReviewing'
  | 'PermohonanApproved'
  | 'PermohonanRejected'
  | 'PermohonanRevisiRequested'
  | 'PermohonanResubmitted'
  | 'PermohonanCompleted'
  | 'PermohonanExpired';

export type PermohonanAction =
  | 'submit'
  | 'mulai-verifikasi'
  | 'setujui'
  | 'tolak'
  | 'minta-revisi'
  | 'submit-revisi'
  | 'selesaikan'
  | 'expire';

/** Map (status, action) → status berikutnya. Kalau gak ada di map, transition ditolak. */
const TRANSITIONS: Record<PermohonanStatus, Partial<Record<PermohonanAction, PermohonanStatus>>> = {
  Baru: {
    'mulai-verifikasi': 'Verifikasi',
    expire: 'Kadaluarsa',
  },
  Verifikasi: {
    setujui: 'Disetujui',
    tolak: 'Ditolak',
    'minta-revisi': 'Revisi',
    expire: 'Kadaluarsa',
  },
  Revisi: {
    'submit-revisi': 'Verifikasi',
    expire: 'Kadaluarsa',
  },
  Disetujui: {
    selesaikan: 'Selesai',
  },
  Ditolak: {},
  Selesai: {},
  Kadaluarsa: {},
};

const ACTION_TO_EVENT: Record<PermohonanAction, PermohonanEventType> = {
  submit: 'PermohonanCreated',
  'mulai-verifikasi': 'PermohonanReviewing',
  setujui: 'PermohonanApproved',
  tolak: 'PermohonanRejected',
  'minta-revisi': 'PermohonanRevisiRequested',
  'submit-revisi': 'PermohonanResubmitted',
  selesaikan: 'PermohonanCompleted',
  expire: 'PermohonanExpired',
};

export interface TransitionResult {
  ok: boolean;
  nextStatus?: PermohonanStatus;
  event?: PermohonanEventType;
  error?: string;
}

export function transition(current: PermohonanStatus, action: PermohonanAction): TransitionResult {
  const next = TRANSITIONS[current][action];
  if (!next) {
    return { ok: false, error: `cannot ${action} from ${current}` };
  }
  return { ok: true, nextStatus: next, event: ACTION_TO_EVENT[action] };
}

export function isTerminal(status: PermohonanStatus): boolean {
  return Object.keys(TRANSITIONS[status]).length === 0;
}

export function allowedActions(status: PermohonanStatus): PermohonanAction[] {
  return Object.keys(TRANSITIONS[status]) as PermohonanAction[];
}
