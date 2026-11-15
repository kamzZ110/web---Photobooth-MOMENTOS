import { randomInt, randomUUID } from 'node:crypto';
import {
  DEFAULT_STICKER_LIBRARY,
  type AuthoritativeRoomSnapshot,
  type BoothMode,
  type CollaborativeEditorState,
  type EditorOperation,
  type ParticipantRole,
  type PhotoFilterId,
  type RetakePromptState,
  type RoomConnectionState,
  type RoomParticipant,
  type RoomSessionPhase,
  type ScheduledCountdown,
  type SyncedFrameMedia,
  type TemplateLayoutId,
} from '../../../packages/shared/src/index.ts';

export const MAX_PARTICIPANTS = 2;
export const REJOIN_WINDOW_MS = 5 * 60 * 1000; // 5 menit
export const IDLE_ROOM_TTL_MS = 3 * 60 * 1000; // 3 menit kosong
export const HARD_SESSION_TTL_MS = 60 * 60 * 1000; // 1 jam retensi sesi sementara
export const CLASSIC_COUNTDOWN_MS = 3000; // 3 detik countdown

interface InternalParticipant extends RoomParticipant {
  rejoinToken: string;
}

interface InternalRoom {
  code: string;
  version: number;
  mode: BoothMode;
  phase: RoomSessionPhase;
  connectionState: RoomConnectionState;
  createdAt: number;
  expiresAt: number;
  idleDestroyAt: number | null;
  takeCount: 3 | 4;
  selectedFilter: PhotoFilterId;
  layout: TemplateLayoutId;
  retakesRemaining: number;
  participants: InternalParticipant[];
  countdown: ScheduledCountdown | null;
  retakePrompt: RetakePromptState | null;
  syncedFrames: SyncedFrameMedia[];
  editorState: CollaborativeEditorState;
}

export function createInitialEditorState(): CollaborativeEditorState {
  return {
    editorVersion: 1,
    stripTint: '#FFFFFF',
    caption: 'Nov 14, 2026 12:02pm',
    stickers: DEFAULT_STICKER_LIBRARY.map((s) => ({ ...s })),
    history: [],
    pausedByDisconnect: false,
    lastActor: null,
  };
}

export class RoomStore {
  private readonly rooms: Map<string, InternalRoom>;

  constructor() {
    this.rooms = new Map();
  }

  private generateCode(): string {
    for (let i = 0; i < 20; i++) {
      const code = `MMT-${randomInt(1000, 9999)}`;
      if (!this.rooms.has(code)) return code;
    }
    return `MMT-${randomUUID().slice(0, 4).toUpperCase()}`;
  }

  private toPublicSnapshot(room: InternalRoom): AuthoritativeRoomSnapshot {
    return {
      code: room.code,
      version: room.version,
      mode: room.mode,
      phase: room.phase,
      connectionState: room.connectionState,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
      idleDestroyAt: room.idleDestroyAt,
      takeCount: room.takeCount,
      selectedFilter: room.selectedFilter,
      layout: room.layout,
      retakesRemaining: room.retakesRemaining,
      participants: room.participants.map(({ rejoinToken: _token, ...pub }) => pub),
      countdown: room.countdown,
      retakePrompt: room.retakePrompt,
      syncedFrames: room.syncedFrames,
      editorState: room.editorState,
    };
  }

  private recomputeConnectionState(room: InternalRoom, now: number): void {
    const host = room.participants.find((p) => p.role === 'host');
    const guest = room.participants.find((p) => p.role === 'guest');
    const connectedCount = room.participants.filter((p) => p.connected).length;

    room.idleDestroyAt = connectedCount === 0 ? now + IDLE_ROOM_TTL_MS : null;

    if (room.phase === 'ended') {
      room.connectionState = 'error';
      room.editorState.pausedByDisconnect = true;
      return;
    }

    if (room.mode === 'solo') {
      room.connectionState = host?.connected ? 'connected' : 'reconnecting';
      room.editorState.pausedByDisconnect = !host?.connected;
      return;
    }

    if (!guest) {
      room.connectionState = host?.connected ? 'waiting' : 'reconnecting';
      room.editorState.pausedByDisconnect = false;
      if (room.phase !== 'countdown' && room.phase !== 'capturing') {
        room.phase = 'waiting';
      }
      return;
    }

    if (host?.connected && guest.connected) {
      room.connectionState = 'connected';
      room.editorState.pausedByDisconnect = false;
      const allReady = host.ready && guest.ready;
      if (room.phase === 'waiting' || room.phase === 'setup' || room.phase === 'ready') {
        room.phase = allReady ? 'ready' : 'setup';
      }
    } else {
      room.connectionState = 'reconnecting';
      room.editorState.pausedByDisconnect = true;
    }
  }

  createRoom(params: {
    displayName?: string;
    mode?: BoothMode;
    takeCount?: 3 | 4;
    selectedFilter?: PhotoFilterId;
  }): {
    code: string;
    participantId: string;
    role: ParticipantRole;
    rejoinToken: string;
    snapshot: AuthoritativeRoomSnapshot;
  } {
    const now = Date.now();
    const code = this.generateCode();
    const participantId = randomUUID();
    const rejoinToken = randomUUID();
    const mode = params.mode ?? 'duo';

    const host: InternalParticipant = {
      participantId,
      role: 'host',
      displayName: params.displayName?.trim() || 'Host',
      connected: true,
      ready: false,
      lastSeenAt: now,
      rejoinExpiresAt: null,
      rejoinToken,
    };

    const room: InternalRoom = {
      code,
      version: 1,
      mode,
      phase: 'waiting',
      connectionState: mode === 'solo' ? 'connected' : 'waiting',
      createdAt: now,
      expiresAt: now + HARD_SESSION_TTL_MS,
      idleDestroyAt: null,
      takeCount: params.takeCount ?? 3,
      selectedFilter: params.selectedFilter ?? 'normal',
      layout: 'strip-1x4',
      retakesRemaining: 3,
      participants: [host],
      countdown: null,
      retakePrompt: null,
      syncedFrames: [0, 1, 2, 3].map((frameIndex) => ({
        frameIndex,
        updatedAt: now,
      })),
      editorState: createInitialEditorState(),
    };

    this.rooms.set(code, room);
    return {
      code,
      participantId,
      role: 'host',
      rejoinToken,
      snapshot: this.toPublicSnapshot(room),
    };
  }

  joinRoom(
    rawCode: string,
    displayName?: string
  ):
    | {
        ok: true;
        code: string;
        participantId: string;
        role: ParticipantRole;
        rejoinToken: string;
        snapshot: AuthoritativeRoomSnapshot;
      }
    | {
        ok: false;
        errorCode: 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'ROOM_ENDED';
        message: string;
      } {
    const code = rawCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    const now = Date.now();

    if (!room || now >= room.expiresAt) {
      if (room) this.rooms.delete(code);
      return {
        ok: false,
        errorCode: 'ROOM_NOT_FOUND',
        message: `Room ${code} tidak ditemukan atau sudah kedaluwarsa.`,
      };
    }

    if (room.phase === 'ended') {
      return {
        ok: false,
        errorCode: 'ROOM_ENDED',
        message: 'Sesi room ini sudah berakhir.',
      };
    }

    if (room.participants.length >= MAX_PARTICIPANTS) {
      return {
        ok: false,
        errorCode: 'ROOM_FULL',
        message: 'Room penuh (maksimal 2 peserta: 1 Host + 1 Guest).',
      };
    }

    const participantId = randomUUID();
    const rejoinToken = randomUUID();
    const guest: InternalParticipant = {
      participantId,
      role: 'guest',
      displayName: displayName?.trim() || 'Guest',
      connected: true,
      ready: false,
      lastSeenAt: now,
      rejoinExpiresAt: null,
      rejoinToken,
    };

    room.participants.push(guest);
    room.version += 1;
    this.recomputeConnectionState(room, now);

    return {
      ok: true,
      code,
      participantId,
      role: 'guest',
      rejoinToken,
      snapshot: this.toPublicSnapshot(room),
    };
  }

  rejoinRoom(
    rawCode: string,
    rejoinToken: string
  ):
    | {
        ok: true;
        code: string;
        participantId: string;
        role: ParticipantRole;
        snapshot: AuthoritativeRoomSnapshot;
      }
    | {
        ok: false;
        errorCode: 'ROOM_NOT_FOUND' | 'INVALID_TOKEN' | 'ROOM_ENDED';
        message: string;
      } {
    const code = rawCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    const now = Date.now();

    if (!room || now >= room.expiresAt) {
      return {
        ok: false,
        errorCode: 'ROOM_NOT_FOUND',
        message: `Room ${code} sudah tidak tersedia di memori server.`,
      };
    }

    if (room.phase === 'ended') {
      return {
        ok: false,
        errorCode: 'ROOM_ENDED',
        message: 'Sesi telah berakhir (batas tunggu 5 menit terlampaui).',
      };
    }

    const participant = room.participants.find((p) => p.rejoinToken === rejoinToken);
    if (!participant) {
      return {
        ok: false,
        errorCode: 'INVALID_TOKEN',
        message: 'Token rejoin tidak cocok untuk room ini.',
      };
    }

    if (participant.rejoinExpiresAt && now > participant.rejoinExpiresAt) {
      return {
        ok: false,
        errorCode: 'ROOM_ENDED',
        message: 'Waktu tunggu rejoin 5 menit telah habis.',
      };
    }

    participant.connected = true;
    participant.lastSeenAt = now;
    participant.rejoinExpiresAt = null;
    room.version += 1;
    this.recomputeConnectionState(room, now);

    return {
      ok: true,
      code,
      participantId: participant.participantId,
      role: participant.role,
      snapshot: this.toPublicSnapshot(room),
    };
  }

  markDisconnected(code: string, participantId: string): AuthoritativeRoomSnapshot | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    const now = Date.now();
    const target = room.participants.find((p) => p.participantId === participantId);
    if (!target) return null;

    target.connected = false;
    target.ready = false;
    target.lastSeenAt = now;
    target.rejoinExpiresAt = now + REJOIN_WINDOW_MS;
    if (room.phase === 'countdown') {
      room.countdown = null;
      room.phase = 'setup';
    }
    room.version += 1;
    this.recomputeConnectionState(room, now);
    return this.toPublicSnapshot(room);
  }

  setReady(code: string, participantId: string, ready: boolean): AuthoritativeRoomSnapshot | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    const target = room.participants.find((p) => p.participantId === participantId);
    if (!target) return null;

    target.ready = ready;
    target.lastSeenAt = Date.now();
    room.version += 1;
    this.recomputeConnectionState(room, Date.now());
    return this.toPublicSnapshot(room);
  }

  updateConfig(
    code: string,
    role: ParticipantRole,
    patch: {
      takeCount?: 3 | 4;
      selectedFilter?: PhotoFilterId;
      layout?: TemplateLayoutId;
      phase?: RoomSessionPhase;
    }
  ):
    | { ok: true; snapshot: AuthoritativeRoomSnapshot }
    | { ok: false; errorCode: 'ROOM_NOT_FOUND' | 'FORBIDDEN_ROLE'; message: string } {
    const room = this.rooms.get(code);
    if (!room) {
      return { ok: false, errorCode: 'ROOM_NOT_FOUND', message: 'Room tidak ditemukan.' };
    }
    if (role !== 'host' && (patch.takeCount !== undefined || patch.selectedFilter !== undefined)) {
      return {
        ok: false,
        errorCode: 'FORBIDDEN_ROLE',
        message: 'Hanya Host yang dapat mengubah jumlah take atau filter kamera.',
      };
    }

    if (patch.takeCount) room.takeCount = patch.takeCount;
    if (patch.selectedFilter) room.selectedFilter = patch.selectedFilter;
    if (patch.layout) {
      const prev = room.layout;
      room.layout = patch.layout;
      room.editorState.editorVersion += 1;
      room.editorState.lastActor = role;
      room.editorState.history.push({
        opId: randomUUID(),
        actor: role,
        timestamp: Date.now(),
        kind: 'set-layout',
        prevValue: prev,
        nextValue: patch.layout,
      });
    }
    if (patch.phase) room.phase = patch.phase;

    room.version += 1;
    this.recomputeConnectionState(room, Date.now());
    return { ok: true, snapshot: this.toPublicSnapshot(room) };
  }

  scheduleCountdown(
    code: string,
    role: ParticipantRole,
    takeNumber: number
  ):
    | {
        ok: true;
        countdown: ScheduledCountdown;
        snapshot: AuthoritativeRoomSnapshot;
      }
    | {
        ok: false;
        errorCode: 'ROOM_NOT_FOUND' | 'FORBIDDEN_ROLE' | 'NOT_READY';
        message: string;
      } {
    const room = this.rooms.get(code);
    if (!room) {
      return { ok: false, errorCode: 'ROOM_NOT_FOUND', message: 'Room tidak ditemukan.' };
    }
    if (role !== 'host') {
      return {
        ok: false,
        errorCode: 'FORBIDDEN_ROLE',
        message: 'Hanya Host yang boleh memulai aba-aba countdown foto.',
      };
    }

    if (room.mode === 'duo') {
      const host = room.participants.find((p) => p.role === 'host');
      const guest = room.participants.find((p) => p.role === 'guest');
      if (!host?.connected || !guest?.connected || !host.ready || !guest.ready) {
        return {
          ok: false,
          errorCode: 'NOT_READY',
          message: 'Host dan Guest harus sama-sama terhubung & Ready sebelum countdown.',
        };
      }
    }

    const now = Date.now();
    const countdown: ScheduledCountdown = {
      attemptId: randomUUID(),
      takeNumber,
      startedAtServer: now,
      targetCaptureAtServer: now + CLASSIC_COUNTDOWN_MS,
      durationMs: CLASSIC_COUNTDOWN_MS,
    };

    room.phase = 'countdown';
    room.countdown = countdown;
    room.version += 1;

    return { ok: true, countdown, snapshot: this.toPublicSnapshot(room) };
  }

  syncCapturedFrame(
    code: string,
    role: ParticipantRole,
    frameIndex: number,
    dataUrl: string
  ): AuthoritativeRoomSnapshot | null {
    const room = this.rooms.get(code);
    if (!room || frameIndex < 0 || frameIndex > 3) return null;

    let entry = room.syncedFrames.find((f) => f.frameIndex === frameIndex);
    if (!entry) {
      entry = { frameIndex, updatedAt: Date.now() };
      room.syncedFrames.push(entry);
    }

    if (role === 'host') {
      entry.hostDataUrl = dataUrl;
    } else {
      entry.guestDataUrl = dataUrl;
    }
    entry.updatedAt = Date.now();
    room.version += 1;
    return this.toPublicSnapshot(room);
  }

  requestRetake(
    code: string,
    role: ParticipantRole,
    frameId: number
  ): AuthoritativeRoomSnapshot | null {
    const room = this.rooms.get(code);
    if (!room || room.retakesRemaining <= 0) return null;

    room.retakePrompt = {
      requestId: randomUUID(),
      frameId,
      requestedBy: role,
      status: role === 'host' ? 'approved' : 'pending',
    };
    if (role === 'host') {
      room.retakesRemaining = Math.max(0, room.retakesRemaining - 1);
    }
    room.version += 1;
    return this.toPublicSnapshot(room);
  }

  decideRetake(
    code: string,
    role: ParticipantRole,
    requestId: string,
    approved: boolean
  ): AuthoritativeRoomSnapshot | null {
    const room = this.rooms.get(code);
    if (!room || role !== 'host' || !room.retakePrompt) return null;
    if (room.retakePrompt.requestId !== requestId) return null;

    room.retakePrompt = {
      ...room.retakePrompt,
      status: approved ? 'approved' : 'rejected',
    };
    if (approved) {
      room.retakesRemaining = Math.max(0, room.retakesRemaining - 1);
    }
    room.version += 1;
    return this.toPublicSnapshot(room);
  }

  applyEditorOperation(
    code: string,
    actor: ParticipantRole,
    params: {
      opId: string;
      kind: 'toggle-sticker' | 'set-tint' | 'set-caption';
      stickerId?: string;
      value?: string;
    }
  ): AuthoritativeRoomSnapshot | null {
    const room = this.rooms.get(code);
    if (!room || room.editorState.pausedByDisconnect) return null;

    // Idempotency guard against duplicate retries
    if (room.editorState.history.some((h) => h.opId === params.opId)) {
      return this.toPublicSnapshot(room);
    }

    const now = Date.now();
    const editor = room.editorState;

    if (params.kind === 'toggle-sticker' && params.stickerId) {
      const stk = editor.stickers.find((s) => s.id === params.stickerId);
      if (!stk) return null;
      const prevActive = stk.active;
      const nextActive = !stk.active;
      stk.active = nextActive;
      stk.owner = actor;
      const op: EditorOperation = {
        opId: params.opId,
        actor,
        timestamp: now,
        kind: 'toggle-sticker',
        stickerId: stk.id,
        prevActive,
        nextActive,
      };
      editor.history.push(op);
    } else if (params.kind === 'set-tint' && typeof params.value === 'string') {
      const prevValue = editor.stripTint;
      editor.stripTint = params.value;
      editor.history.push({
        opId: params.opId,
        actor,
        timestamp: now,
        kind: 'set-tint',
        prevValue,
        nextValue: params.value,
      });
    } else if (params.kind === 'set-caption' && typeof params.value === 'string') {
      const prevValue = editor.caption;
      editor.caption = params.value;
      editor.history.push({
        opId: params.opId,
        actor,
        timestamp: now,
        kind: 'set-caption',
        prevValue,
        nextValue: params.value,
      });
    }

    editor.editorVersion += 1;
    editor.lastActor = actor;
    room.version += 1;
    return this.toPublicSnapshot(room);
  }

  applyPersonalUndo(
    code: string,
    targetActor: ParticipantRole
  ): AuthoritativeRoomSnapshot | null {
    const room = this.rooms.get(code);
    if (!room || room.editorState.pausedByDisconnect) return null;
    const editor = room.editorState;

    // Walk backward to find the most recent operation by targetActor
    for (let i = editor.history.length - 1; i >= 0; i--) {
      const op = editor.history[i];
      if (op.actor !== targetActor) continue;

      editor.history.splice(i, 1);
      if (op.kind === 'toggle-sticker' && op.stickerId) {
        const stk = editor.stickers.find((s) => s.id === op.stickerId);
        if (stk && typeof op.prevActive === 'boolean') {
          stk.active = op.prevActive;
        }
      } else if (op.kind === 'set-tint' && typeof op.prevValue === 'string') {
        editor.stripTint = op.prevValue;
      } else if (op.kind === 'set-caption' && typeof op.prevValue === 'string') {
        editor.caption = op.prevValue;
      } else if (op.kind === 'set-layout' && typeof op.prevValue === 'string') {
        room.layout = op.prevValue as TemplateLayoutId;
      }

      editor.editorVersion += 1;
      editor.lastActor = targetActor;
      room.version += 1;
      return this.toPublicSnapshot(room);
    }

    // Fallback: deactivate any active stickers owned by targetActor
    let changed = false;
    editor.stickers.forEach((s) => {
      if (s.owner === targetActor && s.active) {
        s.active = false;
        changed = true;
      }
    });
    if (changed) {
      editor.editorVersion += 1;
      editor.lastActor = targetActor;
      room.version += 1;
    }
    return this.toPublicSnapshot(room);
  }

  getPublicSnapshot(rawCode: string): AuthoritativeRoomSnapshot | null {
    const room = this.rooms.get(rawCode.trim().toUpperCase());
    if (!room) return null;
    return this.toPublicSnapshot(room);
  }

  getActiveRoomCount(): number {
    return this.rooms.size;
  }

  sweepExpired(): string[] {
    const now = Date.now();
    const removed: string[] = [];

    for (const [code, room] of this.rooms.entries()) {
      const host = room.participants.find((p) => p.role === 'host');
      if (host && !host.connected && host.rejoinExpiresAt && now > host.rejoinExpiresAt) {
        room.phase = 'ended';
        room.connectionState = 'error';
      }

      const guest = room.participants.find((p) => p.role === 'guest');
      if (guest && !guest.connected && guest.rejoinExpiresAt && now > guest.rejoinExpiresAt) {
        room.participants = room.participants.filter((p) => p.role !== 'guest');
        room.version += 1;
        this.recomputeConnectionState(room, now);
      }

      if (now >= room.expiresAt || (room.idleDestroyAt && now >= room.idleDestroyAt)) {
        this.rooms.delete(code);
        removed.push(code);
      }
    }

    return removed;
  }
}
