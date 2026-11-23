// loop.js — メインループ
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import { W, H } from './consts.js';

export default function install(G) {
  Object.assign(G, { frame, fit });
  const { SPEED, render, update } = G;

  // ---------------- ループ ----------------
  G.last = performance.now(), G.alive = true;
  function frame(now) {
    if (!G.alive) return;
    let dt = Math.min(0.1, (now - G.last) / 1000) * SPEED; G.last = now;
    const n = Math.max(1, Math.ceil(dt / 0.05));
    for (let i = 0; i < n; i++) update(dt / n);
    if (G.director) G.stepDirector(dt);
    render();
    requestAnimationFrame(frame);
  }
  function fit() {
    const wrap = document.getElementById('screenwrap');
    const avail = Math.min(wrap.clientWidth / W, (window.innerHeight * 0.62) / H);
    const s = Math.max(1, Math.floor(avail));
    G.cv.style.width = W * s + 'px'; G.cv.style.height = H * s + 'px';
  }
}
