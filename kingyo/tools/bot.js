// real-game bot: node tools/bot.js <html> <strategy> <gameSeconds> <speed>
const { chromium } = require('playwright');
(async () => {
  const [file, strat = 'want', secs = '1500', speed = '10', evOk = '0.8'] = process.argv.slice(2);
  const b = await chromium.launch(); const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error' || m.type()==='warning') errs.push(m.type()+': ' + m.text()); });
  await pg.goto('file://' + file + '?fresh=1&speed=' + speed);
  await pg.waitForFunction(() => window.__gf);
  await pg.evaluate(({ strat, evOk }) => {
    window.__stats = {};
    const gf = window.__gf; const log = window.__log = { deaths: {}, fish: 0, full: 0, stuck: 0, events: {}, evRes: {}, gest: 0, visit: 0, rest: 0 }; let pg = false, pv = null, pr = false;
    let lastMode = '', nextAct = 0, evSeen = null, evAt = 0, lastProgressT = 0, lastSig = '';
    const STR = {
      want: s => s.want !== 'none' ? s.want : (s.satiety < 8 ? 'feed' : s.dirt >= 1 ? 'clean' : 'touch'),
      random: () => Math.random() < 0.05 ? 'net' : ['feed', 'clean', 'touch'][Math.random() * 3 | 0],
      lazy: s => Math.random() < 0.35 ? (s.want !== 'none' ? s.want : 'feed') : null,
    };
    setInterval(() => {
      const m = gf.mode, T = gf.T, s = gf.g.s;
      if (gf.gest && !pg) log.gest++; pg = gf.gest; if (gf.visitor && gf.visitor !== pv) log.visit++; pv = gf.visitor; if (gf.resting && !pr) log.rest++; pr = gf.resting;
      if (m === 'play' && lastMode !== 'play') log.fish++;
      if (m !== lastMode) {
        if (m === 'card') { const c = gf.cause; log.deaths[c] = (log.deaths[c] || 0) + 1; }
        if (m === 'ending') log.full++;
        lastMode = m;
      }
      const sig = m + '|' + gf.busy + '|' + Math.round(s.gauge) + '|' + (gf.ev ? 1 : 0);
      if (sig !== lastSig) { lastSig = sig; lastProgressT = T; }
      if (T - lastProgressT > 120 && m !== 'title') { log.stuck++; log.lastStuck = sig; lastProgressT = T; }
      if (m === 'title') { gf.press('touch'); return; }
      if (m === 'card') { gf.press('feed'); return; }
      if (m === 'dead') { gf.press('net'); return; }
      if (m !== 'play') return;
      const need = gf.evNeed;
      if (need) {
        if (evSeen !== need + '@' + Math.floor(T)) { }
        if (!evAt) { evAt = T + 0.6 + Math.random() * 1.2; window.__evGo = Math.random() < evOk; }
        if (T > evAt) { if (window.__evGo) gf.press(need); else gf.press(need === 'net' ? 'touch' : 'net'); evAt = 0; }
        return;
      }
      evAt = 0;
      if (gf.busy || T < nextAct) return;
      nextAct = T + 2 + Math.random() * 2;
      const a = STR[strat](s);
      if (a) gf.press(a);
    }, 30);
  }, { strat, evOk: +evOk });
  const t0 = Date.now();
  while (true) {
    await pg.waitForTimeout(2000);
    const T = await pg.evaluate(() => window.__gf.T);
    if (T > +secs || Date.now() - t0 > 400000) break;
  }
  const log = await pg.evaluate(() => Object.assign(window.__log, { stats: window.__stats }));
  const T = await pg.evaluate(() => window.__gf.T);
  console.log(JSON.stringify({ strat, T: Math.round(T), ...log, errs: [...new Set(errs)].slice(0, 20) }));
  await b.close();
})();
