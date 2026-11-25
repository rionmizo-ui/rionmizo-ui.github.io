const L = require(process.argv[2]);
const N = +process.argv[3] || 20000;
function run(strategy, gap) {
  const res = { full: 0, sudden: {}, ending: {}, tFull: 0 };
  const g = L.create({});
  for (let n = 0; n < N; n++) {
    if (n % 300 === 0) g.s.zukan = new Set();   // 300匹ごとに新しいプレイヤー
    const r = g.newFish();
    if (r.instantDeath) { res.sudden.instant = (res.sudden.instant || 0) + 1; g.record('instant'); continue; }
    let t = 0, dead = null;
    while (!dead && !g.isFull() && t < 1800) {
      g.tick(gap, true); t += gap;
      const s = g.s; const act = strategy(g, s);
      if (act === 'feed') { const o = g.startFeed(0); if (o.accident) { dead = o.accident; break; } if (o.willEat) { for (let i=0;i<3;i++) g.eatPellet(); if (o.gold) g.ateGold(); } g.finishFeed(o.willEat, false); }
      else if (act === 'clean') { const o = g.startClean(); if (o.accident) { dead = o.accident; break; } g.finishClean(); }
      else if (act === 'touch') { const o = g.startTouch(); if (o.accident) { dead = o.accident; break; } g.finishTouch(); }
      else if (act === 'net') { const o = g.net(); if (o.caught) { dead = 'netted'; break; } }
    }
    if (dead) { res.sudden[dead] = (res.sudden[dead] || 0) + 1; g.die(dead); g.record(dead); continue; }
    if (g.isFull()) { res.full++; res.tFull += t; const e = g.decideEnding(); res.ending[e] = (res.ending[e] || 0) + 1; g.record(e); }
    else res.sudden.timeout = (res.sudden.timeout||0)+1;
  }
  return res;
}
const S = {
  want: (g, s) => s.want !== 'none' ? s.want : (s.satiety < 8 ? 'feed' : s.dirt >= 1 ? 'clean' : 'touch'),
  wantIdle: (g, s) => s.want !== 'none' ? s.want : null,
  random: () => ['feed','clean','touch'][Math.random()*3|0],
  feedy: (g,s) => s.satiety < 12 ? 'feed' : (Math.random()<0.5?'touch':'clean'),
  toucher: (g,s) => s.satiety < 3 ? 'feed' : 'touch',
  cleaner: (g,s) => s.satiety < 4 ? 'feed' : Math.random()<0.7 ? 'clean':'touch',
  netter: (g,s) => Math.random()<0.15 ? 'net' : (s.want !== 'none' ? s.want : 'feed'),
  neglect: (g,s) => Math.random() < 0.3 ? ['feed','clean','touch'][Math.random()*3|0] : null,
};
const tot = {};
for (const [name, fn] of Object.entries(S)) {
  const r = run(fn, name==='neglect'?3:4);
  const pct = o => Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+':'+(100*v/N).toFixed(1)).join(' ');
  console.log(`== ${name}: full ${(100*r.full/N).toFixed(1)}%  avgT ${(r.tFull/Math.max(1,r.full)).toFixed(0)}s`);
  console.log('  sudden ', pct(r.sudden));
  console.log('  ending ', pct(r.ending));
  for (const k in r.ending) tot[k] = (tot[k]||0) + r.ending[k];
}
const all = L.CAUSES.filter(c=>c.kind==='ending').map(c=>c.id);
console.log('ALL-STRATEGY ending share:', all.map(k=>k+':'+((tot[k]||0)/N/Object.keys(S).length*100).toFixed(1)).join(' '));
