import React, { useEffect, useState } from 'react';
import {
  DEFAULT_STICKER_LIBRARY,
  type BoothMode,
  type CapturedFrame,
  type PhotoFilterId,
  type RoomConnectionState,
  type ScreenId,
  type StickerItem,
  type TemplateLayoutId,
} from '@momentos/shared';
import { GlassHeader } from '../components/GlassHeader';
import {
  SeasonalAmbient,
  detectDefaultSeason,
} from '../components/SeasonalAmbient';
import { HomeScreen } from '../features/home/HomeScreen';
import {
  HowItWorksPage,
  ModesInfoPage,
  StudioFeaturesPage,
  PrivacyInfoPage,
} from '../features/info/InfoPages';
import { RoomScreen } from '../features/room/RoomScreen';
import { CameraScreen } from '../features/camera/CameraScreen';
import { ReviewScreen } from '../features/classic/ReviewScreen';
import { EditorScreen } from '../features/editor/EditorScreen';
import { ExportScreen } from '../features/export/ExportScreen';
import { FlipbookScreen } from '../features/flipbook/FlipbookScreen';

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

const AMBIENT_SCREENS: ScreenId[] = [
  'home',
  'how-it-works',
  'modes-info',
  'studio-features',
  'privacy-info',
];

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('home');
  const [mode, setMode] = useState<BoothMode>('solo');
  const [isNight, setIsNight] = useState<boolean>(false);
  const [season] = useState(() => detectDefaultSeason());
  const [roomState, setRoomState] = useState<RoomConnectionState>('connected');
  const [takeCount, setTakeCount] = useState<3 | 4>(3);
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilterId>('normal');
  const [frames, setFrames] = useState<CapturedFrame[]>(INITIAL_FRAMES);
  const [retakesRemaining, setRetakesRemaining] = useState<number>(3);
  const [layout, setLayout] = useState<TemplateLayoutId>('strip-1x4');
  const [stripTint, setStripTint] = useState<string>('#FFFFFF');
  const [caption, setCaption] = useState<string>('Nov 14, 2026 12:02pm');
  const [stickers, setStickers] = useState<StickerItem[]>(DEFAULT_STICKER_LIBRARY);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isNight ? 'night' : 'day');
  }, [isNight]);

  const handleStartMode = (nextMode: BoothMode, targetScreen: ScreenId) => {
    setMode(nextMode);
    setActiveScreen(targetScreen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCaptureFrame = (frameIndex: number, dataUrl: string) => {
    setFrames((prev) =>
      prev.map((f, idx) =>
        idx === frameIndex
          ? {
              ...f,
              imageDataUrl: dataUrl,
            }
          : f
      )
    );
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
      {/* Siang: Daun gugur musiman | Malam: Efek bintang-bintang berkelap-kelip (mati saat di Kamera & Editor) */}
      <SeasonalAmbient
        season={season}
        isNight={isNight}
        enabled={AMBIENT_SCREENS.includes(activeScreen)}
      />

      {/* Header Edge-to-Edge Translucent Glass + Switch Night Mode */}
      <GlassHeader
        activeScreen={activeScreen}
        onSelectScreen={setActiveScreen}
        mode={mode}
        isNight={isNight}
        onToggleNight={() => setIsNight((prev) => !prev)}
      />

      <div className="app-shell">
        <main>
          {activeScreen === 'home' && (
            <HomeScreen
              mode={mode}
              isNight={isNight}
              onStartMode={handleStartMode}
              onSelectScreen={setActiveScreen}
            />
          )}

          {activeScreen === 'how-it-works' && (
            <HowItWorksPage
              mode={mode}
              isNight={isNight}
              onStartMode={handleStartMode}
              onSelectScreen={setActiveScreen}
            />
          )}

          {activeScreen === 'modes-info' && (
            <ModesInfoPage
              mode={mode}
              isNight={isNight}
              onStartMode={handleStartMode}
              onSelectScreen={setActiveScreen}
            />
          )}

          {activeScreen === 'studio-features' && (
            <StudioFeaturesPage
              mode={mode}
              isNight={isNight}
              onStartMode={handleStartMode}
              onSelectScreen={setActiveScreen}
            />
          )}

          {activeScreen === 'privacy-info' && (
            <PrivacyInfoPage
              mode={mode}
              isNight={isNight}
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
              isNight={isNight}
              takeCount={takeCount}
              onChangeTakeCount={setTakeCount}
              selectedFilter={selectedFilter}
              onChangeFilter={setSelectedFilter}
              frames={frames}
              onCaptureFrame={handleCaptureFrame}
              onNavigate={setActiveScreen}
            />
          )}

          {activeScreen === 'review' && (
            <ReviewScreen
              mode={mode}
              isNight={isNight}
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
              selectedFilter={selectedFilter}
              onChangeFilter={setSelectedFilter}
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

          {activeScreen === 'flipbook' && (
            <FlipbookScreen
              mode={mode}
              selectedFilter={selectedFilter}
              onChangeFilter={setSelectedFilter}
              onNavigate={setActiveScreen}
            />
          )}

          {activeScreen === 'export' && (
            <ExportScreen
              mode={mode}
              isNight={isNight}
              takeCount={takeCount}
              frames={frames}
              layout={layout}
              selectedFilter={selectedFilter}
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
