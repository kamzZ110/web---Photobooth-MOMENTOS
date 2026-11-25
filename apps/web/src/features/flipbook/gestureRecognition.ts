import type { Point } from '../../lib/cameraAccessories';
import type { EffectDemoId } from './effectDemos';

export type GestureKind = 'mouth-open' | 'wink' | 'peace' | 'shake' | 'kiss' |
  'palm' | 'cover' | 'wipe' | 'thumbs-up' | 'wave';

export interface GesturePlan {
  first: GestureKind;
  second?: GestureKind;
  combine: 'single' | 'either' | 'both' | 'sequence';
}

export function gesturePlan(id: EffectDemoId, duo: boolean): GesturePlan {
  switch (id) {
    case 'comic-boom': return { first: 'mouth-open', combine: duo ? 'either' : 'single' };
    case 'wink-spark': return { first: 'wink', combine: duo ? 'either' : 'single' };
    case 'bunny-peace': return { first: 'peace', combine: duo ? 'either' : 'single' };
    case 'nope-shake': return { first: 'shake', combine: duo ? 'either' : 'single' };
    case 'kiss-relay': return duo ? { first: 'kiss', second: 'palm', combine: 'sequence' } : { first: 'kiss', combine: 'single' };
    case 'magic-wipe': return duo ? { first: 'cover', second: 'wave', combine: 'sequence' } : { first: 'wipe', combine: 'single' };
    case 'power-up-duo': return duo ? { first: 'thumbs-up', second: 'thumbs-up', combine: 'both' } : { first: 'thumbs-up', combine: 'single' };
    case 'color-trail-wave': return duo ? { first: 'wave', second: 'wave', combine: 'both' } : { first: 'wave', combine: 'single' };
  }
}

export function needsHands(kind: GestureKind | undefined) {
  return kind !== undefined && ['peace', 'palm', 'cover', 'wipe', 'thumbs-up', 'wave'].includes(kind);
}

interface FaceEvidence {
  points: readonly Point[];
  scores?: readonly { categoryName: string; score: number }[];
  aspect: number;
}

interface HandEvidence {
  points: readonly (readonly Point[])[];
  aspect: number;
}

export interface GestureEvidence {
  face?: FaceEvidence;
  hands?: HandEvidence;
}

function distance(a: Point | undefined, b: Point | undefined, aspect: number) {
  return a && b ? Math.hypot((a.x - b.x) * aspect, a.y - b.y) : 0;
}

function eyeRatio(points: readonly Point[], outer: number, inner: number, upper: number, lower: number, aspect: number) {
  const width = distance(points[outer], points[inner], aspect);
  return width > 0 ? distance(points[upper], points[lower], aspect) / width : 0;
}

function extended(points: readonly Point[], finger: number, aspect: number) {
  // Index through little finger: the tip should be farther from the knuckle than the middle joint.
  const base = 5 + finger * 4;
  const segment = distance(points[base], points[base + 1], aspect);
  return segment > 0 && distance(points[base], points[base + 3], aspect) > segment * 1.55 &&
    distance(points[0], points[base + 3], aspect) > distance(points[0], points[base + 1], aspect) * 1.12;
}

function fingers(points: readonly Point[], aspect: number) {
  return [0, 1, 2, 3].map(finger => extended(points, finger, aspect));
}

export class GestureDetector {
  private side = 0;
  private sideAt = -Infinity;
  private waveX: number | null = null;
  private waveAt = -Infinity;
  private coveredAt = -Infinity;
  private motionUntil = -Infinity;

  matches(kind: GestureKind, evidence: GestureEvidence, now: number): boolean {
    const face = evidence.face;
    const points = face?.points ?? [];
    const aspect = face?.aspect ?? 1;
    const score = (name: string) => face?.scores?.find(item => item.categoryName === name)?.score ?? 0;

    switch (kind) {
      case 'mouth-open': {
        const width = distance(points[61], points[291], aspect);
        return score('jawOpen') > 0.48 || (width > 0 && distance(points[13], points[14], aspect) / width > 0.34);
      }
      case 'wink': {
        const left = eyeRatio(points, 33, 133, 159, 145, aspect);
        const right = eyeRatio(points, 362, 263, 386, 374, aspect);
        const blinkLeft = score('eyeBlinkLeft');
        const blinkRight = score('eyeBlinkRight');
        return (blinkLeft > 0.60 && blinkRight < 0.32) || (blinkRight > 0.60 && blinkLeft < 0.32) ||
          (left < 0.11 && right > 0.22) || (right < 0.11 && left > 0.22);
      }
      case 'kiss':
        return score('mouthPucker') > 0.48 || score('mouthFunnel') > 0.60;
      case 'shake': {
        const nose = points[1];
        const left = points[234];
        const right = points[454];
        if (!nose || !left || !right) {
          this.side = 0;
          return false;
        }
        // Relative nose displacement distinguishes turning the head from moving the whole frame.
        const width = Math.abs(right.x - left.x);
        const yaw = width ? (nose.x - (right.x + left.x) / 2) / width : 0;
        const side = yaw > 0.075 ? 1 : yaw < -0.075 ? -1 : 0;
        if (side && side !== this.side) {
          if (this.side && now - this.sideAt < 1300) this.motionUntil = now + 240;
          this.side = side;
          this.sideAt = now;
        }
        return now < this.motionUntil;
      }
    }

    if (!evidence.hands) return false;
    const hands = evidence.hands.points;
    const handAspect = evidence.hands.aspect;
    const palm = hands.find(hand => fingers(hand, handAspect).every(Boolean));
    const near = hands.some(hand => distance(hand[0], hand[9], handAspect) > 0.30);
    switch (kind) {
      case 'peace':
        return hands.some(hand => {
          const [index, middle, ring, little] = fingers(hand, handAspect);
          return index && middle && !ring && !little;
        });
      case 'palm':
        return !!palm;
      case 'thumbs-up':
        return hands.some(hand => {
          if (!hand[4] || !hand[3] || !hand[2] || !hand[5]) return false;
          return !fingers(hand, handAspect).some(Boolean) && hand[4].y < hand[5].y &&
            distance(hand[4], hand[2], handAspect) > distance(hand[3], hand[2], handAspect) * 1.55;
        });
      case 'cover':
        return near;
      case 'wipe':
        if (near) this.coveredAt = now;
        else if (now - this.coveredAt < 1500) {
          this.motionUntil = now + 240;
          this.coveredAt = -Infinity;
        }
        return now < this.motionUntil;
      case 'wave':
        if (!palm || !palm[9]) {
          this.waveX = null;
          return false;
        }
        if (this.waveX === null || now - this.waveAt > 750) {
          this.waveX = palm[9].x;
          this.waveAt = now;
        } else if (Math.abs(palm[9].x - this.waveX) > 0.10) {
          this.motionUntil = now + 240;
          this.waveX = palm[9].x;
          this.waveAt = now;
        }
        return now < this.motionUntil;
    }
  }
}
