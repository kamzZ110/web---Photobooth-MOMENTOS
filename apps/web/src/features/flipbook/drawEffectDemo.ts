import type { EffectDemo, EffectDemoId } from './effectDemos';

export const DEMO_WIDTH = 640;
export const DEMO_HEIGHT = 360;
export const DEMO_ANIMATION_MS = 1800;

const INK = '#18181b';
const BERRY = '#c93b6b';
const SKY = '#7ab3ef';
const TAU = Math.PI * 2;

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

function polygon(ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], color: string) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, rays = 4) {
  const points = Array.from({ length: rays * 2 }, (_, index) => {
    const angle = index * Math.PI / rays - Math.PI / 2;
    const radius = index % 2 ? size * 0.34 : size;
    return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius] as const;
  });
  polygon(ctx, points, color);
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0.65);
  ctx.bezierCurveTo(-1.5, -0.3, -0.45, -1.05, 0, -0.42);
  ctx.bezierCurveTo(0.45, -1.05, 1.5, -0.3, 0, 0.65);
  ctx.fill();
  ctx.restore();
}

function burst(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number, colors: string[], isHeart = false) {
  for (let index = 0; index < 13; index += 1) {
    const angle = index * 2.399963;
    const distance = (20 + progress * (65 + (index % 4) * 17));
    const px = x + Math.cos(angle) * distance;
    const py = y + Math.sin(angle) * distance;
    const size = 6 + (index % 4) * 3;
    const color = colors[index % colors.length];
    if (isHeart) heart(ctx, px, py, size * (1 - progress * 0.4), color);
    else star(ctx, px, py, size, color);
  }
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color = INK) {
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function drawHand(ctx: CanvasRenderingContext2D, x: number, y: number, effect: EffectDemoId, skin: string, direction: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction, 1);
  ctx.strokeStyle = skin;
  ctx.lineCap = 'round';
  ctx.lineWidth = 10;
  ctx.beginPath();
  if (effect === 'bunny-peace') {
    ctx.moveTo(-3, 4); ctx.lineTo(-11, -20);
    ctx.moveTo(5, 4); ctx.lineTo(11, -20);
  } else if (effect === 'power-up-duo') {
    ctx.moveTo(0, 4); ctx.lineTo(4, -18);
  } else {
    for (let index = 0; index < 4; index += 1) {
      ctx.moveTo((index - 1.5) * 6, 4);
      ctx.lineTo((index - 1.5) * 9, -15 - (index % 3) * 3);
    }
  }
  ctx.stroke();
  ellipse(ctx, 0, 5, 14, 14, skin);
  ctx.restore();
}

function drawPerson(ctx: CanvasRenderingContext2D, x: number, isRight: boolean, active: boolean, id: EffectDemoId, time: number) {
  const skin = isRight ? '#ad694d' : '#e2a373';
  const direction = isRight ? -1 : 1;
  ctx.save();
  ctx.translate(x, 187);
  if (id === 'nope-shake' && active) ctx.rotate(Math.sin(time * TAU * 2) * 0.16);
  ellipse(ctx, 0, 130, 84, 66, isRight ? '#617a9d' : '#7a5169');
  if (isRight) ellipse(ctx, 37, -58, 26, 25, '#30202c');
  ellipse(ctx, 0, -13, 57, 65, isRight ? '#30202c' : '#342735');
  ellipse(ctx, 0, 7, 46, 50, skin);
  ellipse(ctx, -18, -36, 31, 14, isRight ? '#30202c' : '#342735');
  ellipse(ctx, 18, -2, 3.8, 5.5, INK);
  ellipse(ctx, -18, -2, active && id === 'wink-spark' ? 8 : 3.8, active && id === 'wink-spark' ? 2 : 5.5, INK);
  const mouthOpen = active && (id === 'comic-boom' || (id === 'kiss-relay' && !isRight));
  ellipse(ctx, 0, 23, mouthOpen ? 8 : 10, mouthOpen ? 10 : 3, '#532b40');
  if (active && ['bunny-peace', 'magic-wipe', 'power-up-duo', 'color-trail-wave', 'kiss-relay'].includes(id)) {
    const xHand = direction * (id === 'kiss-relay' ? (isRight ? 85 : 37) : 72);
    const yHand = id === 'color-trail-wave' ? Math.sin(time * TAU * 2) * 34 : 25;
    if (id === 'kiss-relay' && !isRight) ellipse(ctx, xHand, yHand + 15, 15, 9, skin);
    else drawHand(ctx, xHand, yHand, id, skin, direction);
  }
  ctx.restore();
}

function drawAnimation(ctx: CanvasRenderingContext2D, effect: EffectDemo, progress: number) {
  const color = effect.color;
  switch (effect.id) {
    case 'comic-boom':
    case 'nope-shake': {
      const shift = effect.id === 'nope-shake' ? Math.sin(progress * TAU * 3) * 11 : 0;
      const x = 320 + shift;
      burst(ctx, x, 99, progress, [color, '#fff4c6', INK]);
      star(ctx, x, 101, 92, INK, 12);
      star(ctx, x, 101, 83, color, 12);
      ellipse(ctx, x, 101, 68, 35, color);
      label(ctx, effect.id === 'comic-boom' ? 'BOOM!' : 'NOPE!', x, 102, 34);
      break;
    }
    case 'wink-spark': {
      const distance = Math.min(progress * 1.7, 1);
      const x = 302 - distance * 132;
      const y = 185 - distance * 98;
      for (let index = 1; index <= 5; index += 1) {
        star(ctx, x + index * 14, y + index * 10, 15 - index * 2, '#fff1a2');
      }
      star(ctx, x, y, 29, color);
      if (distance === 1) burst(ctx, x, y, progress, [color, '#fff1a2', '#fff']);
      break;
    }
    case 'bunny-peace': {
      ellipse(ctx, 294, 100, 15, 41, '#fff5f8');
      ellipse(ctx, 346, 100, 15, 41, '#fff5f8');
      ellipse(ctx, 294, 99, 7, 28, color);
      ellipse(ctx, 346, 99, 7, 28, color);
      const x = 94 + progress * 447;
      const y = 290 - Math.abs(Math.sin(progress * Math.PI * 3)) * 65;
      ellipse(ctx, x - 12, y - 21, 6, 16, '#fff5f8');
      ellipse(ctx, x + 12, y - 21, 6, 16, '#fff5f8');
      ellipse(ctx, x, y, 22, 20, '#fff5f8');
      ellipse(ctx, x - 7, y - 1, 2.5, 3, INK);
      ellipse(ctx, x + 7, y - 1, 2.5, 3, INK);
      break;
    }
    case 'kiss-relay': {
      const travel = Math.min(progress / 0.67, 1);
      const x = 191 + travel * 201;
      const y = 211 - Math.sin(travel * Math.PI) * 64;
      if (travel < 1) {
        heart(ctx, x - 29, y + 8, 9, '#fff2f5');
        heart(ctx, x, y, 29, BERRY);
      } else {
        heart(ctx, x, y, 36, BERRY);
        burst(ctx, x, y, (progress - 0.67) / 0.33, [BERRY, color, '#fff2f5'], true);
      }
      break;
    }
    case 'magic-wipe': {
      const edge = progress * (DEMO_WIDTH + 160) - 80;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, Math.max(0, edge), DEMO_HEIGHT);
      ctx.clip();
      ctx.fillStyle = '#53409344';
      ctx.fillRect(0, 0, DEMO_WIDTH, DEMO_HEIGHT);
      for (const x of [156, 484]) {
        polygon(ctx, [[x - 42, 128], [x + 6, 53], [x + 35, 128]], '#583986');
        ellipse(ctx, x, 127, 55, 8, '#583986');
        star(ctx, x + 4, 100, 13, '#ffdc75');
      }
      ctx.restore();
      star(ctx, edge, 152, 29, '#fff3b6');
      burst(ctx, edge, 152, progress, [color, '#ffdc75', '#fff']);
      break;
    }
    case 'power-up-duo': {
      for (const x of [156, 484]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(x, 187, 67 + progress * 34, 108 - progress * 9, 0, 0, TAU);
        ctx.stroke();
        const direction = x < 320 ? 1 : -1;
        star(ctx, x + direction * Math.min(progress * 303, 164), 115, 26, '#e7ff9d');
      }
      if (progress > 0.54) {
        star(ctx, 320, 115, 41, '#e7ff9d');
        burst(ctx, 320, 115, progress, [color, '#e7ff9d', '#fff']);
      }
      break;
    }
    case 'color-trail-wave': {
      for (const [origin, direction, stroke] of [[228, 1, BERRY], [412, -1, SKY]] as const) {
        ctx.beginPath();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        const distance = Math.min(progress / 0.65, 1);
        for (let index = 0; index <= 22; index += 1) {
          const point = index / 22 * distance;
          const x = origin + direction * point * 92;
          const y = 212 + Math.sin(point * TAU) * 32 * direction;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      if (progress >= 0.65) burst(ctx, 320, 212, progress, [BERRY, SKY, '#ffdb81', '#fff']);
      break;
    }
  }
}

export interface GestureVisual {
  effect: EffectDemo;
  progress: number;
  anchor?: { x: number; y: number; scale: number };
}

// Paint the same animation over camera pixels, without the illustration backdrop.
export function drawLiveGestureEffect(
  ctx: CanvasRenderingContext2D, visual: GestureVisual | null, width: number, height: number,
) {
  if (!visual) return;
  ctx.save();
  ctx.scale(width / DEMO_WIDTH, height / DEMO_HEIGHT);
  if (visual.anchor && visual.effect.mode === 'solo') {
    const { x, y, scale } = visual.anchor;
    ctx.translate(x * DEMO_WIDTH, y * DEMO_HEIGHT);
    ctx.scale(scale, scale);
    ctx.translate(-320, -194);
  }
  drawAnimation(ctx, visual.effect, visual.progress);
  ctx.restore();
}

export function drawEffectDemo(
  ctx: CanvasRenderingContext2D,
  effect: EffectDemo,
  gestures: readonly [boolean, boolean],
  progress: number | null,
) {
  const duo = effect.mode === 'duo';
  ctx.clearRect(0, 0, DEMO_WIDTH, DEMO_HEIGHT);
  ctx.fillStyle = '#f5ebec';
  ctx.fillRect(0, 0, DEMO_WIDTH, DEMO_HEIGHT);
  if (duo) {
    ctx.fillStyle = '#e9edf8';
    ctx.fillRect(320, 0, 320, DEMO_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.fillRect(319, 0, 2, DEMO_HEIGHT);
  }

  ctx.fillStyle = '#18181b21';
  for (let x = 14; x < DEMO_WIDTH; x += 20) {
    for (let y = 14; y < DEMO_HEIGHT; y += 20) ctx.fillRect(x, y, 2, 2);
  }
  drawPerson(ctx, duo ? 156 : 320, false, gestures[0], effect.id, progress ?? 0);
  if (duo) {
    drawPerson(ctx, 484, true, gestures[1], effect.id, progress ?? 0);
    label(ctx, 'Peserta A', 156, 325, 20, '#fff');
    label(ctx, 'Peserta B', 484, 325, 20, '#fff');
  }
  if (progress !== null) drawAnimation(ctx, effect, progress);
  else if (gestures[0] && effect.id === 'kiss-relay') heart(ctx, 209, 210, 23, BERRY);
  else if (gestures[0] && effect.id === 'magic-wipe') {
    ctx.fillStyle = '#302636';
    ctx.fillRect(0, 0, 319, DEMO_HEIGHT);
    label(ctx, 'Kamera tertutup', 156, 180, 23, '#fff');
  }
}
