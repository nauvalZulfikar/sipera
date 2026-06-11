import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api.js';

interface Kbli {
  id: number;
  kode: string;
  judul: string;
}

interface KbliList {
  data: Kbli[];
  meta: { page: number; perPage: number; total: number };
}

export function MasterDataPage() {
  const [list, setList] = useState<Kbli[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [kode, setKode] = useState('');
  const [judul, setJudul] = useState('');
  const [csv, setCsv] = useState('');

  async function reload() {
    const q = new URLSearchParams({ page: String(page), per_page: '20' });
    if (search) q.set('search', search);
    const r = await api<KbliList>(`/kbli?${q}`);
    setList(r.data);
    setTotal(r.meta.total);
  }

  useEffect(() => {
    void reload();
  }, [search, page]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api('/kbli', { method: 'POST', body: { kode, judul } });
      setKode('');
      setJudul('');
      await reload();
    } finally {
      setCreating(false);
    }
  }

  async function bulkImport() {
    if (!csv) return;
    const r = await api<{
      inserted: number;
      updated: number;
      errors: { line: number; reason: string }[];
    }>('/kbli/bulk-import', { method: 'POST', body: { csv } });
    alert(`Inserted: ${r.inserted}, Updated: ${r.updated}, Errors: ${r.errors.length}`);
    setCsv('');
    await reload();
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2>Master Data — KBLI</h2>

      <section style={styles.card}>
        <h3>Tambah Single</h3>
        <form onSubmit={(e) => void submit(e)} style={{ display: 'flex', gap: 8 }}>
          <input
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            placeholder="Kode (mis. 41011)"
            style={styles.input}
            required
          />
          <input
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Judul"
            style={{ ...styles.input, flex: 1 }}
            required
          />
          <button type="submit" disabled={creating} style={styles.btnPrimary}>
            Simpan
          </button>
        </form>
      </section>

      <section style={styles.card}>
        <h3>Bulk Import CSV</h3>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="kode,judul (satu per baris)&#10;41011,Konstruksi Gedung&#10;47111,Minimarket"
          rows={4}
          style={{ ...styles.input, width: '100%', fontFamily: 'monospace' }}
        />
        <button onClick={() => void bulkImport()} disabled={!csv} style={styles.btnPrimary}>
          Import CSV
        </button>
      </section>

      <section style={styles.card}>
        <h3>Daftar KBLI ({total} total)</h3>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Cari kode atau judul..."
          style={{ ...styles.input, width: '100%', marginBottom: 8 }}
        />
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Kode</th>
              <th style={styles.th}>Judul</th>
            </tr>
          </thead>
          <tbody>
            {list.map((k) => (
              <tr key={k.id}>
                <td style={styles.td}>
                  <strong>{k.kode}</strong>
                </td>
                <td style={styles.td}>{k.judul}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={styles.pagination}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Sebelumnya
          </button>
          <span>Halaman {page}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={list.length < 20}>
            Berikutnya
          </button>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  input: { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6 },
  btnPrimary: {
    padding: '8px 16px',
    background: '#1e3a8a',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: 12, background: '#f1f5f9' },
  td: { padding: 12, borderTop: '1px solid #e2e8f0' },
  pagination: {
    display: 'flex',
    gap: 12,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
};
