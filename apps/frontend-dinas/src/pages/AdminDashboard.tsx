import { useEffect, useState } from 'react';
import type { Permohonan } from '../lib/api.js';
import { dinasApi } from '../lib/dinas-api.js';
import { useUser } from '../lib/auth-store.js';
import { MasterDataPage } from './MasterDataPage.js';
import { ReportsPage } from './ReportsPage.js';

type Section = 'permohonan' | 'master' | 'laporan';
const SECTIONS: { key: Section; label: string }[] = [
  { key: 'permohonan', label: '📋 Permohonan' },
  { key: 'laporan', label: '📊 Laporan' },
  { key: 'master', label: '🗂️ Master Data' },
];

const STATUS_COLORS: Record<string, string> = {
  Baru: '#64748b',
  Verifikasi: '#0891b2',
  Revisi: '#ea580c',
  Disetujui: '#16a34a',
  Ditolak: '#dc2626',
  Selesai: '#1e3a8a',
  Kadaluarsa: '#94a3b8',
};

const FILTERS = ['Semua', 'Baru', 'Verifikasi', 'Revisi', 'Disetujui', 'Ditolak', 'Selesai'];

export function AdminDashboard() {
  const { user, setUser } = useUser();
  const [section, setSection] = useState<Section>('permohonan');
  const [list, setList] = useState<Permohonan[]>([]);
  const [filter, setFilter] = useState('Semua');
  const [selected, setSelected] = useState<Permohonan | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!user) return;
    setLoading(true);
    try {
      const r = await dinasApi.listAll(user.api_token, filter === 'Semua' ? undefined : filter);
      setList(r.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [filter, user]);

  async function doAction(
    p: Permohonan,
    action: 'mulai-verifikasi' | 'setujui' | 'tolak' | 'minta-revisi' | 'selesaikan',
    catatan?: string,
  ) {
    if (!user) return;
    setBusy(true);
    try {
      const updated = await dinasApi.act(p.id, action, user.api_token, catatan);
      setSelected(updated);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'action failed');
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  const counts = STATUS_COUNTS_FROM(list);

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <h1 style={styles.sidebarTitle}>Sipera</h1>
        <p style={styles.sidebarSub}>Admin Dinas</p>
        <nav style={styles.nav}>
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              style={{
                ...styles.navItem,
                ...(section === s.key ? styles.navItemActive : {}),
              }}
            >
              {s.label}
            </button>
          ))}

          {section === 'permohonan' && (
            <>
              <div style={styles.navDivider}>Filter status</div>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    ...styles.navItem,
                    ...styles.navSubItem,
                    ...(filter === f ? styles.navItemActive : {}),
                  }}
                >
                  {f}
                  {f !== 'Semua' && counts[f] !== undefined && (
                    <span style={styles.navCount}>{counts[f]}</span>
                  )}
                </button>
              ))}
            </>
          )}
        </nav>
        <div style={styles.userBox}>
          <strong>{user.nama}</strong>
          <span style={styles.role}>{user.role}</span>
          <button onClick={() => setUser(null)} style={styles.logout}>
            Keluar
          </button>
        </div>
      </aside>

      {section === 'master' && (
        <main style={styles.main}>
          <MasterDataPage token={user.api_token} />
        </main>
      )}
      {section === 'laporan' && (
        <main style={styles.main}>
          <ReportsPage token={user.api_token} />
        </main>
      )}
      {section === 'permohonan' && (
        <main style={styles.main}>
          <header style={styles.header}>
            <h2 style={styles.h2}>{filter === 'Semua' ? 'Semua Permohonan' : filter}</h2>
            <button onClick={() => void refresh()} style={styles.refreshBtn}>
              ↻ Refresh
            </button>
          </header>

          {error && <div style={styles.errorBar}>{error}</div>}
          {loading && <p style={styles.muted}>Memuat...</p>}

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nomor</th>
                  <th style={styles.th}>Pemohon</th>
                  <th style={styles.th}>Jenis</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Dibuat</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong>{p.nomor}</strong>
                    </td>
                    <td style={styles.td}>{p.namaPemohon}</td>
                    <td style={styles.td}>{p.jenisIzin}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: STATUS_COLORS[p.status] }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={styles.td}>{new Date(p.createdAt).toLocaleDateString('id-ID')}</td>
                    <td style={styles.td}>
                      <button onClick={() => setSelected(p)} style={styles.viewBtn}>
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#64748b' }}>
                      Tidak ada permohonan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      )}

      {section === 'permohonan' && selected && (
        <DetailPanel
          permohonan={selected}
          busy={busy}
          onClose={() => setSelected(null)}
          onAction={(a, c) => void doAction(selected, a, c)}
        />
      )}
    </div>
  );
}

function STATUS_COUNTS_FROM(list: Permohonan[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const p of list) c[p.status] = (c[p.status] ?? 0) + 1;
  return c;
}

function DetailPanel({
  permohonan,
  busy,
  onClose,
  onAction,
}: {
  permohonan: Permohonan;
  busy: boolean;
  onClose: () => void;
  onAction: (
    a: 'mulai-verifikasi' | 'setujui' | 'tolak' | 'minta-revisi' | 'selesaikan',
    catatan?: string,
  ) => void;
}) {
  const [catatan, setCatatan] = useState('');
  return (
    <aside style={styles.detailPanel}>
      <header style={styles.detailHeader}>
        <h3 style={{ margin: 0 }}>{permohonan.nomor}</h3>
        <button onClick={onClose} style={styles.closeBtn}>
          ✕
        </button>
      </header>
      <div style={styles.detailBody}>
        <DetailRow label="Pemohon" value={permohonan.namaPemohon} />
        <DetailRow label="Jenis Izin" value={permohonan.jenisIzin} />
        <DetailRow
          label="Status"
          value={
            <span style={{ ...styles.badge, background: STATUS_COLORS[permohonan.status] }}>
              {permohonan.status}
            </span>
          }
        />
        <DetailRow label="Dibuat" value={new Date(permohonan.createdAt).toLocaleString('id-ID')} />
        {permohonan.catatanRevisi.length > 0 && (
          <div>
            <strong>Catatan revisi:</strong>
            <ul>
              {permohonan.catatanRevisi.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div style={styles.actionBox}>
        <strong>Aksi tersedia:</strong>
        {permohonan.availableActions?.length === 0 && (
          <p style={styles.muted}>(status final, tidak ada aksi)</p>
        )}
        {(permohonan.availableActions ?? []).map((a) => {
          if (a === 'expire') return null;
          if (a === 'submit-revisi') return null;
          if (a === 'minta-revisi') {
            return (
              <div key={a} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input
                  type="text"
                  placeholder="Catatan revisi..."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  style={styles.input}
                />
                <button
                  disabled={busy || !catatan}
                  onClick={() => onAction('minta-revisi', catatan)}
                  style={{ ...styles.actBtn, background: '#ea580c' }}
                >
                  Minta Revisi
                </button>
              </div>
            );
          }
          const colorMap: Record<string, string> = {
            'mulai-verifikasi': '#0891b2',
            setujui: '#16a34a',
            tolak: '#dc2626',
            selesaikan: '#1e3a8a',
          };
          return (
            <button
              key={a}
              disabled={busy}
              onClick={() => onAction(a as Parameters<typeof onAction>[0])}
              style={{ ...styles.actBtn, background: colorMap[a] ?? '#475569' }}
            >
              {a.charAt(0).toUpperCase() + a.slice(1).replace('-', ' ')}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' },
  sidebar: {
    width: 240,
    background: '#0f172a',
    color: '#cbd5e1',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarTitle: { margin: 0, fontSize: 24, color: '#60a5fa' },
  sidebarSub: { margin: '0 0 24px', fontSize: 12, color: '#64748b' },
  nav: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  navItem: {
    padding: '10px 12px',
    background: 'transparent',
    color: '#cbd5e1',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navItemActive: { background: '#1e293b', color: '#60a5fa', fontWeight: 600 },
  navSubItem: { paddingLeft: 24, fontSize: 13 },
  navDivider: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: '#475569',
    padding: '12px 12px 4px',
    letterSpacing: 0.5,
  },
  navCount: {
    background: '#334155',
    color: '#cbd5e1',
    padding: '1px 8px',
    borderRadius: 10,
    fontSize: 11,
  },
  userBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingTop: 16,
    borderTop: '1px solid #1e293b',
  },
  role: { fontSize: 11, color: '#60a5fa' },
  logout: {
    marginTop: 8,
    padding: '6px 10px',
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
  },
  main: { flex: 1, padding: 24, background: '#f8fafc', overflow: 'auto' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  h2: { margin: 0, fontSize: 20, color: '#0f172a' },
  refreshBtn: {
    padding: '6px 12px',
    background: 'white',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    cursor: 'pointer',
  },
  tableWrap: {
    background: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    background: '#f1f5f9',
    color: '#475569',
    fontWeight: 600,
  },
  tr: { borderTop: '1px solid #e2e8f0' },
  td: { padding: '12px 16px', color: '#1e293b' },
  badge: { padding: '2px 10px', borderRadius: 12, color: 'white', fontSize: 11, fontWeight: 600 },
  viewBtn: {
    padding: '4px 12px',
    background: '#1e3a8a',
    color: 'white',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
  },
  muted: { color: '#94a3b8', fontSize: 13 },
  errorBar: {
    padding: 12,
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: 6,
    marginBottom: 16,
  },
  detailPanel: {
    width: 360,
    background: 'white',
    borderLeft: '1px solid #e2e8f0',
    padding: 16,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#94a3b8',
  },
  detailBody: { display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 },
  actionBox: {
    background: '#f8fafc',
    padding: 12,
    borderRadius: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  actBtn: {
    padding: '8px 12px',
    color: 'white',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 600,
  },
  input: { padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 },
};
