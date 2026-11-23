// node test/sprites.test.js — モックctxで全API・全フラグを例外なく描けるか＋1フレームの所要時間を確認
import S from '../src/art/sprites.js';
let calls = 0;
const ctx = { fillStyle: '', strokeStyle: '', globalAlpha: 1, font: '', textAlign: '', textBaseline: '', imageSmoothingEnabled: false,
  fillRect() { calls++; }, strokeRect() {}, fillText() {}, measureText(t) { return { width: String(t).length * 8 }; },
  save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, translate() {}, rotate() {}, scale() {} };
const ctxNoScale = Object.assign({}, ctx); delete ctxNoScale.scale;
const eyes = ['normal','happy','x','dizzy','smug','sleepy','wide', undefined, 'angry'];
const flags = ['white','frozen','burnt','flower','moss','stone','skeleton','bones','belly','wrinkles','puff','balloon','flip','spark','shine','glitch','legs','drown','xray','smoke','fumes','stars','lightning','sparkle','sweat',
  'stuck','halo','wings','knot','flat','dragon','bald','idol','round','hermit','soul','butterfly','fly'];
let n = 0;
for (const st of [1,2,3,undefined,0,7,'2']) for (const e of eyes) for (const f of [null, ...flags]) for (const dir of [1,-1]) {
  const o = { stage: st, eyes: e, dir, t: n * 0.07, mouth: n & 1 };
  if (f) o[f] = true;
  S.drawFish(ctx, 80, 120, o); n++;
}
for (const v of Object.keys(S.VARIANTS)) for (const st of [1,2,3]) { S.drawFish(ctx, 80, 100, { variant: v, stage: st, t: 0.3 }); n++; }
for (const sp of [true, 0, 1, 2, 3, 5.5, 8, 20]) for (const st of [1,2,3]) { S.drawFish(ctx, 80, 100, { split: sp, stage: st, rot: 0.3, flip: true }); n++; }
for (const ll of [undefined, 0, 2, 24, 60, 100]) { S.drawFish(ctx, 80, 100, { legs: true, legLen: ll, dir: -1, scale: 1.5 }); n++; }
for (const sc of [0.3, 0.45, 0.5, 0.85, 1, 1.6, 2, 2.6, 3.3, true]) { S.drawFish(ctx, 80, 100, { scale: sc, eyes: 'smug' }); n++; }
for (let r = -7; r <= 7; r += 0.37) { S.drawFish(ctx, 80, 100, { rot: r, dir: r > 0 ? 1 : -1 }); n++; }
S.drawFish(ctx, 80, 100); S.drawFish(ctx, 80, 100, null); S.drawFish(ctx, NaN, 100, { rot: NaN, scale: NaN, legLen: NaN, split: NaN });
S.drawFish(ctx, 80, 100, { look: 'up' }); S.drawFish(ctx, 80, 100, { look: 'nope' });
for (const fs of [undefined, 0, 1, 2, 3, -1, 9, NaN, '2']) for (const st of [1,2,3]) { S.drawFish(ctx, 80, 100, { flower: true, flowerStage: fs, stage: st, t: 0.4 }); n++; }
for (const xr of [true, 'blink', false]) for (let k = 0; k < 8; k++) { S.drawFish(ctx, 80, 100, { xray: xr, t: k / 8, flip: true, eyes: 'x', puff: k === 3, belly: k === 4 }); n++; }
for (const v of Object.keys(S.VARIANTS)) for (const sc of [0.4, 0.85, 1.5]) { S.drawFish(ctx, 80, 100, { variant: v, scale: sc, dir: -1, t: 0.7, split: v === 'split' ? 4 : undefined, legLen: 40 }); n++; }
for (const e of eyes) for (const l of ['fwd','up','down','back','front']) { S.drawFish(ctx, 80, 210, { stone: true, eyes: e, look: l, dir: l === 'back' ? -1 : 1 }); n++; }
S.drawFish(ctx, 80, 100, { stone: true, moss: true, glitch: true, split: 3 }); S.drawFish(ctx, 80, 100, { skeleton: true, legs: true, xray: true, wrinkles: true, belly: true });
// ---- 新しい opts（振り返り・正面・squash・もぐもぐ・口・目・眉・記号・wag） ----
const EYES2 = ['normal','happy','x','dizzy','smug','sleepy','wide','angry','blink','surprised','annoyed','love','teary','sparkle','closed','side','nope', undefined];
const MOUTHS2 = [0, 1, true, false, '1', 'o', 'yawn', 'grin', 'pout', 'smile', 'wavy', 'tongue', 'c1', 'nope', null];
for (const st of [1,2,3]) for (const e of EYES2) for (const m of MOUTHS2) for (const fr of [false, true]) { S.drawFish(ctx, 80, 120, { stage: st, eyes: e, mouth: m, front: fr, t: n * 0.05, dir: n & 1 ? 1 : -1 }); n++; }
for (const b of ['none','up','down','worried','angry','he','nope', undefined]) for (const fr of [false, true]) for (const e of ['normal','annoyed','angry','smug']) { S.drawFish(ctx, 80, 100, { brows: b, front: fr, eyes: e }); n++; }
for (let k = 0; k <= 16; k++) for (const dir of [1,-1]) for (const st of [1,2,3]) { S.drawFish(ctx, 80, 100, { turn: k / 16, dir, stage: st, t: k / 16, rot: k % 3 ? 0 : 0.3, scale: k % 4 ? 1 : 0.5 }); n++; }
for (const tv of [-1, 2, NaN, '0.5', null, true]) { S.drawFish(ctx, 80, 100, { turn: tv }); n++; }
for (let k = 0; k < 16; k++) for (const fr of [false, true]) { S.drawFish(ctx, 80, 100, { chew: k / 8 - 0.5, cheeks: k & 1 ? true : false, front: fr, t: k / 8 }); n++; }
for (const c of [NaN, null, undefined, 'x', true, Infinity]) { S.drawFish(ctx, 80, 100, { chew: c, cheeks: true }); n++; }
for (const sx of [0, 0.1, 0.5, 1, 1.2, 1.35, 3, 9, NaN, -1]) for (const sy of [0.75, 1, 1.3, NaN]) for (const fr of [false, true]) { S.drawFish(ctx, 80, 100, { sx, sy, front: fr, legs: sx === 1.2, split: sx === 3 ? 3 : undefined }); n++; }
for (const m of ['zzz','!','?','note','anger','heart','sweat','♪','💢','nope', true, 1]) for (const fr of [false, true]) { S.drawFish(ctx, 80, 100, { mark: m, front: fr, t: n * 0.1, flip: n % 3 === 0, flower: n % 5 === 0, scale: n % 4 === 0 ? 2 : 1 }); S.drawFish(ctx, 80, 100, { bubble: m, fx: false }); n++; }
for (const w of [0, 0.5, 1, 2, 3, NaN, -1, '2']) for (let k = 0; k < 8; k++) { S.drawFish(ctx, 80, 100, { wag: w, t: k / 8 }); n++; }
for (const f of [null, ...flags]) for (const fr of [{ front: true }, { turn: 0.3 }, { turn: 0.5 }, { turn: 0.8, dir: -1 }]) {
  const o = Object.assign({ t: n * 0.07, eyes: 'love', mouth: 'grin', cheeks: true, chew: 0.4, blush: true, brows: 'worried', sx: 1.1, sy: 0.9, mark: '!' }, fr);
  if (f) o[f] = true; S.drawFish(ctx, 80, 120, o); n++;
}
for (const v of Object.keys(S.VARIANTS)) for (const fr of [{ front: true }, { turn: 0.4 }, { sx: 1.3, sy: 0.8 }]) { S.drawFish(ctx, 80, 100, Object.assign({ variant: v, t: 0.3, legLen: 30 }, fr)); n++; }
// 他の関数
for (const id of Object.keys(S.VARIANTS).concat(['', 'nope', undefined])) for (const sz of [0.8, 0.85, 1, 2]) { S.drawCauseIcon(ctx, 40, 40, id, sz, 0.3); S.drawCauseIcon(ctxNoScale, 40, 40, id, sz); }
for (const id of Object.keys(S.VARIANTS)) { S.drawCard(ctx, { id, name: id, kind: 'sudden' }, true); S.drawCard(ctxNoScale, { id, name: id, kind: 'ending' }, false); }
S.drawCard(ctx); S.drawCard(ctx, null, false);
for (let t = 0; t < 3; t += 0.13) {
  S.drawSmoke(ctx, 50, 50, t); S.drawFumes(ctx, 50, 50, t); S.drawStars(ctx, 50, 50, t); S.drawLightning(ctx, 50, 50, t);
  S.drawSparkles(ctx, 50, 50, t, 20); S.drawSuctionLines(ctx, 50, 50, t); S.drawSplash(ctx, 50, 20, t / 3); S.drawFlame(ctx, 50, 50, t > 1 ? 1 : -1, t);
  S.drawPop(ctx, 50, 50, 12, t / 3); S.drawBird(ctx, 50, 20, t, t > 1 ? -1 : 1); S.drawDrop(ctx, 50, 50);
  S.drawNozzle(ctx, 50, 50, { tail: true, suck: true, t }); S.drawCatPaw(ctx, 50, 50, { fish: true, t }); S.drawPellet(ctx, 50, 50, 'poison', t); S.drawPellet(ctx, 50, 50, 'spark', t);
}
S.drawSmoke(ctx, 1, 1); S.drawStars(ctx, 1, 1); S.drawLightning(ctx, 1, 1); S.drawSplash(ctx, 1, 1); S.drawFlame(ctx, 1, 1); S.drawPop(ctx, 1, 1); S.drawSparkles(ctx, 1, 1);
S.drawNozzle(ctx, 30, 30, true); S.drawCatPaw(ctx, 30, 30, null); S.drawBubble(ctx, 50, 50, 22); S.drawBubble(ctx, 50, 50, 8);
S.drawTank(ctx, 1, 4); S.drawBrush(ctx, 50, 50, 0.3); S.drawBrush(ctx, 50, 50);
S.drawNet(ctx, 50, 50, true); S.drawCard(ctx, { id: 'fishman', name: '魚人', kind: 'ending' }, true); S.drawCard(ctx, { id: 'split', name: '分裂', kind: 'ending' }, false);
S.drawZukan(ctx, new Set(Object.keys(S.VARIANTS)), Object.keys(S.VARIANTS).map(id => ({ id, name: id, kind: 'ending' })), 3);
['normal','poison','ice','seed','fire','spark'].forEach(p => S.drawPellet(ctx, 10, 10, p));
S.drawFeather(ctx, 30, 30, 0.7); S.drawDuck(ctx, 10, 10, 0); S.drawCatPaw(ctx, 30, 30); S.drawNozzle(ctx, 30, 30); S.drawEyeball(ctx, 5, 5);
['food','dirty','heart','zzz','angry','note'].forEach(i => S.drawThought(ctx, 50, 50, i)); S.drawGauge(ctx, 12, 25); S.drawIconSlot(ctx, 'net');

// ---- 追加の死因12種 ----
const NEW_IDS = ['stuck','hiccupfly','knotted','flat','nowake','overhere','dragon','golden','bald','hermit','idol','round'];
for (const id of NEW_IDS) if (!S.VARIANTS[id]) { console.error('missing variant', id); process.exit(1); }
if (Object.keys(S.VARIANTS).length !== 36) { console.error('VARIANTS != 36'); process.exit(1); }
for (const id of NEW_IDS) for (const st of [1,2,3]) for (const fr of [{}, {front:true}, {turn:0.3}, {turn:0.8, dir:-1}, {scale:0.4}, {scale:2}, {rot:0.5, flip:true}, {sx:1.2, sy:0.8}, {mark:'!'}, {fx:false}])
  { S.drawFish(ctx, 80, 100, Object.assign({ variant: id, stage: st, t: n * 0.07 }, fr)); n++; }
S.drawFish(ctx, 80, 100, { palette: 'gold', shine: true, front: true }); S.drawFish(ctx, 80, 100, { stuck: true, knot: true, flat: true, bald: true, idol: true, round: true });
for (let t = 0; t < 6; t += 0.11) {
  S.drawCrack(ctx, 50, 50, t / 3); S.drawSoul(ctx, 50, 50, t); S.drawBigFace(ctx, t / 5, t); S.drawSmear(ctx, 50, 50, 0.3 + t / 4);
  S.drawDragon(ctx, 80, 80, t, t > 3 ? -1 : 1); S.drawScale(ctx, 20, 20, t); S.drawHermit(ctx, 80, 220, t); S.drawSpotlight(ctx, 80, 220, t);
}
S.drawCrack(ctx, 1, 1); S.drawSoul(ctx, 1, 1); S.drawBigFace(ctx); S.drawBigFace(ctx, 2, NaN); S.drawSmear(ctx, 1, 1); S.drawDragon(ctx, 1, 1); S.drawScale(ctx, 1, 1); S.drawHermit(ctx, 1, 1); S.drawSpotlight(ctx, 1, 1);
const ALL36 = Object.keys(S.VARIANTS).map((id, i) => ({ id, name: id, kind: i < 20 ? 'sudden' : 'ending' }));
for (let k = -1; k < 37; k++) { S.drawZukan(ctx, new Set(ALL36.filter((c, i) => i % 2).map(c => c.id)), ALL36, k); S.drawZukan(ctx, ALL36.map(c => c.id), ALL36, k); }
S.drawZukan(ctx, [], ALL36.slice(0, 24), 0); S.drawZukan(ctx, null, null, null);
console.log('new causes ok', n);
console.log('ok draws', n, 'fillRect', calls);

// 性能: 回転し続ける魚 / 拡大し続ける魚 / 通常
// ---- 網（drawNetBack / drawNetFront / drawNet） ----
for (const o of [undefined, null, {}, 5, 'x', { sag: 0 }, { sag: 1, wet: true, drip: true }, { sag: NaN, tilt: NaN, t: NaN }, { sag: -3, tilt: 9, t: Infinity }, { sag: '0.5', tilt: '-0.4', wet: 1, drip: 1, t: '2' }])
  for (const tl of [-0.4, 0, 0.4]) for (let k = 0; k < 4; k++) {
    const oo = o && typeof o === 'object' ? Object.assign({ t: k / 4, tilt: o.tilt !== undefined ? o.tilt : tl }, o) : o;
    S.drawNetBack(ctx, 80, 60, oo); S.drawFish(ctx, 80, 72, { scale: 0.8, eyes: 'x' }); S.drawNetFront(ctx, 80, 60, oo); n++;
  }
S.drawNetBack(ctx, NaN, NaN, { wet: true, drip: true }); S.drawNetFront(ctx, NaN, NaN, { wet: true, drip: true });
for (const full of [true, false, undefined, 1]) { S.drawNet(ctx, 80, 60, full); S.drawNet(ctx, 0, -10, full, 0.5); n++; }

// ---- 水槽の仲間・おもちゃ ----
{
  const OS = [undefined, null, {}, 5, 'x', { rot: NaN, dir: NaN }, { surprised: true, pinch: true, angry: true, jump: true, dir: -1, rot: 2.5 }, { rot: '1', dir: '-1' }, { rot: Infinity }];
  for (const o of OS) for (const t of [0, 0.13, 0.5, 1.7, -3, NaN, undefined, '0.2', Infinity]) {
    S.drawSnail(ctx, 50, 50, t, o); S.drawCrab(ctx, 50, 210, t, o); S.drawShrimp(ctx, 50, 150, t, o);
    S.drawBall(ctx, 30, 30, t); S.drawFingerHoop(ctx, 80, 90, t); S.drawPellet(ctx, 50, 50, 'gold', t); n++;
  }
  for (let r = -7; r <= 7; r += 0.29) S.drawSnail(ctx, 10, 100, r, { rot: r, surprised: r > 3 });
  for (const y of [-40, 0, 10, 22, 30, 60, 200, 300, NaN]) S.drawFingerHoop(ctx, 80, y, 0.3);
  S.drawFingerHoop(ctx, NaN, NaN); S.drawBall(ctx, NaN, NaN); S.drawPellet(ctx, 1, 1, 'gold');
  ctx.font = '7px X'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  for (const l of ['きんちゃん', '', null, undefined, 0, 12345, 'とても長い名前のきんぎょちゃん', { toString() { return 'obj'; } }]) { S.drawBadge(ctx, 80, 30, l); S.drawBadge(ctxNoScale, NaN, NaN, l); }
  const ctxNoMeasure = Object.assign({}, ctx); delete ctxNoMeasure.measureText; S.drawBadge(ctxNoMeasure, 40, 40, 'ゴン');
  const ctxBadMeasure = Object.assign({}, ctx, { measureText() { return {}; } }); S.drawBadge(ctxBadMeasure, 40, 40, 'ゴン');
  if (ctx.textAlign !== 'left' || ctx.font !== '7px X' || ctx.textBaseline !== 'top') { console.error('drawBadge leaked font/align'); process.exit(1); }
  S.prewarmFriends(); console.log('friends ok');
}
function bench(label, fn, N) { const t0 = process.hrtime.bigint(); for (let i = 0; i < N; i++) fn(i); const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N; console.log(label, ms.toFixed(3), 'ms/frame'); return ms; }
const worst = [];
worst.push(bench('normal swim', i => S.drawFish(ctx, 80, 100, { t: i / 60, stage: 2, mouth: (i >> 4) & 1, dir: 1 }), 600));
worst.push(bench('rot anim (uncached each frame)', i => S.drawFish(ctx, 80, 100, { t: i / 60, rot: i * 0.031 }), 300));
worst.push(bench('rot static (cached)', i => S.drawFish(ctx, 80, 100, { t: 0, rot: -0.4, eyes: 'happy' }), 300));
worst.push(bench('cramped grow 1.6->3.3', i => S.drawFish(ctx, 80, 100, { t: i / 60, scale: 1.6 + 1.7 * i / 96 }), 96));
worst.push(bench('fishman legs grow', i => S.drawFish(ctx, 80, 100, { t: i / 60, legs: true, legLen: 24 + (i % 84) }), 84));
worst.push(bench('split grow', i => S.drawFish(ctx, 80, 100, { t: i / 60, split: 3 + (i % 6) }), 90));
worst.push(bench('brush', i => S.drawBrush(ctx, 80, 100, i / 60), 300));
worst.push(bench('bug glitch anim', i => S.drawFish(ctx, 80, 100, { variant: 'bug', t: i / 60 }), 300));
worst.push(bench('shock xray blink + fx', i => S.drawFish(ctx, 80, 100, { variant: 'shock', t: i / 60 }), 300));
worst.push(bench('burnt smoke', i => S.drawFish(ctx, 80, 100, { variant: 'burnt', t: i / 60 }), 300));
worst.push(bench('dizzy stars', i => S.drawFish(ctx, 80, 100, { variant: 'dizzy', t: i / 60 }), 300));
worst.push(bench('fishman drown', i => S.drawFish(ctx, 80, 100, { variant: 'fishman', legLen: 90, t: i / 60 }), 300));
worst.push(bench('moss blink', i => S.drawFish(ctx, 80, 100, { variant: 'moss', eyes: ['normal','sleepy','x'][(i >> 3) % 3], t: i / 60 }), 300));
worst.push(bench('stone look (uncached builds)', i => S.drawFish(ctx, 80, 100, { stone: true, stage: 1 + (i % 3), dir: (i & 1) ? 1 : -1, look: ['fwd','back','up','down'][i % 4], eyes: ['normal','wide','x'][(i >> 2) % 3] }), 72));
worst.push(bench('flower grow', i => S.drawFish(ctx, 80, 100, { flower: true, flowerStage: (i >> 4) & 3, t: i / 60 }), 300));
worst.push(bench('net full wet drip', i => S.drawNet(ctx, 80, 60, true, i / 60), 300));
worst.push(bench('net back+front tilt', i => { const o = { sag: 1, wet: true, drip: true, tilt: Math.sin(i / 20) * 0.4, t: i / 60 }; S.drawNetBack(ctx, 80, 60, o); S.drawNetFront(ctx, 80, 60, o); }, 300));
worst.push(bench('card (all ids)', i => S.drawCard(ctx, { id: Object.keys(S.VARIANTS)[i % 36], name: 'x', kind: 'ending' }, true), 144));
worst.push(bench('zukan 36', i => S.drawZukan(ctx, new Set(Object.keys(S.VARIANTS)), Object.keys(S.VARIANTS).map(id => ({ id, name: id, kind: 'ending' })), i % 36), 72));
worst.push(bench('stuck twitch', i => S.drawFish(ctx, 80, 100, { variant: 'stuck', t: i / 60 }), 300));
worst.push(bench('hiccupfly wings+halo', i => S.drawFish(ctx, 80, 100 - i * 0.2, { variant: 'hiccupfly', t: i / 60 }), 300));
worst.push(bench('knotted', i => S.drawFish(ctx, 80, 100, { variant: 'knotted', t: i / 60 }), 300));
worst.push(bench('flat', i => S.drawFish(ctx, 80, 100, { variant: 'flat', t: i / 60 }), 300));
worst.push(bench('nowake soul', i => S.drawFish(ctx, 80, 100, { variant: 'nowake', t: i / 60 }), 300));
worst.push(bench('bigFace grow', i => S.drawBigFace(ctx, (i % 120) / 120, i / 60), 240));
worst.push(bench('dragon', i => S.drawFish(ctx, 80, 100, { variant: 'dragon', t: i / 60, dir: (i >> 6) & 1 ? -1 : 1 }), 300));
worst.push(bench('golden', i => S.drawFish(ctx, 80, 100, { variant: 'golden', t: i / 60 }), 300));
worst.push(bench('bald', i => S.drawFish(ctx, 80, 100, { variant: 'bald', t: i / 60 }), 300));
worst.push(bench('hermit', i => S.drawHermit(ctx, 80, 220, i / 30), 300));
worst.push(bench('idol + spotlight', i => { S.drawSpotlight(ctx, 80, 200, i / 60); S.drawFish(ctx, 80, 100, { variant: 'idol', t: i / 60 }); }, 300));
worst.push(bench('round', i => S.drawFish(ctx, 80, 100, { variant: 'round', t: i / 60 }), 300));
worst.push(bench('snail crawl rot', i => S.drawSnail(ctx, 10, 100 + i * 0.1, i / 60, { rot: -Math.PI / 2 + Math.sin(i / 30) * 0.3 }), 300));
worst.push(bench('crab walk/pinch/angry', i => S.drawCrab(ctx, 40 + i % 80, 210, i / 60, { pinch: (i >> 5) & 1, angry: (i >> 6) & 1 }), 300));
worst.push(bench('shrimp swim/jump', i => S.drawShrimp(ctx, 80, 150, i / 60, { dir: (i >> 5) & 1 ? 1 : -1, jump: (i % 40) < 8 }), 300));
worst.push(bench('ball', i => S.drawBall(ctx, 30, 30, i / 60), 300));
worst.push(bench('finger hoop', i => S.drawFingerHoop(ctx, 80, 90 + (i % 20), i / 60), 300));
worst.push(bench('gold pellet', i => S.drawPellet(ctx, 50, 50, 'gold', i / 60), 300));
worst.push(bench('badge', i => S.drawBadge(ctx, 80, 30, 'きんちゃん'), 300));
worst.push(bench('turn anim 0..1', i => S.drawFish(ctx, 80, 100, { t: i / 60, turn: (i % 60) / 60, stage: 2 }), 240));
worst.push(bench('front swim', i => S.drawFish(ctx, 80, 100, { t: i / 60, front: true, eyes: 'happy' }), 300));
worst.push(bench('chew + cheeks', i => S.drawFish(ctx, 80, 100, { t: i / 60, cheeks: true, chew: (i % 30) / 30, front: (i >> 6) & 1 ? true : false }), 300));
worst.push(bench('squash bounce', i => S.drawFish(ctx, 80, 100, { t: i / 60, sx: 1 + 0.25 * Math.sin(i / 5), sy: 1 - 0.2 * Math.sin(i / 5) }), 300));
worst.push(bench('mark + wag', i => S.drawFish(ctx, 80, 100, { t: i / 60, wag: 2.5, mark: ['zzz','!','?','note','anger','heart','sweat'][(i >> 4) % 7] }), 300));
{ const t0 = process.hrtime.bigint(); S.drawFish(ctx, 80, 100, { front: true, moss: true, stage: 3, eyes: 'sparkle', cheeks: true, chew: 0.33, sx: 1.15, sy: 0.85, wrinkles: true, flower: true }); const ms = Number(process.hrtime.bigint() - t0) / 1e6; console.log('front first build (heavy)', ms.toFixed(2), 'ms'); worst.push(ms); }
// 1回目（キャッシュなし）の最悪値
{ const t0 = process.hrtime.bigint(); S.drawFish(ctx, 80, 100, { stone: true, stage: 3, eyes: 'smug', look: 'down', dir: -1 }); const ms = Number(process.hrtime.bigint() - t0) / 1e6; console.log('stone first build', ms.toFixed(2), 'ms'); worst.push(ms); }
if (Math.max(...worst) > 8) { console.error('TOO SLOW'); process.exit(1); }
console.log('ALL OK');
