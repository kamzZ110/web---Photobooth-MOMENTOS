import React, { useEffect, useRef } from 'react';
import type { SeasonPreset } from '@momentos/shared';

/**
 * Ubah konstanta ini jika ingin mengganti musim secara manual:
 * 'autumn' | 'spring' | 'winter' | 'summer' | 'off' | null (null = otomatis sesuai bulan)
 */
export const SEASON_OVERRIDE: SeasonPreset | null = null;

export function detectDefaultSeason(date = new Date()): SeasonPreset {
  if (SEASON_OVERRIDE) return SEASON_OVERRIDE;
  const month = date.getMonth();
  if (month >= 8 && month <= 10) return 'autumn';
  if (month === 11 || month <= 1) return 'winter';
  if (month >= 2 && month <= 4) return 'spring';
  return 'summer';
}

interface SeasonalAmbientProps {
  season?: SeasonPreset;
  enabled: boolean;
  isNight?: boolean;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
  flutterPhase: number;
  flutterSpeed: number;
  swayPhase: number;
  color: string;
  veinColor: string;
  opacity: number;
  variant: number;
}

interface StarParticle {
  x: number;
  y: number;
  radius: number;
  twinklePhase: number;
  twinkleSpeed: number;
  driftX: number;
  driftY: number;
  color: string;
  isCross: boolean;
}

export const SeasonalAmbient: React.FC<SeasonalAmbientProps> = ({
  season = detectDefaultSeason(),
  enabled,
  isNight = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled || (!isNight && season === 'off')) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // NIGHT MODE: Efek Bintang-Bintang Berkelap-kelip
    if (isNight) {
      const starColors = ['#FFFFFF', '#FFF4B8', '#9BC5F2', '#FFE8F0'];
      const stars: StarParticle[] = Array.from({ length: 90 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 1.2 + Math.random() * 2.4,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.015 + Math.random() * 0.032,
        driftX: (Math.random() - 0.5) * 0.14,
        driftY: -0.06 - Math.random() * 0.14,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        isCross: Math.random() > 0.72,
      }));

      const renderStars = () => {
        ctx.clearRect(0, 0, width, height);
        for (const s of stars) {
          s.twinklePhase += s.twinkleSpeed;
          s.x += s.driftX;
          s.y += s.driftY;

          if (s.y < -12) {
            s.y = height + 10;
            s.x = Math.random() * width;
          }
          if (s.x > width + 12) s.x = -10;
          if (s.x < -12) s.x = width + 10;

          const alpha = 0.25 + 0.75 * Math.abs(Math.sin(s.twinklePhase));

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(s.x, s.y);
          ctx.fillStyle = s.color;
          ctx.shadowColor = s.color;
          ctx.shadowBlur = s.isCross ? 12 : 7;

          if (s.isCross) {
            // Bintang 4-sudut bersinar
            const r = s.radius * 2.8;
            ctx.beginPath();
            ctx.moveTo(0, -r);
            ctx.quadraticCurveTo(0.4, -0.4, r, 0);
            ctx.quadraticCurveTo(0.4, 0.4, 0, r);
            ctx.quadraticCurveTo(-0.4, 0.4, -r, 0);
            ctx.quadraticCurveTo(-0.4, -0.4, 0, -r);
            ctx.closePath();
            ctx.fill();
          } else {
            // Bintang bulat lembut
            ctx.beginPath();
            ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        animationFrameId = window.requestAnimationFrame(renderStars);
      };

      renderStars();

      return () => {
        window.cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
      };
    }

    // DAY MODE: Efek Musiman (Daun Gugur Besar & Nyata)
    const palettes: Record<
      Exclude<SeasonPreset, 'off'>,
      { count: number; colors: Array<{ fill: string; vein: string }> }
    > = {
      autumn: {
        count: 20,
        colors: [
          { fill: '#C84B31', vein: '#7D2818' },
          { fill: '#D97B29', vein: '#8B4513' },
          { fill: '#C93B6B', vein: '#7E1E3F' },
          { fill: '#7A9E7E', vein: '#466349' },
          { fill: '#B8863B', vein: '#6E4C1B' },
        ],
      },
      spring: {
        count: 22,
        colors: [
          { fill: '#F4A9C1', vein: '#C93B6B' },
          { fill: '#FAD4E0', vein: '#D47392' },
          { fill: '#E88CA8', vein: '#A8385B' },
        ],
      },
      winter: {
        count: 30,
        colors: [
          { fill: '#7AB3EF', vein: '#4885C4' },
          { fill: '#9BC5F2', vein: '#5C9CE0' },
        ],
      },
      summer: {
        count: 18,
        colors: [
          { fill: '#F5C451', vein: '#D98E2B' },
          { fill: '#7A9E7E', vein: '#4D6E51' },
          { fill: '#7AB3EF', vein: '#4A83BF' },
        ],
      },
    };

    const activeSeason = season === 'off' ? 'autumn' : season;
    const cfg = palettes[activeSeason];
    const particles: Particle[] = Array.from({ length: cfg.count }, () => {
      const palette = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size:
          activeSeason === 'winter'
            ? 8 + Math.random() * 10
            : activeSeason === 'summer'
            ? 7 + Math.random() * 9
            : 24 + Math.random() * 18,
        speedY:
          activeSeason === 'winter'
            ? 0.65 + Math.random() * 0.85
            : activeSeason === 'summer'
            ? 0.3 + Math.random() * 0.45
            : 0.65 + Math.random() * 0.9,
        speedX: -0.25 + Math.random() * 0.55,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: -0.012 + Math.random() * 0.024,
        flutterPhase: Math.random() * Math.PI * 2,
        flutterSpeed: 0.02 + Math.random() * 0.025,
        swayPhase: Math.random() * Math.PI * 2,
        color: palette.fill,
        veinColor: palette.vein,
        opacity: 0.82 + Math.random() * 0.16,
        variant: Math.random(),
      };
    });

    const drawRealisticLeaf = (p: Particle) => {
      const s = p.size;
      const flutterScale = 0.42 + 0.58 * Math.abs(Math.cos(p.flutterPhase));

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(1, flutterScale);

      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.veinColor;
      ctx.lineWidth = 1.15;
      ctx.lineJoin = 'round';

      if (p.variant > 0.32) {
        ctx.beginPath();
        ctx.moveTo(0, s * 0.95);
        ctx.quadraticCurveTo(s * 0.05, s * 0.55, s * 0.04, s * 0.42);
        ctx.bezierCurveTo(s * 0.42, s * 0.55, s * 0.82, s * 0.32, s * 0.92, s * 0.08);
        ctx.bezierCurveTo(s * 0.68, s * 0.05, s * 0.52, -s * 0.05, s * 0.48, -s * 0.15);
        ctx.bezierCurveTo(s * 0.85, -s * 0.22, s * 0.95, -s * 0.55, s * 0.68, -s * 0.68);
        ctx.bezierCurveTo(s * 0.48, -s * 0.55, s * 0.32, -s * 0.52, s * 0.26, -s * 0.66);
        ctx.bezierCurveTo(s * 0.28, -s * 0.95, s * 0.12, -s * 1.15, 0, -s * 1.22);
        ctx.bezierCurveTo(-s * 0.12, -s * 1.15, -s * 0.28, -s * 0.95, -s * 0.26, -s * 0.66);
        ctx.bezierCurveTo(-s * 0.32, -s * 0.52, -s * 0.48, -s * 0.55, -s * 0.68, -s * 0.68);
        ctx.bezierCurveTo(-s * 0.95, -s * 0.55, -s * 0.85, -s * 0.22, -s * 0.48, -s * 0.15);
        ctx.bezierCurveTo(-s * 0.52, -s * 0.05, -s * 0.68, s * 0.05, -s * 0.92, s * 0.08);
        ctx.bezierCurveTo(-s * 0.82, s * 0.32, -s * 0.42, s * 0.55, -s * 0.04, s * 0.42);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, s * 0.98);
        ctx.lineTo(0, -s * 0.95);
        ctx.moveTo(0, s * 0.15);
        ctx.lineTo(s * 0.65, -s * 0.42);
        ctx.moveTo(0, s * 0.15);
        ctx.lineTo(-s * 0.65, -s * 0.42);
        ctx.moveTo(0, s * 0.32);
        ctx.lineTo(s * 0.58, s * 0.14);
        ctx.moveTo(0, s * 0.32);
        ctx.lineTo(-s * 0.58, s * 0.14);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, s * 0.85);
        ctx.bezierCurveTo(s * 0.72, s * 0.35, s * 0.7, -s * 0.55, 0, -s * 1.05);
        ctx.bezierCurveTo(-s * 0.7, -s * 0.55, -s * 0.72, s * 0.35, 0, s * 0.85);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, s * 0.98);
        ctx.lineTo(0, -s * 0.88);
        ctx.moveTo(0, s * 0.25);
        ctx.lineTo(s * 0.38, -s * 0.05);
        ctx.moveTo(0, s * 0.05);
        ctx.lineTo(-s * 0.35, -s * 0.25);
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawSakuraPetal = (p: Particle) => {
      const s = p.size * 0.75;
      const flutterScale = 0.45 + 0.55 * Math.abs(Math.cos(p.flutterPhase));
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(1, flutterScale);

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.85);
      ctx.bezierCurveTo(s * 0.85, s * 0.3, s * 0.75, -s * 0.7, s * 0.18, -s * 0.9);
      ctx.lineTo(0, -s * 0.65);
      ctx.lineTo(-s * 0.18, -s * 0.9);
      ctx.bezierCurveTo(-s * 0.75, -s * 0.7, -s * 0.85, s * 0.3, 0, s * 0.85);
      ctx.fill();
      ctx.restore();
    };

    const drawVisibleSnowflake = (p: Particle) => {
      const r = p.size;
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(-r * 0.8, 0);
        ctx.lineTo(r * 0.8, 0);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawSummerMote = (p: Particle) => {
      ctx.save();
      ctx.globalAlpha = p.opacity * 0.65;
      ctx.translate(p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.swayPhase += 0.014;
        p.flutterPhase += p.flutterSpeed;
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.swayPhase) * 0.6;
        p.rotation += p.rotationSpeed;

        if (p.y > height + 48) {
          p.y = -44;
          p.x = Math.random() * width;
        }
        if (p.x > width + 48) p.x = -44;
        if (p.x < -48) p.x = width + 44;

        if (activeSeason === 'autumn') drawRealisticLeaf(p);
        else if (activeSeason === 'spring') drawSakuraPetal(p);
        else if (activeSeason === 'winter') drawVisibleSnowflake(p);
        else drawSummerMote(p);
      }
      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [season, enabled, isNight]);

  if (!enabled || (!isNight && season === 'off')) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
};
