export type BoothMode = 'solo' | 'duo';

export type ScreenId =
  | 'home'
  | 'how-it-works'
  | 'modes-info'
  | 'studio-features'
  | 'privacy-info'
  | 'room'
  | 'frame-select'
  | 'camera'
  | 'review'
  | 'editor'
  | 'export'
  | 'flipbook';

export type SeasonPreset = 'autumn' | 'spring' | 'winter' | 'summer' | 'off';

export type RoomConnectionState =
  | 'waiting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type CameraPermissionState = 'granted' | 'denied';

export type PhotoFilterId =
  | 'normal'
  | 'warm-cream'
  | 'mono-ink'
  | 'soft-berry'
  | 'kodak-portra'
  | 'cyber-sky'
  | 'faded-matte'
  | 'hi-pop';

export interface PhotoFilterPreset {
  id: PhotoFilterId;
  name: string;
  badge: string;
  cssFilter: string;
  previewBg: string;
  description: string;
}

export const PHOTO_FILTER_PRESETS: PhotoFilterPreset[] = [
  {
    id: 'normal',
    name: 'Natural',
    badge: 'Orig',
    cssFilter: 'none',
    previewBg: 'linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 100%)',
    description: 'Warna asli sensor kamera tanpa koreksi tone.',
  },
  {
    id: 'warm-cream',
    name: 'Warm Cream',
    badge: 'Cozy',
    cssFilter: 'sepia(0.24) saturate(1.18) brightness(1.04) contrast(0.96)',
    previewBg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    description: 'Tone krem hangat bergaya kafe sore & kertas analog.',
  },
  {
    id: 'mono-ink',
    name: 'Mono Ink',
    badge: 'B&W',
    cssFilter: 'grayscale(1) contrast(1.22) brightness(1.03)',
    previewBg: 'linear-gradient(135deg, #57534e 0%, #1c1917 100%)',
    description: 'Monokrom kontras tegas khas rol film hitam putih.',
  },
  {
    id: 'soft-berry',
    name: 'Soft Berry',
    badge: 'Pastel',
    cssFilter: 'hue-rotate(-10deg) saturate(1.15) brightness(1.06) sepia(0.1)',
    previewBg: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
    description: 'Sentuhan pastel berry lembut yang ramah kulit.',
  },
  {
    id: 'kodak-portra',
    name: 'Kodak Golden',
    badge: 'Film',
    cssFilter: 'sepia(0.18) saturate(1.32) contrast(1.06) brightness(1.02) hue-rotate(-6deg)',
    previewBg: 'linear-gradient(135deg, #fed7aa 0%, #fbbf24 100%)',
    description: 'Warna keemasan natural terinspirasi film Portra 400.',
  },
  {
    id: 'cyber-sky',
    name: 'Cool Fuji',
    badge: 'Cool',
    cssFilter: 'hue-rotate(12deg) saturate(1.14) contrast(1.08) brightness(1.03)',
    previewBg: 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)',
    description: 'Nuansa sejuk biru-cyan jernih ala film studio Jepang.',
  },
  {
    id: 'faded-matte',
    name: 'Faded Matte',
    badge: 'Vintage',
    cssFilter: 'contrast(0.84) brightness(1.08) saturate(0.82) sepia(0.16)',
    previewBg: 'linear-gradient(135deg, #e5e5e0 0%, #cbd5e1 100%)',
    description: 'Highlight lembut & shadow pudar khas cetakan tahun 90-an.',
  },
  {
    id: 'hi-pop',
    name: 'Purikura Pop',
    badge: 'Studio',
    cssFilter: 'brightness(1.12) contrast(1.14) saturate(1.28)',
    previewBg: 'linear-gradient(135deg, #fbcfe8 0%, #ddd6fe 100%)',
    description: 'Cerah, kontras bersih, dan warna vibran ala booth Korea/Jepang.',
  },
];

export type TemplateLayoutId =
  | 'strip-1x4'
  | 'grid-2x2'
  | 'polaroid-duo'
  | 'vintage-ticket'
  | 'film-35mm'
  | 'editorial-scrapbook';

export interface ClassicTemplatePreset {
  id: TemplateLayoutId;
  name: string;
  tag: string;
  isNew?: boolean;
  frameTone: string;
  accentHex: string;
  description: string;
}

export const CLASSIC_TEMPLATE_PRESETS: ClassicTemplatePreset[] = [
  {
    id: 'strip-1x4',
    name: 'Strip 1x4',
    tag: 'Original',
    frameTone: '#FFFDF9',
    accentHex: '#BC4374',
    description: 'Strip vertikal klasik khas bilik foto instan.',
  },
  {
    id: 'grid-2x2',
    name: 'Grid 2x2',
    tag: 'Original',
    frameTone: '#FFFFFF',
    accentHex: '#B6834D',
    description: 'Kolase 2x2 simetris yang ringkas untuk feed media sosial.',
  },
  {
    id: 'polaroid-duo',
    name: 'Polaroid Duo',
    tag: 'Original',
    frameTone: '#F8F7F2',
    accentHex: '#6E7F55',
    description: 'Bingkai polaroid lebar dengan margin catatan di bawah.',
  },
  {
    id: 'vintage-ticket',
    name: 'Vintage Ticket',
    tag: 'New Preset',
    isNew: true,
    frameTone: '#F4ECDD',
    accentHex: '#9E325F',
    description: 'Tiket masuk bergerigi dengan nomor seri & barcode footer.',
  },
  {
    id: 'film-35mm',
    name: '35mm Film Roll',
    tag: 'New Preset',
    isNew: true,
    frameTone: '#181619',
    accentHex: '#E09F5A',
    description: 'Contact sheet rol film analog lengkap dengan lubang sprocket.',
  },
  {
    id: 'editorial-scrapbook',
    name: 'Scrapbook Journal',
    tag: 'New Preset',
    isNew: true,
    frameTone: '#FAF3EA',
    accentHex: '#BC4374',
    description: 'Kolase jurnal miring estetik dengan washi tape & tipografi serif.',
  },
];

export type ExportFormat = 'png' | 'jpg';

export type ExportStatus = 'idle' | 'rendering' | 'success' | 'error';

export interface CapturedFrame {
  id: number;
  label: string;
  timestamp: string;
  hostPose: string;
  guestPose: string;
  accentBg: string;
  retakeCount: number;
  imageDataUrl?: string;
  guestImageDataUrl?: string;
}

export type StickerCategory = 'sticker' | 'emoticon' | 'stamp' | 'tape';

export interface StickerItem {
  id: string;
  emoji: string;
  label: string;
  owner: 'host' | 'guest';
  active: boolean;
  category?: StickerCategory;
  badgeText?: string;
}

export const DEFAULT_STICKER_LIBRARY: StickerItem[] = [
  { id: 'stk-sparkle', emoji: '✨', label: 'Starburst Spark', owner: 'host', active: true, category: 'sticker' },
  { id: 'stk-heart', emoji: '🫶', label: 'Heart Hand', owner: 'guest', active: true, category: 'emoticon' },
  { id: 'stk-leaf', emoji: '🍂', label: 'Autumn Leaf', owner: 'host', active: false, category: 'sticker' },
  { id: 'stk-cam', emoji: '📸', label: 'Flash Snap', owner: 'guest', active: false, category: 'sticker' },
  { id: 'stk-wink', emoji: '😉', label: 'Playful Wink', owner: 'host', active: false, category: 'emoticon' },
  { id: 'stk-blush', emoji: '🥹', label: 'Soft Blush', owner: 'guest', active: false, category: 'emoticon' },
  { id: 'stk-crown', emoji: '👑', label: 'Doodle Crown', owner: 'host', active: false, category: 'sticker' },
  { id: 'stk-ribbon', emoji: '🎀', label: 'Velvet Ribbon', owner: 'guest', active: false, category: 'sticker' },
  { id: 'stk-stamp', emoji: '🏷️', label: 'Stamp: MOMENT', owner: 'host', active: false, category: 'stamp', badgeText: 'APPROVED MEMORY • 2026' },
  { id: 'stk-date', emoji: '📅', label: 'Date Roller', owner: 'guest', active: false, category: 'stamp', badgeText: "NOV 14 '26 • 10 FPS" },
  { id: 'stk-tape-rose', emoji: '🩹', label: 'Washi Rose', owner: 'host', active: false, category: 'tape', badgeText: 'MOMENTOS STUDIO' },
  { id: 'stk-tape-sage', emoji: '🌿', label: 'Washi Sage', owner: 'guest', active: false, category: 'tape', badgeText: 'COZY SESSION' },
];

export type FlipbookPresetId =
  | 'retro-bounce'
  | 'sparkle-wink'
  | 'comic-pow'
  | 'vhs-rewind'
  | 'cherry-blossom'
  | 'neon-disco'
  | 'polaroid-wave'
  | 'cinema-noir';

export type FlipbookPoseMode = 'guided' | 'freestyle';

export const CAMERA_ACCESSORY_IDS = ['none', 'santa-hat', 'cat-ears', 'star-glasses', 'clown-nose'] as const;
export type CameraAccessoryId = (typeof CAMERA_ACCESSORY_IDS)[number];

export function isCameraAccessoryId(value: unknown): value is CameraAccessoryId {
  return CAMERA_ACCESSORY_IDS.some((id) => id === value);
}

export type DuoCameraAccessories = Record<ParticipantRole, CameraAccessoryId>;
export type DuoCameraAccessoryChange = { role: ParticipantRole; id: CameraAccessoryId };

export type FlipbookEffectOverlayId =
  | 'none'
  | 'confetti-burst'
  | 'floating-hearts'
  | 'disco-sparkles'
  | 'comic-pop'
  | 'film-grain';

export interface FlipbookOverlayEffect {
  id: FlipbookEffectOverlayId;
  label: string;
  icon: string;
  description: string;
}

export const FLIPBOOK_OVERLAY_EFFECTS: FlipbookOverlayEffect[] = [
  { id: 'none', label: 'Clean Frame', icon: '🎞️', description: 'Tanpa partikel overlay tambahan.' },
  { id: 'confetti-burst', label: 'Confetti Burst', icon: '🎊', description: 'Ledakan konfeti jatuh saat aba-aba pose.' },
  { id: 'floating-hearts', label: 'Floating Hearts', icon: '💖', description: 'Partikel hati melayang dinamis di tepi.' },
  { id: 'disco-sparkles', label: 'Disco Sparkles', icon: '✨', description: 'Kilauan bintang & light leak bergerak.' },
  { id: 'comic-pop', label: 'Comic Pop-Art', icon: '💥', description: 'Aksen garis kecepatan & bubble ekspresi.' },
  { id: 'film-grain', label: 'Analog Dust & Grain', icon: '📽️', description: 'Serat film 8mm & bingkai bergetar halus.' },
];

export interface ClassicCameraEffects {
  overlay: FlipbookEffectOverlayId;
  accessories: DuoCameraAccessories;
}

export interface ClassicCameraEffectChange {
  overlay?: FlipbookEffectOverlayId;
  accessory?: DuoCameraAccessoryChange;
}

export const DEFAULT_CLASSIC_CAMERA_EFFECTS: ClassicCameraEffects = {
  overlay: 'none',
  accessories: { host: 'none', guest: 'none' },
};

export function updateClassicCameraEffects(current: ClassicCameraEffects, change: ClassicCameraEffectChange): ClassicCameraEffects {
  return {
    overlay: change.overlay ?? current.overlay,
    accessories: change.accessory
      ? { ...current.accessories, [change.accessory.role]: change.accessory.id }
      : current.accessories,
  };
}

export interface FlipbookPreset {
  id: FlipbookPresetId;
  name: string;
  subtitle: string;
  binderColor: string;
  paperColor: string;
  accentHex: string;
  fps: number;
  frameCount: number;
  recommendedFilter: PhotoFilterId;
  incompatibleOverlays: FlipbookEffectOverlayId[];
  guidedPrompts: [string, string, string];
}

export const FLIPBOOK_PRESETS: FlipbookPreset[] = [
  {
    id: 'retro-bounce',
    name: 'Retro Pocket Flip',
    subtitle: 'Jilid spiral cream + margin indeks kanan',
    binderColor: '#3A322D',
    paperColor: '#FBF7EF',
    accentHex: '#BC4374',
    fps: 10,
    frameCount: 30,
    recommendedFilter: 'warm-cream',
    incompatibleOverlays: ['comic-pop'],
    guidedPrompts: ['1. Lambaikan tangan', '2. Senyum & kedip', '3. Peace sign close-up'],
  },
  {
    id: 'sparkle-wink',
    name: 'Kawaii Ribbon Book',
    subtitle: 'Buku mini pastel pink dengan pinggiran scalloped',
    binderColor: '#B84776',
    paperColor: '#FFF4F8',
    accentHex: '#D14D84',
    fps: 10,
    frameCount: 30,
    recommendedFilter: 'hi-pop',
    incompatibleOverlays: ['film-grain'],
    guidedPrompts: ['1. Bikin half-heart', '2. Kedip kanan-kiri', '3. Blow kiss ke kamera'],
  },
  {
    id: 'comic-pow',
    name: 'Zine Pop-Art',
    subtitle: 'Gaya majalah indie tebal dengan halftones',
    binderColor: '#1E1D1B',
    paperColor: '#FFFDF2',
    accentHex: '#E07A2E',
    fps: 10,
    frameCount: 30,
    recommendedFilter: 'hi-pop',
    incompatibleOverlays: ['floating-hearts'],
    guidedPrompts: ['1. Pose kaget dramatis', '2. Tunjuk lensa', '3. Gaya pahlawan'],
  },
  {
    id: 'vhs-rewind',
    name: '90s Camcorder Loop',
    subtitle: 'Timecode REC hijau & garis scanline halus',
    binderColor: '#2B2B30',
    paperColor: '#EFECE6',
    accentHex: '#256B55',
    fps: 10,
    frameCount: 30,
    recommendedFilter: 'faded-matte',
    incompatibleOverlays: ['confetti-burst', 'comic-pop'],
    guidedPrompts: ['1. Jalan mundur pelan', '2. Putar badan 180°', '3. Zoom wajah lucu'],
  },
  {
    id: 'cherry-blossom',
    name: 'Sakura Garden Journal',
    subtitle: 'Kertas bertekstur linen hangat & cap tanggal',
    binderColor: '#7A5442',
    paperColor: '#FAF2EB',
    accentHex: '#C95B7A',
    fps: 10,
    frameCount: 30,
    recommendedFilter: 'soft-berry',
    incompatibleOverlays: ['comic-pop', 'disco-sparkles'],
    guidedPrompts: ['1. Topang dagu manis', '2. Tiup kelopak imajiner', '3. Tertawa lepas'],
  },
  {
    id: 'neon-disco',
    name: 'Midnight Disco Deck',
    subtitle: 'Sampul hitam matte + foil hologram perak',
    binderColor: '#15141B',
    paperColor: '#201E28',
    accentHex: '#F07BAE',
    fps: 10,
    frameCount: 30,
    recommendedFilter: 'cyber-sky',
    incompatibleOverlays: ['film-grain'],
    guidedPrompts: ['1. Joget bahu kiri-kanan', '2. Finger gun ke lensa', '3. Freeze pose pesta'],
  },
  {
    id: 'polaroid-wave',
    name: 'Analog Contact Flip',
    subtitle: 'Kartu indeks bernomor seri di setiap lembar',
    binderColor: '#5B4636',
    paperColor: '#F5EFE4',
    accentHex: '#B6834D',
    fps: 10,
    frameCount: 30,
    recommendedFilter: 'kodak-portra',
    incompatibleOverlays: ['disco-sparkles'],
    guidedPrompts: ['1. Pose candid menyamping', '2. Angkat kacamata/rambut', '3. Senyum hangat'],
  },
  {
    id: 'cinema-noir',
    name: 'Silent Film 8mm',
    subtitle: 'Bingkai perak monokrom klasik dengan penomoran',
    binderColor: '#18181A',
    paperColor: '#F2F0EC',
    accentHex: '#3A3A3D',
    fps: 10,
    frameCount: 30,
    recommendedFilter: 'mono-ink',
    incompatibleOverlays: ['confetti-burst', 'floating-hearts', 'comic-pop'],
    guidedPrompts: ['1. Ekspresi misterius', '2. Tertawa seperti film bisu', '3. Hormat perpisahan'],
  },
];

/* ============================================================================
 * Tahap 4 — Realtime Room, Signaling & Synchronization Contracts
 * ==========================================================================*/

export type ParticipantRole = 'host' | 'guest';

export type RoomSessionPhase =
  | 'waiting'
  | 'setup'
  | 'ready'
  | 'countdown'
  | 'capturing'
  | 'syncing'
  | 'review'
  | 'editing'
  | 'export'
  | 'ended';

export interface RoomParticipant {
  participantId: string;
  role: ParticipantRole;
  displayName: string;
  connected: boolean;
  ready: boolean;
  lastSeenAt: number;
  rejoinExpiresAt: number | null;
}

export interface ScheduledCountdown {
  retakeRole?: ParticipantRole;
  attemptId: string;
  takeNumber: number;
  startedAtServer: number;
  targetCaptureAtServer: number;
  durationMs: number;
}

export interface RetakePromptState {
  requestId: string;
  frameId: number;
  requestedBy: ParticipantRole;
  status: 'pending' | 'approved' | 'rejected';
}

export interface SyncedFrameMedia {
  retakes?: Partial<Record<ParticipantRole, number>>;
  frameIndex: number;
  hostDataUrl?: string;
  guestDataUrl?: string;
  updatedAt: number;
}

export interface PlacedSticker {
  instanceId: string;
  stickerId: string;
  emoji: string;
  label: string;
  category?: StickerCategory;
  badgeText?: string;
  owner: ParticipantRole;
  xPct: number;
  yPct: number;
  scale: number;
  rotation: number;
}

export interface EditorOperation {
  opId: string;
  actor: ParticipantRole;
  timestamp: number;
  kind:
    | 'toggle-sticker'
    | 'set-tint'
    | 'set-caption'
    | 'set-layout'
    | 'set-filter'
    | 'add-sticker'
    | 'update-sticker'
    | 'remove-sticker';
  stickerId?: string;
  instanceId?: string;
  prevActive?: boolean;
  nextActive?: boolean;
  prevValue?: string;
  nextValue?: string;
  placedSticker?: PlacedSticker;
  prevStickerState?: PlacedSticker;
}

export interface CollaborativeEditorState {
  editorVersion: number;
  stripTint: string;
  caption: string;
  stickers: StickerItem[];
  placedStickers: PlacedSticker[];
  history: EditorOperation[];
  pausedByDisconnect: boolean;
  lastActor: ParticipantRole | null;
}

export interface AuthoritativeRoomSnapshot {
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
  participants: RoomParticipant[];
  countdown: ScheduledCountdown | null;
  retakePrompt: RetakePromptState | null;
  syncedFrames: SyncedFrameMedia[];
  editorState: CollaborativeEditorState;
}

export interface WebRtcSignalPayload {
  kind: 'offer' | 'answer' | 'ice';
  sdp?: string;
  candidate?: Record<string, unknown>;
}

export type ClientToServerMessage =
  | {
      type: 'room:create';
      displayName?: string;
      mode?: BoothMode;
      takeCount?: number;
      selectedFilter?: PhotoFilterId;
    }
  | {
      type: 'room:join';
      code: string;
      displayName?: string;
    }
  | {
      type: 'room:rejoin';
      code: string;
      rejoinToken: string;
    }
  | {
      type: 'room:leave';
    }
  | {
      type: 'participant:ready';
      ready: boolean;
    }
  | {
      type: 'session:config';
      takeCount?: number;
      selectedFilter?: PhotoFilterId;
      classicCameraEffect?: ClassicCameraEffectChange;
      flipbookAccessory?: DuoCameraAccessoryChange;
      layout?: TemplateLayoutId;
      phase?: RoomSessionPhase;
    }
  | {
      type: 'clock:ping';
      clientSentAt: number;
    }
  | {
      type: 'capture:request';
      takeNumber: number;
    }
  | {
      type: 'capture:ack';
      attemptId: string;
    }
  | {
      type: 'capture:frame-sync';
      frameIndex: number;
      dataUrl?: string;
    }
  | {
      type: 'retake:request';
      frameId: number;
    }
  | {
      type: 'retake:decision';
      requestId: string;
      approved: boolean;
    }
  | {
      type: 'editor:operation';
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
  | {
      type: 'editor:personal-undo';
    }
  | {
      type: 'webrtc:signal';
      signal: WebRtcSignalPayload;
    };

export type ServerToClientMessage =
  | { type: 'room:turn'; urls: string; username: string; credential: string }
  | {
      type: 'room:joined';
      code: string;
      role: ParticipantRole;
      participantId: string;
      rejoinToken: string;
      snapshot: AuthoritativeRoomSnapshot;
    }
  | {
      type: 'room:snapshot';
      snapshot: AuthoritativeRoomSnapshot;
    }
  | {
      type: 'clock:pong';
      clientSentAt: number;
      serverReceivedAt: number;
      serverSentAt: number;
    }
  | {
      type: 'capture:scheduled';
      countdown: ScheduledCountdown;
      snapshot: AuthoritativeRoomSnapshot;
    }
  | {
      type: 'webrtc:signal';
      fromRole: ParticipantRole;
      signal: WebRtcSignalPayload;
    }
  | {
      type: 'room:error';
      errorCode:
        | 'ROOM_NOT_FOUND'
        | 'ROOM_FULL'
        | 'INVALID_TOKEN'
        | 'FORBIDDEN_ROLE'
        | 'NOT_READY'
        | 'ROOM_ENDED'
        | 'BAD_REQUEST';
      message: string;
    };
export const FLIPBOOK_CAPTURE_DURATION_MS = 5000;
export const FLIPBOOK_CAPTURE_FPS = 20;
export const FLIPBOOK_CAPTURE_FRAME_COUNT = FLIPBOOK_CAPTURE_DURATION_MS / 1000 * FLIPBOOK_CAPTURE_FPS;
