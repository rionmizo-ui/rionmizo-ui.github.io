// ゲームの見本再生で、50種とロケットからの「鳥のおやつ」が札まで届くか確認する。
const { chromium } = require('playwright');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const [file = 'out/sample.full.html', partArg = '0', ofArg = '1'] = process.argv.slice(2);
  const part = Number(partArg), of = Number(ofArg);
  if (!Number.isInteger(part) || !Number.isInteger(of) || part < 0 || part >= of) {
    throw new Error('Usage: node tools/reach_real.js [file] [part from 0] [part count]');
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', error => errs.push(error.message));
    await page.goto(pathToFileURL(resolve(file)).href);
    const entries = await page.evaluate(() => {
      document.querySelectorAll('.tank').forEach(tank => tank.remove());
      (window.__games || []).forEach(game => game.stop());
      const cases = GoldfishLogic.CAUSES.map(({ id }) => ({ id }));
      if (cases.length !== 49 || new Set(cases.map(({ id }) => id)).size !== 49) {
        throw new Error('Expected 49 distinct causes');
      }
      return [...cases, { id: 'bird', touch: 'rocket' }];
    });
    const res = [];
    for (const [index, entry] of entries.entries()) {
      if (index % of !== part) continue;
      const seen = await page.evaluate(({ id, touch }) => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 240;
        const game = GoldfishGame.mount(canvas, { demo: id, touch, manual: true });
        try {
          for (let frame = 0; frame < 70 * 24; frame++) {
            game.step(1 / 24);
            if (game.mode === 'card') return game.cause;
          }
          return null;
        } finally {
          game.stop();
        }
      }, entry);
      res.push([entry.id, seen, ...(entry.touch ? [entry.touch] : [])]);
    }
    console.log(JSON.stringify({ res, errs }));
    if (errs.length || res.some(([expected, actual]) => expected !== actual)) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
