// input.js — 入力（ボタン・キーボード・BGM ボタン）
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）

export default function install(G) {
  Object.assign(G, { press });
  const { A, g, sfx } = G;

  // ---------------- 入力 ----------------
  const BTN_ICON = { feed: 'food', clean: 'clean', touch: 'touch' }; Object.assign(G, { BTN_ICON });
  function press(btn) {
    A.init();
    try { g.press(btn, G.T); } catch (e) {}
    flashButton(btn);
    if (G.mode === 'title') { if (G.bootT < 0) G.boot(); return; }
    if (G.mode === 'boot') return;
    if (G.mode === 'card') {
      if (G.T - G.cardT < 4) return;
      if (btn === 'net') { G.mode = 'zukan'; sfx('blink'); } else { G.bubbleWipe(); }
      return;
    }
    if (G.mode === 'zukan') { G.mode = 'card'; sfx('blink'); return; }
    if (G.mode === 'dead') { if (btn === 'net') { if (G.netReady) G.collect(); else G.netQueued = true; } return; }
    if (G.mode !== 'play') return; // ending中は入力停止
    if (btn === 'net') { if (!G.busy) G.runAction('net'); return; }
    if (btn === 'feed' && G.feeding) { if (g.canFeed(G.pellets.length)) G.dropBatch(); else sfx('nope'); return; }
    if (G.busy) { G.queued = btn; return; }
    G.runAction(btn);
  }
  const KEYS = { '1': 'feed', 'z': 'feed', '2': 'clean', 'x': 'clean', '3': 'touch', 'c': 'touch', '4': 'net', 'v': 'net', ' ': 'net' };
  if (G.cfg.main) {
    window.addEventListener('keydown', e => { const b = KEYS[e.key.toLowerCase()]; if (b && !e.repeat) { e.preventDefault(); press(b); } });
    document.querySelectorAll('[data-btn]').forEach(el => {
      el.addEventListener('pointerdown', e => { e.preventDefault(); press(el.dataset.btn); });
    });
  }
  if (G.cfg.main) {
    const bb = document.getElementById('bgmbtn');
    try { A.bgmOn = localStorage.getItem('goldfish_bgm') !== 'off'; } catch (e) {}
    const paint = () => { if (bb) { bb.textContent = A.bgmOn ? '♪ BGM' : '♪ OFF'; bb.classList.toggle('off', !A.bgmOn); } };
    paint();
    if (bb) bb.addEventListener('click', e => { e.preventDefault(); A.init(); A.bgmOn = !A.bgmOn; try { localStorage.setItem('goldfish_bgm', A.bgmOn ? 'on' : 'off'); } catch (er) {} paint(); });
  }
  function flashButton(btn) {
    if (!G.cfg.main) return;
    const el = document.querySelector(`[data-btn="${btn}"]`); if (!el) return;
    el.classList.add('down'); setTimeout(() => el.classList.remove('down'), 120);
  }
}
