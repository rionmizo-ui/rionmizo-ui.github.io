/* logic.js — 金魚育成ゲーム ルール・確率エンジン  (global: GoldfishLogic)
 *
 * 描画・タイマーは持たない。乱数は create({rng}) で注入された rng のみ使用。
 *
 * ── 取り決め(CONTRACT.md)に無い追加分 ──
 *  GoldfishLogic.CAUSE_BY_ID      id → CAUSES要素
 *  GoldfishLogic.ENDING_RULES     結末の条件と抽選の重み（v18：当てはまるものから重みで抽選）
 *  GoldfishLogic.INITIAL          新しい魚の初期値（腹持ち・ストレス）
 *  GoldfishLogic.STORAGE_KEY      'goldfish_v1'
 *  s.dirtAcc  汚れ時間アキュムレータ(秒)   s.poopToDirt / s.rotToDirt  汚れ1段までの糞・腐敗カウント
 *  s.pelletCount  通算粒数(9粒ごとに糞)   s.okawariLeft  おかわり受付残り秒(tick で減る)
 *  s.okawariUsed  おかわりの餌を食べている最中か   s.bugPoints  バグ連打ポイント
 *  s.smugCount  ドヤ顔(3連続逃げ)回数   s.cause  死亡・結末ID
 *  返り値の追加フィールド: eatPellet/pelletRotted/tick → dirtUp, finish* → gaugeUp,
 *    record(id) → { isNew }, load() → bool, net() は生存中以外 {caught:false,smug:false,ignored:true}
 *  g.candidates(s)  当てはまる結末と重み   g.thought()  吹き出し候補 'food'|'dirty'|'angry'|'heart'|null
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
    // 追加：特殊イベント（地震）で反応できなかったとき
    ['jumpout',      '飛び出した',       'sudden', 'gone'],
    // 追加：お客さんイベントで失敗したとき
    ['abducted',     '宇宙人にさらわれた', 'sudden', 'gone'],
    ['sushi',        '寿司にされた',     'sudden', 'gone'],
    ['meteor',       '隕石直撃',         'sudden', 'sink'],
    ['possessed',    'おばけになった',   'sudden', 'gone'],
    // v16：新しいイベント（釣り針・猛暑・カメラ・手品）と芸（ロケット）の突然死
    ['fished',       '釣られた',         'sudden', 'gone'],
    ['boiled',       'のぼせた',         'sudden', 'float'],
    ['photo',        '写真になった',     'sudden', 'sink'],
    ['pigeon',       'ハトにされた',     'sudden', 'gone'],
    ['star',         '星になった',       'sudden', 'gone'],
    // v19：遊びにくる生き物（お客さん）とのふれあいで起きる突然死（1回の訪問につき P.visit）
    ['haircut',      '散髪されすぎ',     'sudden', 'float'],   // カニ
    ['squashed',     'カメにつぶされた', 'sudden', 'sink'],
    ['loach',        'まねして抜けなくなった', 'sudden', 'gone'],
    ['catfish',      'ナマズにのまれた', 'sudden', 'gone'],    // ナマズ（v20）
    ['cleanfreak',   '潔癖すぎた',       'sudden', 'float'],
    ['daruma',       'だるまになった',   'sudden', 'sink'],
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
    ['hermit',       '人間不信',         'ending', 'sink'],
    ['giant',        '巨大化',           'ending', 'stay'],
    ['babies',       '子だくさん',       'ending', 'float'],
  ];
  const CAUSES = CAUSE_TABLE.map(([id, name, kind, float]) => ({ id, name, kind, float }));
  const CAUSE_BY_ID = {};
  CAUSES.forEach(c => { CAUSE_BY_ID[c.id] = c; });

  // 結末判定（v18）：当てはまる結末（test が真）の中から、重み w で抽選する。
  //  ・段（tier）による優先はやめた。どの育て方でも、当てはまるもの同士が重みで競う。
  //  ・w は tools/tune.js で「8通りの育て方×せっかち/ふつう/のんびりを混ぜたとき、16種がほぼ同じ回数ずつ出る」ように合わせた値（v20）。
  //  ・まだ図鑑にない結末は×2、前回と同じ結末は×0.5。
  //  ・bug は条件なし（いつでも候補）。重み×(1+連打ポイント)²（最大400倍）。oldage も常に候補（受け皿）。
  //  ・v20：のんびり成長で1匹あたりの世話の回数が減ったので、回数の条件を1〜2回ずつ下げた
  //  ・v18 で「まんまる」（食べすぎと似ている）と「ストレスでハゲた」（緊張で石化と似ている）を削除。
  const ENDING_RULES = [
    { id: 'bug',      w: 0.0311, test: () => true },
    { id: 'duck',     w: 22.4, test: s => s.polishes >= 3 && s.touches <= 1 },   // v21: ふれあい3→1回以下                                     // よく磨いて、あまりかまわない
    { id: 'dragon',   w: 5.89, test: s => s.feeds >= 3 && s.touches >= 2 && s.polishes >= 1 && s.stress <= 25 && s.dirt === 0 },   // バランスよく
    { id: 'babies',   w: 2.19, test: s => (s.combos >= 1 || s.polishes >= 1) && s.feeds >= 2 && s.touches >= 2 },   // 3つの世話をどれもした                       // 3つの世話を一巡
    { id: 'golden',   w: 4.29, test: s => s.goldEaten >= 1 && s.starveTime === 0 },                                 // 金の粒を食べ、空腹にさせない
    { id: 'moss',     w: 4.29, test: s => s.dirt >= 2 || (s.dirt >= 1 && s.polishes <= 1) },                         // 汚れたまま
    { id: 'stone',    w: 133, test: s => (s.stress >= 28 || s.maxStress >= 45) && !(s.polishes >= 3 && s.touches <= 1) },   // v21: アヒルの育て方（磨くだけ）とは重ならない                                    // ストレスをためた
    { id: 'split',    w: 9.63, test: s => s.touches === 0 && s.feeds <= 3 },   // v20: 一度もふれあわず、ごはんも少なめ
    { id: 'hermit',   w: 31.2, test: s => s.netCount >= 1 },   // v20: 網を1回でも（重みで出やすさを調整）                                                        // 網を何度も入れた
    { id: 'skeleton', w: 0.804, test: s => s.swimTime > 0 && s.starveTime >= s.swimTime * 0.08 },                    // 腹ぺこの時間が長い
    { id: 'giant',     w: 0.31, test: s => s.touches >= 3 && s.stress <= 15 && s.wantsMet >= 2 },                    // ほどよくふれあい、気分に応えた
    { id: 'overeat',  w: 1.25, test: s => s.feeds >= 4 && s.satiety >= 10 },                                       // たくさん食べて、満タン時もお腹いっぱい
    { id: 'cramped',  w: 8.47, test: s => s.feeds >= 5 },                                                          // とにかくたくさん食べさせた
    { id: 'fishman',  w: 2.23, test: s => s.touches >= 6 },                                                        // ふれあいすぎ
    { id: 'oldage',   w: 0.0309, test: () => true },                                                                 // 受け皿
  ];

  const VISIT_ACC = { crab: 'haircut', turtle: 'squashed', loach: 'loach', catfish: 'catfish' };   // v22
  const GESTURE_ACC = { bonk: 'stuck', hiccup: 'hiccupfly', tail: 'knotted', sneeze: 'flat', nap: 'nowake' };   // v22: のぞきこむ（peek）の事故「こっち側に来た」はなくした
  // 突然死の確率（企画書の約2倍に引き上げ。企画書の値は P_SPEC）
  // v18: 突然死29種がなるべく同じくらいずつ出るように見直し（シミュレーションと自動プレイで確認）
  //  登場即死 8→2%、餌の事故 各1→0.4%、掃除 吸い込み3→6%・磨きすぎ2→1.2%、網 5→6%、しぐさ 8→20%
  //  ふれあいの事故は反応ごと（TOUCH_P）。撫でる(猫)は反応が出やすいぶん低め、ジャンプ・膨らむは高め
  const P = { instant: 0.02, feedEach: 0.004, cleanEach: 0.06, overpolish: 0.012, touch: 0.12, net: 0.06, gesture: 0.08, visit: 0.12 };   // v22: お客さん 15→12%（なかよしの出番をふやす）   // v20: しぐさ 20→8%・お客さん 30→15%（出会う回数がふえたぶん下げた。idle_sim2.js と自動プレイで調整）
  const TOUCH_P = { cat: 0.07, bird: 0.13, dizzy: 0.1, bubblegone: 0.12, floataway: 0.14, knotted: 0.09, nowake: 0.12, star: 0.09, cleanfreak: 0.10, daruma: 0.10, rocketBird: 0.10 };
  const P_SPEC = { instant: 0.05, feedEach: 0.005, cleanEach: 0.0125, touch: 0.025, net: 0.025, gesture: 0.03 };
  const GROW_SEC = 6;     // v20: のんびり成長。放置で泳いでいると6秒ごとにゲージ+1（idle_sim2.js の最適値）
  const HUNGER_SEC = 5;    // 通常遊泳で腹持ちが1粒分減る秒数（企画書10秒。お腹を空きやすく）
  const DIRT_SWIM = 75;    // 通常遊泳でよごれ1段（v17: 120→75秒。そうじが役に立つ場面をふやす）。糞2回・食べ残し9粒でも1段（企画書どおり）
  const INITIAL = { satiety: 10, stress: 20 };
  const STORAGE_KEY = 'goldfish_v1';
  const GAUGE_MAX = 15,   // 企画書は25。成長に時間がかかりすぎるので15に
        SATIETY_MAX = 18, FIELD_MAX = 15, EAT_MARGIN = 3, DIRT_MAX = 4, STRESS_MAX = 100;   // 腹持ち・画面の粒数は18（企画書の9から倍増）
  const FEED_ACC = ['poison', 'frozen', 'flower', 'burnt', 'shock'];      // 各 P.feedEach
  const CLEAN_ACC = ['sucked', 'overpolished'];                           // 各 P.cleanEach
  const TOUCH_ACC = ['cat', 'bird', 'dizzy', 'bubblegone', 'floataway'];  // REACTIONS の先頭5つに対応、P.touch
  const TRICK_ACC = { hoop: 'knotted', deadplay: 'nowake', rocket: 'star', daruma: 'daruma' };
  // ふれあいの反応。先頭5つは企画書の反応（それぞれ事故あり）、残りは追加の芸
  const REACTIONS = ['pet', 'jump', 'spin', 'bubble', 'puff', 'hoop', 'deadplay', 'ball', 'limbo', 'heartswim', 'sing',
    'sumo', 'rocket', 'daruma', 'moonwalk'];
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
      swimTime: 0, starveTime: 0, netEscapes: 0, smugCount: 0, touchStreak: 0, maxStress: 20, netCount: 0, fullTime: 0, sinceTouch: 0, want: 'none', wantScore: 0, wantLeft: 3, wantCool: {}, combo: [], wantsMet: 0, combos: 0,
      totalEaten: 0, poopCount: 0, pelletCount: 0,
      okawariLeft: 0, okawariUsed: false, okawariFed: 0, goldEaten: 0,
      bugPoints: 0, phase: 'alive', cause: null, persona: null, color: null, growAcc: 0, careN: 0,   // v17: 性格と体色も保存する（読み込み直しで変わらないように）
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
    // 魚の「いま欲しいもの」は、ゲージ（空腹・汚れ・さびしさ）と性格から決まる。
    // 一番切実なものを欲しがり、どれも満ち足りていれば 'none'。応えてもらった世話は8秒は欲しがらない。
    const PERSONA_W = {
      glutton: { feed: 1.6, clean: 1, touch: 0.9 }, clingy: { feed: 1, clean: 0.9, touch: 1.6 }, neat: { feed: 1, clean: 1.6, touch: 0.9 },
      timid: { feed: 1, clean: 1, touch: 1.3 }, lazy: { feed: 0.8, clean: 0.8, touch: 0.8 }, showoff: { feed: 1, clean: 0.9, touch: 1.4 },
    };
    function needScores() {
      const pw = PERSONA_W[s.persona] || { feed: 1, clean: 1, touch: 1 };
      const hunger = 1 - s.satiety / SATIETY_MAX;
      const lonely = Math.max(s.stress / 100, Math.min(1, s.sinceTouch / 60) * 0.7);
      // v17: 汚れ1段でも「そうじして」と言う（汚れ/3）。以前は汚れ2段まで言わず、そうじがほとんど出番なしだった
      const sc = { feed: Math.pow(hunger, 1.3) * pw.feed, clean: Math.min(1, s.dirt / 3) * pw.clean, touch: lonely * pw.touch };
      for (const k in s.wantCool) if (s.wantCool[k] > 0) sc[k] *= 0.3;
      return sc;
    }
    function pickWant() {
      const sc = needScores();
      let best = 'none', bv = 0.3;   // 0.3 未満なら何も欲しがらない
      for (const k of ['feed', 'clean', 'touch']) if (sc[k] > bv) { best = k; bv = sc[k]; }
      // 今の気分から変えるのは、0.1以上切実なものが出たときだけ（ころころ変わらないように）
      if (s.want !== 'none' && s.want in sc && best !== s.want && sc[s.want] >= 0.3 && bv - sc[s.want] < 0.1) best = s.want;
      s.want = best; s.wantScore = best === 'none' ? 0 : sc[best];
      s.wantLeft = 4;
    }
    // 世話が成功したときのボーナス：①気分に応えたら+1 ②3種類を一巡したら+1
    function careDone(kind, out) {
      if (s.want === kind) { out.wantMet = true; s.wantsMet++; gaugeUp(); s.wantCool[kind] = 8; s.want = 'none'; pickWant(); }
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
        for (const k in s.wantCool) s.wantCool[k] = Math.max(0, s.wantCool[k] - dt);
        s.wantLeft -= dt; if (s.wantLeft <= 0) { const w0 = s.want; pickWant(); out.wantChanged = s.want !== w0; }
        if (s.persona === 'neat' && s.dirt >= 3) s.stress = clamp(s.stress + dt * 0.5, 0, STRESS_MAX);   // きれいずきは汚れでイライラ
        if (!swimming) return out;
        s.swimTime += dt;
        s.growAcc = (s.growAcc || 0) + dt;   // v20: のんびり成長
        while (s.growAcc >= GROW_SEC) { s.growAcc -= GROW_SEC; if (gaugeUp()) out.grew = true; }
        if (s.satiety >= SATIETY_MAX - 3) s.fullTime += dt;
        const drop = dt / HUNGER_SEC * (s.persona === 'glutton' ? 1.3 : s.persona === 'lazy' ? 0.7 : 1);
        if (s.satiety >= drop) s.satiety -= drop;
        else { s.starveTime += dt - s.satiety / (drop / dt); s.satiety = 0; }
        s.dirtAcc += dt;
        while (s.dirtAcc >= DIRT_SWIM) { s.dirtAcc -= DIRT_SWIM; if (addDirt(1)) out.dirtUp = true; }
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
        const willEat = s.satiety + pendingEdible + 1 <= SATIETY_MAX + EAT_MARGIN || okaRoom;   // 腹いっぱいの少し先まで食べに行く   // 1粒でも入る余地があれば食べに行く（あふれた分は腹持ち上限で止まる）
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
        // v17: 汚れているときは「吸い込まれた」、きれいなガラスをさらに磨くと「磨きすぎ」（名前どおりに）
        if (effective) { if (rng() < P.cleanEach) accident = 'sucked'; }
        else if (rng() < P.overpolish) accident = 'overpolished';
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
        // 反応ごとに事故を一度抽選。pet と rocket は同じ抽選に第2の事故を持つ。
        const ai = REACTIONS.indexOf(reaction);
        const accId = ai < TOUCH_ACC.length ? TOUCH_ACC[ai] : TRICK_ACC[reaction] || null;
        const roll = accId ? rng() : 1;
        const firstChance = TOUCH_P[accId] || P.touch;
        let accident = roll < firstChance ? accId : null;
        if (!accident && reaction === 'pet' && roll < firstChance + TOUCH_P.cleanfreak) accident = 'cleanfreak';
        if (!accident && reaction === 'rocket' && roll < firstChance + TOUCH_P.rocketBird) accident = 'bird';
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


      // ひまなときのしぐさの事故（しぐさ1回につき P.gesture）
      gestureAccident(name) {
        const id = GESTURE_ACC[name];
        if (!id || !alive()) return null;
        return rng() < P.gesture ? id : null;
      },

      // v20: お客さん（カニ・ミドリガメ・ドジョウ・ナマズ）とのふれあいの事故（1回の訪問につき P.visit）
      visitorAccident(kind) {
        const id = VISIT_ACC[kind];
        if (!id || !alive()) return null;
        return rng() < P.visit ? id : null;
      },

      // 金の粒などのボーナス
      // 金の粒を食べた（ゲージ+2、純金の条件）
      ateGold() { s.goldEaten = (s.goldEaten || 0) + 1; return g.bonus(2); },
      addStress(n) { s.stress = clamp(s.stress + n, 0, STRESS_MAX); if (s.stress > s.maxStress) s.maxStress = s.stress; },
      needs() { return needScores(); },
      favorite() { return { glutton: 'feed', clingy: 'touch', neat: 'clean' }[s.persona] || null; },
      bonus(n) { let up = 0; for (let i = 0; i < n; i++) if (gaugeUp()) up++; return up; },
      persona() { return PERSONAS.find(p => p.id === s.persona) || null; },

      isFull() { return s.gauge >= GAUGE_MAX; },

      // 今の育て方のまま満タンまで育てたら、どの結末に向かいそうか（回数は今のペースで満タンまでのばして見積もる）
      // 当てはまる結末とその重み（図鑑・前回・連打を反映）
      candidates(st) {
        st = st || s;
        return ENDING_RULES.filter(r => r.test(st)).map(r => {
          let w = r.w;
          if (r.id === 'bug') w *= Math.min(400, Math.pow(1 + (st.bugPoints || 0), 2));   // v20: 連打するほど ぐんと出やすく
          if (s.zukan && !s.zukan.has(r.id)) w *= 2;
          if (r.id === s.lastEnding) w *= 0.5;
          return { id: r.id, w };
        });
      },
      // 今の育て方のまま満タンまで育てたら、どの結末がいちばん出やすいか（回数は今のペースで満タンまでのばして見積もる）
      leaning() {
        const k = GAUGE_MAX / Math.max(1, s.gauge);
        const p = Object.assign({}, s, { maxStress: Math.max(s.maxStress, s.stress) });
        for (const key of ['feeds', 'touches', 'polishes', 'combos', 'wantsMet', 'netCount']) p[key] = Math.round((s[key] || 0) * k);
        const c = g.candidates(p).filter(x => x.id !== 'bug' && x.id !== 'oldage').sort((a, b) => b.w - a.w);
        return c.length ? c[0].id : 'oldage';
      },

      decideEnding() {
        if (s.stress > s.maxStress) s.maxStress = s.stress;
        const c = g.candidates();
        let x = rng() * c.reduce((a, b) => a + b.w, 0), id = c[c.length - 1].id;
        for (const e of c) { if (x < e.w) { id = e.id; break; } x -= e.w; }
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
          const currentCause = id => id === 'shellhome' ? 'squashed'
            : Object.prototype.hasOwnProperty.call(CAUSE_BY_ID, id) ? id : null;
          s.zukan = new Set((d.zukan || []).map(currentCause).filter(Boolean));
          s.lastEnding = currentCause(d.lastEnding);
          s.fishNo = d.fishNo || 0;
          if (d.fish) FISH_KEYS.forEach(k => { if (k in d.fish) s[k] = d.fish[k]; });
          s.cause = currentCause(s.cause);
          pendFeed = pendClean = pendTouch = null;
          return true;
        } catch (e) { return false; }
      },
    };
    return g;
  }

  return { GAUGE_MAX, GROW_SEC, P, P_SPEC, SATIETY_MAX, FIELD_MAX, PERSONAS, REACTIONS, create, CAUSES, CAUSE_BY_ID, ENDING_RULES, INITIAL, STORAGE_KEY };
})();
if (typeof module!=='undefined') module.exports = GoldfishLogic;
