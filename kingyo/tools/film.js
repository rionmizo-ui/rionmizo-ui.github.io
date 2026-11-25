// node tools/film.js sample.full.html demoId out.png secs frames
const { chromium } = require('playwright');
(async () => {
  const [file, id, out, secs = '14', nf = '12'] = process.argv.slice(2);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1300, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + file);
  await pg.waitForFunction(() => window.GoldfishGame);
  await pg.evaluate((id) => { (window.__games || []).forEach(g => g.stop()); document.body.innerHTML = '';
    const cv = document.createElement('canvas'); cv.width = 160; cv.height = 240; document.body.appendChild(cv);
    window.__film = document.createElement('canvas'); window.__film.width = 160 * 6; window.__film.height = 240 * 2; document.body.appendChild(window.__film);
    window.__film.style.cssText = 'position:absolute;left:0;top:0;width:' + 160 * 6 * 1.3 + 'px;image-rendering:pixelated;background:#000';
    window.__src = cv; window.__k = 0;
    window.__gm = GoldfishGame.mount(cv, { demo: id }); }, id);
  const n = +nf, dt = (+secs * 1000) / n;
  for (let i = 0; i < n; i++) { await pg.waitForTimeout(dt); await pg.evaluate(() => { const k = window.__k++; window.__film.getContext('2d').drawImage(window.__src, (k % 6) * 160, Math.floor(k / 6) * 240); }); }
  const el = await pg.$('canvas:last-of-type'); await pg.screenshot({ path: out, clip: { x: 0, y: 0, width: 160 * 6 * 1.3, height: 240 * 2 * 1.3 } });
  console.log(id, 'errs', errs); await b.close();
})();
