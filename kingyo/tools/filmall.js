// 全死因を本物のゲーム（見本再生・コマ送り）で撮り、1死因1行のフィルムにする
// node tools/filmall.js out/sample.full.html outDir [ids,comma] [cols=10]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [file, outDir, idsArg = '', colsArg = '10'] = process.argv.slice(2);
  const cols = +colsArg; fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch(); const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(file)); await pg.waitForFunction(() => window.GoldfishGame && window.GoldfishLogic);
  const ids = idsArg ? idsArg.split(',') : await pg.evaluate(() => { (window.__games || []).forEach(g => g.stop()); document.querySelectorAll('.tank').forEach(t => t.remove()); return GoldfishLogic.CAUSES.map(c => c.id); });
  for (const [i, id] of ids.entries()) {
    const url = await pg.evaluate(({ id, cols }) => {
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = 240;
      const touch = id === 'birdrocket' ? 'rocket' : undefined, cid = id === 'birdrocket' ? 'bird' : id;
      const gm = GoldfishGame.mount(cv, { demo: cid, touch, manual: true }); const shots = [];
      let cardAt = -1;
      for (let f = 0; f < 70 * 24; f++) {
        gm.step(1 / 24);
        if (f >= 24 && f % 4 === 0) shots.push(cv.toDataURL());
        if (gm.mode === 'card' && cardAt < 0) cardAt = f;
        if (cardAt >= 0 && f > cardAt + 30) break;
      }
      gm.stop();
      // 最後の1枚（札）以外を均等に間引く
      const n = cols - 1, pick = [];
      for (let k = 0; k < n; k++) pick.push(shots[Math.round(k * (shots.length - 2) / (n - 1))]);
      pick.push(shots[shots.length - 1]);
      return pick;
    }, { id, cols });
    const html = '<body style="margin:0;background:#222">' + url.map(u => `<img src="${u}" style="image-rendering:pixelated;width:160px;height:240px;margin-right:2px">`).join('') + '</body>';
    const p2 = await b.newPage({ viewport: { width: cols * 162, height: 240 } });
    await p2.setContent(html); await p2.waitForTimeout(50);
    await p2.screenshot({ path: path.join(outDir, String(i + 1).padStart(2, '0') + '_' + id + '.png') }); await p2.close();
  }
  console.log('done', ids.length, 'errs', errs); await b.close();
})();
