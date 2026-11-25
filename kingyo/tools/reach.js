// 16の結末それぞれに「狙った育て方」で到達できるか（ふつうのプレイだけ・強制なし）
const L = require(process.argv[2] || '../logic.js');
const N = +process.argv[3] || 1500;
// v20: 世話の時間は泳がない（のんびり成長しない）
const BUSY = { feed: 4.5, clean: 3.4, touch: 5, net: 2 };
const want = s => s.want !== 'none' ? s.want : null;
const PLAN = {
  bug:         { act: (s, i) => want(s) || 'feed', mash: true },
  duck:        { act: s => s.satiety < 6 ? 'feed' : 'clean' },   // 磨くだけ・ふれあわない
  dragon:      { act: (s, i) => s.satiety < 10 ? 'feed' : s.dirt >= 1 ? 'clean' : ['touch', 'clean', 'feed'][i % 3] },
  enlightened: { act: s => want(s) || (s.satiety < 9 ? 'feed' : 'touch') },
  babies:      { act: (s, i) => ['feed', 'clean', 'touch'][i % 3] },
  golden:      { act: s => s.satiety < 12 ? 'feed' : s.dirt ? 'clean' : 'touch' },
  moss:        { act: (s, i) => i % 3 ? null : 'touch', gap: 9 },   // ほとんど放置・掃除しない
  stone:       { act: (s, i) => i % 5 === 4 ? 'touch' : s.satiety < 5 ? 'feed' : 'clean' },   // 掃除ばかりでピリピリ（たまにふれあう）
  split:       { act: s => s.satiety < 3 ? 'feed' : null, gap: 6 },   // ほぼ放置・ふれあわない
  hermit:      { act: (s, i) => i < 3 ? 'net' : (want(s) || 'feed') },
  skeleton:    { act: (s, i) => i % 4 ? null : (s.dirt ? 'clean' : 'touch'), gap: 6 },
  idol:        { act: s => want(s) || (s.satiety < 8 ? 'feed' : 'touch') },
  overeat:     { act: s => s.satiety < 16 ? 'feed' : 'touch' },
  fishman:     { act: s => s.satiety < 4 ? 'feed' : 'touch' },
  oldage:      { act: s => want(s) },
};
const out = [];
for (const [target, plan] of Object.entries(PLAN)) {
  const g = L.create({}); g.s.zukan = new Set(L.CAUSES.map(c => c.id));
  let hit = 0, full = 0;
  for (let n = 0; n < N; n++) {
    g.s.lastEnding = null;
    const r = g.newFish(); if (r.instantDeath) continue;
    let t = 0, i = 0, dead = false;
    while (!dead && !g.isFull() && t < 1500) {
      g.tick(plan.gap || 4, true); t += plan.gap || 4;
      if (plan.mash) for (let k = 0; k < 4; k++) g.press('feed', t + k * 0.1);
      const a = plan.act(g.s, i++);
      if (a) g.tick(BUSY[a], false);
      if (a === 'feed') { const o = g.startFeed(0); if (o.accident) { dead = true; break; } if (o.willEat) { for (let q = 0; q < 3; q++) g.eatPellet(); if (o.gold) g.ateGold(); } g.finishFeed(o.willEat, false); }
      else if (a === 'clean') { const o = g.startClean(); if (o.accident) { dead = true; break; } g.finishClean(); }
      else if (a === 'touch') { const o = g.startTouch(); if (o.accident) { dead = true; break; } g.finishTouch(); }
      else if (a === 'net') { const o = g.net(); if (o.caught) { dead = true; break; } }
    }
    if (dead || !g.isFull()) continue;
    full++; if (g.decideEnding() === target) hit++;
  }
  out.push([target, full, hit, (100 * hit / Math.max(1, full)).toFixed(0) + '%']);
}
console.log('結末 / 満タンまで育った数 / 狙いどおり / 割合');
out.forEach(r => console.log(r.join('\t')));
