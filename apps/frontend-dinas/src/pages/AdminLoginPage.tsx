import { useState, type FormEvent } from 'react';
import { auth } from '../lib/api.js';
import { useUser } from '../lib/auth-store.js';

export function AdminLoginPage() {
  const { setUser } = useUser();
  const [noTelp, setNoTelp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const u = await auth.login(noTelp, password);
      if (!['admin', 'operator', 'reviewer', 'kabid'].includes(u.role)) {
        setError('Akun ini bukan staf dinas. Gunakan portal warga.');
        return;
      }
      setUser(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <form onSubmit={(e) => void submit(e)} style={styles.card}>
        <h1 style={styles.title}>Sipera — Dashboard Dinas</h1>
        <p style={styles.sub}>Khusus staf Dinas Tata Ruang Bandung</p>

        <label style={styles.label}>
          No. Handphone
          <input
            type="tel"
            value={noTelp}
            onChange={(e) => setNoTelp(e.target.value)}
            style={styles.input}
            required
          />
        </label>

        <label style={styles.label}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
        </label>

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif',
    background: '#0f172a',
    padding: 16,
  },
  card: {
    background: '#1e293b',
    padding: 32,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    color: '#f1f5f9',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  title: { margin: 0, fontSize: 22, color: '#60a5fa' },
  sub: { margin: 0, color: '#94a3b8', fontSize: 13 },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, color: '#cbd5e1' },
  input: {
    padding: '10px 12px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 6,
    color: '#f1f5f9',
    fontSize: 14,
  },
  button: {
    padding: '12px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    fontSize: 15,
    cursor: 'pointer',
    fontWeight: 600,
  },
  error: { color: '#fca5a5', fontSize: 14, padding: 8, background: '#7f1d1d', borderRadius: 4 },
};
