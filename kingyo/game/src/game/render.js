// render.js — 描画
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import L from '../logic/index.js';
import S from '../art/sprites.js';
import { W, H, WATER, FLOOR } from './consts.js';
import { rnd, clamp, cause } from './util.js';

export default function install(G) {
  Object.assign(G, { render });
  const { AIR_X, BOOT_BUBBLES, BOOT_T, BTN_ICON, ctx, drawVisitorBack, drawVisitorFront, drawWaves, fish, g, mouthX } = G;

  // ---------------- 描画 ----------------
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    if (G.mode === 'title' || G.mode === 'boot') { renderTitle(); return; }
    const dirt = g.s.dirt | 0;
    S.drawTank(ctx, G.T, dirt);
    if (G.wipes && G.wipes.length) {
      ctx.save(); ctx.beginPath();
      for (const w of G.wipes) { ctx.moveTo(w.x + w.r, w.y); ctx.arc(w.x, w.y, Math.max(0.1, w.r), 0, Math.PI * 2); }
      ctx.clip(); S.drawTank(ctx, G.T, G.wipeDirt); ctx.restore();
    }
    drawWaves();
    if (G.sparkle) drawSparkles();
    for (const tr of G.treasures) drawTreasure(tr.kind, Math.round(tr.x), Math.round(tr.y));
    drawAirStone();
    for (const q of G.poops) S.drawPoop(ctx, Math.round(q.x), Math.round(q.y));
    for (const p of G.pellets) {
      if (p.rot > 0 && ((p.rot * 4) | 0) % 2 === 1 && p.rot > 3) continue; // 消えかけて点滅
      ctx.globalAlpha = 1 - Math.min(1, p.rot / 5) * 0.6;
      S.drawPellet(ctx, Math.round(p.x), Math.round(p.y), p.type);
      ctx.globalAlpha = 1;
    }
    for (const b of G.bubbles) S.drawBubble(ctx, Math.round(b.x), Math.round(b.y), b.r);
    drawVisitorBack();
    if (G.hoop && S.drawFingerHoop) S.drawFingerHoop(ctx, Math.round(G.hoop.x), Math.round(G.hoop.y), G.T);
    if (G.net && S.drawNetBack) S.drawNetBack(ctx, Math.round(G.net.x), Math.round(G.net.y), { t: G.T, tilt: G.net.tilt || 0, sag: G.net.sag || 0, wet: G.net.wet, drip: G.net.drip });
    if (G.eyeball) S.drawEyeball(ctx, Math.round(G.eyeball.x), Math.round(G.eyeball.y));
    drawFishEnt();
    if (G.bigBubble) S.drawBubble(ctx, Math.round(G.bigBubble.x), Math.round(G.bigBubble.y), Math.round(G.bigBubble.r));
    if (G.duck) S.drawDuck(ctx, Math.round(G.duck.x), Math.round(G.duck.y + Math.sin(G.T * 2) * 1), G.T);
    if (G.feather) S.drawFeather(ctx, Math.round(G.feather.x), Math.round(G.feather.y), G.feather.rot);
    if (G.spot && S.drawSpotlight) S.drawSpotlight(ctx, Math.round(G.spot.x), Math.round(G.spot.y), G.T);
    if (G.crack && S.drawCrack) S.drawCrack(ctx, G.crack.x, G.crack.y, G.crack.size);
    if (G.smear && S.drawSmear) S.drawSmear(ctx, G.smear.x, G.smear.y, G.smear.size);
    for (const sc of G.scales) if (G.T >= sc.t && S.drawScale) { const tt = G.T - sc.t; S.drawScale(ctx, Math.round(sc.x + sc.vx * tt + Math.sin(tt * 4) * 3), Math.round(Math.min(FLOOR + 6, sc.y + sc.vy * tt)), sc.rot + tt * 3); }
    if (G.soul && S.drawSoul) S.drawSoul(ctx, Math.round(G.soul.x), Math.round(G.soul.y), G.T);
    if (G.carry) drawTreasure(G.carry, Math.round(mouthX() + fish.face * 2), Math.round(fish.y + 3));
    drawVisitorFront();
    if (G.finger) drawFinger(Math.round(G.finger.x), Math.round(G.finger.y));
    if (G.ball && S.drawBall) S.drawBall(ctx, Math.round(G.ball.x), Math.round(G.ball.y), G.T);
    if (G.paw) S.drawCatPaw(ctx, Math.round(G.paw.x), Math.round(G.paw.y), { fish: !!G.paw.fish, t: G.T });
    if (G.nozzle) S.drawNozzle(ctx, Math.round(G.nozzle.x), Math.round(G.nozzle.y), { suck: true, tail: !fish.vis, t: G.T });
    if (G.brush) { ctx.save(); ctx.translate(Math.round(G.brush.a), 0); S.drawBrush(ctx, Math.round(G.brush.x), Math.round(G.brush.y), G.T); ctx.restore(); }
    if (G.net) {
      if (S.drawNetFront) S.drawNetFront(ctx, Math.round(G.net.x), Math.round(G.net.y), { t: G.T, tilt: G.net.tilt || 0, sag: G.net.sag || 0, wet: G.net.wet, drip: G.net.drip });
      else S.drawNet(ctx, Math.round(G.net.x), Math.round(G.net.y), (G.net.sag || 0) > 0.5);
    }
    for (const f of G.fx) drawFx(f);
    if (G.bigFace && S.drawBigFace) S.drawBigFace(ctx, G.bigFace.p, G.T);
    if (G.puText > G.T && fish.vis) { ctx.fillStyle = '#1d4d4a'; ctx.font = '10px sans-serif'; ctx.fillText('ぷ', Math.round(fish.x + rnd(14, 22)), Math.round(fish.y - 16)); }
    if (G.thought && G.thought.until > G.T && fish.vis && (G.mode === 'play')) {
      const tx = clamp(fish.x + fish.dir * 18, 30, 130), ty = clamp(fish.y - 30, 32, 200);
      S.drawThought(ctx, Math.round(tx), Math.round(ty), G.thought.icon);
    }
    S.drawGauge(ctx, g.s.gauge, 25);
    if (G.mode !== 'title' && G.mode !== 'boot') {
      drawStatus(); G.drawLamps();
      if (g.s.fishNo) { ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff8e0'; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(g.s.fishNo + '匹目', 63 + dx, 13 + dy); ctx.fillStyle = '#1d4d4a'; ctx.fillText(g.s.fishNo + '匹目', 63, 13); }
    }
    let icon = null;
    if (G.mode === 'play' && G.queued) icon = BTN_ICON[G.queued];
    if (G.mode === 'dead' && (G.netReady || G.netQueued) && ((G.T * 2) | 0) % 2 === 0) icon = 'net';
    if (G.mode === 'dead' && G.netQueued) icon = 'net';
    if (G.causeId === 'duck' && (G.mode === 'dead') && !G.netReady && !G.netQueued) icon = 'duck';
    S.drawIconSlot(ctx, icon);

    if (G.mode === 'card' || G.mode === 'zukan') {
      ctx.fillStyle = 'rgba(16,40,40,0.45)'; ctx.fillRect(0, 0, W, H);
      if (G.mode === 'card') {
        S.drawCard(ctx, cause(G.causeId), G.cardNew);
        const pe = g.persona && g.persona();
        ctx.fillStyle = '#fff8e0'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(g.s.fishNo + '匹目' + (pe ? '　' + pe.name + 'な金魚でした' : ''), 80, 34); ctx.textAlign = 'left';
        if (G.T - G.cardT >= 4 && ((G.T * 1.5) | 0) % 2 === 0) {
          ctx.fillStyle = '#fff8e0'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('網:図鑑  ほか:つぎの魚', 80, 200); ctx.textAlign = 'left';
        }
      } else {
        const z = g.s.zukan; const ids = z ? (z.has ? [...z] : z) : [];
        S.drawZukan(ctx, ids, L.CAUSES, L.CAUSES.findIndex(c => c.id === G.causeId));
      }
    }
  }

  // 人の指（上から差しこまれる。水に入った部分は少し水色がかる）
  const mixc = (a, b, t) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = sh => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
    return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')'; };
  const FING = { skin: '#f7c6a3', shade: '#e0a07a', nail: '#ffe8de', nailEdge: '#e9b7a4', crease: '#c98466', line: '#1d4d4a' };
  const FING_W = {}; for (const k in FING) FING_W[k] = k === 'line' ? FING[k] : mixc(FING[k], '#5fcfb8', 0.2);
  function drawFinger(x, tip) {
    for (let y = Math.max(-2, tip - 90); y <= tip + 1; y++) {
      if (y < 0) continue;
      const c = y > WATER ? FING_W : FING;
      const d = tip - y;
      if (d < 0) { ctx.fillStyle = c.line; ctx.fillRect(x - 3, y, 7, 1); continue; }
      const w = d <= 0 ? 4 : d <= 1 ? 5 : d <= 3 ? 6 : 7;      // 指先は丸く、幅15px
      ctx.fillStyle = c.line; ctx.fillRect(x - w - 1, y, 2 * w + 3, 1);
      ctx.fillStyle = c.skin; ctx.fillRect(x - w, y, 2 * w + 1, 1);
      ctx.fillStyle = c.shade; ctx.fillRect(x + w - 2, y, 3, 1);
      if (d >= 3 && d <= 12) { ctx.fillStyle = d === 12 ? c.nailEdge : c.nail; ctx.fillRect(x - 4, y, 8, 1); ctx.fillStyle = c.nailEdge; ctx.fillRect(x - 5, y, 1, 1); ctx.fillRect(x + 4, y, 1, 1); }
      if (d === 22 || d === 40) { ctx.fillStyle = c.crease; ctx.fillRect(x - 4, y, 8, 1); }
      if (d === 23 || d === 41) { ctx.fillStyle = c.crease; ctx.fillRect(x - 3, y, 6, 1); }
    }
    // 水面のゆらぎ
    if (tip > WATER) { ctx.fillStyle = '#e8fff8'; ctx.fillRect(x - 10, WATER, 3, 1); ctx.fillRect(x + 8, WATER, 3, 1); }
  }


  // ---------------- 底の小物（宝物・小石・エアストーン） ----------------
  const TCOL = { line: '#1d4d4a', gold: '#ffd23a', goldD: '#c9961a', pink: '#ff9fb8', pinkD: '#d86a88', gray: '#9aa3a0', grayD: '#6d7774', orange: '#ff8a3c', white: '#ffffff' };
  function px(x, y, c, w, h) { ctx.fillStyle = c; ctx.fillRect(x, y, w || 1, h || 1); }
  function drawTreasure(kind, x, y) {
    const C = TCOL;
    if (kind === 'pebble') { px(x - 3, y - 3, C.line, 7, 4); px(x - 2, y - 2, C.gray, 5, 2); px(x - 1, y - 2, '#c4ccc9', 2, 1); }
    else if (kind === 'coin') { px(x - 3, y - 3, C.line, 6, 6); px(x - 2, y - 2, C.gold, 4, 4); px(x - 1, y - 2, C.white, 1, 2); px(x + 1, y, C.goldD, 1, 1); if (((G.T * 2) | 0) % 3 === 0) px(x + 2, y - 4, C.white); }
    else if (kind === 'shell') { px(x - 4, y - 4, C.line, 9, 5); px(x - 3, y - 3, C.pink, 7, 3); px(x - 2, y - 3, C.pinkD, 1, 3); px(x, y - 3, C.pinkD, 1, 3); px(x + 2, y - 3, C.pinkD, 1, 3); px(x - 1, y + 1, C.line, 3, 1); }
    else if (kind === 'crown') { px(x - 4, y - 5, C.line, 9, 6); px(x - 3, y - 2, C.gold, 7, 2); px(x - 3, y - 4, C.gold, 1, 2); px(x, y - 4, C.gold, 1, 2); px(x + 3, y - 4, C.gold, 1, 2); px(x, y - 2, '#ff5a6a'); if (((G.T * 2) | 0) % 3 === 0) px(x - 3, y - 6, C.white); }
    else if (kind === 'star') { px(x - 1, y - 4, C.orange, 3, 7); px(x - 4, y - 1, C.orange, 9, 2); px(x - 2, y + 1, C.orange, 1, 2); px(x + 2, y + 1, C.orange, 1, 2); px(x, y - 1, '#ffd0a0'); }
  }
  function drawAirStone() {
    const x = AIR_X, y = FLOOR + 5;
    px(x - 5, y - 3, TCOL.line, 11, 5); px(x - 4, y - 2, '#5a6e78', 9, 3); px(x - 3, y - 2, '#8fa2ab', 3, 1);
    px(x + 5, y, TCOL.line, 14, 1);   // チューブ
  }

  // ---------------- おなか・ストレス・よごれ（画面下の帯） ----------------
  function drawStatus() {
    const s = g.s, y = 228;
    ctx.fillStyle = 'rgba(255,248,224,0.88)'; ctx.fillRect(2, y - 4, 156, 14);
    ctx.fillStyle = '#1d4d4a'; ctx.fillRect(2, y - 5, 156, 1); ctx.fillRect(2, y + 10, 156, 1);
    const blinkOn = ((G.T * 3) | 0) % 2 === 0;
    const bar = (x, w, v, col, warn) => {
      ctx.fillStyle = '#1d4d4a'; ctx.fillRect(x - 1, y, w + 2, 6);
      ctx.fillStyle = '#d9cfb6'; ctx.fillRect(x, y + 1, w, 4);
      ctx.fillStyle = warn && blinkOn ? '#e0453a' : col; ctx.fillRect(x, y + 1, Math.round(w * clamp(v, 0, 1)), 4);
    };
    // おなか：粒アイコン＋バー
    ctx.fillStyle = '#1d4d4a'; ctx.fillRect(5, y, 6, 6); ctx.fillStyle = '#c98a3a'; ctx.fillRect(6, y + 1, 4, 4); ctx.fillStyle = '#f2c27a'; ctx.fillRect(6, y + 1, 2, 1);
    const hunger = 1 - s.satiety / L.SATIETY_MAX;   // 空腹：食べたら0に戻る
    bar(14, 36, hunger, hunger < 0.5 ? '#f0b030' : hunger < 0.8 ? '#f08a30' : '#e0453a', hunger >= 0.83);
    // ストレス：怒りマーク＋バー（緑→黄→赤）
    const sx = 58;
    ctx.fillStyle = '#e0453a'; ctx.fillRect(sx, y, 2, 2); ctx.fillRect(sx + 4, y, 2, 2); ctx.fillRect(sx, y + 4, 2, 2); ctx.fillRect(sx + 4, y + 4, 2, 2); ctx.fillRect(sx + 2, y + 2, 2, 2);
    const st = s.stress / 100;
    bar(sx + 9, 36, st, st < 0.4 ? '#5bbf5a' : st < 0.75 ? '#e8b730' : '#e0453a', s.stress >= 75);
    // よごれ：4段のマス
    const dx = 112;
    ctx.fillStyle = '#1d4d4a'; ctx.fillRect(dx, y, 6, 6); ctx.fillStyle = '#7a9a3a'; ctx.fillRect(dx + 1, y + 1, 4, 4); ctx.fillStyle = '#4f6e22'; ctx.fillRect(dx + 3, y + 3, 2, 2);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#1d4d4a'; ctx.fillRect(dx + 9 + i * 9, y, 8, 6);
      ctx.fillStyle = i < s.dirt ? (s.dirt >= 3 && blinkOn ? '#e0453a' : '#7a8a3a') : '#d9cfb6'; ctx.fillRect(dx + 10 + i * 9, y + 1, 6, 4);
    }
  }

  function drawFishEnt() {
    if (!fish.vis) return;
    const gg = g.s.gauge, stage = gg < 9 ? 1 : gg < 18 ? 2 : 3;
    if (fish.inNet) {
      const o2 = Object.assign({ dir: fish.face, t: G.T, eyes: fish.eyes, mouth: 'o', stage }, fish.opts, { scale: 0.8, rot: fish.face * 0.3 + (G.net ? G.net.tilt || 0 : 0) + Math.sin(G.T * 9) * 0.06 });
      if (!fish.opts.dragon) S.drawFish(ctx, Math.round(fish.x), Math.round(fish.y), o2);
      return;
    }
    const o = Object.assign({ dir: fish.face, t: G.T, mouth: fish.mouth, eyes: fish.eyes, stage }, fish.opts);
    if (fish.turnP > 0) o.turn = fish.turnP;
    if (!fish.opts.scale && !fish.rot && !fish.splitHead) { o.sx = Math.round(fish.sx * 20) / 20; o.sy = Math.round(fish.sy * 20) / 20; }
    if (!fish.opts.variant && G.mode !== 'dead') {
      const ex = fish.ex;
      for (const k of ['eyes', 'mouth', 'brows', 'mark', 'front', 'wag', 'cheeks', 'blush', 'sweat']) if (ex[k] != null) o[k] = ex[k];
      if (G.T < fish.chewUntil) { o.cheeks = true; o.chew = ((fish.chewUntil - G.T) * 3.2) % 1; o.mouth = 0; }
      if (o.eyes === 'normal' && G.T < fish.blinkUntil) o.eyes = 'blink';
    }
    if (fish.rot) o.rot = fish.rot;
    if (fish.legLen) o.legLen = fish.legLen;
    if (fish.look) o.look = fish.look;
    let x = Math.round(fish.x + fish.ox + (G.T < fish.shakeUntil ? Math.sin(G.T * 30) * 2 : 0)), y = Math.round(fish.y + fish.oy);
    if (fish.glitch) { // ドットだけずれる
      const j = ((G.T * 8) | 0) % 3;
      x += [0, 3, -2][j];
      ctx.save(); ctx.beginPath(); ctx.rect(0, y - 4, W, 5); ctx.clip();
      S.drawFish(ctx, x + 6, y, o); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, y - 4); ctx.rect(0, y + 1, W, H); ctx.clip();
      S.drawFish(ctx, x, y, o); ctx.restore();
      return;
    }
    if (fish.hermit && S.drawHermit) { S.drawHermit(ctx, x, FLOOR + 6, G.T); return; }
    if (fish.splitHead > 0) {
      // 体のうしろから、逆向きの頭がもう一つ生えてくる
      S.drawFish(ctx, x, y, o);
      const sc = Math.round((0.35 + 0.65 * fish.splitHead) * 20) / 20;
      ctx.save(); ctx.beginPath();
      if (o.dir > 0) ctx.rect(0, 0, x + 1, H); else ctx.rect(x, 0, W - x, H);
      ctx.clip();
      S.drawFish(ctx, x, y, Object.assign({}, o, { dir: -o.dir, scale: sc, turn: 0, sx: 1, sy: 1 }));
      ctx.restore();
      return;
    }
    S.drawFish(ctx, x, y, o);
  }

  function drawFx(f) {
    const a = (G.T - f.t) / f.d; if (a < 0) return;
    if (f.k === 'drop') { const tt = G.T - f.t; ctx.fillStyle = '#e8fff8'; ctx.fillRect(Math.round(f.x + f.vx * tt), Math.round(f.y + f.vy * tt + 60 * tt * tt), 1, 1); }
    if (f.k === 'star') { ctx.fillStyle = '#ffe14a'; const r = 3 + a * 6; for (let i = 0; i < 5; i++) { const an = i * 1.26 + a * 3; ctx.fillRect(Math.round(f.x + Math.cos(an) * r), Math.round(f.y + Math.sin(an) * r), 2, 2); } }
    if (f.k === 'text') {
      const rise = (G.T - f.t) * 14;
      ctx.font = (f.big ? 'bold 12px' : 'bold 9px') + ' sans-serif'; ctx.textAlign = 'center';
      ctx.globalAlpha = Math.max(0, 1 - a * a);
      ctx.fillStyle = '#1d4d4a';
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(f.s, Math.round(f.x + dx), Math.round(f.y - rise + dy));
      ctx.fillStyle = f.c; ctx.fillText(f.s, Math.round(f.x), Math.round(f.y - rise));
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
    if (f.k === 'rainbow') {
      const cols = ['#ff5a5a', '#ffa23c', '#ffe14a', '#5bd36a', '#4ab8ff', '#9a6bff'];
      ctx.globalAlpha = 0.28 * (1 - a);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(0, 24 + i * 32 + Math.round(Math.sin(G.T * 6 + i) * 4), W, 32); }
      ctx.globalAlpha = 1;
    }
    if (f.k === 'sand') { const tt = G.T - f.t; ctx.globalAlpha = 1 - a; px(Math.round(f.x + f.vx * tt), Math.round(f.y + f.vy * tt + 50 * tt * tt), a < 0.5 ? '#e9b37a' : '#c98a50', 2, 2); ctx.globalAlpha = 1; }
    if (f.k === 'ring') {
      // 水面を上から斜めに見た波紋（横長の楕円の線）
      const rr = 3 + a * f.r, ry = Math.max(1, rr * 0.22);
      ctx.globalAlpha = 0.85 * (1 - a);
      ctx.fillStyle = '#f4fffb';
      for (let k = 0; k < 40; k++) { const an = k / 40 * Math.PI * 2; ctx.fillRect(Math.round(f.x + Math.cos(an) * rr), Math.round(WATER + 2 + Math.sin(an) * ry), 2, 1); }
      ctx.globalAlpha = 1;
    }
    if (f.k === 'heart') {
      const tt = G.T - f.t; ctx.globalAlpha = 1 - a; ctx.fillStyle = '#ff5a86';
      const x = Math.round(f.x + f.vx * tt), y = Math.round(f.y - tt * 18);
      ctx.fillRect(x - 2, y, 2, 2); ctx.fillRect(x + 1, y, 2, 2); ctx.fillRect(x - 2, y + 1, 5, 2); ctx.fillRect(x - 1, y + 3, 3, 1); ctx.fillRect(x, y + 4, 1, 1);
      ctx.globalAlpha = 1;
    }
    if (f.k === 'badge') {
      const rise = Math.min(1, (G.T - f.t) * 4);
      ctx.globalAlpha = a > 0.8 ? (1 - a) * 5 : 1;
      if (S.drawBadge) S.drawBadge(ctx, 80, Math.round(48 - (1 - rise) * 8), f.s);
      else { ctx.fillStyle = '#fff8e0'; ctx.fillRect(30, 40, 100, 14); ctx.fillStyle = '#1d4d4a'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(f.s, 80, 50); ctx.textAlign = 'left'; }
      ctx.globalAlpha = 1;
    }
    if (f.k === 'flash') { ctx.fillStyle = 'rgba(255,255,180,0.7)'; ctx.fillRect(0, 0, W, H); }
    if (f.k === 'fire') S.drawFlame(ctx, Math.round(f.x), Math.round(f.y), f.dir, G.T);
  }

  function drawSparkles() {
    ctx.fillStyle = '#fffbe8';
    for (let i = 0; i < 6; i++) {
      const x = (i * 53 + 20) % 140 + 10, y = (i * 37 + 40) % 180 + 30, on = ((G.T * 3 + i) | 0) % 3 === 0;
      if (!on) continue;
      ctx.fillRect(x, y - 2, 1, 5); ctx.fillRect(x - 2, y, 5, 1);
    }
  }

  function renderTitle() {
    S.drawTank(ctx, G.T, 0);
    if (G.mode === 'boot') {
      if (G.T - G.bootT > BOOT_T * 0.5 || G.bootT > 0.5) { /* 次の魚の前：まっさらな水槽 */ }
      // 泡が下から一気に湧いて画面を埋めつくし、はじけて晴れる
      const t = G.T - G.bootT, D = BOOT_T;
      const fill = t < D * 0.45 ? t / (D * 0.45) : Math.max(0, 1 - (t - D * 0.55) / (D * 0.45));
      ctx.fillStyle = 'rgba(236,255,250,' + (0.85 * Math.min(1, fill * 1.2)).toFixed(3) + ')';
      const top = Math.round(H - H * Math.min(1, (t / (D * 0.45)) * 1.1));
      ctx.fillRect(0, Math.max(0, top), W, H);
      for (const b of BOOT_BUBBLES) {
        const tt = t - b.d; if (tt < 0) continue;
        const y = H + 12 - tt * b.v; if (y < -12) continue;
        const x = b.x + Math.sin(tt * b.w + b.ph) * 3;
        S.drawBubble(ctx, Math.round(x), Math.round(y), b.r);
      }
      if (t > D * 0.6) for (let i = 0; i < 12; i++) { const a = ((t * 3 + i * 0.37) % 1); if (a < 0.2) { ctx.fillStyle = '#ffffff'; ctx.fillRect((i * 53) % 150 + 5, (i * 97) % 220 + 10, 2, 2); } }
      return;
    }
    ctx.fillStyle = 'rgba(255,248,224,0.92)'; ctx.fillRect(14, 70, 132, 70);
    ctx.strokeStyle = '#1d4d4a'; ctx.strokeRect(14.5, 70.5, 131, 69);
    ctx.fillStyle = '#1d4d4a'; ctx.textAlign = 'center';
    ctx.font = 'bold 15px sans-serif'; ctx.fillText('きんぎょの', 80, 96);
    ctx.fillText('さいご', 80, 116);
    ctx.font = '8px sans-serif';
    if (((G.T * 1.5) | 0) % 2 === 0) ctx.fillText('どれかボタンでスタート', 80, 132);
    ctx.textAlign = 'left';
    S.drawFish(ctx, 80 + Math.round(Math.sin(G.T) * 30), 180, { dir: Math.cos(G.T) > 0 ? 1 : -1, t: G.T, mouth: (G.T * 2 | 0) % 2, eyes: 'normal' });
  }
}
