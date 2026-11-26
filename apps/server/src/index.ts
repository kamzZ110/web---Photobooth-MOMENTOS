import { createHmac } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { parseMessage } from './validation.ts';
import { createServer } from 'node:http';
import type {
  ClientToServerMessage,
  ParticipantRole,
  ServerToClientMessage,
} from '../../../packages/shared/src/index.ts';
import { RoomStore } from './roomStore.ts';

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';
const allowedOrigins = new Set((process.env.CORS_ORIGIN ??
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173'))
  .split(',').map(origin => origin.trim()).filter(Boolean));
const MAX_WS_BUFFER_BYTES = 4 * 1024 * 1024; // 4 MB frame guard
const STARTED_AT = Date.now();
const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_WS_BUFFER_BYTES, perMessageDeflate: false });
interface ClientConn {
  socket: WebSocket;
  address: string;
  unjoinedSince: number;
  alive: boolean;
  sentSince: number;
  sentBytes: number;
  controlBytes: number;
  roomCode: string | null;
  participantId: string | null;
  role: ParticipantRole | null;
}

const store = new RoomStore();
const clients = new Set<ClientConn>();
const admissions = new Map<string, { since: number; count: number }>();

function admit(key: string, limit: number) {
  const now = Date.now();
  let bucket = admissions.get(key);
  if (!bucket || now - bucket.since >= 60_000) {
    bucket = { since: now, count: 0 };
    admissions.set(key, bucket);
  }
  return ++bucket.count <= limit;
}

function sendJson(conn: ClientConn, msg: ServerToClientMessage): void {
  if (conn.socket.readyState !== WebSocket.OPEN) return;
  if (conn.socket.bufferedAmount > 16 * MAX_WS_BUFFER_BYTES) {
    conn.socket.close(1013, 'Koneksi terlalu lambat');
    return;
  }
  const data = JSON.stringify(msg);
  const now = Date.now();
  if (now - conn.sentSince >= 1000) { conn.sentSince = now; conn.sentBytes = 0; conn.controlBytes = 0; }
  // Control traffic has its own small budget. The larger allowance permits
  // a full authenticated room restore (at most sixteen stored frame halves).
  const media = msg.type === 'frame:media';
  const bytes = Buffer.byteLength(data);
  conn.sentBytes += bytes;
  if (!media) conn.controlBytes += bytes;
  if (conn.controlBytes > 2 * 1024 * 1024 || conn.sentBytes > 64 * 1024 * 1024) {
    conn.socket.close(1013, 'Batas transfer room tercapai');
    return;
  }
  conn.socket.send(data);
}

function sendTurn(conn: ClientConn) {
  const secret = process.env.TURN_SHARED_SECRET;
  const urls = process.env.TURN_URL;
  if (!secret || !urls || !conn.participantId) return;
  const username = Math.ceil(Date.now() / 1000 + 3600) + ':' + conn.participantId;
  const credential = createHmac('sha1', secret).update(username).digest('base64');
  sendJson(conn, { type: 'room:turn', urls, username, credential });
}

function broadcastRoom(
  code: string,
  msg: ServerToClientMessage,
  exclude?: ClientConn
): void {
  for (const conn of clients) {
    if (conn.roomCode === code && conn !== exclude) {
      sendJson(conn, msg);
    }
  }
}

function handleClientMessage(conn: ClientConn, msg: ClientToServerMessage): void {
  if (['room:create', 'room:join', 'room:rejoin'].includes(msg.type)) {
    if (!admit('entry:' + conn.address, 30) || (msg.type === 'room:create' && store.getActiveRoomCount() >= 128)) {
      sendJson(conn, { type: 'room:error', errorCode: 'BAD_REQUEST', message: 'Terlalu banyak permintaan room. Coba lagi sebentar.' });
      return;
    }
    if (conn.roomCode) handleClientMessage(conn, { type: 'room:leave' });
  }
  switch (msg.type) {
    case 'room:create': {
      const created = store.createRoom({
        displayName: msg.displayName,
        mode: msg.mode,
        takeCount: msg.takeCount,
        selectedFilter: msg.selectedFilter,
      });
      conn.roomCode = created.code;
      conn.participantId = created.participantId;
      conn.role = created.role;
      sendTurn(conn);
      sendJson(conn, {
        type: 'room:joined',
        code: created.code,
        role: created.role,
        participantId: created.participantId,
        rejoinToken: created.rejoinToken,
        snapshot: created.snapshot,
      });
      return;
    }

    case 'room:join': {
      const joined = store.joinRoom(msg.code, msg.displayName);
      if (!joined.ok) {
        sendJson(conn, {
          type: 'room:error',
          errorCode: joined.errorCode,
          message: joined.message,
        });
        return;
      }
      conn.roomCode = joined.code;
      conn.participantId = joined.participantId;
      conn.role = joined.role;
      sendTurn(conn);
      sendJson(conn, {
        type: 'room:joined',
        code: joined.code,
        role: joined.role,
        participantId: joined.participantId,
        rejoinToken: joined.rejoinToken,
        snapshot: joined.snapshot,
      });
      broadcastRoom(joined.code, { type: 'room:snapshot', snapshot: joined.snapshot }, conn);
      return;
    }

    case 'room:rejoin': {
      const res = store.rejoinRoom(msg.code, msg.rejoinToken);
      if (!res.ok) {
        sendJson(conn, {
          type: 'room:error',
          errorCode: res.errorCode,
          message: res.message,
        });
        return;
      }
      for (const other of clients) {
        if (other !== conn && other.participantId === res.participantId) {
          other.roomCode = null;
          other.participantId = null;
          other.role = null;
          other.socket.close(1000, 'Sesi tersambung kembali');
        }
      }
      conn.roomCode = res.code;
      conn.participantId = res.participantId;
      conn.role = res.role;
      sendTurn(conn);
      sendJson(conn, {
        type: 'room:joined',
        code: res.code,
        role: res.role,
        participantId: res.participantId,
        rejoinToken: msg.rejoinToken,
        snapshot: res.snapshot,
      });
      for (const frame of store.getStoredFrames(res.code)) {
        for (const role of ['host', 'guest'] as const) {
          const dataUrl = role === 'host' ? frame.hostDataUrl : frame.guestDataUrl;
          if (dataUrl) sendJson(conn, { type: 'frame:media', role, frameIndex: frame.frameIndex, dataUrl });
        }
      }
      broadcastRoom(res.code, { type: 'room:snapshot', snapshot: res.snapshot }, conn);
      return;
    }

    case 'room:leave': {
      if (conn.roomCode && conn.participantId) {
        const snap = store.markDisconnected(conn.roomCode, conn.participantId);
        if (snap) {
          broadcastRoom(conn.roomCode, { type: 'room:snapshot', snapshot: snap }, conn);
        }
      }
      conn.roomCode = null;
      conn.participantId = null;
      conn.role = null;
      conn.unjoinedSince = Date.now();
      return;
    }

    case 'clock:ping': {
      const serverReceivedAt = Date.now();
      sendJson(conn, {
        type: 'clock:pong',
        clientSentAt: msg.clientSentAt,
        serverReceivedAt,
        serverSentAt: Date.now(),
      });
      return;
    }

    case 'participant:ready': {
      if (!conn.roomCode || !conn.participantId) return;
      const snap = store.setReady(conn.roomCode, conn.participantId, msg.ready);
      if (snap) {
        broadcastRoom(conn.roomCode, { type: 'room:ready', code: snap.code, version: snap.version, phase: snap.phase, participants: snap.participants });
      }
      return;
    }

    case 'session:config': {
      if (!conn.roomCode || !conn.role) return;
      const res = store.updateConfig(conn.roomCode, conn.role, {
        takeCount: msg.takeCount,
        selectedFilter: msg.selectedFilter,
        layout: msg.layout,
        phase: msg.phase,
        classicCameraEffect: msg.classicCameraEffect,
        flipbookAccessory: msg.flipbookAccessory,
      });
      if (!res.ok) {
        sendJson(conn, {
          type: 'room:error',
          errorCode: res.errorCode,
          message: res.message,
        });
        return;
      }
      if (res.snapshot) broadcastRoom(conn.roomCode, { type: 'room:snapshot', snapshot: res.snapshot });
      return;
    }

    case 'capture:request': {
      if (!conn.roomCode || !conn.role) return;
      const res = store.scheduleCountdown(conn.roomCode, conn.role, msg.takeNumber);
      if (!res.ok) {
        sendJson(conn, {
          type: 'room:error',
          errorCode: res.errorCode,
          message: res.message,
        });
        return;
      }
      broadcastRoom(conn.roomCode, {
        type: 'capture:scheduled',
        countdown: res.countdown,
        snapshot: res.snapshot,
      });
      return;
    }

    case 'retake:request': {
      if (!conn.roomCode || !conn.role) return;
      const snap = store.requestRetake(conn.roomCode, conn.role, msg.frameId);
      if (snap) {
        broadcastRoom(conn.roomCode, { type: 'room:snapshot', snapshot: snap });
      }
      return;
    }

    case 'retake:decision': {
      if (!conn.roomCode || !conn.role) return;
      const snap = store.decideRetake(
        conn.roomCode,
        conn.role,
        msg.requestId,
        msg.approved
      );
      if (snap) {
        broadcastRoom(conn.roomCode, { type: 'room:snapshot', snapshot: snap });
      }
      return;
    }

    case 'capture:frame-sync': {
      if (!conn.roomCode || !conn.role) return;
      const snap = store.syncCapturedFrame(
        conn.roomCode,
        conn.role,
        msg.frameIndex,
        msg.attemptId,
        msg.dataUrl
      );
      if (snap) {
        if (msg.dataUrl) broadcastRoom(conn.roomCode, { type: 'frame:media', frameIndex: msg.frameIndex, role: conn.role, dataUrl: msg.dataUrl });
        broadcastRoom(conn.roomCode, { type: 'room:snapshot', snapshot: snap });
      }
      return;
    }

    case 'editor:operation': {
      if (!conn.roomCode || !conn.role) return;
      const snap = store.applyEditorOperation(conn.roomCode, conn.role, {
        opId: msg.opId,
        kind: msg.kind,
        stickerId: msg.stickerId,
        value: msg.value,
        placedSticker: msg.placedSticker,
        instanceId: msg.instanceId,
        patch: msg.patch,
      });
      if (snap) {
        broadcastRoom(conn.roomCode, { type: 'room:snapshot', snapshot: snap });
      }
      return;
    }

    case 'editor:personal-undo': {
      if (!conn.roomCode || !conn.role) return;
      const snap = store.applyPersonalUndo(conn.roomCode, conn.role);
      if (snap) {
        broadcastRoom(conn.roomCode, { type: 'room:snapshot', snapshot: snap });
      }
      return;
    }

    case 'webrtc:signal': {
      if (!conn.roomCode || !conn.role) return;
      broadcastRoom(
        conn.roomCode,
        {
          type: 'webrtc:signal',
          fromRole: conn.role,
          signal: msg.signal,
        },
        conn
      );
      return;
    }
  }
}

const server = createServer((req, res) => {
  const health = req.method === 'GET' && req.url === '/api/health';
  res.writeHead(health ? 200 : 404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(health ? { ok: true, uptimeSec: Math.floor((Date.now() - STARTED_AT) / 1000) } : { ok: false }));
});

server.on('upgrade', (req, socket, head) => {
  const origin = req.headers.origin;
  const address = req.socket.remoteAddress ?? 'unknown';
  if (req.url !== '/ws' || typeof origin !== 'string' || !allowedOrigins.has(origin) ||
      clients.size >= 256 || Array.from(clients).filter(c => !c.roomCode).length >= 64 || !admit('connect:' + address, 90) ||
      Array.from(clients).filter(c => c.address === address).length >= 32) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, ws => {
    const conn: ClientConn = { socket: ws, address, unjoinedSince: Date.now(), alive: true, sentSince: Date.now(), sentBytes: 0, controlBytes: 0, roomCode: null, participantId: null, role: null };
    clients.add(conn);
    ws.on('pong', () => { conn.alive = true; });
    let start = Date.now();
    let count = 0;
    let bytes = 0;
    ws.on('message', (raw, binary) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      if (Date.now() - start >= 1000) { start = Date.now(); count = 0; bytes = 0; }
      bytes += raw.length;
      if (binary || ++count > 180 || bytes > 2 * MAX_WS_BUFFER_BYTES) {
        ws.close(1008, 'Batas pesan terlampaui');
        return;
      }
      const msg = parseMessage(raw.toString());
      if (msg) handleClientMessage(conn, msg);
      else sendJson(conn, { type: 'room:error', errorCode: 'BAD_REQUEST', message: 'Pesan tidak valid.' });
    });
    ws.on('error', () => ws.terminate());
    ws.on('close', () => {
      clients.delete(conn);
      handleClientMessage(conn, { type: 'room:leave' });
    });
  });
});

setInterval(() => {
  const expired = new Set(store.sweepExpired());
  const now = Date.now();
  for (const snapshot of store.expireCountdowns(now)) broadcastRoom(snapshot.code, { type: 'room:snapshot', snapshot });
  for (const conn of clients) {
    if (!conn.alive || (!conn.roomCode && now - conn.unjoinedSince >= 60_000)) conn.socket.terminate();
    else if (conn.roomCode && expired.has(conn.roomCode)) conn.socket.close(1000, 'Room berakhir');
    else if (conn.socket.readyState === WebSocket.OPEN) {
      conn.alive = false;
      conn.socket.ping();
    }
  }
  for (const [key, bucket] of admissions) if (Date.now() - bucket.since >= 60_000) admissions.delete(key);
}, 15_000);

function shutdown() {
  for (const conn of clients) conn.socket.terminate();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.listen(PORT, HOST, () => console.log('[MOMENTOS] Server Duo listening on port ' + PORT));
