import {
  PHOTO_FILTER_PRESETS,
  type BoothMode,
  type CameraAccessoryId,
  type CapturedFrame,
  type ExportFormat,
  type FlipbookEffectOverlayId,
  type PhotoFilterId,
  type PlacedSticker,
  type StickerItem,
  type TemplateLayoutId,
} from '@momentos/shared';
import { cameraCoverCrop, drawTrackedCameraAccessory, flipbookCameraBoxes, hasCameraFrame, type CameraBox, type FaceAnchors } from './cameraAccessories';

export const FLIPBOOK_FRAME_WIDTH = 640;
export const FLIPBOOK_FRAME_HEIGHT = 360;
export const CLASSIC_FRAME_WIDTH = 960;
export const CLASSIC_FRAME_HEIGHT = 540;

interface ClassicPhotoEffects {
  overlay: FlipbookEffectOverlayId;
  poseIndex: number;
  accessory?: { id: CameraAccessoryId; face: FaceAnchors | null; timeMs: number };
}

export async function listVideoInputDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'videoinput');
}

export async function startCameraStream(deviceId?: string, size = { width: 1280, height: 960 }): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Browser ini belum mendukung akses kamera (getUserMedia).');
  }
  const videoConstraints: MediaTrackConstraints = {
    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }),
    width: { ideal: size.width },
    height: { ideal: size.height },
  };

  return navigator.mediaDevices.getUserMedia({
    video: videoConstraints,
    audio: false,
  });
}

export function stopCameraStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

export function getCssFilterById(filterId: PhotoFilterId): string {
  return PHOTO_FILTER_PRESETS.find((f) => f.id === filterId)?.cssFilter ?? 'none';
}

export function captureVideoFrameToDataUrl(
  videoEl: HTMLVideoElement,
  options: {
    mirror?: boolean;
    cssFilter?: string;
    width?: number;
    height?: number;
    effects?: ClassicPhotoEffects;
  } = {}
): string {
  const { mirror = true, cssFilter = 'none', width = 960, height = 720, effects } = options;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.save();
  ctx.filter = cssFilter;

  const vw = videoEl.videoWidth || width;
  const vh = videoEl.videoHeight || height;
  const box = { x: 0, y: 0, width, height };
  const crop = cameraCoverCrop(vw, vh, box);

  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(videoEl, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
  ctx.restore();
  if (effects) drawClassicPhotoEffects(ctx, box, effects, videoEl, mirror);

  return canvas.toDataURL('image/png');
}

export function createSimulatedPoseDataUrl(
  poseText: string,
  _label: string,
  bgHex: string,
  cssFilter = 'none',
  width = 960,
  height = 720,
  effects?: ClassicPhotoEffects,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.save();
  ctx.filter = cssFilter;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, width, height);

  // Subtle decorative glow (no text labels inside photo box!)
  const grad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    40,
    width * 0.5,
    height * 0.5,
    width * 0.55
  );
  grad.addColorStop(0, 'rgba(255,255,255,0.65)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#18181B';
  ctx.font = `700 ${Math.round(height * 0.28)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(poseText, width / 2, height / 2);
  ctx.restore();
  if (effects) drawClassicPhotoEffects(ctx, { x: 0, y: 0, width, height }, effects);

  return canvas.toDataURL('image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function renderClassicCompositeDataUrl(params: {
  mode: BoothMode;
  frames: CapturedFrame[];
  layout: TemplateLayoutId;
  stripTint: string;
  selectedFilter: PhotoFilterId;
  caption: string;
  stickers: StickerItem[];
  placedStickers?: PlacedSticker[];
  format: ExportFormat;
}): Promise<string> {
  const {
    mode,
    frames,
    layout,
    stripTint,
    selectedFilter,
    caption,
    stickers,
    placedStickers = [],
    format,
  } = params;
  const cssFilter = getCssFilterById(selectedFilter);
  const activeStickers = stickers.filter((s) => s.active);

  const isGridOrScrapbook = layout === 'grid-2x2' || layout === 'editorial-scrapbook';
  const isTicket = layout === 'vintage-ticket';
  const isFilm = layout === 'film-35mm';
  const isScrapbook = layout === 'editorial-scrapbook';
  const isPolaroid = layout === 'polaroid-duo';

  const canvasWidth = isGridOrScrapbook ? 1080 : 640;
  const cols = isGridOrScrapbook ? 2 : 1;
  const rows = Math.ceil(frames.length / cols);
  const sidePad = isFilm ? 74 : isGridOrScrapbook ? 56 : isPolaroid ? 48 : 38;
  const gap = isGridOrScrapbook ? 30 : isPolaroid ? 28 : 20;
  const slotW = (canvasWidth - sidePad * 2 - gap * (cols - 1)) / cols;
  const slotH = isGridOrScrapbook || isPolaroid
    ? Math.round((slotW * 3) / 4)
    : Math.round((slotW * 2) / 3);

  const startY = isScrapbook ? 148 : 96;
  const footerSpace = isTicket ? 150 : isPolaroid ? 160 : 124;
  const rowExtra = isScrapbook ? 44 : isPolaroid ? 22 : 0;
  const canvasHeight = startY + rows * (slotH + rowExtra) + Math.max(0, rows - 1) * gap + footerSpace;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const paperBg = isFilm
    ? '#181619'
    : isTicket && stripTint === '#FFFFFF'
    ? '#F4ECDD'
    : isScrapbook && stripTint === '#FFFFFF'
    ? '#FAF3EA'
    : stripTint;
  const isDarkPaper = paperBg === '#18181B' || isFilm;

  // Base background
  ctx.fillStyle = paperBg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle dot pattern for scrapbook
  if (isScrapbook) {
    ctx.fillStyle = '#D5C7B8';
    for (let x = 28; x < canvas.width; x += 28) {
      for (let y = 28; y < canvas.height; y += 28) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Outer frame stroke
  ctx.strokeStyle = isFilm ? '#322E34' : '#18181B';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

  // Sprocket holes for 35mm film
  if (isFilm) {
    ctx.fillStyle = '#FFFFFF';
    for (let y = 44; y < canvas.height - 60; y += 64) {
      drawRoundedRectPath(ctx, 24, y, 22, 32, 4);
      ctx.fill();
      drawRoundedRectPath(ctx, canvas.width - 46, y, 22, 32, 4);
      ctx.fill();
    }
  }

  // Top Header Text
  if (isTicket) {
    ctx.fillStyle = '#9E325F';
    ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ADMIT ONE • STUDIO', 42, 62);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7A6554';
    ctx.font = '700 20px monospace';
    ctx.fillText('NO. 2026-0411', canvas.width - 42, 62);
    ctx.textAlign = 'left';
  } else if (isFilm) {
    ctx.fillStyle = '#E09F5A';
    ctx.font = '700 22px monospace';
    ctx.fillText('MOMENTOS GC 400', 74, 62);
    ctx.textAlign = 'right';
    ctx.fillText('SAFETY FILM', canvas.width - 74, 62);
    ctx.textAlign = 'left';
  } else if (isScrapbook) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2A1F1D';
    ctx.font = 'italic 44px Georgia, serif';
    ctx.fillText('Little Moments Journal', canvas.width / 2, 74);
    ctx.fillStyle = '#BC4374';
    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('SCRAPBOOK EDITION', canvas.width / 2, 108);
    ctx.textAlign = 'left';
  } else {
    ctx.textAlign = 'center';
    ctx.fillStyle = isDarkPaper ? '#FAF3EA' : '#18181B';
    ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('MOMENTOS', canvas.width / 2, 60);
    ctx.textAlign = 'left';
  }

  for (let i = 0; i < frames.length; i++) {
    const fr = frames[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = sidePad + col * (slotW + gap);
    const y = startY + row * (slotH + gap + rowExtra);

    ctx.save();
    if (isScrapbook) {
      const cx = x + slotW / 2;
      const cy = y + slotH / 2;
      ctx.translate(cx, cy);
      ctx.rotate(((i % 2 === 0 ? -2.2 : 2.2) * Math.PI) / 180);
      ctx.translate(-cx, -cy);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - 12, y - 12, slotW + 24, slotH + 54);
      ctx.strokeStyle = '#DFD3C3';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 12, y - 12, slotW + 24, slotH + 54);
    } else if (isPolaroid) {
      ctx.fillStyle = '#FFFFFF';
      drawRoundedRectPath(ctx, x - 10, y - 10, slotW + 20, slotH + 34, 8);
      ctx.fill();
      ctx.strokeStyle = '#18181B';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    drawRoundedRectPath(ctx, x, y, slotW, slotH, isScrapbook || isPolaroid ? 4 : 6);
    ctx.clip();

    const sourceUrl =
      fr.imageDataUrl ??
      createSimulatedPoseDataUrl(
        fr.hostPose,
        fr.label,
        fr.accentBg,
        cssFilter
      );

    const guestSourceUrl =
      fr.guestImageDataUrl ??
      createSimulatedPoseDataUrl(
        fr.guestPose,
        fr.label,
        '#EBF4FD',
        cssFilter
      );

    try {
      if (mode === 'duo') {
        const [hostImg, guestImg] = await Promise.all([
          loadImage(sourceUrl),
          loadImage(guestSourceUrl),
        ]);
        const halfW = slotW / 2;

        // Draw Host on Left Half
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, halfW, slotH);
        ctx.clip();
        if (fr.imageDataUrl) {
          ctx.filter = cssFilter;
        }
        const hRatio = hostImg.width / hostImg.height;
        const halfBoxRatio = halfW / slotH;
        let hdw = halfW;
        let hdh = slotH;
        let hdx = x;
        let hdy = y;
        if (hRatio > halfBoxRatio) {
          hdw = slotH * hRatio;
          hdx = x - (hdw - halfW) / 2;
        } else {
          hdh = halfW / hRatio;
          hdy = y - (hdh - slotH) / 2;
        }
        ctx.drawImage(hostImg, hdx, hdy, hdw, hdh);
        ctx.restore();

        // Draw Guest on Right Half
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + halfW, y, halfW, slotH);
        ctx.clip();
        if (fr.guestImageDataUrl) {
          ctx.filter = cssFilter;
        }
        const gRatio = guestImg.width / guestImg.height;
        let gdw = halfW;
        let gdh = slotH;
        let gdx = x + halfW;
        let gdy = y;
        if (gRatio > halfBoxRatio) {
          gdw = slotH * gRatio;
          gdx = x + halfW - (gdw - halfW) / 2;
        } else {
          gdh = halfW / gRatio;
          gdy = y - (gdh - slotH) / 2;
        }
        ctx.drawImage(guestImg, gdx, gdy, gdw, gdh);
        ctx.restore();

        // Clean thin divider
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + halfW, y);
        ctx.lineTo(x + halfW, y + slotH);
        ctx.stroke();
        ctx.restore();
      } else {
        const img = await loadImage(sourceUrl);
        ctx.save();
        if (fr.imageDataUrl) {
          ctx.filter = cssFilter;
        }
        const imgRatio = img.width / img.height;
        const boxRatio = slotW / slotH;
        let dw = slotW;
        let dh = slotH;
        let dx = x;
        let dy = y;
        if (imgRatio > boxRatio) {
          dw = slotH * imgRatio;
          dx = x - (dw - slotW) / 2;
        } else {
          dh = slotW / imgRatio;
          dy = y - (dh - slotH) / 2;
        }
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
      }
    } catch {
      ctx.fillStyle = fr.accentBg;
      ctx.fillRect(x, y, slotW, slotH);
    }
    ctx.restore();

    if (isFilm) {
      ctx.strokeStyle = 'rgba(224, 159, 90, 0.7)';
      ctx.lineWidth = 2;
      drawRoundedRectPath(ctx, x, y, slotW, slotH, 6);
      ctx.stroke();
    } else if (!isScrapbook && !isPolaroid) {
      ctx.strokeStyle = '#18181B';
      ctx.lineWidth = 2.5;
      drawRoundedRectPath(ctx, x, y, slotW, slotH, 6);
      ctx.stroke();
    } else if (isScrapbook) {
      ctx.save();
      const tapeX = x + slotW / 2 - 48;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(232,156,182,0.86)' : 'rgba(169,192,150,0.86)';
      ctx.fillRect(tapeX, y - 22, 96, 20);
      ctx.restore();
    }
  }

  // Footer caption & ticket barcode
  const footerY = canvas.height - 54;
  ctx.textAlign = 'center';
  if (isTicket) {
    ctx.strokeStyle = '#7A6554';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(42, canvas.height - 96);
    ctx.lineTo(canvas.width - 42, canvas.height - 96);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#2A1F1D';
    ctx.font = '700 26px Georgia, serif';
    ctx.fillText(caption || 'MOMENTOS ADMIT ONE', canvas.width / 2, canvas.height - 60);

    ctx.fillStyle = '#18181B';
    for (let bx = 140; bx < canvas.width - 140; bx += 11) {
      const barW = (bx % 3) + 2;
      ctx.fillRect(bx, canvas.height - 42, barW, 18);
    }
  } else {
    ctx.fillStyle = isFilm ? '#E09F5A' : isDarkPaper ? '#FAF3EA' : '#18181B';
    ctx.font = isFilm ? '700 22px monospace' : '700 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(caption || 'MOMENTOS • 2026', canvas.width / 2, footerY);
  }

  // Render freeform Canva-style placed stickers
  if (placedStickers.length > 0) {
    for (const ps of placedStickers) {
      const px = (ps.xPct / 100) * canvas.width;
      const py = (ps.yPct / 100) * canvas.height;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((ps.rotation * Math.PI) / 180);
      ctx.scale(ps.scale, ps.scale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (ps.category === 'stamp' || ps.category === 'tape') {
        const text = `${ps.emoji} ${ps.badgeText ?? ps.label}`;
        ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
        const tw = ctx.measureText(text).width + 26;
        const th = 38;
        ctx.fillStyle = ps.category === 'tape' ? 'rgba(232,156,182,0.92)' : '#FFFDF9';
        drawRoundedRectPath(ctx, -tw / 2, -th / 2, tw, th, ps.category === 'tape' ? 4 : 8);
        ctx.fill();
        ctx.strokeStyle = ps.category === 'stamp' ? '#BC4374' : '#18181B';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = ps.category === 'stamp' ? '#BC4374' : '#18181B';
        ctx.fillText(text, 0, 1);
      } else {
        ctx.font = '56px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        ctx.fillText(ps.emoji, 0, 0);
      }
      ctx.restore();
    }
  } else if (activeStickers.length > 0) {
    let sx = sidePad;
    const sy = canvas.height - 130;
    activeStickers.slice(0, 6).forEach((stk) => {
      const text = `${stk.emoji} ${stk.badgeText ?? stk.label}`;
      ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(text).width + 24;
      if (sx + tw > canvas.width - sidePad) return;

      ctx.fillStyle = stk.category === 'tape' ? 'rgba(232,156,182,0.88)' : '#FFFFFF';
      drawRoundedRectPath(ctx, sx, sy, tw, 34, 17);
      ctx.fill();
      ctx.strokeStyle = stk.category === 'stamp' ? '#BC4374' : '#18181B';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = stk.category === 'stamp' ? '#BC4374' : '#18181B';
      ctx.fillText(text, sx + 12, sy + 23);
      sx += tw + 10;
    });
  }

  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
  return canvas.toDataURL(mime, format === 'jpg' ? 0.92 : 1);
}

interface FlipbookFrameAccessory { id: CameraAccessoryId; face: FaceAnchors | null }

export function drawFlipbookRecordingOverlay(
  ctx: CanvasRenderingContext2D,
  overlayId: FlipbookEffectOverlayId,
  frameIndex: number,
  totalFrames: number,
  width: number,
  height: number,
): void {
  if (overlayId === 'none') return;
  ctx.save();
  if (overlayId === 'confetti-burst') {
    const items = ['🎊', '✨', '🎉', '🌸', '⭐'];
    ctx.font = '22px sans-serif';
    items.forEach((ic, idx) => {
      const px = width * (idx + 0.45) / items.length;
      const py = 32 + ((frameIndex * 13 + idx * 42) % (height - 64));
      ctx.fillText(ic, px, py);
    });
  } else if (overlayId === 'floating-hearts') {
    ctx.font = '24px sans-serif';
    const lift = (frameIndex * 8) % (height - 56);
    ctx.fillText('💖', 28, height - 28 - lift);
    ctx.fillText('🫶', width - 58, height - 42 - ((lift + 75) % (height - 56)));
  } else if (overlayId === 'disco-sparkles') {
    ctx.fillStyle =
      frameIndex % 2 === 0 ? 'rgba(240, 123, 174, 0.18)' : 'rgba(96, 165, 250, 0.18)';
    ctx.fillRect(0, 0, width, height);
    ctx.font = '20px sans-serif';
    ctx.fillText('✨', 36 + ((frameIndex * 21) % (width - 90)), 42);
  } else if (overlayId === 'comic-pop') {
    ctx.fillStyle = '#FBBF24';
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 2;
    drawRoundedRectPath(ctx, width - 102, 14, 84, 30, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#18181B';
    ctx.font = '800 14px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    const beatThird = Math.max(1, Math.floor(totalFrames / 3));
    ctx.fillText(
      frameIndex < beatThird
        ? 'SNAP!'
        : frameIndex < beatThird * 2
        ? 'POW!'
        : 'YAY!',
      width - 60,
      34
    );
    ctx.textAlign = 'left';
  } else if (overlayId === 'film-grain') {
    ctx.fillStyle = 'rgba(0,0,0,0.055)';
    for (let y = frameIndex % 4; y < height; y += 6) {
      ctx.fillRect(0, y, width, 1);
    }
  }
  ctx.restore();
}

export function drawClassicPhotoEffects(
  ctx: CanvasRenderingContext2D,
  box: CameraBox,
  effects: ClassicPhotoEffects,
  video?: HTMLVideoElement,
  mirror = false,
) {
  const { accessory, overlay, poseIndex } = effects;
  if (accessory && video) {
    drawTrackedCameraAccessory(ctx, accessory.id, accessory.face, video.videoWidth, video.videoHeight, box, mirror, accessory.timeMs);
  }
  if (overlay === 'none') return;

  const scale = box.height / FLIPBOOK_FRAME_HEIGHT;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
  ctx.translate(box.x, box.y);
  ctx.scale(scale, scale);
  drawFlipbookRecordingOverlay(ctx, overlay, (poseIndex * 12 + 3) % 60, 60, box.width / scale, box.height / scale);
  ctx.restore();
}

export function captureFlipbookFrameDataUrl(options: {
  videoEl: HTMLVideoElement | null;
  guestVideoEl?: HTMLVideoElement | null;
  mode?: BoothMode;
  fallbackEmoji: string;
  frameIndex: number;
  totalFrames: number;
  cssFilter: string;
  overlayId: FlipbookEffectOverlayId;
  mirror?: boolean;
  localOnRight?: boolean;
  accessories?: { local: FlipbookFrameAccessory; remote: FlipbookFrameAccessory; timeMs: number };
  paperColor?: string;
  accentHex?: string;
  width?: number;
  height?: number;
}): string {
  const {
    videoEl,
    guestVideoEl = null,
    mode = 'solo',
    fallbackEmoji,
    frameIndex,
    totalFrames,
    cssFilter,
    overlayId,
    mirror = true,
    localOnRight = false,
    accessories,
    paperColor = '#FBF7EF',
    accentHex = '#BC4374',
    width = FLIPBOOK_FRAME_WIDTH,
    height = FLIPBOOK_FRAME_HEIGHT,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const drawVideoBox = (
    vid: HTMLVideoElement,
    box: CameraBox,
    isMirror: boolean,
    accessory?: FlipbookFrameAccessory,
  ) => {
    const { x, y, width: bw, height: bh } = box;
    const crop = cameraCoverCrop(vid.videoWidth, vid.videoHeight, box);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, bw, bh);
    ctx.clip();
    ctx.filter = cssFilter;
    ctx.translate(x + (isMirror ? bw : 0), y);
    if (isMirror) ctx.scale(-1, 1);
    ctx.drawImage(vid, crop.x, crop.y, crop.width, crop.height, 0, 0, bw, bh);
    ctx.restore();
    if (accessory && accessories) {
      drawTrackedCameraAccessory(ctx, accessory.id, accessory.face,
        vid.videoWidth, vid.videoHeight, box, isMirror, accessories.timeMs);
    }
  };

  const hasLocalVideo = hasCameraFrame(videoEl);
  const hasGuestVideo = hasCameraFrame(guestVideoEl ?? null);
  const boxes = flipbookCameraBoxes(width, height, mode, localOnRight);

  // Base webcam frame or simulated pose.
  if (boxes.remote && (hasLocalVideo || hasGuestVideo)) {
    const halfW = width / 2;
    if (hasLocalVideo && videoEl) {
      drawVideoBox(videoEl, boxes.local, mirror, accessories?.local);
    } else {
      ctx.fillStyle = paperColor;
      ctx.fillRect(boxes.local.x, 0, halfW, height);
    }
    if (hasGuestVideo && guestVideoEl) {
      drawVideoBox(guestVideoEl, boxes.remote, false, accessories?.remote);
    } else {
      ctx.save();
      ctx.translate(boxes.remote.x - halfW, 0);
      ctx.filter = cssFilter;
      ctx.fillStyle = '#EBF4FD';
      ctx.fillRect(halfW, 0, halfW, height);
      ctx.fillStyle = '#18181B';
      ctx.font = '700 48px "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const bob = frameIndex % 2 === 0 ? -4 : 4;
      const parts = fallbackEmoji.split('·');
      ctx.fillText((parts[1] ?? '😄✨').trim(), halfW + halfW / 2, height / 2 + bob);
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW, height);
    ctx.stroke();
    ctx.restore();
  } else if (hasLocalVideo && videoEl) {
    drawVideoBox(videoEl, boxes.local, mirror, accessories?.local);
  } else {
    ctx.save();
    ctx.filter = cssFilter;
    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#18181B';
    ctx.font = '700 72px "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const bob = frameIndex % 2 === 0 ? -4 : 4;
    ctx.fillText(fallbackEmoji, width / 2, height / 2 + bob);
    ctx.restore();
  }

  drawFlipbookRecordingOverlay(ctx, overlayId, frameIndex, totalFrames, width, height);

  // Registration stamp bottom right
  ctx.fillStyle = accentHex;
  drawRoundedRectPath(ctx, width - 126, height - 34, 112, 22, 11);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    `FRM ${String(frameIndex + 1).padStart(2, '0')}/${totalFrames}`,
    width - 70,
    height - 19
  );

  return canvas.toDataURL('image/png');
}

function drawSpiralSpine(
  ctx: CanvasRenderingContext2D,
  height: number,
  binderColor: string
) {
  const spineW = 34;
  ctx.save();
  ctx.fillStyle = binderColor;
  ctx.fillRect(0, 0, spineW, height);
  ctx.strokeStyle = '#18181B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(spineW, 0);
  ctx.lineTo(spineW, height);
  ctx.stroke();

  const ringCount = 7;
  const step = height / (ringCount + 1);
  for (let i = 1; i <= ringCount; i++) {
    const ry = Math.round(i * step);
    // Hole
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.arc(spineW - 7, ry, 5, 0, Math.PI * 2);
    ctx.fill();
    // Metallic spiral ring
    const grad = ctx.createLinearGradient(4, ry - 4, spineW + 4, ry + 4);
    grad.addColorStop(0, '#F5F5F4');
    grad.addColorStop(0.5, '#A8A29E');
    grad.addColorStop(1, '#44403C');
    ctx.fillStyle = grad;
    drawRoundedRectPath(ctx, 4, ry - 4, 24, 8, 4);
    ctx.fill();
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawFlipbookPagePhoto(ctx: CanvasRenderingContext2D, img: HTMLImageElement, left: number, width: number, height: number) {
  const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
  const photoWidth = img.naturalWidth * scale;
  const photoHeight = img.naturalHeight * scale;
  ctx.drawImage(img, left + (width - photoWidth) / 2, (height - photoHeight) / 2, photoWidth, photoHeight);
}

/**
 * Render Sampul Depan Buku Flipbook (Tanpa Gambar Foto) + Transisi Membuka Buku.
 */
export async function renderFlipbookCoverDataUrl(options: {
  width?: number;
  height?: number;
  title: string;
  subtitle?: string;
  binderColor: string;
  paperColor: string;
  accentHex: string;
  openProgress?: number; // 0 = closed cover, 0..1 = opening cover animation
  firstPageDataUrl?: string;
}): Promise<string> {
  const {
    width = FLIPBOOK_FRAME_WIDTH,
    height = FLIPBOOK_FRAME_HEIGHT,
    title,
    subtitle = 'Interactive Motion Flipbook',
    binderColor,
    paperColor,
    accentHex,
    openProgress = 0,
    firstPageDataUrl,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const spineW = 34;
  const bodyW = width - spineW;

  // If cover is opening (openProgress > 0), draw page 1 underneath first
  if (openProgress > 0) {
    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, width, height);
    if (firstPageDataUrl) {
      try {
        const firstImg = await loadImage(firstPageDataUrl);
        drawFlipbookPagePhoto(ctx, firstImg, spineW, bodyW, height);
      } catch {
        // fallback to paperColor
      }
    }
  }

  // Draw Cover Panel (scaled horizontally around spineW to animate opening)
  const coverScaleX = Math.max(0.08, 1 - openProgress);
  ctx.save();
  ctx.translate(spineW, 0);
  ctx.scale(coverScaleX, 1);

  // Cover base surface (no photo!)
  ctx.fillStyle = binderColor;
  ctx.fillRect(0, 0, bodyW, height);

  // Inner editorial book-cover plate
  const pad = 22;
  ctx.fillStyle = paperColor;
  drawRoundedRectPath(ctx, pad, pad, bodyW - pad * 2, height - pad * 2, 14);
  ctx.fill();
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Second inner ornamental border
  ctx.strokeStyle = binderColor;
  ctx.lineWidth = 1.5;
  drawRoundedRectPath(
    ctx,
    pad + 8,
    pad + 8,
    bodyW - (pad + 8) * 2,
    height - (pad + 8) * 2,
    10
  );
  ctx.stroke();

  const isDarkPaper = paperColor === '#201E28' || paperColor === '#18181B';
  const textPrimary = isDarkPaper ? '#FAF7F2' : '#18181B';
  const textMuted = isDarkPaper ? '#D4D4D8' : '#52525B';
  const centerX = bodyW / 2;

  // Top Pill Badge
  ctx.fillStyle = accentHex;
  drawRoundedRectPath(ctx, centerX - 92, pad + 26, 184, 24, 12);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 10px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MOMENTOS STUDIO EDITION', centerX, pad + 38);

  // Decorative Book Emblem (Strictly NO photo on cover!)
  ctx.fillStyle = accentHex;
  ctx.font = '700 13px monospace';
  ctx.fillText('✦  60 FRAMES · MOTION BOOK  ✦', centerX, height / 2 - 42);

  // Theme Title
  ctx.fillStyle = textPrimary;
  ctx.font = '800 25px "Outfit", "Plus Jakarta Sans", sans-serif';
  ctx.fillText(title.toUpperCase(), centerX, height / 2 - 6);

  // Subtitle
  ctx.fillStyle = textMuted;
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle, centerX, height / 2 + 22);

  // Divider line
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 54, height / 2 + 42);
  ctx.lineTo(centerX + 54, height / 2 + 42);
  ctx.stroke();

  // Footer Brand Stamp
  ctx.fillStyle = textPrimary;
  ctx.font = '800 12px monospace';
  ctx.fillText('MOMENTOS FLIPBOOK • 2026', centerX, height - pad - 26);

  ctx.restore();

  // Page-turn drop shadow when cover is swinging open
  if (openProgress > 0) {
    const edgeX = spineW + bodyW * coverScaleX;
    const shadowGrad = ctx.createLinearGradient(edgeX, 0, edgeX + 28, 0);
    shadowGrad.addColorStop(0, 'rgba(24, 24, 27, 0.42)');
    shadowGrad.addColorStop(1, 'rgba(24, 24, 27, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(edgeX, 0, 28, height);
  }

  // Outer book border & Left Spiral Spine
  drawSpiralSpine(ctx, height, binderColor);
  ctx.strokeStyle = '#18181B';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, width - 3, height - 3);

  return canvas.toDataURL('image/png');
}

/**
 * Susun sequence GIF lengkap:
 * 1. Cover Pembuka tanpa foto (~0.4 detik / 400ms)
 * 2. Animasi cepat membuka sampul buku (3 frame transisi)
 * 3. Membalik halaman Frame 1 s/d Frame 60 dengan jilid spiral di kiri (~12 FPS / 85ms)
 */
export async function buildFlipbookGifSequenceWithCover(params: {
  frames: string[];
  presetName: string;
  presetSubtitle?: string;
  binderColor: string;
  paperColor: string;
  accentHex: string;
  pageDelayMs?: number;
}): Promise<{ allFrames: string[]; frameDelaysMs: number[] }> {
  const {
    frames,
    presetName,
    presetSubtitle,
    binderColor,
    paperColor,
    accentHex,
    pageDelayMs = 85,
  } = params;

  const width = FLIPBOOK_FRAME_WIDTH;
  const height = FLIPBOOK_FRAME_HEIGHT;
  const spineW = 34;
  const bodyW = width - spineW;

  const allFrames: string[] = [];
  const frameDelaysMs: number[] = [];

  const firstPage = frames[0];

  // 1. Closed Front Cover (Held for ~0.4s = 400ms, twice so reader clearly sees cover)
  const closedCoverUrl = await renderFlipbookCoverDataUrl({
    width,
    height,
    title: presetName,
    subtitle: presetSubtitle,
    binderColor,
    paperColor,
    accentHex,
    openProgress: 0,
  });
  allFrames.push(closedCoverUrl);
  frameDelaysMs.push(400);

  // 2. Fast Book Cover Opening Animation (3 quick swing frames)
  for (const prog of [0.32, 0.64, 0.88]) {
    const openingUrl = await renderFlipbookCoverDataUrl({
      width,
      height,
      title: presetName,
      subtitle: presetSubtitle,
      binderColor,
      paperColor,
      accentHex,
      openProgress: prog,
      firstPageDataUrl: firstPage,
    });
    allFrames.push(openingUrl);
    frameDelaysMs.push(65);
  }

  // 3. Render each of the 60 pages inside the spiral-bound book frame at ~12 FPS (85ms)
  const pageCanvas = document.createElement('canvas');
  pageCanvas.width = width;
  pageCanvas.height = height;
  const pCtx = pageCanvas.getContext('2d');

  for (let i = 0; i < frames.length; i++) {
    if (!pCtx) {
      allFrames.push(frames[i]);
      frameDelaysMs.push(pageDelayMs);
      continue;
    }
    pCtx.clearRect(0, 0, width, height);
    pCtx.fillStyle = paperColor;
    pCtx.fillRect(0, 0, width, height);

    try {
      const img = await loadImage(frames[i]);
      drawFlipbookPagePhoto(pCtx, img, spineW, bodyW, height);
    } catch {
      // keep paperColor fallback
    }

    // Subtle page-flip crease shadow near spiral spine
    const creaseGrad = pCtx.createLinearGradient(spineW, 0, spineW + 14, 0);
    creaseGrad.addColorStop(0, 'rgba(24,24,27,0.22)');
    creaseGrad.addColorStop(1, 'rgba(24,24,27,0)');
    pCtx.fillStyle = creaseGrad;
    pCtx.fillRect(spineW, 0, 14, height);

    drawSpiralSpine(pCtx, height, binderColor);
    pCtx.strokeStyle = '#18181B';
    pCtx.lineWidth = 3;
    pCtx.strokeRect(1.5, 1.5, width - 3, height - 3);

    allFrames.push(pageCanvas.toDataURL('image/png'));
    frameDelaysMs.push(pageDelayMs);

    if (i % 6 === 0) {
      await new Promise<void>((r) => window.setTimeout(r, 0));
    }
  }

  return { allFrames, frameDelaysMs };
}

/**
 * Pure TypeScript GIF89a animated encoder using uniform 3-3-2 palette & variable LZW.
 * Supports per-frame delays and async step-by-step yielding with % progress callback.
 */
export async function encodeAnimatedGifBlob(
  frameDataUrls: string[],
  delayMs = 85,
  options?: {
    frameDelaysMs?: number[];
    onProgress?: (percent: number) => void;
  }
): Promise<Blob> {
  if (frameDataUrls.length === 0) {
    throw new Error('Belum ada frame flipbook untuk dienkode ke GIF.');
  }

  const firstImg = await loadImage(frameDataUrls[0]);
  const width = firstImg.width || FLIPBOOK_FRAME_WIDTH;
  const height = firstImg.height || FLIPBOOK_FRAME_HEIGHT;

  const workCanvas = document.createElement('canvas');
  workCanvas.width = width;
  workCanvas.height = height;
  const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
  if (!workCtx) {
    throw new Error('Gagal menginisialisasi Canvas 2D untuk GIF.');
  }

  const out: number[] = [];
  const pushStr = (s: string) => {
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
  };
  const pushU16 = (v: number) => {
    out.push(v & 0xff, (v >> 8) & 0xff);
  };

  // GIF89a Header & Logical Screen Descriptor
  pushStr('GIF89a');
  pushU16(width);
  pushU16(height);
  out.push(0xf7, 0x00, 0x00); // Global Color Table Flag (1), Color Res (7), Sorted (0), Size (7 -> 256)

  // Global Color Table: 256 entries (3-3-2 uniform RGB palette)
  for (let i = 0; i < 256; i++) {
    const r = Math.round((((i >> 5) & 0x07) * 255) / 7);
    const g = Math.round((((i >> 2) & 0x07) * 255) / 7);
    const b = Math.round(((i & 0x03) * 255) / 3);
    out.push(r, g, b);
  }

  // Netscape 2.0 Application Extension for infinite loop
  out.push(0x21, 0xff, 0x0b);
  pushStr('NETSCAPE2.0');
  out.push(0x03, 0x01, 0x00, 0x00, 0x00);

  options?.onProgress?.(2);

  for (let frameIdx = 0; frameIdx < frameDataUrls.length; frameIdx++) {
    const url = frameDataUrls[frameIdx];
    const thisDelayMs = options?.frameDelaysMs?.[frameIdx] ?? delayMs;
    const delayCs = Math.max(2, Math.round(thisDelayMs / 10));

    const img = await loadImage(url);
    workCtx.clearRect(0, 0, width, height);
    workCtx.drawImage(img, 0, 0, width, height);
    const rgba = workCtx.getImageData(0, 0, width, height).data;

    // Quantize to 256 3-3-2 palette indices
    const pixels = new Uint8Array(width * height);
    for (let p = 0; p < pixels.length; p++) {
      const idx = p * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];
      pixels[p] = ((r >> 5) << 5) | ((g >> 5) << 2) | (b >> 6);
    }

    // Graphic Control Extension
    out.push(0x21, 0xf9, 0x04, 0x04);
    pushU16(delayCs);
    out.push(0x00, 0x00);

    // Image Descriptor
    out.push(0x2c);
    pushU16(0);
    pushU16(0);
    pushU16(width);
    pushU16(height);
    out.push(0x00); // No local color table

    // LZW Image Data (minCodeSize = 8)
    out.push(8);
    const clearCode = 256;
    const eoiCode = 257;
    let codeSize = 9;
    let nextCode = 258;
    const dict = new Map<number, number>();

    let bitBuf = 0;
    let bitCount = 0;
    const subBlock: number[] = [];

    const flushSubBlock = () => {
      if (subBlock.length === 0) return;
      out.push(subBlock.length);
      for (let i = 0; i < subBlock.length; i++) out.push(subBlock[i]);
      subBlock.length = 0;
    };

    const writeCode = (code: number, size: number) => {
      bitBuf |= code << bitCount;
      bitCount += size;
      while (bitCount >= 8) {
        subBlock.push(bitBuf & 0xff);
        bitBuf >>= 8;
        bitCount -= 8;
        if (subBlock.length === 255) flushSubBlock();
      }
    };

    writeCode(clearCode, codeSize);
    let prefix = pixels[0];

    for (let i = 1; i < pixels.length; i++) {
      const k = pixels[i];
      const key = (prefix << 8) | k;
      const found = dict.get(key);
      if (found !== undefined) {
        prefix = found;
      } else {
        writeCode(prefix, codeSize);
        if (nextCode < 4096) {
          dict.set(key, nextCode);
          if (nextCode === (1 << codeSize) && codeSize < 12) {
            codeSize++;
          }
          nextCode++;
        } else {
          writeCode(clearCode, codeSize);
          dict.clear();
          codeSize = 9;
          nextCode = 258;
        }
        prefix = k;
      }
    }

    writeCode(prefix, codeSize);
    writeCode(eoiCode, codeSize);
    if (bitCount > 0) {
      subBlock.push(bitBuf & 0xff);
    }
    flushSubBlock();
    out.push(0x00); // Image Data Terminator

    const pct = Math.min(
      99,
      Math.max(3, Math.round(((frameIdx + 1) / frameDataUrls.length) * 100))
    );
    options?.onProgress?.(pct);

    // Yield every frame so the browser UI stays responsive and renders % progress
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }

  out.push(0x3b); // GIF Trailer
  options?.onProgress?.(100);
  return new Blob([new Uint8Array(out)], { type: 'image/gif' });
}

export async function recordCanvasVideoBlob(
  frameDataUrls: string[],
  fps = 10
): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  if (frameDataUrls.length === 0) {
    throw new Error('Belum ada frame flipbook untuk direkam menjadi video.');
  }

  const firstImg = await loadImage(frameDataUrls[0]);
  const width = firstImg.width || FLIPBOOK_FRAME_WIDTH;
  const height = firstImg.height || FLIPBOOK_FRAME_HEIGHT;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D tidak tersedia.');

  const captureStreamFn = (
    canvas as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }
  ).captureStream;

  if (!captureStreamFn || typeof MediaRecorder === 'undefined') {
    throw new Error('Browser tidak mendukung MediaRecorder / captureStream.');
  }

  const preferredMimes = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm',
  ];
  const supportedMime =
    preferredMimes.find((m) => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';
  const ext: 'mp4' | 'webm' = supportedMime.includes('mp4') ? 'mp4' : 'webm';

  const stream = captureStreamFn.call(canvas, fps);
  const recorder = new MediaRecorder(stream, { mimeType: supportedMime });
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stopPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: supportedMime }));
    };
  });

  recorder.start();
  const frameInterval = Math.round(1000 / fps);
  for (const url of frameDataUrls) {
    const img = await loadImage(url);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    await new Promise((r) => window.setTimeout(r, frameInterval));
  }
  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());

  const blob = await stopPromise;
  return { blob, ext };
}

export function triggerFileDownload(urlOrBlob: string | Blob, filename: string): void {
  const href =
    typeof urlOrBlob === 'string' ? urlOrBlob : URL.createObjectURL(urlOrBlob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (typeof urlOrBlob !== 'string') {
    window.setTimeout(() => URL.revokeObjectURL(href), 2500);
  }
}
