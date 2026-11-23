// node tools/build.js — src/ を1つの JS にまとめ、HTML に埋めこんで dist/ に書き出す。
// dist/index.html と dist/gallery.html は、サーバーなしでダブルクリックで開ける。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });

for (const [page, entry] of [['index.html', 'src/main.js'], ['gallery.html', 'src/gallery.js']]) {
  const r = await esbuild.build({ entryPoints: [path.join(root, entry)], bundle: true, format: 'iife', target: 'es2020', write: false, charset: 'utf8', legalComments: 'none' });
  const js = r.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
  let html = fs.readFileSync(path.join(root, page), 'utf8');
  const tag = `<script type="module" src="${entry}"></script>`;
  if (!html.includes(tag)) throw new Error(`${page}: ${tag} がない`);
  html = html.replace(tag, () => `<script>\n${js}</script>`).replace(/<script type="module">/g, '<script>');
  fs.writeFileSync(path.join(dist, page), html);
  console.log('built', path.join('dist', page), `${(html.length / 1024).toFixed(0)} KB`);
}
