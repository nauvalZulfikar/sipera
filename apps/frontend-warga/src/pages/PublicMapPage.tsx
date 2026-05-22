import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { ZonaMap } from '../components/ZonaMap.js';

interface Zona {
  id: number;
  code: string;
  name: string;
  bbox: [number, number, number, number];
}

const ZONA_COLOR_LEGEND: { prefix: string; label: string; color: string }[] = [
  { prefix: 'R-', label: 'Perumahan', color: '#10b981' },
  { prefix: 'K-', label: 'Perdagangan & Jasa', color: '#0891b2' },
  { prefix: 'I-', label: 'Industri', color: '#f97316' },
  { prefix: 'RTH-', label: 'Ruang Terbuka Hijau', color: '#16a34a' },
  { prefix: 'HL', label: 'Hutan Lindung', color: '#15803d' },
  { prefix: 'P-', label: 'Pertanian', color: '#84cc16' },
  { prefix: 'SPU-', label: 'Sarana Pelayanan Umum', color: '#3b82f6' },
  { prefix: 'KT-', label: 'Perkantoran', color: '#6366f1' },
];

interface PublicMapPageProps {
  onClose?: () => void;
}

export function PublicMapPage({ onClose }: PublicMapPageProps) {
  const [zonaList, setZonaList] = useState<Zona[]>([]);
  const [selected, setSelected] = useState<Zona | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ data: Zona[] }>('/zona')
      .then((r) => setZonaList(r.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'load failed'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>🗺️ Peta Zona RDTR Bandung</h1>
          <p style={styles.sub}>Jelajah zona tata ruang publik — tanpa perlu login</p>
        </div>
        {onClose && (
          <button onClick={onClose} style={styles.closeBtn}>
            ← Kembali
          </button>
        )}
      </header>

      <div style={styles.body}>
        <aside style={styles.sidebar}>
          <h3 style={styles.h3}>Legend Zona</h3>
          <ul style={styles.legend}>
            {ZONA_COLOR_LEGEND.map((l) => (
              <li key={l.prefix} style={styles.legendItem}>
                <span style={{ ...styles.swatch, background: l.color }} />
                <span>
                  <strong>{l.prefix}*</strong> — {l.label}
                </span>
              </li>
            ))}
          </ul>

          {selected && (
            <div style={styles.detail}>
              <h4 style={{ margin: '0 0 8px' }}>{selected.code}</h4>
              <p style={{ margin: '0 0 4px', fontSize: 14 }}>{selected.name}</p>
              <p style={styles.coords}>
                Bounds: {selected.bbox.map((n) => n.toFixed(4)).join(', ')}
              </p>
              <button onClick={() => setSelected(null)} style={styles.btnSmall}>
                Tutup
              </button>
            </div>
          )}

          <div style={styles.info}>
            <strong>ℹ️ Tentang data ini</strong>
            <p style={{ margin: '4px 0', fontSize: 12 }}>
              Mock data sample. Data RDTR Bandung lengkap akan tersedia setelah integrasi dari
              Bappeda Kota Bandung selesai.
            </p>
          </div>
        </aside>

        <main style={styles.mapArea}>
          {error && <div style={styles.error}>{error}</div>}
          {loading && <div style={styles.loading}>Memuat zona...</div>}
          {!loading && !error && (
            <ZonaMap zonaList={zonaList} height={650} onZonaClick={setSelected} />
          )}
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f1f5f9' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
  },
  title: { margin: 0, fontSize: 22, color: '#1e3a8a' },
  sub: { margin: 0, color: '#64748b', fontSize: 13 },
  closeBtn: {
    padding: '8px 16px',
    background: 'transparent',
    color: '#64748b',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    cursor: 'pointer',
  },
  body: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: 16,
    padding: 16,
    maxWidth: 1400,
    margin: '0 auto',
  },
  sidebar: {
    background: 'white',
    padding: 16,
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    height: 'fit-content',
  },
  h3: { margin: 0, fontSize: 14, color: '#0f172a' },
  legend: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  legendItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' },
  swatch: { width: 16, height: 16, borderRadius: 3, flexShrink: 0 },
  detail: { background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' },
  coords: { fontSize: 11, color: '#94a3b8', margin: '0 0 8px', fontFamily: 'monospace' },
  btnSmall: {
    padding: '4px 10px',
    background: 'transparent',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
  },
  info: {
    background: '#dbeafe',
    padding: 12,
    borderRadius: 6,
    fontSize: 12,
    color: '#1e3a8a',
  },
  mapArea: { background: 'white', padding: 8, borderRadius: 8, overflow: 'hidden' },
  error: { padding: 24, color: '#dc2626' },
  loading: { padding: 48, textAlign: 'center', color: '#64748b' },
};
