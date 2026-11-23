# きんぎょのさいご（作り直し版）

`../HANDOFF.md` の仕様をもとに、`../prototype/` の試作を作り直したものです。
遊べる中身は試作と同じです。ファイルを役割ごとに分け、テストと耐久テストを足しました。

## 遊ぶ

- **`dist/index.html`** をダブルクリック（サーバー不要）。見本ページは `dist/gallery.html`。
- 開発中は ES モジュールのまま動かせます：`npm run dev` → http://localhost:8000/index.html
  （モジュールは `file://` では読めないので、こちらはサーバーが要ります）
- URL の後ろに `?fresh=1` で保存を消して最初から、`?speed=3` で3倍速。

## コマンド

| コマンド | 内容 |
|---|---|
| `npm install` | 初回だけ（ビルド用の esbuild を入れる） |
| `npm test` | ルールのテスト121件（試作と同じもの）＋描画関数のテスト＋タスクのテスト |
| `npm run build` | `src/` をまとめて `dist/index.html` と `dist/gallery.html` を作る |
| `npm run soak` | 耐久テスト。ヘッドレスブラウザで12通りの乱数×12分の乱打をして、エラーや止まったままの所がないか見る（先に build。Playwright が要る） |

## 中身

```
src/
  logic/          ルール層（描画なし・乱数を注入。Node でも動く。C++ に移すならここ）
    data.js         死因36種・結末の条件・確率・定数の表
    engine.js       魚1匹ぶんの状態と世話・事故・結末の判定（create）
    index.js        まとめて公開（試作の GoldfishLogic と同じ API）
  art/sprites.js  すべてのドット絵の描画関数（試作の sprites.js そのまま）
  game/           演出層（G という共有の箱に、各モジュールが関数と状態を載せる）
    index.js        mount(canvas, cfg)：下のモジュールを順に組み込む
    runner.js       ジェネレータの演出タスクを進める（どの待ちにも20秒の逃げ道）
    setup / state   起動時の設定・画面の状態
    tasks           演出タスク・tween・ゲーム内タイマー
    audio           効果音と BGM（WebAudio 合成）
    input / flow    入力と予約・起動、次の魚、世話の実行
    care / touch    餌・掃除／ふれあい（指）・網
    gestures        ふだんの表情、ひまなときのしぐさ、しぐさ中の突然死
    visitors        お客さん（巻貝・カニ・エビ）
    death / endings 途中死・回収・札／満タン時の結末
    water           水面の波・しぶき
    update / render / reward   毎フレームの更新・描画・ボーナス表示
    loop / demo / start        メインループ・見本再生・起動
  main.js         本体ページの入口
  gallery.js      見本ページの入口
test/             node で動くテスト
tools/build.js    1ファイルにまとめるビルド
tools/soak.js     耐久テスト
```

### 試作から変えたところ

- 1ファイル（main.js 約2000行）だった演出を、節ごとの19モジュールに分けた。分け方は機械的で、動きは変えていない。
- ルール（logic）を「表（data.js）」と「判定（engine.js）」に分けた。API と値はそのまま。
- 演出タスクのランナーが3か所に重複していたのを `runner.js` にまとめた。条件待ちが上限
  （ふだん20秒、見本再生120秒）を超えたら警告を出して先へ進める。HANDOFF 9章の「すべての待ちに逃げ道」。
- BGM の `setSong` が2回定義されていた（後ろが有効）ので、使われていない前の方を消した。

### 次にやること（案）

1. 共有の箱 `G` に載っている状態（`G.pellets` や `G.finger` など）を、意味ごとの小さなオブジェクトにまとめる。
2. `sprites.js`（約3900行）を、魚・小物・UI・死因の絵に分ける。Arduino に向けて、ゆくゆくはスプライトシートへ。
3. HANDOFF 10章の「見た目で弱いところ」（結んじゃった・昇天の羽）を直す。
