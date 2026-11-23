/* logic — 金魚育成ゲーム ルール・確率エンジン（ESM 版。prototype/logic.js と同じ API）
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

import { P, P_SPEC, SATIETY_MAX, FIELD_MAX, PERSONAS, REACTIONS, CAUSES, CAUSE_BY_ID, ENDING_RULES, INITIAL, STORAGE_KEY } from './data.js';
import { create } from './engine.js';

// prototype の GoldfishLogic と同じ形
const GoldfishLogic = { P, P_SPEC, SATIETY_MAX, FIELD_MAX, PERSONAS, REACTIONS, create, CAUSES, CAUSE_BY_ID, ENDING_RULES, INITIAL, STORAGE_KEY };
export default GoldfishLogic;
export { P, P_SPEC, SATIETY_MAX, FIELD_MAX, PERSONAS, REACTIONS, create, CAUSES, CAUSE_BY_ID, ENDING_RULES, INITIAL, STORAGE_KEY };
