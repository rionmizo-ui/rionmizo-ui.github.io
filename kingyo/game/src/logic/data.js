// data.js — 死因・結末の条件・確率・定数（ルールの表）
// prototype/logic.js から移したもの。値を変えるときはここだけを見ればよい。

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


export {
  CAUSES, CAUSE_BY_ID, ENDING_RULES, GESTURE_ACC, P, P_SPEC, INITIAL, STORAGE_KEY, GAUGE_MAX, SATIETY_MAX, FIELD_MAX, DIRT_MAX, STRESS_MAX, FEED_ACC, CLEAN_ACC, TOUCH_ACC, REACTIONS, PERSONAS,
};
