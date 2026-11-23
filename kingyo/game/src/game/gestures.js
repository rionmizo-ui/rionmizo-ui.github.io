// gestures.js — ふだんの表情・ひまなときのしぐさ・しぐさ中の突然死
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import { FLOOR } from './consts.js';
import { rnd, clamp, ease } from './util.js';
import { makeRunner, stepRunner, DONE } from './runner.js';

export default function install(G) {
  Object.assign(G, { moodFace, startGesture, playGesture, endGesture, stepGesture, gShowOff });
  const { AIR_X, fish, g, mouthX, sfx, startTask, tween } = G;

  // ---------------- ふだんの表情 ----------------
  function moodFace() {
    const s = g.s, ex = fish.ex = {};
    fish.eyes = 'normal';
    if (G.T < fish.smugUntil) { fish.eyes = 'smug'; ex.brows = 'up'; return; }
    if (s.satiety <= 0.01) { fish.eyes = 'teary'; ex.mouth = 'pout'; ex.brows = 'worried'; return; }
    if (s.stress >= 75) { fish.eyes = 'annoyed'; ex.brows = 'angry'; ex.mouth = 'wavy'; return; }
    if (s.dirt >= 3) { fish.eyes = 'side'; ex.brows = 'down'; ex.mouth = 'wavy'; return; }
    if (s.stress <= 10) { ex.blush = true; }
  }

  // ---------------- しぐさ（ひまなときのバリエーション） ----------------
  function startGesture() {
    const s = g.s;
    const pool = [];
    const add = (fn, w) => { for (let i = 0; i < w; i++) pool.push(fn); };
    add(gLookAtYou, 3); add(gYawn, 2); add(gHiccup, 2); add(gBlowBubbles, 3); add(gTailChase, 2);
    add(gBonk, 2); add(gNibblePlant, 2); add(gDance, s.stress <= 30 ? 3 : 1); add(gPeek, 2); add(gShowOff, 2); add(gTongue, 1);
    add(gNap, s.satiety >= 12 ? 3 : 1);
    add(gDig, 4); add(gPebble, 2); add(gBubbleRide, 3); add(gSandHide, 2); add(gRoll, 2);   // 画面下でやること
    if (s.dirt >= 2) add(gSneeze, 4);
    if (s.satiety <= 4) add(gHungry, 5);
    if (s.stress >= 60) add(gNervous, 5);
    const pe = s.persona;
    if (pe === 'glutton') add(gHungry, 3);
    if (pe === 'lazy') add(gNap, 4);
    if (pe === 'showoff') { add(gShowOff, 3); add(gDance, 3); add(gLookAtYou, 2); }
    if (pe === 'timid') add(gNervous, 3);
    if (pe === 'clingy') { add(gLookAtYou, 3); add(gPeek, 2); }
    if (pe === 'neat' && s.dirt >= 1) add(gSneeze, 3);
    let fn = pool[Math.random() * pool.length | 0];
    for (let k = 0; k < 5 && fn === G.lastGest; k++) fn = pool[Math.random() * pool.length | 0];   // 同じしぐさを続けない
    G.lastGest = fn;
    fish.cruise = false; fish.wps = [];
    G.gest = makeRunner(fn(), { limit: 20, maxSteps: 20, label: 'gesture' });
  }

  // ---------------- しぐさ中の突然死 ----------------
  function gestDeath(id, side) {
    G.gest = null; fish.ex = {}; fish.rot = 0; fish.oy = 0; fish.ox = 0;
    G.busy = true; G.queued = null; fish.cruise = false; fish.free = false;
    startTask(function* () { yield* GDEATH[id](side); });
  }
  const GDEATH = {
    *stuck(side) {          // 勢いあまってガラスに刺さる
      side = side || (fish.x < 80 ? -1 : 1);
      sfx('bonk'); sfx('zap'); fish.dir = fish.face = side; fish.turnP = 0;
      G.crack = { x: side < 0 ? 17 : 143, y: Math.round(fish.y), size: 16 };
      fish.x = side < 0 ? 30 : 130;
      fish.opts = { variant: 'stuck', stuck: true }; fish.eyes = 'x';
      G.fx.push({ k: 'star', x: G.crack.x, y: G.crack.y, t: G.T, d: 0.8 });
      yield 0.8;
      return yield* G.deathSettle('stuck', true);
    },
    *hiccupfly() {          // 最後のしゃっくりで昇天
      sfx('hic'); sfx('boing'); fish.sq = 1.4; fish.eyes = 'closed';
      yield* tween(0.3, p => { fish.oy = -Math.round(Math.sin(p * Math.PI) * 10); });
      fish.oy = 0; fish.opts = { variant: 'hiccupfly', halo: true, wings: true }; sfx('fanfare');
      const x0 = fish.x, y0 = fish.y;
      yield* tween(3.2, p => { fish.y = y0 + (-40 - y0) * p; fish.x = x0 + Math.sin(p * 9) * 6; });
      fish.vis = false;
      return yield* G.deathSettle('hiccupfly');
    },
    *knotted() {            // しっぽを追いすぎて結んじゃう
      sfx('spin'); fish.free = false;
      yield* tween(0.6, p => { fish.rot = fish.face * p * Math.PI * 4; });
      fish.rot = 0; sfx('koton'); fish.sq = 1.2;
      fish.opts = { variant: 'knotted', knot: true }; fish.eyes = 'x';
      yield 0.8;
      return yield* G.deathSettle('knotted');
    },
    *flat() {               // くしゃみの反動でガラスにぺたん
      const side = -fish.face, wx = side < 0 ? 26 : 134, x0 = fish.x;
      yield* tween(0.22, p => { fish.x = x0 + (wx - x0) * p * p; });
      sfx('bonk'); sfx('splash'); fish.sq = 0;
      fish.opts = { variant: 'flat', flat: true }; fish.eyes = 'x';
      yield 0.6;
      const y0 = fish.y; yield* tween(3, p => { fish.y = y0 + 40 * p; });   // ずるずる滑り落ちる
      return yield* G.deathSettle('flat', true);
    },
    *nowake() {             // うたた寝のまま、魂が抜ける
      fish.eyes = 'closed'; fish.opts = { variant: 'nowake', soul: false };
      yield 0.6; sfx('yawn');
      G.soul = { x: fish.x, y: fish.y - 6 };
      const x0 = G.soul.x, y0 = G.soul.y;
      yield* tween(3.5, p => { G.soul.y = y0 + (-30 - y0) * p; G.soul.x = x0 + Math.sin(p * 8) * 6; });
      G.soul = null;
      return yield* G.deathSettle('nowake', true);
    },
    *overhere() {           // のぞきこみすぎて、ガラスのこっち側へ
      sfx('grow');
      yield* tween(0.8, p => { fish.opts = { scale: Math.round((1.5 + 0.8 * p) * 20) / 20 }; });
      fish.vis = false; fish.opts = {};
      G.bigFace = { p: 0 };
      yield* tween(1.2, p => { G.bigFace.p = ease(p); });
      sfx('gulp'); sfx('splash'); G.fx.push({ k: 'flash', t: G.T, d: 0.15 });
      yield 0.4; G.bigFace = null;
      G.smear = { x: 80, y: 120, size: 70 };
      yield 1;
      return yield* G.deathSettle('overhere');
    },
  };
  const GDEATH_GEST = { stuck: 'bonk', hiccupfly: 'hiccup', knotted: 'tail', flat: 'sneeze', nowake: 'nap', overhere: 'peek' }; Object.assign(G, { GDEATH_GEST });

  // ---------------- 画面下でのしぐさ ----------------
  function sandPuff(x, y, n) { for (let i = 0; i < (n || 8); i++) G.fx.push({ k: 'sand', x: x + rnd(-6, 6), y, vx: rnd(-25, 25), vy: rnd(-35, -12), t: G.T, d: 0.8 }); }
  function* gDig() {             // 砂を掘る → ときどき宝物
    yield go(rnd(30, 130), FLOOR - 10, 45);
    fish.free = false; fish.ex = { eyes: 'closed', mouth: 'o' };
    yield* tween(0.3, p => { fish.rot = fish.face * 0.7 * p; });
    for (let k = 0; k < 3; k++) { sfx('brush'); sandPuff(mouthX(), FLOOR + 2, 7); yield* tween(0.35, p => { fish.ox = Math.round(Math.sin(p * Math.PI * 4) * 2); }); }
    fish.ox = 0;
    yield* tween(0.25, p => { fish.rot = fish.face * 0.7 * (1 - p); });
    fish.rot = 0;
    if (Math.random() < 0.5 && G.treasures.length < 10) {
      const kind = ['coin', 'shell', 'star', 'coin', 'crown'][Math.random() * 5 | 0];
      const t = { kind, x: mouthX(), y: FLOOR + 5 };
      sfx('fanfare'); fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: '!' }; fish.sq = 1;
      for (let i = 0; i < 8; i++) G.fx.push({ k: 'star', x: t.x + rnd(-8, 8), y: t.y - 6 + rnd(-6, 4), t: G.T + i * 0.05, d: 0.6 });
      G.fx.push({ k: 'text', s: { coin: 'コイン！', shell: 'かいがら！', star: 'ヒトデ！', crown: 'おうかん！？' }[kind], x: t.x, y: t.y - 16, t: G.T, d: 1.4, c: '#ffd23a' });
      G.treasures.push(t);
      yield 1.2;
    } else { fish.ex = { eyes: 'side', mouth: 'wavy', mark: '?' }; yield 0.8; }
    fish.free = true;
  }
  function* gPebble() {          // 小石をくわえて模様替え
    const peb = G.treasures.find(t => t.kind === 'pebble'); if (!peb) return;
    yield go(peb.x - fish.face * 20, FLOOR - 4, 45);
    fish.dir = peb.x > fish.x ? 1 : -1; yield 0.3;
    fish.ex = { mouth: 'o' }; sfx('eat'); G.treasures.splice(G.treasures.indexOf(peb), 1); G.carry = 'pebble'; fish.ex = { cheeks: true, eyes: 'closed' };
    const tx = peb.x < 80 ? rnd(95, 130) : rnd(30, 65);
    yield go(tx, FLOOR - 4, 35);
    sfx('koton'); G.carry = null; G.treasures.push({ kind: 'pebble', x: mouthX(), y: FLOOR + 5 }); sandPuff(mouthX(), FLOOR + 3, 4);
    fish.ex = { eyes: 'closed', mouth: 'smile', mark: 'note' }; yield 0.8;
  }
  function* gBubbleRide() {      // エアストーンの泡に乗って上へ
    yield go(AIR_X, FLOOR - 12, 50);
    fish.free = false; fish.ex = { eyes: 'closed', mouth: 'grin', blush: true }; sfx('bubble');
    const y0 = fish.y;
    yield* tween(2.2, p => { fish.y = y0 + (44 - y0) * p; fish.x = AIR_X + Math.sin(p * 14) * 4; fish.rot = Math.sin(p * 10) * 0.35; if ((p * 20 | 0) % 4 === 0) fish.sq = 0.3; });
    fish.rot = 0; sfx('pop'); fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: 'note' };
    yield 0.4; fish.free = true; yield go(fish.x + fish.face * 30, 110, 40);
  }
  function* gSandHide() {        // 砂にもぐって目だけ出す
    yield go(rnd(40, 120), FLOOR - 8, 45);
    fish.free = false; sfx('splash'); sandPuff(fish.x, FLOOR + 2, 12);
    fish.hermit = true; yield 3.2;
    sfx('boing'); sandPuff(fish.x, FLOOR + 2, 12); fish.hermit = false; fish.sq = 1.3;
    fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: '!' };
    yield* tween(0.35, p => { fish.y = FLOOR - 8 - Math.sin(p * Math.PI) * 18; });
    yield 0.4; fish.free = true;
  }
  function* gRoll() {            // 砂の上でごろごろ
    yield go(rnd(40, 120), FLOOR - 8, 45);
    fish.free = false; fish.ex = { eyes: 'closed', mouth: 'smile', blush: true };
    const x0 = fish.x;
    yield* tween(2.0, p => { const a = Math.sin(p * Math.PI * 3); fish.rot = a * 1.4; fish.x = x0 + a * 8; if (Math.abs(a) > 0.95) sandPuff(fish.x, FLOOR + 2, 1); });
    fish.rot = 0; fish.ex = { eyes: 'closed', mouth: 'grin', mark: 'heart' }; yield 0.6; fish.free = true;
  }

  const GESTURES = { look: gLookAtYou, yawn: gYawn, hiccup: gHiccup, sneeze: gSneeze, bubbles: gBlowBubbles, tail: gTailChase, bonk: gBonk,
    nibble: gNibblePlant, nap: gNap, dance: gDance, peek: gPeek, showoff: gShowOff, tongue: gTongue, hungry: gHungry, nervous: gNervous,
    dig: gDig, pebble: gPebble, bubbleride: gBubbleRide, sandhide: gSandHide, roll: gRoll };
  function playGesture(name) { fish.cruise = false; fish.wps = []; G.gest = makeRunner(GESTURES[name](), { limit: 20, maxSteps: 20, label: 'gesture:' + name }); }
  function endGesture() {
    G.gest = null; fish.ex = {}; fish.rot = 0; fish.oy = 0; fish.ox = 0; fish.turn = 3; fish.speed = 30; fish.free = true;
    if (G.carry) { G.treasures.push({ kind: G.carry, x: fish.x, y: FLOOR + 5 }); G.carry = null; }
    if (G.mode === 'play') fish.hermit = false;
    if (G.mode === 'play') fish.opts = {};
    G.wanderAt = 0;
  }
  function stepGesture(dt) {
    const d = G.gest;
    if (stepRunner(d, dt, () => G.gest === d) === DONE) endGesture();
  }
  const go = (x, y, sp) => { fish.free = true; fish.cruise = false; fish.speed = sp || 40; fish.turn = 5; fish.tx = clamp(x, 24, 136); fish.ty = clamp(y, 36, FLOOR - 4);
    return () => Math.hypot(fish.x - fish.tx, fish.y - fish.ty) < 3; }; Object.assign(G, { go });
  const hold = () => { fish.tx = fish.x; fish.ty = fish.y; };

  function* gLookAtYou() {       // こっちを向いてにっこり
    hold(); fish.ex = { front: true }; yield 0.5;
    fish.ex = { front: true, eyes: 'sparkle', mouth: 'grin', blush: true, mark: 'heart' }; fish.sq = 0.8; sfx('pet'); yield 1.2;
    fish.ex = { front: true, eyes: 'closed', mouth: 'smile', blush: true }; yield 0.6;
  }
  function* gYawn() {            // 大あくび
    hold(); fish.ex = { eyes: 'closed', mouth: 'o' }; yield 0.3;
    sfx('yawn'); fish.ex = { eyes: 'closed', mouth: 'yawn', sy: 1.15, sx: 0.92 }; yield 0.9;
    fish.ex = { eyes: 'teary', mouth: 'smile' }; yield 0.5;
  }
  function* gHiccup() {          // しゃっくり
    hold(); const acc = g.gestureAccident('hiccup');
    for (let k = 0; k < 3; k++) {
      yield rnd(0.4, 0.8);
      if (acc && k === 2) return gestDeath(acc);
      sfx('hic'); fish.sq = 1; fish.ex = { eyes: 'surprised', mouth: 'o', mark: '!' };
      G.bubbles.push({ x: fish.x + fish.face * 20, y: fish.y, r: 2, vy: -16 });
      yield* tween(0.25, p => { fish.oy = -Math.round(Math.sin(p * Math.PI) * 5); });
      fish.ex = { mouth: 'wavy', brows: 'worried' };
    }
    yield 0.4;
  }
  function* gSneeze() {          // 汚れでくしゃみ
    hold(); fish.ex = { eyes: 'closed', mouth: 'o', sx: 0.9, sy: 1.1 }; yield 0.4;
    fish.ex = { eyes: 'closed', mouth: 'o', sx: 0.85, sy: 1.15 }; yield 0.35;
    sfx('sneeze'); fish.sq = 1.2; fish.ex = { eyes: 'closed', mouth: 'yawn', sx: 1.2, sy: 0.85 };
    for (let i = 0; i < 6; i++) G.bubbles.push({ x: fish.x + fish.face * 22, y: fish.y + rnd(-3, 3), r: 1 + (i % 2), vy: rnd(-20, -10) });
    { const acc = g.gestureAccident('sneeze'); if (acc) return gestDeath(acc); }
    const x0 = fish.x; yield* tween(0.3, p => { fish.x = x0 - fish.face * 10 * ease(p); });
    fish.ex = { eyes: 'side', brows: 'down', mouth: 'wavy' }; yield 0.8;
  }
  function* gBlowBubbles() {     // 泡をぷくぷく
    hold();
    for (let k = 0; k < 3; k++) {
      fish.ex = { mouth: 'o', cheeks: true }; yield 0.35;
      sfx('bubble'); fish.ex = { mouth: 'o' };
      G.bubbles.push({ x: fish.x + fish.face * 21, y: fish.y - 2, r: 2 + k, vy: -10 }); yield 0.3;
    }
    fish.ex = { eyes: 'closed', mouth: 'smile', mark: 'note' }; yield 0.7;
  }
  function* gTailChase() {       // 自分のしっぽを追いかける
    const cx = clamp(fish.x, 45, 115), cy = clamp(fish.y, 70, 170), r = 14, s0 = fish.face;
    yield go(cx + r, cy, 50);
    fish.free = false; fish.ex = { eyes: 'surprised', mouth: 'o' };
    yield* tween(2.2, p => {
      const a = p * Math.PI * 4;
      fish.x = cx + Math.cos(a) * r; fish.y = cy + Math.sin(a) * r * 0.6;
      fish.dir = fish.face = (Math.sin(a) * s0 > 0 ? -1 : 1);
    });
    { const acc = g.gestureAccident('tail'); if (acc) return gestDeath(acc); }
    fish.ex = { eyes: 'dizzy', mouth: 'wavy', mark: '?' }; fish.tx = fish.x; fish.ty = fish.y; fish.free = true; yield 1.0;
  }
  function* gBonk() {            // ガラスにごつん
    const side = fish.x < 80 ? -1 : 1;
    fish.ex = { eyes: 'closed', mouth: 'grin' };
    yield go(side < 0 ? 24 : 136, fish.y, 95);
    { const acc = g.gestureAccident('bonk'); if (acc) return gestDeath(acc, side); }
    sfx('bonk'); fish.ex = { eyes: 'x', mouth: 'o', sx: 0.75, sy: 1.15, mark: 'anger' };
    G.fx.push({ k: 'star', x: fish.x + side * 22, y: fish.y - 4, t: G.T, d: 0.6 });
    yield 0.35;
    fish.ex = { eyes: 'teary', brows: 'worried', mouth: 'wavy' };
    const x0 = fish.x; yield* tween(0.4, p => { fish.x = x0 - side * 14 * ease(p); });
    hold(); yield 0.9;
  }
  function* gNibblePlant() {     // 水草をかじる
    const right = Math.random() < 0.5;
    yield go(right ? 112 : 48, rnd(170, 190), 45);
    fish.dir = right ? 1 : -1; yield 0.3;
    for (let k = 0; k < 3; k++) { fish.ex = { mouth: 'o' }; yield 0.2; fish.ex = { cheeks: true }; fish.chewUntil = G.T + 0.5; sfx('mogu'); yield 0.55; }
    fish.ex = { eyes: 'closed', mouth: 'tongue', mark: 'note' }; yield 0.8;
  }
  function* gNap() {             // うたた寝
    yield go(clamp(fish.x, 50, 110), rnd(160, 185), 25);
    fish.ex = { eyes: 'closed', mouth: 0, wag: 0.25, mark: 'zzz' };
    for (let k = 0; k < 3; k++) { sfx('snore'); yield* tween(1.0, p => { fish.oy = Math.round(Math.sin(p * Math.PI * 2) * 1.5); fish.ex.sy = 1 + Math.sin(p * Math.PI * 2) * 0.05; }); }
    { const acc = g.gestureAccident('nap'); if (acc) return gestDeath(acc); }
    fish.oy = 0; sfx('boing'); fish.sq = 1.2; fish.ex = { eyes: 'surprised', mouth: 'o', mark: '!' };
    yield* tween(0.3, p => { fish.oy = -Math.round(Math.sin(p * Math.PI) * 8); });
    fish.ex = { eyes: 'side', mouth: 'wavy', blush: true }; yield 0.6;
  }
  function* gDance() {           // ごきげんダンス
    hold(); fish.free = false; sfx('dance');
    fish.ex = { eyes: 'closed', mouth: 'grin', mark: 'note', blush: true };
    yield* tween(1.6, p => { fish.oy = -Math.round(Math.abs(Math.sin(p * Math.PI * 4)) * 6); fish.rot = Math.sin(p * Math.PI * 4) * 0.25; if ((p * 8 | 0) % 2) fish.sq = 0.6; });
    fish.rot = 0; fish.oy = 0;
    fish.dir = -fish.dir; yield 0.3; fish.dir = -fish.dir; yield 0.3;
    fish.free = true; hold(); fish.ex = { eyes: 'sparkle', mouth: 'grin' }; yield 0.5;
  }
  function* gPeek() {            // ガラスに顔を近づけてのぞきこむ
    yield go(clamp(fish.x, 50, 110), clamp(fish.y, 80, 150), 35);
    fish.free = false; fish.ex = { front: true, eyes: 'surprised', mark: '?' };
    yield* tween(0.6, p => { fish.opts = { scale: Math.round((1 + 0.5 * ease(p)) * 20) / 20 }; });
    fish.ex = { front: true, eyes: 'normal', mouth: 'o' }; fish.blinkUntil = G.T + 0.15; yield 0.5;
    { const acc = g.gestureAccident('peek'); if (acc) return gestDeath(acc); }
    fish.blinkUntil = G.T + 0.15; yield 0.5;
    fish.ex = { front: true, eyes: 'sparkle', mouth: 'grin' }; yield 0.5;
    yield* tween(0.5, p => { fish.opts = { scale: Math.round((1.5 - 0.5 * ease(p)) * 20) / 20 }; });
    fish.opts = {}; fish.free = true; hold();
  }
  function* gShowOff() {         // ドヤっと宙返り
    hold(); fish.free = false; fish.ex = { eyes: 'smug', brows: 'up', mouth: 'smile' }; yield 0.3;
    sfx('jump'); const y0 = fish.y, x0 = fish.x;
    yield* tween(0.9, p => { const a = p * Math.PI * 2; fish.rot = -fish.face * a; fish.x = x0 + fish.face * Math.sin(a) * 10; fish.y = y0 - (1 - Math.cos(a)) * 10; });
    fish.rot = 0; fish.x = x0; fish.y = y0; fish.sq = 1; fish.ex = { eyes: 'smug', brows: 'up', mouth: 'grin', mark: 'heart' };
    fish.free = true; hold(); yield 0.9;
  }
  function* gTongue() {          // あっかんべー
    hold(); fish.ex = { front: true }; yield 0.3;
    fish.ex = { front: true, eyes: 'closed', mouth: 'tongue' }; yield 0.9;
    fish.ex = {}; yield 0.2;
  }
  function* gHungry() {          // おなかすいた…
    yield go(fish.x, 40, 40);
    hold(); fish.dir = fish.face;
    for (let k = 0; k < 4; k++) { fish.ex = { eyes: 'teary', brows: 'worried', mouth: 'o' }; yield 0.22; fish.ex = { eyes: 'teary', brows: 'worried', mouth: 0 }; yield 0.22; }
    G.thought = { icon: 'food', until: G.T + 2 }; fish.ex = { eyes: 'teary', mouth: 'pout', brows: 'worried' }; yield 0.8;
  }
  function* gNervous() {         // そわそわ
    for (let k = 0; k < 4; k++) {
      fish.ex = { eyes: 'side', brows: 'worried', mouth: 'wavy', sweat: true };
      yield go(fish.x + rnd(-30, 30), fish.y + rnd(-20, 20), 90);
      fish.dir = -fish.dir; yield 0.25;
    }
    fish.ex = { eyes: 'annoyed', brows: 'angry', mark: 'anger' }; hold(); yield 0.7;
  }
}
