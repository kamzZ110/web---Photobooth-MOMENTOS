import { renderToStaticMarkup } from 'react-dom/server';
import { App } from '../src/app/App';
import { publicPages, type PublicScreen } from '../src/app/publicPages';
import samplePhoto from '@assets/Gemini_Generated_Image_1w8io41w8io41w8i.jpg';

export { publicPages };
export function renderPage(screen: PublicScreen | 'room', origin: string) {
  const page = screen === 'room' ? null : publicPages[screen];
  const title = page?.title ?? 'Studio Foto | MOMENTOS';
  const description = page?.description ?? 'Sesi studio photobooth pribadi.';
  const url = page && origin ? new URL(page.path, origin).href : null;
  const head = renderToStaticMarkup(<>
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta name="robots" content={page ? 'index,follow' : 'noindex,nofollow'} />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="id_ID" />
    <meta property="og:site_name" content="MOMENTOS" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    {url && <link rel="canonical" href={url} />}
    {url && <meta property="og:url" content={url} />}
    {origin && page && <meta property="og:image" content={new URL(samplePhoto, origin).href} />}
    <meta name="twitter:card" content="summary_large_image" />
  </>);
  const body = page ? renderToStaticMarkup(<App initialScreen={screen} />) : '';
  return { head, body };
}
