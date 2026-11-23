// update.js — 毎フレームの更新
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import { WATER, FLOOR } from './consts.js';
import { rnd, clamp } from './util.js';

export default function install(G) {
  Object.assign(G, { update });
  const { A, AIR_X, endGesture, fish, g, moodFace, setTimeoutT, sfx, splashAt, startGesture, stepGesture, stepTask, stepWaves, timers, updateVisitor, watchSurface } = G;

  // ---------------- 更新 ----------------
  function update(dt) {
    G.T += dt;
    stepTask(dt);

    // 魚の移動
    if (fish.free && fish.vis) {
      const dx = fish.tx - fish.x, dy = fish.ty - fish.y, d = Math.hypot(dx, dy);
      // 目標へ向けてなめらかに舵を切る（カーブを描いて泳ぐ）
      const burst = fish.cruise ? 0.7 + 0.6 * Math.max(0, Math.sin(G.T * 3.4)) : 1;   // ひれで蹴って、すーっと進む
      const want = d > 0.3 ? fish.speed * burst * Math.min(1, d / (fish.cruise ? 4 : 14)) : 0;
      const dvx = d > 0.3 ? dx / d * want : 0, dvy = d > 0.3 ? dy / d * want : 0;
      const k = Math.min(1, dt * fish.turn);
      fish.vx += (dvx - fish.vx) * k; fish.vy += (dvy - fish.vy) * k;
      if (d < 2.5 && !fish.cruise) { fish.vx *= 0.8; fish.vy *= 0.8; }
      fish.x += fish.vx * dt; fish.y += fish.vy * dt;
      fish.x = clamp(fish.x, 22, 138); fish.y = clamp(fish.y, 32, FLOOR + 2);
      if (fish.vx > 4) fish.dir = 1; else if (fish.vx < -4) fish.dir = -1;
    }
    // 振り返り：いったん正面を向いてから反対を向く
    const tdur = fish.cruise ? 0.32 : 0.24;
    if (fish.dir !== fish.face) { fish.turnP += dt / tdur; if (fish.turnP >= 1) { fish.face = fish.dir; fish.turnP = 0; fish.sq = Math.max(fish.sq, 0.5); } }
    else if (fish.turnP > 0) fish.turnP = Math.max(0, fish.turnP - dt / tdur);
    // つぶし・伸ばし：速いほど伸び、止まる・食べる・振り返るとむにっと縮む
    const spd = Math.hypot(fish.vx, fish.vy);
    fish.sq *= Math.exp(-dt * 7);
    const st = Math.min(0.16, spd / 550);
    const wob = Math.sin(G.T * 22) * fish.sq;
    fish.sx = (1 + st - 0.16 * fish.sq + 0.04 * wob) * (fish.ex.sx || 1);
    fish.sy = (1 - st * 0.6 + 0.14 * fish.sq - 0.04 * wob) * (fish.ex.sy || 1);
    // まばたき
    if (G.T > fish.blinkAt) { fish.blinkUntil = G.T + 0.12; fish.blinkAt = G.T + rnd(1.8, 4.5) + (Math.random() < 0.2 ? -1.6 : 0); }
    for (let i = timers.length - 1; i >= 0; i--) if (G.T >= timers[i][0]) { const f = timers[i][1]; timers.splice(i, 1); f(); }

    const idle = G.mode === 'play' && !G.busy && fish.vis;
    if (!idle && G.gest) endGesture();
    if (!idle) G.gestAt = Math.max(G.gestAt, G.T + rnd(8, 14));   // 世話のあとはしばらく泳ぐ
    if (idle && !G.gest && G.T > G.gestAt && !(fish.wps && fish.wps.length)) {
      G.gestAt = G.T + rnd(14, 26);
      if (Math.random() < 0.65) startGesture();
    }
    if (idle && G.gest) stepGesture(dt);
    if (idle && !G.gest) {
      // ふらふら泳ぐ
      const near = Math.hypot(fish.tx - fish.x, fish.ty - fish.y) < 10;
      if (near && fish.cruise && fish.wps.length) { const w = fish.wps.shift(); fish.tx = w[0]; fish.ty = w[1]; }
      else if (G.T > G.wanderAt || (near && fish.cruise)) {
        fish.cruise = true; fish.turn = 2.6; fish.wps = [];
        const far = () => fish.x < 80 ? rnd(95, 136) : rnd(24, 65);
        const pick = (w) => { let x = Math.random() * w.reduce((a, b) => a + b[0], 0); for (const [n, f] of w) { if ((x -= n) < 0) return f; } return w[0][1]; };
        const startWps = () => { const w = fish.wps.shift(); fish.tx = w[0]; fish.ty = w[1]; };
        pick([
          [4, () => {   // 水槽じゅうを周遊
            fish.speed = rnd(45, 70); fish.tx = far(); fish.ty = clamp(fish.y + rnd(-100, 100), 40, 205); G.wanderAt = G.T + 3.5; }],
          [3, () => {   // ダッシュで端から端へ
            fish.speed = rnd(85, 110); fish.turn = 4.5; fish.tx = far(); fish.ty = rnd(40, 200); G.wanderAt = G.T + 2.5; }],
          [2, () => {   // ジグザグ
            fish.speed = rnd(55, 70); fish.turn = 5;
            const dir = fish.x < 80 ? 1 : -1, y0 = clamp(fish.y, 70, 170);
            for (let k = 1; k <= 4; k++) fish.wps.push([clamp(fish.x + dir * k * 24, 24, 136), y0 + (k % 2 ? -26 : 26)]);
            startWps(); G.wanderAt = G.T + 5; }],
          [1.5, () => { // 大きな輪
            fish.speed = rnd(50, 65); fish.turn = 5;
            const cx = clamp(fish.x, 50, 110), cy = clamp(fish.y, 80, 160), rr = 28, s0 = Math.random() < 0.5 ? 1 : -1;
            for (let k = 1; k <= 8; k++) { const a = s0 * k * Math.PI / 4; fish.wps.push([cx + Math.sin(a) * rr, cy - (1 - Math.cos(a)) * rr * 0.8 + rr * 0.4]); }
            startWps(); G.wanderAt = G.T + 6; }],
          [1.5, () => { // 8の字
            fish.speed = rnd(45, 60); fish.turn = 4.5;
            const cy = clamp(fish.y, 80, 160);
            for (const [x, y] of [[50, cy - 22], [30, cy], [50, cy + 22], [80, cy], [110, cy - 22], [130, cy], [110, cy + 22], [80, cy]]) fish.wps.push([x, y]);
            startWps(); G.wanderAt = G.T + 8; }],
          [1.5, () => { // ガラスぞいに上下へすべる
            const x = fish.x < 80 ? 26 : 134, up = fish.y > 120;
            fish.speed = rnd(40, 55); fish.turn = 4;
            fish.wps.push([x, fish.y], [x, up ? 50 : 195], [clamp(x + (x < 80 ? 30 : -30), 24, 136), up ? 60 : 185]);
            startWps(); G.wanderAt = G.T + 6; }],
          [1.5, () => { // すーっと沈んで、ぐんと浮く
            fish.speed = 18; fish.turn = 2; const x = fish.x;
            fish.tx = clamp(x + fish.dir * 10, 24, 136); fish.ty = clamp(fish.y + 50, 40, 190);
            setTimeoutT(() => { if (fish.cruise && !G.gest && !G.busy) { fish.speed = 95; fish.turn = 5; fish.wps = []; fish.tx = clamp(fish.x + fish.dir * 30, 24, 136); fish.ty = 50; fish.sq = 0.8; } }, 3.2);
            G.wanderAt = G.T + 5; }],
          [1.5, () => { // 止まって、きょろきょろ見回す
            fish.cruise = false; fish.speed = 12; fish.tx = fish.x; fish.ty = fish.y; G.wanderAt = G.T + 2.2;
            for (const t of [0.5, 1.2, 1.8]) setTimeoutT(() => { if (!G.gest && !G.busy && G.mode === 'play') fish.dir = -fish.dir; }, t); }],
          [1.5, () => { // 泡を追いかける
            const b = G.bubbles.filter(q => q.amb && q.y > 80).sort((a, c) => Math.abs(a.x - fish.x) - Math.abs(c.x - fish.x))[0];
            if (!b) { fish.speed = rnd(45, 70); fish.tx = far(); fish.ty = rnd(50, 190); G.wanderAt = G.T + 3; return; }
            fish.speed = 55; fish.turn = 6;
            for (let k = 0; k < 4; k++) fish.wps.push([clamp(b.x - fish.dir * 16, 24, 136), clamp(b.y - 20 - k * 18, 40, 200)]);
            startWps(); G.wanderAt = G.T + 4; }],
          [1, () => {   // 水面をのぞく
            fish.speed = rnd(45, 60); fish.tx = rnd(30, 130); fish.ty = rnd(34, 42); G.wanderAt = G.T + 3; }],
          [1, () => {   // 底をつつく
            fish.speed = rnd(40, 55); fish.tx = rnd(30, 130); fish.ty = rnd(192, FLOOR - 6); G.wanderAt = G.T + 3; }],
          [0.6, () => { // ほんの少し休む
            fish.cruise = false; fish.speed = 14; fish.tx = clamp(fish.x + rnd(-6, 6), 25, 135); fish.ty = clamp(fish.y + rnd(-4, 4), 40, 200); G.wanderAt = G.T + rnd(0.6, 1.2); }],
        ])();
      }
      fish.mouth = (Math.sin(G.T * 3) > 0.6) ? 1 : 0;
      moodFace();
    }
    if (idle) {
      const s = g.s;
      if (G.T > G.hintAt) {
        G.hintAt = G.T + rnd(5, 8);
        let icon = G.WANT_ICON[s.want] || null;
        if (s.satiety <= 3) icon = 'food';
        else if (s.dirt >= 3) icon = 'dirty';
        else if (s.stress >= 75) icon = 'angry';
        if (icon && !(G.thought && G.thought.until > G.T)) G.thought = { icon, until: G.T + 2.5 };
      }
    }
    try { g.tick(dt, idle); } catch (e) {}
    if (G.mode === 'play' && A.song && A.song !== 'card') {   // 状態で曲を切りかえる（数秒ごとに判定）
      if (!(G.T < G.songCheckAt)) {
        G.songCheckAt = G.T + 3;
        const st = g.s, pinch = st.satiety <= 2 || st.dirt >= 4 || st.stress >= 85;
        const good = !pinch && st.stress <= 15 && st.satiety >= 8 && st.dirt <= 1;
        A.setSong(pinch ? 'tense' : good ? 'happy' : 'main');
      }
    }
    stepWaves(dt); watchSurface();
    updateVisitor(dt, idle);

    // 餌
    for (let i = G.pellets.length - 1; i >= 0; i--) {
      const p = G.pellets[i];
      if (p.y < FLOOR + 4) { const py0 = p.y; p.y += p.vy * dt; if (py0 < WATER && p.y >= WATER) { splashAt(p.x, 5); if (Math.random() < 0.5) sfx('chapon'); } p.ph += dt * 3; p.x += Math.sin(p.ph) * 4 * dt; if (p.y >= FLOOR + 4) p.y = FLOOR + 4; }
      else if (!p.mine) { p.rot += dt; if (p.rot >= 5) { G.pellets.splice(i, 1); try { g.pelletRotted(); } catch (e) {} } }
    }
    for (const q of G.poops) { if (q.y < FLOOR + 5) q.y = Math.min(FLOOR + 5, q.y + q.vy * dt); }
    for (let i = G.bubbles.length - 1; i >= 0; i--) { const b = G.bubbles[i]; b.y += b.vy * dt; b.x += Math.sin(G.T * 3 + i) * 3 * dt; if (b.y < WATER) G.bubbles.splice(i, 1); }
    // エアストーンからの泡の柱
    if ((G.mode === 'play' || G.mode === 'dead' || G.mode === 'ending') && Math.random() < dt * 7) G.bubbles.push({ x: AIR_X + rnd(-2, 2), y: FLOOR + 1, r: Math.random() < 0.3 ? 2 : 1, vy: rnd(-34, -24), amb: true, air: true });
    // 環境の泡
    if (Math.random() < dt * 0.6 && G.mode !== 'card' && G.mode !== 'zukan') G.bubbles.push({ x: rnd(20, 150), y: FLOOR, r: Math.random() < 0.5 ? 1 : 2, vy: rnd(-12, -6), amb: true });
    G.fx = G.fx.filter(f => G.T - f.t < f.d + 0.01 || G.T < f.t);
    if (G.mode === 'dead' && G.causeId === 'bug' && fish.vis && Math.random() < dt * 2) { sfx('pu'); G.puText = G.T + 0.4; }
  }
}
