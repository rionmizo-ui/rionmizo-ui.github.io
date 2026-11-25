# きんぎょのさいご デザイン作り直し指示書（Codex 向け・v22 時点）

> English summary for the agent: This is a 160×240 pixel-art goldfish game in plain JS (no framework).
> Redesign the **visuals only** (death cards, death animations, visitor creatures, props, tank, UI)
> by editing `src/sprites.js` (and the few `draw*` helpers in `src/main.js`). Do **not** change game rules in
> `src/logic.js`, cause IDs, or the public function names/signatures/anchor points listed below.
> Build with `tools/build2.js`, then run the checks in section 6. Reference images of the current design are in `ref/`.

## 1. 目的
今の見た目（ドット絵）を作り直したい。遊び方・確率・死因の中身はそのままで、**絵と動きだけ**を新しくする。

作り直す対象（優先順）：
1. **死亡カード**（`drawCard`）… 札。49種すべてで同じ枠を使う。`ref/cards_all_50.png`
2. **死に際の動き**（`sprites.js` の `dieSeq('死因ID', [ポーズ…], 完成形)` と `DIE_FX`）… 49種。`ref/death_frames/`
3. **死因アイコン**（`drawCauseIcon(ctx,x,y,id,size,t)`）… 図鑑とカードの中の絵。`ref/icons_all_50.png`
4. **遊びにくる生き物（お客さん）6種** … 巻貝 `drawSnail`・カニ `drawCrab`・エビ `drawShrimp`・ミドリガメ `drawTurtle`（＋岩山とライト `drawBaskRock`）・ドジョウ `drawLoach`・ナマズ `drawCatfish`。`ref/visitors_props.png`
5. **イベントの小物**（UFO・板前の手・隕石・おばけ・猫・鳥・網・ハト など）… 同上
6. **金魚本体**（`drawFish` と内部の `buildFish` `buildFront` `buildQuarter`）… 6色×3段階＋手描きコマ。`ref/fish_poses.png` `ref/fish_faces.png`
7. **水槽・かざり16段**（`drawTank` `drawDecor`）… `ref/decor_levels.png`
8. **UI**（ゲージ `drawGauge`、吹き出し `drawThought`、アイコン `drawIcon`、図鑑 `drawZukan`、main.js の `drawStatus` `drawLamps` `drawZukanUI` `renderTitle`）… `ref/screen_*.png`

## 2. 変えてはいけないもの（取り決め）
- `src/logic.js`（ルール・確率・結末の条件と重み）。死因ID 49個（`DEATHS.md` の順と名前）
- `window.GoldfishSprites` が公開している **関数名・引数・戻り値なし** の形（一覧は `DRAW_INVENTORY.md`）。main.js はこれを呼んでいる
- **画面は 160×240**（内部解像度）。描画は `ctx.fillRect` ベースのドット（にじみなし）。main.js は 1秒24コマで描く
- **(x,y) の意味（アンカー）**：`SPRITES_API.md` に関数ごとに書いてある。例）`drawFish` は体の中心、`drawCrab` は足先の高さ（y+5 付近）、`drawTurtle` は甲羅のふちの中心、`drawCatfish` は体の中心で全長約56、`drawCard` は画面全体（x=10,y=40 に幅140×高さ146の札）。
  大きさを変える場合は、main.js 側の位置（例：魚がカメの背中に乗る `v.y - 18`、カニに近づく距離 32px）も合わせて直すこと
- **死に際のコマの仕組み**：`dieSeq(k, poses, fin)` で「キー」を並べ、自動で間に2コマずつ中割り（`DEATH_FRAMES[k] = { n, hold, sub:3, keys }`）。
  main.js は多くを `dieTo(k)`（全部を順に送る）と `dieAt(k, 0〜1)`（進み具合）で使うので、キーの数は自由に変えてよい。
  ただし次の4つは main.js が **キー番号を直接指定**しているので、キーの数を減らすときは main.js の該当箇所も直すこと：
  `sucked`（キー0〜16を使用）・`star`（0〜12）・`fished`（0〜12）・`pigeon`（0〜9）
- ポーズに書けるキー（目・口・フラグ・`dx dy r sc a sx sy mix wipe roll trim clipB fx …`）は `SPRITES_API.md` と `sprites.js` の「死に際の手描きコマ」の説明のとおり。新しいキーを足すのは自由
- 色のパレット名（`PAL` の `normal lime pink yellow sky purple` と死因用 `poison frozen burnt stone gold himono loach …`）は `palette:` や `mix:` で名前で参照されている

## 3. ファイル
| パス | 中身 |
|---|---|
| `src/sprites.js` | **ここをおもに作り直す**（約6,300行）。描画関数・パレット・死に際のコマ・カード・アイコン・図鑑 |
| `src/main.js` | 演出の流れ（いつ何を描くか）。見た目に関わるのは `render` `drawStatus` `drawLamps` `drawZukanUI` `renderTitle` `drawFx` `drawFishEnt` `drawFinger` |
| `src/logic.js` | ルール（**さわらない**） |
| `src/game.template.html` `src/sample.template.html` | 遊べるページ・見本ページのひな形（`<!--SCRIPTS-->` に JS が入る） |
| `tools/build2.js` | 組み立て（`out/game.html` 縮小版・`out/game.full.html` 読みやすい版・見本も同様） |
| `tools/refsheets.js` | **参考画像を書き出す**（作り直した後もこれで一覧を出して見比べる） |
| `tools/reach_real.js` `tools/bot.js` `tools/film.js` | 確認用（下の6章） |
| `ref/` | 今のデザインの画像（下の5章） |
| `DEATHS.md` | 死因49種の文字リスト（名前・起き方・浮く/沈む/消える） |

## 4. 今のデザインのルール（参考。変えてよい）
- 1px の輪郭。水槽まわりの輪郭は濃い緑 `#1d4d4a`、金魚の輪郭はこげ茶 `#2a1408`
- 金魚：まんまるの体、前に飛び出す白い大きな目2つ、赤いくちびる、クリーム色のお腹、二股の尾。尾込み幅 約46px（stage2）
- 水 `#5fcfb8`、空気 `#a6e6d6`、砂 `#f0b070`、札はクリーム `#fff8e8` に赤（突然死）／青緑（結末）の帯
- 表情：目 16種・口 10種（`ref/fish_faces.png`）

## 5. 参考画像（`ref/`）
- `cards_all_50.png` … 死亡カード50枚（実際の札。NEW! つき含む）
- `icons_all_50.png` … 図鑑アイコン（大＝カード用 size2／小＝図鑑用 size1）
- `death_frames/NN_ID.png` … 死に際のキーコマを左から順に（中割りは含まない）
- `fish_poses.png` … 6色×3段階、泳ぎ8・振り返り5・まばたき3・ぱくっ3・びっくり3・もぐもぐ・裏返り6
- `fish_faces.png` … 目と口の種類
- `visitors_props.png` … お客さん6種と、イベントの小物
- `decor_levels.png` … 水槽のかざり Lv.0〜16
- `screen_title.png` `screen_play.png` `screen_zukan.png` `screen_decor_lv16.png` … 実際の画面

## 6. 作り直したあとの確認（すべて通すこと）
```
npm i terser@5.31.0 playwright
TERSER=./node_modules/terser node tools/build2.js            # 組み立て
node tools/refsheets.js $PWD/out/sample.full.html $PWD/ref_new   # 新しい参考画像を書き出して ref/ と見比べる
node tools/reach_real.js $PWD/out/sample.full.html 0 1          # 50の死因すべてが札まで行くか（res がすべて id と同じ・errs が空）
node tools/bot.js $PWD/out/game.html random 1500 16             # 早送りの自動プレイ（errs が警告だけ・stuck が 0）
node tools/film.js $PWD/out/sample.full.html himono $PWD/film.png 18 12   # 1つの演出を12コマのフィルムに
```
- 見本ページ（`out/sample.html`）を開いて、全114の水槽が動き、エラーが出ないこと
- 公開用の縮小版 `out/game.html` は **400KB 以内**（v22 は 357KB）
- 1コマを描くのに時間がかかりすぎないこと（`drawFish` は形をキャッシュしている。毎コマ新しい配列や Grid を大量に作らない）

## 7. 進め方のおすすめ
1. まず **死亡カードの枠**（`drawCard`）と **アイコン1つ**（例 `poison`）だけ作り直して、`refsheets.js` で確認
2. 方向が決まったら、アイコン49種 → お客さん6種 → 死に際のコマ（`dieSeq`）の順に
3. 金魚本体を変えると全部に影響するので、最後か、最初に一度だけ決める
4. 死因ごとの動きの内容（何が起きるか）は `DEATHS.md` と `ref/death_frames/` を見て、筋はそのままにする
