import React, { useState } from 'react';
import type {
  BoothMode,
  CapturedFrame,
  PhotoFilterId,
  RoomConnectionState,
  ScreenId,
  StickerItem,
  TemplateLayoutId,
} from '@momentos/shared';
import { GlassHeader } from '../components/GlassHeader';
import {
  SeasonalAmbient,
  detectDefaultSeason,
} from '../components/SeasonalAmbient';
import { HomeScreen } from '../features/home/HomeScreen';
import { RoomScreen } from '../features/room/RoomScreen';
import { CameraScreen } from '../features/camera/CameraScreen';
import { ReviewScreen } from '../features/classic/ReviewScreen';
import { EditorScreen } from '../features/editor/EditorScreen';
import { ExportScreen } from '../features/export/ExportScreen';

const INITIAL_FRAMES: CapturedFrame[] = [
  {
    id: 1,
    label: 'POSE 01',
    timestamp: '00:03',
    hostPose: '😊✌️',
    guestPose: '😄✨',
    accentBg: '#FCEEF3',
    retakeCount: 0,
  },
  {
    id: 2,
    label: 'POSE 02',
    timestamp: '00:07',
    hostPose: '😎🔥',
    guestPose: '🥳🫶',
    accentBg: '#EBF4FD',
    retakeCount: 0,
  },
  {
    id: 3,
    label: 'POSE 03',
    timestamp: '00:11',
    hostPose: '🤩📸',
    guestPose: '😆✌️',
    accentBg: '#ECF3ED',
    retakeCount: 0,
  },
  {
    id: 4,
    label: 'POSE 04',
    timestamp: '00:15',
    hostPose: '🥰🌸',
    guestPose: '🙌✨',
    accentBg: '#FAF7F2',
    retakeCount: 0,
  },
];

const INITIAL_STICKERS: StickerItem[] = [
  { id: 'st-1', emoji: '✨', label: 'Sparkle', owner: 'host', active: true },
  { id: 'st-2', emoji: '🍁', label: 'Maple', owner: 'host', active: false },
  { id: 'st-3', emoji: '🎀', label: 'Ribbon', owner: 'guest', active: true },
  { id: 'st-4', emoji: '📸', label: 'Instant Cam', owner: 'guest', active: false },
];

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('home');
  const [mode, setMode] = useState<BoothMode>('solo');
  const [season] = useState(() => detectDefaultSeason());
  const [roomState, setRoomState] = useState<RoomConnectionState>('connected');
  const [takeCount, setTakeCount] = useState<3 | 4>(3);
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilterId>('normal');
  const [frames, setFrames] = useState<CapturedFrame[]>(INITIAL_FRAMES);
  const [retakesRemaining, setRetakesRemaining] = useState<number>(3);
  const [layout, setLayout] = useState<TemplateLayoutId>('strip-1x4');
  const [stripTint, setStripTint] = useState<string>('#FFFFFF');
  const [caption, setCaption] = useState<string>('MOMENTOS • NOV 2026');
  const [stickers, setStickers] = useState<StickerItem[]>(INITIAL_STICKERS);

  const handleStartMode = (nextMode: BoothMode, targetScreen: ScreenId) => {
    setMode(nextMode);
    setActiveScreen(targetScreen);
  };

  const handleRetakeFrame = (frameId: number) => {
    if (retakesRemaining <= 0) return;
    const altPoses = ['😜✌️', '🥳✨', '😎🫶', '🤩🔥'];
    setFrames((prev) =>
      prev.map((f) =>
        f.id === frameId
          ? {
              ...f,
              hostPose: altPoses[(f.retakeCount + frameId) % altPoses.length],
              retakeCount: f.retakeCount + 1,
            }
          : f
      )
    );
    setRetakesRemaining((prev) => Math.max(0, prev - 1));
  };

  const handleToggleSticker = (id: string) => {
    setStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  const handleUndoByOwner = (owner: 'host' | 'guest') => {
    setStickers((prev) =>
      prev.map((s) => (s.owner === owner ? { ...s, active: false } : s))
    );
  };

  return (
    <>
      {/* Latar Dot Bulat Besar Tidak Beraturan + Lebih Gelap & Blur */}
      <div className="bg-irregular-dots" aria-hidden="true" />
      <div className="bg-ambient-glow" aria-hidden="true" />

      {/* Seasonal Falling Leaves / Snow (Otomatis sesuai musim, hanya di Beranda) */}
      <SeasonalAmbient season={season} enabled={activeScreen === 'home'} />

      {/* Header Edge-to-Edge Translucent Glass */}
      <GlassHeader
        activeScreen={activeScreen}
        onSelectScreen={setActiveScreen}
        mode={mode}
      />

      <div className="app-shell">
        <main>
          {activeScreen === 'home' && (
            <HomeScreen
              mode={mode}
              onStartMode={handleStartMode}
              onSelectScreen={setActiveScreen}
            />
          )}

          {activeScreen === 'room' && (
            <RoomScreen
              mode={mode}
              onChangeMode={setMode}
              roomState={roomState}
              onChangeRoomState={setRoomState}
              onNavigate={setActiveScreen}
            />
          )}

          {activeScreen === 'camera' && (
            <CameraScreen
              mode={mode}
              takeCount={takeCount}
              onChangeTakeCount={setTakeCount}
              selectedFilter={selectedFilter}
              onChangeFilter={setSelectedFilter}
              frames={frames}
              onNavigate={setActiveScreen}
            />
          )}

          {activeScreen === 'review' && (
            <ReviewScreen
              mode={mode}
              takeCount={takeCount}
              frames={frames}
              retakesRemaining={retakesRemaining}
              onRetakeFrame={handleRetakeFrame}
              onNavigate={setActiveScreen}
            />
          )}

          {activeScreen === 'editor' && (
            <EditorScreen
              mode={mode}
              takeCount={takeCount}
              frames={frames}
              layout={layout}
              onChangeLayout={setLayout}
              stripTint={stripTint}
              onChangeStripTint={setStripTint}
              caption={caption}
              onChangeCaption={setCaption}
              stickers={stickers}
              onToggleSticker={handleToggleSticker}
              onUndoByOwner={handleUndoByOwner}
              onNavigate={setActiveScreen}
            />
          )}

          {activeScreen === 'export' && (
            <ExportScreen
              mode={mode}
              takeCount={takeCount}
              frames={frames}
              layout={layout}
              stripTint={stripTint}
              caption={caption}
              stickers={stickers}
              onNavigate={setActiveScreen}
            />
          )}
        </main>
      </div>
    </>
  );
};
