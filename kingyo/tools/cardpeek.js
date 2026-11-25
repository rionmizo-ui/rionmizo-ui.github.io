// 指定した死因の札と図鑑アイコン（大・小）を並べて書き出す（3倍）
// node tools/cardpeek.js out/sample.full.html out.png id1,id2,...
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [file, out, ids] = process.argv.slice(2);
  const b = await chromium.launch(); const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(file)); await pg.waitForFunction(() => window.GoldfishSprites);
  const url = await pg.evaluate((ids) => {
    (window.__games || []).forEach(g => g.stop());
    const S = GoldfishSprites, C = GoldfishLogic.CAUSES, L = ids.split(',');
    const c = document.createElement('canvas'); c.width = L.length * 240; c.height = 240; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#cfeee6'; x.fillRect(0, 0, c.width, c.height);
    L.forEach((id, i) => {
      const cs = C.find(q => q.id === id);
      x.save(); x.translate(i * 240, 0); x.beginPath(); x.rect(0, 0, 160, 240); x.clip(); S.drawTank(x, 0.5, 0); S.drawCard(x, cs, false); x.restore();
      S.drawCauseIcon(x, i * 240 + 200, 60, id, 2, 0.4); S.drawCauseIcon(x, i * 240 + 200, 140, id, 1, 0.4);
    });
    const d = document.createElement('canvas'); d.width = c.width * 3; d.height = c.height * 3; const y = d.getContext('2d'); y.imageSmoothingEnabled = false; y.drawImage(c, 0, 0, d.width, d.height);
    return d.toDataURL();
  }, ids);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log('errs', errs); await b.close();
})();
