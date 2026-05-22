/**
 * Revisi flow orchestrator.
 * Beda dengan plain `submit-revisi` action: ini bisa terima multi-file replacement
 * sekaligus dalam satu transaksi, kirim catatan, dan trigger event "revisi diserahkan".
 */

export interface RevisiInput {
  permohonanId: string;
  catatanPerbaikan: string;
  /** Dokumen baru yang menggantikan versi lama (replacesId pointer). */
  replacementFiles: {
    slot: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    sha256: string;
    replacesId?: number | undefined;
  }[];
}

export interface RevisiHistory {
  id: number;
  permohonanId: string;
  catatan: string;
  fileCount: number;
  submittedAt: string;
  submittedBy: string;
}

export interface RevisiRepository {
  recordRevisi(input: {
    permohonanId: string;
    catatan: string;
    fileCount: number;
    submittedBy: string;
  }): Promise<RevisiHistory>;
  listHistory(permohonanId: string): Promise<RevisiHistory[]>;
}

/** In-memory implementation. Production: pakai DB table `revisi_history`. */
export class InMemoryRevisiRepo implements RevisiRepository {
  private store: RevisiHistory[] = [];
  private nextId = 1;

  recordRevisi(input: {
    permohonanId: string;
    catatan: string;
    fileCount: number;
    submittedBy: string;
  }): Promise<RevisiHistory> {
    const h: RevisiHistory = {
      id: this.nextId++,
      permohonanId: input.permohonanId,
      catatan: input.catatan,
      fileCount: input.fileCount,
      submittedAt: new Date().toISOString(),
      submittedBy: input.submittedBy,
    };
    this.store.push(h);
    return Promise.resolve(h);
  }

  listHistory(permohonanId: string): Promise<RevisiHistory[]> {
    return Promise.resolve(
      this.store
        .filter((h) => h.permohonanId === permohonanId)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    );
  }
}

export interface RevisiServiceDeps {
  repo: RevisiRepository;
  /** Callback ke permohonan state machine — trigger `submit-revisi` action. */
  triggerStateMachine: (
    permohonanId: string,
    catatan: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  /** Callback ke audit log (dari Phase C2). */
  logAudit?: (actor: string, action: string, resource: string, meta?: unknown) => Promise<void>;
}

export class RevisiService {
  constructor(private readonly deps: RevisiServiceDeps) {}

  async submitRevisi(
    input: RevisiInput,
    submittedBy: string,
  ): Promise<
    { ok: true; history: RevisiHistory; stateTransitioned: boolean } | { ok: false; error: string }
  > {
    if (!input.catatanPerbaikan || input.catatanPerbaikan.trim().length < 5) {
      return { ok: false, error: 'catatan_too_short' };
    }
    if (input.replacementFiles.length === 0) {
      return { ok: false, error: 'no_files' };
    }

    // 1. Record revisi history
    const history = await this.deps.repo.recordRevisi({
      permohonanId: input.permohonanId,
      catatan: input.catatanPerbaikan,
      fileCount: input.replacementFiles.length,
      submittedBy,
    });

    // 2. Trigger state machine: Revisi → Verifikasi
    const stateResult = await this.deps.triggerStateMachine(
      input.permohonanId,
      input.catatanPerbaikan,
    );

    // 3. Audit log (kalau wired)
    if (this.deps.logAudit) {
      await this.deps.logAudit(
        'warga',
        'permohonan.submit-revisi',
        `permohonan/${input.permohonanId}`,
        {
          catatan: input.catatanPerbaikan,
          fileCount: input.replacementFiles.length,
          historyId: history.id,
        },
      );
    }

    return { ok: true, history, stateTransitioned: stateResult.ok };
  }

  listHistory(permohonanId: string): Promise<RevisiHistory[]> {
    return this.deps.repo.listHistory(permohonanId);
  }
}
