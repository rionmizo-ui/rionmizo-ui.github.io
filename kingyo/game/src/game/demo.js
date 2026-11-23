// demo.js — 見本再生（gallery 用の demo モード）
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import { cause } from './util.js';
import { makeRunner, stepRunner, DONE } from './runner.js';

export default function install(G) {
  Object.assign(G, { stepDirector, demoGesture, demo });
  const { GDEATH_GEST, collect, g, nextFish, playGesture, runAction, startEnding } = G;

  // ---------------- 見本再生（死因ギャラリー用） ----------------
  G.director = null;
  function stepDirector(dt) {
    const d = G.director;
    if (stepRunner(d, dt) === DONE) G.director = null;
  }
  const TOUCH_OF = { cat: 'pet', bird: 'jump', dizzy: 'spin', bubblegone: 'bubble', floataway: 'puff' };
  function demoGesture(name) {
    g.newFish = (orig => () => { orig(); g.s.phase = 'alive'; return { instantDeath: false }; })(g.newFish.bind(g));
    G.director = makeRunner((function* () {
      nextFish();
      yield () => !G.busy;
      for (;;) {
        G.gestAt = G.T + 999;
        if (name === 'feed') { runAction('feed'); yield () => !G.busy; g.s.satiety = 0; yield 1.5; continue; }
        if (name === 'swim') { yield 4; continue; }
        if (name.startsWith('visit-')) { G.forceVisitor = name.slice(6); G.visitAt = G.T + 1; yield () => !!G.visitor; yield () => !G.visitor; yield 1; continue; }
        if (name.startsWith('t-')) {
          const kind = name.slice(2);
          g.startTouch = () => { g.s.satiety = 10; return kind === 'refuse' ? { hungry: false, refused: true, reaction: null, accident: null } : { hungry: false, reaction: kind, accident: null }; };
          yield 1.2; runAction('touch'); yield () => !G.busy; continue;
        }
        if (name === 'hungry') g.s.satiety = 1; if (name === 'sneeze') g.s.dirt = 2; if (name === 'nervous') g.s.stress = 70; else g.s.stress = 20;
        yield 1.2;
        playGesture(name);
        yield () => !G.gest;
      }
    })(), { limit: 120, maxSteps: 20, zeroWaits: true, label: 'demo' });
  }
  function demo(id) {
    const c = cause(id), o = {};
    ['newFish', 'startFeed', 'startClean', 'startTouch', 'net', 'decideEnding'].forEach(k => { o[k] = g[k].bind(g); });
    g.newFish = () => { const r = o.newFish(); if (id === 'instant') { g.s.phase = 'dead'; return { instantDeath: true }; } g.s.phase = 'alive'; return { instantDeath: false }; };
    g.startFeed = n => Object.assign(o.startFeed(n), { willEat: true, accident: id });
    g.startClean = () => { g.s.dirt = Math.max(2, g.s.dirt); return Object.assign(o.startClean(), { effective: true, accident: id }); };
    g.startTouch = () => { g.s.satiety = 6; o.startTouch(); return { hungry: false, reaction: TOUCH_OF[id], accident: id }; };
    g.net = () => ({ caught: true, smug: false });
    g.decideEnding = () => { o.decideEnding(); g.s.cause = id; g.s.phase = 'ending'; return id; };
    const ACT = { poison: 'feed', frozen: 'feed', flower: 'feed', burnt: 'feed', shock: 'feed', sucked: 'clean', overpolished: 'clean',
      cat: 'touch', bird: 'touch', dizzy: 'touch', bubblegone: 'touch', floataway: 'touch', netted: 'net' };
    G.director = makeRunner((function* () {
      for (;;) {
        nextFish(); G.gestAt = G.T + 999;
        yield () => G.mode !== 'play' || !G.busy;
        if (id !== 'instant') {
          yield 1.2;
          if (c.kind === 'ending') {
            if (id === 'moss') g.s.dirt = 4;
            g.s.gauge = 25; startEnding();
          } else if (GDEATH_GEST[id]) { G.gestAt = G.T + 999; g.gestureAccident = () => id; if (id === 'nowake' || id === 'overhere') g.s.stress = 20; playGesture(GDEATH_GEST[id]); }
          else runAction(ACT[id]);
        }
        yield () => (G.mode === 'dead' && G.netReady) || G.mode === 'card';
        if (G.mode === 'dead') { yield 1.6; collect(); yield () => G.mode === 'card'; }
        yield 2.4;
      }
    })(), { limit: 120, maxSteps: 20, zeroWaits: true, label: 'demo' });
  }
}
