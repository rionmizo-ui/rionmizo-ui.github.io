// start.js — 起動（ループ開始・API 公開）
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import { cause } from './util.js';

export default function install(G) {
  const { demo, demoGesture, fish, fit, frame, g, press, render, stepDirector, update } = G;

  if (G.cfg.main) { window.addEventListener('resize', fit); fit(); }
  if (G.cfg.demo) { G.mode = 'play'; if (G.cfg.demo.startsWith('g:')) demoGesture(G.cfg.demo.slice(2)); else demo(G.cfg.demo); }
  requestAnimationFrame(frame);

  const api = { g, press, get gest() { return !!G.gest; }, get fish() { return fish; }, get pellets() { return G.pellets; }, get queued() { return G.queued; }, get mode() { return G.mode; }, get busy() { return G.busy; }, get cause() { return G.causeId; },
    step: dt => { update(dt); if (G.director) stepDirector(dt); render(); }, stop: () => { G.alive = false; } };
  if (G.cfg.main) window.__gf = api;
  G.api = api;
}
