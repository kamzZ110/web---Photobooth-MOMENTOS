import { createHash } from 'node:crypto';
import { createServer, type DuplexSocket } from 'node:http';
import type {
  ClientToServerMessage,
  ParticipantRole,
  ServerToClientMessage,
} from '../../../packages/shared/src/index.ts';
import { RoomStore } from './roomStore.ts';

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';
const MAX_WS_BUFFER_BYTES = 4 * 1024 * 1024; // 4 MB frame guard
const STARTED_AT = Date.now();
const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

interface ClientConn {
  socket: DuplexSocket;
  roomCode: string | null;
  participantId: string | null;
  role: ParticipantRole | null;
  pending: Buffer;
}

const store = new RoomStore();
const clients = new Set<ClientConn>();

function encodeWsTextFrame(text: string): Buffer {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  if (len < 126) {
    const header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = len;
    return Buffer.concat([header, payload]);
  }
  if (len <= 0xffff) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
    return Buffer.concat([header, payload]);
  }
  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeUInt32BE(0, 2);
  header.writeUInt32BE(len, 6);
  return Buffer.concat([header, payload]);
}

function sendJson(conn: ClientConn, msg: ServerToClientMessage): void {
  try {
    conn.socket.write(encodeWsTextFrame(JSON.stringify(msg)));
  } catch {
    // Ignore broken pipe; close listener cleans up
  }
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
      conn.roomCode = res.code;
      conn.participantId = res.participantId;
      conn.role = res.role;
      sendJson(conn, {
        type: 'room:joined',
        code: res.code,
        role: res.role,
        participantId: res.participantId,
        rejoinToken: msg.rejoinToken,
        snapshot: res.snapshot,
      });
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
        broadcastRoom(conn.roomCode, { type: 'room:snapshot', snapshot: snap });
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
      });
      if (!res.ok) {
        sendJson(conn, {
          type: 'room:error',
          errorCode: res.errorCode,
          message: res.message,
        });
        return;
      }
      broadcastRoom(conn.roomCode, { type: 'room:snapshot', snapshot: res.snapshot });
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
        msg.dataUrl
      );
      if (snap) {
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
      const snap = store.applyPersonalUndo(conn.roomCode, msg.actor ?? conn.role);
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

function consumeWsFrames(conn: ClientConn): void {
  while (conn.pending.length >= 2) {
    const first = conn.pending[0];
    const second = conn.pending[1];
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let payloadLen = second & 0x7f;
    let offset = 2;

    if (payloadLen === 126) {
      if (conn.pending.length < 4) return;
      payloadLen = conn.pending.readUInt16BE(2);
      offset = 4;
    } else if (payloadLen === 127) {
      if (conn.pending.length < 10) return;
      // Only handle safe frames < 16MB
      payloadLen =
        (conn.pending[6] << 24) |
        (conn.pending[7] << 16) |
        (conn.pending[8] << 8) |
        conn.pending[9];
      offset = 10;
    }

    const maskLen = masked ? 4 : 0;
    const totalLen = offset + maskLen + payloadLen;
    if (conn.pending.length < totalLen) return;

    const payload = Buffer.alloc(payloadLen);
    if (masked) {
      const mask = conn.pending.subarray(offset, offset + 4);
      const encoded = conn.pending.subarray(offset + 4, totalLen);
      for (let i = 0; i < payloadLen; i++) {
        payload[i] = encoded[i] ^ mask[i % 4];
      }
    } else {
      const raw = conn.pending.subarray(offset, totalLen);
      for (let i = 0; i < payloadLen; i++) payload[i] = raw[i];
    }

    conn.pending = conn.pending.subarray(totalLen);

    if (opcode === 0x8) {
      conn.socket.end();
      return;
    }
    if (opcode === 0x9) {
      // Respond to Ping with Pong
      const pongHeader = Buffer.alloc(2);
      pongHeader[0] = 0x8a;
      pongHeader[1] = 0;
      conn.socket.write(pongHeader);
      continue;
    }
    if (opcode === 0x1 || opcode === 0x0) {
      try {
        const parsed = JSON.parse(payload.toString('utf8')) as ClientToServerMessage;
        handleClientMessage(conn, parsed);
      } catch {
        sendJson(conn, {
          type: 'room:error',
          errorCode: 'BAD_REQUEST',
          message: 'Format payload JSON tidak valid.',
        });
      }
    }
  }
}

const server = createServer((req, res) => {
  const url = req.url ?? '/';
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    });
    res.end();
    return;
  }

  res.writeHead(url.startsWith('/api/') ? 200 : 404, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
  });

  if (url === '/api/health') {
    res.end(
      JSON.stringify({
        ok: true,
        service: '@momentos/server',
        activeRooms: store.getActiveRoomCount(),
        connectedSockets: clients.size,
        uptimeSec: Math.round((Date.now() - STARTED_AT) / 1000),
        maxBufferBytes: MAX_WS_BUFFER_BYTES,
        serverTime: Date.now(),
      })
    );
    return;
  }

  if (url.startsWith('/api/rooms/')) {
    const code = url.replace('/api/rooms/', '');
    const snapshot = store.getPublicSnapshot(code);
    res.end(JSON.stringify({ found: Boolean(snapshot), snapshot }));
    return;
  }

  res.end(JSON.stringify({ ok: false, message: 'Endpoint tidak ditemukan' }));
});

server.on('upgrade', (req, socket) => {
  const wsKey = req.headers['sec-websocket-key'];
  if (typeof wsKey !== 'string') {
    socket.destroy();
    return;
  }

  const accept = createHash('sha1').update(`${wsKey}${WS_MAGIC}`).digest('base64');
  socket.write(
    [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '',
      '',
    ].join('\r\n')
  );

  const conn: ClientConn = {
    socket,
    roomCode: null,
    participantId: null,
    role: null,
    pending: Buffer.alloc(0),
  };
  clients.add(conn);

  socket.on('data', (chunk) => {
    if (conn.pending.length + chunk.length > MAX_WS_BUFFER_BYTES) {
      socket.destroy();
      return;
    }
    conn.pending = Buffer.concat([conn.pending, chunk]);
    consumeWsFrames(conn);
  });

  const onClose = () => {
    clients.delete(conn);
    if (conn.roomCode && conn.participantId) {
      const snap = store.markDisconnected(conn.roomCode, conn.participantId);
      if (snap) {
        broadcastRoom(conn.roomCode, { type: 'room:snapshot', snapshot: snap });
      }
    }
  };

  socket.on('close', onClose);
  socket.on('end', onClose);
  socket.on('error', onClose);
});

setInterval(() => {
  store.sweepExpired();
}, 15_000);

const shutdown = () => {
  for (const conn of clients) {
    conn.socket.destroy();
  }
  clients.clear();
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, HOST, () => {
  console.log(
    `[Momentos Realtime Server] listening on http://${HOST}:${PORT} (WebSocket: ws://localhost:${PORT}/ws)`
  );
});
