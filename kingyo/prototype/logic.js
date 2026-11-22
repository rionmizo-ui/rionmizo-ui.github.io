/* logic.js — 金魚育成ゲーム ルール・確率エンジン  (global: GoldfishLogic)
 *
 * 描画・タイマーは持たない。乱数は create({rng}) で注入された rng のみ使用。
 *
 * ── 取り決め(CONTRACT.md)に無い追加分 ──
 *  GoldfishLogic.CAUSE_BY_ID      id → CAUSES要素
 *  GoldfishLogic.ENDING_RULES     結末の優先段と条件（仕様3章の表。仕様書どおり）
 *  GoldfishLogic.INITIAL          新しい魚の初期値（腹持ち・ストレス）
 *  GoldfishLogic.STORAGE_KEY      'goldfish_v1'
 *  s.dirtAcc  汚れ時間アキュムレータ(秒)   s.poopToDirt / s.rotToDirt  汚れ1段までの糞・腐敗カウント
 *  s.pelletCount  通算粒数(9粒ごとに糞)   s.okawariLeft  おかわり受付残り秒(tick で減る)
 *  s.okawariUsed  おかわりの餌を食べている最中か   s.bugPoints  バグ連打ポイント
 *  s.smugCount  ドヤ顔(3連続逃げ)回数   s.cause  死亡・結末ID
 *  返り値の追加フィールド: eatPellet/pelletRotted/tick → dirtUp, finish* → gaugeUp,
 *    record(id) → { isNew }, load() → bool, net() は生存中以外 {caught:false,smug:false,ignored:true}
 *  g.bugChance()  現在のバグ判定確率   g.thought()  吹き出し候補 'food'|'dirty'|'angry'|'heart'|null
 *  finishTouch は直前の startTouch が hungry なら何もしない（ゲージ増えない）。
 *  netEscapes は網以外の世話(start*)で 0 に戻る（「連続」逃げ）。
 *  die(id) は図鑑登録しない（札の isNew 判定のため record(id) を別に呼ぶ）。
 *  record(id) で lastEnding=id になり、save() する。
 */
var GoldfishLogic = (function () {
  'use strict';

  // [id, 札名, kind, float]
  const CAUSE_TABLE = [
    ['instant',      '即死',             'sudden', 'float'],
    ['poison',       '毒入り',           'sudden', 'float'],
    ['frozen',       '冷凍魚',           'sudden', 'sink'],
    ['flower',       '頭に開花',         'sudden', 'float'],
    ['burnt',        '自分もこんがり',   'sudden', 'sink'],
    ['shock',        '感電',             'sudden', 'float'],
    ['sucked',       '吸い込まれた',     'sudden', 'gone'],
    ['overpolished', '磨きすぎ',         'sudden', 'float'],
    ['cat',          '猫の手だった',     'sudden', 'gone'],
    ['bird',         '鳥のおやつ',       'sudden', 'gone'],
    ['dizzy',        '回りすぎ',         'sudden', 'float'],
    ['bubblegone',   '泡と消えた',       'sudden', 'gone'],
    ['floataway',    '浮いたまま',       'sudden', 'gone'],
    ['netted',       'すくえちゃった',   'sudden', 'gone'],
    // 追加：ひまなときのしぐさの最中に起きる突然死（しぐさ1回につき P.gesture）
    ['stuck',        'ガラスに刺さった', 'sudden', 'float'],
    ['hiccupfly',    'しゃっくりで昇天', 'sudden', 'gone'],
    ['knotted',      '結んじゃった',     'sudden', 'sink'],
    ['flat',         'ぺらぺら',         'sudden', 'float'],
    ['nowake',       '起きなかった',     'sudden', 'sink'],
    ['overhere',     'こっち側に来た',   'sudden', 'gone'],
    ['bug',          'バグった',         'ending', 'float'],
    ['duck',         'アヒルに交代',     'ending', 'gone'],
    ['moss',         'コケまみれ',       'ending', 'sink'],
    ['stone',        '緊張で石化',       'ending', 'sink'],
    ['split',        '分裂失敗',         'ending', 'float'],
    ['skeleton',     '空腹でスケルトン', 'ending', 'float'],
    ['overeat',      '食べすぎ',         'ending', 'sink'],
    ['cramped',      '水槽がせまい',     'ending', 'float'],
    ['fishman',      '魚人なのに溺死',   'ending', 'float'],
    ['oldage',       '大往生',           'ending', 'float'],
    // 追加の結末
    ['dragon',       '竜になった',       'ending', 'gone'],
    ['golden',       '純金になった',     'ending', 'sink'],
    ['bald',         'ストレスでハゲた', 'ending', 'float'],
    ['hermit',       '人間不信',         'ending', 'sink'],
    ['idol',         'アイドル化',       'ending', 'float'],
    ['round',        'まんまる',         'ending', 'float'],
  ];
  const CAUSES = CAUSE_TABLE.map(([id, name, kind, float]) => ({ id, name, kind, float }));
  const CAUSE_BY_ID = {};
  CAUSES.forEach(c => { CAUSE_BY_ID[c.id] = c; });

  // 結末判定（仕様3章）。小さい段ほど優先。同段で複数成立なら均等抽選（lastEnding は重み0.5）。
  // bug は段1で確率判定（bugChance）。oldage は最後の受け皿。
  const ENDING_RULES = [
    { tier: 1, id: 'bug',      test: null /* 確率: bugChance() */ },
    { tier: 2, id: 'duck',     test: s => s.polishes >= 13 && s.touches <= 5 },
    { tier: 2, id: 'dragon',   test: s => s.feeds >= 8 && s.touches >= 8 && s.polishes >= 4 && s.stress <= 30 && s.dirt <= 1 },   // バランスよく育てた
    { tier: 2, id: 'golden',   test: s => s.maxStress <= 50 && s.starveTime === 0 && s.dirt === 0 && s.feeds >= 6 && s.polishes >= 3 }, // 一度も無理をさせない
    { tier: 3, id: 'moss',     test: s => s.dirt >= 4 },
    { tier: 3, id: 'stone',    test: s => s.stress >= 75 },
    { tier: 3, id: 'split',    test: s => s.touches <= 2 },
    { tier: 3, id: 'bald',     test: s => s.maxStress >= 100 },          // ストレスが上限に達したことがある
    { tier: 3, id: 'hermit',   test: s => s.netCount >= 5 },             // 生きた魚に網を5回以上
    { tier: 4, id: 'skeleton', test: s => s.swimTime > 0 && s.starveTime >= s.swimTime / 2 },
    { tier: 4, id: 'idol',     test: s => s.touches >= 9 && s.touches <= 12 && s.stress <= 10 && s.wantsMet >= 3 },   // ほどよくふれあい、気分にもよく応えた
    { tier: 5, id: 'overeat',  test: s => s.feeds >= 13 },
    { tier: 5, id: 'cramped',  test: s => s.feeds >= 13 },
    { tier: 5, id: 'fishman',  test: s => s.touches >= 13 },
    { tier: 5, id: 'round',    test: s => s.swimTime > 0 && s.fullTime >= s.swimTime / 2 },   // 遊泳時間の半分以上が満腹（15粒以上）
    { tier: 6, id: 'oldage',   test: () => true },
  ];

  const GESTURE_ACC = { bonk: 'stuck', hiccup: 'hiccupfly', tail: 'knotted', sneeze: 'flat', nap: 'nowake', peek: 'overhere' };
  // 突然死の確率（企画書の約2倍に引き上げ。企画書の値は P_SPEC）
  const P = { instant: 0.08, feedEach: 0.01, cleanEach: 0.025, touch: 0.05, net: 0.05, gesture: 0.08 };
  const P_SPEC = { instant: 0.05, feedEach: 0.005, cleanEach: 0.0125, touch: 0.025, net: 0.025, gesture: 0.03 };
  const INITIAL = { satiety: 12, stress: 20 };
  const STORAGE_KEY = 'goldfish_v1';
  const GAUGE_MAX = 25, SATIETY_MAX = 18, FIELD_MAX = 18, DIRT_MAX = 4, STRESS_MAX = 100;   // 腹持ち・画面の粒数は18（企画書の9から倍増）
  const FEED_ACC = ['poison', 'frozen', 'flower', 'burnt', 'shock'];      // 各 P.feedEach
  const CLEAN_ACC = ['sucked', 'overpolished'];                           // 各 P.cleanEach
  const TOUCH_ACC = ['cat', 'bird', 'dizzy', 'bubblegone', 'floataway'];  // REACTIONS の先頭5つに対応、P.touch
  // ふれあいの反応。先頭5つは企画書の反応（それぞれ事故あり）、後ろ6つは追加の芸（事故なし）
  const REACTIONS = ['pet', 'jump', 'spin', 'bubble', 'puff', 'hoop', 'deadplay', 'handstand', 'highfive', 'ball', 'kiss'];
  // 性格（魚ごとにランダム）
  const PERSONAS = [
    { id: 'glutton', name: 'くいしんぼう' }, { id: 'clingy', name: 'あまえんぼう' }, { id: 'neat', name: 'きれいずき' },
    { id: 'timid', name: 'ビビり' }, { id: 'lazy', name: 'のんびり' }, { id: 'showoff', name: 'おちょうしもの' },
  ];

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  function freshFish() {
    return {
      gauge: 0, satiety: INITIAL.satiety, dirt: 0, dirtAcc: 0, poopToDirt: 0, rotToDirt: 0,
      stress: INITIAL.stress, feeds: 0, polishes: 0, touches: 0,
      swimTime: 0, starveTime: 0, netEscapes: 0, smugCount: 0, touchStreak: 0, maxStress: 20, netCount: 0, fullTime: 0, sinceTouch: 0, want: 'feed', wantLeft: 25, combo: [], wantsMet: 0, combos: 0,
      totalEaten: 0, poopCount: 0, pelletCount: 0,
      okawariLeft: 0, okawariUsed: false, okawariFed: 0,
      bugPoints: 0, phase: 'alive', cause: null,
    };
  }
  const FISH_KEYS = Object.keys(freshFish());

  function create(opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const aux = opts.aux || Math.random;   // 性格・金の粒など、企画書の確率に関わらない抽選
    const storage = opts.storage || null;

    const s = Object.assign(freshFish(), { lastEnding: null, zukan: new Set(), fishNo: 0 });   // fishNo: 何匹目か（ずっと数える）
    let pendFeed = null, pendClean = null, pendTouch = null;
    let pressLog = {};   // button → [tSec...]

    const alive = () => s.phase === 'alive';
    function addDirt(n) { const b = s.dirt; s.dirt = clamp(s.dirt + n, 0, DIRT_MAX); return s.dirt > b; }
    function gaugeUp() { const b = s.gauge; s.gauge = clamp(s.gauge + 1, 0, GAUGE_MAX); return s.gauge > b; }
    // 魚の「いま欲しい世話」を選ぶ（状態で重みづけ、直前と同じものは選ばない）
    function pickWant() {
      const w = { feed: 1 + (s.satiety <= 6 ? 3 : 0), clean: s.dirt >= 1 ? 1 + s.dirt : 0.3, touch: 1 + (s.stress >= 50 ? 2 : 0) };
      const fav = { glutton: 'feed', clingy: 'touch', neat: 'clean' }[s.persona];
      if (fav) w[fav] *= 2.5;
      delete w[s.want];
      const keys = Object.keys(w); let x = rng() * keys.reduce((a, k) => a + w[k], 0);
      for (const k of keys) { if ((x -= w[k]) < 0) { s.want = k; break; } }
      s.wantLeft = 25;
    }
    // 世話が成功したときのボーナス：①気分に応えたら+1 ②3種類を一巡したら+1
    function careDone(kind, out) {
      if (s.want === kind) { out.wantMet = true; s.wantsMet++; gaugeUp(); pickWant(); }
      if (s.combo.includes(kind)) s.combo = [kind]; else s.combo.push(kind);
      if (s.combo.length === 3) { out.combo = true; s.combos++; s.combo = []; gaugeUp(); }
      return out;
    }

    const g = {
      s,

      newFish() {
        Object.assign(s, freshFish());
        s.fishNo = (s.fishNo || 0) + 1;
        pendFeed = pendClean = pendTouch = null;
        pressLog = {};
        const instantDeath = rng() < P.instant;
        s.persona = PERSONAS[Math.floor(aux() * PERSONAS.length)].id;
        if (instantDeath) { s.phase = 'dead'; s.cause = 'instant'; }
        return { instantDeath };
      },

      tick(dt, swimming) {
        const out = { dirtUp: false };
        if (!alive() || !(dt > 0)) return out;
        if (s.okawariLeft > 0) s.okawariLeft = Math.max(0, s.okawariLeft - dt);
        if (s.stress > s.maxStress) s.maxStress = s.stress;
        s.sinceTouch += dt;
        s.wantLeft -= dt; if (s.wantLeft <= 0) { pickWant(); out.wantChanged = true; }
        if (s.persona === 'neat' && s.dirt >= 3) s.stress = clamp(s.stress + dt * 0.5, 0, STRESS_MAX);   // きれいずきは汚れでイライラ
        if (!swimming) return out;
        s.swimTime += dt;
        if (s.satiety >= SATIETY_MAX - 3) s.fullTime += dt;
        const drop = dt / 10 * (s.persona === 'glutton' ? 1.3 : s.persona === 'lazy' ? 0.7 : 1);
        if (s.satiety >= drop) s.satiety -= drop;
        else { s.starveTime += dt - s.satiety * 10; s.satiety = 0; }
        s.dirtAcc += dt;
        while (s.dirtAcc >= 90) { s.dirtAcc -= 90; if (addDirt(1)) out.dirtUp = true; }
        return out;
      },

      // 3粒ずつ追加でき、画面に同時に出せるのは FIELD_MAX 粒まで
      canFeed(pelletsOnField) { return alive() && (pelletsOnField || 0) + 3 <= FIELD_MAX; },

      // pendingEdible: すでに場にあって、まだ食べていない「食べる予定」の粒数
      startFeed(pendingEdible) {
        pendingEdible = pendingEdible || 0;
        s.netEscapes = 0; s.touchStreak = 0;
        if (s.okawariLeft > 0 && !s.okawariUsed) { s.okawariLeft = 0; s.okawariUsed = true; s.okawariFed = 0; }
        const okaRoom = s.okawariUsed && s.okawariFed + pendingEdible + 3 <= 9;
        const willEat = s.satiety + pendingEdible + 3 <= SATIETY_MAX || okaRoom;
        let accident = null;
        if (willEat) {
          const r = rng();
          if (r < P.feedEach * FEED_ACC.length) accident = FEED_ACC[Math.floor(r / P.feedEach)];
        }
        pendFeed = { willEat, okawari: s.okawariUsed };
        const gold = willEat && !accident && aux() < 0.04;   // まれに金の粒（食べるとゲージ+2）
        return { willEat, accident, gold, pellets: 3, okawari: !!(s.okawariUsed && willEat) };
      },

      eatPellet() {
        const out = { poop: false, dirtUp: false };
        if (s.okawariUsed) {
          if (s.okawariFed >= 9) return out;  // おかわりは追加9粒まで
          s.okawariFed++;
        }
        s.satiety = Math.min(SATIETY_MAX, s.satiety + 1);
        s.totalEaten++;
        s.pelletCount++;
        if (s.pelletCount % 9 === 0) {
          out.poop = true;
          s.poopCount++;
          if (++s.poopToDirt >= 2) { s.poopToDirt = 0; out.dirtUp = addDirt(1); }
        }
        return out;
      },

      pelletRotted() {
        const out = { dirtUp: false };
        if (++s.rotToDirt >= 9) { s.rotToDirt = 0; out.dirtUp = addDirt(1); }
        return out;
      },

      // morePending: まだ食べ終わっていない別の組が場にあるか
      finishFeed(ateAll3, morePending) {
        const out = { okawari: false, gaugeUp: false };
        const wasOkawari = s.okawariUsed;
        pendFeed = null;
        if (!morePending) s.okawariUsed = false;
        if (!alive()) return out;
        if (ateAll3) {
          out.gaugeUp = gaugeUp();
          s.feeds++;
          careDone('feed', out);
          if (!wasOkawari && !morePending && rng() < 0.25) { out.okawari = true; s.okawariLeft = 10; }
        }
        return out;
      },

      startClean() {
        s.netEscapes = 0; s.touchStreak = 0;
        s.polishes++;
        const effective = s.dirt >= 1;
        let accident = null;
        if (effective) {
          const r = rng();
          if (r < P.cleanEach * CLEAN_ACC.length) accident = CLEAN_ACC[Math.floor(r / P.cleanEach)];
        }
        pendClean = { effective };
        return { effective, accident };
      },

      finishClean() {
        const out = { gaugeUp: false };
        const eff = pendClean ? pendClean.effective : s.dirt >= 1;
        pendClean = null;
        if (!alive()) return out;
        if (eff) { addDirt(-1); s.stress = clamp(s.stress + (s.persona === 'timid' ? 22 : 15), 0, STRESS_MAX); }
        else { s.stress = clamp(s.stress + 5, 0, STRESS_MAX); return out; }   // きれいなガラスを磨いてもゲージは増えない
        out.gaugeUp = gaugeUp();
        return careDone('clean', out);
      },

      // ふれあいばかり続けると飽きる：2回続いた後から、そっぽを向く確率が上がり、芸も出にくくなる
      // 4回目から 30%→50%→70%（上限）。あまえんぼうは1回遅い
      refuseChance() { const k = s.touchStreak - (s.persona === 'clingy' ? 1 : 0); return k >= 3 ? Math.min(0.7, 0.3 + 0.2 * (k - 3)) : 0; },
      startTouch() {
        s.netEscapes = 0;
        if (s.sinceTouch > 20) s.touchStreak = 0;   // しばらくふれあわなければ飽きは治る
        s.sinceTouch = 0;
        if (s.satiety <= 0) { pendTouch = { hungry: true }; return { hungry: true, reaction: null, accident: null }; }
        if (g.refuseChance() > 0 && rng() < g.refuseChance()) { pendTouch = { refused: true }; return { hungry: false, refused: true, reaction: null, accident: null }; }
        // 反応: pet の重みは 1 + stress/25 + 連続回数×1.5、他は各1
        const wPet = (s.touchStreak === 0 ? 0.5 : 1 + s.stress / 25 + s.touchStreak * 0.5) + (s.persona === 'lazy' ? 2 : 0);
        const wTrick = s.persona === 'showoff' ? 2 : 1;
        let x = rng() * (wPet + (REACTIONS.length - 1) * wTrick);
        let reaction = 'pet';
        if (x >= wPet) reaction = REACTIONS[1 + Math.min(REACTIONS.length - 2, Math.floor((x - wPet) / wTrick))];
        // 反応が決まってから、その反応の事故だけを2.5%で抽選（仕様2章）。追加の芸に事故はない
        const ai = REACTIONS.indexOf(reaction);
        const accident = rng() < P.touch && ai < TOUCH_ACC.length ? TOUCH_ACC[ai] : null;
        pendTouch = { hungry: false };
        return { hungry: false, reaction, accident };
      },

      finishTouch() {
        const out = { gaugeUp: false };
        const hungry = pendTouch ? pendTouch.hungry : s.satiety <= 0;
        const refused = !!(pendTouch && pendTouch.refused);
        pendTouch = null;
        if (refused) { s.stress = clamp(s.stress + 5, 0, STRESS_MAX); return out; }
        if (!alive() || hungry) return out;
        s.touchStreak++;
        out.gaugeUp = gaugeUp();
        s.touches++;
        careDone('touch', out);
        s.stress = clamp(s.stress - 15, 0, STRESS_MAX);
        s.satiety = Math.max(0, s.satiety - 1);
        return out;
      },

      net() {
        if (!alive()) return { caught: false, smug: false, ignored: true };
        s.netCount++;
        if (rng() < P.net) { s.netEscapes = 0; return { caught: true, smug: false }; }
        s.netEscapes++;
        let smug = false;
        if (s.netEscapes >= 3) { smug = true; s.smugCount++; s.netEscapes = 0; }
        return { caught: false, smug };
      },

      press(button, tSec) {
        const log = pressLog[button] || (pressLog[button] = []);
        log.push(tSec);
        while (log.length && tSec - log[0] > 1) log.shift();
        if (log.length >= 4) { s.bugPoints++; log.length = 0; return { bugPoint: true }; }
        return { bugPoint: false };
      },

      bugChance() { return Math.min(0.05, 0.01 + 0.01 * s.bugPoints); },

      // ひまなときのしぐさの事故（しぐさ1回につき P.gesture）
      gestureAccident(name) {
        const id = GESTURE_ACC[name];
        if (!id || !alive()) return null;
        return rng() < P.gesture ? id : null;
      },

      // 金の粒などのボーナス
      bonus(n) { let up = 0; for (let i = 0; i < n; i++) if (gaugeUp()) up++; return up; },
      persona() { return PERSONAS.find(p => p.id === s.persona) || null; },

      isFull() { return s.gauge >= GAUGE_MAX; },

      decideEnding() {
        if (s.stress > s.maxStress) s.maxStress = s.stress;
        let id = null;
        if (rng() < g.bugChance()) id = 'bug';
        else {
          const tiers = [...new Set(ENDING_RULES.map(r => r.tier))].sort((a, b) => a - b);
          for (const t of tiers) {
            const c = ENDING_RULES.filter(r => r.tier === t && r.test && r.test(s)).map(r => r.id);
            if (!c.length) continue;
            if (c.length === 1) { id = c[0]; break; }
            const w = c.map(x => (x === s.lastEnding ? 0.5 : 1));
            let x = rng() * w.reduce((a, b) => a + b, 0);
            id = c[c.length - 1];
            for (let i = 0; i < c.length; i++) { if (x < w[i]) { id = c[i]; break; } x -= w[i]; }
            break;
          }
        }
        s.phase = 'ending';
        s.cause = id;
        return id;
      },

      die(causeId) {
        s.phase = 'dead';
        s.cause = causeId;
        pendFeed = pendClean = pendTouch = null;
      },

      record(id) {
        const isNew = !!CAUSE_BY_ID[id] && !s.zukan.has(id);
        if (CAUSE_BY_ID[id]) s.zukan.add(id);
        s.lastEnding = id;
        if (s.phase === 'ending') s.phase = 'done';   // 札まで見届けたら再生し直さない
        g.save();
        return { isNew };
      },

      thought() {
        if (!alive()) return null;
        if (s.satiety <= 0) return 'food';
        if (s.dirt >= 3) return 'dirty';
        if (s.stress >= 80) return 'angry';
        if (s.stress <= 10) return 'heart';
        return null;
      },

      save() {
        if (!storage) return false;
        try {
          const fish = {};
          FISH_KEYS.forEach(k => { fish[k] = s[k]; });
          storage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, zukan: [...s.zukan], lastEnding: s.lastEnding, fishNo: s.fishNo, fish }));
          return true;
        } catch (e) { return false; }
      },

      load() {
        if (!storage) return false;
        try {
          const raw = storage.getItem(STORAGE_KEY);
          if (!raw) return false;
          const d = JSON.parse(raw);
          s.zukan = new Set((d.zukan || []).filter(id => CAUSE_BY_ID[id]));
          s.lastEnding = d.lastEnding || null;
          s.fishNo = d.fishNo || 0;
          if (d.fish) FISH_KEYS.forEach(k => { if (k in d.fish) s[k] = d.fish[k]; });
          pendFeed = pendClean = pendTouch = null;
          return true;
        } catch (e) { return false; }
      },
    };
    return g;
  }

  return { P, P_SPEC, SATIETY_MAX, FIELD_MAX, PERSONAS, REACTIONS, create, CAUSES, CAUSE_BY_ID, ENDING_RULES, INITIAL, STORAGE_KEY };
})();
if (typeof module!=='undefined') module.exports = GoldfishLogic;
