import { useEffect, useState } from 'react';
import { permohonan, type Permohonan } from '../lib/api.js';
import { useUser } from '../lib/auth-store.js';
import { NotifBell } from '../components/NotifBell.js';

const STATUS_COLORS: Record<string, string> = {
  Baru: '#64748b',
  Verifikasi: '#0891b2',
  Revisi: '#ea580c',
  Disetujui: '#16a34a',
  Ditolak: '#dc2626',
  Selesai: '#1e3a8a',
  Kadaluarsa: '#94a3b8',
};

export function DashboardPage({ onNew }: { onNew: () => void }) {
  const { user, setUser } = useUser();
  const [list, setList] = useState<Permohonan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    permohonan
      .list(user.api_token)
      .then((r) => setList(r.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'load failed'))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Sipera</h1>
          <p style={styles.sub}>
            {user.nama} · <span style={styles.role}>{user.role}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <NotifBell />
          <button onClick={() => setUser(null)} style={styles.btnSecondary}>
            Keluar
          </button>
        </div>
      </header>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.h2}>Permohonan Saya</h2>
          <button onClick={onNew} style={styles.btnPrimary}>
            + Permohonan Baru
          </button>
        </div>

        {loading && <p style={styles.muted}>Memuat...</p>}
        {error && <div style={styles.error}>{error}</div>}
        {!loading && list.length === 0 && (
          <div style={styles.empty}>
            <p>Belum ada permohonan.</p>
            <p style={styles.muted}>Klik "+ Permohonan Baru" untuk mulai.</p>
          </div>
        )}

        <div style={styles.grid}>
          {list.map((p) => (
            <article key={p.id} style={styles.cardItem}>
              <div style={styles.cardTop}>
                <strong>{p.nomor}</strong>
                <span style={{ ...styles.badge, background: STATUS_COLORS[p.status] ?? '#64748b' }}>
                  {p.status}
                </span>
              </div>
              <p style={styles.cardLine}>{p.namaPemohon}</p>
              <p style={styles.cardLine}>Jenis: {p.jenisIzin}</p>
              {p.catatanRevisi.length > 0 && (
                <details style={styles.details}>
                  <summary>Catatan revisi ({p.catatanRevisi.length})</summary>
                  <ul>
                    {p.catatanRevisi.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </details>
              )}
              <p style={styles.muted}>{new Date(p.createdAt).toLocaleString('id-ID')}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
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
  role: {
    background: '#dbeafe',
    color: '#1e3a8a',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  section: { padding: 24, maxWidth: 1200, margin: '0 auto' },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  h2: { margin: 0, fontSize: 18, color: '#1e293b' },
  btnPrimary: {
    padding: '8px 16px',
    background: '#1e3a8a',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
  },
  btnSecondary: {
    padding: '8px 16px',
    background: 'transparent',
    color: '#64748b',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    cursor: 'pointer',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  cardItem: {
    background: 'white',
    padding: 16,
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    padding: '2px 10px',
    borderRadius: 12,
    color: 'white',
    fontSize: 11,
    fontWeight: 600,
  },
  cardLine: { margin: 0, fontSize: 14, color: '#475569' },
  muted: { color: '#94a3b8', fontSize: 12, margin: 0 },
  empty: { textAlign: 'center', padding: 48, color: '#64748b' },
  error: { color: '#dc2626', padding: 12, background: '#fee2e2', borderRadius: 6 },
  details: { fontSize: 13, color: '#475569' },
};
