#!/usr/bin/env node
// Builds ONE self-contained HTML file from the Expo web export (apps/mobile/dist), for hosting the
// demo as a single page: JS inlined, used fonts + images inlined as data: URIs.
// Usage: (cd apps/mobile && npx expo export -p web) && node scripts/build-web-preview.mjs [out.html]
// Also writes `phone.html` next to it: a phone-frame page (390×844, scaled to fit) that shows the app
// from `app.html` (a copy of out.html). Publish phone.html as index.html + app.html for a mobile view.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'apps/mobile/dist');
const out = process.argv[2] ?? join(dist, 'mago-preview.html');

// Only fonts the app actually loads (see src/app/_layout.tsx) are inlined; others are never fetched.
const USED_FONTS = [
  'CormorantGaramond_500Medium.',
  'CormorantGaramond_500Medium_Italic.',
  'CormorantGaramond_600SemiBold.',
];
const MIME = { ttf: 'font/ttf', png: 'image/png', jpg: 'image/jpeg', ico: 'image/x-icon', mp4: 'video/mp4' };

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map((m) => m[1]);
let inlined = 0;

function inlineAssets(js) {
  return js.replace(/"(\/assets\/[^"]+\.(ttf|png|jpg|mp4))"/g, (whole, path, ext) => {
    if (ext === 'ttf' && !USED_FONTS.some((f) => path.includes(`/${f}`))) return whole;
    const file = join(dist, decodeURIComponent(path));
    if (!existsSync(file)) return whole;
    inlined++;
    return `"data:${MIME[ext]};base64,${readFileSync(file).toString('base64')}"`;
  });
}

const bodies = scripts.map((src) => {
  const js = inlineAssets(readFileSync(join(dist, src), 'utf8'));
  return `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`;
});

let page = html
  .replace(/<script src="[^"]+" defer><\/script>/g, '')
  .replace(/<link rel="icon"[^>]*\/>/, '')
  .replace('<meta httpEquiv="X-UA-Compatible" content="IE=edge" />', '');
// Scripts must run after #root exists.
page = page.replace('</body>', () => `${bodies.join('\n')}\n</body>`);
writeFileSync(out, page);
console.log(`wrote ${out} (${(page.length / 1024 / 1024).toFixed(2)} MB, ${inlined} assets inlined)`);

// --- Mobile view: app.html (framed) + phone.html (the frame) ---
// Inside the frame the app sees a 390×844 window. We give it an iPhone's safe areas (47 top, 34 bottom)
// by overriding the hidden element react-native-safe-area-context measures, and strip "app.html" from
// the path so Expo Router opens the normal first screen.
const FRAMED_HEAD = `<script>(function(){
var q=new URLSearchParams(location.search);
if(q.get('framed')==='1'){var st=document.createElement('style');
st.textContent='div[style*="safe-area-inset-top"]{padding-top:47px!important;padding-bottom:34px!important}';
document.head.appendChild(st);}
var p=location.pathname.replace(/app\\.html$/,'');
history.replaceState(null,'',p||'/');
})();</script>`;
const appPage = page.replace('<head>', () => `<head>${FRAMED_HEAD}`);
const dir = dirname(out);
writeFileSync(join(dir, 'app.html'), appPage);
writeFileSync(join(dir, 'phone.html'), readFileSync(join(root, 'scripts/phone-frame.html'), 'utf8'));
console.log(`wrote ${join(dir, 'app.html')} + ${join(dir, 'phone.html')} (mobile view)`);
