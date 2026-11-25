// v20 用：「ひと休み」＋「のんびり成長」＋お客さんの頻度・事故率をまとめて最適化する時間シミュレーション
const rnd = (a, b) => a + Math.random() * (b - a);
const DUR = { feed: 4.5, clean: 3.4, touch: 5.0, gest: 5.5, visit: 7, event: 5 };
const PLAYERS = {
  eager:   () => rnd(0.5, 2.5),
  normal:  () => Math.random() < 0.8 ? rnd(2, 7) : rnd(8, 20),
  relaxed: () => Math.random() < 0.6 ? rnd(3, 8) : rnd(10, 35),
};
const CARE_P = { feed: 0.016, clean: 0.03, touch: 0.055 };
function fish(pl, C) {
  let T = 0, gauge = 0, busy = 0, nextAct = PLAYERS[pl](), gestAt = rnd(...C.g1), visitAt = rnd(C.v[0] * 0.5, C.v[1] * 0.5), evAt = rnd(35, 60), idleT = 0, acts = 0, rest = 0;
  const m = { gest: 0, visit: 0, death: null };
  let inGest = 0, inVisit = 0, gSeen = 0, vSeen = 0;
  const startGest = () => { inGest = DUR.gest; gSeen = 0; };
  const startVisit = () => { inVisit = DUR.visit; vSeen = 0; visitAt = T + rnd(...C.v); };
  const dt = 0.25;
  while (T < 900) {
    T += dt;
    if (busy > 0) { busy -= dt; if (busy <= 0) { nextAct = Math.max(T + PLAYERS[pl](), rest); gestAt = Math.max(gestAt, T + rnd(...C.g1)); if (rest > T) { if (T >= visitAt - C.restPull) startVisit(); else startGest(); } } continue; }
    if (C.grow && inGest <= 0 && inVisit <= 0) { idleT += dt; if (idleT >= C.grow) { idleT -= C.grow; gauge++; } }
    if (inGest > 0) { inGest -= dt; if (!gSeen && DUR.gest - inGest >= 3) { gSeen = 1; m.gest++; if (Math.random() < 0.2 * C.pg) { m.death = 'idle'; break; } } }
    if (inVisit > 0) { inVisit -= dt; if (!vSeen && DUR.visit - inVisit >= 3) { vSeen = 1; m.visit++; if (Math.random() < (4 / 6) * C.pv) { m.death = 'idle'; break; } } }
    if (inGest <= 0 && inVisit <= 0) {
      if (T >= visitAt) startVisit();
      else if (T >= gestAt) { gestAt = T + rnd(...C.g2); if (Math.random() < 0.65) startGest(); }
    }
    if (T >= evAt && gauge >= 1 && inGest <= 0 && inVisit <= 0) { evAt = T + rnd(35, 60); busy = DUR.event; if (Math.random() < 0.25 * 0.75) { m.death = 'event'; break; } gauge++; continue; }
    if (gauge >= C.max) break;
    if (T >= nextAct && T >= rest) {
      inGest = 0; inVisit = 0;
      const a = ['feed', 'clean', 'touch'][acts % 3]; acts++;
      busy = DUR[a]; gauge += 1 + (Math.random() < 0.35 ? 1 : 0);
      if (Math.random() < CARE_P[a]) { m.death = 'care'; break; }
      if (C.restK && acts % C.restK === 0) rest = T + busy + C.restLen;
      idleT = 0;
    }
  }
  m.T = T; m.full = !m.death && gauge >= C.max;
  return m;
}
function evalC(C, n) {
  const out = {};
  for (const pl of Object.keys(PLAYERS)) {
    const s = { T: 0, gest: 0, visit: 0, full: 0, idle: 0, dead: 0 };
    for (let i = 0; i < n; i++) { const m = fish(pl, C); s.T += m.T; s.gest += m.gest; s.visit += m.visit; s.full += m.full ? 1 : 0; if (m.death) s.dead++; if (m.death === 'idle') s.idle++; }
    s.idleShare = s.dead ? s.idle / s.dead : 0;
    for (const k of ['T', 'gest', 'visit', 'full']) s[k] /= n;
    out[pl] = s;
  }
  return out;
}
function score(r) {
  let sc = 0; const pen = (v, lo, hi, w) => { if (v < lo) sc -= (lo - v) * w; if (v > hi) sc -= (v - hi) * w; };
  pen(r.eager.gest, 1.5, 6, 3); pen(r.eager.visit, 0.6, 3, 5);
  pen(r.normal.gest, 2.5, 7, 2); pen(r.normal.visit, 1, 3, 4);
  pen(r.relaxed.gest, 3, 10, 1); pen(r.relaxed.visit, 1.2, 4, 2);
  for (const p of ['eager', 'normal', 'relaxed']) { pen(r[p].T, 100, 220, 0.03); pen(r[p].full, 0.5, 0.68, 25); pen(r[p].idleShare, 0.22, 0.4, 10); }
  return sc;
}
const fmt = r => Object.entries(r).map(([p, s]) => `${p}: ${Math.round(s.T)}s しぐさ${s.gest.toFixed(1)} 客${s.visit.toFixed(2)} 満タン${(s.full * 100).toFixed(0)}% 放置死${(s.idleShare * 100).toFixed(0)}%`).join(' | ');
const cur = { g1: [5, 9], g2: [10, 18], v: [35, 60], max: 15, grow: 0, restK: 0, restLen: 0, restPull: 0, pg: 0.2, pv: 0.3 };
const rc = evalC(cur, 3000); console.log('現在(v19)', fmt(rc), 'score', score(rc).toFixed(2));
let best = null, tried = 0;
for (const g1 of [[5, 9], [3, 6]]) for (const v of [[35, 60], [25, 45], [18, 30]]) for (const max of [15, 18, 20, 24]) for (const grow of [0, 6, 10])
for (const restK of [0, 3, 4, 5]) for (const restLen of [5, 7, 9]) for (const restPull of [0, 10]) for (const pg of [0.1, 0.2]) for (const pv of [0.1, 0.18, 0.3]) {
  if (!restK && (restLen !== 5 || restPull)) continue;
  const C = { g1, g2: [10, 18], v, max, grow, restK, restLen, restPull, pg, pv };
  const r = evalC(C, 160), sc = score(r); tried++;
  if (!best || sc > best.sc) best = { sc, C };
}
// 上位の近くを細かく
const top = best.C; let best2 = { sc: -1e9 };
for (const max of [top.max - 2, top.max, top.max + 2]) for (const grow of [top.grow, top.grow ? top.grow + 2 : 8]) for (const restLen of [top.restLen - 1, top.restLen, top.restLen + 1]) for (const pv of [top.pv * 0.8, top.pv, top.pv * 1.2]) for (const pg of [top.pg * 0.8, top.pg, top.pg * 1.3]) {
  const C = Object.assign({}, top, { max, grow, restLen, pv, pg }); const r = evalC(C, 800), sc = score(r); if (sc > best2.sc) best2 = { sc, C };
}
console.log('tried', tried, 'BEST', JSON.stringify(best2.C));
const rb = evalC(best2.C, 5000); console.log('BEST', fmt(rb), 'score', score(rb).toFixed(2));
