// water.js — 水面の波（ちゃぽん）と水しぶき
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import S from '../art/sprites.js';
import { W, H, WATER } from './consts.js';
import { rnd, clamp } from './util.js';

export default function install(G) {
  Object.assign(G, { splashAt, stepWaves, drawWaves, watchSurface, splash, popFx });
  const { ctx, fish, sfx } = G;

  // ---------------- 水面の波（ちゃぽん） ----------------
  const WN = W + 1, waveH = new Float32Array(WN), waveV = new Float32Array(WN); Object.assign(G, { waveH, waveV });
  function splashAt(x, power) {
    x = Math.round(clamp(x, 0, W));
    // 水面に広がる波紋の輪（強さに応じて1〜3重）
    const rings = power >= 30 ? 3 : power >= 15 ? 2 : 1;
    for (let i = 0; i < rings; i++) G.fx.push({ k: 'ring', x, t: G.T + i * 0.18, d: 0.9 + power / 80, r: 8 + power * 0.5 });
    power *= 3;
    const r = Math.max(2, Math.round(power / 6));
    for (let i = -r; i <= r; i++) { const k = x + i; if (k >= 0 && k < WN) waveV[k] += power * (1 - Math.abs(i) / (r + 1)); }
  }
  function stepWaves(dt) {
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let s2 = 0; s2 < n; s2++) {
      for (let i = 0; i < WN; i++) {
        const l = waveH[i > 0 ? i - 1 : i], r = waveH[i < WN - 1 ? i + 1 : i];
        waveV[i] += (-25 * waveH[i] + 500 * (l + r - 2 * waveH[i])) * h;
        waveV[i] *= Math.exp(-h * 2.2);
      }
      for (let i = 0; i < WN; i++) waveH[i] = clamp(waveH[i] + waveV[i] * h, -6, 6);
    }
  }
  let skyCol = '#a8e6d8', waterCol = '#6fd3be';
  try {
    const oc = document.createElement('canvas'); oc.width = W; oc.height = H; const ox = oc.getContext('2d');
    S.drawTank(ox, 0, 0);
    const px = (x, y) => { const d = ox.getImageData(x, y, 1, 1).data; return 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')'; };
    skyCol = px(80, 6); waterCol = px(80, WATER + 6);
  } catch (e) {}
  function drawWaves() {
    for (let x = 0; x < W; x++) {
      const hh = Math.round(waveH[x]);
      if (hh === 0) continue;
      if (hh > 0) { ctx.fillStyle = skyCol; ctx.fillRect(x, WATER - 1, 1, hh + 1); }   // 水面が下がった所
      else { ctx.fillStyle = waterCol; ctx.fillRect(x, WATER + hh, 1, -hh + 1); }     // 盛り上がった所
      ctx.fillStyle = '#eafff9'; ctx.fillRect(x, WATER + hh, 1, 1);
      if (Math.abs(hh) >= 3) { ctx.fillStyle = 'rgba(234,255,249,0.6)'; ctx.fillRect(x, WATER + hh + 2, 1, 1); }
    }
  }
  // 水面をまたいだものを見張って、ちゃぽん
  const crossers = [
    ['finger', () => G.finger && { x: G.finger.x, y: G.finger.y }, 26],
    ['net', () => G.net && { x: G.net.x, y: G.net.y + 10 }, 34],
    ['paw', () => G.paw && { x: G.paw.x, y: G.paw.y }, 30],
    ['nozzle', () => G.nozzle && { x: G.nozzle.x, y: G.nozzle.y }, 22],
    ['fish', () => fish.vis && !fish.inNet && { x: fish.x, y: fish.y }, 40],
  ];
  const lastY = {};
  function watchSurface() {
    for (const [k, get, pw] of crossers) {
      const o = get();
      if (!o) { lastY[k] = null; continue; }
      const prev = lastY[k];
      if (prev != null && (prev < WATER) !== (o.y < WATER)) {
        const down = o.y >= WATER;
        splashAt(o.x, down ? pw : pw * 0.7);
        for (let i = 0; i < (down ? 7 : 5); i++) G.fx.push({ k: 'drop', x: o.x + rnd(-8, 8), y: WATER, vx: rnd(-30, 30), vy: rnd(-55, -25), t: G.T, d: 0.7 });
        sfx(pw >= 30 ? 'splash' : 'chapon');
      }
      lastY[k] = o.y;
    }
  }

  // ---------------- 効果 ----------------
  function splash(x, y) { splashAt(x, 30); for (let i = 0; i < 6; i++) G.fx.push({ k: 'drop', x: x + rnd(-6, 6), y, vx: rnd(-20, 20), vy: rnd(-40, -20), t: G.T, d: 0.6 }); }
  function popFx(x, y) { for (let i = 0; i < 4; i++) G.fx.push({ k: 'drop', x, y, vx: rnd(-15, 15), vy: rnd(-15, 15), t: G.T, d: 0.3 }); }
}
