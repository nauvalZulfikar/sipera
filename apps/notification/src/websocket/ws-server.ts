import { WebSocketServer, type WebSocket } from 'ws';
import type { Server } from 'node:http';

/**
 * Lightweight WebSocket push for user notifications.
 * Pattern: client connects with `?userId=N` query, server pushes JSON per user.
 *
 * Production scale-up: ganti dengan Redis pub/sub atau dedicated service (Socket.IO/Centrifugo).
 */

interface Connection {
  userId: string;
  ws: WebSocket;
}

export class NotificationWsServer {
  private wss: WebSocketServer | null = null;
  private connections: Connection[] = [];

  attach(httpServer: Server, path = '/ws/notifikasi'): void {
    this.wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`);
      if (url.pathname !== path) {
        socket.destroy();
        return;
      }
      const userId = url.searchParams.get('userId');
      if (!userId) {
        socket.destroy();
        return;
      }
      this.wss!.handleUpgrade(req, socket, head, (ws) => {
        this.connections.push({ userId, ws });
        ws.on('close', () => {
          this.connections = this.connections.filter((c) => c.ws !== ws);
        });
        ws.send(JSON.stringify({ type: 'hello', userId, ts: Date.now() }));
      });
    });
  }

  /** Push notif ke semua koneksi user tertentu. Return jumlah koneksi yang menerima. */
  pushTo(userId: string, payload: unknown): number {
    let sent = 0;
    const data = JSON.stringify({ type: 'notification', payload, ts: Date.now() });
    for (const c of this.connections) {
      if (c.userId !== userId) continue;
      if (c.ws.readyState === 1) {
        c.ws.send(data);
        sent++;
      }
    }
    return sent;
  }

  broadcast(payload: unknown): number {
    const data = JSON.stringify({ type: 'broadcast', payload, ts: Date.now() });
    let sent = 0;
    for (const c of this.connections) {
      if (c.ws.readyState === 1) {
        c.ws.send(data);
        sent++;
      }
    }
    return sent;
  }

  stats() {
    const byUser = new Map<string, number>();
    for (const c of this.connections) byUser.set(c.userId, (byUser.get(c.userId) ?? 0) + 1);
    return { total: this.connections.length, byUser: Object.fromEntries(byUser) };
  }
}
