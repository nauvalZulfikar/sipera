import { useEffect, useState } from 'react';
import { api, permohonan } from '../lib/api.js';
import { useUser } from '../lib/auth-store.js';
import { ZonaMap } from '../components/ZonaMap.js';

interface WizardData {
  // Step 1: Pemohon
  nik: string;
  npwp: string;
  alamat: string;
  rt: string;
  rw: string;
  pekerjaan: string;
  // Step 2: Lahan
  lokasiLahan: string;
  luasLahan: number;
  rtLahan: string;
  rwLahan: string;
  // Step 3: Perusahaan
  nibOss: string;
  namaPerusahaan: string;
  kbliKode: string;
  jenisIzin: 'KKPR' | 'PMP-UMKM';
  // Step 4: Polygon (lat/lng pairs)
  polygon: [number, number][];
  // Step 5: Dokumen
  dokumenList: { name: string; size: number }[];
}

const STEPS = ['Pemohon', 'Lahan', 'Perusahaan', 'Peta', 'Dokumen'];

export function WizardPage({ onDone }: { onDone: () => void }) {
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    nik: '',
    npwp: '',
    alamat: '',
    rt: '',
    rw: '',
    pekerjaan: '',
    lokasiLahan: '',
    luasLahan: 0,
    rtLahan: '',
    rwLahan: '',
    nibOss: '',
    namaPerusahaan: '',
    kbliKode: '',
    jenisIzin: 'KKPR',
    polygon: [],
    dokumenList: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function submit() {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await permohonan.create(
        { pemohonId: user.id, namaPemohon: user.nama, jenisIzin: data.jenisIzin },
        user.api_token,
      );
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button onClick={onDone} style={styles.backBtn}>
          ← Kembali
        </button>
        <h2 style={{ margin: 0 }}>Permohonan Baru</h2>
      </header>

      <nav style={styles.stepper}>
        {STEPS.map((s, i) => (
          <div
            key={s}
            style={{
              ...styles.step,
              ...(i === step ? styles.stepActive : {}),
              ...(i < step ? styles.stepDone : {}),
            }}
          >
            <span style={styles.stepNum}>{i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </nav>

      <main style={styles.content}>
        {step === 0 && (
          <Step title="Data Pemohon">
            <Field label="NIK (16 digit)">
              <input
                value={data.nik}
                onChange={(e) => update('nik', e.target.value)}
                maxLength={16}
                style={styles.input}
              />
            </Field>
            <Field label="NPWP">
              <input
                value={data.npwp}
                onChange={(e) => update('npwp', e.target.value)}
                style={styles.input}
              />
            </Field>
            <Field label="Alamat">
              <textarea
                value={data.alamat}
                onChange={(e) => update('alamat', e.target.value)}
                rows={2}
                style={styles.input}
              />
            </Field>
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="RT">
                <input
                  value={data.rt}
                  onChange={(e) => update('rt', e.target.value)}
                  style={styles.input}
                />
              </Field>
              <Field label="RW">
                <input
                  value={data.rw}
                  onChange={(e) => update('rw', e.target.value)}
                  style={styles.input}
                />
              </Field>
            </div>
            <Field label="Pekerjaan">
              <input
                value={data.pekerjaan}
                onChange={(e) => update('pekerjaan', e.target.value)}
                style={styles.input}
              />
            </Field>
          </Step>
        )}

        {step === 1 && (
          <Step title="Data Lahan">
            <Field label="Lokasi Lahan">
              <textarea
                value={data.lokasiLahan}
                onChange={(e) => update('lokasiLahan', e.target.value)}
                rows={2}
                style={styles.input}
              />
            </Field>
            <Field label="Luas (m²)">
              <input
                type="number"
                value={data.luasLahan}
                onChange={(e) => update('luasLahan', Number(e.target.value))}
                style={styles.input}
              />
            </Field>
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="RT Lahan">
                <input
                  value={data.rtLahan}
                  onChange={(e) => update('rtLahan', e.target.value)}
                  style={styles.input}
                />
              </Field>
              <Field label="RW Lahan">
                <input
                  value={data.rwLahan}
                  onChange={(e) => update('rwLahan', e.target.value)}
                  style={styles.input}
                />
              </Field>
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step title="Data Usaha / Perusahaan">
            <Field label="Jenis Izin">
              <select
                value={data.jenisIzin}
                onChange={(e) => update('jenisIzin', e.target.value as 'KKPR' | 'PMP-UMKM')}
                style={styles.input}
              >
                <option value="KKPR">KKPR (Konfirmasi Kesesuaian Pemanfaatan Ruang)</option>
                <option value="PMP-UMKM">PMP UMKM</option>
              </select>
            </Field>
            <Field label="NIB OSS">
              <input
                value={data.nibOss}
                onChange={(e) => update('nibOss', e.target.value)}
                placeholder="13 digit"
                style={styles.input}
              />
            </Field>
            <Field label="Nama Usaha / Perusahaan">
              <input
                value={data.namaPerusahaan}
                onChange={(e) => update('namaPerusahaan', e.target.value)}
                style={styles.input}
              />
            </Field>
            <Field label="Kode KBLI">
              <input
                value={data.kbliKode}
                onChange={(e) => update('kbliKode', e.target.value)}
                placeholder="mis. 41011"
                style={styles.input}
              />
            </Field>
          </Step>
        )}

        {step === 3 && (
          <MapStep
            polygon={data.polygon}
            onPolygonChange={(p) => update('polygon', p)}
            kbliKode={data.kbliKode}
          />
        )}

        {step === 4 && (
          <Step title="Upload Dokumen">
            <Field label="KTP">
              <input type="file" accept=".pdf,image/*" style={styles.input} />
            </Field>
            <Field label="Kartu Keluarga">
              <input type="file" accept=".pdf,image/*" style={styles.input} />
            </Field>
            <Field label="Sertifikat Tanah (SHM/AJB)">
              <input type="file" accept=".pdf,image/*" style={styles.input} />
            </Field>
            <Field label="NIB OSS (PDF)">
              <input type="file" accept=".pdf" style={styles.input} />
            </Field>
            <p style={{ color: '#64748b', fontSize: 12 }}>
              Max 10 MB per file. Format: PDF / JPG / PNG.
            </p>
          </Step>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.nav}>
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            style={styles.btnSecondary}
          >
            ← Sebelumnya
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} style={styles.btnPrimary}>
              Selanjutnya →
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} style={styles.btnSubmit}>
              {submitting ? 'Mengirim...' : '✓ Submit Permohonan'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      {children}
    </div>
  );
}

interface Zona {
  id: number;
  code: string;
  name: string;
  bbox: [number, number, number, number];
}

interface IntersectResult {
  zonas: { code: string; name: string }[];
  itbx?: { zona: string; kbli: string; status: string; label: string }[];
  decision?: { decision: 'APPROVE' | 'CONDITIONAL' | 'REJECT'; reasoning: string };
}

function MapStep({
  polygon,
  onPolygonChange,
  kbliKode,
}: {
  polygon: [number, number][];
  onPolygonChange: (p: [number, number][]) => void;
  kbliKode: string;
}) {
  const [zonaList, setZonaList] = useState<Zona[]>([]);
  const [result, setResult] = useState<IntersectResult | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    api<{ data: Zona[] }>('/zona')
      .then((r) => setZonaList(r.data))
      .catch(() => {
        // map render tetap jalan even without zona data
      });
  }, []);

  async function checkPolygon(coords: [number, number][]) {
    onPolygonChange(coords);
    if (coords.length < 3) return;
    setChecking(true);
    try {
      const body: { polygon: { coordinates: [number, number][] }; kbliCodes?: string[] } = {
        polygon: { coordinates: coords },
      };
      if (kbliKode) body.kbliCodes = [kbliKode];
      const r = await api<IntersectResult>('/rdtr/intersect', {
        method: 'POST',
        body,
      });
      setResult(r);
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  }

  return (
    <Step title="Lokasi di Peta">
      <p style={{ color: '#64748b', margin: 0 }}>
        Klik beberapa titik di peta untuk menggambar batas tanah. <strong>Double-click</strong>{' '}
        untuk selesai. Sistem akan auto-cek izin zona.
      </p>
      <ZonaMap
        zonaList={zonaList}
        height={400}
        drawingEnabled
        onPolygonDrawn={(coords) => void checkPolygon(coords)}
      />
      {polygon.length > 0 && (
        <div style={mapStepStyles.coords}>
          <strong>Polygon ({polygon.length} titik):</strong>
          <code style={{ fontSize: 11 }}>
            {polygon.map((p) => `[${p[0].toFixed(4)},${p[1].toFixed(4)}]`).join(' → ')}
          </code>
        </div>
      )}
      {checking && <div style={mapStepStyles.checking}>🔍 Cek zona...</div>}
      {result && (
        <div
          style={{
            ...mapStepStyles.result,
            background:
              result.decision?.decision === 'APPROVE'
                ? '#dcfce7'
                : result.decision?.decision === 'REJECT'
                  ? '#fee2e2'
                  : '#fef3c7',
            borderColor:
              result.decision?.decision === 'APPROVE'
                ? '#16a34a'
                : result.decision?.decision === 'REJECT'
                  ? '#dc2626'
                  : '#ea580c',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {result.decision?.decision === 'APPROVE' && '✅ DISETUJUI'}
            {result.decision?.decision === 'REJECT' && '❌ DITOLAK'}
            {result.decision?.decision === 'CONDITIONAL' && '⚠️ BERSYARAT'}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13 }}>{result.decision?.reasoning}</p>
          {result.zonas.length > 0 && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>
              Zona ter-overlap: {result.zonas.map((z) => `${z.code} (${z.name})`).join(', ')}
            </p>
          )}
        </div>
      )}
    </Step>
  );
}

const mapStepStyles: Record<string, React.CSSProperties> = {
  coords: { background: '#f1f5f9', padding: 8, borderRadius: 4, fontSize: 12 },
  checking: { padding: 8, color: '#0891b2', fontSize: 13 },
  result: {
    padding: 16,
    borderRadius: 8,
    border: '2px solid',
  },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontSize: 13,
        color: '#475569',
        flex: 1,
      }}
    >
      <span style={{ fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { fontFamily: 'system-ui, sans-serif', background: '#f1f5f9', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: 'white' },
  backBtn: {
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    cursor: 'pointer',
  },
  stepper: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: 16,
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    overflowX: 'auto',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#94a3b8',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  stepActive: { color: '#1e3a8a', fontWeight: 600 },
  stepDone: { color: '#16a34a' },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: '#e2e8f0',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
  },
  content: {
    maxWidth: 720,
    margin: '0 auto',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 },
  mapPlaceholder: {
    background: '#e2e8f0',
    padding: 48,
    textAlign: 'center',
    color: '#64748b',
    borderRadius: 8,
  },
  error: { color: '#dc2626', padding: 12, background: '#fee2e2', borderRadius: 6 },
  nav: { display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 16 },
  btnPrimary: {
    padding: '10px 20px',
    background: '#1e3a8a',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
  },
  btnSecondary: {
    padding: '10px 20px',
    background: 'transparent',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    cursor: 'pointer',
  },
  btnSubmit: {
    padding: '10px 20px',
    background: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
  },
};
