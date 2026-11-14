import {
  PHOTO_FILTER_PRESETS,
  type BoothMode,
  type CapturedFrame,
  type ExportFormat,
  type FlipbookEffectOverlayId,
  type PhotoFilterId,
  type StickerItem,
  type TemplateLayoutId,
} from '@momentos/shared';

export async function listVideoInputDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'videoinput');
}

export async function startCameraStream(deviceId?: string): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Browser ini belum mendukung akses kamera (getUserMedia).');
  }
  const videoConstraints: MediaTrackConstraints = deviceId
    ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 960 } }
    : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } };

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
  } = {}
): string {
  const { mirror = true, cssFilter = 'none', width = 960, height = 720 } = options;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.save();
  ctx.filter = cssFilter;

  const vw = videoEl.videoWidth || width;
  const vh = videoEl.videoHeight || height;
  const targetRatio = width / height;
  const sourceRatio = vw / vh;

  let sx = 0;
  let sy = 0;
  let sWidth = vw;
  let sHeight = vh;

  if (sourceRatio > targetRatio) {
    sWidth = vh * targetRatio;
    sx = (vw - sWidth) / 2;
  } else {
    sHeight = vw / targetRatio;
    sy = (vh - sHeight) / 2;
  }

  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(videoEl, sx, sy, sWidth, sHeight, 0, 0, width, height);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

export function createSimulatedPoseDataUrl(
  poseText: string,
  label: string,
  bgHex: string,
  cssFilter = 'none',
  width = 960,
  height = 720
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

  // Subtle decorative glow
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
  ctx.fillText(poseText, width / 2, height / 2 - 14);

  ctx.font = `700 ${Math.round(height * 0.045)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#52525B';
  ctx.fillText(label, width / 2, height - 48);
  ctx.restore();

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
  format: ExportFormat;
}): Promise<string> {
  const { mode, frames, layout, stripTint, selectedFilter, caption, stickers, format } = params;
  const cssFilter = getCssFilterById(selectedFilter);
  const activeStickers = stickers.filter((s) => s.active);

  const isGridOrScrapbook = layout === 'grid-2x2' || layout === 'editorial-scrapbook';
  const isTicket = layout === 'vintage-ticket';
  const isFilm = layout === 'film-35mm';
  const isScrapbook = layout === 'editorial-scrapbook';

  const canvas = document.createElement('canvas');
  canvas.width = isGridOrScrapbook ? 1080 : 640;
  canvas.height = isGridOrScrapbook ? 1280 : Math.max(1180, 320 + frames.length * 360);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const paperBg = isFilm
    ? '#181619'
    : isTicket && stripTint === '#FFFFFF'
    ? '#F4ECDD'
    : isScrapbook && stripTint === '#FFFFFF'
    ? '#FAF3EA'
    : stripTint;

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
    for (let y = 44; y < canvas.height - 80; y += 64) {
      drawRoundedRectPath(ctx, 26, y, 24, 34, 4);
      ctx.fill();
      drawRoundedRectPath(ctx, canvas.width - 50, y, 24, 34, 4);
      ctx.fill();
    }
  }

  // Top Header Text
  if (isTicket) {
    ctx.fillStyle = '#9E325F';
    ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ADMIT ONE • CLASSIC STUDIO', 46, 68);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7A6554';
    ctx.font = '700 20px monospace';
    ctx.fillText('NO. 2026-0411', canvas.width - 46, 68);
    ctx.textAlign = 'left';
  } else if (isFilm) {
    ctx.fillStyle = '#E09F5A';
    ctx.font = '700 22px monospace';
    ctx.fillText('MOMENTOS GC 400', 76, 68);
    ctx.textAlign = 'right';
    ctx.fillText('SAFETY FILM', canvas.width - 76, 68);
    ctx.textAlign = 'left';
  } else if (isScrapbook) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2A1F1D';
    ctx.font = 'italic 44px Georgia, serif';
    ctx.fillText('Little Moments Journal', canvas.width / 2, 76);
    ctx.fillStyle = '#BC4374';
    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('SCRAPBOOK EDITION • VOL. 03', canvas.width / 2, 110);
    ctx.textAlign = 'left';
  } else {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#18181B';
    ctx.font = '700 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('MOMENTOS PHOTOBOOTH', canvas.width / 2, 68);
    ctx.textAlign = 'left';
  }

  const startY = isScrapbook ? 148 : 104;
  const cols = isGridOrScrapbook ? 2 : 1;
  const sidePad = isFilm ? 78 : isGridOrScrapbook ? 56 : 46;
  const gap = isGridOrScrapbook ? 32 : 24;
  const slotW = (canvas.width - sidePad * 2 - gap * (cols - 1)) / cols;
  const slotH = isGridOrScrapbook ? 410 : layout === 'polaroid-duo' ? 330 : 310;

  for (let i = 0; i < frames.length; i++) {
    const fr = frames[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = sidePad + col * (slotW + gap);
    const y = startY + row * (slotH + gap + (isScrapbook ? 40 : 0));

    ctx.save();
    if (isScrapbook) {
      const cx = x + slotW / 2;
      const cy = y + slotH / 2;
      ctx.translate(cx, cy);
      ctx.rotate(((i % 2 === 0 ? -2.2 : 2.2) * Math.PI) / 180);
      ctx.translate(-cx, -cy);

      // Polaroid white card around photo
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - 12, y - 12, slotW + 24, slotH + 62);
      ctx.strokeStyle = '#DFD3C3';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 12, y - 12, slotW + 24, slotH + 62);
    }

    drawRoundedRectPath(ctx, x, y, slotW, slotH, isScrapbook ? 6 : 16);
    ctx.clip();

    const sourceUrl =
      fr.imageDataUrl ??
      createSimulatedPoseDataUrl(
        mode === 'duo' ? `${fr.hostPose}  ${fr.guestPose}` : fr.hostPose,
        fr.label,
        fr.accentBg,
        cssFilter
      );

    try {
      const img = await loadImage(sourceUrl);
      ctx.save();
      if (fr.imageDataUrl) {
        ctx.filter = cssFilter;
      }
      // Cover-fit image into slot
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
    } catch {
      ctx.fillStyle = fr.accentBg;
      ctx.fillRect(x, y, slotW, slotH);
    }
    ctx.restore();

    // Film frame border & amber marker
    if (isFilm) {
      ctx.strokeStyle = 'rgba(224, 159, 90, 0.7)';
      ctx.lineWidth = 2;
      drawRoundedRectPath(ctx, x, y, slotW, slotH, 10);
      ctx.stroke();
      ctx.fillStyle = '#E09F5A';
      ctx.font = '700 18px monospace';
      ctx.fillText(`▶ 0${i + 1}A`, x + 10, y - 6);
    } else if (!isScrapbook) {
      ctx.strokeStyle = '#18181B';
      ctx.lineWidth = 3;
      drawRoundedRectPath(ctx, x, y, slotW, slotH, 16);
      ctx.stroke();
    } else {
      // Washi tape strip on top of polaroid
      ctx.save();
      const tapeX = x + slotW / 2 - 48;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(232,156,182,0.86)' : 'rgba(169,192,150,0.86)';
      ctx.fillRect(tapeX, y - 24, 96, 22);
      ctx.restore();
    }
  }

  // Render active stickers across top strip bar
  if (activeStickers.length > 0) {
    let sx = sidePad;
    const sy = canvas.height - 150;
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

  // Footer caption & ticket barcode
  const footerY = canvas.height - 62;
  ctx.textAlign = 'center';
  if (isTicket) {
    ctx.strokeStyle = '#7A6554';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(42, canvas.height - 102);
    ctx.lineTo(canvas.width - 42, canvas.height - 102);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#2A1F1D';
    ctx.font = '700 28px Georgia, serif';
    ctx.fillText(caption || 'MOMENTOS ADMIT ONE', canvas.width / 2, canvas.height - 64);

    // Barcode stripes
    ctx.fillStyle = '#18181B';
    for (let bx = 140; bx < canvas.width - 140; bx += 11) {
      const barW = (bx % 3) + 2;
      ctx.fillRect(bx, canvas.height - 46, barW, 20);
    }
  } else {
    ctx.fillStyle = isFilm ? '#E09F5A' : '#18181B';
    ctx.font = isFilm ? '700 24px monospace' : '700 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(caption || 'MOMENTOS • 2026', canvas.width / 2, footerY);
  }

  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
  return canvas.toDataURL(mime, format === 'jpg' ? 0.92 : 1);
}

export function captureFlipbookFrameDataUrl(options: {
  videoEl: HTMLVideoElement | null;
  fallbackEmoji: string;
  frameIndex: number;
  totalFrames: number;
  cssFilter: string;
  overlayId: FlipbookEffectOverlayId;
  mirror?: boolean;
  paperColor?: string;
  accentHex?: string;
}): string {
  const {
    videoEl,
    fallbackEmoji,
    frameIndex,
    totalFrames,
    cssFilter,
    overlayId,
    mirror = true,
    paperColor = '#FBF7EF',
    accentHex = '#BC4374',
  } = options;

  const width = 480;
  const height = 360;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Base webcam frame or simulated pose
  if (videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
    ctx.save();
    ctx.filter = cssFilter;
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    const targetRatio = width / height;
    const sourceRatio = vw / vh;
    let sx = 0;
    let sy = 0;
    let sW = vw;
    let sH = vh;
    if (sourceRatio > targetRatio) {
      sW = vh * targetRatio;
      sx = (vw - sW) / 2;
    } else {
      sH = vw / targetRatio;
      sy = (vh - sH) / 2;
    }
    if (mirror) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(videoEl, sx, sy, sW, sH, 0, 0, width, height);
    ctx.restore();
  } else {
    ctx.save();
    ctx.filter = cssFilter;
    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#18181B';
    ctx.font = '700 86px "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const bob = frameIndex % 2 === 0 ? -4 : 4;
    ctx.fillText(fallbackEmoji, width / 2, height / 2 + bob);
    ctx.restore();
  }

  // Interactive Pose Overlay Baked Into Frame
  ctx.save();
  if (overlayId === 'confetti-burst') {
    const items = ['🎊', '✨', '🎉', '🌸', '⭐'];
    ctx.font = '24px sans-serif';
    items.forEach((ic, idx) => {
      const px = 48 + idx * 96;
      const py = 36 + ((frameIndex * 14 + idx * 45) % (height - 72));
      ctx.fillText(ic, px, py);
    });
  } else if (overlayId === 'floating-hearts') {
    ctx.font = '26px sans-serif';
    const lift = (frameIndex * 9) % (height - 60);
    ctx.fillText('💖', 32, height - 30 - lift);
    ctx.fillText('🫶', width - 64, height - 48 - ((lift + 80) % (height - 60)));
  } else if (overlayId === 'disco-sparkles') {
    ctx.fillStyle =
      frameIndex % 2 === 0 ? 'rgba(240, 123, 174, 0.18)' : 'rgba(96, 165, 250, 0.18)';
    ctx.fillRect(0, 0, width, height);
    ctx.font = '22px sans-serif';
    ctx.fillText('✨', 40 + ((frameIndex * 23) % 360), 46);
  } else if (overlayId === 'comic-pop') {
    ctx.fillStyle = '#FBBF24';
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 2;
    drawRoundedRectPath(ctx, width - 108, 16, 88, 32, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#18181B';
    ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      frameIndex < 10 ? 'SNAP!' : frameIndex < 20 ? 'POW!' : 'YAY!',
      width - 64,
      37
    );
    ctx.textAlign = 'left';
  } else if (overlayId === 'film-grain') {
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let y = frameIndex % 4; y < height; y += 6) {
      ctx.fillRect(0, y, width, 1);
    }
  }
  ctx.restore();

  // Registration stamp bottom right
  ctx.fillStyle = accentHex;
  drawRoundedRectPath(ctx, width - 134, height - 36, 118, 24, 12);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    `FRM ${String(frameIndex + 1).padStart(2, '0')}/${totalFrames}`,
    width - 75,
    height - 20
  );

  return canvas.toDataURL('image/png');
}

/**
 * Pure TypeScript GIF89a animated encoder using uniform 3-3-2 palette & variable LZW.
 */
export async function encodeAnimatedGifBlob(
  frameDataUrls: string[],
  delayMs = 100
): Promise<Blob> {
  if (frameDataUrls.length === 0) {
    throw new Error('Belum ada frame flipbook untuk dienkode ke GIF.');
  }

  const firstImg = await loadImage(frameDataUrls[0]);
  const width = firstImg.width || 480;
  const height = firstImg.height || 360;

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

  const delayCs = Math.max(2, Math.round(delayMs / 10));

  for (const url of frameDataUrls) {
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
  }

  out.push(0x3b); // GIF Trailer
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
  const width = firstImg.width || 480;
  const height = firstImg.height || 360;

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
