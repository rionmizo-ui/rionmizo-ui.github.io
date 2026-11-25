// node tools/build2.js  → out2/game.html sample.html (minified) + game.full.html sample.full.html
const fs = require('fs'), path = require('path');
const { minify } = require(process.env.TERSER || 'terser');
const root = path.join(__dirname, '..'), src = path.join(root, 'src'), out = path.join(root, 'out');
fs.mkdirSync(out, { recursive: true });
const files = ['logic.js', 'sprites.js', 'main.js'];
(async () => {
  const js = files.map(f => fs.readFileSync(path.join(src, f), 'utf8'));
  // v23: assets/*.png（ユーザーの描いた最終の見た目）を data URI で埋め込む
  const adir = path.join(root, 'assets'), am = {};
  if (fs.existsSync(adir)) for (const f of fs.readdirSync(adir).sort()) if (/\.png$/.test(f)) am[f.replace(/\.png$/, '')] = 'data:image/png;base64,' + fs.readFileSync(path.join(adir, f)).toString('base64');
  js.unshift('var GF_ASSETS=' + JSON.stringify(am) + ';');
  const tag = s => '<script>' + s + '</script>\n';
  const full = js.map(tag).join('');
  const mins = [];
  for (const s of js) { const r = await minify(s, { ecma: 2020, compress: { passes: 2 }, mangle: true, format: { comments: false, ascii_only: false } }); mins.push(r.code); }
  const min = tag(mins.join('\n'));
  // 遊べるページには見本再生のコード（/*DEMO*/〜/*/DEMO*/）を入れない
  const jsGame = js.map(c => c.replace(/\/\*DEMO\*\/[\s\S]*?\/\*\/DEMO\*\//g, ''));
  const minsG = [];
  for (const c of jsGame) { const r = await minify(c, { ecma: 2020, compress: { passes: 2 }, mangle: true, format: { comments: false, ascii_only: false } }); minsG.push(r.code); }
  const minG = tag(minsG.join('\n'));
  const minCss = h => h.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s+/g, '\n');
  for (const page of ['game', 'sample']) {
    const t = fs.readFileSync(path.join(src, page + '.template.html'), 'utf8');
    fs.writeFileSync(path.join(out, page + '.full.html'), t.replace('<!--SCRIPTS-->\n', () => full));
    let tm = t;
    if (page === 'sample') { // ページ専用スクリプトも縮める
      const m = tm.match(/<script>\n\{([\s\S]*?)\n\}\n<\/script>/);
      if (m) { const r = await minify('{' + m[1] + '}', { ecma: 2020, compress: true, mangle: true }); tm = tm.replace(m[0], () => '<script>' + r.code + '</script>'); }
    }
    fs.writeFileSync(path.join(out, page + '.html'), minCss(tm).replace('<!--SCRIPTS-->\n', () => page === 'game' ? minG : min));
  }
  fs.writeFileSync(path.join(out, 'logic.js'), js[1]);
  for (const f of fs.readdirSync(out)) console.log(f, fs.statSync(path.join(out, f)).size);
})();
