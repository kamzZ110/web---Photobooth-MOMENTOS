import { useEffect, useRef, useState } from 'react';
import { DEMO_ANIMATION_MS, DEMO_HEIGHT, DEMO_WIDTH, drawEffectDemo } from './drawEffectDemo';
import { EFFECT_DEMOS, type EffectDemo, type EffectDemoId } from './effectDemos';
import './effectDemos.css';

interface EffectDemoPickerProps {
  selected: EffectDemo;
  onSelect: (id: EffectDemoId) => void;
}

export function EffectDemoPicker({ selected, onSelect }: EffectDemoPickerProps) {
  const effects = EFFECT_DEMOS.filter((effect) => effect.mode === selected.mode);

  return (
    <div className="effect-demo-picker">
      <div className="effect-demo-modes" role="group" aria-label="Kategori efek visual">
        {(['solo', 'duo'] as const).map((mode) => {
          const first = EFFECT_DEMOS.find((effect) => effect.mode === mode);
          return (
            <button key={mode} type="button" className="btn" aria-pressed={selected.mode === mode}
              onClick={() => { if (first && selected.mode !== mode) onSelect(first.id); }}>
              {mode === 'solo' ? 'Solo' : 'Duo'}
            </button>
          );
        })}
      </div>
      <div className="effect-demo-options" role="group" aria-label="Efek yang dapat didemokan">
        {effects.map((effect) => (
          <button type="button" key={effect.id} aria-pressed={effect.id === selected.id}
            onClick={() => onSelect(effect.id)}>
            <span className="effect-demo-swatch" style={{ background: effect.color }} aria-hidden="true" />
            {effect.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GestureDemo({ effect }: { effect: EffectDemo }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [gestures, setGestures] = useState<readonly [boolean, boolean]>([false, false]);
  const [finished, setFinished] = useState(false);
  const duo = effect.mode === 'duo';
  const ready = gestures[0] && (!duo || gestures[1]);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;

    if (!ready) {
      drawEffectDemo(ctx, effect, gestures, null);
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let frameId = 0;
    const draw = (now: number) => {
      const progress = reducedMotion ? 1 : Math.min((now - start) / DEMO_ANIMATION_MS, 1);
      drawEffectDemo(ctx, effect, gestures, progress);
      if (progress < 1) frameId = window.requestAnimationFrame(draw);
      else setFinished(true);
    };
    frameId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frameId);
  }, [effect, gestures, ready]);

  const activate = (index: number) => {
    setGestures(([first, second]) => index === 0 ? [true, second] : [first, true]);
  };

  const restart = () => {
    setFinished(false);
    setGestures([false, false]);
  };

  let status = duo ? 'Simulasikan gestur kedua peserta.' : 'Tekan tombol untuk mensimulasikan gestur.';
  if (finished) status = effect.result;
  else if (ready) status = 'Efek sedang diputar.';
  else if (gestures[0]) status = 'Gestur A terbaca. Menunggu peserta B.';
  else if (gestures[1]) status = 'Gestur B terbaca. Menunggu peserta A.';

  return (
    <div className="effect-demo-stage">
      <canvas ref={canvas} width={DEMO_WIDTH} height={DEMO_HEIGHT} role="img"
        aria-label={`Ilustrasi ${effect.name}. ${effect.result}`} />
      <div className="effect-demo-gestures" data-duo={duo}>
        {effect.gestures.map((gesture, index) => (
          <button type="button" key={index} className="btn" onClick={() => activate(index)}
            disabled={gestures[index] || Boolean(effect.sequential && index === 1 && !gestures[0])}
            data-detected={gestures[index]}>
            {duo && <span>{index === 0 ? 'Peserta A' : 'Peserta B'}{gestures[index] ? ' ✓' : ''}</span>}
            {gesture}
          </button>
        ))}
      </div>
      <div className="effect-demo-status">
        <p className="text-muted" role="status">{status}</p>
        {(gestures[0] || gestures[1]) && <button type="button" className="btn" onClick={restart}>Ulangi demo</button>}
      </div>
    </div>
  );
}

export function EffectDemoPanel({ selected, onSelect }: EffectDemoPickerProps) {
  return (
    <section className="clean-card effect-demo-panel" aria-labelledby="effect-demo-heading">
      <div className="effect-demo-controls">
        <h2 className="heading-h3" id="effect-demo-heading">Coba efek gestur</h2>
        <EffectDemoPicker selected={selected} onSelect={onSelect} />
      </div>
      <GestureDemo key={selected.id} effect={selected} />
    </section>
  );
}
