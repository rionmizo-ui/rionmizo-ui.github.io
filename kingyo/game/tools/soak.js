// node tools/soak.js [本数=12] [分=12] — ヘッドレスブラウザでの耐久テスト
// 乱数の種を変えて dist/index.html をでたらめに押し続け、エラーと「止まったまま」を探す。
// 先に npm run build しておくこと。
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNS = +(process.argv[2] || 12), MIN = +(process.argv[3] || 12);
const STEP = 1 / 20;

const browser = await chromium.launch();
let bad = 0;
for (let seed = 1; seed <= RUNS; seed++) {
  const page = await browser.newPage({ viewport: { width: 480, height: 860 } });
  const errors = [], timeouts = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.text().includes('待ちが')) timeouts.push(m.text()); });
  // ページの乱数を種で固定（毎回同じ流れを再現できる）
  await page.addInitScript(s => {
    let a = s * 2654435761 >>> 0;
    Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }, seed);
  await page.goto('file://' + path.join(root, 'dist/index.html') + '?fresh=1&speed=0');
  await page.waitForFunction(() => window.__gf);
  // 10秒ずつ進めながら、同じ状態のまま busy が続いていないか見る
  const r = await page.evaluate(({ total, STEP }) => {
    const bs = ['feed', 'clean', 'touch', 'net'], gf = window.__gf;
    let stuck = 0, worst = 0, sameFor = 0, prev = '', fish = 0, deaths = {};
    for (let t = 0; t < total; t += STEP) {
      if (Math.random() < 0.15) gf.press(bs[Math.random() * 4 | 0]);
      gf.step(STEP);
      const key = gf.mode + '|' + gf.busy + '|' + Math.round(gf.fish.x) + '|' + Math.round(gf.fish.y);
      const waiting = gf.busy || gf.mode === 'boot' || gf.mode === 'ending';
      if (key === prev && waiting) { sameFor += STEP; worst = Math.max(worst, sameFor); if (sameFor > 30) stuck++; } else sameFor = 0;
      prev = key;
      if (gf.cause && !deaths[gf.g.s.fishNo]) { deaths[gf.g.s.fishNo] = gf.cause; fish++; }
    }
    return { stuck, worst: +worst.toFixed(1), fish, causes: [...new Set(Object.values(deaths))].length, mode: gf.mode };
  }, { total: MIN * 60, STEP });
  const ng = errors.length || r.stuck;
  if (ng) bad++;
  console.log(`seed ${String(seed).padStart(2)}: ${ng ? 'NG' : 'ok'}  魚 ${r.fish} 匹・死因 ${r.causes} 種・最長の静止 ${r.worst}s・待ちの打ち切り ${timeouts.length}` + (errors.length ? `\n  ${errors.slice(0, 3).join('\n  ')}` : ''));
  await page.close();
}
await browser.close();
console.log(bad ? `${bad} 本で問題あり` : `${RUNS} 本 × ${MIN} 分、止まらずに完走`);
process.exit(bad ? 1 : 0);
