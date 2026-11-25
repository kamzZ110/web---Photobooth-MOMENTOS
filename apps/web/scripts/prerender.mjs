import { build, loadEnv } from 'vite';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const env = loadEnv('production', process.cwd());
const origin = env.VITE_SITE_URL ? new URL(env.VITE_SITE_URL).origin : '';
if (origin && !origin.startsWith('https://')) throw new Error('VITE_SITE_URL harus berupa origin HTTPS produksi.');
const temp = await mkdtemp(path.resolve('.prerender-'));
try {
  await build({ logLevel: 'warn', publicDir: false, build: {
    ssr: 'scripts/render.tsx', outDir: temp, rollupOptions: { output: { entryFileNames: 'render.mjs' } },
  } });
  const { renderPage, publicPages } = await import(pathToFileURL(path.join(temp, 'render.mjs')).href);
  const shell = await readFile('dist/index.html', 'utf8');
  for (const [screen, page] of Object.entries({ ...publicPages, room: { path: '/booth/' } })) {
    const { head, body } = renderPage(screen, origin);
    const html = shell.replace(/<title>[\s\S]*?<\/title>/, () => head)
      .replace('<div id="root"></div>', () => '<div id="root">' + body + '</div>');
    const dir = path.join('dist', page.path);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), html);
  }
  const rules = ['User-agent: *', 'Disallow: /*?*room=', 'Disallow: /api/'];
  if (origin) {
    const urls = Object.values(publicPages).map(page => '<url><loc>' + origin + page.path + '</loc></url>');
    await writeFile('dist/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.join('') + '</urlset>');
    rules.push('Sitemap: ' + origin + '/sitemap.xml');
  }
  await writeFile('dist/robots.txt', rules.join('\n') + '\n');
} finally {
  await rm(temp, { recursive: true, force: true });
}
