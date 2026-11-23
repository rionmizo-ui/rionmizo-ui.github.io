// flow.js — 進行（起動・次の魚・世話の実行と予約）
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import S from '../art/sprites.js';
import { W, WATER } from './consts.js';
import { rnd, ease } from './util.js';

export default function install(G) {
  Object.assign(G, { boot, bubbleWipe, resetScene, nextFish, runAction });
  const { A, fish, g, initTreasures, setTimeoutT, sfx, startTask, tween } = G;

  // ---------------- 進行 ----------------
  function boot() {
    G.mode = 'boot'; G.bootT = G.T; sfx('boot');
    for (let i = 0; i < 6; i++) setTimeoutT(() => sfx('bubble'), 0.15 + i * 0.22);
    startTask(function* () {
      yield BOOT_T;
      // 前回の続き
      const s = g.s;
      if (s.phase === 'ending' && s.cause) { G.resumeEnding(s.cause); return; }
      if (s.phase === 'alive' && s.gauge > 0) { resumeFish(); return; }
      nextFish();
    });
  }

  // 札のあと：泡で画面をおおって、水槽をまっさらに戻してから次の魚
  function bubbleWipe() {
    G.mode = 'boot'; G.bootT = G.T; A.setSong(null); sfx('boot');
    for (let i = 0; i < 6; i++) setTimeoutT(() => sfx('bubble'), 0.15 + i * 0.22);
    startTask(function* () {
      yield BOOT_T * 0.5;
      resetScene(); G.waveH.fill(0); G.waveV.fill(0); G.treasures = initTreasures();   // 画面が泡でおおわれている間に全部リセット
      yield BOOT_T * 0.5;
      nextFish();
    });
  }

  function resetScene() {
    G.pellets = []; G.poops = []; G.bubbles = []; G.fx = []; G.thought = null; G.queued = null; G.busy = false; G.feeding = false;
    G.netReady = false; G.netQueued = false; G.wipes = null; G.sparkle = false;
    G.finger = G.brush = G.nozzle = G.net = G.paw = G.duck = G.feather = G.eyeball = G.bigBubble = null;
    G.crack = G.soul = G.bigFace = G.smear = G.spot = null; G.scales = []; fish.hermit = false; G.hoop = G.ball = null; G.visitor = null; G.visitAt = G.T + rnd(25, 45);
    Object.assign(fish, { x: 80, y: -30, dir: 1, eyes: 'normal', vis: false, opts: {}, rot: 0, ox: 0, oy: 0, free: true, glitch: false, split: 0, smugUntil: 0, vx: 0, vy: 0, legLen: 0, cruise: false, turn: 3, look: null, wps: [], shakeUntil: 0, splitHead: 0, face: 1, turnP: 0, sq: 0, sx: 1, sy: 1, chewUntil: 0, blinkAt: 2, blinkUntil: 0, ex: {} });
    G.gest = null;
  }

  function nextFish() {
    resetScene(); G.mode = 'play'; G.busy = true; A.setSong(null);
    const r = g.newFish();
    startTask(function* () {
      fish.vis = true; fish.free = false; fish.x = rnd(60, 100); fish.y = -20; fish.dir = Math.random() < 0.5 ? 1 : -1;
      yield* tween(0.35, p => { fish.y = -20 + p * 50; });
      sfx('plop'); G.splash(fish.x, WATER); G.splashAt(fish.x, 70);
      yield* tween(0.6, p => { fish.y = 30 + ease(p) * 50; });
      fish.free = true; fish.tx = fish.x; fish.ty = fish.y;
      if (r && r.instantDeath) {
        yield 0.5;
        yield* G.suddenDeath('instant');
        return;
      }
      const pe = g.persona && g.persona();
      G.fx.push({ k: 'badge', s: g.s.fishNo + '匹目' + (pe ? '　せいかく：' + pe.name : ''), t: G.T + 0.3, d: 2.8 });
      yield 2.5;           // ぽちゃんの後の静けさ
      A.setSong('main');
      G.busy = false; afterAction();
    });
  }

  function resumeFish() {
    resetScene(); G.mode = 'play'; fish.vis = true; fish.x = 80; fish.y = 110; fish.tx = 80; fish.ty = 110;
    A.setSong('main');
  }

  function runAction(type) {
    if (G.gest) G.endGesture();
    G.busy = true; fish.cruise = false; fish.turn = 3;
    const fn = G.ACTIONS[type];
    startTask(function* () {
      const res = yield* fn();
      if (res === 'dead') return;
      G.busy = false;
      try { g.save && g.save(); } catch (e) {}
      afterAction();
    });
  }

  function afterAction() {
    if (g.isFull()) { G.startEnding(); return; }
    if (G.celebrate && G.mode === 'play') {
      // コンボのお祝い：虹色にきらめいて宙返り
      G.celebrate = false; G.busy = true;
      startTask(function* () { yield* G.gShowOff(); fish.ex = {}; G.busy = false; afterAction(); });
      return;
    }
    if (G.queued) { const q = G.queued; G.queued = null; runAction(q); }
  }



  G.treasures = initTreasures();
  // 起動時の泡（400個、大小・速さ・出るタイミングをばらす）
  const BOOT_T = 2.6; Object.assign(G, { BOOT_T });
  try { S.prewarmFriends && S.prewarmFriends(); } catch (e) {}
  const BOOT_BUBBLES = []; Object.assign(G, { BOOT_BUBBLES });
  for (let i = 0; i < 400; i++) BOOT_BUBBLES.push({ x: Math.random() * W, r: Math.random() < 0.15 ? 6 + (Math.random() * 6 | 0) : 1 + (Math.random() * 4 | 0), v: 140 + Math.random() * 220, d: Math.random() * 1.1, w: 3 + Math.random() * 4, ph: Math.random() * 6 });
}
