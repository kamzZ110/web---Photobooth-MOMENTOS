import {
  DEFAULT_STICKER_LIBRARY,
  DEFAULT_CLASSIC_CAMERA_EFFECTS,
  updateClassicCameraEffects,
  type ClassicCameraEffectChange,
  type AuthoritativeRoomSnapshot,
  type DuoCameraAccessoryChange,
  type BoothMode,
  type ClientToServerMessage,
  type CollaborativeEditorState,
  type EditorOperation,
  type ParticipantRole,
  type PhotoFilterId,
  type PlacedSticker,
  type RoomSessionPhase,
  type ScheduledCountdown,
  type ServerToClientMessage,
  type TemplateLayoutId,
  type WebRtcSignalPayload,
} from '@momentos/shared';

export type TransportMode = 'websocket' | 'connecting' | 'broadcast-fallback';
export type WebRtcConnectionState = 'idle' | 'connecting' | 'connected' | 'relay' | 'failed';

export interface SavedRoomSession {
  code: string;
  rejoinToken: string;
  role: ParticipantRole;
}

export interface RealtimeClientState {
  transport: TransportMode;
  role: ParticipantRole | null;
  participantId: string | null;
  rejoinToken: string | null;
  snapshot: AuthoritativeRoomSnapshot | null;
  clockOffsetMs: number;
  rttMs: number | null;
  lastError: string | null;
  lastScheduledCountdown: ScheduledCountdown | null;
  webrtcState: WebRtcConnectionState;
  forceTurnRelay: boolean;
  remoteStream: MediaStream | null;
  dataChannelOpen: boolean;
}

type Listener = (state: RealtimeClientState) => void;

const VITE_ENV: Record<string, string | undefined> =
  ((import.meta as unknown as { env?: Record<string, string | undefined> }).env) ?? {};

const SESSION_STORAGE_KEY = 'momentos.rejoin.session.v1';
const WS_URL = VITE_ENV.VITE_WS_URL || 'ws://localhost:4000/ws';
const CHUNK_SIZE = 16000;
const MAX_FRAME_DATA_URL_LENGTH = 3_500_000;

interface DataChannelChunkMessage {
  type: 'frame-chunk' | 'frame-complete';
  transferId: string;
  role: ParticipantRole;
  frameIndex: number;
  chunkIndex?: number;
  totalChunks?: number;
  chunk?: string;
}

function createInitialLocalEditorState(): CollaborativeEditorState {
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

class MomentosRealtimeClient {
  private turnServer: RTCIceServer | null = null;
  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private listeners = new Set<Listener>();
  private clockTimer: number | null = null;

  // WebRTC Peer-to-Peer + STUN/TURN + RTCDataChannel (Tahap 5)
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private pendingIce: RTCIceCandidateInit[] = [];
  private incomingTransfers = new Map<
    string,
    { role: ParticipantRole; frameIndex: number; totalChunks: number; chunks: string[] }
  >();

  private state: RealtimeClientState = {
    transport: 'broadcast-fallback',
    role: null,
    participantId: null,
    rejoinToken: null,
    snapshot: null,
    clockOffsetMs: 0,
    rttMs: null,
    lastError: null,
    lastScheduledCountdown: null,
    webrtcState: 'idle',
    forceTurnRelay: false,
    remoteStream: null,
    dataChannelOpen: false,
  };

  constructor() {
    if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/booth') || new URLSearchParams(window.location.search).has('room'))) {
      this.connectWebSocket();
    }
  }

  private openLocalRoom(code: string) {
    this.bc?.close();
    if (typeof BroadcastChannel === 'undefined') return;
    this.bc = new BroadcastChannel('momentos-room-' + code);
    this.bc.onmessage = event => this.handleBroadcastMessage(event.data);
  }

  public getState(): RealtimeClientState {
    return this.state;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private patchState(patch: Partial<RealtimeClientState>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  public getSavedSession(): SavedRoomSession | null {
    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SavedRoomSession;
    } catch {
      return null;
    }
  }

  private saveSession(session: SavedRoomSession | null): void {
    try {
      if (!session) {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      }
    } catch {
      // ignore storage quota errors
    }
  }

  public ensureTransport(): void {
    if (!this.ws && !this.bc) this.connectWebSocket();
  }

  public retryWebSocketConnection(): void {
    this.connectWebSocket();
  }

  private connectWebSocket(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      this.patchState({ transport: 'connecting' });
      const ws = new WebSocket(WS_URL);
      this.ws = ws;

      ws.onopen = () => {
        this.patchState({ transport: 'websocket', lastError: null });
        this.startClockSync();
        const saved = this.getSavedSession();
        if (saved) {
          this.sendWs({
            type: 'room:rejoin',
            code: saved.code,
            rejoinToken: saved.rejoinToken,
          });
        }
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as ServerToClientMessage;
          this.handleServerMessage(msg);
        } catch {
          // ignore invalid JSON
        }
      };

      ws.onerror = () => {
        if (this.state.transport !== 'websocket') {
          this.patchState({ transport: 'broadcast-fallback' });
        }
      };

      ws.onclose = () => {
        this.stopClockSync();
        this.patchState({ transport: 'broadcast-fallback' });
      };
    } catch {
      this.patchState({ transport: 'broadcast-fallback' });
    }
  }

  private startClockSync(): void {
    this.stopClockSync();
    const ping = () => {
      this.sendWs({
        type: 'clock:ping',
        clientSentAt: Date.now(),
      });
    };
    ping();
    this.clockTimer = window.setInterval(ping, 12_000);
  }

  private stopClockSync(): void {
    if (this.clockTimer !== null) {
      window.clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
  }

  private sendWs(msg: ClientToServerMessage): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  // ============================================================================
  // TAHAP 4: ROOM & SESSION MANAGEMENT
  // ============================================================================
  public createRoom(params?: {
    displayName?: string;
    mode?: BoothMode;
    takeCount?: number;
    selectedFilter?: PhotoFilterId;
  }): void {
    const sent = this.sendWs({
      type: 'room:create',
      displayName: params?.displayName ?? 'Host',
      mode: params?.mode ?? 'duo',
      takeCount: params?.takeCount ?? 4,
      selectedFilter: params?.selectedFilter ?? 'normal',
    });

    if (!sent) {
      const now = Date.now();
      const code = `MMT-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
      this.openLocalRoom(code);
      const participantId = `host-${now}`;
      const rejoinToken = `tok-host-${now}`;
      const mode = params?.mode ?? 'duo';
      const snapshot: AuthoritativeRoomSnapshot = {
        code,
        version: 1,
        mode,
        phase: 'waiting',
        connectionState: mode === 'solo' ? 'connected' : 'waiting',
        createdAt: now,
        expiresAt: now + 60 * 60 * 1000,
        idleDestroyAt: null,
        takeCount: params?.takeCount ?? 4,
        selectedFilter: params?.selectedFilter ?? 'normal',
        layout: 'strip-1x4',
        retakesRemaining: 3,
        participants: [
          {
            participantId,
            role: 'host',
            displayName: params?.displayName?.trim() || 'Host',
            connected: true,
            ready: true,
            lastSeenAt: now,
            rejoinExpiresAt: null,
          },
        ],
        countdown: null,
        retakePrompt: null,
        syncedFrames: [0, 1, 2, 3, 4, 5, 6, 7].map((frameIndex) => ({
          frameIndex,
          updatedAt: now,
        })),
        editorState: createInitialLocalEditorState(),
      };

      this.saveSession({ code, rejoinToken, role: 'host' });
      this.patchState({
        role: 'host',
        participantId,
        rejoinToken,
        snapshot,
        lastError: null,
      });
      this.bc?.postMessage({ type: 'bc:snapshot', snapshot });
    }
  }

  public joinRoom(rawCode: string, displayName = 'Guest'): void {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;
    this.patchState({ lastError: null });
    const sent = this.sendWs({
      type: 'room:join',
      code,
      displayName,
    });

    if (!sent) {
      this.openLocalRoom(code);
      const channel = this.bc;
      window.setTimeout(() => {
        if (this.bc === channel && !this.state.role) this.patchState({ lastError: 'Room lokal tidak ditemukan. Periksa kode atau sambungkan server Duo.' });
      }, 4000);
      this.bc?.postMessage({
        type: 'bc:join-request',
        code,
        displayName,
      });
    }
  }

  public rejoinSavedSession(): void {
    const saved = this.getSavedSession();
    if (!saved) return;

    const sent = this.sendWs({
      type: 'room:rejoin',
      code: saved.code,
      rejoinToken: saved.rejoinToken,
    });

    if (!sent && this.state.snapshot) {
      this.resumeFromRecoveryWindow();
    }
  }

  public leaveRoom(): void {
    this.bc?.close();
    this.bc = null;
    this.turnServer = null;
    this.sendWs({ type: 'room:leave' });
    this.cleanupWebRtc();
    this.saveSession(null);
    this.patchState({
      role: null,
      participantId: null,
      rejoinToken: null,
      snapshot: null,
      lastError: null,
      lastScheduledCountdown: null,
      webrtcState: 'idle',
      remoteStream: null,
      dataChannelOpen: false,
    });
  }

  public setReady(ready: boolean): void {
    const sent = this.sendWs({
      type: 'participant:ready',
      ready,
    });

    if (!sent && this.state.snapshot && this.state.participantId) {
      const now = Date.now();
      const participants = this.state.snapshot.participants.map((p) =>
        p.participantId === this.state.participantId
          ? { ...p, ready, lastSeenAt: now }
          : p
      );
      const allReady =
        participants.length === 2 && participants.every((p) => p.connected && p.ready);
      const next: AuthoritativeRoomSnapshot = {
        ...this.state.snapshot,
        version: this.state.snapshot.version + 1,
        phase: allReady ? 'ready' : 'setup',
        participants,
      };
      this.patchState({ snapshot: next });
      this.bc?.postMessage({ type: 'bc:snapshot', snapshot: next });
    }
  }

  public syncConfig(patch: {
    takeCount?: number;
    selectedFilter?: PhotoFilterId;
    layout?: TemplateLayoutId;
    phase?: RoomSessionPhase;
    classicCameraEffect?: ClassicCameraEffectChange;
    flipbookAccessory?: DuoCameraAccessoryChange;
  }): void {
    const sent = this.sendWs({
      type: 'session:config',
      ...patch,
    });

    if (!sent && this.state.snapshot) {
      const accessory = patch.flipbookAccessory;
      if ((accessory || patch.classicCameraEffect) && (this.state.role !== 'host' || this.state.snapshot.mode !== 'duo')) return;
      const prevLayout = this.state.snapshot.layout;
      const nextEditor = { ...this.state.snapshot.editorState };
      if (patch.layout && patch.layout !== prevLayout) {
        nextEditor.editorVersion += 1;
        nextEditor.lastActor = this.state.role ?? 'host';
        nextEditor.history = [
          ...nextEditor.history,
          {
            opId: `op-layout-${Date.now()}`,
            actor: this.state.role ?? 'host',
            timestamp: Date.now(),
            kind: 'set-layout',
            prevValue: prevLayout,
            nextValue: patch.layout,
          },
        ];
      }
      const next: AuthoritativeRoomSnapshot = {
        ...this.state.snapshot,
        version: this.state.snapshot.version + 1,
        takeCount: patch.takeCount ?? this.state.snapshot.takeCount,
        selectedFilter: patch.selectedFilter ?? this.state.snapshot.selectedFilter,
        classicCameraEffects: patch.classicCameraEffect
          ? updateClassicCameraEffects(this.state.snapshot.classicCameraEffects ?? DEFAULT_CLASSIC_CAMERA_EFFECTS, patch.classicCameraEffect)
          : this.state.snapshot.classicCameraEffects,
        flipbookAccessories: accessory ? {
          host: this.state.snapshot.flipbookAccessories?.host ?? 'none',
          guest: this.state.snapshot.flipbookAccessories?.guest ?? 'none',
          [accessory.role]: accessory.id,
        } : this.state.snapshot.flipbookAccessories,
        layout: patch.layout ?? this.state.snapshot.layout,
        phase: patch.phase ?? this.state.snapshot.phase,
        editorState: nextEditor,
      };
      this.patchState({ snapshot: next });
      this.bc?.postMessage({ type: 'bc:snapshot', snapshot: next });
    }
  }

  public simulateDropRecoveryWindow(): void {
    if (!this.state.snapshot) return;
    const now = Date.now();
    const targetRole: ParticipantRole = this.state.role ?? 'guest';
    const participants = this.state.snapshot.participants.map((p) =>
      p.role === targetRole
        ? {
            ...p,
            connected: false,
            ready: false,
            rejoinExpiresAt: now + 5 * 60 * 1000,
          }
        : p
    );
    const next: AuthoritativeRoomSnapshot = {
      ...this.state.snapshot,
      version: this.state.snapshot.version + 1,
      connectionState: 'reconnecting',
      participants,
      editorState: {
        ...this.state.snapshot.editorState,
        pausedByDisconnect: true,
      },
    };
    this.patchState({ snapshot: next });
    this.bc?.postMessage({ type: 'bc:snapshot', snapshot: next });
  }

  public resumeFromRecoveryWindow(): void {
    if (!this.state.snapshot) return;
    const now = Date.now();
    const participants = this.state.snapshot.participants.map((p) => ({
      ...p,
      connected: true,
      ready: true,
      lastSeenAt: now,
      rejoinExpiresAt: null,
    }));
    const next: AuthoritativeRoomSnapshot = {
      ...this.state.snapshot,
      version: this.state.snapshot.version + 1,
      connectionState: participants.length >= 2 ? 'connected' : 'waiting',
      participants,
      editorState: {
        ...this.state.snapshot.editorState,
        pausedByDisconnect: false,
      },
    };
    this.patchState({ snapshot: next, lastError: null });
    this.bc?.postMessage({ type: 'bc:snapshot', snapshot: next });
  }

  // ============================================================================
  // TAHAP 5: WEBRTC P2P STREAM + STUN/TURN + SYNCHRONIZED CAPTURE & RETAKE
  // ============================================================================
  public setForceTurnRelay(force: boolean): void {
    this.patchState({ forceTurnRelay: force });
    if (this.pc) {
      void this.startWebRtcNegotiation();
    }
  }

  public attachLocalStream(stream: MediaStream | null): void {
    this.localStream = stream;
    if (!this.pc) return;
    const pc = this.pc;
    void this.attachCameraTrack(pc).catch(() => {
      if (this.pc === pc) this.patchState({ webrtcState: 'failed' });
    });
  }

  private async attachCameraTrack(pc: RTCPeerConnection): Promise<void> {
    const video = pc.getTransceivers().find((transceiver) => transceiver.receiver.track.kind === 'video');
    if (!video) return;
    const track = this.localStream?.getVideoTracks().find((candidate) => candidate.readyState === 'live') ?? null;
    await video.sender.replaceTrack(track);
  }

  private getIceConfig(): RTCConfiguration {
    const stunList = (
      VITE_ENV.VITE_STUN_URLS ||
      'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const iceServers: RTCIceServer[] = stunList.map((urls) => ({ urls }));
    if (this.turnServer) iceServers.push(this.turnServer);

    return {
      iceServers,
      iceTransportPolicy: this.state.forceTurnRelay ? 'relay' : 'all',
    };
  }

  private ensurePeerConnection(): RTCPeerConnection {
    if (this.pc) return this.pc;

    const pc = new RTCPeerConnection(this.getIceConfig());
    this.pc = pc;

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.sendWebRtcSignal({
          kind: 'ice',
          candidate: ev.candidate.toJSON() as unknown as Record<string, unknown>,
        });
      }
    };

    pc.ontrack = (ev) => {
      const remoteStream = ev.streams[0] ?? new MediaStream([ev.track]);
      this.patchState({ remoteStream });
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') {
        this.patchState({
          webrtcState: this.state.forceTurnRelay ? 'relay' : 'connected',
        });
      } else if (st === 'connecting') {
        this.patchState({ webrtcState: 'connecting' });
      } else if (st === 'failed' || st === 'disconnected') {
        this.patchState({ webrtcState: 'failed', dataChannelOpen: false });
      }
    };

    pc.ondatachannel = (ev) => {
      this.setupDataChannel(ev.channel);
    };

    return pc;
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    this.dc = channel;
    channel.onopen = () => {
      this.patchState({ dataChannelOpen: true });
    };
    channel.onclose = () => {
      this.patchState({ dataChannelOpen: false });
    };
    channel.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as DataChannelChunkMessage;
        this.handleDataChannelChunk(msg);
      } catch {
        // ignore invalid chunk
      }
    };
  }

  private handleDataChannelChunk(msg: DataChannelChunkMessage): void {
    if (!msg || msg.role === this.state.role || !['host', 'guest'].includes(msg.role) ||
        !Number.isInteger(msg.frameIndex) || msg.frameIndex < 0 || msg.frameIndex >= 8 ||
        typeof msg.transferId !== 'string' || msg.transferId.length > 100) return;
    if (msg.type === 'frame-chunk' && msg.chunk !== undefined && msg.chunkIndex !== undefined) {
      if (typeof msg.chunk !== 'string' || msg.chunk.length > CHUNK_SIZE ||
          !Number.isInteger(msg.chunkIndex) || !Number.isInteger(msg.totalChunks) ||
          !msg.totalChunks || msg.totalChunks > Math.ceil(MAX_FRAME_DATA_URL_LENGTH / CHUNK_SIZE) ||
          msg.chunkIndex < 0 || msg.chunkIndex >= msg.totalChunks) return;
      let item = this.incomingTransfers.get(msg.transferId);
      if (!item && this.incomingTransfers.size >= 16) return;
      if (!item) {
        item = {
          role: msg.role,
          frameIndex: msg.frameIndex,
          totalChunks: msg.totalChunks ?? 1,
          chunks: [],
        };
        this.incomingTransfers.set(msg.transferId, item);
      }
      item.chunks[msg.chunkIndex] = msg.chunk;
    } else if (msg.type === 'frame-complete') {
      const item = this.incomingTransfers.get(msg.transferId);
      if (item) {
        const dataUrl = item.chunks.join('');
        this.incomingTransfers.delete(msg.transferId);
        if (Object.keys(item.chunks).length === item.totalChunks && dataUrl.length <= MAX_FRAME_DATA_URL_LENGTH &&
            /^data:image\/(png|jpeg);base64,/.test(dataUrl)) this.applyLocalSyncedFrame(item.role, item.frameIndex, dataUrl);
      }
    }
  }

  public async startWebRtcNegotiation(): Promise<void> {
    this.cleanupWebRtc();
    if (typeof RTCPeerConnection === 'undefined') return;

    this.patchState({ webrtcState: 'connecting', remoteStream: null });
    const pc = this.ensurePeerConnection();
    // Negotiate both camera directions even when users are still choosing a theme.
    // Camera tracks can then start on either device without another offer.
    pc.addTransceiver('video', { direction: 'sendrecv' });
    const channel = pc.createDataChannel('momentos-duo-frames', { ordered: true });
    this.setupDataChannel(channel);

    try {
      await this.attachCameraTrack(pc);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.sendWebRtcSignal({
        kind: 'offer',
        sdp: offer.sdp,
      });
    } catch {
      this.patchState({ webrtcState: 'failed' });
    }
  }

  private sendWebRtcSignal(signal: WebRtcSignalPayload): void {
    const sent = this.sendWs({
      type: 'webrtc:signal',
      signal,
    });

    if (!sent && this.state.snapshot && this.state.role) {
      this.bc?.postMessage({
        type: 'bc:webrtc-signal',
        code: this.state.snapshot.code,
        fromRole: this.state.role,
        signal,
      });
    }
  }

  private async handleIncomingWebRtcSignal(
    fromRole: ParticipantRole,
    signal: WebRtcSignalPayload
  ): Promise<void> {
    if (fromRole === this.state.role) return;
    if (typeof RTCPeerConnection === 'undefined') return;

    const pc = this.ensurePeerConnection();
    try {
      if (signal.kind === 'offer' && signal.sdp) {
        this.patchState({ webrtcState: 'connecting' });
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
        const video = pc.getTransceivers().find((transceiver) => transceiver.receiver.track.kind === 'video');
        if (video) video.direction = 'sendrecv';
        await this.attachCameraTrack(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendWebRtcSignal({
          kind: 'answer',
          sdp: answer.sdp,
        });
      } else if (signal.kind === 'answer' && signal.sdp) {
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: 'answer', sdp: signal.sdp })
        );
      } else if (signal.kind === 'ice' && signal.candidate) {
        const candidate = signal.candidate as RTCIceCandidateInit;
        if (!pc.remoteDescription) {
          this.pendingIce.push(candidate);
          return;
        }
        await pc.addIceCandidate(candidate);
      }
      if (pc.remoteDescription && this.pendingIce.length > 0) {
        const pending = this.pendingIce.splice(0);
        for (const candidate of pending) await pc.addIceCandidate(candidate);
      }
    } catch {
      this.patchState({ webrtcState: 'failed' });
    }
  }

  private cleanupWebRtc(): void {
    if (this.dc) {
      try {
        this.dc.close();
      } catch {
        // ignore
      }
      this.dc = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {
        // ignore
      }
      this.pc = null;
    }
    this.incomingTransfers.clear();
    this.pendingIce = [];
  }

  public requestCountdown(takeNumber: number): void {
    const sent = this.sendWs({
      type: 'capture:request',
      takeNumber,
    });

    if (!sent) {
      if (this.state.role === 'guest') {
        this.patchState({
          lastError: 'Hanya Host yang boleh memulai aba-aba countdown foto.',
        });
        return;
      }
      const now = Date.now();
      const countdown: ScheduledCountdown = {
        attemptId: `att-${now}`,
        takeNumber,
        retakeRole: this.state.snapshot?.retakePrompt?.status === 'approved' ? this.state.snapshot.retakePrompt.requestedBy : undefined,
        startedAtServer: now,
        targetCaptureAtServer: now + 3000,
        durationMs: 3000,
      };
      this.patchState({ lastScheduledCountdown: countdown, lastError: null });
      if (this.state.snapshot) {
        this.bc?.postMessage({
          type: 'bc:countdown',
          code: this.state.snapshot.code,
          countdown,
        });
      }
    }
  }

  public syncCapturedFrame(frameIndex: number, dataUrl: string): void {
    if (!dataUrl || dataUrl.length > MAX_FRAME_DATA_URL_LENGTH) return;
    const role: ParticipantRole = this.state.role ?? 'host';

    // 1. Send via P2P RTCDataChannel in 16KB chunks if connected
    if (this.dc && this.dc.readyState === 'open') {
      const transferId = `${role}-${frameIndex}-${Date.now()}`;
      const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        const chunk = dataUrl.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const chunkMsg: DataChannelChunkMessage = {
          type: 'frame-chunk',
          transferId,
          role,
          frameIndex,
          chunkIndex: i,
          totalChunks,
          chunk,
        };
        this.dc.send(JSON.stringify(chunkMsg));
      }
      const doneMsg: DataChannelChunkMessage = {
        type: 'frame-complete',
        transferId,
        role,
        frameIndex,
      };
      this.dc.send(JSON.stringify(doneMsg));
      this.sendWs({ type: 'capture:frame-sync', frameIndex });
      this.applyLocalSyncedFrame(role, frameIndex, dataUrl);
      return;
    }

    // 2. Sync via Server or BroadcastChannel
    const sent = this.sendWs({
      type: 'capture:frame-sync',
      frameIndex,
      dataUrl,
    });

    if (!sent) {
      this.applyLocalSyncedFrame(role, frameIndex, dataUrl);
      if (this.state.snapshot) {
        this.bc?.postMessage({
          type: 'bc:frame-sync',
          code: this.state.snapshot.code,
          role,
          frameIndex,
          dataUrl,
        });
      }
    }
  }

  private applyLocalSyncedFrame(role: ParticipantRole, frameIndex: number, dataUrl: string): void {
    if (!this.state.snapshot) return;
    const syncedFrames = this.state.snapshot.syncedFrames.map((f) => ({ ...f }));
    let entry = syncedFrames.find((f) => f.frameIndex === frameIndex);
    if (!entry) {
      entry = { frameIndex, updatedAt: Date.now() };
      syncedFrames.push(entry);
    }
    if (role === 'host') {
      entry.hostDataUrl = dataUrl;
    } else {
      entry.guestDataUrl = dataUrl;
    }
    if (this.state.transport === 'broadcast-fallback') {
      entry.retakes = { ...entry.retakes, [role]: (entry.retakes?.[role] ?? -1) + 1 };
    }
    entry.updatedAt = Date.now();

    const next: AuthoritativeRoomSnapshot = {
      ...this.state.snapshot,
      version: this.state.snapshot.version + 1,
      syncedFrames,
      retakePrompt: this.state.transport === 'broadcast-fallback' ? null : this.state.snapshot.retakePrompt,
    };
    this.patchState({ snapshot: next });
  }

  public requestRetake(frameId: number): void {
    const sent = this.sendWs({
      type: 'retake:request',
      frameId,
    });

    if (!sent && this.state.snapshot) {
      const role: ParticipantRole = this.state.role ?? 'guest';
      const approvedImmediate = role === 'host';
      const next: AuthoritativeRoomSnapshot = {
        ...this.state.snapshot,
        version: this.state.snapshot.version + 1,
        participants: this.state.snapshot.participants.map(p => approvedImmediate ? { ...p, ready: false } : p),
        retakePrompt: {
          requestId: `retake-${Date.now()}`,
          frameId,
          requestedBy: role,
          status: approvedImmediate ? 'approved' : 'pending',
        },
      };
      this.patchState({ snapshot: next });
      this.bc?.postMessage({ type: 'bc:snapshot', snapshot: next });
    }
  }

  public decideRetake(requestId: string, approved: boolean): void {
    const sent = this.sendWs({
      type: 'retake:decision',
      requestId,
      approved,
    });

    if (!sent && this.state.snapshot && this.state.snapshot.retakePrompt) {
      const next: AuthoritativeRoomSnapshot = {
        ...this.state.snapshot,
        version: this.state.snapshot.version + 1,
        participants: this.state.snapshot.participants.map(p => approved ? { ...p, ready: false } : p),
        retakePrompt: {
          ...this.state.snapshot.retakePrompt,
          status: approved ? 'approved' : 'rejected',
        },
      };
      this.patchState({ snapshot: next });
      this.bc?.postMessage({ type: 'bc:snapshot', snapshot: next });
    }
  }

  // ============================================================================
  // TAHAP 6: COLLABORATIVE EDITOR & PERSONAL UNDO
  // ============================================================================
  public sendEditorOperation(
    kind:
      | 'toggle-sticker'
      | 'set-tint'
      | 'set-caption'
      | 'add-sticker'
      | 'update-sticker'
      | 'remove-sticker',
    payload: {
      stickerId?: string;
      value?: string;
      placedSticker?: PlacedSticker;
      instanceId?: string;
      patch?: Partial<Pick<PlacedSticker, 'xPct' | 'yPct' | 'scale' | 'rotation'>>;
    }
  ): void {
    const opId = `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const sent = this.sendWs({
      type: 'editor:operation',
      opId,
      kind,
      stickerId: payload.stickerId,
      value: payload.value,
      placedSticker: payload.placedSticker,
      instanceId: payload.instanceId,
      patch: payload.patch,
    });

    if (!sent && this.state.snapshot) {
      this.applyLocalEditorOperation(this.state.role ?? 'host', opId, kind, payload);
    }
  }

  public sendPersonalUndo(): void {
    const targetActor: ParticipantRole = this.state.role ?? 'host';
    const sent = this.sendWs({
      type: 'editor:personal-undo',
    });

    if (!sent && this.state.snapshot) {
      this.applyLocalPersonalUndo(targetActor);
    }
  }

  private applyLocalEditorOperation(
    actor: ParticipantRole,
    opId: string,
    kind:
      | 'toggle-sticker'
      | 'set-tint'
      | 'set-caption'
      | 'add-sticker'
      | 'update-sticker'
      | 'remove-sticker',
    payload: {
      stickerId?: string;
      value?: string;
      placedSticker?: PlacedSticker;
      instanceId?: string;
      patch?: Partial<Pick<PlacedSticker, 'xPct' | 'yPct' | 'scale' | 'rotation'>>;
    }
  ): void {
    if (!this.state.snapshot) return;
    const editor = this.state.snapshot.editorState;
    if (editor.pausedByDisconnect) return;

    const stickers = editor.stickers.map((s) => ({ ...s }));
    const placedStickers = (editor.placedStickers ?? []).map((ps) => ({ ...ps }));
    const history: EditorOperation[] = [...editor.history];
    let stripTint = editor.stripTint;
    let caption = editor.caption;
    const now = Date.now();

    if (kind === 'toggle-sticker' && payload.stickerId) {
      const stk = stickers.find((s) => s.id === payload.stickerId);
      if (!stk) return;
      const prevActive = stk.active;
      stk.active = !prevActive;
      stk.owner = actor;
      history.push({
        opId,
        actor,
        timestamp: now,
        kind: 'toggle-sticker',
        stickerId: stk.id,
        prevActive,
        nextActive: stk.active,
      });
    } else if (kind === 'add-sticker' && payload.placedSticker) {
      const item: PlacedSticker = { ...payload.placedSticker, owner: actor };
      placedStickers.push(item);
      history.push({
        opId,
        actor,
        timestamp: now,
        kind: 'add-sticker',
        instanceId: item.instanceId,
        placedSticker: { ...item },
      });
    } else if (kind === 'update-sticker' && payload.instanceId && payload.patch) {
      const target = placedStickers.find((ps) => ps.instanceId === payload.instanceId);
      if (!target) return;
      const prevStickerState: PlacedSticker = { ...target };
      if (typeof payload.patch.xPct === 'number') target.xPct = payload.patch.xPct;
      if (typeof payload.patch.yPct === 'number') target.yPct = payload.patch.yPct;
      if (typeof payload.patch.scale === 'number') target.scale = payload.patch.scale;
      if (typeof payload.patch.rotation === 'number') target.rotation = payload.patch.rotation;
      history.push({
        opId,
        actor,
        timestamp: now,
        kind: 'update-sticker',
        instanceId: target.instanceId,
        prevStickerState,
        placedSticker: { ...target },
      });
    } else if (kind === 'remove-sticker' && payload.instanceId) {
      const idx = placedStickers.findIndex((ps) => ps.instanceId === payload.instanceId);
      if (idx === -1) return;
      const [removed] = placedStickers.splice(idx, 1);
      history.push({
        opId,
        actor,
        timestamp: now,
        kind: 'remove-sticker',
        instanceId: removed.instanceId,
        prevStickerState: { ...removed },
      });
    } else if (kind === 'set-tint' && typeof payload.value === 'string') {
      const prevValue = stripTint;
      stripTint = payload.value;
      history.push({
        opId,
        actor,
        timestamp: now,
        kind: 'set-tint',
        prevValue,
        nextValue: payload.value,
      });
    } else if (kind === 'set-caption' && typeof payload.value === 'string') {
      const prevValue = caption;
      caption = payload.value;
      history.push({
        opId,
        actor,
        timestamp: now,
        kind: 'set-caption',
        prevValue,
        nextValue: payload.value,
      });
    }

    const next: AuthoritativeRoomSnapshot = {
      ...this.state.snapshot,
      version: this.state.snapshot.version + 1,
      editorState: {
        ...editor,
        editorVersion: editor.editorVersion + 1,
        stripTint,
        caption,
        stickers,
        placedStickers,
        history,
        lastActor: actor,
      },
    };
    this.patchState({ snapshot: next });
    this.bc?.postMessage({ type: 'bc:snapshot', snapshot: next });
  }

  private applyLocalPersonalUndo(targetActor: ParticipantRole): void {
    if (!this.state.snapshot) return;
    const editor = this.state.snapshot.editorState;
    if (editor.pausedByDisconnect) return;

    const history = [...editor.history];
    const stickers = editor.stickers.map((s) => ({ ...s }));
    const placedStickers = (editor.placedStickers ?? []).map((ps) => ({ ...ps }));
    let stripTint = editor.stripTint;
    let caption = editor.caption;
    let layout = this.state.snapshot.layout;

    let reverted = false;
    for (let i = history.length - 1; i >= 0; i--) {
      const op = history[i];
      if (op.actor !== targetActor) continue;
      history.splice(i, 1);
      if (op.kind === 'toggle-sticker' && op.stickerId) {
        const stk = stickers.find((s) => s.id === op.stickerId);
        if (stk && typeof op.prevActive === 'boolean') {
          stk.active = op.prevActive;
        }
      } else if (op.kind === 'add-sticker' && op.instanceId) {
        const idx = placedStickers.findIndex((ps) => ps.instanceId === op.instanceId);
        if (idx >= 0) placedStickers.splice(idx, 1);
      } else if (op.kind === 'update-sticker' && op.prevStickerState) {
        const target = placedStickers.find(
          (ps) => ps.instanceId === op.prevStickerState?.instanceId
        );
        if (target) Object.assign(target, op.prevStickerState);
      } else if (op.kind === 'remove-sticker' && op.prevStickerState) {
        placedStickers.push({ ...op.prevStickerState });
      } else if (op.kind === 'set-tint' && typeof op.prevValue === 'string') {
        stripTint = op.prevValue;
      } else if (op.kind === 'set-caption' && typeof op.prevValue === 'string') {
        caption = op.prevValue;
      } else if (op.kind === 'set-layout' && typeof op.prevValue === 'string') {
        layout = op.prevValue as TemplateLayoutId;
      }
      reverted = true;
      break;
    }

    if (!reverted) {
      let removedPlaced = false;
      for (let j = placedStickers.length - 1; j >= 0; j--) {
        if (placedStickers[j].owner === targetActor) {
          placedStickers.splice(j, 1);
          removedPlaced = true;
          break;
        }
      }
      if (!removedPlaced) {
        for (const stk of stickers) {
          if (stk.owner === targetActor && stk.active) {
            stk.active = false;
          }
        }
      }
    }

    const next: AuthoritativeRoomSnapshot = {
      ...this.state.snapshot,
      version: this.state.snapshot.version + 1,
      layout,
      editorState: {
        ...editor,
        editorVersion: editor.editorVersion + 1,
        stripTint,
        caption,
        stickers,
        placedStickers,
        history,
        lastActor: targetActor,
      },
    };
    this.patchState({ snapshot: next });
    this.bc?.postMessage({ type: 'bc:snapshot', snapshot: next });
  }

  private handleServerMessage(msg: ServerToClientMessage): void {
    switch (msg.type) {
      case 'room:turn': {
        this.turnServer = { urls: msg.urls, username: msg.username, credential: msg.credential };
        break;
      }
      case 'room:joined': {
        this.bc?.close();
        this.bc = null;
        this.saveSession({
          code: msg.code,
          rejoinToken: msg.rejoinToken,
          role: msg.role,
        });
        this.patchState({
          role: msg.role,
          participantId: msg.participantId,
          rejoinToken: msg.rejoinToken,
          snapshot: msg.snapshot,
          lastError: null,
        });
        if (msg.role === 'host' && msg.snapshot.participants.length === 2) {
          void this.startWebRtcNegotiation();
        }
        break;
      }
      case 'room:snapshot': {
        const prevCount = this.state.snapshot?.participants.length ?? 0;
        this.patchState({
          snapshot: msg.snapshot,
          lastError: null,
        });
        if (
          this.state.role === 'host' &&
          prevCount < 2 &&
          msg.snapshot.participants.length === 2
        ) {
          void this.startWebRtcNegotiation();
        }
        break;
      }
      case 'clock:pong': {
        const now = Date.now();
        const rtt = Math.max(0, now - msg.clientSentAt);
        const estimatedServerNow = msg.serverSentAt + Math.round(rtt / 2);
        const offset = estimatedServerNow - now;
        this.patchState({
          rttMs: rtt,
          clockOffsetMs: offset,
        });
        break;
      }
      case 'capture:scheduled': {
        this.patchState({
          lastScheduledCountdown: msg.countdown,
          snapshot: msg.snapshot,
          lastError: null,
        });
        break;
      }
      case 'webrtc:signal': {
        void this.handleIncomingWebRtcSignal(msg.fromRole, msg.signal);
        break;
      }
      case 'room:error': {
        this.patchState({
          lastError: `[${msg.errorCode}] ${msg.message}`,
        });
        break;
      }
    }
  }

  private handleBroadcastMessage(raw: unknown): void {
    if (!raw || typeof raw !== 'object') return;
    const data = raw as Record<string, unknown>;

    if (
      data.type === 'bc:join-request' &&
      this.state.role === 'host' &&
      this.state.snapshot
    ) {
      const code = String(data.code ?? '');
      if (code !== this.state.snapshot.code) return;

      if (this.state.snapshot.participants.length >= 2) {
        this.bc?.postMessage({
          type: 'bc:error',
          code,
          message: '[ROOM_FULL] Room penuh (maksimal 2 peserta: 1 Host + 1 Guest).',
        });
        return;
      }

      const now = Date.now();
      const guestId = `guest-${now}`;
      const guestToken = `tok-guest-${now}`;
      const updated: AuthoritativeRoomSnapshot = {
        ...this.state.snapshot,
        version: this.state.snapshot.version + 1,
        connectionState: 'connected',
        phase: 'ready',
        participants: [
          ...this.state.snapshot.participants,
          {
            participantId: guestId,
            role: 'guest',
            displayName: String(data.displayName || 'Guest'),
            connected: true,
            ready: true,
            lastSeenAt: now,
            rejoinExpiresAt: null,
          },
        ],
      };

      this.patchState({ snapshot: updated, lastError: null });
      this.bc?.postMessage({
        type: 'bc:joined-guest',
        code,
        participantId: guestId,
        rejoinToken: guestToken,
        snapshot: updated,
      });
      void this.startWebRtcNegotiation();
    } else if (data.type === 'bc:joined-guest' && !this.state.role) {
      const snapshot = data.snapshot as AuthoritativeRoomSnapshot;
      const code = String(data.code);
      const rejoinToken = String(data.rejoinToken);
      const participantId = String(data.participantId);
      this.saveSession({ code, rejoinToken, role: 'guest' });
      this.patchState({
        role: 'guest',
        participantId,
        rejoinToken,
        snapshot,
        lastError: null,
      });
    } else if (data.type === 'bc:snapshot' && this.state.snapshot) {
      const incoming = data.snapshot as AuthoritativeRoomSnapshot;
      if (incoming.code === this.state.snapshot.code) {
        this.patchState({ snapshot: incoming, lastError: null });
      }
    } else if (data.type === 'bc:countdown' && this.state.snapshot) {
      if (data.code === this.state.snapshot.code) {
        this.patchState({
          lastScheduledCountdown: data.countdown as ScheduledCountdown,
        });
      }
    } else if (data.type === 'bc:webrtc-signal' && this.state.snapshot) {
      if (data.code === this.state.snapshot.code) {
        void this.handleIncomingWebRtcSignal(
          data.fromRole as ParticipantRole,
          data.signal as WebRtcSignalPayload
        );
      }
    } else if (data.type === 'bc:frame-sync' && this.state.snapshot) {
      if (data.code === this.state.snapshot.code) {
        this.applyLocalSyncedFrame(
          data.role as ParticipantRole,
          Number(data.frameIndex),
          String(data.dataUrl)
        );
      }
    } else if (data.type === 'bc:error' && !this.state.role) {
      this.patchState({
        lastError: String(data.message ?? 'Gagal bergabung ke room.'),
      });
    }
  }
}

export const realtimeClient = new MomentosRealtimeClient();
