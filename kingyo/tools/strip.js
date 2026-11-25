const { chromium } = require('playwright');
(async () => {
  const [file, ids, out] = process.argv.slice(2);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + file); await pg.waitForTimeout(300);
  await pg.waitForFunction(() => window.GoldfishSprites);
  const info = await pg.evaluate((ids) => {
    const S = window.GoldfishSprites, list = ids.split(',');
    const cols = 16, cw = 56, ch = 56;
    let rows = 0; const meta = {};
    list.forEach(k => { const n = S.DEATH_FRAMES[k].n; meta[k] = S.DEATH_FRAMES[k]; rows += Math.ceil(n / cols); });
    const cv = document.createElement('canvas'); cv.width = cols * cw; cv.height = rows * ch; cv.style.cssText = 'image-rendering:pixelated;width:' + cols * cw * 1.5 + 'px;position:absolute;left:0;top:0;z-index:99';
    const c = cv.getContext('2d'); c.fillStyle = '#5fcfb8'; c.fillRect(0, 0, cv.width, cv.height);
    let r = 0;
    list.forEach(k => { const n = S.DEATH_FRAMES[k].n; for (let f = 0; f < n; f++) { const x = (f % cols) * cw + cw / 2, y = (r + Math.floor(f / cols)) * ch + ch / 2; c.fillStyle = (f % (S.DEATH_FRAMES[k].sub||1)) ? '#6fd8c2' : '#5fcfb8'; c.fillRect(x - cw/2, y - ch/2, cw-1, ch-1); S.drawFish(c, x, y + 4, { die: { k, f }, color: 'orange', stage: 2, dir: 1, t: f / 24, scale: 0.8 }); } r += Math.ceil(n / cols); });
    document.body.appendChild(cv);
    return meta;
  }, ids);
  const bb = await pg.evaluate(() => { const r = document.querySelector('canvas[style*="z-index"]').getBoundingClientRect(); return { x: 0, y: 0, width: r.width, height: Math.min(r.height, 1400) }; }); await pg.screenshot({ path: out, clip: bb });
  console.log(JSON.stringify(info), errs);
  await b.close();
})();
