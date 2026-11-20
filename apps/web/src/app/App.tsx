import React, { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_STICKER_LIBRARY,
  type BoothMode,
  type CapturedFrame,
  type PhotoFilterId,
  type PlacedSticker,
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
import { FrameSelectScreen } from '../features/classic/FrameSelectScreen';
import { CameraScreen } from '../features/camera/CameraScreen';
import { ReviewScreen } from '../features/classic/ReviewScreen';
import { EditorScreen } from '../features/editor/EditorScreen';
import { ExportScreen } from '../features/export/ExportScreen';
import { FlipbookScreen } from '../features/flipbook/FlipbookScreen';
import {
  realtimeClient,
  type RealtimeClientState,
} from '../lib/realtimeClient';

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
  {
    id: 5,
    label: 'POSE 05',
    timestamp: '00:19',
    hostPose: '😜🤟',
    guestPose: '🤩🎉',
    accentBg: '#FCEEF3',
    retakeCount: 0,
  },
  {
    id: 6,
    label: 'POSE 06',
    timestamp: '00:23',
    hostPose: '🥳💫',
    guestPose: '😍🫶',
    accentBg: '#EBF4FD',
    retakeCount: 0,
  },
  {
    id: 7,
    label: 'POSE 07',
    timestamp: '00:27',
    hostPose: '😉✨',
    guestPose: '😁✌️',
    accentBg: '#ECF3ED',
    retakeCount: 0,
  },
  {
    id: 8,
    label: 'POSE 08',
    timestamp: '00:31',
    hostPose: '🫶👑',
    guestPose: '🌸🥰',
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
  const [takeCount, setTakeCount] = useState<number>(3);
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilterId>('normal');
  const [frames, setFrames] = useState<CapturedFrame[]>(INITIAL_FRAMES);
  const [retakesRemaining, setRetakesRemaining] = useState<number>(3);
  const [layout, setLayout] = useState<TemplateLayoutId>('strip-1x4');
  const [stripTint, setStripTint] = useState<string>('#FFFFFF');
  const [caption, setCaption] = useState<string>('Nov 14, 2026 12:02pm');
  const [stickers, setStickers] = useState<StickerItem[]>(
    DEFAULT_STICKER_LIBRARY.map((s) => ({ ...s, active: false }))
  );
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [realtimeState, setRealtimeState] = useState<RealtimeClientState>(() =>
    realtimeClient.getState()
  );
  const inviteHandled = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isNight ? 'night' : 'day');
  }, [isNight]);

  // Auto-join Duo room via ?room=MMT-XXXX invite link
  useEffect(() => {
    if (typeof window === 'undefined' || inviteHandled.current || realtimeState.transport === 'connecting') return;
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('room');
    const flow = params.get('flow');
    if (inviteCode && inviteCode.trim()) {
      inviteHandled.current = true;
      const code = inviteCode.trim().toUpperCase();
      const saved = realtimeClient.getSavedSession();
      setMode('duo');
      if (realtimeState.transport !== 'websocket' || saved?.code !== code) realtimeClient.joinRoom(code, 'Guest');
      setActiveScreen(flow === 'flipbook' ? 'flipbook' : 'camera');
    }
  }, [realtimeState.transport]);

  useEffect(() => {
    return realtimeClient.subscribe((next) => {
      setRealtimeState(next);
      if (next.snapshot) {
        setRoomState(next.snapshot.connectionState);
        setTakeCount(next.snapshot.takeCount);
        setSelectedFilter(next.snapshot.selectedFilter);
        setLayout(next.snapshot.layout);
        setRetakesRemaining(next.snapshot.retakesRemaining);

        if (next.snapshot.syncedFrames && next.snapshot.syncedFrames.length > 0) {
          setFrames((prev) =>
            prev.map((fr, idx) => {
              const synced = next.snapshot?.syncedFrames.find(
                (sf) => sf.frameIndex === idx
              );
              if (!synced) return fr;
              return {
                ...fr,
                imageDataUrl: synced.hostDataUrl ?? fr.imageDataUrl,
                guestImageDataUrl: synced.guestDataUrl ?? fr.guestImageDataUrl,
              };
            })
          );
        }

        if (next.snapshot.editorState) {
          setStripTint(next.snapshot.editorState.stripTint);
          setCaption(next.snapshot.editorState.caption);
          setStickers(next.snapshot.editorState.stickers);
          if (Array.isArray(next.snapshot.editorState.placedStickers)) {
            setPlacedStickers(next.snapshot.editorState.placedStickers);
          }
        }
      }
    });
  }, []);

  const handleStartMode = (nextMode: BoothMode, targetScreen: ScreenId) => {
    setMode(nextMode);
    setActiveScreen(targetScreen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChangeTakeCount = (count: number) => {
    const clamped = Math.max(1, Math.min(8, Math.round(count) || 2));
    setTakeCount(clamped);
    realtimeClient.syncConfig({ takeCount: clamped });
  };

  const handleChangeFilter = (filter: PhotoFilterId) => {
    setSelectedFilter(filter);
    realtimeClient.syncConfig({ selectedFilter: filter });
  };

  const handleChangeLayout = (nextLayout: TemplateLayoutId) => {
    setLayout(nextLayout);
    realtimeClient.syncConfig({ layout: nextLayout });
  };

  const handleChangeStripTint = (color: string) => {
    setStripTint(color);
    realtimeClient.sendEditorOperation('set-tint', { value: color });
  };

  const handleChangeCaption = (text: string) => {
    setCaption(text);
    realtimeClient.sendEditorOperation('set-caption', { value: text });
  };

  const handleCaptureFrame = (
    frameIndex: number,
    dataUrl: string,
    targetRole: 'host' | 'guest' = 'host'
  ) => {
    setFrames((prev) =>
      prev.map((f, idx) =>
        idx === frameIndex
          ? targetRole === 'guest'
            ? { ...f, guestImageDataUrl: dataUrl }
            : { ...f, imageDataUrl: dataUrl }
          : f
      )
    );
    if (mode === 'duo' && targetRole === (realtimeState.role ?? 'host')) {
      realtimeClient.syncCapturedFrame(frameIndex, dataUrl);
    }
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

  const handleAddPlacedSticker = (stk: StickerItem): string => {
    const actor = realtimeState.role ?? 'host';
    const instanceId = `ps-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newItem: PlacedSticker = {
      instanceId,
      stickerId: stk.id,
      emoji: stk.emoji,
      label: stk.label,
      category: stk.category,
      badgeText: stk.badgeText,
      owner: actor,
      xPct: 30 + Math.round(Math.random() * 40),
      yPct: 25 + Math.round(Math.random() * 45),
      scale: 1,
      rotation: 0,
    };
    setPlacedStickers((prev) => [...prev, newItem]);
    realtimeClient.sendEditorOperation('add-sticker', { placedSticker: newItem });
    return instanceId;
  };

  const handleUpdatePlacedSticker = (
    instanceId: string,
    patch: Partial<Pick<PlacedSticker, 'xPct' | 'yPct' | 'scale' | 'rotation'>>
  ) => {
    setPlacedStickers((prev) =>
      prev.map((ps) => (ps.instanceId === instanceId ? { ...ps, ...patch } : ps))
    );
    realtimeClient.sendEditorOperation('update-sticker', { instanceId, patch });
  };

  const handleRemovePlacedSticker = (instanceId: string) => {
    setPlacedStickers((prev) => prev.filter((ps) => ps.instanceId !== instanceId));
    realtimeClient.sendEditorOperation('remove-sticker', { instanceId });
  };

  const handleUndoByOwner = (owner: 'host' | 'guest') => {
    if (realtimeState.snapshot) {
      realtimeClient.sendPersonalUndo(owner);
      return;
    }
    setPlacedStickers((prev) => {
      const idx = [...prev].reverse().findIndex((ps) => ps.owner === owner);
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      return prev.filter((_, i) => i !== realIdx);
    });
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        Lewati ke Konten Utama
      </a>

      <SeasonalAmbient
        season={season}
        isNight={isNight}
        enabled={AMBIENT_SCREENS.includes(activeScreen)}
      />

      <GlassHeader
        activeScreen={activeScreen}
        onSelectScreen={setActiveScreen}
        mode={mode}
        isNight={isNight}
        onToggleNight={() => setIsNight((prev) => !prev)}
      />

      <div className="app-shell">
        <main id="main-content" tabIndex={-1}>
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
              realtimeState={realtimeState}
              onNavigate={setActiveScreen}
            />
          )}

          {activeScreen === 'frame-select' && (
            <FrameSelectScreen
              mode={mode}
              layout={layout}
              onChangeLayout={handleChangeLayout}
              takeCount={takeCount}
              onChangeTakeCount={handleChangeTakeCount}
              roomCode={realtimeState.snapshot?.code ?? null}
              onNavigate={setActiveScreen}
            />
          )}

          {activeScreen === 'camera' && (
            <CameraScreen
              mode={mode}
              isNight={isNight}
              takeCount={takeCount}
              onChangeTakeCount={handleChangeTakeCount}
              selectedFilter={selectedFilter}
              onChangeFilter={handleChangeFilter}
              layout={layout}
              onChangeLayout={handleChangeLayout}
              frames={frames}
              onCaptureFrame={handleCaptureFrame}
              realtimeState={realtimeState}
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
              realtimeState={realtimeState}
              onNavigate={setActiveScreen}
            />
          )}

          {activeScreen === 'editor' && (
            <EditorScreen
              mode={mode}
              takeCount={takeCount}
              frames={frames}
              retakesRemaining={retakesRemaining}
              onRetakeFrame={handleRetakeFrame}
              layout={layout}
              onChangeLayout={handleChangeLayout}
              selectedFilter={selectedFilter}
              onChangeFilter={handleChangeFilter}
              stripTint={stripTint}
              onChangeStripTint={handleChangeStripTint}
              caption={caption}
              onChangeCaption={handleChangeCaption}
              stickers={stickers}
              placedStickers={placedStickers}
              onAddPlacedSticker={handleAddPlacedSticker}
              onUpdatePlacedSticker={handleUpdatePlacedSticker}
              onRemovePlacedSticker={handleRemovePlacedSticker}
              onUndoByOwner={handleUndoByOwner}
              realtimeState={realtimeState}
              onNavigate={setActiveScreen}
            />
          )}

          {activeScreen === 'flipbook' && (
            <FlipbookScreen
              mode={mode}
              onChangeMode={setMode}
              realtimeState={realtimeState}
              selectedFilter={selectedFilter}
              onChangeFilter={handleChangeFilter}
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
              placedStickers={placedStickers}
              onNavigate={setActiveScreen}
            />
          )}
        </main>
      </div>
    </>
  );
};
