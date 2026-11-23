// endings.js — 満タン時の結末
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import { WATER, FLOOR } from './consts.js';
import { rnd, ease } from './util.js';

export default function install(G) {
  Object.assign(G, { startEnding, resumeEnding });
  const { A, collect, fish, g, resetScene, sfx, startTask, swimTo, tween } = G;

  // ---------------- 満タン時の結末 ----------------
  // 変身後の完成形（交互表示でもこの姿を見せる）
  const END_LOOK = {
    bug: {}, duck: {}, moss: { moss: true }, stone: { stone: true }, split: { split: false }, skeleton: { skeleton: true },
    overeat: { belly: true }, cramped: { scale: 3.3 }, fishman: { legs: true }, oldage: { wrinkles: true },
    dragon: { dragon: true }, golden: { palette: 'gold', shine: true }, bald: { bald: true }, hermit: {}, idol: { idol: true }, round: { round: true },
  };
  const SPLIT_AT = 0.8;   // 二つ目の頭がここまで育って止まる
  function startEnding() {
    G.mode = 'ending'; G.busy = true; G.queued = null; G.thought = null;
    const id = g.decideEnding();
    try { g.save && g.save(); } catch (e) {}
    playEnding(id);
  }
  function resumeEnding(id) {
    resetScene(); fish.vis = true; fish.x = 80; fish.y = 110; G.mode = 'ending'; G.busy = true;
    playEnding(id);
  }
  function playEnding(id) {
    G.causeId = id; A.setSong(null);
    startTask(function* () {
      sfx('fanfare');
      yield* swimTo(80, 115, 45); fish.free = false; fish.dir = 1;
      yield 0.6;
      // 変身前 ⇄ 変身後をだんだん速く交互に見せ、変身後で止める
      const look = END_LOOK[id] || {};
      if (id !== 'duck') {
        const beats = [0.55, 0.5, 0.42, 0.36, 0.3, 0.24, 0.19, 0.15, 0.12, 0.1, 0.09, 0.08];
        for (let k = 0; k < beats.length; k++) {
          const after = k % 2 === 1;
          applyLook(id, after, look);
          G.fx.push({ k: 'flash', t: G.T, d: 0.05 });
          sfx(after ? 'pet' : 'blink');
          yield beats[k];
        }
        applyLook(id, true, look);
        G.fx.push({ k: 'flash', t: G.T, d: 0.12 }); sfx('fanfare');
        for (let i = 0; i < 10; i++) G.fx.push({ k: 'drop', x: fish.x, y: fish.y, vx: Math.cos(i * 0.63) * 40, vy: Math.sin(i * 0.63) * 40 - 20, t: G.T, d: 0.7 });
        yield 0.8;
      }
      yield* (ENDINGS[id] || ENDINGS.oldage)();
      // 網待ち
      G.netReady = true; G.mode = 'dead';
      if (G.netQueued) { G.netQueued = false; collect(); }
    });
  }
  function applyLook(id, on, look) {
    fish.opts = on ? Object.assign({ variant: id }, look) : {};
    fish.splitHead = on && id === 'split' ? SPLIT_AT : 0;
    fish.hermit = on && id === 'hermit';
    fish.glitch = on && id === 'bug';
    fish.legLen = on && id === 'fishman' ? Math.round(FLOOR + 4 - fish.y - 12) : 0;
    fish.eyes = 'normal';
  }
  const ENDINGS = {
    *bug() {
      for (let k = 0; k < 8; k++) { sfx('pu'); G.puText = G.T + 0.5; yield 0.5; }
      // 網が来るまで続く（ループはupdate側で）
    },
    *duck() {
      // ブラシがどくと、アヒル
      G.brush = { x: 175, y: 30, a: 0 }; G.sparkle = true;
      const spots = [[80, 115], [60, 80], [100, 150]];
      for (const [sx, sy] of spots) {
        const bx0 = G.brush.x, by0 = G.brush.y;
        yield* tween(0.3, p => { G.brush.x = bx0 + (sx - bx0) * p; G.brush.y = by0 + (sy - by0) * p; });
        for (let k = 0; k < 2; k++) { sfx('brush'); yield* tween(0.2, p => { G.brush.a = Math.sin(p * Math.PI * 2) * 8; }); }
        if (sx === 80) fish.vis = false;
      }
      const bx0 = G.brush.x, by0 = G.brush.y;
      yield* tween(0.5, p => { G.brush.x = bx0 + (180 - bx0) * p; G.brush.y = by0 - p * 60; });
      G.brush = null; fish.vis = false;
      G.duck = { x: 80, y: WATER - 4 }; sfx('quack');
      yield 2;
    },
    *moss() {
      for (let k = 0; k < 4; k++) { fish.eyes = 'sleepy'; sfx('blink'); yield 0.3; fish.eyes = 'normal'; yield 0.6; }
      fish.eyes = 'x'; sfx('death'); yield* settleY(FLOOR - 6, 2);
    },
    *stone() {
      fish.eyes = 'normal';
      yield* tween(0.7, p => { fish.y = 115 + (FLOOR - 4 - 115) * p * p; });
      sfx('koton'); yield 0.5;
      for (let k = 0; k < 5; k++) { fish.dir = -fish.dir; yield 0.6; }
    },
    *split() {
      // もう一つの頭が生えかけて…止まる
      fish.eyes = 'wide';
      for (let k = 0; k < 3; k++) {
        sfx('puff');
        yield* tween(0.45, p => { fish.splitHead = SPLIT_AT + Math.sin(p * Math.PI) * 0.12; fish.ox = Math.round(Math.sin(p * 40)); });
        yield 0.25;
      }
      fish.ox = 0; fish.splitHead = SPLIT_AT;
      fish.eyes = 'dizzy'; yield 0.7;
      fish.eyes = 'x'; sfx('death'); yield 0.6;
      yield* settleY(WATER + 12, 2);
    },
    *skeleton() { fish.eyes = 'x'; sfx('death'); yield* settleY(WATER + 10, 2.5); },
    *overeat() {
      for (let k = 0; k < 4; k++) { fish.ox = (k % 2) * 2; yield 0.4; }
      fish.ox = 0; fish.eyes = 'x'; sfx('death'); yield* settleY(FLOOR - 10, 2.5);
    },
    *cramped() {
      sfx('grow');
      for (let k = 0; k < 4; k++) { fish.ox = (k % 2) * 2 - 1; sfx('koton'); yield 0.35; }   // ガラスにつかえてもがく
      fish.ox = 0; fish.eyes = 'dizzy'; yield 1; fish.eyes = 'x'; sfx('death'); yield 1;
    },
    *fishman() {
      // 脚がぐんぐん伸びて底に立つ → 水の中で溺れる
      fish.eyes = 'wide'; fish.opts = { variant: 'fishman', legs: true, drown: true };
      for (let k = 0; k < 6; k++) { fish.oy = (k % 2) * -2; sfx('splash'); G.bubbles.push({ x: fish.x + fish.dir * 20, y: fish.y - 4, r: 2, vy: -14 }); yield 0.35; }
      fish.oy = 0; fish.eyes = 'x'; sfx('death'); yield 1.5;
    },
    *oldage() {
      fish.eyes = 'sleepy'; yield 1.5; fish.eyes = 'x'; sfx('death');
      fish.opts = Object.assign({}, fish.opts, { flip: true });
      yield* settleY(WATER + 10, 3);
    },
  };
  Object.assign(ENDINGS, {
    *dragon() {             // 竜になって天へ
      sfx('grow');
      yield* tween(1.6, p => { fish.oy = Math.round(Math.sin(p * Math.PI * 4) * 3); });
      fish.oy = 0; sfx('fanfare');
      const x0 = fish.x, y0 = fish.y;
      for (let i = 0; i < 12; i++) G.fx.push({ k: 'drop', x: fish.x, y: fish.y, vx: Math.cos(i) * 50, vy: Math.sin(i) * 50 - 20, t: G.T, d: 0.9 });
      yield* tween(2.6, p => { fish.y = y0 + (-80 - y0) * ease(p); fish.x = x0 + Math.sin(p * 10) * 14; });
      fish.vis = false; yield 0.8;
    },
    *golden() {             // 純金になって、ずしん
      fish.eyes = 'closed'; sfx('fanfare');
      for (let i = 0; i < 14; i++) G.fx.push({ k: 'star', x: fish.x + rnd(-24, 24), y: fish.y + rnd(-14, 14), t: G.T + i * 0.08, d: 0.6 });
      yield 1.4; fish.eyes = 'x';
      yield* settleY(FLOOR - 8, 0.7); sfx('koton'); fish.sq = 1; yield 1;
    },
    *bald() {               // ストレスで、うろこがはらはら
      fish.eyes = 'teary';
      for (let i = 0; i < 12; i++) G.scales.push({ x: fish.x + rnd(-14, 14), y: fish.y + rnd(-8, 8), vy: rnd(8, 16), vx: rnd(-6, 6), rot: rnd(0, 6), t: G.T + i * 0.15 });
      yield 2.4; fish.eyes = 'x'; sfx('death');
      yield* settleY(WATER + 10, 2.5);
    },
    *hermit() {             // 人間不信で砂の中へ
      sfx('splash'); fish.x = 80;
      yield 3.5;
    },
    *idol() {               // アイドルとして燃え尽きる
      G.spot = { x: fish.x, y: fish.y };
      fish.eyes = 'sparkle'; sfx('dance');
      yield* tween(2.2, p => { fish.oy = -Math.round(Math.abs(Math.sin(p * Math.PI * 6)) * 5); if ((p * 12 | 0) % 3 === 0) fish.sq = 0.5; });
      sfx('dance'); yield 0.8;
      fish.oy = 0; fish.eyes = 'x'; sfx('death');
      yield* settleY(WATER + 10, 2.5);
    },
    *round() {              // まんまるになって、ころころ
      const x0 = fish.x;
      yield* tween(1.8, p => { fish.x = x0 + Math.sin(p * Math.PI * 2) * 30; fish.rot = Math.sin(p * Math.PI * 2) * 30 / 14; fish.oy = -Math.round(Math.abs(Math.sin(p * Math.PI * 4)) * 3); });
      fish.rot = 0; fish.oy = 0; fish.x = x0; fish.eyes = 'closed'; yield 1; fish.eyes = 'x'; sfx('death');
      yield* settleY(WATER + 12, 2.5);
    },
  });

  function* settleY(ty, dur) { const y0 = fish.y; yield* tween(dur, p => { fish.y = y0 + (ty - y0) * ease(p); }); }
}
