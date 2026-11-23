// node test/logic.test.js — ルールのテスト（prototype/test_logic.js と同じ121件）
import L from '../src/logic/index.js';
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.log('NG:', msg); } }
function near(a, b, eps, msg) { ok(Math.abs(a - b) <= eps, `${msg} (got ${a}, want ${b}±${eps})`); }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// 決め打ち rng: 列を順に返し、尽きたら fallback
function seq(vals, fallback = 0.99) { let i = 0; return () => (i < vals.length ? vals[i++] : fallback); }
function mk(vals, fb) { const g = L.create({ rng: seq([0.99].concat(vals || []), fb), aux: () => 0.99, storage: null }); g.newFish(); g.s.want = 'none'; g.s.persona = 'none'; return g; }   // 気分ボーナスは個別テストで

// ── CAUSES ──
const IDS = 'instant poison frozen flower burnt shock sucked overpolished cat bird dizzy bubblegone floataway netted stuck hiccupfly knotted flat nowake overhere bug duck moss stone split skeleton overeat cramped fishman oldage dragon golden bald hermit idol round'.split(' ');
ok(L.CAUSES.length === 36, 'CAUSES 36種');
ok(L.CAUSES.every((c, i) => c.id === IDS[i]), 'CAUSES 順序');
ok(L.CAUSES.every(c => c.name && ['sudden', 'ending'].includes(c.kind) && ['float', 'sink', 'gone'].includes(c.float)), 'CAUSES フィールド');
ok(L.CAUSES.filter(c => c.kind === 'ending').length === 16, 'ending 16種');

// ── モンテカルロ: 網なし・有効世話25回で満タン到達率 ≈ 0.95*0.975^25 = 50.45% ──
{
  const rng = mulberry32(12345), N = 100000; let full = 0;
  for (let n = 0; n < N; n++) {
    const g = L.create({ rng, storage: null }), s = g.s;
    if (g.newFish().instantDeath) continue;
    let dead = false;
    for (let k = 0; k < 300 && !dead && !g.isFull(); k++) {   // そっぽ（飽き）は世話に数えない
      s.want = 'none'; s.combo = []; s.persona = 'none';   // 企画書の素の到達率を確かめるためボーナスを切る
      const kind = Math.floor(rng() * 2);   // 餌と掃除（各2.5%）。ふれあいは追加の芸で事故率が下がったので別に測る
      if (kind === 0) {
        s.satiety = 0; const r = g.startFeed(); if (!r.willEat) throw new Error('willEat');
        if (r.accident) { g.die(r.accident); dead = true; break; }
        for (let i = 0; i < 3; i++) g.eatPellet(); g.finishFeed(true);
      } else if (kind === 1) {
        s.dirt = 1; const r = g.startClean();
        if (r.accident) { g.die(r.accident); dead = true; break; }
        g.finishClean();
      } else {
        s.satiety = 5; const r = g.startTouch();
        if (r.accident) { g.die(r.accident); dead = true; break; }
        g.finishTouch();
      }
    }
    if (!dead && g.isFull()) full++;
  }
  const rate = full / N;
  const theory = (1 - L.P.instant) * Math.pow(1 - 5 * L.P.feedEach, 25);   // 餌5種・掃除2種の合計がどちらも5%
  console.log(`満タン到達率 ${(rate * 100).toFixed(2)}% (理論 ${(theory * 100).toFixed(2)}%、企画書の確率なら 50.45%)`);
  near(rate, theory, 0.006, '満タン到達率');
}

// ── 即死 5% ──
{ const rng = mulberry32(7); let c = 0; const g = L.create({ rng }); for (let i = 0; i < 100000; i++) if (g.newFish().instantDeath) c++; near(c / 100000, 0.08, 0.003, 'instant 8%'); }

// ── 事故の振り分け ──
{
  let g = mk([0.0001]); g.s.satiety = 0; ok(g.startFeed().accident === 'poison', 'feed accident poison');
  g = mk([0.0499]); g.s.satiety = 0; ok(g.startFeed().accident === 'shock', 'feed accident shock');
  g = mk([0.06]); g.s.satiety = 0; ok(g.startFeed().accident === null, 'feed no accident');
  g = mk([0.0001]); g.s.satiety = 16; const r = g.startFeed(); ok(!r.willEat && r.accident === null && r.pellets === 3, '満腹なら食べず事故なし');
  g = mk([0.0001]); g.s.dirt = 0; let c = g.startClean(); ok(!c.effective && c.accident === null && g.s.polishes === 1, 'きれい掃除: 事故なし polishes+1');
  g = mk([0.0001]); g.s.dirt = 2; ok(g.startClean().accident === 'sucked', 'clean sucked');
  g = mk([0.04]); g.s.dirt = 2; ok(g.startClean().accident === 'overpolished', 'clean overpolished');
  g = mk([0.3619, 0.049]); ok(g.startTouch().accident === 'floataway', 'touch floataway（膨らむ→浮いたまま）');
  g = mk([0.99, 0.001]); { const r = g.startTouch(); ok(r.reaction === 'kiss' && r.accident === null, '追加の芸（キス）に事故はない'); }
  g = mk([0.3619, 0.06]); ok(g.startTouch().accident === null, 'touch 5%外は事故なし');
  { const h = mk([0.5], 0.5); h.s.touchStreak = 5; ok(Math.abs(h.refuseChance() - 0.7) < 1e-9 && h.startTouch().refused === true, '5回続けるとそっぽ70%'); h.finishTouch(); ok(h.s.gauge === 0 && h.s.stress === 25, 'そっぽはゲージ増えずストレス+5'); }
  { const h = mk([0.99, 0.99, 0.99], 0.99); h.startTouch(); h.finishTouch(); h.startTouch(); h.finishTouch(); ok(h.s.touchStreak === 2, '連続カウント'); h.s.satiety = 0; h.startFeed(); ok(h.s.touchStreak === 0, '餌で連続リセット'); }
  g = mk([0.001, 0.001]); ok(g.startTouch().accident === 'cat', 'touch cat（撫でる→猫の手）');
  g = mk([0.01], 0.5); g.s.satiety = 0; let t = g.startTouch(); ok(t.hungry && t.reaction === null && t.accident === null, '空腹ふれあい');
  g.finishTouch(); ok(g.s.gauge === 0 && g.s.touches === 0, '空腹ふれあいはゲージ増えない');
  g = mk([0.01], 0.01); ok(g.canFeed(0) && g.canFeed(15) && !g.canFeed(16), 'canFeed: 18粒まで');
  { const h = mk([0.99], 0.99); h.s.satiety = 12; ok(h.startFeed(0).willEat && h.startFeed(3).willEat && !h.startFeed(4).willEat, '食べる予定の粒も腹持ちに数える'); }
  { const h = mk([0.99], 0.99); h.s.satiety = 18; h.s.okawariLeft = 5; ok(h.startFeed(0).willEat && h.startFeed(3).willEat && h.startFeed(6).willEat && !h.startFeed(7).willEat, 'おかわりは追加9粒まで（3組）'); }
  g = mk([0.5]); ok(g.net().caught === false && g.s.netEscapes === 1, 'net 逃げ');
  g = mk([0.01]); ok(g.net().caught === true, 'net caught');
}

// ── 飽きはゆるやか・自然に治る ──
{
  const h = mk([0.5], 0.5); h.s.touchStreak = 2; ok(h.refuseChance() === 0, '3回目まではそっぽなし');
  h.s.touchStreak = 3; ok(Math.abs(h.refuseChance() - 0.3) < 1e-9, '4回目は30%');
  h.s.touchStreak = 4; h.s.sinceTouch = 25; h.startTouch(); ok(h.s.touchStreak === 0, '20秒ふれあわなければ飽きは治る');
}

// ── 高ストレスほど pet ──
{
  function petRate(stress) { const rng = mulberry32(3); const g = L.create({ rng }); g.newFish(); g.s.phase = 'alive'; g.s.persona = 'none'; let p = 0; for (let i = 0; i < 20000; i++) { g.s.stress = stress; g.s.satiety = 5; g.s.touchStreak = 1; g.s.sinceTouch = 0; if (g.startTouch().reaction === 'pet') p++; } return p / 20000; }
  ok(petRate(100) > petRate(0) + 0.2, `高ストレスで pet 増 (${petRate(0).toFixed(2)}→${petRate(100).toFixed(2)})`);
}

// ── 腹持ち ──
{
  const g = mk([]), s = g.s; s.satiety = 2;
  g.tick(5, false); ok(s.satiety === 2 && s.swimTime === 0, '非遊泳中は進まない');
  g.tick(10, true); near(s.satiety, 1, 1e-9, '10秒で腹持ち-1');
  g.tick(30, true); ok(s.satiety === 0, '腹持ち下限0'); near(s.starveTime, 20, 1e-9, 'starveTime は0になってから');
  near(s.swimTime, 40, 1e-9, 'swimTime');
  s.satiety = 3; g.startFeed(); for (let i = 0; i < 3; i++) g.eatPellet(); ok(s.satiety === 6 && s.totalEaten === 3, '1粒+1');
  g.finishFeed(true); ok(s.gauge === 1 && s.feeds === 1, 'finishFeed gauge/feeds');
  s.satiety = 15; ok(g.startFeed().willEat, '15+3<=18 食べる'); s.satiety = 15.5; ok(!g.startFeed().willEat, '15.5+3>18 食べない');
  g.finishFeed(false); ok(s.gauge === 1 && s.feeds === 1, '食べ残しはゲージ増えない');
  s.want = 'none'; s.satiety = 4; s.stress = 50; g.startTouch(); g.finishTouch(); ok(s.satiety === 3 && s.stress === 35 && s.touches === 1 && s.gauge === 2, 'finishTouch');
}

// ── 気分ボーナスとコンボ ──
{
  const g = mk([0.5], 0.5), s = g.s; s.want = 'touch'; s.satiety = 10;
  g.startTouch(); const o = g.finishTouch(); ok(o.wantMet && s.gauge === 2 && s.want !== 'touch', '気分に応えると+2、気分が変わる');
  s.want = 'none'; s.combo = []; s.dirt = 2; s.gauge = 0;
  g.startClean(); g.finishClean(); s.satiety = 0; g.startFeed(); for (let i = 0; i < 3; i++) g.eatPellet(); g.finishFeed(true);
  s.satiety = 10; s.touchStreak = 0; g.startTouch(); const o2 = g.finishTouch(); ok(o2.combo && s.gauge === 4 && s.combo.length === 0, '3種類一巡でコンボ+1');
  s.gauge = 0; s.combo = []; s.satiety = 10; g.startTouch(); g.finishTouch(); s.touchStreak = 0; g.startTouch(); g.finishTouch(); ok(s.combo.length === 1, '同じボタンが続くとコンボはやり直し');
}
{
  const rng = mulberry32(777), N = 30000; let full = 0;
  for (let n = 0; n < N; n++) {
    const g = L.create({ rng, storage: null }), s = g.s;
    if (g.newFish().instantDeath) continue;
    let dead = false;
    for (let k = 0; k < 300 && !dead && !g.isFull(); k++) {
      const kind = s.want === 'feed' ? 0 : s.want === 'clean' ? 1 : 2;   // 気分に応え続ける理想プレイ
      if (kind === 0) { s.satiety = 0; const r = g.startFeed(); if (r.accident) { dead = true; break; } for (let i = 0; i < 3; i++) g.eatPellet(); g.finishFeed(true); }
      else if (kind === 1) { s.dirt = 1; const r = g.startClean(); if (r.accident) { dead = true; break; } g.finishClean(); }
      else { s.satiety = 5; s.touchStreak = 0; const r = g.startTouch(); if (r.accident) { dead = true; break; } g.finishTouch(); }
    }
    if (!dead && g.isFull()) full++;
  }
  console.log('気分に応え続けた場合の満タン到達率 ' + (100 * full / N).toFixed(2) + '%');
}

// ── 何匹目 ──
{
  const mem = {}; const st = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; } };
  const g = L.create({ rng: () => 0.5, storage: st }); g.newFish(); g.newFish(); g.newFish();
  ok(g.s.fishNo === 3, '3匹目'); g.save();
  const h = L.create({ rng: () => 0.5, storage: st }); h.load(); h.newFish(); ok(h.s.fishNo === 4, '保存して続きから4匹目');
}

// ── 性格・金の粒 ──
{
  const g = L.create({ rng: () => 0.5, aux: () => 0.0, storage: null }); g.newFish();
  ok(g.s.persona === 'glutton' && g.persona().name === 'くいしんぼう', '性格が決まる');
  g.s.satiety = 10; g.tick(10, true); near(g.s.satiety, 8.7, 1e-9, 'くいしんぼうは腹が減るのが1.3倍');
  g.s.satiety = 0; const r = g.startFeed(0); ok(r.gold === true, '金の粒（aux<0.04）');
  g.s.gauge = 0; ok(g.bonus(2) === 2 && g.s.gauge === 2, 'ボーナスでゲージ+2');
  const h = L.create({ rng: () => 0.5, aux: () => 0.99, storage: null }); h.newFish(); h.s.persona = 'clingy'; h.s.touchStreak = 2;
  ok(h.refuseChance() === 0, 'あまえんぼうは飽きるのが1回遅い');
}

// ── おかわり ──
{
  const g = mk([0.99, 0.1, 0.99]), s = g.s; s.satiety = 0;
  g.startFeed(); for (let i = 0; i < 3; i++) g.eatPellet();
  let f = g.finishFeed(true); ok(f.okawari && s.okawariLeft === 10, 'おかわり25%');
  s.satiety = 18; const r = g.startFeed(); ok(r.willEat, 'おかわり中は満腹でも食べる');
  for (let i = 0; i < 3; i++) g.eatPellet(); ok(s.totalEaten === 6, 'おかわり分を食べた');
  f = g.finishFeed(true); ok(!f.okawari, 'おかわり後の再要求なし');
  const g2 = mk([0.99, 0.1]); g2.s.satiety = 0; g2.startFeed(); g2.finishFeed(true); g2.tick(11, false); g2.s.satiety = 18;
  ok(!g2.startFeed().willEat, '10秒過ぎたらおかわり無効');
  const g3 = mk([]); g3.s.satiety = 0; let cnt = 0; const rng = mulberry32(9); const g4 = L.create({ rng }); g4.newFish(); g4.s.phase = 'alive';
  for (let i = 0; i < 40000; i++) { g4.s.satiety = 0; g4.s.okawariLeft = 0; g4.startFeed(); if (g4.finishFeed(true).okawari) cnt++; }
  near(cnt / 40000, 0.25, 0.01, 'おかわり率');
}

// ── 汚れ ──
{
  const g = mk([]), s = g.s;
  g.tick(89, true); ok(s.dirt === 0, '89秒で汚れ0'); g.tick(1, true); ok(s.dirt === 1, '90秒で汚れ+1');
  g.tick(90 * 10, true); ok(s.dirt === 4, '汚れ上限4');
  const h = mk([]); let poops = 0;
  for (let i = 0; i < 18; i++) { h.s.satiety = 0; if (h.eatPellet().poop) poops++; }
  ok(poops === 2 && h.s.poopCount === 2 && h.s.dirt === 1, '9粒で糞、糞2回で汚れ1段');
  const k = mk([]); for (let i = 0; i < 8; i++) k.pelletRotted(); ok(k.s.dirt === 0, '腐敗8粒'); k.pelletRotted(); ok(k.s.dirt === 1, '腐敗9粒で汚れ1段');
  // 掃除
  const c = mk([]); c.s.dirt = 2; c.s.stress = 10; c.startClean(); c.finishClean();
  ok(c.s.dirt === 1 && c.s.stress === 25 && c.s.gauge === 1, '有効掃除: 汚れ-1 stress+15 gauge+1');
  c.s.dirt = 0; c.startClean(); c.finishClean(); ok(c.s.dirt === 0 && c.s.stress === 30 && c.s.gauge === 1 && c.s.polishes === 2, 'きれい掃除: stress+5 ゲージは増えない');
  c.s.stress = 95; c.s.dirt = 1; c.startClean(); c.finishClean(); ok(c.s.stress === 100, 'stress上限');
  c.s.stress = 5; c.s.satiety = 3; c.startTouch(); c.finishTouch(); ok(c.s.stress === 0, 'stress下限');
  const n = mk([]); n.s.dirt = 3; n.newFish(); ok(n.s.dirt === 0 && n.s.rotToDirt === 0, 'newFish で汚れリセット');
}

// ── 網のドヤ顔 ──
{ const g = mk([0.5, 0.5, 0.5]); g.net(); g.net(); const r = g.net(); ok(r.smug && g.s.smugCount === 1, '3連続逃げで smug'); }

// ── バグ連打 ──
{
  const g = mk([]);
  g.press('feed', 0); g.press('feed', 0.2); g.press('feed', 0.4); ok(g.s.bugPoints === 0, '3回では0');
  g.press('feed', 0.6); ok(g.s.bugPoints === 1, '1秒以内4回で+1');
  g.press('feed', 0.7); g.press('feed', 0.8); g.press('feed', 0.9); ok(g.s.bugPoints === 1, '重複カウントなし');
  g.press('clean', 5); g.press('clean', 5.5); g.press('clean', 6.2); g.press('clean', 6.3); ok(g.s.bugPoints === 1, '1秒超は不成立');
  near(g.bugChance(), 0.02, 1e-12, 'bugChance 1%+1%/pt');
  g.s.bugPoints = 10; near(g.bugChance(), 0.05, 1e-12, 'bugChance 最大5%');
}

// ── 結末 ──
function ending(setup, vals) { const g = mk(vals || [0.99], 0.99); g.s.gauge = 25; g.s.swimTime = 100; g.s.touches = 6; g.s.maxStress = 60; setup(g.s, g); return g.decideEnding(); }
{
  ok(ending(s => { s.bugPoints = 4; }, [0.049]) === 'bug', 'バグ連打: 5%内で bug');
  ok(ending(s => { s.bugPoints = 4; }, [0.051]) === 'oldage', 'バグ: 5%外');
  ok(ending(s => { s.bugPoints = 0; }, [0.009]) === 'bug', 'バグ: 0pt でも1%');
  ok(ending(s => { s.polishes = 13; s.touches = 5; s.dirt = 4; }) === 'duck', 'アヒル（段2が段3より優先）');
  ok(ending(s => { s.polishes = 13; s.touches = 6; }) === 'oldage', 'アヒル: ふれあい6回では不成立');
  ok(ending(s => { s.dirt = 4; }) === 'moss', 'コケ');
  ok(ending(s => { s.stress = 75; }) === 'stone', '石化');
  ok(ending(s => { s.touches = 2; }) === 'split', '分裂失敗');
  ok(ending(s => { s.starveTime = 50; s.feeds = 13; }) === 'skeleton', 'スケルトン（段4が段5より優先）');
  ok(ending(s => { s.starveTime = 49.9; }) === 'oldage', 'スケルトン未満');
  ok(ending(s => { s.swimTime = 0; s.starveTime = 0; }) === 'oldage', 'swimTime 0 ならスケルトンでない');
  ok(ending(s => { s.feeds = 13; }, [0.99, 0.2]) === 'overeat', '食べすぎ');
  ok(ending(s => { s.feeds = 13; }, [0.99, 0.7]) === 'cramped', '水槽がせまい');
  ok(ending(s => { s.feeds = 12; s.touches = 12; s.stress = 25; }) === 'oldage', '大往生');
  ok(ending(s => { s.touches = 13; }) === 'fishman', '魚人');
  ok(ending(s => { s.feeds = 8; s.touches = 8; s.polishes = 4; s.stress = 30; s.dirt = 1; }) === 'dragon', '竜になった（バランス）');
  ok(ending(s => { s.feeds = 8; s.touches = 8; s.polishes = 4; s.stress = 31; }) !== 'dragon', '竜: ストレス31では不成立');
  ok(ending(s => { s.maxStress = 50; s.starveTime = 0; s.dirt = 0; s.feeds = 6; s.polishes = 3; }) === 'golden', '純金（無理させない）');
  ok(ending(s => { s.maxStress = 50; s.starveTime = 1; s.dirt = 0; s.feeds = 6; s.polishes = 3; }) !== 'golden', '純金: 空腹があれば不成立');
  ok(ending(s => { s.maxStress = 100; }) === 'bald', 'ストレスでハゲた');
  ok(ending(s => { s.netCount = 5; }) === 'hermit', '人間不信');
  ok(ending(s => { s.touches = 10; s.stress = 10; s.wantsMet = 3; }) === 'idol', 'アイドル化');
  ok(ending(s => { s.touches = 10; s.stress = 11; s.wantsMet = 3; }) === 'oldage', 'アイドル: ストレス11で不成立');
  ok(ending(s => { s.touches = 10; s.stress = 10; s.wantsMet = 2; }) === 'oldage', 'アイドル: 気分に応えた回数2で不成立');
  ok(ending(s => { s.fullTime = 50; }) === 'round', 'まんまる');
  ok(ending(s => { s.fullTime = 49; }) === 'oldage', 'まんまる未満');
  { const h = mk([0.029], 0.99); ok(h.gestureAccident('bonk') === 'stuck', 'しぐさ事故: ごつん→刺さった 3%内'); ok(h.gestureAccident('nap') === null, 'しぐさ事故: 3%外'); ok(h.gestureAccident('dance') === null, '事故のないしぐさ'); }
  { const h = mk([0.99], 0.99); h.net(); h.net(); ok(h.s.netCount === 2, '網の回数'); }
  ok(ending(s => { s.feeds = 13; s.touches = 13; }, [0.99, 0.9]) === 'fishman', '段5 3候補で魚人');
  // 分布: 二択は均等、lastEnding は重み0.5、3候補は1/3ずつ
  const rng = mulberry32(42); const g = L.create({ rng }); g.newFish();
  const cnt = {}; for (let i = 0; i < 60000; i++) { Object.assign(g.s, { phase: 'alive', feeds: 13, touches: 13, bugPoints: 0, swimTime: 100, starveTime: 0 }); const id = g.decideEnding(); cnt[id] = (cnt[id] || 0) + 1; }
  const tot = 60000 - (cnt.bug || 0);
  near(cnt.overeat / tot, 1 / 3, 0.01, '3候補 overeat'); near(cnt.fishman / tot, 1 / 3, 0.01, '3候補 fishman');
  near((cnt.bug || 0) / 60000, 0.01, 0.002, 'bug 基本1%');
  const c2 = {}; g.s.lastEnding = 'overeat';
  for (let i = 0; i < 60000; i++) { Object.assign(g.s, { feeds: 13, touches: 6, bugPoints: 0 }); const id = g.decideEnding(); c2[id] = (c2[id] || 0) + 1; }
  near(c2.overeat / (c2.overeat + c2.cramped), 1 / 3, 0.01, 'lastEnding 重み0.5');
  const g5 = mk([]); g5.s.gauge = 25; g5.decideEnding(); ok(g5.s.phase === 'ending', 'phase=ending');
}

// ── die / record / save / load ──
{
  const mem = {}; const storage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  const g = L.create({ rng: seq([0.99]), storage }); g.newFish();
  g.die('cat'); ok(g.s.phase === 'dead' && g.s.cause === 'cat', 'die');
  ok(g.record('cat').isNew === true, 'record 新規'); ok(g.record('cat').isNew === false, 'record 既知');
  ok(g.s.lastEnding === 'cat' && 'goldfish_v1' in mem, 'record で保存');
  g.newFish(); g.s.gauge = 7; g.s.dirt = 2; g.s.satiety = 4.5; g.save();
  const h = L.create({ rng: seq([]), storage }); ok(h.load(), 'load');
  ok(h.s.zukan.has('cat') && h.s.zukan.size === 1 && h.s.lastEnding === 'cat' && h.s.gauge === 7 && h.s.dirt === 2 && h.s.satiety === 4.5 && h.s.phase === 'alive', 'load 内容');
  const n = L.create({ rng: seq([]), storage: null }); ok(n.save() === false && n.load() === false, 'storage なし');
  const g0 = L.create({ rng: seq([0.01]) }); ok(g0.newFish().instantDeath && g0.s.phase === 'dead', 'instant');
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
