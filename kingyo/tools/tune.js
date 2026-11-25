// endings weight tuning: node tools/tune.js <iters> <N per strategy>
const L = require('../logic.js');
const iters = +process.argv[2] || 6, N = +process.argv[3] || 4000;
if (process.argv[4] === 'reset') for (const r of L.ENDING_RULES) r.w = 1;
const ALL = L.CAUSES.map(c => c.id);
const S = {
  want: (g, s) => s.want !== 'none' ? s.want : (s.satiety < 8 ? 'feed' : s.dirt >= 1 ? 'clean' : 'touch'),
  wantIdle: (g, s) => s.want !== 'none' ? s.want : null,
  random: () => ['feed','clean','touch'][Math.random()*3|0],
  feedy: (g,s) => s.satiety < 12 ? 'feed' : (Math.random()<0.5?'touch':'clean'),
  toucher: (g,s) => s.satiety < 3 ? 'feed' : 'touch',
  cleaner: (g,s) => s.satiety < 4 ? 'feed' : Math.random()<0.7 ? 'clean':'touch',
  netter: (g,s) => Math.random()<0.12 ? 'net' : (s.want !== 'none' ? s.want : 'feed'),
  neglect: (g,s) => Math.random() < 0.3 ? ['feed','clean','touch'][Math.random()*3|0] : null,
};
// v20: 世話の時間（泳がない）と、次の世話までの放置（泳ぐ＝のんびり成長）を分けて、せっかち・ふつう・のんびりを混ぜる
const BUSY = { feed: 4.5, clean: 3.4, touch: 5, net: 2 };
const PACE = [() => 0.5 + Math.random() * 2, () => (Math.random() < 0.8 ? 2 + Math.random() * 5 : 8 + Math.random() * 12), () => (Math.random() < 0.6 ? 3 + Math.random() * 5 : 10 + Math.random() * 25)];
function run(zukanFull) {
  const end = {}, sud = {}; let full = 0, total = 0;
  for (const [name, fn] of Object.entries(S)) {
    const g = L.create({});
    for (let n = 0; n < N; n++) {
      const pace = PACE[n % 3];
      if (zukanFull) g.s.zukan = new Set(ALL); else if (n % 300 === 0) g.s.zukan = new Set();
      total++;
      const r = g.newFish();
      if (r.instantDeath) { sud.instant = (sud.instant || 0) + 1; g.record('instant'); continue; }
      let t = 0, dead = null;
      while (!dead && !g.isFull() && t < 1800) {
        const gap = pace() * (name === 'neglect' ? 2 : 1); g.tick(gap, true); t += gap;
        const s = g.s, act = fn(g, s);
        if (act) { g.tick(BUSY[act], false); t += BUSY[act]; }
        if (act === 'feed') { const o = g.startFeed(0); if (o.accident) { dead = o.accident; break; } if (o.willEat) { for (let i = 0; i < 3; i++) g.eatPellet(); if (o.gold) g.ateGold(); } g.finishFeed(o.willEat, false); }
        else if (act === 'clean') { const o = g.startClean(); if (o.accident) { dead = o.accident; break; } g.finishClean(); }
        else if (act === 'touch') { const o = g.startTouch(); if (o.accident) { dead = o.accident; break; } g.finishTouch(); }
        else if (act === 'net') { const o = g.net(); if (o.caught) { dead = 'netted'; break; } }
      }
      if (dead) { sud[dead] = (sud[dead] || 0) + 1; g.die(dead); g.record(dead); continue; }
      if (g.isFull()) { full++; const e = g.decideEnding(); end[e] = (end[e] || 0) + 1; g.record(e); }
    }
  }
  return { end, sud, full, total };
}
const ids = L.ENDING_RULES.map(r => r.id);
const fmt = (o, tot) => ids.map(k => k + ':' + (100 * (o[k] || 0) / tot).toFixed(1)).join(' ');
for (let it = 0; it < iters; it++) {
  const r = run(true);
  const mean = r.full / ids.length;
  const cv = Math.sqrt(ids.reduce((a, k) => a + Math.pow((r.end[k] || 0) - mean, 2), 0) / ids.length) / mean;
  console.log(`it${it} full ${(100 * r.full / r.total).toFixed(1)}% CV ${cv.toFixed(3)} | ${fmt(r.end, r.full)}`);
  if (it < iters - 1) for (const rule of L.ENDING_RULES) { const c = r.end[rule.id] || 0.5; rule.w = Math.max(0.005, Math.min(2000, rule.w * Math.pow(mean / c, 0.8))); }
}
console.log('W=' + JSON.stringify(Object.fromEntries(L.ENDING_RULES.map(r => [r.id, +r.w.toPrecision(3)]))));
const r2 = run(false); console.log('with new-player zukan boost:', fmt(r2.end, r2.full));
console.log('sudden (logic only):', Object.entries(r2.sud).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+':'+(100*v/r2.total).toFixed(2)).join(' '), ' full', (100*r2.full/r2.total).toFixed(1));
