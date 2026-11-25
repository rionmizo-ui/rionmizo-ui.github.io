# きんぎょのさいご 引き継ぎメモ（v23.2）

## 毎回の約束（チャットを移っても続ける）
作業のたびに次を渡す：
1. 変更点・何をしたか（`CHANGELOG.md` にも追記）
2. zip（`releases/kingyo-vNN.zip`：元のコード・道具・文書・公開ページ）
3. 遊べるページ・見本ページの更新（下のURL）
4. いつものリスト：確認結果（`CHECKS.md`）と死因リスト（`DEATHS.md`）
5. 終わったら GitHub に保存（ブランチ `claude/lucid-babbage-kg3v6a` の `kingyo/`）
- 途中の判断は質問形式で聞く。確率は相談なしに変えない（今回は「調整して表で見せる」で合意済み）

## 公開ページ
| ページ | URL | 元ファイル |
|---|---|---|
| 遊べるページ | https://claude.ai/artifact/WWnRiryJYMEkMP6R1sUob1 | game.html |
| 見本ページ | https://claude.ai/artifact/Srbg7TqMBwWp4nFdornG2U | sample.html |
| デザイン帳 | https://claude.ai/artifact/Emi5wjEMyzXi62Qsq8nebD | design-book.html |
| 死亡カード帳 | https://claude.ai/artifact/KQHUD3PsquLuWvjDjhYAKS | CARDS.html（自分だけ見られる設定） |
| 結末の姿（描き直し用） | https://claude.ai/artifact/Mc1P6CQpyWZNpUNE44WkNr | ENDLOOKS.html（自分だけ見られる設定） |

## 今の中身（v23.2）
- 死因 **48種**：突然死34・結末14（`DEATHS.md`）。「水槽がせまい」は巨大化に統合、「だるまになった」は削除
- 絵柄：こげ茶の太い輪郭・丸い・ポップでまぬけ。金魚6色は自動の色ちがい（描くのはオレンジ1色でよい）
- ユーザーの絵（`assets/*.png`）：変身6コマ＝食べすぎ・分裂失敗・竜・魚人・巨大化・おばけ・磨きすぎ・石化・大往生・寿司・ハト／カモメ（4コマ）・ミドリガメ（泳ぐ4コマ）・ナマズ（8コマ）・猫の手・黒猫・タニシ・ドジョウ・スケルトン
- 絵の取りこみ：`python3 tools/sheetcut.py 元の絵.png 出力.png 49 --pick 0,3,4,7,9,11 --colors 10`（唇の赤は自動で残す）→ zopfli で圧縮 → `ASSET_INFO` に frames・ax/ay（出力の ref ÷ コマの大きさ）を書く。変身なら main.js の `SEQ_END` か `playSeq` で再生
- 遊べるページには見本再生のコードを入れない（main.js の `/*DEMO*/〜/*/DEMO*/` を build2.js が外す）
- ボタン：道具だけのドット絵（えさ皿・ブラシ・指・網）
- ふれあいの芸14種、しぐさ16種、ミニゲーム3種（お誘い8秒・20〜35秒後から）
- 確率（`src/logic.js`）：`P`＝しぐさ18％・お客さん22％・掃除の吸い込み12％、`TOUCH_P`＝v22の0.75倍、結末の重みは tune.js で 4.6〜10.5％
- 目標：ESP32 に載せても重くならない。game.html は **400KB 以内**（今 395.9KB、残り約4KB）。実機ではまだ試していない

## ファイル
| パス | 中身 |
|---|---|
| `src/logic.js` | ルールと確率（`CAUSES`・`ENDING_RULES`・`P`・`TOUCH_P`） |
| `src/sprites.js` | 描画。`ASSET_INFO`（絵のコマ数・基準点・`end`）、`drawAsset` |
| `src/main.js` | 演出・入力。変身は `SEQ_END` と `playSeq` |
| `src/*.template.html` | ページのひな形 |
| `assets/` | ユーザーの絵（コマ表）。build2.js が埋め込む |
| `tools/build2.js` | 組み立て（`TERSER=絶対パス node tools/build2.js` → `out/`） |
| `tools/sheetcut.py` | ユーザーの絵（4列×3段）→ゲームのドットのコマ列。目標幅＝1コマ目の金魚を49ドット、`--pick` でコマ選び、`--colors 12`、最後に zopfli で圧縮 |
| `tools/reach_real.js` | 全死因が札まで届くか（今 48＋鳥ルート＝49） |
| `tools/bot.js` | 自動プレイ。結果の `stats` に芸・しぐさ・お客さん・イベント・ミニゲームの回数 |
| `tools/tune.js` | 結末の重み合わせ（`cp src/logic.js logic.js` してから実行） |
| `tools/filmall.js` / `cardpeek.js` | 死に際の通し撮り／札とアイコンの確認 |
| `tools/deathlist.js` / `cardlist.js` / `endlooks.js` + `endpage.py` | DEATHS.md／CARDS.html／ENDLOOKS.html を作る |

## 確かめ方
1. `TERSER=$PWD/node_modules/terser node tools/build2.js`
2. `node tools/reach_real.js out/sample.full.html 0 1` → 49/49・errs 空
3. `node tools/bot.js $PWD/out/game.html random 1500 16` → stuck 0（警告 readback は問題なし）
4. 絵を変えたら `filmall.js` で通し撮り、`cardlist.js`・`endlooks.js`・`deathlist.js` で一覧を作り直す
5. Codex のサンドボックスではブラウザが動かないので、確認は Claude 側で

## 残っていること
- ユーザーが他の死に方の絵を描き直して送ってくる予定（`ENDLOOKS.html` を参考に、12コマで）。取りこむときは置き換えた古い描画コードを消して 400KB 以内を保つ
- 自動プレイで一度も出ない死因4種（ガラスに刺さった・吸い込まれた・空腹でスケルトン・ナマズにのまれた）を、もっと出やすくするか
- 魚人の札が小さい（背が高い絵のため）
- ESP32 の実機確認
