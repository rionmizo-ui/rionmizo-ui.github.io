// node tools/shot.js file out.png [setupJS] [waitSec]
const { chromium } = require('playwright');
(async () => {
  const [file, out, setup = '', wait = '6'] = process.argv.slice(2);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 500, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + file + '?fresh=1');
  await pg.waitForFunction(() => window.__gf); await pg.evaluate(() => window.__gf.press('touch'));
  await pg.waitForTimeout(4000);
  if (setup) await pg.evaluate(setup);
  await pg.waitForTimeout(+wait * 1000);
  const el = await pg.$('#screen'); await el.screenshot({ path: out });
  console.log('errs', errs);
  await b.close();
})();
