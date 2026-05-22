import { useState, type FormEvent } from 'react';
import { auth } from '../lib/api.js';
import { useUser } from '../lib/auth-store.js';

export function LoginPage() {
  const { setUser } = useUser();
  const [noTelp, setNoTelp] = useState('081234567890');
  const [password, setPassword] = useState('Masuk123@');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await auth.login(noTelp, password);
      setUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <form onSubmit={submit} style={styles.card}>
        <h1 style={styles.title}>Sipera — Masuk</h1>
        <p style={styles.sub}>Sistem Perizinan Tata Ruang Bandung</p>

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

        <p style={styles.hint}>Demo: 081234567890 / Masuk123@</p>
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
    background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
    padding: 16,
  },
  card: {
    background: 'white',
    padding: 32,
    borderRadius: 12,
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  title: { margin: 0, fontSize: 24, color: '#1e3a8a' },
  sub: { margin: 0, color: '#64748b', fontSize: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, color: '#334155' },
  input: {
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 14,
  },
  button: {
    padding: '12px',
    background: '#1e3a8a',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    fontSize: 15,
    cursor: 'pointer',
    fontWeight: 600,
  },
  error: { color: '#dc2626', fontSize: 14, padding: 8, background: '#fee2e2', borderRadius: 4 },
  hint: { fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: 0 },
};
