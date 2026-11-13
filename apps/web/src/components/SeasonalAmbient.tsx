import React, { useEffect, useRef } from 'react';
import type { SeasonPreset } from '@momentos/shared';

/**
 * Ubah konstanta ini jika ingin mengganti musim secara manual tanpa menunggu pergantian bulan:
 * Contoh: 'autumn' | 'spring' | 'winter' | 'summer' | 'off' | null (null = otomatis sesuai bulan)
 */
export const SEASON_OVERRIDE: SeasonPreset | null = null;

/**
 * Deteksi musim otomatis berdasarkan bulan saat ini (bulan 0-indexed: 0 = Jan, 10 = Nov).
 */
export function detectDefaultSeason(date = new Date()): SeasonPreset {
  if (SEASON_OVERRIDE) return SEASON_OVERRIDE;
  const month = date.getMonth();
  if (month >= 8 && month <= 10) return 'autumn'; // Sep - Nov (Gugur)
  if (month === 11 || month <= 1) return 'winter'; // Des - Feb (Salju)
  if (month >= 2 && month <= 4) return 'spring'; // Mar - Mei (Semi)
  return 'summer'; // Jun - Agu (Kemarau / Panas)
}

interface SeasonalAmbientProps {
  season?: SeasonPreset;
  enabled: boolean;
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

/**
 * SeasonalAmbient — Efek musiman realistis (hanya aktif di Beranda, pointer-events: none,
 * dan otomatis berhenti untuk pengguna dengan prefers-reduced-motion).
 */
export const SeasonalAmbient: React.FC<SeasonalAmbientProps> = ({
  season = detectDefaultSeason(),
  enabled,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled || season === 'off') return;

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

    const palettes: Record<
      Exclude<SeasonPreset, 'off'>,
      { count: number; colors: Array<{ fill: string; vein: string }> }
    > = {
      autumn: {
        count: 22,
        colors: [
          { fill: '#C84B31', vein: '#7D2818' }, // Maple merah bata
          { fill: '#D97B29', vein: '#8B4513' }, // Amber oranye
          { fill: '#C93B6B', vein: '#7E1E3F' }, // Berry crimson
          { fill: '#7A9E7E', vein: '#466349' }, // Sage hijau tua
          { fill: '#B8863B', vein: '#6E4C1B' }, // Ochre emas
        ],
      },
      spring: {
        count: 24,
        colors: [
          { fill: '#F4A9C1', vein: '#C93B6B' },
          { fill: '#FAD4E0', vein: '#D47392' },
          { fill: '#E88CA8', vein: '#A8385B' },
        ],
      },
      winter: {
        count: 34,
        colors: [
          { fill: '#FFFFFF', vein: '#5C9CE0' },
          { fill: '#F0F7FF', vein: '#7AB3EF' },
        ],
      },
      summer: {
        count: 20,
        colors: [
          { fill: '#F5C451', vein: '#D98E2B' },
          { fill: '#7A9E7E', vein: '#4D6E51' },
          { fill: '#7AB3EF', vein: '#4A83BF' },
        ],
      },
    };

    const cfg = palettes[season];
    const particles: Particle[] = Array.from({ length: cfg.count }, () => {
      const palette = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size:
          season === 'winter'
            ? 5 + Math.random() * 8
            : season === 'summer'
            ? 4 + Math.random() * 6
            : 13 + Math.random() * 11,
        speedY:
          season === 'winter'
            ? 0.65 + Math.random() * 0.9
            : season === 'summer'
            ? 0.25 + Math.random() * 0.45
            : 0.7 + Math.random() * 0.95,
        speedX: -0.25 + Math.random() * 0.6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: -0.014 + Math.random() * 0.028,
        flutterPhase: Math.random() * Math.PI * 2,
        flutterSpeed: 0.025 + Math.random() * 0.03,
        swayPhase: Math.random() * Math.PI * 2,
        color: palette.fill,
        veinColor: palette.vein,
        opacity: season === 'winter' ? 0.88 + Math.random() * 0.12 : 0.78 + Math.random() * 0.2,
        variant: Math.random(),
      };
    });

    const drawRealisticLeaf = (p: Particle) => {
      const s = p.size;
      const flutterScale = 0.35 + 0.65 * Math.abs(Math.cos(p.flutterPhase));

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(1, flutterScale);

      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.veinColor;
      ctx.lineWidth = 0.9;
      ctx.lineJoin = 'round';

      if (p.variant > 0.35) {
        // Daun Maple organik dengan lengkungan Bezier (bukan bintang kaku)
        ctx.beginPath();
        ctx.moveTo(0, s * 0.95);
        ctx.quadraticCurveTo(s * 0.05, s * 0.55, s * 0.04, s * 0.42);
        // Lobus kanan bawah
        ctx.bezierCurveTo(s * 0.42, s * 0.55, s * 0.82, s * 0.32, s * 0.92, s * 0.08);
        ctx.bezierCurveTo(s * 0.68, s * 0.05, s * 0.52, -s * 0.05, s * 0.48, -s * 0.15);
        // Lobus kanan tengah
        ctx.bezierCurveTo(s * 0.85, -s * 0.22, s * 0.95, -s * 0.55, s * 0.68, -s * 0.68);
        ctx.bezierCurveTo(s * 0.48, -s * 0.55, s * 0.32, -s * 0.52, s * 0.26, -s * 0.66);
        // Puncak tengah
        ctx.bezierCurveTo(s * 0.28, -s * 0.95, s * 0.12, -s * 1.15, 0, -s * 1.22);
        ctx.bezierCurveTo(-s * 0.12, -s * 1.15, -s * 0.28, -s * 0.95, -s * 0.26, -s * 0.66);
        // Lobus kiri tengah
        ctx.bezierCurveTo(-s * 0.32, -s * 0.52, -s * 0.48, -s * 0.55, -s * 0.68, -s * 0.68);
        ctx.bezierCurveTo(-s * 0.95, -s * 0.55, -s * 0.85, -s * 0.22, -s * 0.48, -s * 0.15);
        // Lobus kiri bawah
        ctx.bezierCurveTo(-s * 0.52, -s * 0.05, -s * 0.68, s * 0.05, -s * 0.92, s * 0.08);
        ctx.bezierCurveTo(-s * 0.82, s * 0.32, -s * 0.42, s * 0.55, -s * 0.04, s * 0.42);
        ctx.closePath();
        ctx.fill();

        // Tangkai & urat daun halus
        ctx.beginPath();
        ctx.moveTo(0, s * 0.95);
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
        // Daun oval / birch organik
        ctx.beginPath();
        ctx.moveTo(0, s * 0.85);
        ctx.bezierCurveTo(s * 0.72, s * 0.35, s * 0.7, -s * 0.55, 0, -s * 1.05);
        ctx.bezierCurveTo(-s * 0.7, -s * 0.55, -s * 0.72, s * 0.35, 0, s * 0.85);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, s * 0.95);
        ctx.lineTo(0, -s * 0.88);
        ctx.moveTo(0, s * 0.25);
        ctx.lineTo(s * 0.35, -s * 0.05);
        ctx.moveTo(0, s * 0.05);
        ctx.lineTo(-s * 0.32, -s * 0.25);
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawSakuraPetal = (p: Particle) => {
      const s = p.size * 0.72;
      const flutterScale = 0.4 + 0.6 * Math.abs(Math.cos(p.flutterPhase));
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

      // Soft halo biru langit agar putih salju sangat terlihat di atas cream gelap
      ctx.shadowColor = 'rgba(92, 156, 224, 0.55)';
      ctx.shadowBlur = 8;

      // Inti salju putih bersih
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2);
      ctx.fill();

      // Kristal 6 cabang tipis untuk butiran lebih besar
      if (r > 7.5) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 3; i++) {
          ctx.rotate(Math.PI / 3);
          ctx.beginPath();
          ctx.moveTo(-r * 0.85, 0);
          ctx.lineTo(r * 0.85, 0);
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    const drawSummerMote = (p: Particle) => {
      ctx.save();
      ctx.globalAlpha = p.opacity * 0.65;
      ctx.translate(p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.swayPhase += 0.016;
        p.flutterPhase += p.flutterSpeed;
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.swayPhase) * 0.55;
        p.rotation += p.rotationSpeed;

        if (p.y > height + 30) {
          p.y = -28;
          p.x = Math.random() * width;
        }
        if (p.x > width + 30) p.x = -28;
        if (p.x < -30) p.x = width + 28;

        if (season === 'autumn') drawRealisticLeaf(p);
        else if (season === 'spring') drawSakuraPetal(p);
        else if (season === 'winter') drawVisibleSnowflake(p);
        else drawSummerMote(p);
      }
      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [season, enabled]);

  if (!enabled || season === 'off') return null;

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
