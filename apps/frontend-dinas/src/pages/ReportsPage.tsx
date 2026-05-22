import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

interface Summary {
  total: number;
  byStatus: { status: string; total: number; pct: number }[];
  byJenis: { jenis: string; total: number }[];
  daily: { date: string; count: number }[];
  avgProcessingDays: number;
}

const COLORS: Record<string, string> = {
  Baru: '#64748b',
  Verifikasi: '#0891b2',
  Revisi: '#ea580c',
  Disetujui: '#16a34a',
  Ditolak: '#dc2626',
  Selesai: '#1e3a8a',
};

export function ReportsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Summary>('/reports/summary')
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'load failed'));
  }, []);

  if (error) return <div style={{ padding: 24, color: '#dc2626' }}>{error}</div>;
  if (!data) return <div style={{ padding: 24 }}>Memuat...</div>;

  const max = Math.max(...data.byStatus.map((s) => s.total), 1);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2>Laporan Permohonan</h2>

      <div style={styles.statGrid}>
        <Stat label="Total Permohonan" value={data.total} color="#1e3a8a" />
        <Stat
          label="Rata-rata Proses"
          value={`${data.avgProcessingDays.toFixed(1)} hari`}
          color="#0891b2"
        />
        <Stat
          label="Disetujui"
          value={data.byStatus.find((s) => s.status === 'Disetujui')?.total ?? 0}
          color="#16a34a"
        />
        <Stat
          label="Ditolak"
          value={data.byStatus.find((s) => s.status === 'Ditolak')?.total ?? 0}
          color="#dc2626"
        />
      </div>

      <h3 style={{ marginTop: 32 }}>Distribusi per Status</h3>
      <div style={styles.barChart}>
        {data.byStatus.map((s) => (
          <div key={s.status} style={styles.barRow}>
            <span style={styles.barLabel}>{s.status}</span>
            <div style={styles.barOuter}>
              <div
                style={{
                  ...styles.barInner,
                  width: `${(s.total / max) * 100}%`,
                  background: COLORS[s.status] ?? '#64748b',
                }}
              />
            </div>
            <span style={styles.barValue}>
              {s.total} ({s.pct}%)
            </span>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 32 }}>Permohonan per Hari (7 hari terakhir)</h3>
      <div style={styles.dailyChart}>
        {data.daily.slice(-7).map((d) => {
          const h = Math.max(8, (d.count / Math.max(...data.daily.map((x) => x.count), 1)) * 120);
          return (
            <div key={d.date} style={{ textAlign: 'center' }}>
              <div style={{ ...styles.dailyBar, height: h }} />
              <small>{d.date.slice(5)}</small>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{d.count}</div>
            </div>
          );
        })}
      </div>

      <h3 style={{ marginTop: 32 }}>Per Jenis Izin</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Jenis</th>
            <th style={styles.th}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.byJenis.map((j) => (
            <tr key={j.jenis}>
              <td style={styles.td}>{j.jenis}</td>
              <td style={styles.td}>
                <strong>{j.total}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: 32 }}>
        <a href="/reports/export.csv" style={styles.exportBtn}>
          📥 Export CSV
        </a>
      </p>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `4px solid ${color}` }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 16,
    marginTop: 16,
  },
  statCard: {
    background: 'white',
    padding: 16,
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  barChart: {
    background: 'white',
    padding: 16,
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  barRow: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr 120px',
    gap: 12,
    alignItems: 'center',
  },
  barLabel: { fontSize: 13 },
  barOuter: { background: '#f1f5f9', height: 24, borderRadius: 4 },
  barInner: { height: 24, borderRadius: 4 },
  barValue: { fontSize: 12, textAlign: 'right' },
  dailyChart: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-end',
    background: 'white',
    padding: 16,
    borderRadius: 8,
    minHeight: 160,
  },
  dailyBar: { width: 32, background: '#0891b2', borderRadius: '4px 4px 0 0' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8 },
  th: { textAlign: 'left', padding: 12, background: '#f1f5f9' },
  td: { padding: 12, borderTop: '1px solid #e2e8f0' },
  exportBtn: {
    display: 'inline-block',
    padding: '10px 16px',
    background: '#1e3a8a',
    color: 'white',
    borderRadius: 6,
    textDecoration: 'none',
  },
};
