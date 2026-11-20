import type { BoothMode, CameraAccessoryId } from '@momentos/shared';

export interface Point { x: number; y: number }
export interface FaceAnchors {
  eyes: readonly [Point, Point];
  temples: readonly [Point, Point];
  upperTemples: readonly [Point, Point];
  forehead: Point;
  nose: Point;
}

export interface CameraBox { x: number; y: number; width: number; height: number }

export function flipbookCameraBoxes(width: number, height: number, mode: BoothMode, localOnRight: boolean) {
  if (mode === 'solo') return { local: { x: 0, y: 0, width, height }, remote: null };
  const half = width / 2;
  const left = { x: 0, y: 0, width: half, height };
  const right = { ...left, x: half };
  return localOnRight ? { local: right, remote: left } : { local: left, remote: right };
}

export function hasCameraFrame(video: HTMLVideoElement | null): video is HTMLVideoElement {
  return !!video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0;
}

export function cameraCoverCrop(sourceWidth: number, sourceHeight: number, box: CameraBox) {
  const scale = Math.max(box.width / sourceWidth, box.height / sourceHeight);
  const width = box.width / scale;
  const height = box.height / scale;
  return { x: (sourceWidth - width) / 2, y: (sourceHeight - height) / 2, width, height };
}

export function faceAnchorsFromLandmarks(points: readonly Point[]): FaceAnchors | null {
  const landmarks = [33, 133, 362, 263, 234, 454, 103, 332, 10, 1].map((index) => points[index]);
  if (!landmarks.every((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y))) return null;
  const [outerLeft, innerLeft, innerRight, outerRight, leftTemple, rightTemple, upperLeft, upperRight, forehead, nose] = landmarks;

  return {
    eyes: [midpoint(outerLeft, innerLeft), midpoint(innerRight, outerRight)],
    temples: [leftTemple, rightTemple],
    upperTemples: [upperLeft, upperRight],
    forehead,
    nose,
  };
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function drawCameraAccessory(
  ctx: CanvasRenderingContext2D, id: CameraAccessoryId, face: FaceAnchors, timeMs: number,
) {
  if (id === 'none') return;
  const [leftEye, rightEye] = face.eyes;
  const eyeDistance = distance(leftEye, rightEye);
  const faceWidth = distance(...face.temples);
  if (eyeDistance < 3 || faceWidth < 5) return;
  const tilt = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
  const eyeCenter = midpoint(leftEye, rightEye);
  if (id === 'cat-ears') {
    // Each ear has its own anchor, so it follows the nearer/farther side during a turn.
    drawAtAnchor(ctx, face.upperTemples[0], tilt, faceWidth / 110, () => drawCatEar(ctx, -1));
    drawAtAnchor(ctx, face.upperTemples[1], tilt, faceWidth / 110, () => drawCatEar(ctx, 1));
    return;
  }
  const anchor = id === 'clown-nose' ? face.nose : id === 'star-glasses' ? eyeCenter : face.forehead;
  const scale = id === 'star-glasses' ? eyeDistance / 54 : faceWidth / 110;

  drawAtAnchor(ctx, anchor, tilt, scale, () => {
    switch (id) {
      case 'santa-hat': drawSantaHat(ctx, timeMs); break;
      case 'star-glasses': drawStarGlasses(ctx); break;
      case 'clown-nose': drawClownNose(ctx); break;
    }
  });
}

function drawAtAnchor(ctx: CanvasRenderingContext2D, anchor: Point, tilt: number, scale: number, draw: () => void) {
  ctx.save();
  ctx.translate(anchor.x, anchor.y);
  ctx.rotate(tilt);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw();
  ctx.restore();
}

export function drawTrackedCameraAccessory(
  ctx: CanvasRenderingContext2D, id: CameraAccessoryId, face: FaceAnchors | null,
  sourceWidth: number, sourceHeight: number, box: CameraBox, mirror: boolean, timeMs: number,
) {
  if (id === 'none' || !face || !sourceWidth || !sourceHeight) return;
  const crop = cameraCoverCrop(sourceWidth, sourceHeight, box);
  const project = (point: Point): Point => ({
    x: (point.x * sourceWidth - crop.x) / crop.width * box.width,
    y: (point.y * sourceHeight - crop.y) / crop.height * box.height,
  });
  const nose = project(face.nose);
  if (nose.x < 0 || nose.x > box.width || nose.y < 0 || nose.y > box.height) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
  ctx.translate(box.x + (mirror ? box.width : 0), box.y);
  if (mirror) ctx.scale(-1, 1);
  drawCameraAccessory(ctx, id, {
    eyes: [project(face.eyes[0]), project(face.eyes[1])],
    temples: [project(face.temples[0]), project(face.temples[1])],
    upperTemples: [project(face.upperTemples[0]), project(face.upperTemples[1])],
    forehead: project(face.forehead),
    nose,
  }, timeMs);
  ctx.restore();
}

function drawSantaHat(ctx: CanvasRenderingContext2D, timeMs: number) {
  const sway = Math.sin(timeMs / 230) * 3;
  ctx.beginPath();
  ctx.moveTo(-57, 4);
  ctx.bezierCurveTo(-43, -24, -29, -66, 6, -73);
  ctx.bezierCurveTo(31, -79, 51, -57, 61, -36 + sway);
  ctx.bezierCurveTo(47, -39 + sway, 40, -38, 34, -32);
  ctx.lineTo(49, -1);
  ctx.closePath();
  ctx.fillStyle = '#c52f4c';
  ctx.fill();
  ctx.strokeStyle = '#781e37';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-39, -19);
  ctx.bezierCurveTo(-29, -43, -17, -58, 0, -63);
  ctx.strokeStyle = '#f86a79';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-3, 1, 58, 12, -0.055, 0, Math.PI * 2);
  ctx.fillStyle = '#fff9f2';
  ctx.fill();
  ctx.strokeStyle = '#e2c9cb';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(61, -34 + sway, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawCatEar(ctx: CanvasRenderingContext2D, side: -1 | 1) {
  ctx.scale(side, 1);
  ctx.beginPath();
  ctx.moveTo(-19, 0);
  ctx.quadraticCurveTo(-2, -42, 17, -47);
  ctx.quadraticCurveTo(27, -32, 20, 10);
  ctx.closePath();
  ctx.fillStyle = '#392937';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-5, -2);
  ctx.quadraticCurveTo(4, -26, 14, -33);
  ctx.quadraticCurveTo(19, -21, 15, 1);
  ctx.closePath();
  ctx.fillStyle = '#f2a4be';
  ctx.fill();
}

function drawStarGlasses(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(-13, 0);
  ctx.quadraticCurveTo(0, -6, 13, 0);
  ctx.strokeStyle = '#3e2850';
  ctx.lineWidth = 4;
  ctx.stroke();
  for (const center of [-27, 27]) {
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = i * Math.PI / 5 - Math.PI / 2;
      const radius = i % 2 === 0 ? 24 : 13.5;
      const x = center + Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#3e2850';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#f9d27337';
    ctx.fill();
    ctx.strokeStyle = '#ffd36c';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawClownNose(ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createRadialGradient(-5, -7, 1, 1, 1, 16);
  gradient.addColorStop(0, '#ff9a9f');
  gradient.addColorStop(0.52, '#e83855');
  gradient.addColorStop(1, '#a31538');
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 11, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
}
