// tasks.js — タスク（ジェネレータで演出を書く）とゲーム内時間のタイマー
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import { FLOOR } from './consts.js';
import { clamp } from './util.js';
import { makeRunner, stepRunner, DONE } from './runner.js';

export default function install(G) {
  Object.assign(G, { startTask, stepTask, tween, swimTo, shake, setTimeoutT });
  const { fish } = G;

  // ---------------- タスク（ジェネレータで演出を書く） ----------------
  function startTask(fn) { G.task = makeRunner(fn(), { limit: 20, label: 'task' }); }
  function stepTask(dt) {
    const cur = G.task; if (!cur) return;
    if (stepRunner(cur, dt, () => G.task === cur) === DONE) G.task = null;
  }
  function* tween(dur, f) { const t0 = G.T; yield () => { const p = Math.min(1, (G.T - t0) / dur); f(p); return p >= 1; }; }
  function* swimTo(x, y, sp = 40) { x = clamp(x, 22, 138); y = clamp(y, 32, FLOOR + 2); fish.free = true; fish.tx = x; fish.ty = y; fish.speed = sp; fish.turn = 6; yield () => Math.hypot(fish.x - x, fish.y - y) < 2.5; fish.turn = 3; }
  function* shake(dur) { const t0 = G.T; yield () => { fish.ox = Math.round(Math.sin((G.T - t0) * 30) * 2); if (G.T - t0 >= dur) { fish.ox = 0; return true; } return false; }; }


  // ---------------- ゲーム内時間のタイマー ----------------
  const timers = []; Object.assign(G, { timers });
  function setTimeoutT(f, sec) { timers.push([G.T + sec, f]); }
}
