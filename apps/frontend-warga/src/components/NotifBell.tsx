import { useEffect, useRef, useState } from 'react';
import { useUser } from '../lib/auth-store.js';

interface NotifMessage {
  id: string;
  body: string;
  ts: number;
  read: boolean;
}

// Same-origin by default: derive ws(s)://<current host> so each domain
// (warga / dinas) talks to its own gateway. Falls back to dev only off-browser.
const WS_BASE =
  (import.meta as unknown as { env?: { VITE_WS_URL?: string } }).env?.VITE_WS_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
    : 'ws://localhost:4007');

/**
 * Bell icon dengan badge count + dropdown list notif.
 * Otomatis connect ke WebSocket notification service saat user login.
 */
export function NotifBell() {
  const { user } = useUser();
  const [notifs, setNotifs] = useState<NotifMessage[]>([]);
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;
    const ws = new WebSocket(`${WS_BASE}/ws/notifikasi?userId=${user.id}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as {
          type: string;
          payload?: {
            event?: string;
            data?: { body?: string; variables?: Record<string, string> };
          };
          ts: number;
        };
        if (msg.type !== 'notification') return;
        const body =
          msg.payload?.data?.body ?? msg.payload?.event ?? 'Anda menerima notifikasi baru';
        setNotifs((prev) => [
          {
            id: `${msg.ts}-${Math.random().toString(36).slice(2, 6)}`,
            body,
            ts: msg.ts,
            read: false,
          },
          ...prev,
        ]);
      } catch {
        // ignore malformed messages
      }
    };

    return () => {
      ws.close();
    };
  }, [user]);

  const unread = notifs.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  if (!user) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) markAllRead();
        }}
        style={styles.bellBtn}
        aria-label="Notifikasi"
        title={connected ? 'Connected' : 'Disconnected'}
      >
        🔔
        {unread > 0 && <span style={styles.badge}>{unread > 99 ? '99+' : unread}</span>}
        {!connected && <span style={styles.offline} title="Offline" />}
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <strong>Notifikasi</strong>
            <span style={{ fontSize: 11, color: connected ? '#16a34a' : '#dc2626' }}>
              {connected ? '● Live' : '○ Offline'}
            </span>
          </div>
          {notifs.length === 0 ? (
            <div style={styles.empty}>Belum ada notifikasi.</div>
          ) : (
            <ul style={styles.list}>
              {notifs.slice(0, 20).map((n) => (
                <li key={n.id} style={styles.item}>
                  <div style={styles.itemBody}>{n.body}</div>
                  <div style={styles.itemTime}>{new Date(n.ts).toLocaleString('id-ID')}</div>
                </li>
              ))}
            </ul>
          )}
          {notifs.length > 0 && (
            <button onClick={() => setNotifs([])} style={styles.clearBtn}>
              Bersihkan
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bellBtn: {
    position: 'relative',
    background: 'transparent',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 18,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    background: '#dc2626',
    color: 'white',
    fontSize: 10,
    fontWeight: 700,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
  },
  offline: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    background: '#94a3b8',
    borderRadius: '50%',
    border: '1px solid white',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: 320,
    background: 'white',
    borderRadius: 8,
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    border: '1px solid #e2e8f0',
    zIndex: 100,
    maxHeight: 480,
    display: 'flex',
    flexDirection: 'column',
  },
  dropdownHeader: {
    padding: 12,
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  empty: { padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 },
  list: { listStyle: 'none', padding: 0, margin: 0, overflow: 'auto', flex: 1 },
  item: { padding: 12, borderBottom: '1px solid #f1f5f9' },
  itemBody: { fontSize: 13, color: '#1e293b' },
  itemTime: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  clearBtn: {
    padding: 10,
    border: 'none',
    background: '#f8fafc',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 12,
    borderTop: '1px solid #e2e8f0',
  },
};
