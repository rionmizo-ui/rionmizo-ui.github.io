// touch.js — 世話：ふれあい（人の指）と網
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import { WATER, FLOOR } from './consts.js';
import { rnd, clamp, ease } from './util.js';

export default function install(G) {
  Object.assign(G, { scoop });
  const { actClean, actFeed, fish, g, mouthX, sfx, shake, swimTo, tween } = G;

  // ---------------- 人の指 ----------------
  function* fingerTo(x, y, dur) {
    if (!G.finger) G.finger = { x, y: -34 };
    const x0 = G.finger.x, y0 = G.finger.y;
    yield* tween(dur, p => { const e = ease(p); G.finger.x = x0 + (x - x0) * e; G.finger.y = y0 + (y - y0) * e; });
  }
  function* fingerOut(dur) { if (!G.finger) return; yield* fingerTo(G.finger.x, -40, dur || 0.45); G.finger = null; }
  function* fingerPoke(dx, dy) { const x0 = G.finger.x, y0 = G.finger.y; yield* tween(0.12, p => { G.finger.x = x0 + dx * p; G.finger.y = y0 + dy * p; }); yield* tween(0.15, p => { G.finger.x = x0 + dx * (1 - p); G.finger.y = y0 + dy * (1 - p); }); }

  function* actTouch() {
    const r = g.startTouch();
    const above = () => [clamp(fish.x, 30, 130), clamp(fish.y - 14, 26, 200)];
    if (r.refused) {
      // ふれあいばかりで飽きた：指が来ても、ぷいっ
      fish.free = true; fish.tx = fish.x; fish.ty = fish.y;
      yield* fingerTo(clamp(fish.x + fish.dir * 26, 28, 132), clamp(fish.y - 6, 30, 200), 0.6);
      sfx('nope'); fish.sq = 0.9; fish.dir = -fish.dir;
      fish.ex = { eyes: 'annoyed', brows: 'angry', mouth: 'pout', mark: 'anger' };
      yield* swimTo(clamp(fish.x + fish.dir * 34, 30, 130), fish.y, 55);
      yield* tween(0.5, p => { G.finger.x += Math.sin(p * 20) * 0.6; });   // 指がしょんぼり
      yield* fingerOut(0.6);
      yield 0.3; fish.ex = {};
      g.finishTouch(); return;
    }
    if (r.hungry || !r.reaction) {
      yield* fingerTo(...above(), 0.6);
      G.thought = { icon: 'food', until: G.T + 2.5 }; fish.ex = { eyes: 'teary', brows: 'worried', mouth: 'pout' };
      yield* shake(0.8); yield* fingerOut(); fish.ex = {}; return;
    }
    const acc = r.accident;
    switch (r.reaction) {
      case 'pet': {
        yield* swimTo(80, 80, 45); fish.dir = fish.face;
        if (acc === 'cat') {
          // 指だと思ったら…猫の手だった
          fish.look = 'up'; fish.ex = { eyes: 'sparkle', mouth: 'smile' };
          G.paw = { x: 80, y: -40 }; yield 0.4;
          yield* tween(0.35, p => { G.paw.y = -40 + p * 106; });
          sfx('meow'); fish.free = false; fish.vis = false; G.paw.fish = true; fish.look = null; fish.ex = {};
          yield 0.4;
          yield* tween(0.6, p => { G.paw.y = 66 - p * 120; });
          fish.vis = false; G.paw = null;
          return yield* G.deathSettle('cat');
        }
        fish.free = false;
        yield* fingerTo(80, 66, 0.6);
        // なでなで
        fish.ex = { eyes: 'closed', mouth: 'smile', blush: true, mark: 'heart' };
        for (let k = 0; k < 3; k++) {
          sfx('pet'); fish.sq = 0.4;
          yield* tween(0.5, p => { G.finger.x = 80 + Math.sin(p * Math.PI * 2) * 9; G.finger.y = 66 + Math.abs(Math.sin(p * Math.PI * 2)) * 1; fish.oy = Math.round(Math.sin(p * Math.PI * 2) * 1); });
        }
        fish.oy = 0;
        yield* fingerOut();
        fish.ex = { eyes: 'sparkle', mouth: 'grin', blush: true }; yield 0.5;
        fish.ex = {}; fish.free = true; break;
      }
      case 'jump': {
        const jx = clamp(fish.x, 40, 120);
        yield* swimTo(jx, 58, 55);
        yield* fingerTo(jx + fish.dir * 4, WATER + 6, 0.6);   // 水面に指先をちょんと浸けて構える
        fish.look = 'up'; fish.ex = { eyes: 'sparkle', mouth: 'o' }; yield 0.5; fish.look = null;
        fish.free = false; sfx('jump'); const x0 = fish.x;
        G.splash(fish.x, WATER);
        if (acc === 'bird') {
          yield* tween(0.7, p => { fish.y = 58 - p * 110; fish.rot = -fish.dir * 0.5; });
          fish.vis = false; fish.rot = 0; sfx('tweet'); fish.ex = {};
          yield* tween(0.6, p => { G.finger.x += Math.sin(p * 30) * 0.8; });   // 指もびっくり
          yield* fingerOut(0.3);
          yield 0.6;
          G.feather = { x: x0, y: -10, rot: 0 };
          yield* tween(3, p => { G.feather.y = -10 + p * (WATER + 4 + 10); G.feather.x = x0 + Math.sin(p * 9) * 8; G.feather.rot = Math.sin(p * 9) * 0.6; });
          return yield* G.deathSettle('bird');
        }
        // ジャンプして指先にタッチ
        const top = WATER + 18;
        yield* tween(0.4, p => { fish.y = 58 + (top - 58) * Math.sin(p * Math.PI / 2); fish.rot = -fish.dir * 0.5 * (1 - p); });
        yield* tween(0.25, p => { fish.y = top - Math.sin(p * Math.PI) * 14; });   // 水面からぴょんと跳ねて指先へ
        sfx('blink'); sfx('pet'); fish.sq = 1; fish.ex = { eyes: 'closed', mouth: 'grin', mark: 'heart' };
        G.fx.push({ k: 'star', x: G.finger.x, y: G.finger.y + 2, t: G.T, d: 0.5 });
        yield* fingerPoke(0, -3);
        yield* tween(0.45, p => { fish.y = top + (58 - top) * p * p; fish.rot = fish.dir * 0.4 * p; });
        fish.rot = 0; G.splash(fish.x, WATER); sfx('splash');
        yield* fingerOut(0.4);
        fish.ex = {}; fish.free = true; fish.tx = fish.x; fish.ty = fish.y;
        break;
      }
      case 'spin': {
        fish.free = false; fish.vx = fish.vy = 0;
        const cx0 = clamp(fish.x, 40, 120), cy0 = clamp(fish.y, 60, 180); fish.x = cx0; fish.y = cy0;
        const R = 24;
        yield* fingerTo(cx0 + R, cy0 - 4, 0.6);
        sfx('spin');
        if (acc === 'dizzy') {
          fish.eyes = 'dizzy';
          yield* tween(2.6, p => { const a = p * p * Math.PI * 12; G.finger.x = cx0 + Math.cos(a) * R; G.finger.y = cy0 - 4 + Math.sin(a) * R * 0.5; fish.rot = fish.dir * a; });
          yield* fingerOut(0.3);
          fish.rot = 0; fish.opts = { variant: 'dizzy', flip: true }; sfx('death');
          return yield* G.deathSettle('dizzy');
        }
        // 指が円を描くと、ついてくるりと一回転
        fish.ex = { eyes: 'sparkle', mouth: 'o' };
        yield* tween(1.5, p => { const a = ease(p) * Math.PI * 2; G.finger.x = cx0 + Math.cos(a) * R; G.finger.y = cy0 - 4 + Math.sin(a) * R * 0.5;
          fish.rot = fish.dir * a; fish.x = cx0 + Math.sin(a) * 6 * fish.dir; fish.y = cy0 - (1 - Math.cos(a)) * 6; });
        fish.rot = 0; fish.x = cx0; fish.y = cy0; fish.sq = 1; fish.ex = { eyes: 'closed', mouth: 'grin', mark: 'note' }; sfx('pet');
        yield* fingerOut(0.45);
        yield 0.3; fish.ex = {}; fish.tx = fish.x; fish.ty = fish.y; fish.free = true; break;
      }
      case 'bubble': {
        // 指先から泡がぽこっ
        const bx = clamp(fish.x + fish.dir * 34, 30, 130), by = clamp(fish.y + 6, 50, 200);
        yield* fingerTo(bx, by - 6, 0.6);
        yield* tween(0.4, p => { G.finger.x = bx + Math.sin(p * 25) * 1.5; });
        const b = { x: bx, y: by - 2, r: 4, vy: -6 };
        G.bubbles.push(b); sfx('bubble');
        yield* fingerOut(0.4);
        fish.speed = 30; fish.free = true;
        b.vy = -4; const tb = G.T;
        yield () => {
          if (!G.bubbles.includes(b)) return true;   // 届く前に水面で消えた
          fish.tx = clamp(b.x - fish.dir * 20, 25, 135); fish.ty = clamp(b.y, 36, FLOOR); fish.dir = b.x > fish.x ? 1 : -1;
          return (Math.abs(mouthX() - b.x) < 6 && Math.abs(fish.y - b.y) < 7) || G.T - tb > 4;
        };
        if (!G.bubbles.includes(b)) G.bubbles.push(b);
        if (acc === 'bubblegone') {
          G.bubbles.splice(G.bubbles.indexOf(b), 1);
          G.bigBubble = { x: fish.x, y: fish.y, r: 4 }; fish.free = false; sfx('bubble');
          yield* tween(0.8, p => { G.bigBubble.r = 4 + p * 26; G.bigBubble.x = fish.x; G.bigBubble.y = fish.y; });
          yield* tween(1.2, p => { fish.y -= 0.3; G.bigBubble.y = fish.y; });
          sfx('pop'); fish.vis = false; G.bigBubble = null;
          G.eyeball = { x: fish.x + fish.dir * 8, y: fish.y - 2 };
          return yield* G.deathSettle('bubblegone');
        }
        sfx('pop'); G.bubbles.splice(G.bubbles.indexOf(b), 1); G.popFx(b.x, b.y);
        fish.ex = { eyes: 'closed', mouth: 'grin', mark: 'note' }; yield 0.8; fish.ex = {}; break;
      }
      case 'hoop': {         // 指の輪をくぐる
        const hx = clamp(fish.x < 80 ? fish.x + 40 : fish.x - 40, 50, 110), hy = clamp(fish.y, 70, 170);
        G.hoop = { x: hx, y: -30 };
        yield* tween(0.6, p => { G.hoop.y = -30 + (hy + 30) * ease(p); });
        const side = fish.x < hx ? -1 : 1;
        yield* swimTo(hx + side * 36, hy, 55);
        fish.ex = { eyes: 'sparkle', mouth: 'o' }; fish.dir = -side; yield 0.3;
        sfx('jump'); fish.free = false; const x0 = fish.x;
        yield* tween(0.6, p => { fish.x = x0 - side * 72 * ease(p); fish.y = hy - Math.sin(p * Math.PI) * 3; });
        sfx('fanfare'); fish.sq = 1; fish.ex = { eyes: 'closed', mouth: 'grin', mark: 'note' };
        for (let i = 0; i < 8; i++) G.fx.push({ k: 'star', x: hx + rnd(-12, 12), y: hy + rnd(-12, 12), t: G.T + i * 0.05, d: 0.5 });
        yield* tween(0.5, p => { G.hoop.y = hy - (hy + 40) * ease(p); });
        G.hoop = null; fish.ex = {}; fish.free = true; fish.tx = fish.x; fish.ty = fish.y; break;
      }
      case 'deadplay': {     // 死んだふり → ジャーン
        fish.free = false; fish.tx = fish.x; fish.ty = fish.y;
        yield* fingerTo(clamp(fish.x, 30, 130), clamp(fish.y - 14, 26, 200), 0.6);
        yield* fingerPoke(0, 6); sfx('death');
        fish.opts = { flip: true }; fish.eyes = 'x'; fish.ex = {};
        yield* tween(0.8, p => { fish.y -= 0.2; });
        yield* fingerPoke(0, 6); yield 0.3; yield* fingerPoke(0, 6);
        sfx('fanfare'); fish.opts = {}; fish.eyes = 'normal'; fish.sq = 1.4; fish.ex = { eyes: 'sparkle', mouth: 'tongue', mark: '!' };
        yield* tween(0.3, p => { fish.oy = -Math.round(Math.sin(p * Math.PI) * 8); });
        fish.oy = 0; yield* fingerOut(0.4); yield 0.3; fish.ex = {}; fish.free = true; break;
      }
      case 'handstand': {    // 逆立ちして尾をふりふり
        yield* swimTo(clamp(fish.x, 40, 120), FLOOR - 22, 50);
        fish.free = false; sfx('spin');
        yield* tween(0.4, p => { fish.rot = fish.face * (Math.PI / 2) * ease(p); });
        fish.ex = { eyes: 'closed', mouth: 'grin', wag: 3 };
        yield* fingerTo(fish.x + 22, FLOOR - 40, 0.5);
        for (let k = 0; k < 4; k++) { sfx('pet'); yield* tween(0.2, p => { G.finger.x += Math.sin(p * Math.PI * 2) * 1.5; }); }   // 指で拍手
        yield* tween(0.4, p => { fish.rot = fish.face * (Math.PI / 2) * (1 - ease(p)); });
        fish.rot = 0; yield* fingerOut(0.4); fish.ex = {}; fish.free = true; break;
      }
      case 'highfive': {     // 跳び上がって尾でハイタッチ
        const fx0 = clamp(fish.x, 40, 120);
        yield* swimTo(fx0, 80, 55);
        yield* fingerTo(fx0 + fish.face * 6, 44, 0.5);
        fish.free = false; fish.ex = { eyes: 'sparkle', mouth: 'grin' };
        sfx('jump'); const y0 = fish.y;
        yield* tween(0.35, p => { fish.y = y0 - 30 * Math.sin(p * Math.PI / 2); fish.rot = -fish.face * p * Math.PI; });
        sfx('blink'); sfx('pet'); G.fx.push({ k: 'star', x: G.finger.x, y: G.finger.y + 2, t: G.T, d: 0.6 });
        G.fx.push({ k: 'text', s: 'パチッ', x: G.finger.x, y: G.finger.y - 4, t: G.T, d: 0.9, c: '#ffffff' });
        yield* fingerPoke(0, -3);
        yield* tween(0.4, p => { fish.y = y0 - 30 * (1 - p); fish.rot = -fish.face * Math.PI * (1 + p); });
        fish.rot = 0; yield* fingerOut(0.4); fish.ex = {}; fish.free = true; fish.tx = fish.x; fish.ty = fish.y; break;
      }
      case 'ball': {         // 指が落としたボールを、鼻でリフティング
        const bx = clamp(fish.x, 40, 120);
        yield* fingerTo(bx, 6, 0.5);
        G.ball = { x: bx, y: 8, vy: 0 };
        yield* fingerOut(0.3);
        yield* tween(0.35, p => { G.ball.y = 8 + (WATER - 8) * p * p; });
        G.splashAt(bx, 10); sfx('chapon');
        yield* swimTo(bx - fish.face * 0, WATER + 14, 60);
        fish.free = false; fish.dir = fish.face;
        for (let k = 0; k < 4; k++) {
          sfx('boing'); fish.sq = 1; fish.ex = { eyes: 'closed', mouth: 'o' };
          const h = 22 + k * 4;
          yield* tween(0.55, p => { G.ball.y = WATER - 2 - Math.sin(p * Math.PI) * h; G.ball.x = bx + Math.sin(k) * 3 * p; });
          G.splashAt(G.ball.x, 6);
        }
        sfx('fanfare'); fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: 'note' };
        yield* fingerTo(G.ball.x, WATER - 4, 0.4); G.ball = null; yield* fingerOut(0.4);
        fish.ex = {}; fish.free = true; break;
      }
      case 'kiss': {         // 指先にちゅっ
        yield* swimTo(clamp(fish.x, 40, 120), clamp(fish.y, 70, 170), 45);
        fish.free = false;
        yield* fingerTo(fish.x + fish.face * 26, fish.y - 2, 0.6);
        fish.ex = { eyes: 'closed', mouth: 'o', blush: true };
        const x0 = fish.x; yield* tween(0.3, p => { fish.x = x0 + fish.face * 5 * p; });
        sfx('pet'); sfx('blink'); fish.ex = { eyes: 'closed', mouth: 'o', blush: true, mark: 'heart' };
        for (let i = 0; i < 6; i++) G.fx.push({ k: 'heart', x: G.finger.x, y: G.finger.y, t: G.T + i * 0.12, d: 1.0, vx: rnd(-10, 10) });
        yield* fingerPoke(0, -2); yield 0.5;
        yield* tween(0.3, p => { fish.x = x0 + fish.face * 5 * (1 - p); });
        yield* fingerOut(0.5); fish.ex = {}; fish.free = true; break;
      }
      case 'puff': {
        // お腹をつんっ → ぷくっ
        fish.free = false; fish.tx = fish.x; fish.ty = fish.y;
        yield* fingerTo(clamp(fish.x - fish.dir * 2, 28, 132), clamp(fish.y - 16, 26, 200), 0.6);
        yield* fingerPoke(0, 6); fish.sq = 1; fish.ex = { eyes: 'surprised', mouth: 'o' };
        sfx('puff'); fish.opts = { puff: true };
        if (acc === 'floataway') {
          yield* fingerTo(G.finger.x - 18, G.finger.y - 10, 0.3);
          yield 0.6; fish.ex = {}; fish.eyes = 'dizzy'; fish.opts = { variant: 'floataway', puff: true, balloon: true };
          yield* fingerOut(0.4);
          yield* tween(3.0, p => { fish.y = fish.y - 0.5 - p; fish.ox = Math.round(Math.sin(p * 20)); });
          fish.vis = false; fish.ox = 0;
          return yield* G.deathSettle('floataway');
        }
        yield* fingerOut(0.45);
        yield 0.5; fish.opts = {}; sfx('pop'); fish.sq = 1; fish.ex = { eyes: 'closed', mouth: 'grin' }; yield 0.4; fish.ex = {}; fish.free = true; break;
      }
    }
    G.finger = null;
    fish.eyes = 'normal';
    G.reward(g.finishTouch());
  }

  // 網ですくう：斜め上から水に入り、獲物の下へもぐって、袋に入れて持ち上げる
  // target: { x, y, inNet } を持つもの（魚・目玉・羽・アヒル）。null なら空振り
  function* scoop(target, opts) {
    opts = opts || {};
    const tx = target ? clamp(target.x, 30, 130) : clamp(opts.x || 80, 30, 130);
    const ty = target ? clamp(target.y, 30, FLOOR) : clamp(opts.y || 120, 30, FLOOR);
    G.net = { x: tx + 34, y: -34, tilt: -0.35, sag: 0.3, wet: false, drip: false };
    sfx('net');
    // 1) 斜めに水へ入って、獲物の少し下へ
    yield* tween(0.7, p => { const e = ease(p); G.net.x = tx + 34 * (1 - e); G.net.y = -34 + (ty + 16 + 34) * e; G.net.tilt = -0.35 * (1 - e); });
    G.net.wet = true;
    if (opts.dodge) { yield* opts.dodge(); }
    // 2) すくい上げ：袋に入れる
    let caught = false;
    yield* tween(0.35, p => {
      G.net.y = ty + 16 - 12 * ease(p);
      if (target && !caught && p > 0.45) { caught = true; target.inNet = true; sfx('splash'); }
      if (caught) { target.x = G.net.x + 2 + Math.sin(G.T * 18) * 1.2; target.y = G.net.y + (target === fish ? 14 : 10); G.net.sag = 1; }
    });
    if (!target) sfx('nope');
    if (opts.struggle && target) { for (let k = 0; k < 4; k++) { yield* tween(0.18, p => { target.x = G.net.x + Math.sin(p * Math.PI * 2) * 3; G.net.tilt = Math.sin(p * Math.PI * 2) * 0.08; }); } }
    yield 0.25;
    // 3) 持ち上げて水から出す（しずく）
    const y0 = G.net.y;
    yield* tween(1.0, p => {
      const e = p * p; G.net.y = y0 + (-60 - y0) * e; G.net.tilt = 0.25 * e;
      if (G.net.y < WATER) G.net.drip = true;
      if (target && target.inNet) { target.x = G.net.x + 2 + Math.sin(G.T * 10) * 1; target.y = G.net.y + (target === fish ? 14 : 10); }
    });
    if (target) target.inNet = false;
    G.net = null;
  }

  function* actNet() {
    const r = g.net();
    if (r.caught) {
      fish.free = false; fish.eyes = 'dizzy';
      yield* scoop(fish, { struggle: true });
      fish.vis = false;
      g.die('netted'); G.causeId = 'netted'; G.mode = 'dead';
      sfx('death'); yield 0.6;
      G.showCard('netted'); return 'dead';
    }
    // 逃げる：網が近づくと、さっと下へ
    yield* scoop(null, { x: fish.x, y: fish.y, dodge: function* () {
      fish.free = true; fish.speed = 95; fish.turn = 8; fish.tx = clamp(fish.x + rnd(-45, 45), 25, 135); fish.ty = 200; fish.sq = 1;
      fish.ex = { eyes: 'surprised', mouth: 'o' }; yield 0.15; } });
    fish.ex = {}; fish.speed = 25;
    if (r.smug) { fish.smugUntil = G.T + 2.2; sfx('smug'); yield 1; }
  }

  const ACTIONS = { feed: actFeed, clean: actClean, touch: actTouch, net: actNet }; Object.assign(G, { ACTIONS });
}
