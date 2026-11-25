import { randomBytes, randomUUID } from 'node:crypto';
import {
  DEFAULT_STICKER_LIBRARY,
  DEFAULT_CLASSIC_CAMERA_EFFECTS,
  FLIPBOOK_OVERLAY_EFFECTS,
  isCameraAccessoryId,
  updateClassicCameraEffects,
  type AuthoritativeRoomSnapshot,
  type BoothMode,
  type ClassicCameraEffectChange,
  type ClassicCameraEffects,
  type CollaborativeEditorState,
  type DuoCameraAccessories,
  type EditorOperation,
  type ParticipantRole,
  type PhotoFilterId,
  type PlacedSticker,
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
  takeCount: number;
  selectedFilter: PhotoFilterId;
  classicCameraEffects?: ClassicCameraEffects;
  flipbookAccessories?: DuoCameraAccessories;
  layout: TemplateLayoutId;
  retakesRemaining: number;
  participants: InternalParticipant[];
  guestAdmitted?: boolean;
  countdown: ScheduledCountdown | null;
  retakePrompt: RetakePromptState | null;
  syncedFrames: SyncedFrameMedia[];
  editorState: CollaborativeEditorState;
}

export function createInitialEditorState(): CollaborativeEditorState {
  return {
    editorVersion: 1,
    stripTint: '#FFFFFF',
    caption: '',
    stickers: DEFAULT_STICKER_LIBRARY.map((s) => ({ ...s, active: false })),
    placedStickers: [],
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
    let code: string;
    do {
      code = 'MMT-' + randomBytes(5).toString('hex').toUpperCase();
    } while (this.rooms.has(code));
    return code;
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
      classicCameraEffects: room.classicCameraEffects && {
        ...room.classicCameraEffects,
        accessories: { ...room.classicCameraEffects.accessories },
      },
      flipbookAccessories: room.flipbookAccessories && { ...room.flipbookAccessories },
      layout: room.layout,
      retakesRemaining: room.retakesRemaining,
      participants: room.participants.map(({ rejoinToken: _token, ...pub }) => ({ ...pub })),
      countdown: room.countdown ? { ...room.countdown } : null,
      retakePrompt: room.retakePrompt ? { ...room.retakePrompt } : null,
      syncedFrames: room.syncedFrames.map((sf) => ({ ...sf })),
      editorState: {
        ...room.editorState,
        stickers: room.editorState.stickers.map((s) => ({ ...s })),
        placedStickers: room.editorState.placedStickers.map((ps) => ({ ...ps })),
        history: room.editorState.history.map((h) => ({ ...h })),
      },
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
    takeCount?: number;
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
      takeCount: Math.max(1, Math.min(8, Math.round(params.takeCount ?? 4))),
      selectedFilter: params.selectedFilter ?? 'normal',
      layout: 'strip-1x4',
      retakesRemaining: 3,
      participants: [host],
      countdown: null,
      retakePrompt: null,
      syncedFrames: [0, 1, 2, 3, 4, 5, 6, 7].map((frameIndex) => ({
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

    if (room.guestAdmitted || room.participants.length >= MAX_PARTICIPANTS) {
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

    room.guestAdmitted = true;
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
      takeCount?: number;
      selectedFilter?: PhotoFilterId;
      layout?: TemplateLayoutId;
      phase?: RoomSessionPhase;
      classicCameraEffect?: unknown;
      flipbookAccessory?: unknown;
    }
  ):
    | { ok: true; snapshot: AuthoritativeRoomSnapshot }
    | { ok: false; errorCode: 'ROOM_NOT_FOUND' | 'FORBIDDEN_ROLE' | 'BAD_REQUEST'; message: string } {
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

    const classicEffect = patch.classicCameraEffect as ClassicCameraEffectChange | undefined;
    if (classicEffect !== undefined) {
      if (role !== 'host') {
        return { ok: false, errorCode: 'FORBIDDEN_ROLE', message: 'Hanya Host yang dapat mengatur efek kamera Classic Duo.' };
      }
      if (room.mode !== 'duo' || !classicEffect || typeof classicEffect !== 'object' ||
        (classicEffect.overlay === undefined && classicEffect.accessory === undefined) ||
        (classicEffect.overlay !== undefined && !FLIPBOOK_OVERLAY_EFFECTS.some(({ id }) => id === classicEffect.overlay)) ||
        (classicEffect.accessory !== undefined && (!classicEffect.accessory ||
          (classicEffect.accessory.role !== 'host' && classicEffect.accessory.role !== 'guest') ||
          !isCameraAccessoryId(classicEffect.accessory.id)))) {
        return { ok: false, errorCode: 'BAD_REQUEST', message: 'Pilihan efek kamera Classic tidak valid.' };
      }
    }

    if (patch.flipbookAccessory !== undefined) {
      if (role !== 'host') {
        return { ok: false, errorCode: 'FORBIDDEN_ROLE', message: 'Hanya Host yang bisa memilih aksesori Duo.' };
      }
      const accessory = patch.flipbookAccessory as { role?: unknown; id?: unknown } | null;
      if (room.mode !== 'duo' || !accessory ||
        (accessory.role !== 'host' && accessory.role !== 'guest') || !isCameraAccessoryId(accessory.id)) {
        return { ok: false, errorCode: 'BAD_REQUEST', message: 'Pilihan aksesori Duo tidak valid.' };
      }
      room.flipbookAccessories = {
        host: room.flipbookAccessories?.host ?? 'none',
        guest: room.flipbookAccessories?.guest ?? 'none',
        [accessory.role]: accessory.id,
      };
    }

    if (patch.takeCount !== undefined) {
      room.takeCount = Math.max(1, Math.min(8, Math.round(patch.takeCount)));
    }
    if (patch.selectedFilter) room.selectedFilter = patch.selectedFilter;
    if (classicEffect) {
      room.classicCameraEffects = updateClassicCameraEffects(room.classicCameraEffects ?? DEFAULT_CLASSIC_CAMERA_EFFECTS, classicEffect);
    }
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
    const pose = room.syncedFrames[takeNumber - 1];
    const prompt = room.retakePrompt;
    const complete = pose?.retakes?.host !== undefined && pose.retakes.guest !== undefined;
    const approved = prompt?.status === 'approved' && prompt.frameId === takeNumber;
    if (!pose || takeNumber > room.takeCount || (complete && !approved)) {
      return { ok: false, errorCode: 'NOT_READY', message: 'Pilih foto dan setujui pengambilan ulang terlebih dahulu.' };
    }
    const countdown: ScheduledCountdown = {
      retakeRole: prompt?.status === 'approved' && prompt.frameId === takeNumber ? prompt.requestedBy : undefined,
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
    dataUrl?: string
  ): AuthoritativeRoomSnapshot | null {
    const room = this.rooms.get(code);
    if (!room || room.countdown?.takeNumber !== frameIndex + 1) return null;
    if (room.countdown.retakeRole && room.countdown.retakeRole !== role) return null;

    let entry = room.syncedFrames.find((f) => f.frameIndex === frameIndex);
    if (!entry) {
      entry = { frameIndex, updatedAt: Date.now() };
      room.syncedFrames.push(entry);
    }

    const previous = entry.retakes?.[role];
    if (room.countdown.retakeRole && (previous ?? 0) >= 3) return null;
    const nextCount = room.countdown.retakeRole ? (previous ?? 0) + 1 : (previous ?? 0);
    entry.retakes = { ...entry.retakes, [role]: nextCount };
    if (room.countdown.retakeRole || (entry.retakes.host !== undefined && entry.retakes.guest !== undefined)) {
      room.countdown = null;
      room.phase = 'review';
      room.retakePrompt = null;
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
    const count = room?.syncedFrames[frameId - 1]?.retakes?.[role];
    if (!room || count === undefined || count >= 3 || room.retakePrompt?.status === 'pending') return null;

    room.retakePrompt = {
      requestId: randomUUID(),
      frameId,
      requestedBy: role,
      status: role === 'host' ? 'approved' : 'pending',
    };
    if (role === 'host') {
      room.participants.forEach(p => { p.ready = false; });
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
    if (room.retakePrompt.status !== 'pending' || room.retakePrompt.requestId !== requestId) return null;

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
      kind:
        | 'toggle-sticker'
        | 'set-tint'
        | 'set-caption'
        | 'add-sticker'
        | 'update-sticker'
        | 'remove-sticker';
      stickerId?: string;
      value?: string;
      placedSticker?: PlacedSticker;
      instanceId?: string;
      patch?: Partial<Pick<PlacedSticker, 'xPct' | 'yPct' | 'scale' | 'rotation'>>;
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
    if (params.kind === 'add-sticker' && editor.placedStickers.length >= 256) return null;
    if (editor.history.length >= 2048) editor.history.shift();

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
    } else if (params.kind === 'add-sticker' && params.placedSticker) {
      const item: PlacedSticker = { ...params.placedSticker, owner: actor };
      editor.placedStickers.push(item);
      editor.history.push({
        opId: params.opId,
        actor,
        timestamp: now,
        kind: 'add-sticker',
        instanceId: item.instanceId,
        placedSticker: { ...item },
      });
    } else if (params.kind === 'update-sticker' && params.instanceId && params.patch) {
      const target = editor.placedStickers.find((ps) => ps.instanceId === params.instanceId);
      if (!target) return null;
      const prevStickerState: PlacedSticker = { ...target };
      if (typeof params.patch.xPct === 'number') target.xPct = params.patch.xPct;
      if (typeof params.patch.yPct === 'number') target.yPct = params.patch.yPct;
      if (typeof params.patch.scale === 'number') target.scale = params.patch.scale;
      if (typeof params.patch.rotation === 'number') target.rotation = params.patch.rotation;
      editor.history.push({
        opId: params.opId,
        actor,
        timestamp: now,
        kind: 'update-sticker',
        instanceId: target.instanceId,
        prevStickerState,
        placedSticker: { ...target },
      });
    } else if (params.kind === 'remove-sticker' && params.instanceId) {
      const idx = editor.placedStickers.findIndex((ps) => ps.instanceId === params.instanceId);
      if (idx === -1) return null;
      const [removed] = editor.placedStickers.splice(idx, 1);
      editor.history.push({
        opId: params.opId,
        actor,
        timestamp: now,
        kind: 'remove-sticker',
        instanceId: removed.instanceId,
        prevStickerState: { ...removed },
      });
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
      } else if (op.kind === 'add-sticker' && op.instanceId) {
        const idx = editor.placedStickers.findIndex((ps) => ps.instanceId === op.instanceId);
        if (idx >= 0) editor.placedStickers.splice(idx, 1);
      } else if (op.kind === 'update-sticker' && op.prevStickerState) {
        const target = editor.placedStickers.find(
          (ps) => ps.instanceId === op.prevStickerState?.instanceId
        );
        if (target) Object.assign(target, op.prevStickerState);
      } else if (op.kind === 'remove-sticker' && op.prevStickerState) {
        editor.placedStickers.push({ ...op.prevStickerState });
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

    // Fallback: remove last placed sticker or deactivate legacy sticker owned by targetActor
    let changed = false;
    for (let j = editor.placedStickers.length - 1; j >= 0; j--) {
      if (editor.placedStickers[j].owner === targetActor) {
        editor.placedStickers.splice(j, 1);
        changed = true;
        break;
      }
    }
    if (!changed) {
      editor.stickers.forEach((s) => {
        if (s.owner === targetActor && s.active) {
          s.active = false;
          changed = true;
        }
      });
    }
    if (changed) {
      editor.editorVersion += 1;
      editor.lastActor = targetActor;
      room.version += 1;
    }
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
