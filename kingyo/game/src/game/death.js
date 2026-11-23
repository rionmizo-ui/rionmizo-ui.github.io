// death.js — 途中死・回収・札
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import { WATER, FLOOR } from './consts.js';
import { ease, cause } from './util.js';

export default function install(G) {
  Object.assign(G, { suddenDeath, deathSettle, collect, showCard });
  const { A, fish, g, mouthX, scoop, sfx, shake, startTask, tween } = G;

  // ---------------- 途中死 ----------------
  const DEATH_LOOK = {
    instant: { flip: true }, poison: { flip: true, palette: 'poison' }, frozen: { frozen: true }, flower: { flower: true },
    burnt: { burnt: true }, shock: { flip: true, spark: true }, overpolished: { white: true, flip: true }, dizzy: { flip: true },
  };
  function* suddenDeath(id, already) {
    G.mode = 'dead'; A.setSong(null); G.queued = null;
    fish.free = false; fish.eyes = 'x';
    if (id === 'shock') { sfx('zap'); for (let i = 0; i < 6; i++) { G.fx.push({ k: 'flash', t: G.T + i * 0.08, d: 0.05 }); } yield* shake(0.6); }
    else if (id === 'burnt') { sfx('zap'); G.fx.push({ k: 'fire', x: mouthX(), y: fish.y, t: G.T, d: 1.0, dir: fish.dir }); yield 0.9; }
    else if (id === 'frozen') { sfx('blink'); }
    else if (id === 'flower') { sfx('pet'); }
    else if (!already) sfx('death');
    const look = DEATH_LOOK[id] || { flip: true };
    if (id === 'flower') {   // 芽→双葉→つぼみ→開花
      for (let k = 0; k <= 3; k++) { fish.opts = { flower: true, flowerStage: k }; sfx('blink'); yield 0.45; }
    }
    fish.opts = Object.assign({ variant: id }, look);
    return yield* deathSettle(id);
  }

  // 浮く／沈むまで漂い、網を待つ
  function* deathSettle(id, stay) {
    G.feeding = false; G.mode = 'dead'; A.setSong(null); G.queued = null; G.causeId = id;
    if (id !== 'netted') { try { g.die(id); } catch (e) {} }
    const c = cause(id);
    if (fish.vis && stay) {
      yield 0.8;
    } else if (fish.vis) {
      if (id !== 'dizzy' && id !== 'overpolished' && !fish.opts.frozen && !fish.opts.burnt) fish.eyes = 'x';
      const ty = c.float === 'sink' ? FLOOR - 6 : WATER + 10;
      const y0 = fish.y, x0 = fish.x;
      yield* tween(2.5, p => { fish.y = y0 + (ty - y0) * ease(p); fish.x = x0 + Math.sin(p * 4) * 3; });
    } else if (G.eyeball) {
      const y0 = G.eyeball.y;
      yield* tween(1.5, p => { G.eyeball.y = y0 + (FLOOR + 2 - y0) * p * p; });
      sfx('koton');
    } else {
      yield 1.0;
    }
    G.netReady = true;
    if (G.netQueued) { G.netQueued = false; collect(); }
    return 'dead';
  }

  // 網で回収 → 札
  function collect() {
    G.netReady = false;
    startTask(function* () {
      // 何をすくうか
      let target = null;
      if (fish.vis && fish.hermit) target = { x: fish.x, y: FLOOR + 4 };
      else if (fish.vis) target = fish;
      else if (G.eyeball) target = G.eyeball;
      else if (G.feather) target = G.feather;
      else if (G.duck) target = G.duck;
      if (target && target.y < WATER + 4) target.y = WATER + 6;   // 浮いているものも水面ですくう
      yield* scoop(target, { x: 80, y: 130 });
      fish.vis = false; G.eyeball = G.feather = G.duck = null; G.net = null;
      yield 0.3;
      showCard(G.causeId);
    });
  }

  function showCard(id) {
    G.mode = 'card'; G.cardT = G.T;
    const z = g.s.zukan; const has = z && (z.has ? z.has(id) : z.includes(id));
    G.cardNew = !has;
    try { g.record(id); } catch (e) {}
    try { g.save && g.save(); } catch (e) {}
    sfx('card'); A.setSong('card');
  }
}
