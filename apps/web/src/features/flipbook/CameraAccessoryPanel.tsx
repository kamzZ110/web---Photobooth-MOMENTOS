import { useEffect, useRef, useState } from 'react';
import { CAMERA_ACCESSORY_IDS, isCameraAccessoryId, type CameraAccessoryId } from '@momentos/shared';
import { drawCameraAccessory, type FaceAnchors, type Point } from '../../lib/cameraAccessories';
import { CameraChoice } from './CameraChoice';
import './cameraAccessories.css';

const ACCESSORIES: Record<CameraAccessoryId, string> = {
  none: 'Tanpa Aksesori',
  'santa-hat': 'Topi Natal',
  'cat-ears': 'Telinga Kucing',
  'star-glasses': 'Kacamata Bintang',
  'clown-nose': 'Hidung Badut',
};

interface AccessoryPickerProps {
  label: string;
  selected: CameraAccessoryId;
  onSelect: (id: CameraAccessoryId) => void;
  disabled?: boolean;
}

export function CameraAccessoryPicker({ label, selected, onSelect, disabled }: AccessoryPickerProps) {
  return (
    <label className="camera-accessory-picker">
      <span>{label}</span>
      <select value={selected} disabled={disabled} onChange={(event) => {
        const { value } = event.currentTarget;
        if (isCameraAccessoryId(value)) onSelect(value);
      }}>
        {CAMERA_ACCESSORY_IDS.map((id) => <option key={id} value={id}>{ACCESSORIES[id]}</option>)}
      </select>
    </label>
  );
}

export function CameraAccessoryRail({ label, selected, onSelect, disabled }: AccessoryPickerProps) {
  return (
    <div className="flipbook-accessory-choices" role="group" aria-label={label}>
      {CAMERA_ACCESSORY_IDS.map((id) => (
        <CameraChoice key={id} label={ACCESSORIES[id]} accessory={id} selected={selected === id}
          disabled={disabled} onSelect={() => onSelect(id)} />
      ))}
    </div>
  );
}

const WIDTH = 480;
const HEIGHT = 280;
const MOVEMENTS = ['Menoleh', 'Miring', 'Mendekat'] as const;

function drawDemo(ctx: CanvasRenderingContext2D, accessory: CameraAccessoryId, movement: number, amount: number, time: number) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#f9eef0';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#f2dce3';
  for (let x = 12; x < WIDTH; x += 16) {
    for (let y = 12; y < HEIGHT; y += 16) ctx.fillRect(x, y, 2, 2);
  }

  const turn = movement === 0 ? amount : 0;
  const tilt = movement === 1 ? 0.28 * amount : 0;
  const scale = movement === 2 ? 1 + 0.24 * amount : 1;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const project = (x: number, y: number): Point => ({
    x: WIDTH / 2 + (x * cos - y * sin) * scale,
    y: 171 + (x * sin + y * cos) * scale,
  });
  const spread = 1 - Math.abs(turn) * 0.19;
  const shift = turn * 12;
  const face: FaceAnchors = {
    eyes: [project(-25 * spread + shift, -4), project(25 * spread + shift, -4)],
    temples: [project(-52 * spread, -10), project(52 * spread, -10)],
    upperTemples: [project(-41 * spread + shift * 0.4, -42), project(41 * spread + shift * 0.4, -42)],
    forehead: project(turn * 7, -51),
    nose: project(turn * 25, 13),
  };

  ctx.save();
  ctx.translate(WIDTH / 2, 171);
  ctx.rotate(tilt);
  ctx.scale(scale, scale);
  const ellipse = (x: number, y: number, rx: number, ry: number, color: string) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };
  ellipse(0, 104, 88, 57, '#705373');
  ellipse(0, -14, 57 * spread, 56, '#352738');
  ellipse(shift * 0.4, 4, 49 * spread, 51, '#d99a72');
  ellipse(-19 * spread, -37, 32 * spread, 14, '#352738');
  ellipse(-25 * spread + shift, -4, 3.5, 5, '#352738');
  ellipse(25 * spread + shift, -4, 3.5, 5, '#352738');
  ellipse(turn * 25, 13, 5, 4, '#bb795f');
  ellipse(shift, 28, 9, 3, '#783c49');
  ctx.restore();
  drawCameraAccessory(ctx, accessory, face, time);
}

export function CameraAccessoryDemo() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [selected, setSelected] = useState<CameraAccessoryId>('santa-hat');
  const [movement, setMovement] = useState(0);
  const [playCount, setPlayCount] = useState(0);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      drawDemo(ctx, selected, movement, 0.8, 0);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const elapsed = Math.min(now - start, 2100);
      const phase = elapsed / 2100 * Math.PI;
      const amount = movement === 2 ? Math.sin(phase) : Math.sin(phase * 2);
      drawDemo(ctx, selected, movement, amount, elapsed);
      if (elapsed < 2100) frame = window.requestAnimationFrame(animate);
    };
    drawDemo(ctx, selected, movement, 0, 0);
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [selected, movement, playCount]);

  return (
    <section className="clean-card camera-accessory-demo" aria-labelledby="camera-accessory-demo-title">
      <div>
        <h2 className="heading-h3" id="camera-accessory-demo-title">Coba Aksesori Kamera</h2>
        <CameraAccessoryPicker label="Pilih aksesori" selected={selected} onSelect={setSelected} />
        <div className="camera-accessory-movements" role="group" aria-label="Gerakan contoh">
          {MOVEMENTS.map((name, index) => (
            <button key={name} type="button" className="btn btn-lift"
              aria-pressed={movement === index} onClick={() => { setMovement(index); setPlayCount((count) => count + 1); }}>
              {name}
            </button>
          ))}
        </div>
      </div>
      <canvas ref={canvas} width={WIDTH} height={HEIGHT} role="img"
        aria-label={`Ilustrasi ${ACCESSORIES[selected]} saat kepala bergerak`} />
    </section>
  );
}
