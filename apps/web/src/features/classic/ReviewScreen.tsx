import type { BoothMode, CapturedFrame, ScreenId } from '@momentos/shared';

interface ReviewScreenProps {
  mode: BoothMode;
  takeCount: number;
  frames: CapturedFrame[];
  onRetakeFrame: (id: number) => void;
  onNavigate: (screen: ScreenId) => void;
}
export function ReviewScreen({ mode, takeCount, frames, onRetakeFrame, onNavigate }: ReviewScreenProps) {
  return <section className="page-stack">
    <h1 className="heading-h1">Periksa hasil foto</h1>
    <div className="grid-2">{frames.slice(0, takeCount).map(frame => <article className="clean-card" key={frame.id}>
      <h2>{frame.label}</h2>
      <div style={{ display: 'flex' }}>{[frame.imageDataUrl, ...(mode === 'duo' ? [frame.guestImageDataUrl] : [])].map((url, i) =>
        url && <img key={i} src={url} style={{ width: mode === 'duo' ? '50%' : '100%' }} alt={frame.label + (mode === 'duo' ? (i ? ' Guest' : ' Host') : '')} />)}</div>
      <p>{3 - frame.retakeCount} dari 3 pengulangan tersisa.</p>
      <button className="btn btn-lift" disabled={frame.retakeCount >= 3} onClick={() => onRetakeFrame(frame.id)}>Buka pose di kamera</button>
    </article>)}</div>
    <button className="btn btn-primary-pop" onClick={() => onNavigate('editor')}>Pakai foto dan buka editor</button>
  </section>;
}
