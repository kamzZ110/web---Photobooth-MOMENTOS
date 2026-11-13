export type BoothMode = 'solo' | 'duo';

export type ScreenId =
  | 'home'
  | 'room'
  | 'camera'
  | 'review'
  | 'editor'
  | 'export';

export type SeasonPreset = 'autumn' | 'spring' | 'winter' | 'summer' | 'off';

export type RoomConnectionState =
  | 'waiting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type CameraPermissionState = 'granted' | 'denied';

export type PhotoFilterId = 'normal' | 'warm-cream' | 'mono-ink' | 'soft-berry';

export type TemplateLayoutId = 'strip-1x4' | 'grid-2x2' | 'polaroid-duo';

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
}

export interface StickerItem {
  id: string;
  emoji: string;
  label: string;
  owner: 'host' | 'guest';
  active: boolean;
}
