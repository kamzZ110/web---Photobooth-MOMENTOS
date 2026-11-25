import { useEffect, useRef } from 'react';
import { FLIPBOOK_CAPTURE_FRAME_COUNT, type CameraAccessoryId, type FlipbookEffectOverlayId } from '@momentos/shared';
import samplePhotoUrl from '@assets/Gemini_Generated_Image_1w8io41w8io41w8i.jpg';
import { drawCameraAccessory } from '../../lib/cameraAccessories';
import { drawFlipbookRecordingOverlay } from '../../lib/mediaEngine';

const SIZE = 144;
let samplePhoto: Promise<HTMLImageElement> | undefined;

function loadSamplePhoto() {
  if (!samplePhoto) {
    const photo = new Image();
    photo.src = samplePhotoUrl;
    samplePhoto = photo.decode().then(() => photo);
  }
  return samplePhoto;
}

interface CameraChoiceProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  cssFilter?: string;
  accessory?: CameraAccessoryId;
  overlay?: FlipbookEffectOverlayId;
  disabled?: boolean;
  description?: string;
}

export function CameraChoice({ label, selected, onSelect, cssFilter, accessory, overlay, disabled, description }: CameraChoiceProps) {
  const thumbnail = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = thumbnail.current?.getContext('2d');
    if (!ctx) return;
    let active = true;

    void loadSamplePhoto().then((photo) => {
      if (!active) return;
      // Crop the existing studio sample to its first portrait on the right.
      const x = photo.naturalWidth * 0.615;
      const y = photo.naturalHeight * 0.06;
      const cropSize = photo.naturalWidth * 0.29;
      const point = (u: number, v: number) => ({
        x: (u * photo.naturalWidth - x) / cropSize * SIZE,
        y: (v * photo.naturalHeight - y) / cropSize * SIZE,
      });

      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.filter = cssFilter ?? 'none';
      ctx.drawImage(photo, x, y, cropSize, cropSize, 0, 0, SIZE, SIZE);
      ctx.filter = 'none';
      if (accessory) {
        drawCameraAccessory(ctx, accessory, {
          eyes: [point(0.735, 0.137), point(0.801, 0.148)],
          temples: [point(0.684, 0.145), point(0.845, 0.169)],
          upperTemples: [point(0.704, 0.113), point(0.829, 0.128)],
          forehead: point(0.766, 0.112),
          nose: point(0.762, 0.169),
        }, 0);
      }
      if (overlay) drawFlipbookRecordingOverlay(ctx, overlay, 3, FLIPBOOK_CAPTURE_FRAME_COUNT, SIZE, SIZE);
    }).catch(() => {
      // The text label remains usable when the sample cannot be loaded.
    });

    return () => { active = false; };
  }, [cssFilter, accessory, overlay]);

  return (
    <button type="button" className="flipbook-camera-choice" aria-pressed={selected}
      disabled={disabled} title={description ?? label} onClick={onSelect}>
      <canvas ref={thumbnail} width={SIZE} height={SIZE} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
