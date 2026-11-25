// 死亡カード一覧のページ（CARDS.html）を、ゲームの描画からそのまま作る
// node tools/cardlist.js out/sample.full.html CARDS.html
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const L = require(path.join(root, 'src/logic.js'));
const tpl = fs.readFileSync(path.join(root, 'src/sample.template.html'), 'utf8');
const HOW = eval('(' + tpl.match(/const HOW = (\{[\s\S]*?\n  \});/)[1] + ')');
const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
const HINTS = eval('(' + main.match(/const HINTS = (\{[\s\S]*?\n  \});/)[1] + ')');
const FLOAT = { float: '浮く', sink: '沈む', gone: '消える', stay: 'とどまる' };
(async () => {
  const [file, out] = process.argv.slice(2);
  const b = await chromium.launch(); const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(file)); await pg.waitForFunction(() => window.GoldfishSprites);
  await pg.waitForTimeout(400);   // 絵（PNG）の読みこみ待ち
  const imgs = await pg.evaluate(() => {
    (window.__games || []).forEach(g => g.stop());
    const S = GoldfishSprites, C = GoldfishLogic.CAUSES;
    return C.map((cs, i) => {
      const c = document.createElement('canvas'); c.width = 160; c.height = 240; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      S.drawTank(x, 0.5, 0); S.drawCard(x, cs, false);
      const d = document.createElement('canvas'); d.width = 142 * 2; d.height = 152 * 2; const y = d.getContext('2d'); y.imageSmoothingEnabled = false;
      y.drawImage(c, 9, 38, 142, 152, 0, 0, d.width, d.height);
      return d.toDataURL('image/png');
    });
  });
  const items = L.CAUSES.map((c, i) => ({ no: i + 1, id: c.id, name: c.name, kind: c.kind, fl: FLOAT[c.float] || '', how: HOW[c.id] || '', hint: HINTS[c.id] || '', img: imgs[i] }));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const nS = items.filter(i => i.kind === 'sudden').length, nE = items.length - nS;
  const card = it => `<li class="card ${it.kind}" data-kind="${it.kind}"><img src="${it.img}" width="284" height="304" alt="${esc(it.name)}のカード"><div class="meta"><p class="no"><span>No.${String(it.no).padStart(2, '0')}</span><span class="tag">${it.kind === 'sudden' ? 'しいん' : 'けつまつ'}・${esc(it.fl)}</span></p><h2>${esc(it.name)}</h2><p class="how">${esc(it.how)}</p><p class="hint">きっかけ：${esc(it.hint)}</p></div></li>`;
  const html = `<title>金魚の死亡カード帳</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* 図鑑の札を、こげ茶の太い輪郭・水色の窓に合わせて並べる。2〜4列の格子、スマホは1列 */
:root { --bg: #e9f6f2; --panel: #fffaf0; --ink: #2a1408; --sub: #5d4a3e; --sudden: #b63a2e; --ending: #1f6f66; --line: #2a1408;
  --display: "M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif; --body: "M PLUS Rounded 1c", "Hiragino Sans", "Yu Gothic", sans-serif; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #14211f; --panel: #1f2b29; --ink: #f4ece0; --sub: #c4b7aa; --sudden: #ff8a7a; --ending: #6fd6c9; --line: #0c1412; color-scheme: dark } }
:root[data-theme="dark"] { --bg: #14211f; --panel: #1f2b29; --ink: #f4ece0; --sub: #c4b7aa; --sudden: #ff8a7a; --ending: #6fd6c9; --line: #0c1412; color-scheme: dark }
body { background: var(--bg); color: var(--ink); font-family: var(--body); padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 20px 40px; }
.wrap { max-width: 1180px; margin: 0 auto; display: grid; gap: 18px; }
h1 { font-family: var(--display); font-weight: 800; font-size: 1.7rem; margin: 0; text-wrap: balance; }
.lead { margin: 0; color: var(--sub); line-height: 1.7; max-width: 62ch; }
.tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.tabs button { font: 700 0.9rem var(--body); color: var(--ink); background: var(--panel); border: 2px solid var(--line); border-radius: 999px; padding: 6px 14px; cursor: pointer; }
.tabs button[aria-pressed="true"] { background: var(--ink); color: var(--panel); }
.tabs button:focus-visible { outline: 3px solid var(--ending); outline-offset: 2px; }
ul.grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
.card { background: var(--panel); border: 3px solid var(--line); border-radius: 14px; overflow: hidden; display: grid; grid-template-rows: auto 1fr; min-width: 0; }
.card img { width: 100%; height: auto; image-rendering: pixelated; display: block; background: #5fcfb8; }
.meta { padding: 10px 12px 14px; display: grid; gap: 6px; align-content: start; min-width: 0; }
.no { margin: 0; display: flex; justify-content: space-between; gap: 8px; font-size: 0.78rem; letter-spacing: 0.04em; font-variant-numeric: tabular-nums; color: var(--sub); }
.sudden .tag { color: var(--sudden); font-weight: 700; } .ending .tag { color: var(--ending); font-weight: 700; }
h2 { margin: 0; font-family: var(--display); font-size: 1.15rem; }
.how, .hint { margin: 0; font-size: 0.86rem; line-height: 1.6; }
.hint { color: var(--sub); }
</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800&display=swap">
<div class="wrap">
  <h1>金魚の死亡カード帳（v23・全${items.length}枚）</h1>
  <p class="lead">ゲームの図鑑に入る札を、ゲームの描画そのままで並べました。育てている途中の突然死（しいん）${nS}枚と、ゲージ満タンの結末（けつまつ）${nE}枚。条件と確率は今の版のものです。</p>
  <div class="tabs" role="group" aria-label="しぼりこみ">
    <button id="f-all" type="button" aria-pressed="true" data-f="all">ぜんぶ ${items.length}</button>
    <button id="f-sudden" type="button" aria-pressed="false" data-f="sudden">しいん ${nS}</button>
    <button id="f-ending" type="button" aria-pressed="false" data-f="ending">けつまつ ${nE}</button>
  </div>
  <ul class="grid">${items.map(card).join('')}</ul>
</div>
<script>
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  document.querySelectorAll('.card').forEach(c => { c.hidden = b.dataset.f !== 'all' && c.dataset.kind !== b.dataset.f; });
}));
</script>
`;
  fs.writeFileSync(out, html);
  console.log(out, html.length, 'errs', errs); await b.close();
})();
