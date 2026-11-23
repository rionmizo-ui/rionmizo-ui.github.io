// visitors.js — お客さん（巻貝・カニ・エビ）
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import S from '../art/sprites.js';
import { W, WATER, FLOOR } from './consts.js';
import { rnd, clamp } from './util.js';
import { makeRunner } from './runner.js';

export default function install(G) {
  Object.assign(G, { updateVisitor, drawVisitorBack, drawVisitorFront });
  const { ctx, fish, go, sfx } = G;

  // ---------------- お客さん（巻貝・カニ・エビ） ----------------
  function updateVisitor(dt, idle) {
    if (G.mode !== 'play') { if (G.visitor && G.mode !== 'dead') G.visitor = null; return; }
    if (!G.visitor) {
      if (idle && !G.gest && G.T > G.visitAt) {
        const kind = G.forceVisitor || ['snail', 'crab', 'shrimp'][Math.random() * 3 | 0];
        const from = Math.random() < 0.5 ? -1 : 1;
        G.visitor = kind === 'snail' ? { kind, x: rnd(30, 130), y: WATER + 4, vx: rnd(-3, 3), vy: 7, t0: G.T }
          : kind === 'crab' ? { kind, x: from < 0 ? -12 : W + 12, y: FLOOR + 2, vx: -from * 16, vy: 0, t0: G.T }
          : { kind, x: from < 0 ? -12 : W + 12, y: rnd(70, 170), vx: -from * 26, vy: 0, t0: G.T, hop: 0 };
        sfx(kind === 'crab' ? 'hic' : 'bubble');
        if (!G.busy) { G.gestAt = Math.max(G.gestAt, G.T + 8); fish.cruise = false; fish.wps = []; G.gest = makeRunner(gVisitor(G.visitor), { limit: 20, maxSteps: 20, label: 'visitor' }); }
      }
      return;
    }
    const v = G.visitor;
    if (v.kind === 'snail') {
      if (!(v.hideUntil > G.T)) { v.x += v.vx * dt; v.y += v.vy * dt; }
      if (v.y > FLOOR - 4 || G.T - v.t0 > 24) { G.visitor = null; G.visitAt = G.T + rnd(35, 60); }
    } else if (v.kind === 'crab') {
      if (!(v.pauseUntil > G.T)) v.x += v.vx * dt;
      if (Math.random() < dt * 0.4) v.pauseUntil = G.T + rnd(0.4, 1.0);
      if (v.x < -20 || v.x > W + 20) { G.visitor = null; G.visitAt = G.T + rnd(35, 60); }
    } else {
      v.hop += dt; const ph = (v.hop % 0.9) / 0.9;
      v.x += v.vx * dt * (ph < 0.35 ? 2.2 : 0.3); v.y += Math.sin(G.T * 2) * 4 * dt;
      v.jump = ph < 0.35;
      if (v.x < -20 || v.x > W + 20) { G.visitor = null; G.visitAt = G.T + rnd(35, 60); }
    }
  }
  function drawVisitorBack() {   // 砂の上・水中のもの（魚より奥）
    const v = G.visitor; if (!v) return;
    if (v.kind === 'crab' && S.drawCrab) S.drawCrab(ctx, Math.round(v.x), Math.round(v.y), G.T, { pinch: v.pinch, angry: v.angry });
    if (v.kind === 'shrimp' && S.drawShrimp) S.drawShrimp(ctx, Math.round(v.x), Math.round(v.y), G.T, { dir: v.vx > 0 ? 1 : -1, jump: v.jump });
  }
  function drawVisitorFront() {  // ガラスに張りつくもの（魚より手前）
    const v = G.visitor; if (!v) return;
    if (v.kind === 'snail' && S.drawSnail) S.drawSnail(ctx, Math.round(v.x), Math.round(v.y), G.T, { rot: Math.atan2(v.vy, v.vx), surprised: v.hideUntil > G.T });
  }
  // 魚がお客さんに反応する
  function* gVisitor(v) {
    yield 0.6;
    if (v.kind === 'snail') {
      fish.ex = { eyes: 'surprised', mark: '?' };
      for (let k = 0; k < 3; k++) { yield go(v.x - fish.face * 24, v.y + 4, 40); fish.dir = v.x > fish.x ? 1 : -1; fish.ex = { eyes: 'sparkle', mouth: 'o' }; yield 0.6; }
      v.hideUntil = G.T + 2.2; sfx('pop'); fish.ex = { eyes: 'surprised', mouth: 'o', mark: '!' }; fish.sq = 1; yield 0.8;
      fish.ex = { eyes: 'side', mouth: 'wavy' }; yield 0.8;
    } else if (v.kind === 'crab') {
      fish.ex = { eyes: 'sparkle', mark: '?' };
      yield go(v.x - fish.face * 26, FLOOR - 14, 45);
      yield () => { fish.tx = clamp(v.x - fish.face * 24, 24, 136); fish.ty = FLOOR - 14; fish.dir = v.x > fish.x ? 1 : -1; return Math.abs(fish.x - fish.tx) < 4 || v.x < -10 || v.x > W + 10; };
      if (G.visitor !== v) return;
      // チョキン！
      v.pinch = true; v.angry = true; v.pauseUntil = G.T + 1.2; sfx('bonk'); fish.sq = 1.3;
      fish.ex = { eyes: 'teary', mouth: 'o', mark: 'anger', sweat: true };
      G.fx.push({ k: 'text', s: 'チョキン', x: v.x, y: v.y - 14, t: G.T, d: 0.9, c: '#ff5a5a' });
      yield go(fish.x - fish.face * 50, FLOOR - 70, 95);
      v.pinch = false;
      fish.ex = { eyes: 'teary', brows: 'worried', mouth: 'wavy' }; yield 1.0;
    } else {
      fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: '!' };
      for (let k = 0; k < 6 && G.visitor === v; k++) { fish.ex = { eyes: 'sparkle', mouth: k % 2 ? 'o' : 'grin' }; yield go(v.x - Math.sign(v.vx) * 26, v.y, 75); }
      fish.ex = { eyes: 'side', mouth: 'pout', mark: '?' }; yield 0.9;
    }
  }
}
