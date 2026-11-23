// care.js — 世話：餌と掃除
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import L from '../logic/index.js';
import { WATER, FLOOR, MID } from './consts.js';
import { rnd, clamp, ease } from './util.js';

export default function install(G) {
  Object.assign(G, { dropBatch, actFeed, actClean });
  const { fish, g, setTimeoutT, sfx, shake, swimTo, tween } = G;

  // ---------------- 世話 ----------------
  const ACC_PELLET = { poison: 'poison', frozen: 'ice', flower: 'seed', burnt: 'fire', shock: 'spark' };
  const mouthX = () => fish.x + fish.dir * 20; Object.assign(G, { mouthX });

  // 3粒の組を落とす（食べている最中でも追加できる。場に9粒まで）
  function dropBatch() {
    const pend = G.pellets.filter(p => p.mine).length;
    const r = g.startFeed(pend);
    sfx('drop');
    const bad = r.accident ? (Math.random() * 3 | 0) : -1;
    const baseX = rnd(35, 125);
    const batch = { r, eaten: 0 };
    for (let i = 0; i < 3; i++) {
      const gold = r.gold && i === 1;
      G.pellets.push({ x: clamp(baseX + rnd(-16, 16), 28, 132), y: WATER - 6 - i * 8, vy: rnd(16, 20), ph: rnd(0, 6),
        type: i === bad ? ACC_PELLET[r.accident] : gold ? 'gold' : 'normal', bad: i === bad, gold, rot: 0, mine: r.willEat, batch });
    }
    if (!r.willEat) {
      // 満腹：首を振る
      g.finishFeed(false, G.pellets.some(p => p.mine));
      fish.shakeUntil = G.T + 1.4; G.thought = { icon: 'angry', until: G.T + 1.4 };
    }
  }

  function* actFeed() {
    if (!g.canFeed(G.pellets.length)) { sfx('nope'); yield* shake(0.5); return; }
    G.feeding = true;
    dropBatch();
    for (;;) {
      const rem = G.pellets.filter(p => p.mine);
      if (!rem.length) break;
      // 真ん中まで落ちた粒を近い順に。まだなら一番下の粒を見上げて待つ
      const ready = rem.filter(p => p.y >= MID);
      const dist = p => Math.hypot(p.x - fish.x, p.y - fish.y);
      const p = ready.length ? ready.sort((a, b) => dist(a) - dist(b))[0] : rem.sort((a, b) => b.y - a.y)[0];
      fish.free = true; fish.speed = 42; fish.turn = 6;
      yield () => {
        if (!G.pellets.includes(p)) return true;
        const d = p.x > fish.x ? 1 : -1;
        if (Math.abs(p.x - fish.x) > 6) fish.dir = d;
        if (p.y < MID) {
          if (G.pellets.some(q => q.mine && q !== p && q.y >= MID)) return true;   // 別の粒が先に来たら乗り換え
          fish.eyes = 'normal'; fish.look = 'up'; fish.speed = 34;
          fish.tx = clamp(p.x - d * 22, 25, 135); fish.ty = MID + 14 + Math.sin(G.T * 5) * 3;
          fish.mouth = (Math.sin(G.T * 8) > 0) ? 1 : 0;
          return false;
        }
        fish.eyes = 'normal'; fish.look = null; fish.speed = 60; fish.turn = 9;
        if (!p.t0) p.t0 = G.T;
        // 壁ぎわの粒には反対側から回り込む
        const side = p.x - 20 < 26 ? -1 : p.x + 20 > 134 ? 1 : d;
        if (Math.abs(fish.x - (p.x - side * 20)) < 10) fish.dir = side;
        const lead = p.y < FLOOR + 4 ? p.vy * 0.35 : 0;   // 落ちる先を狙う
        fish.tx = clamp(p.x - side * 20, 25, 135); fish.ty = clamp(p.y + lead, 35, FLOOR + 2);
        const tol = G.T - p.t0 > 4 ? 12 : 7;
        if (G.T < fish.chewUntil) return false;
        if (G.T - p.t0 > 6) { p.x += (mouthX() - p.x) * 0.3; p.y += (fish.y - p.y) * 0.3; }   // 届かなければ吸い寄せる
        return Math.abs(mouthX() - p.x) < tol && Math.abs(fish.y - p.y) < tol;
      };
      if (!G.pellets.includes(p) || p.y < MID) continue;
      G.pellets.splice(G.pellets.indexOf(p), 1); fish.turn = 3; fish.look = null;
      // ぱくっ → ほっぺをふくらませて、もぐもぐ（噛みながら次の粒へ向かえる）
      fish.mouth = 'o'; sfx('eat'); fish.sq = 1;
      const e = g.eatPellet();
      p.batch.eaten++;
      yield 0.08; fish.mouth = 0;
      fish.chewUntil = G.T + 0.75; setTimeoutT(() => sfx('mogu'), 0.05); setTimeoutT(() => { sfx('gulp'); fish.sq = 0.7; }, 0.75);
      if (p.bad) { G.feeding = false; yield 0.4; return yield* G.suddenDeath(p.batch.r.accident); }
      if (p.gold) {
        g.bonus(2); sfx('fanfare'); fish.sq = 1.2;
        G.fx.push({ k: 'text', s: 'きんのつぶ！ +2', x: fish.x, y: fish.y - 20, t: G.T, d: 1.6, c: '#ffd23a', big: true });
        for (let i = 0; i < 10; i++) G.fx.push({ k: 'star', x: fish.x + rnd(-18, 18), y: fish.y + rnd(-10, 10), t: G.T + i * 0.05, d: 0.6 });
      }
      if (p.batch.eaten === 3) {
        const f = g.finishFeed(true, G.pellets.some(q => q.mine)); G.reward(f);
        if (f && f.okawari) { G.thought = { icon: 'food', until: G.T + 10 }; }
        // おいしい！
        fish.ex = { eyes: 'closed', blush: true, mark: 'heart' }; sfx('pet');
        setTimeoutT(() => { if (fish.ex.mark === 'heart') fish.ex = {}; }, 0.9);
      }
      if (e && e.poop) {
        sfx('munch');
        yield* tween(0.8, q => { fish.mouth = (q * 8 | 0) % 2; });
        fish.mouth = 0;
        G.poops.push({ x: fish.x - fish.dir * 24, y: fish.y + 4, vy: 8 });
      }
      yield 0.05;
    }
    G.feeding = false;
    if (g.s.satiety >= L.SATIETY_MAX - 2) {   // まんぷく
      fish.ex = { eyes: 'closed', mouth: 'smile', cheeks: true, blush: true, mark: 'heart', sx: 1.12, sy: 1.05 };
      yield 0.9;
    }
    fish.ex = {};
  }

  function* actClean() {
    const r = g.startClean();
    const dirt0 = g.s.dirt;
    if (r.accident === 'sucked') {
      // 先に吸い込み音、後からノズル
      sfx('suck'); fish.eyes = 'dizzy';
      yield 0.9;
      G.nozzle = { x: fish.x, y: -40 };
      yield* tween(0.8, p => { G.nozzle.x = fish.x; G.nozzle.y = -40 + ease(p) * (fish.y - 30 + 40); });
      fish.free = false;
      yield* tween(0.5, p => { fish.y -= (fish.y - (G.nozzle.y + 14)) * p; fish.opts = { scale: 1 - p * 0.7 }; });
      fish.vis = false; sfx('pop');
      G.wipeDirt = Math.max(0, dirt0 - 1); G.wipes = [{ x: 80, y: 120, r: 200 }];
      yield* tween(0.7, p => { G.nozzle.y = (fish.y - 30) * (1 - p) - 40 * p; });
      G.nozzle = null;
      return yield* G.deathSettle('sucked');
    }
    const spots = [[rnd(35, 70), rnd(50, 90)], [rnd(90, 130), rnd(90, 140)], [rnd(40, 80), rnd(150, 190)]];
    G.brush = { x: 175, y: 30, a: 0 };
    G.wipeDirt = Math.max(0, dirt0 - 1); G.wipes = r.effective ? [] : null;
    G.sparkle = !r.effective && dirt0 === 0;
    for (let i = 0; i < 3; i++) {
      const [sx, sy] = spots[i];
      const bx0 = G.brush.x, by0 = G.brush.y;
      // 魚はブラシを避ける
      fish.free = true; fish.speed = 35;
      fish.tx = clamp(sx < 80 ? sx + 60 : sx - 60, 25, 135); fish.ty = clamp(sy + rnd(-30, 30), 40, 200);
      yield* tween(0.35, p => { G.brush.x = bx0 + (sx - bx0) * ease(p); G.brush.y = by0 + (sy - by0) * ease(p); });
      if (r.accident === 'overpolished' && i === 2) {
        // ブラシが魚を巻き込む
        fish.free = false; const fx0 = fish.x, fy0 = fish.y;
        yield* tween(0.4, p => { G.brush.x = sx + (fx0 - sx) * p; G.brush.y = sy + (fy0 - sy) * p; });
        for (let k = 0; k < 6; k++) { sfx('brush'); fish.eyes = 'dizzy'; yield* tween(0.18, p => { G.brush.a = Math.sin(p * Math.PI * 2) * 6; fish.ox = Math.round(G.brush.a / 2); }); }
        fish.opts = { white: true, shine: true, sparkle: true }; fish.ox = 0;
        sfx('death');
        yield* tween(0.6, p => { G.brush.x = fx0 + p * 100; G.brush.y = fy0 - p * 100; });
        G.brush = null; G.wipes = null;
        return yield* G.suddenDeath('overpolished', true);
      }
      const w = { x: sx, y: sy, r: 0 }; if (G.wipes) G.wipes.push(w);
      for (let k = 0; k < 3; k++) { sfx('brush'); yield* tween(0.2, p => { G.brush.a = Math.sin(p * Math.PI * 2) * 7; w.r = Math.max(w.r, (k * 0.2 + p * 0.2) / 0.6 * 30); }); }
      G.brush.a = 0;
    }
    const bx0 = G.brush.x, by0 = G.brush.y;
    yield* tween(0.4, p => { G.brush.x = bx0 + (180 - bx0) * p; G.brush.y = by0 + (20 - by0) * p; });
    G.brush = null;
    G.reward(g.finishClean());
    G.wipes = null; G.sparkle = false;
    if (r.effective) {
      G.poops = G.poops.slice(0, Math.max(0, G.poops.length - 2));
      // ぴかぴか！ ごきげんで一周
      G.sparkle = true; sfx('fanfare');
      fish.ex = { eyes: 'sparkle', mouth: 'grin', blush: dirt0 >= 3, mark: 'note' };
      const sx0 = fish.x < 80 ? 125 : 35;
      yield* swimTo(sx0, clamp(fish.y + rnd(-30, 30), 50, 190), 85);
      yield* swimTo(80, clamp(fish.y, 60, 180), 70);
      G.sparkle = false; fish.ex = {};
    } else {
      // きれいなのに磨かれた
      fish.ex = { eyes: 'side', brows: 'down', mouth: 'wavy', mark: '?' }; yield 0.8; fish.ex = {};
    }
  }
}
