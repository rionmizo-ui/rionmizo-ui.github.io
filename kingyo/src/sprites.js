// sprites.js — 金魚育成ゲーム ドット絵（状態を持たない描画関数群）
// 内部解像度 160x240。全関数 (ctx, x, y, opts) で x,y は中心。fillRect ベース。
//
// ■ drawFish(ctx,x,y,opts) の opts（CONTRACT.md の基本 opts に加えて）
//   variant: 死因ID … VARIANTS のプリセットを下敷きにする（個別 opts が優先）
//   flower + flowerStage 0..3 … 頭の植物 0=芽 1=双葉 2=つぼみ 3=開花（省略時 3）
//   xray: true | 'blink' … 感電のレントゲン（暗い体に白い骨）。'blink' は t で点滅
//   spark / lightning … 体の周りのスパーク（格子内）/ 左右に点滅する稲妻（エフェクト）
//   burnt + smoke … 黒焦げ（ひび割れの残り火・ちりちりのひれ）/ 立ちのぼる煙
//   palette:'poison' + fumes … 紫に変色＋緑の斑点・よだれ / 紫の湯気と小さなドクロ
//   white + shine + sparkle … 真っ白（オレンジが落ちた）/ ブラシ跡とつや / きらめき
//   stars … 頭上を回る星とひよこ（目を回した）
//   balloon … パンパンの風船体（トゲなし・つや・ひも付き）。puff を内包
//   moss … 全身コケ＋輪郭のもこもこの房（目だけ見える。eyes で ぱち/× を切替）
//   stone … 魚の輪郭が浮き彫りで残る丸石。eyes/look/dir で目だけ動く
//   skeleton … ガリガリ（細い体・こけた腹・浮いた肋骨と背骨・くま・ぼろぼろの尾）
//   bones … 旧スケルトン（骨だけの魚）
//   belly … 巨大に膨らんだお腹（つや・へそ） / wrinkles … しわ・白い眉・長い白ひげ
//   legs + drown … 魚人の手足＋両手を上げてばたばた・口からぶくぶく
//   glitch … 帯状の横ずれ＋マゼンタ/シアンの色ずれ残像＋ノイズ帯
//   sweat … 汗のしずく（分裂・水槽がせまい） / fx:false … 上記エフェクト類を描かない
//   エフェクト類（smoke fumes stars lightning sparkle sweat balloon のひも drown の泡）は opts.t でアニメ
//
// ■ v15 デザイン（references/v15）：まんまる体・前に飛び出す白い大目2つ・赤いくちびる・えら線・クリーム色のお腹・
//   すじ入り背びれ・二股の尾・足びれ2つ・こげ茶の輪郭。stage2 で尾込み幅 約46px、くちびる中心 (x+dir*12, y+5)・前端 x+dir*17
//   mouth に 'frown'（への字くちびる）を追加。eyes:'annoyed' で自動。happy は 'grin'。skeleton は頭と尾が残り胴が魚の骨
// ■ カートゥーン化で追加した opts（すべて省略可。省略時は通常の横顔）
//   turn 0..1 … 振り返り。0=dir向き 0.5=正面 1=逆向き。中間は横幅 |cos(πt)|（最小0.3）に縮めた横顔、|cos|<0.35 は正面顔
//   front:true … 正面顔（turn=0.5 と同じ）。stone / bones / split は正面顔なし（縮めた横顔になる）
//   sx, sy … つぶし・伸ばし倍率（体の中心基準。0.05刻みでキャッシュ）
//   cheeks:true + chew 0..1 … ほっぺぷくっ＋もぐもぐ（chew 0=閉じ 0.5=開く。ほっぺも上下）。chew だけでも口が動く
//   mouth … 0|1 に加え 'o' 'yawn' 'grin' 'pout' 'smile' 'wavy' 'tongue'
//   eyes … 既存に加え 'angry' 'blink' 'surprised' 'annoyed' 'love' 'teary' 'sparkle' 'closed' 'side'
//   brows … 'none' 'up' 'down' 'worried' 'angry'（annoyed は へ の字眉、angry 目は怒り眉が自動）
//   blush:true … 強いほっぺ（ふだんも薄く赤い） / mark|bubble … 頭上の記号 'zzz' '!' '?' 'note'(♪) 'anger'(💢) 'heart' 'sweat'
//   wag … 尾の振り速度倍率（既定1、0で止まる）
//
// ■ 追加・拡張した関数
//   drawPellet(ctx,x,y,type,t)   'poison' は紫のドクロ玉＋湯気（t でゆらぐ）、'spark' は t で火花、'gold' は金の粒（8px、t でキラッ）
//   drawSnail(ctx,x,y,t,{rot,surprised}) 巻貝 / drawCrab(ctx,x,y,t,{pinch,angry}) カニ（足先 y+5）
//   drawShrimp(ctx,x,y,t,{dir,jump}) 小エビ / drawBall(ctx,x,y,t) ビーチボール(直径9)
//   drawFingerHoop(ctx,x,y,t) OKサインの指の輪（(x,y)=輪の内側中心、内径22、手首は画面上端まで）
//   drawBadge(ctx,x,y,label) 名札（8px 文字、幅は文字に合わせる）
//   drawNozzle(ctx,x,y,{suck,tail,t})  suck=吸い込み線と汚れ、tail=口から金魚の尾がのぞく
//   drawCatPaw(ctx,x,y,{fish,t})  大きな猫の手（肉球・爪）。fish=爪に金魚
//   drawSmoke(ctx,x,y,t) 煙 / drawFumes(ctx,x,y,t) 毒の湯気 / drawStars(ctx,x,y,t) 星とひよこ
//   drawLightning(ctx,x,y,t) 稲妻 / drawSparkles(ctx,x,y,t,r) きらめき / drawDrop(ctx,x,y) 汗
//   drawSuctionLines(ctx,x,y,t) (x,y)＝吸い口へ集まる線 / drawSplash(ctx,x,y,p) ぽちゃん(p=0..1)
//   drawFlame(ctx,x,y,dir,t) 口から吹く炎 / drawPop(ctx,x,y,r,p) 泡がはじける / drawBird(ctx,x,y,t,dir) 鳥
//   drawCauseIcon(ctx,x,y,id,size,t)  size<=1 図鑑用 / size>1 小物つき場面（size=2 で約62x42）
//   drawCard は ctx.scale があればミニ絵を2倍ドットで大きく描く
//
// ■ 体色・イベント小物（追加）
//   drawFish opts.color 'orange'(既定)|'lime'|'pink'|'yellow' … 体・ひれ・尾・うろこ・ハイライト一式。
//     palette / 死因フラグ（frozen burnt white stone skeleton bald xray moss など）があればそちらが優先。
//     wrinkles は色ごとのくすんだ色、dragon は体色＋差し色。drawDragon(ctx,x,y,t,dir,color)
//   死因 'jumpout'（飛び出した）… VARIANTS / drawCauseIcon 対応
//   drawCatShadow(ctx,x,y,t,{angry,flee}) 水面の上からのぞく猫の顔の上半分（(x,y)=顔の下端中心、幅約60）
//   drawMysteryPellet(ctx,x,y,t) 虹色に光る怪しい粒 / drawAlert(ctx,x,y,t,icon) 赤枠「！」＋ボタンアイコン（幅30）
//
// ■ 体色2種・死因6種（追加2）
//   opts.color に 'sky'（水色・お腹クリーム） 'purple'（ラベンダー） … 老衰色・竜の差し色つき。COLORS は6色
//   eyes 'calm' … 穏やかに閉じた目 ‿
//   sushi:true … シャリに乗ったにぎり（目×・わさび）。正面なし：front/turn<=0.5 は横顔、>0.5 は逆向き
//   meteor:true … 黒焦げ＋ぺしゃんこ（sx×1.3, sy×0.55）＋赤いたんこぶ＋星＋煙（burnt/stars/smoke を内包）
//   ghost:true … 半透明の白いおばけ（下半分が煙の尾・三角の天冠・うらめしや手・人魂）。眠い目＋困り眉が既定
//   zen:true … 閉じ目・光背・蓮の花・ほんのり金色。front/turn 未指定なら正面になる
//   mom:true … 満足げ（closed 目・smile・blush）＋汗
//   drawUFO(ctx,x,y,t,{scale,rot}) 幅約44 / drawBeam(ctx,x,y,len,t,w=26) (x,y)=上端中心から下へ len
//   drawChefHand(ctx,x,y,t,{knife,dir(-1=刃が左),len,scale}) (x,y)=手、袖は y-len まで（既定は画面上端）
//   drawMeteor(ctx,x,y,t,size) 尾は右上へ / drawCrater(ctx,x,y,t) (x,y)=砂の表面のくぼみ中心
//   drawGhost(ctx,x,y,t,{angry,scale,dir}) 幅約30（人魂つき） / drawBaby(ctx,x,y,t,{color,dir,scale,phase}) 幅約10（scale<0.8 は極小ドット）
//
// ■ 手描きコマ（キーフレーム）opts … 整数のコマ番号。渡さなければ従来どおり（出力は1ドットも変わらない）
//   swimF 0..3 泳ぎ（0=尾が右(上へしなる) 1=中央・体1px上 2=尾が左(下へ) 3=中央・体1px下。尾/背/胸/腹びれがコマごとのポーズ。4以上は折り返し）
//   turnF 0..4 振り返り（0=横顔 1=斜め45° 2=正面 3=逆向き斜め 4=逆向き横顔＝dir反転と同じ）。turn/front より優先
//     斜めは stone bones split stuck knot sushi puff/balloon legs ghost moss flower flat wings では縮めた横顔で代用
//   chewF 0..3 もぐもぐ（ほっぺ自動。0=閉 1=少し開く 2=ほっぺ↑で目が細い 3=閉じてほっぺ↓。折り返し）
//   blinkF 0..2 まばたき（0=開 1=半目 2=閉）。eyes が x dizzy happy closed などの特殊目なら無視
//   eatF 0..2 ぱくっ（0=大口で前へのびる 1=閉じてちぢむ 2=もどり）。横顔は尾の先を支点にのび縮み
//   rollF 0..5 裏返り（1=薄く・お腹が見える 2=真横でお腹が上半分 3=ほぼ裏 4=flipと同じ 5=沈んでつぶれる(+2px)）。flip と併用すると反転が逆になる
//   surpF 0..2 びっくり（0=ぎゅっと縮む >< 1=のびて目が大きくひれ全開 2=もどり）。eyes/mouth を上書き（x 目は残す）
//   優先：口 eatF > chewF > surpF、目 blinkF > surpF。sx/sy とは掛け算。コマは opts.t によらず決まる（swimF 指定時は飾りの揺れも swimF に同期）
//
// ■ 死に際の手描きコマ opts.die = { k: 死因ID, f: コマ番号 }（12fps で 0→hold と送る。hold=最後＝静止形）
//   GoldfishSprites.DEATH_FRAMES[k] = { n, hold, fps:12 }（43死因すべて）。prewarmDeath(k, {color,stage}) で先に作れる
//   呼び出し側の color stage dir scale rot sx sy t fx legLen wag だけ使い、目・口・フラグはコマが決める（variant/eyes などは無視）
//   途中のコマは opts.t によらず決まる。hold コマだけ t で煙・きらめき等が動く。hold の絵は既存の静止形と同じ
//   小物（猫の手・鳥・網・ノズル・大きな泡・UFO・板前の手・隕石・魂・赤ちゃん・巨大な顔）は描かない（main.js 側）
(function () {
  'use strict';

  // ---------- パレット ----------
  var O = '#1d4d4a';           // 濃い縁
  var FK = '#2a1408';          // 金魚の輪郭（こげ茶）
  var WATER = '#5fcfb8', WATER_D = '#56c4ae', AIR = '#a6e6d6';
  var CREAM = '#fff8e8', PAPER = '#f8f0d8';
  var SAND = '#f0b070', SAND_D = '#c98a50', SAND_B = '#e49c5c';
  var WEED = '#3d9a3a', WEED_L = '#7cc24a';

  var PAL = {
    normal: { B: '#ff8a00', D: '#e06a00', L: '#ffb24a', P: '#ffc890', F: '#ff9512', W: '#ffffff', K: FK },
    white: { B: '#f8fafc', D: '#d4dce2', L: '#ffffff', P: '#eef2f6', F: '#ffffff', W: '#ffffff', K: FK },
    frozen: { B: '#d8a07a', D: '#b07c60', L: '#ecc4a4', P: '#f0d8c4', F: '#dca888', W: '#e8f8ff', K: '#3a3a5a', M: '#e07070', ML: '#f0a0a0' },
    burnt: { B: '#d8883a', D: '#7a3a14', L: '#eaa45a', P: '#e8b070', F: '#d07a30', W: '#ffffff', K: FK, M: '#e0402a' },
    stone: { B: '#9a948a', D: '#77716a', L: '#ada79c', P: '#c2bcb0', F: '#a49e94', W: '#b8b2a6', K: '#4a4640', M: '#b0aaa0', ML: '#c8c2b8', MS: '#5a5650' },
    poison: { B: '#9a4ad0', D: '#6e2ea4', L: '#c08ae8', P: '#f0c8a0', F: '#ff8a00', W: '#ffffff', K: FK },
    gaunt: { B: '#e8964a', D: '#c07038', L: '#f4b87a', P: '#f4d4b0', F: '#e0904a', W: '#ffffff', K: FK },
    xray: { B: '#1c2c5a', D: '#14204a', L: '#2a3e74', P: '#22346a', F: '#1a2a58', W: '#9fe8ff', K: '#bff4ff', M: '#3a5a9a', ML: '#5a7ab8', MS: '#bff4ff' },
    old: { B: '#e8883a', D: '#c06a2a', L: '#f4aa6a', P: '#f4d0a8', F: '#ec9448', W: '#ffffff', K: FK },
    gold: { B: '#f6c42a', D: '#c88a14', L: '#fff27a', P: '#ffe58a', F: '#eeb420', W: '#ffffff', K: '#5a3008', M: '#ff7a1a', ML: '#ffb060' },
    // 体色（opts.color）。normal = orange
    lime: { B: '#7ccc2c', D: '#58a020', L: '#b4ec6a', P: '#f2f6c4', F: '#8cd83c', W: '#ffffff', K: FK },
    pink: { B: '#ff86a8', D: '#e05a82', L: '#ffbccc', P: '#ffe2ea', F: '#ff96b4', W: '#ffffff', K: FK },
    yellow: { B: '#ffc81e', D: '#e09a00', L: '#fff070', P: '#fff2c4', F: '#ffd23a', W: '#ffffff', K: FK },
    oldLime: { B: '#98c662', D: '#709a46', L: '#c2e294', P: '#f4f0d0', F: '#acd47c', W: '#ffffff', K: FK },
    oldPink: { B: '#e0989e', D: '#bc727c', L: '#f2c0c4', P: '#f8e2e2', F: '#eaaab0', W: '#ffffff', K: FK },
    oldYellow: { B: '#e8c45a', D: '#c09c3a', L: '#f6e09a', P: '#f8f0d4', F: '#eed070', W: '#ffffff', K: FK },
    sky: { B: '#4cb8f4', D: '#2a88d0', L: '#a6e0ff', P: '#fff0d0', F: '#68c6fa', W: '#ffffff', K: FK },
    purple: { B: '#ac80ec', D: '#8458cc', L: '#d8c4ff', P: '#f4e8ff', F: '#bc96f2', W: '#ffffff', K: FK },
    oldSky: { B: '#86b6d2', D: '#628eae', L: '#bcdcec', P: '#f6f0dc', F: '#9cc6de', W: '#ffffff', K: FK },
    oldPurple: { B: '#b0a0c8', D: '#8a7aa6', L: '#d6cce6', P: '#f4eef4', F: '#c2b4d8', W: '#ffffff', K: FK },
    // v20：干物（日に干された茶色）・ドジョウ（黄土色）
    himono: { B: '#c8965a', D: '#8a5a2a', L: '#e8bf86', P: '#f2dcb4', F: '#b07a42', W: '#fffaf0', K: '#4a2a10' },
    loach: { B: '#c4a454', D: '#866a30', L: '#e4cc84', P: '#f4e8c0', F: '#a88a44', W: '#ffffff', K: FK },
    // おばけ（opts.ghost）
    ghost: { B: '#f2faff', D: '#cfe4f0', L: '#ffffff', P: '#e6f2fa', F: '#e2f0f8', W: '#ffffff', K: '#6a9ab8', M: '#ffb0c0', ML: '#ffd8e0' }
  };
  // 体色ごとの差し色（竜のとげ・たてがみ）
  var ACCENT = {
    orange: ['#ff7a3a', '#e8442a', '#ff8a4a'],
    lime: ['#4ac0a0', '#2a8a7a', '#6ad8b0'],
    pink: ['#ff6a9a', '#d83a6a', '#ff8ab0'],
    yellow: ['#ff9a2a', '#e86a1a', '#ffb040'],
    sky: ['#5a6cf0', '#3a3cc0', '#8a9cff'],
    purple: ['#ff6ac8', '#c8389a', '#ff96dc']
  };
  var COLORS = { orange: 1, lime: 1, pink: 1, yellow: 1, sky: 1, purple: 1 };
  var OLDPAL = { orange: 'old', lime: 'oldLime', pink: 'oldPink', yellow: 'oldYellow', sky: 'oldSky', purple: 'oldPurple' };
  function colorOf(o) { return o && COLORS[o.color] ? o.color : 'orange'; }
  // 体色の基本パレット（飾りの判定用：通常色かどうか）

  // ---------- ユーティリティ ----------
  function R(n) { return Math.round(n); }
  function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); }
  function hash(a, b) {
    var h = (a * 374761393 + b * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function inPoly(x, y, pts) {
    var c = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }

  // ---------- グリッド（ローカル座標のドット集合） ----------
  function Grid(w, h, ox, oy) {
    this.w = w; this.h = h; this.ox = ox; this.oy = oy;
    this.c = new Array(w * h).fill(null);
  }
  Grid.prototype.get = function (x, y) {
    x += this.ox; y += this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.c[y * this.w + x];
  };
  Grid.prototype.set = function (x, y, col) {
    x = Math.floor(x) + this.ox; y = Math.floor(y) + this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.c[y * this.w + x] = col;
  };
  // fn(x,y) が色を返すセルを塗り、外周に輪郭(4近傍)を付ける
  // box=[x0,y0,x1,y1]（ローカル座標、両端含む）を渡すとその範囲だけ評価する
  Grid.prototype.stamp = function (fn, outline, box) {
    var w = this.w, h = this.h, x, y, i;
    var X0 = 0, Y0 = 0, X1 = w - 1, Y1 = h - 1;
    if (box) {
      X0 = Math.max(0, Math.floor(box[0]) + this.ox); Y0 = Math.max(0, Math.floor(box[1]) + this.oy);
      X1 = Math.min(w - 1, Math.ceil(box[2]) + this.ox); Y1 = Math.min(h - 1, Math.ceil(box[3]) + this.oy);
    }
    var mw = X1 - X0 + 3, mh = Y1 - Y0 + 3, mask = new Array(mw * mh).fill(null);
    for (y = Y0; y <= Y1; y++) for (x = X0; x <= X1; x++) mask[(y - Y0 + 1) * mw + (x - X0 + 1)] = fn(x - this.ox, y - this.oy) || null;
    if (outline !== false) {
      var oc = outline || O;
      for (y = 0; y < mh; y++) for (x = 0; x < mw; x++) {
        i = y * mw + x;
        if (mask[i]) continue;
        if ((x > 0 && mask[i - 1]) || (x < mw - 1 && mask[i + 1]) || (y > 0 && mask[i - mw]) || (y < mh - 1 && mask[i + mw])) {
          var gx = x + X0 - 1, gy = y + Y0 - 1;
          if (gx >= 0 && gy >= 0 && gx < w && gy < h) this.c[gy * w + gx] = oc;
        }
      }
    }
    for (y = 1; y < mh - 1; y++) for (x = 1; x < mw - 1; x++) { i = y * mw + x; if (mask[i]) this.c[(y + Y0 - 1) * w + (x + X0 - 1)] = mask[i]; }
  };
  Grid.prototype.line = function (pts, col) { for (var i = 0; i < pts.length; i++) this.set(pts[i][0], pts[i][1], col); };

  // ASCII アート → Grid（中心は幅/高さの半分）
  function art(rows, legend) {
    var h = rows.length, w = 0, i, j;
    for (i = 0; i < h; i++) w = Math.max(w, rows[i].length);
    var g = new Grid(w, h, w >> 1, h >> 1);
    for (j = 0; j < h; j++) for (i = 0; i < rows[j].length; i++) {
      var ch = rows[j][i];
      if (ch !== '.' && ch !== ' ' && legend[ch]) g.c[j * w + i] = legend[ch];
    }
    return g;
  }

  // Grid を (cx,cy) を中心に描く。mirror=左右反転, flip=上下反転, rot=ラジアン, scale=倍率
  // 縮小：輪郭を保ったまま多数決で縮め、外周に輪郭を付け直す
  function minify(g, s) {
    g._mini = g._mini || {};
    if (g._mini[s]) return g._mini[s];
    var K = g.K || O, keep = g.keep || null;
    var x0 = Math.floor(-g.ox * s) - 1, x1 = Math.ceil((g.w - g.ox) * s) + 1;
    var y0 = Math.floor(-g.oy * s) - 1, y1 = Math.ceil((g.h - g.oy) * s) + 1;
    var m = new Grid(x1 - x0 + 2, y1 - y0 + 2, -x0 + 1, -y0 + 1);
    var fill = {};
    for (var v = y0; v < y1; v++) for (var u = x0; u < x1; u++) {
      var sx0 = Math.floor(u / s), sx1 = Math.max(sx0, Math.floor((u + 1) / s - 1e-6));
      var sy0 = Math.floor(v / s), sy1 = Math.max(sy0, Math.floor((v + 1) / s - 1e-6));
      var n = 0, nn = 0, nk = 0, cnt = {}, best = null, bc = 0, kept = null, kr = 99, sep = false;
      for (var yy = sy0; yy <= sy1; yy++) for (var xx = sx0; xx <= sx1; xx++) {
        n++;
        var c = g.get(xx, yy); if (!c) continue;
        nn++;
        if (keep) { var ki = keep.indexOf(c); if (ki >= 0 && ki < kr) { kr = ki; kept = c; } }
        if (c === K) {
          nk++;
          // 目と目の間などの細い仕切り線（左右とも中身）は残す
          var lc = g.get(xx - 1, yy), rc = g.get(xx + 1, yy);
          if (lc === g.keepSep && rc === g.keepSep) sep = true;
          continue;
        }
        cnt[c] = (cnt[c] || 0) + 1;
        if (cnt[c] > bc) { bc = cnt[c]; best = c; }
      }
      if (nn * 2 < n) continue;
      var col = kept || ((!best || sep || nk > nn * 0.6) ? K : best);
      m.set(u, v, col);
    }
    var c0 = m.c.slice(), W = m.w;
    for (var i = 0; i < c0.length; i++) {
      if (c0[i]) continue;
      var x = i % W;
      if ((x > 0 && c0[i - 1]) || (x < W - 1 && c0[i + 1]) || c0[i - W] || c0[i + W]) m.c[i] = K;
    }
    g._mini[s] = m;
    return m;
  }

  // ---------- 拡大・回転（RotSprite 風：Scale2x×2 で4倍にしてから最近傍サンプリング） ----------
  function scale2x(g) {
    var w = g.w, h = g.h, c = g.c, W = w * 2, o = new Grid(W, h * 2, g.ox * 2, g.oy * 2), oc = o.c;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = y * w + x, P = c[i];
      var A = y > 0 ? c[i - w] : null, D = y < h - 1 ? c[i + w] : null;
      var L = x > 0 ? c[i - 1] : null, Rr = x < w - 1 ? c[i + 1] : null;
      var e0 = P, e1 = P, e2 = P, e3 = P;
      if (A !== D && L !== Rr) {
        if (L === A) e0 = L;
        if (A === Rr) e1 = Rr;
        if (L === D) e2 = L;
        if (D === Rr) e3 = Rr;
      }
      var j = (2 * y) * W + 2 * x;
      oc[j] = e0; oc[j + 1] = e1; oc[j + W] = e2; oc[j + W + 1] = e3;
    }
    return o;
  }
  function bbox(g) {
    if (g._bb) return g._bb;
    var x0 = g.w, y0 = g.h, x1 = -1, y1 = -1;
    for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++) if (g.c[y * g.w + x]) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 < 0) { x0 = y0 = 0; x1 = y1 = -1; }
    g._bb = [x0 - g.ox, y0 - g.oy, x1 + 1 - g.ox, y1 + 1 - g.oy]; // ローカル座標 [x0,y0,x1,y1)
    return g._bb;
  }
  var xfCount = 0;
  function crop(g, bb) {
    var w = Math.max(1, bb[2] - bb[0]), h = Math.max(1, bb[3] - bb[1]);
    var c = new Grid(w, h, -bb[0], -bb[1]);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) c.c[y * w + x] = g.get(x + bb[0], y + bb[1]);
    return c;
  }
  function xform(g, rot, s, mirror, flip, offx, offy) {
    var key = rot + '|' + s + '|' + (mirror ? 1 : 0) + (flip ? 1 : 0) + '|' + offx + '|' + offy;
    if (!g._xf || g._xfN > 24) { g._xf = {}; g._xfN = 0; }
    if (g._xf[key]) return g._xf[key];
    var bb = bbox(g);
    var up = g._up || (g._up = scale2x(scale2x(crop(g, bb))));
    var cs = Math.cos(rot), sn = Math.sin(rot);
    // ソース bbox の四隅を画面座標へ
    var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    [[bb[0], bb[1]], [bb[2], bb[1]], [bb[0], bb[3]], [bb[2], bb[3]]].forEach(function (pt) {
      var ux = pt[0] - offx, uy = pt[1] - offy;
      if (mirror) ux = -ux; if (flip) uy = -uy;
      ux *= s; uy *= s;
      var X = cs * ux - sn * uy, Y = sn * ux + cs * uy;
      if (X < minx) minx = X; if (X > maxx) maxx = X; if (Y < miny) miny = Y; if (Y > maxy) maxy = Y;
    });
    var X0 = Math.floor(minx) - 1, Y0 = Math.floor(miny) - 1, X1 = Math.ceil(maxx) + 1, Y1 = Math.ceil(maxy) + 1;
    var out = new Grid(X1 - X0, Y1 - Y0, -X0, -Y0), oc = out.c, W = out.w;
    var uw = up.w, uh = up.h, uox = up.ox, uoy = up.oy, uc = up.c, k4 = 4 / s;
    for (var oy = Y0; oy < Y1; oy++) {
      var py = oy + 0.5;
      for (var ox = X0; ox < X1; ox++) {
        var px = ox + 0.5;
        var ux2 = (cs * px + sn * py) * k4, uy2 = (-sn * px + cs * py) * k4;
        var sx = Math.floor(offx * 4 + (mirror ? -ux2 : ux2)) + uox;
        var sy = Math.floor(offy * 4 + (flip ? -uy2 : uy2)) + uoy;
        if (sx < 0 || sy < 0 || sx >= uw || sy >= uh) continue;
        var c = uc[sy * uw + sx];
        if (c) oc[(oy - Y0) * W + (ox - X0)] = c;
      }
    }
    g._xf[key] = out; g._xfN++;
    xfCount++;
    return out;
  }


  // ================= v23：ユーザーが描いた「最終の見た目」の画像（assets/*.png を build2.js が埋め込む） =================
  // face：画像の顔の向き（1=右 / -1=左）。ax,ay：(x,y) に合わせる点（0..1）。recolor：金魚の色ちがいを作るか
  var ASSET_INFO = {
    // v23 P5c：変身のコマ表（8コマ。1コマ目＝ふつうの金魚、ax/ay＝1コマ目の体の中心）。end：ふだんは最後のコマを描く
    giant: { face: -1, ax: 0.593, ay: 0.578, recolor: 1, frames: 6, end: 1 },
    overeat: { face: -1, ax: 0.577, ay: 0.506, recolor: 1, frames: 6, end: 1 },
    fishman: { face: -1, ax: 0.581, ay: 0.533, recolor: 1, frames: 6, end: 1 },
    split: { face: -1, ax: 0.556, ay: 0.475, recolor: 1, frames: 6, end: 1 },
    dragon: { face: -1, ax: 0.555, ay: 0.541, recolor: 1, frames: 6, end: 1 },
    possessed_ghost: { face: -1, ax: 0.571, ay: 0.565, recolor: 1, frames: 6, end: 1 },
    skeleton: { face: -1, ax: 0.5, ay: 0.5 }, loach_fish: { face: -1, ax: 0.5, ay: 0.5 },
    catfish: { face: -1, ax: 0.514, ay: 0.622, frames: 8 }, turtle: { face: -1, ax: 0.539, ay: 0.524, frames: 4 },
    catpaw: { face: 1, ax: 0.5, ay: 0.8 }, cat: { face: 1, ax: 0.5, ay: 1 },
    // v23.2：磨きすぎ・石化・大往生・寿司・ハト（6コマ）とカモメ（羽ばたき4コマ）
    overpolished: { face: -1, ax: 0.572, ay: 0.559, recolor: 1, frames: 6, end: 1 },
    stone: { face: -1, ax: 0.55, ay: 0.52, recolor: 1, frames: 6, end: 1 },
    oldage: { face: -1, ax: 0.512, ay: 0.476, recolor: 1, frames: 6, end: 1 },
    sushi: { face: 1, ax: 0.504, ay: 0.634, recolor: 1, frames: 6, end: 1 },
    pigeon: { face: -1, ax: 0.583, ay: 0.629, recolor: 1, frames: 6, end: 1 },
    gull: { face: -1, ax: 0.487, ay: 0.492, frames: 4 },
    tanishi_sheet: { face: 1, ax: 0.5, ay: 1, frames: 8 }
  };
  // 絵の大きさ（1コマ）と基準点
  function assetBox(name) {
    var c = assetCanvas(name); if (!c) return null;
    var inf = ASSET_INFO[name] || {}, n = inf.frames || 1;
    return { w: c.width / n, h: c.height, ax: inf.ax == null ? 0.5 : inf.ax, ay: inf.ay == null ? 0.5 : inf.ay, n: n };
  }
  var ASSETS = Object.create(null);
  var ASSET_SRC = (typeof GF_ASSETS !== 'undefined' && GF_ASSETS) || (typeof window !== 'undefined' && window.GF_ASSETS) || {};
  function hexRgb(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function rgbHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, sat = 0, d = mx - mn;
    if (d) { sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
    return [h, sat, l];
  }
  function hslRgb(h, sat, l) {
    if (!sat) return [l * 255, l * 255, l * 255];
    var q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat, p = 2 * l - q;
    var f = function (t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  var ASSET_COLOR = { orange: null, lime: '#7ccc2c', pink: '#ff86a8', yellow: '#ffc81e', sky: '#4cb8f4', purple: '#ac80ec', gold: '#f6c42a' };
  function assetRecolor(src, color) {
    var hex = ASSET_COLOR[color]; if (!hex) return src;
    var c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    var x2 = c.getContext('2d'); x2.drawImage(src, 0, 0);
    var im = x2.getImageData(0, 0, c.width, c.height), d = im.data;
    var T = hexRgb(hex), th = rgbHsl(T[0], T[1], T[2]);
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      var hsl = rgbHsl(d[i], d[i + 1], d[i + 2]), hdeg = hsl[0] * 360;
      // オレンジ系（体・ヒレ）だけ置きかえ。唇の赤・クリーム色のお腹・輪郭・白目はそのまま
      if (hdeg < 14 || hdeg > 48 || hsl[1] < 0.45 || hsl[2] < 0.22 || hsl[2] > 0.8) continue;
      var nl = Math.max(0.12, Math.min(0.9, th[2] + (hsl[2] - 0.5) * 0.9));
      var o = hslRgb(th[0], Math.min(1, th[1] * 0.95 + 0.05), nl);
      d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2];
    }
    x2.putImageData(im, 0, 0); return c;
  }
  (function loadAssets() {
    if (typeof Image === 'undefined' || typeof document === 'undefined') return;
    Object.keys(ASSET_SRC).forEach(function (k) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        ASSETS[k] = { c: c, v: { orange: c } };
      };
      img.src = ASSET_SRC[k];
    });
  })();
  function assetCanvas(name, color) {
    var a = ASSETS[name]; if (!a) return null;
    var inf = ASSET_INFO[name] || {}; color = inf.recolor ? (color || 'orange') : 'orange';
    if (!a.v[color]) { try { a.v[color] = assetRecolor(a.c, color); } catch (e) { a.v[color] = a.c; } }
    return a.v[color];
  }
  function hasAsset(name) { return !!ASSETS[name]; }
  // o: { color, dir(1/-1), scale, sx, sy, rot, frame, alpha }
  function drawAsset(ctx, name, x, y, o) {
    o = o || {}; var c = assetCanvas(name, o.color); if (!c) return false;
    var inf = ASSET_INFO[name] || {}, n = inf.frames || 1, fw = c.width / n, fh = c.height;
    var fr = n > 1 ? (o.frame == null && inf.end ? n - 1 : Math.min(n - 1, Math.max(0, o.frame | 0))) : 0;
    if (n > 1 && !inf.end && o.frame != null) fr = ((o.frame | 0) % n + n) % n;
    var sc = o.scale || 1, flip = (o.dir || inf.face || 1) !== (inf.face || 1);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.translate(R(x), R(y));
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale((flip ? -1 : 1) * sc * (o.sx || 1), sc * (o.sy || 1));
    var ax = o.ax != null ? o.ax : inf.ax == null ? 0.5 : inf.ax, ay = o.ay != null ? o.ay : inf.ay == null ? 0.5 : inf.ay;
    ctx.translate(-R(fw * ax), -R(fh * ay));   // 左右反転は上の scale(-1) で (x,y) を軸にかかる
    ctx.drawImage(c, fr * fw, 0, fw, fh, 0, 0, fw, fh);
    ctx.restore();
    return true;
  }

  function blit(ctx, g, cx, cy, o) {
    o = o || {};
    var s0 = o.scale || 1, rot0 = o.rot || 0;
    if (s0 < 1 && !rot0) {
      var sc = Math.round(s0 * 20) / 20;
      return blit(ctx, minify(g, sc), cx, cy, { mirror: o.mirror, flip: o.flip, offx: R((o.offx || 0) * sc), offy: R((o.offy || 0) * sc) });
    }
    var mirror = !!o.mirror, flip = !!o.flip;
    var offx = o.offx || 0, offy = o.offy || 0;
    cx = R(cx); cy = R(cy);
    if (rot0 || s0 !== 1) {
      // 回転は 1/256 周、倍率は 0.05 刻みに量子化してキャッシュ
      var TAU = Math.PI * 2;
      var rq = Math.round((((rot0 % TAU) + TAU) % TAU) / TAU * 256) % 256;
      var sq = Math.max(0.05, Math.round(s0 * 20) / 20);
      if (rq === 0 && sq === 1) return blit(ctx, g, cx, cy, { mirror: mirror, flip: flip, offx: offx, offy: offy });
      g = xform(g, rq / 256 * TAU, sq, mirror, flip, offx, offy);
      mirror = flip = false; offx = offy = 0;
    }
    for (var y = 0; y < g.h; y++) {
      var ly = y - g.oy, sy = flip ? -ly - 1 + 2 * offy : ly;
      var run = null, rs = 0, row = y * g.w;
      for (var x = 0; x <= g.w; x++) {
        var col = x < g.w ? g.c[row + x] : null;
        if (col !== run) {
          if (run) {
            var lx0 = rs - g.ox, lx1 = x - 1 - g.ox;
            var a = mirror ? -lx1 - 1 + 2 * offx : lx0;
            rect(ctx, cx + a - offx, cy + sy - offy, x - rs, 1, run);
          }
          run = col; rs = x;
        }
      }
    }
  }

  // ---------- 金魚 ----------
  // v23：丸い胴・クリーム色の腹・扇形の尾。設計座標は右向きで、(0,0) は体の中心付近。
  // stage 1〜3 は小・中・大の既存 API。
  //  cx,rx,ry: 胴（ほぼ円） / tb: 尾の付け根 x / hp: 付け根の半高 / tl: 尾の長さ / th: 尾の高さの比率 / er: 目の半径 / vc: 見た目の中心 x / ft: 足びれの長さ
  var STAGES = {
    1: { cx: 1, rx: 13, ry: 12, tb: -10.5, hp: 4, tl: 10, th: 0.68, er: 3.6, vc: -3, ft: 4 },
    2: { cx: 2, rx: 15.5, ry: 13.8, tb: -12, hp: 4.5, tl: 12.5, th: 0.83, er: 4.1, vc: -3, ft: 4.5 },
    3: { cx: 3, rx: 17, ry: 14.4, tb: -12.5, hp: 4.8, tl: 14, th: 1.02, er: 4.3, vc: -3, ft: 5 }
  };
  // 金魚本体の通常色。小物や他の生き物が使う PAL は共用しない。
  var FISH_PALETTES = {};
  var FISH_COLORS = {
    normal: ['#ff890a', '#e06a00'],
    lime: ['#bdf51c', '#89c017'],
    pink: ['#ff82ac', '#dc5987'],
    yellow: ['#ffda29', '#e5a719'],
    sky: ['#60ddf3', '#32afce'],
    purple: ['#df9bf4', '#b471ce']
  };
  Object.keys(FISH_COLORS).forEach(function (name) {
    var colors = FISH_COLORS[name];
    FISH_PALETTES[name] = merge(PAL[name], { B: colors[0], D: colors[1], F: colors[0], P: '#ffd2a8', VF: '#ff890a' });
  });
  var fishCache = {}, fishCacheN = 0;
  var BLUSH = '#ff7a8a', BLUSH_S = '#ffa890', TONGUE = '#ff6a7a', MOUTH_IN = '#5a1a12', LIP = '#ff4a14', TOOTH = '#ffffff';
  var LIP_L = '#ff8a5a', SLIT = '#6e6262';
  var TEAR = '#8ad8ff', TEAR_D = '#3a9ad8', HEART = '#ff3a6a', HEART_L = '#ffa0b8', SPARK_P = '#203070';
  function stageOf(o) { var s = Math.round(+o.stage || 2); return s < 1 ? 1 : s > 3 ? 3 : s; }
  function palOf(o) {
    if (o._pal) return o._pal; // 死に際のコマの途中色
    if (o.palette && PAL[o.palette]) return FISH_PALETTES[o.palette] || PAL[o.palette];
    if (o.ghost) return PAL.ghost;
    if (o.burnt) return PAL.burnt;
    if (o.stone) return PAL.stone;
    if (o.frozen) return PAL.frozen;
    if (o.white) return PAL.white;
    var c = colorOf(o);
    if (o.wrinkles) return PAL[OLDPAL[c]];
    if (o.zen) return zenPal(c);
    return FISH_PALETTES[c === 'orange' ? 'normal' : c];
  }

  // 胴体の内外判定（半ピクセル中心）。ほぼ円（超楕円）、下側がほんの少しふっくら
  function bodyIn(x, y, S, o) {
    var px = x + 0.5, py = y + 0.5;
    if (o.puff) { var qx = px - (S.cx - 1); return qx * qx + py * py <= 15.2 * 15.2; }
    var t = (px - S.cx) / S.rx;
    if (t >= -1 && t <= 1) {
      var ryy = py > 0 ? S.ry * 1.03 : S.ry;
      if (S.gaunt && py > 0) ryy = S.ry * (1 - 0.45 * Math.max(0, 1 - Math.abs(t + 0.1) * 1.5));
      var v = py / ryy;
      if (Math.pow(Math.abs(t), 2.05) + Math.pow(Math.abs(v), 2.05) <= 1) return true;
    }
    if (o.belly) { var bx = (px - S.cx + 1) / (S.rx * 1.02), by = (py - S.ry * 0.7) / (S.ry * 1.45); if (bx * bx + by * by <= 1) return true; }
    return false;
  }
  // stamp の外側 1px と合わせて胴の輪郭を 2px にする。影は尾側にだけ入れる。
  function fishBodyColor(inBody, x, y, p, thick, belly, tailSide) {
    var edge = !inBody(x - 1, y) || !inBody(x + 1, y) || !inBody(x, y - 1) || !inBody(x, y + 1);
    if (thick && edge) return p.K;
    if (belly) return p.P;
    if (tailSide && (thick ? !inBody(x - 2, y) : edge)) return p.D;
    return p.B;
  }
  // お腹（クリーム色）の境目 y（x ごと。まん中ほど低い）
  function bellyY(x, S, o) {
    var R0 = o.puff ? 15 : S.rx, H0 = o.puff ? 15 : S.ry;
    var tt = (x + 0.5 - S.cx) / R0;
    return H0 * (0.26 + 0.23 * (1 - tt * tt));
  }

  // 目の中心：ex1=前の目（頭の輪郭から前上へ飛び出す） ex2=うしろの目（頭のまん中あたり・少し低い）
  function eyeCenters(S, o) {
    var r = S.er, front = o.puff ? S.cx + 14 : S.cx + S.rx;
    var ex1 = R(front - r - 0.4);
    var ex2 = ex1 - R(2 * r + 0.22 * (o.puff ? 14 : S.rx));
    var ey = R(o.puff ? -6 : -S.ry * 0.39);
    return { ex1: ex1, ex2: ex2, ey: ey, ey2: ey + R(S.ry * 0.17), r: r, front: R(front) };
  }
  // くちびるの中心（横顔）
  function lipsAt(S, o) {
    if (o.puff) return { x: S.cx + 8, y: 4 };
    return { x: R(S.cx + S.rx * 0.38), y: R(S.ry * 0.26) + 1 };
  }

  // ---- 口＝大きな赤いくちびる（横顔・正面とも中心 (mx,my) に置く。ax は横顔で前へずらす量） ----
  // K=輪郭 p=くちびる l=くちびるのつや g=口のすき間（灰） d=口の中 r=舌 w=歯 .=透明（体が見える）
  var MOUTHS = {
    '0': { a: ['..KKKKKKK..', '.KpplppppK.', 'KppKKKKKppK', 'KppKgggKppK', 'KppKKKKKppK', '.KpppppppK.', '..KKKKKKK..'] },
    '1': { a: ['..KKKKKKK..', '.KpplppppK.', 'KppKKKKKppK', 'KpKdddddKpK', 'KpKddrddKpK', 'KppKKKKKppK', '.KpppppppK.', '..KKKKKKK..'] },
    o: { a: ['..KKKKKKK..', '.KpplppppK.', 'KppKKKKKppK', 'KpKdddddKpK', 'KpKdddddKpK', 'KpKddrddKpK', 'KppKKKKKppK', '.KpppppppK.', '..KKKKKKK..'] },
    yawn: { a: ['..KKKKKKK..', '.KpplppppK.', 'KppKKKKKppK', 'KpKdddddKpK', 'KpKdddddKpK', 'KpKdddddKpK', 'KpKdddddKpK', 'KpKdrrrdKpK', 'KppKKKKKppK', '.KpppppppK.', '..KKKKKKK..'], dy: -1 },
    grin: { a: ['.KKKKKKKKK.', 'KpplppppppK', 'KpKKKKKKKpK', 'KpKwwwwwKpK', 'KpKdddddKpK', '.KpKdrdKpK.', '..KpKKKpK..', '...KKKKK...'] },
    pout: { a: ['..KKKKK..', '.KpplppK.', 'KppKKKppK', 'KpKgggKpK', 'KppKKKppK', '.KpppppK.', '..KKKKK..'], ax: 2 },
    smile: { a: ['..KKKKKKK..', '.KpplppppK.', 'KpKpppppKpK', 'KppKKKKKppK', '.KpppppppK.', '..KKKKKKK..'] },
    wavy: { a: ['..KKKKKKK..', '.KpplppppK.', 'KpKppKppKpK', 'KppKKpKKppK', '.KpppppppK.', '..KKKKKKK..'] },
    tongue: { a: ['.KKKKKKKKK.', 'KpplppppppK', 'KpKKKKKKKpK', 'KpKdrrrdKpK', 'KppKrrrKppK', '.KKKrrrKKK.', '...KrrrK...', '....KKK....'], dy: 1 },
    frown: { a: ['...KKKKK...', '..KpplppK..', '.KppKKKppK.', 'KppK...KppK', 'KpK.....KpK', '.K.......K.'] },
    c0: { a: ['.KKKKKKK.', 'KpplppppK', 'KpKKKKKpK', 'KpppppppK', '.KKKKKKK.'] },
    c1: { a: ['.KKKKKKK.', 'KpplppppK', 'KpKKKKKpK', 'KpKdddKpK', 'KppKKKppK', '.KKKKKKK.'] },
    c2: { a: ['.KKKKKKK.', 'KpKKKKKpK', 'KKdddddKK', 'KKddrddKK', 'KpKKKKKpK', '.KKKKKKK.'] },
    // ぱくっ（eatF 0）：前へ突き出した大きな O の口（吸いこむ）
    gulp: { a: ['..KKKKKKK..', '.KpppppppK.', 'KppKKKKKppK', 'KpKdddddKpK', 'KpKdddddKpK', 'KpKdddddKpK', 'KpKdddddKpK', 'KppKKKKKppK', '.KpppppppK.', '..KKKKKKK..'], ax: 2 }
  };
  function mouthOf(o) {
    if (o._mouth) return o._mouth;
    if (o.chew != null && o.chew !== false && isFinite(+o.chew)) {
      var cp = ((+o.chew % 1) + 1) % 1, op = 0.5 - 0.5 * Math.cos(cp * Math.PI * 2);
      return op < 0.3 ? 'c0' : op < 0.75 ? 'c1' : 'c2';
    }
    var m = o.mouth;
    if (typeof m === 'string' && MOUTHS[m] && m !== 'c0' && m !== 'c1' && m !== 'c2') return m;
    if (m && m !== '0') return '1';
    if (o.eyes === 'happy' && !o.wrinkles) return 'grin';
    if (o.eyes === 'annoyed' && !o.wrinkles) return 'frown';
    return '0';
  }
  function cheekBob(o) {
    if (o._bob != null) return o._bob;
    if (!o.cheeks || o.chew == null || !isFinite(+o.chew)) return 0;
    return R(Math.sin(((+o.chew % 1) + 1) % 1 * Math.PI * 2) * 1);
  }
  function putMouth(g, key, mcx, mcy, front, p, K, fishFace) {
    var M = MOUTHS[key] || MOUTHS['0'];
    var rows = M.a, w = rows[0].length, h = rows.length;
    var lg = { K: K, d: MOUTH_IN, r: p === PAL.poison ? '#7cf04a' : (p.M ? p.D : TONGUE), w: TOOTH, p: p.M || (fishFace ? '#e8452c' : LIP), l: p.ML || (fishFace ? '#f36444' : LIP_L), g: p.MS || (fishFace ? '#45251b' : SLIT) };
    var x0 = mcx - (w >> 1) + (front ? 0 : (M.ax || 0)), y0 = mcy - (h >> 1) + (M.dy || 0);
    stampArt(g, rows, x0, y0, lg);
  }
 
  // 外周の輪郭を1ドット太らせる（4近傍）。カートゥーンの太い線
  function thicken(g, K) {
    var c = g.c, c0 = c.slice(), W = g.w, H = g.h;
    for (var i = 0; i < c0.length; i++) {
      if (c0[i]) continue;
      var x = i % W;
      if ((x > 0 && c0[i - 1] === K) || (x < W - 1 && c0[i + 1] === K) || (i >= W && c0[i - W] === K) || (i + W < c0.length && c0[i + W] === K)) c[i] = K;
    }
  }

  // ふくらんだほっぺ（外側は輪郭、体の中に入る所は柔らかい影）
  function puffCheek(g, cx0, cy0, r, p, K) {
    var before = {};
    var box = [cx0 - r - 2, cy0 - r - 2, cx0 + r + 2, cy0 + r + 2];
    for (var y = Math.floor(box[1]); y <= box[3]; y++) for (var x = Math.floor(box[0]); x <= box[2]; x++) before[x + ',' + y] = g.get(x, y);
    g.stamp(function (x, y) {
      var dx = x + 0.5 - cx0, dy = y + 0.5 - cy0, d2 = dx * dx + dy * dy;
      if (d2 > r * r) return null;
      if (dy > -1 && dy < 1.5 && dx > -2 && dx < 1.5) return BLUSH;
      if (dx < -r * 0.3 && dy < -r * 0.3 && d2 > r * r * 0.35) return p.L;
      return p.B;
    }, K, box);
    for (var k in before) {
      var b = before[k]; if (!b || b === K) continue;
      var xy = k.split(','), gx = +xy[0], gy = +xy[1];
      if (g.get(gx, gy) === K) g.set(gx, gy, p.D);
    }
  }

  // 眉（up は目の上に浮かせ、ほかは白目の上端にかぶせる）
  function drawBrows(g, type, E, K, front) {
    if (!type || type === 'none') return;
    var rt = Math.ceil(E.r);
    var ey2 = E.ey2 == null ? E.ey : E.ey2;
    [[E.ex2, 1, ey2], [E.ex1, -1, E.ey]].forEach(function (ee) {
      var ex = ee[0], inward = ee[1], E = { ey: ee[2] }; // 内側（もう一方の目）の向き
      for (var dx = -3; dx <= 2; dx++) {
        var din = (inward > 0 ? dx + 3 : 2 - dx); // 0=外側の端 … 5=内側の端
        var y0, thick = 2;
        if (type === 'up') { y0 = E.ey - rt - 4 + ((din === 0 || din === 5) ? 1 : 0); thick = 1; }
        else if (type === 'down') y0 = E.ey - rt + 1;
        else if (type === 'worried') y0 = E.ey - rt + 2 - R(din * 0.5);
        else if (type === 'angry') y0 = E.ey - rt + R(din * 0.6);
        else if (type === 'he') { y0 = E.ey - rt + [2, 1, 0, 0, 1, 2][din]; thick = 1; }
        else y0 = E.ey - rt;
        for (var k = 0; k < thick; k++) g.set(ex + dx, y0 + k, K);
      }
    });
  }

  // 頭上・まわりの記号（opts.mark / opts.bubble）
  var MARK_ALIAS = { '♪': 'note', '💢': 'anger', '♥': 'heart', '❤': 'heart', 'z': 'zzz', 'Z': 'zzz', 'zz': 'zzz' };
  var MARKS = {};
  function markArt(name) {
    if (MARKS[name]) return MARKS[name];
    var Y = '#ffe14a', Wt = '#ffffff', Rd = '#ff3a3a', Rk = '#a01a2a';
    var a = null;
    if (name === '!') a = art(['KKK', 'KYK', 'KYK', 'KYK', 'KYK', 'KKK', '...', 'KKK', 'KYK', 'KKK'], { K: O, Y: Y });
    else if (name === '?') a = art(['.KKKKK.', 'KWWWWWK', 'KWKKKWK', 'KKK.KWK', '...KWWK', '..KWWK.', '..KWK..', '..KKK..', '..KWK..', '..KKK..'], { K: O, W: Wt });
    else if (name === 'note') a = art(['...KKKK', '...KWWK', '...KKKK', '...K..K', '.KKK..K', 'KKKK.KK', '.KK.KKK', '.....K.'], { K: O, W: '#bff4ff' });
    else if (name === 'anger') a = art(['.KK.KK.', 'KRK.KRK', 'KRRKRRK', '.......', 'KRRKRRK', 'KRK.KRK', '.KK.KK.'], { K: Rk, R: Rd });
    else if (name === 'heart') a = art(['.KK.KK.', 'KRRKRRK', 'KRWRRRK', 'KRRRRRK', '.KRRRK.', '..KRK..', '...K...'], { K: Rk, R: '#ff4a7a', W: Wt });
    else if (name === 'sweat') a = art(['..K..', '.KBK.', 'KBWBK', 'KBBBK', 'KBBBK', '.KKK.'], { K: TEAR_D, B: TEAR, W: Wt });
    else if (name === 'z1') a = art(['KKKK', '..K.', '.K..', 'KKKK'], { K: O });
    else if (name === 'z2') a = art(['KKKKK', '...K.', '..K..', '.K...', 'KKKKK'], { K: O });
    return (MARKS[name] = a);
  }
  function drawMark(ctx, x, y, name, t, sc) {
    name = MARK_ALIAS[name] || name;
    if (name === true) name = '!';
    var s = sc > 1.4 ? 2 : 1, bob = R(Math.sin(t * 5) * 1);
    if (name === 'zzz') {
      for (var i = 0; i < 3; i++) {
        var ph = ((t * 0.7 + i / 3) % 1);
        var zx = x + R((i * 4 + ph * 4) * s), zy = y - R((ph * 10 + i * 2) * s);
        var z = markArt(ph > 0.45 ? 'z2' : 'z1');
        blit(ctx, z, zx, zy, s > 1 ? { scale: s } : null);
      }
      return;
    }
    var a = markArt(name);
    if (!a) return;
    if (name === 'anger') { var big = (Math.floor(t * 6) & 1); blit(ctx, a, x, y, (s > 1 || big) ? { scale: s + (big ? 0.25 : 0) } : null); return; }
    if (name === 'sweat') { blit(ctx, a, x, y + R(((t * 4) % 1) * 3), s > 1 ? { scale: s } : null); return; }
    blit(ctx, a, x, y + bob, s > 1 ? { scale: s } : null);
  }

  // ---- 体の上の飾り（横顔・正面で共通。A は位置の手がかり） ----
  //  A: { cx, top, bot, front, back, E, fxm, my, isFront, S, ry, tb }
  function decorate(g, o, p, A, frame, ph) {
    var K = p.K, E = A.E, cx = A.cx, ry = A.ry;
    var happy = o.eyes === 'happy';

    // --- 毒：緑の斑点とよだれ ---
    if (p === PAL.poison) {
      for (var py2 = -20; py2 < 26; py2++) for (var px2 = -40; px2 < 26; px2++) {
        var pc = g.get(px2, py2);
        if ((pc === p.B || pc === p.D || pc === p.L) && hash(px2 >> 1, (py2 >> 1) + 50) > 0.93) g.set(px2, py2, hash(px2, py2) > 0.5 ? '#7cf04a' : '#4ab02a');
      }
      var dx0 = A.isFront ? 1 : A.fxm - 2;
      g.set(dx0, A.my + 3, '#7cf04a'); g.set(dx0, A.my + 4, '#7cf04a'); g.set(dx0, A.my + 5, '#4ab02a'); g.set(dx0 - 1, A.my + 6, '#7cf04a');
    }

    // --- 老い：白い眉・しわ・長い白ひげ ---
    if (o.wrinkles) {
      var wc = p.D, bw = '#ffffff', bg2 = '#e2ddd6';
      var byb = E.ey - Math.ceil(E.r) - 1;
      // 老眼鏡（丸い金縁。横顔は奥の玉が手前の玉に隠れる）
      var GF = '#b8862a', glr = E.r + 1.3;
      [[E.ex1, 0], [E.ex2, 1]].forEach(function (eq) {
        for (var a = 0; a < 72; a++) {
          var an = a / 72 * Math.PI * 2, gx = Math.floor(eq[0] + Math.cos(an) * glr), gy = Math.floor(E.ey + Math.sin(an) * glr);
          if (eq[1] && !A.isFront) { var qx = gx + 0.5 - E.ex1, qy = gy + 0.5 - E.ey; if (qx * qx + qy * qy < (glr + 0.5) * (glr + 0.5)) continue; }
          g.set(gx, gy, GF);
        }
      });
      g.set(E.ex1 - 2, E.ey - 2, '#ffffff'); g.set(E.ex1 - 1, E.ey - 3, '#ffffff');
      if (A.isFront) g.line([[E.ex2 + R(glr), E.ey - 1], [0, E.ey - 2], [E.ex1 - R(glr), E.ey - 1]], GF);
      else g.line([[E.ex2 - R(glr), E.ey - 1], [E.ex2 - R(glr) - 1, E.ey - 1], [E.ex2 - R(glr) - 2, E.ey], [E.ex2 - R(glr) - 3, E.ey], [E.ex2 - R(glr) - 4, E.ey + 1]], GF);
      g.stamp(function (x, y) {
        for (var q = 0; q < 2; q++) {
          var ex = q ? E.ex1 : E.ex2, dx = x - ex;
          if (y === byb - 2 && dx >= -2 && dx <= 1) return bw;
          if (y === byb - 1 && dx >= -4 && dx <= 3) return (dx & 1) ? bg2 : bw;
          if (y === byb && (dx <= -3 && dx >= -5 || dx >= 2 && dx <= 4)) return bw;
          if (y === byb + 1 && (dx === -5 || dx === 4)) return bw;
          if (y === byb + 2 && (dx === -5 && q === 0)) return bw;
        }
        return null;
      }, K, [E.ex2 - 7, byb - 4, E.ex1 + 6, byb + 4]);
      if (!A.isFront) {
        g.line([[cx - 4, -2], [cx - 3, -1], [cx - 3, 0]], wc);
        g.line([[cx - 7, 1], [cx - 6, 2]], wc);
        g.line([[A.tb + 1, -1], [A.tb + 2, 0], [A.tb + 2, 1]], wc);
      }
      g.line([[E.ex1 - 1, E.ey + R(E.r) + 2], [E.ex1, E.ey + R(E.r) + 2], [E.ex1 + 1, E.ey + R(E.r) + 1]], wc);
      g.line([[E.ex2 - 1, E.ey + R(E.r) + 2], [E.ex2, E.ey + R(E.r) + 2], [E.ex2 + 1, E.ey + R(E.r) + 1]], wc);
      var bsw = Math.sin(ph) * 1.2, my = A.my, fxm = A.isFront ? 3 : A.fxm;
      g.stamp(function (x, y) {
        var dy = y - (my + 2);
        if (dy < 0 || dy > 13) return null;
        var c0 = fxm - 3.5 - (A.isFront ? 0 : dy * 0.18) + (dy > 5 ? bsw * (dy - 5) / 8 : 0);
        var hw = dy < 3 ? 3.4 : 3.4 * Math.pow((14 - dy) / 11, 0.7);
        if ((dy % 4 === 3) && dy < 12) hw -= 0.7;
        var ux = x + 0.5 - c0;
        if (Math.abs(ux) > hw) return null;
        return (((x + 60) % 2 === 0) && dy > 1 && Math.abs(ux) < hw - 1) ? bg2 : bw;
      }, '#7e8a8a', [fxm - 15, my + 1, fxm + 2, my + 16]);
      if (A.isFront) {
        g.line([[-5, my + 1], [-4, my + 2], [-3, my + 2], [-2, my + 1]], bw); g.line([[1, my + 1], [2, my + 2], [3, my + 2], [4, my + 1]], bw);
      } else {
        g.line([[fxm - 2, my], [fxm - 1, my + 1], [fxm, my + 1], [fxm + 1, my + 2], [fxm + 2, my + 2], [fxm + 3, my + 1]], bw);
        g.set(fxm + 3, my, bw);
      }
      // 杖（胸びれでつく）
      var CB = '#9a6a3a', CL = '#c8945a', ccx = A.isFront ? R(A.front) + 2 : cx + 1, cy0 = A.isFront ? A.my + 1 : R(ry * 0.5), cy1 = R(ry) + 10;
      g.stamp(function (x, y) {
        if (y >= cy0 && y <= cy1 && (x === ccx || x === ccx + 1)) return y === cy1 ? '#3a3a3a' : x === ccx ? CL : CB;
        var dx = x + 0.5 - (ccx + 3), dy = y + 0.5 - cy0, d2 = dx * dx + dy * dy;
        if (y <= cy0 && d2 >= 1.4 && d2 <= 8) return dy < -1.5 ? CL : CB;
        return null;
      }, K, [ccx - 2, cy0 - 5, ccx + 7, cy1 + 1]);
      g.stamp(function (x, y) { var dx = x + 0.5 - (ccx + 0.5), dy = y + 0.5 - (cy0 + 3); return dx * dx / 6 + dy * dy / 3 <= 1 ? (((x + y) % 3 === 0) ? p.L : p.F) : null; }, K, [ccx - 4, cy0, ccx + 4, cy0 + 6]);
    }

    // --- 苔（もこもこ） ---
    if (o.moss) {
      var MD = '#2a6a2a', MO = '#1a4a20';
      var cells = g.c.slice();
      for (var my2 = -g.oy; my2 < g.h - g.oy; my2++) for (var mx2 = -g.ox; mx2 < g.w - g.ox; mx2++) {
        var col = cells[(my2 + g.oy) * g.w + mx2 + g.ox];
        if (!col || col === p.W || col === PUPIL || col === MOUTH_IN || col === TONGUE) continue;
        if (col === K) { g.set(mx2, my2, MO); continue; }
        var n = hash(mx2 >> 1, my2 >> 1) * 0.6 + hash(mx2, my2) * 0.4;
        g.set(mx2, my2, n > 0.82 ? MD : n > 0.42 ? WEED : n > 0.2 ? WEED_L : '#a8d860');
      }
      var tufts = [];
      for (var ti = 0; ti < cells.length; ti++) {
        if (cells[ti] !== K) continue;
        var tx3 = (ti % g.w) - g.ox, ty3 = ((ti / g.w) | 0) - g.oy;
        if (hash(tx3 * 7, ty3 * 13) > 0.88) tufts.push([tx3, ty3]);
      }
      tufts.forEach(function (tp) {
        var dxe = tp[0] - E.ex1, dye = tp[1] - E.ey, dxe2 = tp[0] - E.ex2;
        if ((dxe * dxe + dye * dye < 40) || (dxe2 * dxe2 + dye * dye < 40)) return;
        var rr = 1.3 + hash(tp[0], tp[1]) * 1.2;
        g.stamp(function (x, y) {
          var dx = x + 0.5 - tp[0], dy = y + 0.5 - tp[1];
          if (dx * dx + dy * dy > rr * rr) return null;
          return dy < -0.5 ? WEED_L : WEED;
        }, MO, [tp[0] - 3, tp[1] - 3, tp[0] + 3, tp[1] + 3]);
      });
      [[cx - 8, R(ry * 0.8)], [cx - 2, R(ry) - 1], [cx + 5, R(ry * 0.85)], [A.tb - 3, 2]].forEach(function (s2, i) {
        for (var k = 1; k <= 3 + i; k++) g.set(s2[0] + ((k & 1) ? 0 : 1), s2[1] + k + 1, (k & 1) ? WEED : WEED_L);
      });
      drawEyesOnGrid(g, o, { B: '#a8d860', D: MD, L: '#d0f090', W: '#ffffff', K: MO }, E, A.isFront);
      // 苔に咲く花・きのこ
      for (var fy8 = -26; fy8 <= 26; fy8++) for (var fx8 = -46; fx8 <= 30; fx8++) {
        var fc8 = g.get(fx8, fy8);
        if ((fc8 === WEED || fc8 === WEED_L) && hash(fx8 * 11, fy8 * 17) > 0.975) g.set(fx8, fy8, hash(fx8, fy8 * 3) > 0.5 ? '#ffd84a' : '#ffffff');
      }
      (A.isFront ? [[-8, 0], [2, 1], [8, 0]] : [[cx - 9, 0], [cx - 2, 1], [A.tb, 0], [cx + 6, 0]]).forEach(function (fq, i) {
        var fx9 = fq[0], ty9 = -g.oy; while (ty9 < 24 && !g.get(fx9, ty9)) ty9++;
        if (ty9 >= 20) return;
        if (fq[1]) { // きのこ
          g.stamp(function (x, y) {
            var dx = x + 0.5 - (fx9 + 0.5), dy = y + 0.5 - (ty9 - 3);
            if (dy <= 0.5 && dx * dx / 12 + dy * dy / 5 <= 1) return ((x === fx9 - 1 && y === ty9 - 4) || (x === fx9 + 2 && y === ty9 - 3)) ? '#ffffff' : '#e84a3a';
            if (dy > 0.5 && dy < 3.5 && Math.abs(dx) < 1.2) return '#f4ecd8';
            return null;
          }, MO, [fx9 - 4, ty9 - 7, fx9 + 5, ty9 + 1]);
        } else { // 花
          var col9 = i === 0 ? '#ffffff' : i === 2 ? '#ff9ac8' : '#c8a0ff', fyy = ty9 - 3;
          g.set(fx9, fyy + 1, WEED); g.set(fx9, fyy + 2, WEED);
          [[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(function (d) { g.set(fx9 + d[0], fyy + d[1], col9); });
          [[0, -2], [-2, 0], [2, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (d) { if (!g.get(fx9 + d[0], fyy + d[1])) g.set(fx9 + d[0], fyy + d[1], MO); });
          g.set(fx9, fyy, '#ffd84a');
        }
      });
    }

    // --- 焦げ：こんがり焼けた体に斜めの焼き網あと＋ちりちりのひれ ---
    if (o.burnt) {
      var GR = '#6a2c10', GR2 = '#a0501c';
      for (var cy8 = -30; cy8 <= 30; cy8++) for (var cx8 = -46; cx8 <= 30; cx8++) {
        var cc8 = g.get(cx8, cy8); if (cc8 !== p.B && cc8 !== p.L && cc8 !== p.P && cc8 !== p.F) continue;
        var dg8 = ((cx8 + cy8 + 300) % 9);
        if (dg8 === 0 || dg8 === 1) g.set(cx8, cy8, cc8 === p.F ? GR2 : GR);
        else if (dg8 === 2 && hash(cx8, cy8) > 0.6) g.set(cx8, cy8, GR2);
        else if (hash(cx8 * 3, cy8 * 5) > 0.93) g.set(cx8, cy8, '#b86a28');
      }
      for (var by3 = -26; by3 <= 26; by3++) for (var bx3 = -44; bx3 <= 26; bx3++) {
        var bc = g.get(bx3, by3);
        if ((bc === p.F || bc === GR2) && hash(bx3 * 5, by3 * 3) > 0.86) g.set(bx3, by3, hash(bx3, by3) > 0.5 ? K : null);
      }
    }

    // --- 頭の花（flowerStage 0=芽 1=双葉 2=つぼみ 3=開花） ---
    if (o.flower) {
      var fsg = o.flowerStage == null ? 3 : Math.max(0, Math.min(3, Math.round(+o.flowerStage || 0)));
      var sw = R(Math.sin(ph) * 1);
      var stx = A.isFront ? 0 : E.ex2 + 2, st0 = Math.min(E.ey - Math.ceil(E.r) - 1, A.top + 1);
      var stemH = [3, 7, 11, 12][fsg];
      var hy = st0 - stemH;
      var STEM = '#2a8a2a', LEAF_O = '#1f6a2a';
      for (var k2 = st0; k2 >= hy; k2--) { var sx4 = stx + (k2 < hy + 4 ? sw : 0); g.set(sx4, k2, STEM); g.set(sx4 + 1, k2, LEAF_O); g.set(sx4 - 1, k2, LEAF_O); }
      g.set(stx - 2, st0 + 1, '#8a5a30'); g.set(stx + 2, st0 + 1, '#8a5a30'); g.set(stx - 1, st0 + 1, '#6a3a20'); g.set(stx + 1, st0 + 1, '#6a3a20');
      var lf = function (lx, ly, dir2, len) {
        g.stamp(function (x, y) {
          var dx = (x - lx) * dir2, dy = y - ly;
          if (dx < 0 || dx > len) return null;
          var hw = Math.sin(dx / len * Math.PI) * (len * 0.32);
          return Math.abs(dy + dx * 0.35 + 0.5) <= hw + 0.3 ? ((dy + dx * 0.35 < 0) ? WEED_L : WEED) : null;
        }, LEAF_O, [lx - len - 2, ly - len - 2, lx + len + 2, ly + 3]);
      };
      if (fsg === 0) { lf(stx, hy, 1, 3); lf(stx, hy, -1, 3); }
      else {
        lf(stx + 1, hy + R(stemH * 0.55), 1, fsg >= 2 ? 6 : 5);
        lf(stx - 1, hy + R(stemH * 0.35), -1, fsg >= 2 ? 5 : 4);
        if (fsg === 1) { lf(stx, hy, 1, 3); lf(stx, hy, -1, 3); }
      }
      var fx = stx + sw, fy = hy - (fsg === 3 ? 3 : 2);
      if (fsg === 2) {
        g.stamp(function (x, y) {
          var dx = x + 0.5 - (fx + 0.5), dy = y + 0.5 - fy;
          var w2 = dy < 0 ? 2.2 * (1 + dy / 4.5) : 2.2 * Math.sqrt(Math.max(0, 1 - dy * dy / 4));
          if (dy < -4.5 || dy > 2 || Math.abs(dx) > w2) return null;
          if (dy > 0.5) return WEED;
          return dx < 0 ? '#ffb0c8' : '#ff6a9a';
        }, '#a02a5a', [fx - 4, fy - 6, fx + 4, fy + 3]);
        g.set(fx, fy + 1, WEED_L);
      } else if (fsg === 3) {
        g.stamp(function (x, y) {
          var dx = x - fx, dy = y - fy, d2 = dx * dx + dy * dy;
          if (d2 <= 2) return '#ffd84a';
          if (d2 <= 22) {
            var a = Math.atan2(dy, dx), pet = Math.cos(a * 5 + 0.3);
            if (d2 <= 8 || pet > -0.35 + (d2 - 8) / 30) return pet > 0.55 && d2 > 6 ? '#ffd0e0' : '#ff7aa8';
          }
          return null;
        }, '#a02a5a', [fx - 6, fy - 6, fx + 6, fy + 6]);
        g.set(fx, fy, '#ffd84a'); g.set(fx - 1, fy, '#f0a020'); g.set(fx, fy + 1, '#f0a020'); g.set(fx - 1, fy - 1, '#fff6a0');
      }
    }

    // --- 感電スパーク（体の周りの稲妻） ---
    if (o.spark) {
      var sp = '#fff27a', sp2 = '#ffd000', T0 = A.top, B0 = A.bot, fl2 = frame & 1;
      var zig = function (pts) { g.line(pts, fl2 ? sp : sp2); pts.forEach(function (q) { g.set(q[0] + 1, q[1], fl2 ? sp2 : sp); }); };
      zig([[A.back - 3, T0 + 1], [A.back - 1, T0 - 1], [A.back, T0 + 1], [A.back + 2, T0 - 2], [A.back + 3, T0 - 4]]);
      zig([[A.front + 1, T0 + 2], [A.front + 3, T0], [A.front + 3, T0 + 2], [A.front + 5, T0 - 1], [A.front + 6, T0 - 3]]);
      zig([[cx - 6, B0 + 3], [cx - 4, B0 + 5], [cx - 3, B0 + 3], [cx - 1, B0 + 6], [cx, B0 + 8]]);
      zig([[cx + 1, T0 - 5], [cx + 2, T0 - 7], [cx + 3, T0 - 5], [cx + 4, T0 - 8], [cx + 5, T0 - 10]]);
    }

    // --- ぴかぴか（磨きすぎ：色が抜けて真っ白） ---
    if (o.shine) {
      var sh2 = p === PAL.gold ? '#ffffff' : '#bfeaff';
      g.line([[cx - 7, -1], [cx - 6, -2], [cx - 5, -3], [cx - 4, -4]], sh2);
      g.line([[cx - 5, 0], [cx - 4, -1]], sh2);
      for (var bsx = A.back + 2; bsx < cx + 6; bsx += 4) g.line([[bsx, 4], [bsx + 1, 3], [bsx + 2, 2]], p === PAL.gold ? '#fff27a' : '#d8e8f0');
      // 窓の映り込み（ぴかぴか）
      var wx9 = A.isFront ? -6 : cx - 9, wy9 = A.isFront ? 2 : -6;
      [[0, 0], [3, 0], [0, 3], [3, 3]].forEach(function (d) { g.set(wx9 + d[0], wy9 + d[1], '#ffffff'); g.set(wx9 + d[0] + 1, wy9 + d[1], '#ffffff'); g.set(wx9 + d[0], wy9 + d[1] + 1, '#ffffff'); g.set(wx9 + d[0] + 1, wy9 + d[1] + 1, p.L); });
    }

    // --- 風船（浮いたまま）：つやつや ---
    if (o.balloon) {
      var gx0 = A.isFront ? -2 : cx;
      g.line([[gx0 - 9, -9], [gx0 - 8, -10], [gx0 - 7, -11], [gx0 - 6, -11], [gx0 - 5, -12]], '#ffffff');
      g.line([[gx0 - 10, -7], [gx0 - 10, -6]], '#ffffff');
      g.set(gx0 - 3, -12, '#fff4e0');
    }
    // --- 河豚のトゲ ---
    if ((o.puff || o.balloon) && !o.balloon && !o.round) {
      for (var a2 = 0; a2 < 16; a2++) {
        var ang = a2 / 16 * Math.PI * 2 + 0.2;
        if (!A.isFront && Math.cos(ang) < -0.8) continue;
        var bx = Math.cos(ang), by = Math.sin(ang), c0x = A.isFront ? 0 : cx - 1;
        for (var rr = 17; rr <= 20; rr++) g.set(c0x + R(bx * rr), R(by * rr), K);
        g.set(c0x + R(bx * 17 - by), R(by * 17 + bx), K); g.set(c0x + R(bx * 17 + by), R(by * 17 - bx), K);
      }
    }

    // --- 純金：金属の照り返し帯 ---
    if (p === PAL.gold) {
      for (var gy5 = -30; gy5 <= 30; gy5++) for (var gx5 = -45; gx5 <= 30; gx5++) {
        var gc5 = g.get(gx5, gy5); if (gc5 !== p.B && gc5 !== p.F && gc5 !== p.P && gc5 !== p.D) continue;
        var dg = ((gx5 - gy5 - cx + 400) % 13);
        if (dg === 0) g.set(gx5, gy5, '#fffbe0'); else if (dg === 1 || dg === 6) g.set(gx5, gy5, p.L);
        else if (dg === 9 && gc5 === p.B) g.set(gx5, gy5, '#e0a820');
      }
    }
    // --- 冷凍：体に霜 ---
    if (o.frozen) {
      for (var fy7 = -26; fy7 <= 26; fy7++) for (var fx7 = -46; fx7 <= 30; fx7++) {
        var fc7 = g.get(fx7, fy7);
        if ((fc7 === p.B || fc7 === p.L || fc7 === p.D || fc7 === p.F) && hash(fx7 * 7, fy7 * 3) > 0.88) g.set(fx7, fy7, '#ffffff');
      }
    }
    // --- 食べすぎ：口のまわりの食べかす ---
    if (o.belly && !A.isFront) { g.set(A.fxm + 2, A.my + 3, '#c8903c'); g.set(A.fxm + 1, A.my + 5, '#9a6a2a'); g.set(A.fxm + 3, A.my + 6, '#c8903c'); g.set(A.fxm - 1, A.my + 3, '#c8903c'); }

    if (o.frozen) addIce(g);
    if (o.xray && (o.xray !== 'blink' || ((frame >> 1) & 1) === 0)) xrayGrid(g, o, A.S, A.isFront ? A : null);
    if (o.glitch) glitchGrid(g, frame);
  }

  // 顔（目・眉・ほっぺ・口）を描く。横顔/正面/斜めで共通。A.mx,A.my=くちびるの中心
  function drawFace(g, o, p, A) {
    var K = p.K, E = A.E;
    var cheeks = !!(o.cheeks || o._cheeks) && !o.stone;
    var bob = cheekBob(o);
    var mk = mouthOf(o);
    var cr = Math.max(3, E.r * 0.95);
    if (cheeks) { // ふくらんだほっぺ（くちびるの両わき。前のほっぺは輪郭からはみ出す）
      if (A.q) { puffCheek(g, A.mx + 5, A.my + 1 + bob, cr * 0.9, p, K); puffCheek(g, A.mx - 6, A.my + 1 + bob, cr, p, K); }
      else if (A.isFront) { puffCheek(g, -A.cw, A.my + bob, cr, p, K); puffCheek(g, A.cw, A.my + bob, cr, p, K); }
      else { puffCheek(g, A.fxm, A.my + 1 + bob, cr, p, K); puffCheek(g, A.mx - 7, A.my + 1 + bob, cr, p, K); }
    }
    // 目
    drawEyesOnGrid(g, o, p, E, A.isFront);
    // ほっぺの赤み（blush / happy / love / split のときだけ）
    var strong = (o.blush || o.eyes === 'happy' || o.split || o.eyes === 'love') && !o.stone && !o.burnt && !o.frozen;
    if (!cheeks && strong) {
      var e2y = E.ey2 == null ? E.ey : E.ey2;
      var spots = A.isFront ? [[E.ex2 - 2, E.ey + Math.ceil(E.r) + 2], [E.ex1 - 1, E.ey + Math.ceil(E.r) + 2]] : A.q ? [[E.ex2 - 2, e2y + Math.ceil(E.r) + 2]] : [[E.ex2 - 1, e2y + Math.ceil(E.r) + 2]];
      spots.forEach(function (s) {
        for (var dx = -1; dx <= 2; dx++) { if (g.get(s[0] + dx, s[1]) !== K) g.set(s[0] + dx, s[1], BLUSH); if (dx >= 0 && dx <= 1 && g.get(s[0] + dx, s[1] + 1) !== K) g.set(s[0] + dx, s[1] + 1, BLUSH); }
        if (o.blush) { g.set(s[0] - 1, s[1] + 1, '#e04a6a'); g.set(s[0] + 1, s[1], '#e04a6a'); g.set(s[0] + 3, s[1] - 1, '#e04a6a'); }
      });
    }
    // 口（くちびる）
    putMouth(g, mk, A.mx, A.my, A.isFront && !A.q, p, K, true);
  }

  // ---- 部品：尾（二股・すじ入り）。付け根 (tb,0) から左へ。L=長さ H=半高 bend/ty=上下のしなり ----
  var TAIL_PTS = [[0.21, -0.55], [0.49, -0.9], [0.73, -1], [0.92, -0.9], [1, -0.65], [0.97, -0.28], [0.77, 0], [0.98, 0.27], [1, 0.59], [0.89, 0.83], [0.68, 0.91], [0.45, 0.79], [0.2, 0.53]];
  // 小・中段階では尾をたたみ、大段階で上下の扇が大きく開く。
  var TUCKED_TAIL = [[0.29, -0.62], [0.66, -0.94], [0.9, -0.96], [1, -0.69], [0.95, 0], [1, 0.66], [0.91, 0.88], [0.64, 0.88], [0.26, 0.57]];
  var TAIL_RAYS = [-1.03, 0, 0.93], TUCKED_TAIL_RAYS = [-0.55, 0.5];
  function stampTailV15(g, tb, ty0, L, H, hp, bend, ty, p, K, tucked) {
    var poly = [[-2, -hp]];
    var pts = tucked ? TUCKED_TAIL : TAIL_PTS;
    for (var i = 0; i < pts.length; i++) poly.push([pts[i][0] * L, pts[i][1] * H]);
    poly.push([-2, hp]);
    var off = function (d) { var k = Math.max(0, d) / Math.max(1, L); return bend * k * k + ty * k; };
    var inside = function (x, y) { var d = tb - (x + 0.5); if (d < -2 || d > L + 1) return false; return inPoly(d, y + 0.5 - ty0 - off(d), poly); };
    g.stamp(function (x, y) { return inside(x, y) ? p.F : null; }, K, [tb - L - 3, ty0 - H - 8, tb + 3, ty0 + H + 8]);
    // すじ（付け根から放射状。輪郭に触れる所は描かない）
    var rays = tucked ? TUCKED_TAIL_RAYS : TAIL_RAYS;
    if (L >= 5 && H >= 4.5) for (var r = 0; r < rays.length; r++) {
      var s = rays[r], last = null;
      for (var d = L * 0.3; d <= L * 0.86; d += 0.25) {
        var x = Math.floor(tb - d), y = Math.floor(ty0 + s * (d + 1) * (H / L) * 0.62 + off(d));
        var key = x + ',' + y; if (key === last) continue; last = key;
        if (!inside(x, y) || !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) continue;
        g.set(x, y, K);
      }
    }
  }
  // 背びれ（すじ入りの小さな扇）。(bx, top)=付け根のまん中・体の上端。dh=高さ倍率 dl=うしろへの流れ
  function stampDorsalV15(g, bx, top, w, dh, dl, p, K) {
    var hw = w / 2;
    var poly = [[bx + hw + 0.5, top + 2.5], [bx + hw - 0.5, top - 1.6 * dh], [bx + hw * 0.45 + dl * 0.2, top - 2.8 * dh], [bx + hw * 0.1 + dl * 0.4, top - 4.6 * dh],
      [bx - hw * 0.35 + dl * 0.7, top - 4.5 * dh], [bx - hw * 0.6 + dl, top - 3.2 * dh], [bx - hw + dl, top - 1.6 * dh], [bx - hw - 0.5, top + 2.5]];
    g.stamp(function (x, y) { return inPoly(x + 0.5, y + 0.5, poly) ? p.F : null; }, K, [bx - hw - 4, top - 8, bx + hw + 4, top + 4]);
    [[bx + hw * 0.35, 0.2, 2.6], [bx - hw * 0.25, 0.55, 3.4]].forEach(function (q) {
      for (var k = 0; k <= q[2] * dh; k += 0.5) {
        var x = Math.floor(q[0] + dl * q[1] * k / 4), y = Math.floor(top - k + 0.5);
        if (g.get(x, y - 1) === p.F && g.get(x, y) === p.F) g.set(x, y, K);
      }
    });
  }
  // 足びれ（体の下にちょこんと2つ）。feet: [[中心x, 付け根y, 長さ, ずれ]]
  function stampFeetV15(g, feet, p, K) {
    var finColor = p.VF || p.F;
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    feet.forEach(function (f) { x0 = Math.min(x0, f[0] - 4); x1 = Math.max(x1, f[0] + 4); y0 = Math.min(y0, f[1] - 1); y1 = Math.max(y1, f[1] + f[2] + 2); });
    g.stamp(function (x, y) {
      for (var i = 0; i < feet.length; i++) {
        var f = feet[i], v = y + 0.5 - f[1];
        if (v < 0 || v > f[2]) continue;
        var c = f[0] + f[3] * v / f[2], w = v > f[2] - 1 ? 1 : 1.65;
        if (Math.abs(x + 0.5 - c) <= w) return finColor;
      }
      return null;
    }, K, [x0 - 2, y0, x1 + 2, y1]);
  }
  function colTop(x, S, o, lim) { for (var y = -lim; y < lim; y++) if (bodyIn(x, y, S, o)) return y; return 0; }
  function colBot(x, S, o, lim) { for (var y = lim; y > -lim; y--) if (bodyIn(x, y, S, o)) return y; return 0; }
  // えらの線（うしろの目の後ろの弧）
  function gillLine(g, x0, y0, y1, p, K) {
    var last = null;
    for (var s = 0; s <= 1.0001; s += 0.02) {
      var x = Math.floor(x0 - 1.3 * Math.sin(s * Math.PI * 0.85) + 2.6 * s * s), y = Math.floor(y0 + (y1 - y0) * s);
      var key = x + ',' + y; if (key === last) continue; last = key;
      var c = g.get(x, y); if (c === p.B || c === p.P) g.set(x, y, K);
    }
  }

  // とげとげの扇（感電でひれが逆立つ）。(ox,oy) から角度 a0..a1（右=0, 下=+）へ n 本、長さ len
  function stampFan(g, ox, oy, a0, a1, n, len, bw, fill, K, jag, r0) {
    var tris = [];
    r0 = r0 || 1;
    for (var i = 0; i < n; i++) {
      var a = n > 1 ? a0 + (a1 - a0) * i / (n - 1) : a0, ca = Math.cos(a), sa = Math.sin(a);
      var L = r0 + (len - r0) * (jag && (i & 1) ? 0.72 : 1), w1 = bw * 0.75, m = L - 2.6;
      tris.push([[ox + ca * r0 - sa * bw, oy + sa * r0 + ca * bw], [ox + ca * m - sa * w1, oy + sa * m + ca * w1], [ox + ca * L, oy + sa * L],
        [ox + ca * m + sa * w1, oy + sa * m - ca * w1], [ox + ca * r0 + sa * bw, oy + sa * r0 - ca * bw]]);
    }
    var r = len + 2;
    g.stamp(function (x, y) { for (var j = 0; j < tris.length; j++) if (inPoly(x + 0.5, y + 0.5, tris[j])) return fill; return null; }, K, [ox - r, oy - r, ox + r, oy + r]);
  }
  // 泡と消えた：魚の形に並んだ泡（輪郭・中身・目は大きな泡に黒目・くちびるはピンクの泡の輪）
  var BUB_R = '#7fd4ee', BUB_W = '#ffffff', BUB_F = 'rgba(214,246,255,0.42)', BUB_D = '#4aa8d0';
  function bubbleDot(g, cx, cy, r) {
    var rc = Math.ceil(r) + 1;
    for (var y = -rc; y <= rc; y++) for (var x = -rc; x <= rc; x++) {
      var dx = x + 0.5 - (cx - Math.floor(cx)), dy = y + 0.5 - (cy - Math.floor(cy)), d = Math.sqrt(dx * dx + dy * dy);
      var X = Math.floor(cx) + x, Y = Math.floor(cy) + y;
      if (d > r + 0.45) continue;
      if (d >= r - 0.6) g.set(X, Y, (dx < -0.2 && dy < -0.2) ? BUB_W : (dx > 0.3 && dy > 0.3) ? BUB_D : BUB_R);
      else if (r >= 2 && Math.abs(dx + r * 0.4) < 0.7 && Math.abs(dy + r * 0.4) < 0.7) g.set(X, Y, BUB_W);
      else if (!g.get(X, Y) || g.get(X, Y) === BUB_F) g.set(X, Y, BUB_F);
    }
  }
  function buildBubbleFish(o, S) {
    var ref = buildFish(merge(o, { bubbly: false, eyes: 'normal', mouth: 0, _gm: null, sweat: false }), 0, S, null, 0);
    var g = new Grid(100, 84, 52, 42), K = ref.K, bb = bbox(ref);
    g.K = BUB_D; g.keep = [PUPIL];
    var E = eyeCenters(S, o), LP = lipsAt(S, o), n = 0;
    var nearFace = function (x, y) { var a = x - E.ex1, b = y - E.ey, c = x - E.ex2, d = x - LP.x, e = y - LP.y; return a * a + b * b < 30 || c * c + b * b < 30 || d * d * 0.5 + e * e < 14; };
    // 輪郭にそって小さな泡
    for (var y = bb[1]; y < bb[3]; y++) for (var x = bb[0]; x < bb[2]; x++) {
      if (ref.get(x, y) !== K || nearFace(x, y)) continue;
      var out = !ref.get(x - 1, y) || !ref.get(x + 1, y) || !ref.get(x, y - 1) || !ref.get(x, y + 1);
      if (!out || hash(x * 7 + 3, y * 11) > 0.34) continue;
      bubbleDot(g, x + 0.5, y + 0.5, hash(x, y + 5) > 0.7 ? 1.9 : hash(x + 9, y) > 0.4 ? 1.3 : 0.9); n++;
    }
    // 中身にまばらな泡
    for (var gy = bb[1]; gy < bb[3]; gy += 5) for (var gx = bb[0]; gx < bb[2]; gx += 5) {
      var jx = gx + R(hash(gx, gy + 3) * 4), jy = gy + R(hash(gx + 5, gy) * 4), c = ref.get(jx, jy);
      if (!c || c === K || nearFace(jx, jy)) continue;
      var nb = ref.get(jx - 2, jy) && ref.get(jx + 2, jy) && ref.get(jx, jy - 2) && ref.get(jx, jy + 2);
      if (!nb) continue;
      bubbleDot(g, jx + 0.5, jy + 0.5, hash(jx, jy) > 0.6 ? 2.3 : 1.3);
    }
    // 目：大きな泡＋黒目
    var lk = LOOK[o.look] || LOOK.fwd;
    [[E.ex2, E.ey2], [E.ex1, E.ey]].forEach(function (q) {
      bubbleDot(g, q[0], q[1], E.r + 0.6);
      var px = R(q[0] + lk[0] * 1.2 - 1), py = R(q[1] + lk[1] * 1.2 - 1);
      g.set(px, py, PUPIL); g.set(px + 1, py, PUPIL); g.set(px, py + 1, PUPIL); g.set(px + 1, py + 1, PUPIL);
    });
    // くちびる：ピンクの泡の輪
    var mx = LP.x + 1, my = LP.y;
    for (var yy = -3; yy <= 3; yy++) for (var xx = -5; xx <= 5; xx++) {
      var e2 = (xx + 0.5) * (xx + 0.5) / 25 + (yy + 0.5) * (yy + 0.5) / 10.5;
      if (e2 > 1.05) continue;
      g.set(mx + xx, my + yy, e2 > 0.62 ? (yy < -1 && xx < 0 ? '#ffd0dc' : '#ff8aa8') : e2 > 0.3 ? '#d85a80' : 'rgba(255,200,215,0.5)');
    }
    return g;
  }
  function buildFish(o, frame, S, splitExt, tframe) {
    if (o.bubbly) return buildBubbleFish(o, S);
    var g = new Grid(100, 84, 52, 42);
    var p = palOf(o);
    var K = p.K;
    var still = o.stone || o.frozen;
    var ph = still ? 0 : frame / 8 * Math.PI * 2;
    var pht = still ? 0 : (tframe == null ? frame : tframe) / 8 * Math.PI * 2;
    var puff = !!(o.puff || o.balloon);

    g.K = K; g.keep = [PUPIL]; g.keepSep = p.W;
    if (o.bones) return buildSkeleton(g, o, ph, S, splitExt);   // v22: スケルトンの最後は骨だけに
    if (o.stone) return buildStone(g, o, S, splitExt);
    var skel = !!o.skeleton && !(o.puff || o.balloon), cut = S.cx - S.rx * 0.12; // ガイコツ：頭だけ残り、胴のまん中は魚の骨
    // 裏返り（_rollA 0..0.5：0=ふつう 0.25=45° 0.5=お腹がこちら）：体を軸にまわす。目は頭の上へ、お腹が下から回りこむ
    var rA = !puff && o._rollA > 0 ? Math.min(0.5, +o._rollA) : 0, rC = Math.cos(Math.PI * rA), rS = Math.sin(Math.PI * rA);
    if (o._shrink && !puff) { var k1 = o._shrink[0], k2 = o._shrink[1]; S = merge(S, { cx: S.cx * k1, rx: S.rx * k1, ry: S.ry * k2, tb: S.tb * k1, tl: S.tl * k1, hp: S.hp * k2, ft: S.ft * k2, base: S.base || S }); }
    if (o._rsy && !puff && !rA) S = merge(S, { ry: S.ry * o._rsy, hp: S.hp * (0.5 + 0.5 * o._rsy), er: Math.min(S.er, S.ry * o._rsy * 0.6), ft: S.ft * (0.6 + 0.4 * o._rsy), base: S.base || S }); // 裏返り途中：体を薄く（目は丸いまま）
    var E = eyeCenters(S, o);
    var ry = puff ? 15 : S.ry, thick = ry >= 13 && !skel;
    var inBody = function (x, y) { return bodyIn(x, y, S, o); };
    var cx = S.cx, fp = o._fp;
    if (rA) { E = merge(E, {}); E.ey = R(E.ey * rC - S.ry * 0.8 * rS); E.ey2 = E.ey + (rS > 0.6 ? 0 : 1); E.ex2 = E.ex2 + R(rS * 2); }

    // --- 尾びれ（二股・すじ）。泳ぎで横へ振ると短く見える（たたむ） / 分裂時は尾柄を延長して切り口 ---
    // 分裂：尾のかわりに、のびた胴（もう一つの頭へつながる）
    var neckH = S.ry * 0.5, neckX1 = R(S.cx - S.rx * 0.35);
    var nx0 = Math.floor(S.tb) - splitExt, inNeck = function (x, y) { if (x > neckX1 || x < nx0) return false; var py = y + 0.5, hh = neckH * (1 + 0.25 * Math.max(0, (x - S.tb) / (neckX1 - S.tb))); return py >= -hh && py <= hh + 1; };
    var neckCol = function (x, y) { return y + 0.5 > neckH * 0.3 ? p.P : (y + 0.5 < -neckH + 2 && ((x + 40) % 4 === 0)) ? p.D : p.B; };
    if (splitExt != null) {
      g.stamp(function (x, y) { return inNeck(x, y) ? neckCol(x, y) : null; }, K, [nx0 - 1, -S.ry, neckX1 + 2, S.ry]);
    } else {
      var tb = puff ? S.cx - 13 : S.tb;
      var L = puff ? (o.round ? 7 : 10) : S.tl, H = L * (puff ? 1.02 : S.th), bend, ty;
      if (fp) { L *= (fp.tl || 1) * Math.min(1.15, fp.tr || 1); H *= Math.max(0.5, Math.min(1.2, fp.ts)); bend = fp.bend * 0.55; ty = fp.ty; }
      else { L *= 0.7 + 0.3 * Math.abs(Math.cos(pht)); bend = Math.sin(pht) * 1.6; ty = 0; }
      if (puff) H = Math.min(H, 12);
      if (rA) { H = Math.max(2.6, H * rC); bend *= rC; L *= 0.85 + 0.15 * rC; }
      if (o.spiky) { // 感電：尾がとげとげに開く
        var sk = o.spiky === true ? 1 : Math.max(0, Math.min(1, +o.spiky || 0));
        stampFan(g, tb + 2, 0, Math.PI - 0.45 - 0.55 * sk, Math.PI + 0.45 + 0.55 * sk, 6, 2 + S.tl * (0.85 + 0.35 * sk), 1.5, p.F, K, true, 1);
      } else stampTailV15(g, tb, 0, L, H, S.hp * (rA ? Math.max(0.5, rC) : 1), bend, ty, p, K, !puff && stageOf(o) < 3);
    }

    // --- 背びれ（頭のてっぺんより少しうしろ・すじ入り） ---
    var dw = fp ? fp.dl * 0.6 : Math.sin(ph) * 0.8;
    var dh = fp ? fp.dh : 1;
    var dbx = puff ? cx - 4 : cx - S.rx * 0.28;
    if (rA) dh *= rC;
    if (o.spiky && !skel) { var sk2 = o.spiky === true ? 1 : Math.max(0, Math.min(1, +o.spiky || 0)); stampFan(g, cx - 1, 0, -Math.PI / 2 - 0.8 - 0.2 * sk2, -Math.PI / 2 + 0.4 + 0.2 * sk2, 6, ry + 4 + 6 * sk2, 1.7, p.F, K, true, ry - 4); }
    else if (!skel && (!rA || rC > 0.35)) stampDorsalV15(g, dbx, colTop(R(dbx), S, o, 30), puff ? 9 : S.rx * 0.7, dh * 0.86, -dw, p, K);

    // --- 足びれ（体の下に2つ。交互にぱたぱた） ---
    var fw = fp ? fp.fw : Math.sin(ph + 1) * 0.8;
    var rxx = puff ? 14 : S.rx;
    var fxA = R(cx + rxx * 0.42), fxB = R(cx - rxx * 0.3);
    if (o.belly) { fxA = R(cx + rxx * 0.5); fxB = R(cx - rxx * 0.45); }
    var ftl = (S.ft || 4) * (fp ? fp.ps : 1);
    if (o.spiky) { ftl *= 1.4; fw = 0.9; }
    var feetL = skel ? [[fxA, colBot(fxA, S, o, 50), ftl, -fw * 1.3]] : [[fxA, colBot(fxA, S, o, 50), ftl, -fw * 1.3], [fxB, colBot(fxB, S, o, 50), ftl, fw * 1.3]];
    if (rA > 0.12) feetL.forEach(function (f) { f[0] -= R(rS * 4); f[1] = R(f[1] * rC + S.ry * 0.42 * rS); f[2] = rS > 0.85 ? 2.4 : Math.max(2.6, f[2] * (0.5 + 0.5 * rC)); f[3] *= rC; }); // お腹がこちら：足びれは体の上（あとで描く）
    else if (!o.legs) stampFeetV15(g, feetL, p, K); // 魚人は足びれのかわりに人の脚
    if (skel) { // 背骨と肋骨（尾の付け根から頭の切り口まで）
      var BNs = '#f4ecd8', BSs = '#d8ccb0', sx0 = S.tb - 1, sx1 = R(cut) + 2;
      g.stamp(function (x, y) {
        if (x >= sx0 && x <= sx1 && (y === 0 || y === -1)) return y ? BNs : BSs;
        if (x > sx0 + 1 && x < sx1 - 1 && (sx1 - x) % 3 === 1) {
          var hh = R(S.ry * 0.75 * (0.55 + 0.45 * (x - sx0) / (sx1 - sx0)));
          var bx = x + R(Math.abs(y) * 0.25);
          if (y !== 0 && y !== -1 && Math.abs(y + 0.5) <= hh) return null;
        }
        return null;
      }, K, [sx0 - 1, -3, sx1 + 1, 3]);
      for (var rx9 = sx1 - 2; rx9 > sx0 + 1; rx9 -= 3) {
        var hh9 = R(S.ry * 0.72 * (0.5 + 0.5 * (rx9 - sx0) / (sx1 - sx0)));
        for (var sg = -1; sg <= 1; sg += 2) for (var k9 = 1; k9 <= hh9; k9++) {
          var yy9 = sg < 0 ? -1 - k9 : k9, xx9 = rx9 - R(k9 * k9 / hh9 * 0.9);
          g.set(xx9, yy9, BNs); if (!g.get(xx9 - 1, yy9)) g.set(xx9 - 1, yy9, K); if (!g.get(xx9 + 1, yy9)) g.set(xx9 + 1, yy9, K);
          if (k9 === hh9) { if (!g.get(xx9, yy9 + sg)) g.set(xx9, yy9 + sg, K); }
        }
      }
    }

    // --- 胴体（ほぼ円・下 1/3 がクリーム色のお腹） ---
    var rollK = o._roll ? o._roll : 0;
    g.stamp(function (x, y) {
      if (!inBody(x, y) || (skel && x + 0.5 < cut - 3 * Math.sqrt(Math.max(0, 1 - (y + 0.5) * (y + 0.5) / (S.ry * S.ry))))) return null;
      var bl = o.belly ? Math.min(bellyY(x, S, o), S.ry * 0.3) : bellyY(x, S, o);
      if (rA) { // 球の上の点をまわして、お腹（下の帽子）に入るか
        var uu = (x + 0.5 - S.cx) / S.rx, vv = (y + 0.5) / S.ry, zz = Math.sqrt(Math.max(0, 1 - uu * uu - vv * vv));
        return fishBodyColor(inBody, x, y, p, thick, vv * rC + zz * rS > bl / S.ry, false);
      }
      if (rollK) bl -= ry * 0.62 * rollK; // 裏返り途中：お腹が上へ回り込む
      return fishBodyColor(inBody, x, y, p, thick, y + 0.5 > bl, !skel && x < cx - S.rx * 0.6);
    }, K, puff ? [cx - 18, -17, cx + 16, 17] : [cx - S.rx - 2, -S.ry - 2, cx + S.rx + 2, S.ry * 2.6 + 2]);

    if (rA > 0.12) stampFeetV15(g, feetL, p, K);
    if (splitExt != null) for (var ny = -R(S.ry); ny <= R(S.ry); ny++) for (var nx = nx0; nx <= neckX1; nx++) { // つなぎ目の線を消す
      if (inNeck(nx, ny) && inNeck(nx, ny - 1) && inNeck(nx, ny + 1) && inNeck(nx - 1, ny) && inNeck(nx + 1, ny) && (nx < S.cx - S.rx + 3 || !bodyIn(nx, ny, S, o) || g.get(nx, ny) === K)) g.set(nx, ny, neckCol(nx, ny));
    }
    // --- 食べすぎ：張りつめたお腹のつや・すじ ---
    if (o.belly && !puff) {
      var bcy = R(S.ry * 1.25), bcx = cx - 1;
      g.line([[bcx - 7, bcy - 3], [bcx - 6, bcy - 4], [bcx - 5, bcy - 4], [bcx - 4, bcy - 5], [bcx - 3, bcy - 5]], '#ffffff');
      g.set(bcx - 7, bcy - 2, '#ffffff'); g.set(bcx - 1, bcy - 5, '#fff4e0');
      g.set(bcx + 1, bcy + 2, '#e8a878'); g.set(bcx + 1, bcy + 3, '#e8a878');
      g.line([[bcx - 10, bcy + 5], [bcx - 9, bcy + 6]], '#eab48a'); g.line([[bcx + 9, bcy + 6], [bcx + 10, bcy + 5]], '#eab48a');
      g.line([[bcx + 3, bcy + 10], [bcx + 4, bcy + 11]], '#eab48a');
    }

    // --- ガリガリ：浮き出た肋骨・背骨 ---
    if (S.gaunt) {
      var BNc = '#fff6e4', ry0 = S.ry;
      for (var gx = cx - S.rx + 3; gx <= cx + 2; gx++) if (bodyIn(gx, -1, S, o)) { g.set(gx, -1, (gx & 1) ? BNc : '#f0dcc0'); if (gx % 3 === 0) g.set(gx, -2, p.D); }
      for (var rbx = cx + 1; rbx > cx - S.rx + 3; rbx -= 3) {
        for (var ry2 = -R(ry0) + 3; ry2 <= R(ry0); ry2++) {
          var cxr = rbx + R(Math.abs(ry2) * 0.4) - 1;
          if (!bodyIn(cxr, ry2, S, o) || !bodyIn(cxr, ry2 + 1, S, o) || !bodyIn(cxr, ry2 - 1, S, o)) continue;
          if (ry2 === -1) continue;
          g.set(cxr, ry2, BNc); if (bodyIn(cxr + 1, ry2, S, o)) g.set(cxr + 1, ry2, p.D);
        }
      }
      for (var ty2 = -22; ty2 <= 22; ty2++) for (var tx2 = S.tb - S.tl - 4; tx2 < S.tb - 3; tx2++) {
        var tc = g.get(tx2, ty2);
        if (tc === p.F && hash(tx2 * 3, ty2 * 7) > 0.8) g.set(tx2, ty2, null);
      }
    }

    // --- えらの線 ---
    var e2y = E.ey2 == null ? E.ey : E.ey2;
    if (!S.gaunt && rS < 0.75) gillLine(g, E.ex2 - E.r - 3.2, e2y - 0.5, Math.min(R(bellyY(cx - 4, S, o)) - 1, e2y + ry * 0.7), p, K);

    // --- 顔 ---
    var LP = lipsAt(S, o);
    var A = { cx: cx, top: -R(ry), bot: R(ry), front: E.front, back: S.tb - 4, E: E, fxm: LP.x + 5, mx: LP.x, my: LP.y, isFront: false, S: S, ry: ry, tb: S.tb };
    if (!o.stuck) drawFace(g, o, p, A);
    if (S.gaunt) {
      [[E.ex1, E.ey], [E.ex2, e2y]].forEach(function (ee) { for (var k = -2; k <= 1; k++) { var yy = ee[1] + Math.ceil(E.r) + 1; if (g.get(ee[0] + k, yy) !== K) g.set(ee[0] + k, yy, '#8a5a40'); } });
    }
    decorate(g, o, p, A, frame, ph);
    if (o.stuck) stuckCut(g, S, p, K);
    return g;
  }

  // ---------- 正面顔（こちらを向く） ----------
  // まるい体の上半分に左右の目、まん中下にくちびる、てっぺんに背びれ、下に足びれ2つ。尾は見えない（揺れで少しのぞく）
  function buildFront(o, frame, S, tframe) {
    var g = new Grid(100, 84, 50, 42);
    var p = palOf(o), K = p.K;
    var still = o.stone || o.frozen;
    var ph = still ? 0 : frame / 8 * Math.PI * 2;
    var pht = still ? 0 : (tframe == null ? frame : tframe) / 8 * Math.PI * 2;
    var puff = !!(o.puff || o.balloon), gaunt = !!o.skeleton;
    g.K = K; g.keep = [PUPIL]; g.keepSep = p.W;
    var bw = puff ? 15.5 : S.ry * (gaunt ? 0.85 : 1.04), bh = puff ? 15 : S.ry;
    if (o._rsy) bh *= o._rsy;
    if (o._shrink) { bw *= o._shrink[0]; bh *= o._shrink[1]; }
    var top = -bh, fpF = o._fp;
    // 尾（体のうしろ。揺れると片側に先っぽがのぞく）
    var sw = fpF ? fpF.sway : Math.sin(pht) * 1.6;
    if (Math.abs(sw) > 0.5) {
      var sd = sw > 0 ? 1 : -1, tlx = sd * (bw - 2 + Math.abs(sw) * 1.2), tly = -bh * 0.15;
      g.stamp(function (x, y) {
        var dx = (x + 0.5 - tlx) * sd, dy = y + 0.5 - tly;
        if (dx < -3 || dx > 3.2) return null;
        var hh = S.tl * 0.55 * (1 - Math.max(0, dx) / 6);
        if (Math.abs(dy) > hh) return null;
        if (Math.abs(dy) < 1.2 && dx > 1.2) return null; // 二股の切れこみ
        return p.F;
      }, K, [tlx - 5, tly - S.tl, tlx + 5, tly + S.tl]);
    }
    // 背びれ（てっぺんにうすく）
    var dw = fpF ? -fpF.sway * 0.5 : Math.sin(ph) * 0.8;
    var dhF = fpF ? fpF.dh : 1;
    stampDorsalV15(g, 0, R(top), 5, dhF * 0.82, dw, p, K);
    // 足びれ（下に2つ）
    var fl = fpF ? fpF.fw : Math.sin(ph + 1) * 0.8;
    var fq = fpF ? fpF.ps : 1;
    var fxs = R(bw * 0.42);
    var inB = function (x, y) {
      var px = (x + 0.5) / bw, py = (y + 0.5) / (y + 0.5 > 0 ? bh * 1.03 : bh);
      if (o.belly) { var qx = (x + 0.5) / (bw * 1.08), qy = (y + 0.5 - bh * 0.6) / (bh * 1.1); if (qx * qx + qy * qy <= 1) return true; }
      return Math.pow(Math.abs(px), 2.2) + Math.pow(Math.abs(py), 2.2) <= 1;
    };
    var fbot = function (x) { for (var y = 60; y > -60; y--) if (inB(x, y)) return y; return 0; };
    stampFeetV15(g, [[-fxs, fbot(-fxs) - 1, (S.ft || 4) * fq, -fl], [fxs, fbot(fxs) - 1, (S.ft || 4) * fq, fl]], p, K);
    // 腹びれ（puff：横に小さく）
    if (puff) g.stamp(function (x, y) {
      for (var s = -1; s <= 1; s += 2) { var dx = x + 0.5 - s * (bw + 0.5), dy = y + 0.5 - 2; if (dx * dx / 4 + dy * dy / 6 <= 1) return p.F; }
      return null;
    }, K, [-bw - 4, -2, bw + 4, 6]);
    // 体
    g.stamp(function (x, y) {
      if (!inB(x, y)) return null;
      var px = (x + 0.5) / bw, bl = (o.belly ? 0.25 : 0.26 + 0.23 * (1 - px * px)) * bh;
      if (o._roll) bl -= bh * 0.62 * o._roll;
      return fishBodyColor(inB, x, y, p, bh >= 13 && !gaunt, y + 0.5 > bl, false);
    }, K, [-bw - 2, -bh - 2, bw + 2, bh * 2.4 + 2]);
    if (o.belly) { var bcy = R(bh * 1.15); g.line([[-8, bcy - 3], [-7, bcy - 4], [-6, bcy - 4], [-5, bcy - 5]], '#ffffff'); g.set(0, bcy + 2, '#e8a878'); g.set(0, bcy + 3, '#e8a878'); }
    if (gaunt) { for (var ryb = 2; ryb < bh; ryb += 3) for (var s2 = -1; s2 <= 1; s2 += 2) for (var k = 3; k < bw - 1; k++) if (inB(s2 * k, ryb + R(k * 0.2)) && inB(s2 * k, ryb + R(k * 0.2) + 1)) g.set(s2 * k, ryb + R(k * 0.2), '#fff6e4'); }
    // 顔
    var r = S.er * (gaunt ? 0.95 : 1.0);
    if (o._rsy) r = Math.min(r, bh * 0.5);
    var esp = R(bw * 0.43);
    var E = { ex1: esp, ex2: -esp, ey: Math.round(-bh * 0.3), r: r, front: R(bw) };
    var my = R(bh * 0.27) + 1;
    if (puff) my = 5;
    var A = { cx: 0, top: R(top), bot: R(bh), front: R(bw), back: -R(bw), E: E, fxm: 0, mx: 0, my: my, isFront: true, S: S, ry: bh, tb: -R(bw), cw: R(bw - 1.5) };
    drawFace(g, o, p, A);
    if (gaunt) { [E.ex1, E.ex2].forEach(function (ex) { for (var k = -2; k <= 1; k++) { var yy = E.ey + Math.ceil(E.r) + 1; if (g.get(ex + k, yy) !== K) g.set(ex + k, yy, '#8a5a40'); } }); }
    decorate(g, o, p, A, frame, ph);
    return g;
  }

  // ---------- 斜め45°（3/4ビュー。turnF 1/3）：右を向きつつこちらへ顔を向ける ----------
  // まるい体の右側に目が2つ（前の目は輪郭から飛び出す）、その下にくちびる。尾はうしろ（左）に小さくのぞく
  function buildQuarter(o, frame, S, tframe) {
    var g = new Grid(100, 84, 50, 42);
    var p = palOf(o), K = p.K;
    var still = o.stone || o.frozen;
    var ph = still ? 0 : frame / 8 * Math.PI * 2;
    var pht = still ? 0 : (tframe == null ? frame : tframe) / 8 * Math.PI * 2;
    var gaunt = !!o.skeleton, fp = o._fp;
    g.K = K; g.keep = [PUPIL]; g.keepSep = p.W;
    var bw = S.ry * (gaunt ? 0.95 : 1.07), bh = S.ry;
    if (o._rsy) bh *= o._rsy;
    if (o._shrink) { bw *= o._shrink[0]; bh *= o._shrink[1]; }
    var top = -bh;
    // 尾（うしろ＝左。短く見える）
    var L = S.tl * 0.55 * (fp && fp.tl || 1), H = S.tl * 0.85 * (fp ? fp.ts : 1);
    var bend = fp ? fp.bend * 0.4 + fp.ty : Math.sin(pht) * 1.2;
    stampTailV15(g, -R(bw) + 3, -1, L, H, S.hp, bend, 0, p, K, stageOf(o) < 3);
    // 背びれ（少しうしろ）
    var dl = fp ? fp.dl * 0.6 : Math.sin(ph) * 0.8, dh = fp ? fp.dh : 1;
    var inB = function (x, y) {
      var px = (x + 0.5) / bw, py = (y + 0.5) / (y + 0.5 > 0 ? bh * 1.03 : bh);
      if (o.belly) { var qx = (x + 0.5 + 1) / (bw * 1.05), qy = (y + 0.5 - bh * 0.6) / (bh * 1.1); if (qx * qx + qy * qy <= 1) return true; }
      return Math.pow(Math.abs(px), 2.2) + Math.pow(Math.abs(py), 2.2) <= 1;
    };
    var ctop = function (x) { for (var y = -60; y < 60; y++) if (inB(x, y)) return y; return 0; };
    var cbot = function (x) { for (var y = 60; y > -60; y--) if (inB(x, y)) return y; return 0; };
    var dbx = -R(bw * 0.25);
    stampDorsalV15(g, dbx, ctop(dbx), bw * 0.55, dh * 0.86, -dl, p, K);
    // 足びれ
    var fw = fp ? fp.fw : Math.sin(ph + 1) * 0.8, fq = fp ? fp.ps : 1;
    var fa = R(bw * 0.42), fb = -R(bw * 0.3);
    stampFeetV15(g, [[fa, cbot(fa) - 1, (S.ft || 4) * fq, -fw * 1.2], [fb, cbot(fb) - 1, (S.ft || 4) * fq, fw * 1.2]], p, K);
    // 体
    g.stamp(function (x, y) {
      if (!inB(x, y)) return null;
      var px = (x + 0.5 - bw * 0.15) / bw, bl = (o.belly ? 0.25 : 0.26 + 0.23 * (1 - px * px)) * bh;
      if (o._roll) bl -= bh * 0.62 * o._roll;
      return fishBodyColor(inB, x, y, p, bh >= 13 && !gaunt, y + 0.5 > bl, x < -bw * 0.6);
    }, K, [-bw - 2, -bh - 2, bw + 2, bh * 2.4 + 2]);
    if (o.belly) { var bcy = R(bh * 1.15); g.line([[-7, bcy - 3], [-6, bcy - 4], [-5, bcy - 4], [-4, bcy - 5]], '#ffffff'); }
    // 顔
    var r = S.er * (gaunt ? 0.95 : 1.0);
    if (o._rsy) r = Math.min(r, bh * 0.5);
    var ex1 = R(bw - r * 0.88), ex2 = ex1 - R(2 * r + 2.5), ey = R(-bh * 0.38);
    var E = { ex1: ex1, ex2: ex2, ey: ey, ey2: ey + 1, r: r, r1: r, q: true, front: R(bw) };
    gillLine(g, ex2 - r - 2.2, ey + 0.5, Math.min(R(bh * 0.5), ey + bh * 0.7), p, K);
    var mx = ex1 - 5, my = R(bh * 0.24) + 1;
    var A = { cx: 0, top: R(top), bot: R(bh), front: R(bw), back: -R(bw), E: E, fxm: mx + 5, my: my, isFront: true, q: true, mx: mx, S: S, ry: bh, tb: -R(bw), cw: R(bw * 0.62) };
    drawFace(g, o, p, A);
    if (gaunt) { [E.ex1, E.ex2].forEach(function (ex) { for (var k = -2; k <= 1; k++) { var yy = E.ey + Math.ceil(E.r) + 1; if (g.get(ex + k, yy) !== K) g.set(ex + k, yy, '#8a5a40'); } }); }
    decorate(g, o, p, A, frame, ph);
    return g;
  }
  // 横幅 fx・縦 fy に伸縮（中心 (cxp,cyp) 基準）。縮めて消えた輪郭は付け直す
  function squeeze(g, fx, fy, cxp, cyp) {
    var bb = bbox(g);
    var x0 = Math.floor(cxp + (bb[0] - cxp) * fx) - 2, x1 = Math.ceil(cxp + (bb[2] - cxp) * fx) + 2;
    var y0 = Math.floor(cyp + (bb[1] - cyp) * fy) - 2, y1 = Math.ceil(cyp + (bb[3] - cyp) * fy) + 2;
    var m = new Grid(x1 - x0, y1 - y0, -x0, -y0), K = g.K || O, W = m.w;
    // 縮める方向は範囲内を見て、黒目＞輪郭＞中央の色 の順で残す（目や線が消えないように）
    for (var v = y0; v < y1; v++) for (var u = x0; u < x1; u++) {
      var sx = Math.floor(cxp + (u + 0.5 - cxp) / fx), sy = Math.floor(cyp + (v + 0.5 - cyp) / fy);
      var c = g.get(sx, sy);
      if (c && (fx < 1 || fy < 1)) {
        var ax0 = fx < 1 ? Math.floor(cxp + (u - cxp) / fx + 0.01) : sx, ax1 = fx < 1 ? Math.ceil(cxp + (u + 1 - cxp) / fx - 0.01) - 1 : sx;
        var ay0 = fy < 1 ? Math.floor(cyp + (v - cyp) / fy + 0.01) : sy, ay1 = fy < 1 ? Math.ceil(cyp + (v + 1 - cyp) / fy - 0.01) - 1 : sy;
        var nK = 0, nA = 0, hasP = false;
        for (var yy = ay0; yy <= ay1; yy++) for (var xx = ax0; xx <= ax1; xx++) { var q = g.get(xx, yy); nA++; if (q === PUPIL) hasP = true; else if (q === K) nK++; }
        if (hasP) c = PUPIL; else if (nK * 2 > nA) c = K; else if (c === K && nK * 2 < nA) { for (yy = ay0; yy <= ay1 && c === K; yy++) for (xx = ax0; xx <= ax1; xx++) { q = g.get(xx, yy); if (q && q !== K) { c = q; break; } } }
      }
      if (c) m.c[(v - y0) * W + (u - x0)] = c;
    }
    var c0 = m.c.slice();
    for (var i = 0; i < c0.length; i++) {
      if (c0[i]) continue;
      var x = i % W, n = [x > 0 ? c0[i - 1] : null, x < W - 1 ? c0[i + 1] : null, c0[i - W], c0[i + W]];
      for (var j = 0; j < 4; j++) if (n[j] && n[j] !== K && n[j].charAt(0) === '#' && n[j].length === 7) { m.c[i] = K; break; }
    }
    m.K = K; m.keep = g.keep; m.keepSep = g.keepSep;
    return m;
  }

  function xrayGrid(g, o, S, isFront) {
    var XK = '#bff4ff', XB = '#1c2c5a', XE = '#3a5a9a', c0 = g.c.slice(), W = g.w, H = g.h;
    for (var i = 0; i < c0.length; i++) {
      if (!c0[i]) continue;
      var x = i % W, y = (i / W) | 0;
      var edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 || !c0[i - 1] || !c0[i + 1] || !c0[i - W] || !c0[i + W];
      if (edge) { g.c[i] = XK; continue; }
      var near = !c0[i - 2] || !c0[i + 2] || (i - 2 * W >= 0 && !c0[i - 2 * W]) || (i + 2 * W < c0.length && !c0[i + 2 * W]);
      g.c[i] = near ? XE : XB;
    }
    if (isFront) { // 正面：背骨・肋骨・目だけ光る
      var A = isFront, BN = '#ffffff';
      for (var sy = A.E.ey + Math.ceil(A.E.r) + 2; sy < A.bot - 1; sy++) { g.set(0, sy, BN); g.set(-1, sy, '#cfeeff'); }
      for (var rb = A.E.ey + Math.ceil(A.E.r) + 3; rb < A.bot - 2; rb += 3) for (var k = 2; k < A.front - 3 - Math.abs(rb) * 0.3; k++) { g.set(k, rb + (k >> 2), BN); g.set(-1 - k, rb + (k >> 2), BN); }
      drawEyesOnGrid(g, o, { B: XB, D: XB, L: XE, W: XE, K: XK }, A.E, true);
      g.K = XK; g.keep = ['#060a20']; return;
    }
    var bg = new Grid(g.w, g.h, g.ox, g.oy);
    buildSkeleton(bg, merge(o, { puff: false }), 0, S, null);
    for (var j = 0; j < bg.c.length; j++) {
      var c = bg.c[j]; if (!c || !g.c[j]) continue;
      if (c === '#f4ecd8') g.c[j] = '#ffffff';
      else if (c === '#d4c8a8') g.c[j] = '#cfeeff';
      else if (c === '#2a3a38') g.c[j] = '#060a20';
    }
    g.K = XK; g.keep = ['#060a20'];
  }

  // 魚の形の石（v15：石だたみのようなひび・灰色のくちびる）。目だけは生きている
  function buildStone(g, o, S, splitExt) {
    var p = PAL.stone, K = p.K;
    var ref = buildFish(merge(o, { stone: false, moss: false, glitch: false, flower: false, frozen: false, xray: false, spiky: false, palette: 'stone', eyes: 'normal', legs: false, _gm: null, _pal: null }), 0, S, splitExt);
    var STL = '#c8c2b6', STB = '#9a948a', STB2 = '#a6a096', STB3 = '#8e887e', STD = '#77716a', CRK = '#5a564e', STP = '#bcb6aa';
    var body = {}; body[p.B] = 1; body[p.D] = 1; body[p.L] = 1; body[p.F] = 1; body[p.P] = 2;
    var bb = bbox(ref);
    var CS = 7; // ひびの網目の大きさ
    var seed = function (cx, cy) { return [(cx + 0.15 + hash(cx + 40, cy + 70) * 0.7) * CS, (cy + 0.15 + hash(cx + 90, cy + 20) * 0.7) * CS]; };
    for (var y = bb[1]; y < bb[3]; y++) for (var x = bb[0]; x < bb[2]; x++) {
      var c = ref.get(x, y); if (!c) continue;
      if (!body[c]) { g.set(x, y, c); continue; }
      var px = x + 0.5, py = y + 0.5, gx = Math.floor(px / CS), gy = Math.floor(py / CS), d1 = 1e9, d2 = 1e9, cid = 0;
      for (var j = -1; j <= 1; j++) for (var i = -1; i <= 1; i++) {
        var sp = seed(gx + i, gy + j), dx = px - sp[0], dy = py - sp[1], d = Math.sqrt(dx * dx + dy * dy);
        if (d < d1) { d2 = d1; d1 = d; cid = (gx + i) * 31 + (gy + j) * 17; } else if (d < d2) d2 = d;
      }
      var col;
      if (d2 - d1 < 0.75) col = CRK;
      else {
        var hv = hash(cid, 5);
        col = body[c] === 2 ? (hv > 0.5 ? STP : '#b0aa9e') : hv > 0.66 ? STB2 : hv > 0.33 ? STB : STB3;
        if (d2 - d1 < 1.6 && hash(x, y) > 0.55) col = STL; // ひびのふちが光る
      }
      var out1 = !ref.get(x - 1, y - 1) || ref.get(x - 1, y - 1) === K, out2 = !ref.get(x + 1, y + 1) || ref.get(x + 1, y + 1) === K;
      if (out1 && col !== CRK) col = STL; else if (out2 && col !== CRK) col = STD;
      g.set(x, y, col);
    }
    // 大きなひび（頭のてっぺんから）
    var E = eyeCenters(S, o), hx = R(S.cx - 2), top = -R(S.ry) + 1;
    [[0, 0], [1, 1], [1, 2], [0, 3], [1, 4], [2, 5], [2, 6], [1, 7]].forEach(function (q) { if (g.get(hx + q[0], top + q[1]) && g.get(hx + q[0], top + q[1]) !== K) g.set(hx + q[0], top + q[1], '#3e3a34'); });
    // 目（生きている）
    var et = o.eyes || 'normal';
    if (EYE_TYPES.indexOf(et) < 0 || et === 'love' || et === 'sparkle') et = 'normal';
    var ep = { B: STB, D: STD, L: STL, W: '#efebe2', K: '#3a3832' };
    var ey2 = E.ey2 == null ? E.ey : E.ey2;
    drawEye(g, E.ex2, ey2, E.r, et === 'tight' ? 'tightL' : et, ep, o.look || 'fwd');
    drawEye(g, E.ex1, E.ey, E.r, et === 'tight' ? 'tightR' : et, ep, o.look || 'fwd');
    g.K = K; g.keep = [PUPIL]; g.keepSep = ep.W;
    if (o.glitch) glitchGrid(g, 0);
    return g;
  }

  function addIce(g) {
    var bb = bbox(g); g._bb = null;
    var ice = 'rgba(200,240,255,0.45)', iceE = '#e8fbff', iceO = '#4a8ab8';
    var x0 = bb[0] - 3, x1 = bb[2] + 2, y0 = bb[1] - 3, y1 = bb[3] + 2;
    for (var iy = y0; iy <= y1; iy++) for (var ix = x0; ix <= x1; ix++) {
      var cur = g.get(ix, iy);
      var edge = (ix === x0 || ix === x1 || iy === y0 || iy === y1);
      if (edge) { if (!((ix === x0 || ix === x1) && (iy === y0 || iy === y1))) g.set(ix, iy, iceO); continue; }
      var d1 = ix - x0 - (iy - y0);
      var hl = (d1 === 6 || d1 === 7 || d1 === 11) && iy < y0 + 12;
      var hl2 = (x1 - ix) + (y1 - iy) === 7;
      if (hl || hl2) { g.set(ix, iy, iceE); continue; }
      if (!cur) g.set(ix, iy, ice);
      if (ix === x0 + 1 || iy === y0 + 1) g.set(ix, iy, iceE);
    }
    // つらら・霜
    for (var ic = x0 + 4; ic < x1 - 2; ic += 7) {
      var L = 2 + Math.floor(hash(ic, 3) * 3);
      for (var k = 1; k <= L; k++) g.set(ic, y1 + k, k === L ? iceO : iceE);
      g.set(ic - 1, y1 + 1, iceO); g.set(ic + 1, y1 + 1, iceO); if (L > 2) { g.set(ic - 1, y1 + 2, iceO); g.set(ic + 1, y1 + 2, iceO); }
      for (var k2 = 2; k2 < L; k2++) { g.set(ic - 1, y1 + k2, iceO); g.set(ic + 1, y1 + k2, iceO); }
      g.set(ic, y1 + L + 1, iceO);
    }
    [[x0 + 3, y0 + 3], [x1 - 4, y0 + 5], [x0 + 6, y1 - 3]].forEach(function (s) { g.set(s[0], s[1], '#ffffff'); g.set(s[0] - 1, s[1], iceE); g.set(s[0] + 1, s[1], iceE); g.set(s[0], s[1] - 1, iceE); g.set(s[0], s[1] + 1, iceE); });
    // 閉じこめられた気泡
    [[x0 + 5, y1 - 7, 2], [x1 - 6, y0 + 10, 2], [x1 - 9, y1 - 5, 1], [x0 + 11, y0 + 6, 1], [x1 - 13, y0 + 4, 1]].forEach(function (b) {
      var r = b[2];
      for (var dy = -r - 1; dy <= r + 1; dy++) for (var dx = -r - 1; dx <= r + 1; dx++) {
        var d2 = (dx) * (dx) + (dy) * (dy);
        if (d2 > (r + 0.6) * (r + 0.6) || d2 < (r - 0.6) * (r - 0.6)) continue;
        g.set(b[0] + dx, b[1] + dy, (dx <= 0 && dy <= 0) ? '#ffffff' : '#a8dcf0');
      }
    });
    // 霜の結晶（左上の角）
    var sx0 = x0 + 1, sy0 = y0 + 1;
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, -1], [1, -1], [-1, 1], [3, 0], [0, 3]].forEach(function (d) { g.set(sx0 + d[0], sy0 + d[1], '#ffffff'); });
    g.set(sx0 + 2, sy0 + 2, iceE); g.set(sx0 + 3, sy0 + 3, '#ffffff');
  }
  function glitchGrid(g, frame) {
    var c0 = g.c.slice(), W = g.w;
    for (var gy = 0; gy < g.h; gy++) {
      var band = Math.floor(gy / 4);
      var sh2 = hash(band, frame) > 0.6 ? (hash(band + 5, frame) > 0.5 ? 3 : -3) : 0;
      for (var gx = 0; gx < W; gx++) {
        var srcx = gx - sh2;
        g.c[gy * W + gx] = (srcx >= 0 && srcx < W) ? c0[gy * W + srcx] : null;
      }
    }
    // テクスチャ欠け（マゼンタと黒の市松）
    var mx0 = Math.floor(hash(frame, 77) * 20) - 14, my0 = Math.floor(hash(frame, 78) * 10) - 7;
    for (var my = 0; my < 6; my++) for (var mx = 0; mx < 8; mx++) if (g.get(mx0 + mx, my0 + my)) g.set(mx0 + mx, my0 + my, (((mx >> 1) + (my >> 1)) & 1) ? '#000000' : '#ff00ff');
    for (var q = 0; q < 30; q++) {
      var qx = Math.floor(hash(q, frame + 3) * 56) - 36, qy = Math.floor(hash(q + 40, frame) * 30) - 15;
      if (g.get(qx, qy)) g.set(qx, qy, ['#ff00ff', '#00ffff', '#ffff00', '#000000'][q & 3]);
    }
  }

  function stampArt(g, rows, x0, y0, legend) {
    for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) {
      var ch = rows[j][i];
      if (ch === '.') continue;
      g.set(x0 + i, y0 + j, legend[ch]);
    }
  }

  // 大きな丸い目（ハイライト付き）。中心は (ex, ey) の格子点（偶数幅）。look: 'fwd'(前上) 'up' 'down' 'back' 'front' 'center'
  var LOOK = { fwd: [0.6, 0.15], up: [0.15, -1], down: [0.3, 0.95], back: [-0.8, -0.3], front: [1, 0], center: [0, 0], fc: [0, 0.1], q: [0.6, 0.1] };
  var PUPIL = '#111111';
  var OPEN_EYES = { normal: 1, wide: 1, angry: 1, teary: 1, side: 1, surprised: 1, sparkle: 1, half: 1 };
  var EYE_TYPES = ['normal', 'happy', 'x', 'dizzy', 'smug', 'sleepy', 'wide', 'stone', 'angry', 'blink', 'surprised', 'annoyed', 'love', 'teary', 'sparkle', 'closed', 'side', 'calm', 'tight'];
  function drawEye(g, ex, ey, r, type, p, look, smallPupil) {
    var K = p.K;
    if (type === 'half') { // 半目（まばたき途中）：上まぶたが半分おりる
      drawEye(g, ex, ey, r, 'normal', p, look === 'fc' || look === 'q' ? 'center' : 'front', smallPupil);
      var rh = Math.ceil(r);
      for (var hy = ey - rh - 1; hy <= ey - 1; hy++) for (var hx = ex - rh - 1; hx <= ex + rh; hx++) {
        var hdx = hx + 0.5 - ex, hdy = hy + 0.5 - ey;
        if (hdx * hdx + hdy * hdy > r * r) continue;
        g.set(hx, hy, hy < ey - 1 ? p.B : K);
      }
      return;
    }
    if (type === 'shut') { // まばたきで閉じた目：まぶたの線だけ（はしが少し下がる）
      var ms = Math.max(2, Math.floor(r));
      for (var sk = -ms; sk < ms; sk++) {
        var sa = Math.abs(sk + 0.5), sy = ey + 1 + (sa > ms - 1.5 ? 1 : 0);
        g.set(ex + sk, sy, K); if (sa < ms - 1.5) g.set(ex + sk, sy - 1, K);
      }
      return;
    }
    if (type === 'tightL' || type === 'tightR') { // ぎゅっとつぶった目 > < （まぶたのふくらみは残す）
      var tr2 = r - 0.3;
      g.stamp(function (x, y) { var dx = x + 0.5 - ex, dy = y + 0.5 - ey; return dx * dx + dy * dy <= tr2 * tr2 ? p.B : null; }, K, [ex - r - 2, ey - r - 2, ex + r + 2, ey + r + 2]);
      var th = r >= 4 ? 2 : 1, sgn = type === 'tightL' ? 1 : -1; // 太い > / <（内側を向く）
      for (var tj = -th; tj <= th; tj++) {
        var tx = ex + sgn * (th - Math.abs(tj)) - (sgn > 0 ? 1 : 0);
        g.set(tx, ey + tj, K); g.set(tx - sgn, ey + tj, K);
      }
      return;
    }
    if (type === 'calm') { // 穏やかに閉じた目 ‿（下にふくらむ弧＋まつげ）
      var m1 = Math.max(2, Math.floor(r) - 1);
      for (var k1 = -m1; k1 < m1; k1++) { var a1 = Math.abs(k1 + 0.5), y1 = ey - Math.round(a1 * a1 / m1 * 0.9) + 1; g.set(ex + k1, y1, K); if (a1 < m1 - 1) g.set(ex + k1, y1 + 1, K); }
      return;
    }
    if (type === 'closed') { // にっこり閉じ ^^（白目なし）
      var m0 = Math.max(2, Math.floor(r) - 1);
      for (var k0 = -m0; k0 < m0; k0++) { var a0 = Math.abs(k0 + 0.5), y0 = ey + Math.round(a0 * 0.9) - 1; g.set(ex + k0, y0, K); g.set(ex + k0, y0 + 1, K); }
      return;
    }
    var lid = type === 'sleepy' || type === 'stone' || type === 'blink';
    var rr = type === 'wide' ? r + 0.6 : type === 'surprised' ? r + 0.9 : r;
    var base = lid ? p.B : p.W;
    g.stamp(function (x, y) {
      var dx = x + 0.5 - ex, dy = y + 0.5 - ey;
      return dx * dx + dy * dy <= rr * rr ? base : null;
    }, K, [ex - rr - 2, ey - rr - 2, ex + rr + 2, ey + rr + 2]);
    var inEye = function (x, y) { var dx = x + 0.5 - ex, dy = y + 0.5 - ey; return dx * dx + dy * dy <= rr * rr; };
    var put = function (x, y, c) { if (inEye(x, y)) g.set(x, y, c); };
    var m = Math.floor(r) - 1, k, i, j, L, pcx, pcy, px0, py0;
    if (type === 'normal' || type === 'wide' || type === 'angry' || type === 'teary' || type === 'side') {
      L = LOOK[look] || LOOK.fwd;
      if (type === 'side') L = [-1, 0.1];
      var big = type === 'teary' ? 1 : 0;
      var ps = type === 'wide' ? 2 : (smallPupil ? 2 : r >= 5.5 ? 4 : r >= 3.7 ? 3 : 2) + big;
      var off = type === 'wide' ? 0.3 : type === 'side' ? rr - ps / 2 - 0.4 : Math.max(0.5, r - ps / 2 - 1.3);
      pcx = ex + L[0] * off; pcy = ey + L[1] * off;
      px0 = R(pcx - ps / 2); py0 = R(pcy - ps / 2);
      for (j = 0; j < ps; j++) for (i = 0; i < ps; i++) put(px0 + i, py0 + j, PUPIL);
      if (ps >= 4) { put(px0, py0, p.W); put(px0 + ps - 1, py0, p.W); put(px0, py0 + ps - 1, p.W); put(px0 + ps - 1, py0 + ps - 1, p.W); } // 大きい黒目は角を丸める
      if (type === 'teary') { put(px0 + ps - 1, py0 + ps - 2, p.W); for (i = -Math.ceil(rr); i <= Math.ceil(rr); i++) { put(ex + i, ey + Math.ceil(rr) - 1, TEAR); if (g.get(ex + i, ey + Math.ceil(rr) - 2) === p.W) put(ex + i, ey + Math.ceil(rr) - 2, TEAR); } }
      if (type === 'wide') put(ex - 2, ey - 2, p.W);
      if (type === 'side') for (i = -Math.ceil(rr); i <= Math.ceil(rr); i++) { put(ex + i, ey - Math.ceil(rr) + 1, p.B); put(ex + i, ey - Math.ceil(rr) + 2, K); }
      if (type === 'angry') for (i = -Math.ceil(rr); i <= Math.ceil(rr); i++) put(ex + i, ey - Math.ceil(rr) + 1, p.B);
    } else if (type === 'surprised') {
      L = LOOK[look] || LOOK.fwd;
      pcx = ex + L[0] * 0.4; pcy = ey + L[1] * 0.4;
      px0 = R(pcx - 1); py0 = R(pcy - 1);
      put(px0, py0, PUPIL); put(px0 + 1, py0, PUPIL); put(px0, py0 + 1, PUPIL); put(px0 + 1, py0 + 1, PUPIL);
    } else if (type === 'annoyed' || type === 'smug') {
      var lidY = type === 'annoyed' ? ey : ey - 1;
      for (var y = ey - Math.ceil(rr) - 1; y <= ey + Math.ceil(rr); y++) for (var x = ex - Math.ceil(rr) - 1; x <= ex + Math.ceil(rr); x++) {
        if (!inEye(x, y)) continue;
        if (y < lidY) g.set(x, y, p.B);
        else if (y === lidY) g.set(x, y, K);
      }
      if (type === 'smug') {
        put(ex + 1, ey, PUPIL); put(ex + 2, ey, PUPIL); put(ex + 1, ey + 1, PUPIL); put(ex + 2, ey + 1, PUPIL);
        put(ex + 1, ey - 2, p.D); put(ex - 2, ey - 2, p.D);
      } else {
        for (i = -1; i <= 1; i++) { put(ex + i, ey + 1, PUPIL); put(ex + i, ey + 2, PUPIL); }
        put(ex - 1, ey + 1, p.W);
      }
    } else if (type === 'love') {
      var H = ['.RR.RR.', 'RRRRRRR', 'RWRRRRR', '.RRRRR.', '..RRR..', '...R...'];
      var hw = r >= 4.8 ? 7 : 5;
      if (hw === 5) H = ['.R.R.', 'RRRRR', 'RWRRR', '.RRR.', '..R..'];
      var hx = ex - (hw >> 1) - (hw === 7 ? 0 : 0), hy = ey - (H.length >> 1);
      for (j = 0; j < H.length; j++) for (i = 0; i < H[j].length; i++) {
        var ch = H[j][i]; if (ch === '.') continue;
        put(hx + i, hy + j, ch === 'W' ? HEART_L : HEART);
      }
    } else if (type === 'sparkle') {
      L = LOOK[look] || LOOK.fwd;
      var sr = Math.max(1.6, rr - 1.4);
      pcx = ex + L[0] * 0.5; pcy = ey + L[1] * 0.5;
      for (j = -Math.ceil(rr); j <= Math.ceil(rr); j++) for (i = -Math.ceil(rr); i <= Math.ceil(rr); i++) {
        var ddx = ex + i + 0.5 - pcx, ddy = ey + j + 0.5 - pcy;
        if (ddx * ddx + ddy * ddy <= sr * sr) put(ex + i, ey + j, ddy > sr * 0.35 ? '#3a5ab0' : SPARK_P);
      }
      var scx = R(pcx - 1), scy = R(pcy - 1);
      put(scx, scy, p.W); put(scx - 1, scy, p.W); put(scx + 1, scy, p.W); put(scx, scy - 1, p.W); put(scx, scy + 1, p.W);
      put(scx + 2, scy + 2, '#ffe14a'); put(R(pcx + 1), R(pcy + 1), p.W);
    } else if (type === 'blink') {
      for (k = -m - 1; k <= m; k++) put(ex + k, ey + (Math.abs(k + 0.5) > m - 0.5 ? 0 : 1), K);
      for (k = -m + 1; k < m - 1; k++) put(ex + k, ey - 2, p.L);
    } else if (type === 'x') {
      for (k = -m; k < m; k++) { put(ex + k, ey + k, K); put(ex + k, ey - 1 - k, K); }
    } else if (type === 'dizzy' && smallPupil) {
      var spiral = ['.KKKK.', 'K....K', 'K.KK.K', 'K..K.K', 'K.KK.K', '.K....'];
      for (j = 0; j < spiral.length; j++) for (i = 0; i < spiral[j].length; i++) {
        if (spiral[j][i] === 'K') put(ex + i - 3, ey + j - 3, K);
      }
    } else if (type === 'dizzy') {
      for (var a = 0; a < Math.PI * 4.2; a += 0.12) {
        var sr2 = 0.3 + a * (r - 1.6) / (Math.PI * 4.2);
        put(Math.floor(ex + Math.cos(a) * sr2), Math.floor(ey + Math.sin(a) * sr2), K);
      }
    } else if (type === 'happy') {
      for (k = -m; k < m; k++) { var ak = Math.abs(k + 0.5), yk = ey + Math.round(ak * 0.9); put(ex + k, yk, K); put(ex + k, yk + 1, K); }
    } else if (type === 'sleepy') {
      for (k = -m; k < m; k++) { var bk = Math.abs(k + 0.5); put(ex + k, ey - (Math.round(bk) - 2), K); }
      put(ex - m - 1, ey - (Math.round(m + 0.5) - 2) - 1, K);
    } else if (type === 'stone') {
      for (k = -m; k < m; k++) put(ex + k, ey, K);
      for (k = -m + 1; k < m - 1; k++) put(ex + k, ey + 1, p.D);
    }
  }
  function drawEyesOnGrid(g, o, p, E, isFront) {
    var type = o._eye || o.eyes || 'normal';
    if (EYE_TYPES.indexOf(type) < 0 && !o._eye) type = 'normal';
    var look = o.look || 'fwd';
    if (isFront && look === 'fwd') look = E.q ? 'q' : 'fc';
    var t2 = type === 'tight' ? 'tightL' : type, t1 = type === 'tight' ? 'tightR' : type;
    var ey2 = E.ey2 == null ? E.ey : E.ey2;
    if (E.q) { // 斜め：奥の目を先に、手前の目を重ねる
      drawEye(g, E.ex1, E.ey, E.r1 || E.r, t1, p, look, true);
      drawEye(g, E.ex2, ey2, E.r, t2, p, look, true);
    } else {
      drawEye(g, E.ex2, ey2, E.r, t2, p, look, true);
      drawEye(g, E.ex1, E.ey, E.r, t1, p, look, true);
    }
    if (o._squint && OPEN_EYES[type]) { // もぐもぐ：ほっぺに押されて下まぶたが上がる
      [[E.ex2, E.r, ey2], [E.ex1, E.q ? E.r1 || E.r : E.r, E.ey]].forEach(function (er) {
        var ex = er[0], rr = er[1], eyy = er[2], rc = Math.ceil(rr) + 2;
        for (var yy = eyy - 1; yy <= eyy + rc; yy++) for (var xx = ex - rc; xx <= ex + rc; xx++) {
          var dx = xx + 0.5 - ex, dy = yy + 0.5 - eyy, d2 = dx * dx + dy * dy;
          var lid = eyy - (Math.abs(dx) < rr * 0.45 ? 1 : 0);
          if (d2 <= rr * rr) { if (yy > lid) g.set(xx, yy, p.B); else if (yy === lid) g.set(xx, yy, p.K); }
          else if (d2 <= (rr + 1.2) * (rr + 1.2) && yy > lid + 1 && g.get(xx, yy) === p.K && g.get(xx, yy + 1) && g.get(xx, yy - 1)) g.set(xx, yy, p.B);
        }
      });
    }
    if (type === 'teary') { // こぼれる涙
      [E.ex2, E.ex1].forEach(function (ex, i) {
        if (!isFront && i === 0) return;
        var tx = ex + (isFront ? (i ? 2 : -3) : -2), ty = (i ? E.ey : ey2) + Math.ceil(E.r) + 1;
        g.set(tx, ty, TEAR); g.set(tx, ty + 1, TEAR); g.set(tx + 1, ty + 1, TEAR_D); g.set(tx, ty + 2, TEAR_D);
      });
    }
    var brows = o.brows;
    if (!brows && type === 'annoyed') brows = 'he';
    if (!brows && type === 'angry') brows = 'angry';
    if (type === 'smug' && !brows) { // 片眉
      g.line([[E.ex1 - 2, E.ey - Math.ceil(E.r) - 1], [E.ex1 - 1, E.ey - Math.ceil(E.r) - 2], [E.ex1, E.ey - Math.ceil(E.r) - 2], [E.ex1 + 1, E.ey - Math.ceil(E.r) - 2]], p.K);
    }
    if (brows && !o.wrinkles) drawBrows(g, brows, E, p.K, isFront);
  }



  // ---------- 魚人の手足（体の後ろに描く別レイヤー） ----------
  function segDist2(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
    var l2 = vx * vx + vy * vy, t = l2 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / l2)) : 0;
    var dx = wx - vx * t, dy = wy - vy * t;
    return dx * dx + dy * dy;
  }
  // 魚人：人間の腕と脚（肌色・ひじ/ひざ・指のある手・足）。体の後ろに描く別レイヤー
  var LIMB_SKIN = { B: '#f6c8a0', D: '#d89a72', L: '#ffe2c8' };
  function buildSkeleton(g, o, ph, S, splitExt) {
    var BN = '#f4ecd8', BS = '#d4c8a8', K = O;
    var cx = S.cx, ry = S.ry;
    var skx = Math.round(cx + S.rx - 8); // 頭骨の中心
    // 尾の骨
    if (splitExt == null) {
      g.stamp(function (x, y) {
        var d = S.tb - x; if (d < 0 || d > S.tl - 1) return null;
        for (var r = -3; r <= 3; r++) if (y === R(r * d * 0.34 + r * 0.3 + 0.5) - (r < 0 ? 1 : 0)) return d % 2 ? BN : BS;
        return null;
      }, K, [S.tb - S.tl - 1, -S.tl, S.tb + 1, S.tl]);
    }
    // 背骨
    var x0s = splitExt == null ? S.tb : S.tb - splitExt;
    for (var x = x0s; x <= skx - 7; x++) { g.set(x, 0, BN); g.set(x, 1, (x % 2) ? BS : BN); g.set(x, -1, K); g.set(x, 2, K); }
    for (var v = S.tb + 1; v <= skx - 8; v += 3) { g.set(v, -1, BS); g.set(v, 2, BS); }
    // 肋骨
    var n = 0;
    for (var rx = skx - 9; rx > S.tb + 3; rx -= 3) {
      var hgt = Math.max(2, R(ry * 0.8) - n);
      for (var k = 1; k <= hgt; k++) {
        var cxx = rx + R(Math.sin(k / hgt * 1.4) * 2);
        g.set(cxx, -1 - k, BN); g.set(cxx + 1, -1 - k, K);
        g.set(cxx, 2 + k, BN); g.set(cxx + 1, 2 + k, K);
      }
      n++;
    }
    for (var k2 = 1; k2 <= 5; k2++) g.set(cx - 2 - k2, -R(ry) - (k2 & 1), BS);
    // 頭骨
    var hr = ry * 0.8;
    g.stamp(function (x, y) {
      var px = x + 0.5, py = y + 0.5;
      if ((px - skx) * (px - skx) / 64 + py * py / (hr * hr) <= 1) return py > 3 ? BS : BN;
      if (x >= skx + 6 && x <= skx + 9 && y >= 1 && y <= 3) return BN;
      return null;
    }, K, [skx - 10, -hr - 2, skx + 11, hr + 2]);
    // 眼窩
    var E = eyeCenters(S, o), er = Math.min(2.7, hr * 0.38), ey = Math.round(-hr * 0.35);
    var ex = Math.min(E.ex1 - 1, skx + 3);
    for (var yy = ey - 3; yy <= ey + 2; yy++) for (var xx = ex - 3; xx <= ex + 2; xx++) {
      var dx = xx + 0.5 - ex, dy = yy + 0.5 - ey;
      if (dx * dx + dy * dy <= er * er) g.set(xx, yy, '#2a3a38');
    }
    // 顎の線・歯
    g.line([[skx + 2, 4], [skx + 3, 4], [skx + 4, 3], [skx + 5, 3], [skx + 6, 3], [skx + 7, 3], [skx + 8, 3]], K);
    g.set(skx + 6, 2, BN); g.set(skx + 8, 2, BN);
    g.line([[skx - 4, 5], [skx - 3, 5]], K);
    return g;
  }  function buildLegs(o, frame, S, legLen) {
    var p = palOf(o), K = p.K === O ? FK : p.K;
    var sk = (o.frozen || o.stone || o.white || o.burnt || o.palette || o.wrinkles) ? { B: p.F, D: p.D, L: p.L } : LIMB_SKIN;
    var ph = frame / 8 * Math.PI * 2;
    var cx = S.cx, ry = S.ry, rx = S.rx;
    var hipY = R(ry * 0.82), footY = hipY + Math.max(4, legLen); // 足裏
    var g = new Grid(80, footY + 50, 40, 34);
    g.K = K; g.keep = [];
    var segs = [], blobs = [], fingers = [];
    // 脚（太もも→ひざ→すね）。ひざは前へ曲がる
    [[cx - 5, 0], [cx + 3, Math.PI]].forEach(function (L, i) {
      var hx = L[0] + 0.5, kick = Math.sin(ph + L[1]) * 1.5, ln = footY - 3 - hipY;
      var kx = hx + 2 + kick + Math.min(3, ln * 0.06), ky = hipY + ln * 0.5, ax = hx + kick * 0.5, ay = footY - 3;
      segs.push([hx, hipY, kx, ky, ln > 10 ? 1.9 : 1.5, i], [kx, ky, ax, ay, ln > 10 ? 1.5 : 1.25, i]);
      blobs.push([ax + 2.2, footY - 1.6, 3.2, 1.5, i]); // 足（つま先は前）
    });
    // 腕（肩→ひじ→手首）
    var shF = [cx + rx * 0.5, R(ry * 0.2)], shB = [cx - rx * 0.62, R(ry * 0.05)];
    var arm = function (sh, ex, ey, hx2, hy2, up) {
      segs.push([sh[0], sh[1], ex, ey, 1.6, 2], [ex, ey, hx2, hy2, 1.4, 2]);
      blobs.push([hx2, hy2 + (up ? -1 : 1), 2.4, 2.4, 2]);
      var dx = hx2 - ex, dy = hy2 - ey, dl = Math.sqrt(dx * dx + dy * dy) || 1; dx /= dl; dy /= dl;
      for (var f = -1.5; f <= 1.5; f += 1) { var a = Math.atan2(dy, dx) + f * 0.42, bx = hx2 + Math.cos(a) * 2.4, by = hy2 + (up ? -1 : 1) + Math.sin(a) * 2.4; fingers.push([bx, by, bx + Math.cos(a) * 2.6, by + Math.sin(a) * 2.6]); }
    };
    if (o.drown) { // おぼれて両手を上げてばたばた
      var w1 = Math.sin(ph * 2) * 2, w2 = Math.sin(ph * 2 + 2) * 2, top = -R(ry) - 9;
      arm(shF, shF[0] + 6, shF[1] - 6 + w1 * 0.4, shF[0] + 8 + w1 * 0.6, top + w1, true);
      arm(shB, shB[0] - 6, shB[1] - 7 + w2 * 0.4, shB[0] - 7 + w2 * 0.6, top - 1 + w2, true);
    } else {
      var sw = Math.sin(ph) * 1;
      arm(shF, shF[0] + 4, shF[1] + 6, shF[0] + 5 + sw, shF[1] + 11, false);
      arm(shB, shB[0] - 4, shB[1] + 6, shB[0] - 5 - sw, shB[1] + 11, false);
    }
    g.stamp(function (x, y) {
      var px = x + 0.5, py = y + 0.5, i;
      for (i = 0; i < blobs.length; i++) { var b = blobs[i], dx = (px - b[0]) / b[2], dy = (py - b[1]) / b[3]; if (dx * dx + dy * dy <= 1) return dy < -0.3 ? sk.L : sk.B; }
      for (i = 0; i < fingers.length; i++) if (segDist2(px, py, fingers[i][0], fingers[i][1], fingers[i][2], fingers[i][3]) <= 0.45) return sk.B;
      for (i = 0; i < segs.length; i++) { var s2 = segs[i], r = s2[4]; if (segDist2(px, py, s2[0], s2[1], s2[2], s2[3]) <= r * r) return (s2[5] === 0 ? sk.D : (px < (s2[0] + s2[2]) / 2 - 0.3 ? sk.L : sk.B)); }
      return null;
    }, K);
    return g;
  }

  // 分裂：尾の付け根でつながった2匹（外向き）を1枚に合成
  function p0D(o) { return palOf(o).D; }
  function buildSplit(o, frame, S, gap) {
    var ext = Math.max(1, Math.ceil(gap / 2));
    var one = buildFish(merge(o, { glitch: false, frozen: false }), frame, S, ext);
    var bb = bbox(one);
    var shift = Math.floor(S.tb) - ext;    // one の x=shift が合成の x=0 に来る
    var half = Math.max(bb[2] - shift, 1) + 1;
    var g = new Grid(half * 2 + 4, one.h, half + 2, one.oy);
    g.K = one.K; g.keep = one.keep; g.keepSep = one.keepSep;
    var K = one.K;
    for (var y = bb[1]; y < bb[3]; y++) for (var x = bb[0]; x < bb[2]; x++) {
      var c = one.get(x, y); if (!c) continue;
      var X = x - shift;
      [X, -1 - X].forEach(function (cx2) {
        var cur = g.get(cx2, y);
        if (cur && cur !== K && c === K) return; // 中身が輪郭に勝つ（つなぎ目を消す）
        g.set(cx2, y, c);
      });
    }
    // のびた胴のしわ・ぴんと張った線（上下）
    var nh = R(S.ry * 0.5);
    for (var sx3 = -1; sx3 <= 1; sx3 += 2) for (var k3 = 0; k3 < 3; k3++) {
      g.set(sx3 * (3 + k3 * 3) - (sx3 < 0 ? 1 : 0), -nh + 2, p0D(o));
    }
    [[-1, -nh - 3], [-1, -nh - 4], [-5, -nh - 3], [-6, -nh - 4], [4, -nh - 3], [5, -nh - 4], [-1, nh + 4], [-1, nh + 5], [-5, nh + 4], [-6, nh + 5], [4, nh + 4], [5, nh + 5]].forEach(function (q) { if (!g.get(q[0], q[1])) g.set(q[0], q[1], '#ffffff'); });
    if (o.frozen) addIce(g);
    if (o.glitch) glitchGrid(g, frame);
    return g;
  }

  // ===================== 追加の死因（管で描く体・竜・ステッカーなど） =====================
  var GOLD_S = '#ffd860', GOLD_D = '#e0a828';

  // 尾びれ（buildFish と同じ形）を付け根 (tb, ty) から左へ描く
  function stampTail(g, tb, ty, tl, hp, pht, p, K) {
    var dL = tl * 0.6, yL = tl * 0.36 * (1 + 0.07 * Math.sin(pht + 1)), rL = tl * 0.41 * (1 + 0.05 * Math.sin(pht));
    var hp0 = hp + 0.3;
    g.stamp(function (x, y) {
      var d = tb - (x + 0.5); if (d < -1.5 || d > tl + 2) return null;
      var k = Math.max(0, d) / tl;
      var wv = Math.sin(pht - k * 2.4) * 2.0 * k * k;
      var yy = y + 0.5 - ty - wv;
      var ins = false;
      if (d <= dL) { var hw = hp0 + (yL + rL * 0.62 - hp0) * Math.pow(Math.max(0, d) / dL, 0.9); ins = Math.abs(yy) <= hw; }
      if (!ins) { var ex = d - dL, e1 = yy - yL, e2 = yy + yL; ins = ex * ex + e1 * e1 <= rL * rL || ex * ex + e2 * e2 <= rL * rL; }
      if (!ins) return null;
      if (d < 1.5) return p.B;
      var a = Math.atan2(yy, d + 2) * 6 / Math.PI + 20;
      if (d > 3 && (a % 1) < 0.28) return p.L;
      return p.F;
    }, K, [tb - tl - 4, ty - tl - 6, tb + 2, ty + tl + 6]);
  }

  // 制御点 → 等間隔に近い点列（Catmull-Rom）。各点に s（道のり）f（0..1）t（接線）n（上向きの法線）
  function pathSamples(ctrl, step) {
    var pts = [], i, n = ctrl.length;
    for (i = 0; i < n - 1; i++) {
      var p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n - 1, i + 2)];
      var len = Math.sqrt((p2[0] - p1[0]) * (p2[0] - p1[0]) + (p2[1] - p1[1]) * (p2[1] - p1[1])), m = Math.max(2, Math.ceil(len / step));
      for (var j = 0; j < m; j++) {
        var t = j / m, t2 = t * t, t3 = t2 * t;
        pts.push({
          x: 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          y: 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        });
      }
    }
    pts.push({ x: ctrl[n - 1][0], y: ctrl[n - 1][1] });
    var s = 0;
    for (i = 0; i < pts.length; i++) {
      if (i) { var ddx = pts[i].x - pts[i - 1].x, ddy = pts[i].y - pts[i - 1].y; s += Math.sqrt(ddx * ddx + ddy * ddy); }
      pts[i].s = s;
    }
    for (i = 0; i < pts.length; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      var tx = b.x - a.x, ty = b.y - a.y, tl = Math.sqrt(tx * tx + ty * ty) || 1;
      tx /= tl; ty /= tl;
      var nx = ty, ny = -tx; if (ny > 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }
      pts[i].tx = tx; pts[i].ty = ty; pts[i].nx = nx; pts[i].ny = ny; pts[i].f = pts[i].s / (s || 1);
    }
    return pts;
  }

  // 太さ q.r・重なり順 q.z の管。自分と重なる所（s の差 > thr）には輪郭線、外周にも輪郭
  function tube(g, pts, colFn, K, thr, shade) {
    var W = g.w, H = g.h, N = W * H, i, k;
    var bz = new Float32Array(N), bd = new Float32Array(N), bi = new Int32Array(N);
    for (k = 0; k < N; k++) { bz[k] = -1e9; bi[k] = -1; }
    for (i = 0; i < pts.length; i++) {
      var q = pts[i], r = q.r, z = q.z || 0, rc = Math.ceil(r) + 1, x0 = Math.floor(q.x), y0 = Math.floor(q.y);
      for (var dy = -rc; dy <= rc; dy++) for (var dx = -rc; dx <= rc; dx++) {
        var px = x0 + dx, py = y0 + dy, ex = px + 0.5 - q.x, ey = py + 0.5 - q.y, d2 = ex * ex + ey * ey;
        if (d2 > r * r) continue;
        var gx = px + g.ox, gy = py + g.oy; if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue;
        k = gy * W + gx;
        if (z > bz[k] + 1e-6 || (z > bz[k] - 1e-6 && d2 < bd[k])) { bz[k] = z; bd[k] = d2; bi[k] = i; }
      }
    }
    var out = new Array(N);
    for (k = 0; k < N; k++) {
      if (bi[k] < 0) continue;
      var q2 = pts[bi[k]], lx = (k % W) - g.ox, ly = ((k / W) | 0) - g.oy;
      var v = ((lx + 0.5 - q2.x) * q2.nx + (ly + 0.5 - q2.y) * q2.ny) / q2.r;
      out[k] = colFn(v, q2, lx, ly);
    }
    for (k = 0; k < N; k++) {
      if (bi[k] < 0) continue;
      var x = k % W, sA = pts[bi[k]].s, zA = bz[k], nb = [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, k - W, k + W];
      for (var j = 0; j < 4; j++) {
        var m = nb[j]; if (m < 0 || m >= N || bi[m] < 0) continue;
        var sB = pts[bi[m]].s;
        if (Math.abs(sA - sB) > thr && (zA < bz[m] - 1e-6 || (Math.abs(zA - bz[m]) < 1e-6 && sA < sB))) { out[k] = K; break; }
      }
    }
    if (shade) { // 下になる側に影
      var sh = out.slice();
      for (k = 0; k < N; k++) {
        if (bi[k] < 0 || out[k] !== K) continue;
        var sk = pts[bi[k]].s;
        for (var d2y = -2; d2y <= 2; d2y++) for (var d2x = -2; d2x <= 2; d2x++) {
          var mm = k + d2y * W + d2x; if (mm < 0 || mm >= N || bi[mm] < 0 || out[mm] === K) continue;
          if (Math.abs(pts[bi[mm]].s - sk) < thr && bz[mm] < 0.5) sh[mm] = shade;
        }
      }
      out = sh;
    }
    for (k = 0; k < N; k++) {
      if (bi[k] >= 0) { g.c[k] = out[k]; continue; }
      var x2 = k % W;
      if ((x2 > 0 && bi[k - 1] >= 0) || (x2 < W - 1 && bi[k + 1] >= 0) || (k >= W && bi[k - W] >= 0) || (k + W < N && bi[k + W] >= 0)) g.c[k] = K;
    }
    g._bb = null;
  }

  // ---- 結んじゃった：胴がひと結び。頭と尾が飛び出す ----
  var knotBody = {}, knotBodyN = 0;
  function buildKnot(o, frame, S, tframe) {
    var p = palOf(o), K = p.K;
    var bkey = [p.B, p.D, p.L, p.P, p.F, K, S.ry, S.tl, frame, tframe].join('|');
    var g0 = knotBody[bkey], g;
    if (!g0) { if (knotBodyN > 40) { knotBody = {}; knotBodyN = 0; } g0 = knotBody[bkey] = buildKnotBody(p, K, frame, S, tframe); knotBodyN++; }
    g = new Grid(g0.w, g0.h, g0.ox, g0.oy); g.c = g0.c.slice();
    g.K = K; g.keep = [PUPIL]; g.keepSep = p.W;
    var rh = S.ry * 0.84, hq = g0.head, hx = hq[0], hy = hq[1], er = S.er;
    var ex1 = R(hx + rh - er + 0.6), E = { ex1: ex1, ex2: ex1 - R(2 * er + 0.36 * rh), ey: R(hy - rh * 0.4), r: er, front: R(hx + rh) };
    E.ey2 = E.ey + 1;
    gillLine(g, E.ex2 - er - 2.2, E.ey2 - 0.5, R(hy + rh * 0.5), p, K);
    drawEyesOnGrid(g, o, p, E, false);
    putMouth(g, mouthOf(o), R(hx + rh * 0.44), R(hy + rh * 0.26) + 1, false, p, K);
    return g;
  }
  function buildKnotBody(p, K, frame, S, tframe) {
    var g = new Grid(100, 80, 50, 40);
    var ph = frame / 8 * Math.PI * 2, pht = (tframe == null ? frame : tframe) / 8 * Math.PI * 2;
    g.K = K;
    var k0 = S.ry / 10.3;
    var ctrl = [[-20, 6], [-11, 6], [-3, 4], [5, -2], [8, -9], [3, -15], [-4, -14], [-8, -8], [-6, -1], [0, 4], [8, 7], [15, 6], [22, 3]];
    var pts = pathSamples(ctrl, 0.5);
    var rb = 4.3 * k0, rh = S.ry * 0.84; // 頭は v15 の魚と同じくらいの大きさ
    pts.forEach(function (q) {
      var f = q.f;
      q.r = f < 0.07 ? 2.8 + (rb - 2.8) * f / 0.07 : f > 0.84 ? rb + (rh - rb) * Math.min(1, Math.pow((f - 0.84) / 0.14, 0.7)) : rb;
      q.z = (f > 0.66 && f < 0.92) ? 1 : 0;
    });
    stampTail(g, -19, 6, S.tl * 0.85, 2.6, pht, p, K);
    // 背びれ（ループのてっぺん）
    var dw = Math.sin(ph) * 1;
    var dors = [[6, -16], [4 + dw, -22], [-1 + dw, -23], [-5, -17]];
    g.stamp(function (x, y) { return inPoly(x + 0.5, y + 0.5, dors) ? (((x - y + 60) % 3 === 0) ? p.L : p.F) : null; }, K, [-8, -26, 9, -12]);
    tube(g, pts, function (v, q) {
      if (v > 0.66) return p.D;
      if (v < -0.32) return p.P;
      if (v > 0.18 && v < 0.44 && ((q.s | 0) % 7) < 3) return p.L;
      return p.B;
    }, K, 12, p.D);
    // 胸びれ
    g.stamp(function (x, y) { var dx = x + 0.5 - 13, dy = y + 0.5 - 12; return dx * dx / 7 + dy * dy / 3 <= 1 ? p.F : null; }, K, [8, 9, 18, 15]);
    thicken(g, K);
    var hq = pts[pts.length - 1];
    // 締めつけのしわ
    g.line([[-2, -3], [-1, -2]], p.D); g.line([[2, 8], [3, 9]], p.D);
    g.head = [hq.x, hq.y];
    return g;
  }

  // ---- ぺらぺら：正面顔を横1.6倍に平たくしたステッカー（白ふち・めくれた角） ----
  function buildFlat(o, S) {
    var p = palOf(o);
    var g0 = buildFront(merge(o, { flat: false, front: true }), 0, S, 0);
    for (var i = 0; i < g0.c.length; i++) if (g0.c[i] === p.D) g0.c[i] = p.B;
    // 目は伸ばさずに描き直す
    var er = S.er * 1.02, esp = Math.round(er + 0.4), eyy = Math.round(-S.ry * 0.3), K0 = g0.K;
    [esp, -esp].forEach(function (ex) { for (var yy = eyy - 7; yy <= eyy + 7; yy++) for (var xx = ex - 7; xx <= ex + 7; xx++) { var dx = xx + 0.5 - ex, dy = yy + 0.5 - eyy, c = g0.get(xx, yy); if (c && dx * dx + dy * dy <= (er + 1.6) * (er + 1.6)) g0.set(xx, yy, c === K0 && dx * dx + dy * dy > (er + 1) * (er + 1) ? K0 : p.B); } });
    g0._bb = null;
    var sq = squeeze(g0, 1.6, 0.85, 0, 0), K = sq.K, bb = bbox(sq);
    sq._bb = null;
    [esp, -esp].forEach(function (ex) { drawEye(sq, R(ex * 1.6), R(eyy * 0.85), er, o.eyes || 'x', p, 'fc'); });
    bb = bbox(sq);
    var g = new Grid(bb[2] - bb[0] + 10, bb[3] - bb[1] + 10, -bb[0] + 5, -bb[1] + 5);
    for (var y = bb[1]; y < bb[3]; y++) for (var x = bb[0]; x < bb[2]; x++) { var c = sq.get(x, y); if (c) g.set(x, y, c); }
    var WH = '#ffffff', ED = '#8aaab4';
    for (var pass = 0; pass < 2; pass++) {
      var c0 = g.c.slice(), Wd = g.w;
      for (var k = 0; k < c0.length; k++) {
        if (c0[k]) continue;
        var xx = k % Wd, hit = false;
        for (var dy = -1; dy <= 1 && !hit; dy++) for (var dx = -1; dx <= 1; dx++) {
          if (xx + dx < 0 || xx + dx >= Wd) continue;
          var m = k + dy * Wd + dx; if (m >= 0 && m < c0.length && c0[m]) { hit = true; break; }
        }
        if (hit) g.c[k] = WH;
      }
    }
    var c1 = g.c.slice(), W1 = g.w;
    for (var k2 = 0; k2 < c1.length; k2++) {
      if (c1[k2]) continue;
      var x1 = k2 % W1;
      if ((x1 > 0 && c1[k2 - 1]) || (x1 < W1 - 1 && c1[k2 + 1]) || c1[k2 - W1] || c1[k2 + W1]) g.c[k2] = ED;
    }
    // 右下の角がめくれる（折り返しは裏の白）
    g._bb = null; var b2 = bbox(g), cc = b2[2] + b2[3] - 15, flap = [];
    for (y = b2[1]; y < b2[3]; y++) for (x = b2[0]; x < b2[2]; x++) if (x + y > cc && g.get(x, y)) { flap.push([cc - y, cc - x]); g.set(x, y, null); }
    flap.forEach(function (q) { g.set(q[0], q[1], '#e4ecee'); });
    flap.forEach(function (q) {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = q[0] + d[0], ny = q[1] + d[1]; if (nx + ny > cc - 0.5 || !g.get(nx, ny)) { if (nx + ny <= cc) { if (!g.get(nx, ny)) g.set(nx, ny, ED); } } });
    });
    for (x = b2[0]; x < b2[2]; x++) { var yy = cc - x; if (g.get(x, yy) === '#e4ecee' || g.get(x, yy)) g.set(x, yy, ED); }
    g.K = ED; g.keep = [PUPIL];
    return g;
  }

  // ---- ガラスに刺さった：頭から前を消し、ガラス面を描く ----
  function stuckCut(g, S, p, K) {
    var cut = S.cx - 1, Ry = Math.ceil(S.ry) + 9;
    for (var y = -g.oy; y < g.h - g.oy; y++) for (var x = cut; x < g.w - g.ox; x++) g.set(x, y, null);
    for (y = -Ry; y <= Ry; y++) {
      var c = g.get(cut - 1, y);
      if (c && c !== K) g.set(cut - 1, y, p.D);
      var c2 = g.get(cut - 2, y);
      if (c && c !== K && c2 && c2 !== K && (y & 1)) g.set(cut - 2, y, p.D);
      g.set(cut, y, (y & 3) === 1 ? '#dff8ff' : '#ffffff'); g.set(cut + 1, y, 'rgba(200,240,255,0.6)');
    }
    g._bb = null;
  }

  // ---- 竜（金魚の頭と尾の面影、長い蛇体・たてがみ・角・ひげ・小さな手足） ----
  var dragonCache = {};
  function buildDragon(frame, col) {
    col = COLORS[col] ? col : 'orange';
    var dk = col + frame;
    if (dragonCache[dk]) return dragonCache[dk];
    var g = new Grid(170, 100, 90, 52);
    var p = col === "orange" ? PAL.normal : PAL[col], AC = ACCENT[col], K = FK, ph = frame / 8 * Math.PI * 2;
    g.K = K; g.keep = [PUPIL]; g.keepSep = p.W;
    var ctrl = [];
    for (var xx = -54; xx <= 26; xx += 4) {
      var k = (26 - xx) / 80;
      ctrl.push([xx, Math.sin(xx * 0.085 + ph) * (1.5 + 5.5 * k) + 2 * k]);
    }
    var pts = pathSamples(ctrl, 0.6);
    pts.forEach(function (q) { q.r = 2.2 + 5.6 * Math.pow(q.f, 0.5); q.z = 0; });
    var tail = pts[0], neck = pts[pts.length - 1], yN = neck.y;
    var at = function (f) { return pts[Math.min(pts.length - 1, Math.max(0, Math.round(f * (pts.length - 1))))]; };
    // 尾（金魚の二つの房・金色）
    stampTail(g, R(tail.x) + 1, R(tail.y), 13, 1.8, ph * 1.3, { B: '#ffc23a', F: '#ffb428', L: '#fff07a' }, K);
    // 背中のとげ（たてがみの続き）
    var spikes = [];
    for (var i = 10; i < pts.length - 8; i += 9) {
      var q = pts[i], bx = q.x + q.nx * q.r * 0.6, by = q.y + q.ny * q.r * 0.6, h = 3 + 3.5 * q.f;
      spikes.push([[bx + q.tx * 2.4, by + q.ty * 2.4], [bx - q.tx * 2.4, by - q.ty * 2.4], [bx + q.nx * h - q.tx * 2.8, by + q.ny * h - q.ty * 2.8]]);
    }
    g.stamp(function (x, y) { for (var j = 0; j < spikes.length; j++) if (inPoly(x + 0.5, y + 0.5, spikes[j])) return ((x + y) & 1) ? AC[0] : AC[1]; return null; }, K, [-62, -30, 30, 20]);
    // 手足
    var legs = [[0.33, 0], [0.83, 2]];
    var leg = function (f, far, sw) {
      var q = at(f), hx0 = q.x - q.nx * q.r * 0.4 + (far ? -3 : 0), hy0 = q.y - q.ny * q.r * 0.4 + (far ? -1 : 0);
      var fx = hx0 + 2.5 + sw, fy = hy0 + q.r * 0.6 + 5.5;
      var col = far ? p.D : p.B;
      g.stamp(function (x, y) {
        var px = x + 0.5, py = y + 0.5;
        if (segDist2(px, py, hx0, hy0, fx, fy) <= 2.6) return col;
        var dx = px - (fx + 1), dy = py - (fy + 0.6); if (dx * dx / 5 + dy * dy / 2 <= 1) return col;
        return null;
      }, K, [hx0 - 4, hy0 - 3, fx + 6, fy + 4]);
      for (var c = 0; c < 3; c++) g.set(R(fx) + c * 2, R(fy) + 2, '#ffffff');
    };
    legs.forEach(function (L, j) { leg(L[0], true, R(Math.sin(ph + j + 1.6) * 1.2)); });
    // 胴（オレンジのうろこ・金の腹板）
    tube(g, pts, function (v, q2) {
      if (v < -0.3) return ((q2.s % 2.8) < 0.8) ? GOLD_D : GOLD_S;
      if (v > 0.72) return p.D;
      var ux = q2.s / 3, uy = v * q2.r / 2.4 + (Math.floor(ux) & 1) * 0.5, fx2 = ux - Math.floor(ux), fy2 = uy - Math.floor(uy);
      if (fy2 < 0.28 && fx2 > 0.2 && fx2 < 0.8) return p.D;
      if (fy2 > 0.7 && fx2 < 0.35) return v > 0.1 ? '#ffe070' : p.L;
      return p.B;
    }, K, 10);
    legs.forEach(function (L, j) { leg(L[0], false, R(Math.sin(ph + j) * 1.2)); });
    // たてがみ（頭のうしろに流れる炎）
    var hx = R(neck.x + 7), hy = R(yN - 1);
    var tufts = [];
    for (var m = 0; m < 7; m++) { var dyy = -10 + m * 3.2; tufts.push([hx - 10 - Math.abs(dyy) * 0.2, hy + dyy + Math.sin(ph * 2 + m) * 1, 7.5 - Math.abs(m - 3) * 0.5, 2.3, dyy * 0.06]); }
    g.stamp(function (x, y) {
      for (var j = 0; j < tufts.length; j++) {
        var T = tufts[j], c = Math.cos(T[4]), s = Math.sin(T[4]), dx = x + 0.5 - T[0], dy = y + 0.5 - T[1];
        var u = c * dx + s * dy, v = -s * dx + c * dy, w = T[3] * (u < 0 ? (1 + u / T[2]) : 1);
        if (Math.abs(u) <= T[2] && Math.abs(v) <= Math.max(0.6, w)) return v < 0 ? AC[2] : AC[1];
      }
      return null;
    }, K, [hx - 24, hy - 15, hx - 1, hy + 14]);
    // 頭（v15 の金魚の頭：まんまる・前に飛び出す白い大目2つ・赤いくちびる・クリーム色のあご）
    var hr = 9.5;
    var inA = function (px, py) { var a = (px - hx) / hr, b = (py - hy) / (hr * 0.95); return a * a + b * b <= 1; };
    g.stamp(function (x, y) {
      var px = x + 0.5, py = y + 0.5;
      if (!inA(px, py)) return null;
      if (py > hy + hr * 0.42 + (px - hx) * 0.12) return p.P;
      return p.B;
    }, FK, [hx - 11, hy - 11, hx + 11, hy + 11]);
    // 角（2本・金）
    var horns = [[hx - 3, hy - 7, hx - 7, hy - 14], [hx - 7, hy - 14, hx - 11, hy - 16], [hx - 6, hy - 12, hx - 4, hy - 16],
      [hx + 1, hy - 8, hx - 1.5, hy - 15], [hx - 1.5, hy - 15, hx - 4.5, hy - 18.5], [hx - 1, hy - 13, hx + 1.5, hy - 16.5]];
    g.stamp(function (x, y) {
      for (var j = 0; j < horns.length; j++) { var h2 = horns[j]; if (segDist2(x + 0.5, y + 0.5, h2[0], h2[1], h2[2], h2[3]) <= 0.9) return (j < 3) ? '#e8b030' : '#ffd84a'; }
      return null;
    }, FK, [hx - 14, hy - 21, hx + 6, hy - 6]);
    g.set(hx - 11, hy - 17, '#fff4a0'); g.set(hx - 5, hy - 19, '#fff4a0');
    // えら・目・くちびる・怒り眉
    var der = 3.9, dex1 = R(hx + hr - der + 0.8), dex2 = dex1 - R(2 * der + 3), dey = R(hy - 3.5);
    gillLine(g, dex2 - der - 2, dey + 1, R(hy + 5), p, FK);
    var dp = { B: p.B, D: p.D, L: p.L, W: p.W, K: FK };
    drawEye(g, dex2, dey + 1, der, 'normal', dp, 'fwd'); drawEye(g, dex1, dey, der, 'normal', dp, 'fwd');
    g.line([[dex2 - 3, dey - 6], [dex2 - 2, dey - 6], [dex2 - 1, dey - 5], [dex2, dey - 5], [dex2 + 1, dey - 4]], FK);
    g.line([[dex1 - 2, dey - 6], [dex1 - 1, dey - 6], [dex1, dey - 5], [dex1 + 1, dey - 5], [dex1 + 2, dey - 4]], FK);
    putMouth(g, '0', R(hx + hr * 0.5), R(hy + 3.5), false, p, FK);
    g.set(dex2, dey + 6, BLUSH); g.set(dex2 + 1, dey + 6, BLUSH);
    thicken(g, K);
    // ひげ（2本、ゆらゆら）
    for (var w = 0; w < 2; w++) for (var kk = 0; kk < 16; kk++) {
      var wx = hx + 10 + kk * (w ? 0.8 : 1.0), wy = hy + 3 + w * 2 + kk * 0.55 + Math.sin(kk * 0.45 - ph * 1.5 + w) * 1.6 * (kk / 16);
      g.set(R(wx), R(wy) + 1, K); g.set(R(wx), R(wy), w ? '#ffe890' : '#fff4c0');
    }
    g._bb = null;
    dragonCache[dk] = g;
    return g;
  }
  function dragonBlit(ctx, x, y, t, dir, sc, rot, flip, col) {
    var g = buildDragon(Math.floor((+t || 0) * 8) & 7, col);
    blit(ctx, g, x, y, { mirror: dir < 0, flip: !!flip, rot: rot || 0, scale: sc || 1, offx: -6, offy: 0 });
  }
  // 竜（約 120x50。dir<0 で左向き）
  function drawDragon(ctx, x, y, t, dir, color) { dragonBlit(ctx, x, y, t, dir, 1, 0, false, color); }

  // ---- 人間不信：砂に潜って目だけ出す。y は砂面 ----
  var hermitCache = {};
  function buildHermit(look, sink, flick) {
    var key = look + '|' + sink + '|' + flick;
    if (hermitCache[key]) return hermitCache[key];
    var g = new Grid(48, 30, 24, 20), K = '#8a5228', p = PAL.normal;
    // しっぽ（ときどきぴくっ）
    if (flick) g.stamp(function (x, y) {
      var dx = x + 0.5 - 15, dy = y + 0.5 + 4;
      return (dx * dx / 5 + (dy + 2) * (dy + 2) / 3 <= 1 || dx * dx / 5 + (dy - 1.5) * (dy - 1.5) / 3 <= 1) && dx > -1.5 ? p.F : null;
    }, O, [11, -10, 20, 0]);
    // 目とおでこ（穴のふちより上だけ）
    var e = new Grid(48, 30, 24, 20), sy = sink;
    // 背びれの先（すじ入り）がのぞく
    stampDorsalV15(e, 1, -14 + sy, 6, 0.9, 0, p, FK);
    e.stamp(function (x, y) { var dx = (x + 0.5) / 9, dy = (y + 0.5 + 9 - sy) / 6; return dx * dx + dy * dy <= 1 ? (y + 0.5 + 9 - sy < -3 ? p.L : p.B) : null; }, FK, [-11, -18, 11, 0]);
    var ep = { B: p.B, D: p.D, L: p.L, W: p.W, K: FK };
    [-4, 5].forEach(function (ex) {
      drawEye(e, ex, -11 + sy, 4.1, 'normal', ep, look);
      for (var i = -5; i <= 5; i++) for (var ly = -16; ly <= -14; ly++) { var cc = e.get(ex + i, ly + sy); if (cc === p.W || cc === PUPIL) e.set(ex + i, ly + sy, p.B); }
      for (var j = -4; j <= 3; j++) { var c3 = e.get(ex + j, -13 + sy); if (c3) e.set(ex + j, -13 + sy, FK); }
    });
    // 砂の小山
    g.stamp(function (x, y) {
      var px = x + 0.5, py = y + 0.5;
      if (py > 3) return null;
      var dx = px / 15, dy = (py + 0.5) / 8.5;
      if (py <= 0.5 && dx * dx + dy * dy > 1) return null;
      if (py > 0.5 && Math.abs(px) > 15 + py * 2.5) return null;
      var hv = hash(x + 50, y + 50);
      if (hv > 0.86) return SAND_D;
      if (hv < 0.07) return '#ffd8a0';
      return (py < -4 && px < 3) ? '#f8c488' : SAND;
    }, K, [-24, -12, 24, 3]);
    for (var x = -24; x < 24; x++) for (var y = 1; y <= 4; y++) if (g.get(x, y) === K) g.set(x, y, null);
    var rimY = -8;
    for (var yy = -20; yy < rimY; yy++) for (var xx = -12; xx <= 12; xx++) { var c = e.get(xx, yy); if (c) g.set(xx, yy, c); }
    // 穴のふち
    for (var k = -8; k <= 8; k++) { g.set(k, rimY, Math.abs(k) > 6 ? K : '#6a3a18'); g.set(k, rimY + 1, Math.abs(k) > 7 ? SAND_D : '#a86a3a'); }
    g.set(-9, rimY + 1, K); g.set(9, rimY + 1, K);
    g.K = K; g.keep = [PUPIL];
    hermitCache[key] = g;
    return g;
  }
  var hermitSand;
  function hermitMound() {
    if (hermitSand) return hermitSand;
    var g = new Grid(52, 17, 26, 5);
    for (var x = -26; x < 26; x++) {
      var top = R(-4 + 12 * Math.pow(Math.abs(x + 0.5) / 26, 2));
      for (var y = top; y < 12; y++) {
        var hv = hash(x + 50, y + 50);
        g.set(x, y, y === top ? '#8a5228' : hv > 0.88 ? SAND_D : hv < 0.08 ? '#ffd8a0' : SAND);
      }
    }
    return (hermitSand = g);
  }
  function drawHermit(ctx, x, y, t) {
    t = +t || 0; x = R(x); y = R(y);
    var c = ((t % 5) + 5) % 5, look = 'back', sink = 0;
    if (c < 1.2) look = 'back'; else if (c < 2.4) look = 'front'; else if (c < 3.0) look = 'center';
    else if (c < 3.4) { look = 'center'; sink = R((c - 3.0) / 0.4 * 8); }
    else if (c < 4.2) sink = 8;
    else { sink = R((5 - c) / 0.8 * 8); look = 'front'; }
    var flick = (Math.floor(t * 3) % 5) === 0 ? 1 : 0;
    blit(ctx, buildHermit(look, sink, flick), x, y - 1);
    if (c >= 3.0 && c < 3.6) for (var i = 0; i < 4; i++) { var a = (c - 3.0) * 5; rect(ctx, x - 6 + i * 4, y - 10 - R(Math.sin(a + i) * 3), 1, 1, SAND_D); }
  }

  // ---- 天使の羽・光る輪 ----
  var WING = art([
    'oo..........',
    'oWoo........',
    'oWWWoo......',
    '.oWWWWoo....',
    '.oWsWWWWoo..',
    '..oWWsWWWWo.',
    '..oWsWWsWWWo',
    '...oWWsWWWWo',
    '....ooWWsWWo',
    '......ooWWo.',
    '........oo..'], { o: '#5a7a8a', W: '#ffffff', s: '#cfdde6' });
  var WINGF = [0, 0.25, 0.5, 0.3, 0.05, -0.2];
  function drawWings(ctx, x, y, o, sc, S, t, info) {
    var flap = WINGF[Math.floor((+t || 0) * 12) % 6], s = sc * 1.7;
    var a0 = ctx.globalAlpha;
    if (info.front) {
      blit(ctx, WING, R(x - (S.ry * 0.9) * sc), R(y - 2 * sc), { rot: -flap, offx: 5, offy: 4, scale: s });
      blit(ctx, WING, R(x + (S.ry * 0.9) * sc), R(y - 2 * sc), { rot: flap, offx: 5, offy: 4, scale: s, mirror: true });
      return;
    }
    var dir = info.mirror ? -1 : 1;
    var rx = x + dir * ((S.cx - 2) - S.vc) * sc * info.fx, ry = y + (o.flip ? 1 : -1) * (S.ry + 1) * sc;
    ctx.globalAlpha = a0 * 0.75;
    blit(ctx, WING, R(rx + dir * 5 * sc), R(ry), { rot: dir * (flap - 0.25), offx: 5, offy: 4, scale: s * 0.9, mirror: dir < 0, flip: !!o.flip });
    ctx.globalAlpha = a0;
    blit(ctx, WING, R(rx), R(ry), { rot: dir * (flap - 0.85), offx: 5, offy: 4, scale: s, mirror: dir < 0, flip: !!o.flip });
  }
  function drawHalo(ctx, x, y, s, t) {
    x = R(x); y = R(y + Math.sin((+t || 0) * 3) * 1.2);
    var rx = Math.max(4, 6.5 * s), ry = Math.max(1.6, 2.2 * s);
    ellipse(ctx, x, y, rx + 3, ry + 2.5, 'rgba(255,240,140,0.22)');
    for (var dy = -Math.ceil(ry) - 1; dy <= Math.ceil(ry) + 1; dy++) for (var dx = -Math.ceil(rx) - 1; dx <= Math.ceil(rx) + 1; dx++) {
      var ax = (dx + 0.5) / (rx + 1), ay = (dy + 0.5) / (ry + 1), e1 = ax * ax + ay * ay;
      if (e1 > 1) continue;
      var bx = (dx + 0.5) / (rx - 1.6), by = (dy + 0.5) / Math.max(0.6, ry - 1.1);
      if (bx * bx + by * by <= 1) continue;
      rect(ctx, x + dx, y + dy, 1, 1, e1 > 0.72 ? '#b88a10' : dy < 0 ? '#fff6b0' : '#ffe14a');
    }
  }

  // ---- 魂（半透明の魚のおばけ、しっぽは煙） ----
  var SOUL = [0, 1, 2, 3].map(function (fr) {
    var g = new Grid(44, 30, 24, 15), ph = fr / 4 * Math.PI * 2;
    var Wc = '#ffffff', Wd = '#dff2fa', Ok = '#8ab8d0';
    g.stamp(function (x, y) {
      var px = x + 0.5, py = y + 0.5;
      var hx = px - 5, hy = py; if (hx * hx + hy * hy <= 44) return hy > 2.5 ? Wd : Wc;
      if (px < 5 && px > -16) {
        var k = (5 - px) / 21, yc = Math.sin(k * 6 + ph) * 2.4 * k, hw = 6.6 * Math.pow(1 - k, 0.8);
        if (Math.abs(py - yc) <= hw) return (py - yc) > hw * 0.4 ? Wd : Wc;
      }
      var tx = px + 17, ty = py - Math.sin(6 + ph) * 2.4; if (tx * tx + ty * ty <= 2.2) return Wd;
      if (px > 0 && px < 4 && py < -5 && py > -9 + Math.abs(px - 2) * 0.8) return Wc;
      return null;
    }, Ok);
    var E2 = '#5a7a90';
    [[3, -2], [8, -2]].forEach(function (e) { g.set(e[0] - 1, e[1], E2); g.set(e[0], e[1] + 1, E2); g.set(e[0] + 1, e[1] + 1, E2); g.set(e[0] + 2, e[1], E2); });
    g.set(10, 3, E2); g.set(11, 3, E2); g.set(10, 4, E2); g.set(11, 4, E2);
    g.set(3, 2, '#ffc8d0'); g.set(4, 2, '#ffc8d0');
    g.K = Ok; g.keep = [E2];
    return g;
  });
  function drawSoul(ctx, x, y, t, s) {
    t = +t || 0; s = s || 1;
    var a0 = ctx.globalAlpha, fr = Math.floor(t * 4) & 3;
    var px = R(x + Math.sin(t * 1.3) * 2 * s), py = R(y + Math.sin(t * 2.2) * 2 * s);
    ctx.globalAlpha = a0 * 0.5;
    for (var i = 0; i < 5; i++) { var ph = (t * 0.8 + i / 5) % 1; disc(ctx, px - (18 + ph * 10) * s, py + Math.sin(ph * 6 + i) * 3 * s - ph * 4 * s, Math.max(0.6, (2.2 - ph * 1.6) * s), '#ffffff'); }
    ctx.globalAlpha = a0 * 0.72;
    blit(ctx, SOUL[fr], px, py, s !== 1 ? { scale: s } : null);
    ctx.globalAlpha = a0;
  }

  // ---- ガラスのひび / 顔の跡 / 巨大な顔 / スポットライト ----
  function drawCrack(ctx, x, y, size) {
    size = size || 1; x = R(x); y = R(y);
    var pts = [], i, d;
    var ray = function (a, L, seed) {
      for (d = 1; d <= L; d++) {
        var jit = (hash(seed * 13 + (d >> 2), 5) - 0.5) * 1.6;
        pts.push([R(Math.cos(a) * d - Math.sin(a) * jit), R(Math.sin(a) * d + Math.cos(a) * jit)]);
      }
    };
    for (i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2 + hash(i, 7) * 0.5, L = (7 + hash(i, 3) * 9) * size;
      ray(a, L, i);
      var b0 = L * 0.5, bx = Math.cos(a) * b0, by = Math.sin(a) * b0, a2 = a + (hash(i, 11) > 0.5 ? 0.7 : -0.7);
      for (d = 1; d <= L * 0.4; d++) pts.push([R(bx + Math.cos(a2) * d), R(by + Math.sin(a2) * d)]);
    }
    for (i = 0; i < 48; i++) { if (hash(i, 9) < 0.3) continue; var an = i / 48 * Math.PI * 2, rr = 4.5 * size * (1 + 0.15 * hash(i, 2)); pts.push([R(Math.cos(an) * rr), R(Math.sin(an) * rr)]); }
    ctx.fillStyle = 'rgba(20,60,70,0.35)';
    pts.forEach(function (q) { ctx.fillRect(x + q[0] + 1, y + q[1] + 1, 1, 1); });
    ctx.fillStyle = '#ffffff';
    pts.forEach(function (q) { ctx.fillRect(x + q[0], y + q[1], 1, 1); });
    rect(ctx, x - 1, y - 1, 3, 3, '#dff8ff'); rect(ctx, x, y, 1, 1, '#ffffff');
  }
  function drawSmear(ctx, x, y, size) {
    size = size || 1; x = R(x); y = R(y);
    var r = 12 * size, i;
    ellipse(ctx, x, y, r, r * 0.92, 'rgba(255,255,255,0.16)');
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (i = 0; i < 60; i++) { if (hash(i, 4) < 0.3) continue; var a = i / 60 * Math.PI * 2; ctx.fillRect(x + R(Math.cos(a) * r), y + R(Math.sin(a) * r * 0.92), 1, 1); }
    [-1, 1].forEach(function (s) { // 目のあと（押しつけた丸いにじみ）
      var ex = x + R(s * r * 0.4), ey = y - R(r * 0.2), er = Math.max(1.5, r * 0.24);
      ellipse(ctx, ex, ey, er, er, 'rgba(255,255,255,0.3)');
      ellipse(ctx, ex - R(er * 0.3), ey - R(er * 0.3), Math.max(0.6, er * 0.35), Math.max(0.6, er * 0.35), 'rgba(255,255,255,0.55)');
    });
    ellipse(ctx, x - R(r * 0.62), y + R(r * 0.22), Math.max(1, r * 0.12), Math.max(0.6, r * 0.06), 'rgba(255,190,200,0.35)');
    ellipse(ctx, x + R(r * 0.62), y + R(r * 0.22), Math.max(1, r * 0.12), Math.max(0.6, r * 0.06), 'rgba(255,190,200,0.35)');
    ellipse(ctx, x, y + R(r * 0.12), Math.max(1.5, r * 0.2), Math.max(1, r * 0.1), 'rgba(255,255,255,0.6)');
    ellipse(ctx, x, y + R(r * 0.45), Math.max(1.5, r * 0.15), Math.max(1, r * 0.08), 'rgba(255,255,255,0.45)');
    for (i = 0; i < 5; i++) {
      if (i === 1 || i === 4) continue;
      var dx = R((i - 2) * r * 0.32), y0 = y + R(r * (0.78 + 0.1 * (1 - Math.abs(i - 2) / 2))), L = R((2 + hash(i, 8) * 4) * size);
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x + dx, y0, 1, L);
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(x + dx, y0 + L, 2, 2);
    }
  }
  // 金魚の大きな顔（R=半径）。ガラスに押しつけた鼻・口

  // ---- 小物：抜け落ちるうろこ / 蝶 / ハエ / 浮き輪 ----
  var SCALE1 = art(['..ooo..', '.oLLBo.', 'oLBBBDo', 'oBBDBDo', 'oBDBDDo', '.oDDDo.', '..ooo..'], { o: '#9a4a10', L: '#ffc070', B: '#f08a30', D: '#d4661f' });
  function drawScale(ctx, x, y, rot) { blit(ctx, SCALE1, x, y, rot ? { rot: rot } : null); }
  function drawButterfly(ctx, x, y, t) {
    x = R(x); y = R(y); var f = Math.floor(t * 10) & 1;
    if (f) { rect(ctx, x - 3, y - 2, 3, 2, '#ff8ac0'); rect(ctx, x + 1, y - 2, 3, 2, '#ff8ac0'); rect(ctx, x - 2, y, 2, 2, '#ffd84a'); rect(ctx, x + 1, y, 2, 2, '#ffd84a'); rect(ctx, x - 3, y - 2, 1, 1, '#c03a7a'); rect(ctx, x + 3, y - 2, 1, 1, '#c03a7a'); }
    else { rect(ctx, x - 1, y - 3, 1, 3, '#ff8ac0'); rect(ctx, x + 1, y - 3, 1, 3, '#ff8ac0'); }
    rect(ctx, x, y - 2, 1, 4, '#3a2a40'); rect(ctx, x - 1, y - 3, 1, 1, '#3a2a40'); rect(ctx, x + 1, y - 3, 1, 1, '#3a2a40');
  }
  function drawFly(ctx, x, y, t) {
    x = R(x); y = R(y); var f = Math.floor(t * 16) & 1;
    rect(ctx, x - 1, y, 3, 2, '#2a2a30'); rect(ctx, x + 2, y, 1, 1, '#c83a3a');
    rect(ctx, x - (f ? 2 : 1), y - 2, 2, 2, 'rgba(230,250,255,0.85)'); rect(ctx, x + 1, y - (f ? 2 : 1), 2, 2, 'rgba(230,250,255,0.85)');
  }
  function drawFloatRing(ctx, x, y, t) {
    x = R(x); y = R(y + Math.sin((+t || 0) * 2.5));
    for (var dy = -4; dy <= 4; dy++) for (var dx = -8; dx <= 8; dx++) {
      var e = (dx + 0.5) * (dx + 0.5) / 64 + (dy + 0.5) * (dy + 0.5) / 16;
      if (e > 1) continue; var ei = (dx + 0.5) * (dx + 0.5) / 16 + (dy + 0.5) * (dy + 0.5) / 4;
      if (ei < 1) continue;
      var seg = Math.floor((Math.atan2(dy * 2, dx) + Math.PI) / (Math.PI / 3));
      rect(ctx, x + dx, y + dy, 1, 1, e > 0.8 ? O : (seg & 1) ? '#ffffff' : '#f04a3a');
    }
    rect(ctx, x - 5, y - 3, 2, 1, '#ffd0d0');
  }

  // 結末・死因プリセット（main.js から variant に死因IDを渡せる）
  var VARIANTS = {
    haircut: { trim: 1, eyes: 'x', mouth: 'tongue', flip: true },
    squashed: { eyes: 'tight', mouth: 'wavy', sx: 1.35, sy: 0.4, wag: 0 },
    loach: { eyes: 'side', mouth: 'o' },
    cleanfreak: { white: true, shine: true, eyes: 'closed', mouth: 'o', flip: true },
    giant: { eyes: 'closed', mouth: 'o', wag: 0 },
    catfish: { eyes: 'x', mouth: 'o', scale: 0.5 },
    instant: { eyes: 'x', flip: true, mouth: 'tongue' },
    poison: { eyes: 'x', palette: 'poison', flip: true, fumes: true, mouth: 'tongue' },
    frozen: { frozen: true, eyes: 'wide' },
    flower: { flower: true, flowerStage: 3, eyes: 'happy', butterfly: true },
    burnt: { burnt: true, eyes: 'x', smoke: true },
    shock: { eyes: 'x', spiky: true, bolt: true, spark: true, flip: true },
    sucked: { eyes: 'dizzy', gone: true, icon: 'nozzle' },
    overpolished: { white: true, shine: true, sparkle: true, eyes: 'x', mouth: 'o' },
    cat: { gone: true, icon: 'cat' },
    bird: { gone: true, icon: 'feather' },
    dizzy: { eyes: 'dizzy', flip: true, stars: true, mouth: 'tongue' },
    bubblegone: { gone: true, icon: 'bubble' },
    floataway: { balloon: true, eyes: 'dizzy', rot: -0.15 },
    netted: { gone: true, icon: 'net' },
    bug: { glitch: true, eyes: 'wide' },
    duck: { gone: true, icon: 'duck' },
    moss: { moss: true, eyes: 'sleepy' },
    stone: { stone: true, eyes: 'normal' },
    split: { splitBody: 18, eyes: 'wide', sweat: true },
    skeleton: { bones: true, eyes: 'x' },
    overeat: { belly: true, eyes: 'happy', mouth: 1, sweat: true },
    fishman: { legs: true, drown: true, eyes: 'wide' },
    oldage: { wrinkles: true, eyes: 'sleepy' },
    // 追加の突然死
    stuck: { stuck: true },
    hiccupfly: { halo: true, wings: true, eyes: 'closed', mouth: 'smile' },
    knotted: { knot: true, eyes: 'dizzy', mouth: 'wavy' },
    flat: { flat: true, eyes: 'x', mouth: 'o' },
    nowake: { eyes: 'closed', soul: true },
    overhere: { gone: true, eyes: 'wide' },
    jumpout: { eyes: 'surprised', sweat: true },
    // 追加の結末
    dragon: { dragon: true },
    golden: { palette: 'gold', shine: true, sparkle: true, eyes: 'smug' },
    hermit: { hermit: true },
    // 追加：お客さんイベントの突然死
    abducted: { eyes: 'surprised', mouth: 'o' },
    sushi: { sushi: true },
    meteor: { meteor: true },
    possessed: { ghost: true },
    // 追加：結末
    babies: { mom: true },
    // v16：新しいイベント・芸の突然死
    fished: { eyes: 'x', mouth: 'o', rot: -1.57, gone: true },
    boiled: { boiled: true, eyes: 'calm', mouth: 'smile', blush: true },
    photo: { photo: true },
    pigeon: { gone: true },
    star: { gone: true }
  };

  function merge(a, b) { var r = {}, k; for (k in a) r[k] = a[k]; for (k in b) if (b[k] !== undefined) r[k] = b[k]; return r; }

  var FLAG_KEYS = ['bubbly', 'spiky', 'white', 'frozen', 'burnt', 'flower', 'moss', 'stone', 'skeleton', 'bones', 'belly', 'wrinkles', 'puff', 'balloon', 'spark', 'shine', 'glitch', 'blush', 'stuck', 'knot', 'flat', 'bald', 'round', 'sushi', 'ghost', 'zen', 'meteor'];
  function cached(key, fn) {
    var g = fishCache[key];
    if (!g) {
      if (fishCacheN > 600) { fishCache = {}; fishCacheN = 0; }
      g = fishCache[key] = fn(); fishCacheN++;
    }
    return g;
  }
  // 単色化した複製（グリッチの色ずれ用）
  function tinted(g, col) {
    g._tint = g._tint || {};
    if (g._tint[col]) return g._tint[col];
    var t = new Grid(g.w, g.h, g.ox, g.oy);
    for (var i = 0; i < g.c.length; i++) if (g.c[i]) t.c[i] = col;
    t.K = col; t.keep = [];
    return (g._tint[col] = t);
  }

  // ---------- 手描きコマ（キーフレーム） ----------
  // swimF 0..3 / turnF 0..4 / chewF 0..3 / blinkF 0..2 / eatF 0..2 / rollF 0..5 / surpF 0..2（整数のコマ番号）
  // ひれのポーズ _fp: bend=尾の先の上下(+下) ts=尾の房の開き tr=房の大きさ ty=尾の上下ずれ dl=背びれの流れ dh=背びれの高さ
  //   pa=胸びれの角度(大きいほど後ろへたたむ) ps=胸びれの大きさ fw=腹びれの前後 sway=正面の尾の左右(px) dy=体の上下(px)
  function kfI(v, n, wrap) {
    if (v == null || v === false || v === true || v === '') return -1;
    v = Math.floor(+v); if (!isFinite(v)) return -1;
    return wrap ? ((v % n) + n) % n : Math.max(0, Math.min(n - 1, v));
  }
  var BASE_FP = { bend: 0, ts: 1, tr: 1, ty: 0, dl: 0, dh: 1, pa: 0.55, ps: 1, fw: 0, sway: 0, dy: 0 };
  var SWIM_FP = [
    { bend: -3.6, ts: 1.04, tr: 1.04, ty: 0, dl: 1.8, dh: 0.92, pa: 1.05, ps: 1, fw: 0.9, sway: 2, dy: 0 },   // 尾が右（上へしなる）・ひれは後ろへかく
    { bend: 0, ts: 0.78, tr: 0.94, tl: 0.86, ty: 1, dl: 0.3, dh: 1.06, pa: 0.5, ps: 1.05, fw: 0, sway: 0, dy: -1 },     // 中央・体が1px上
    { bend: 3.6, ts: 1.04, tr: 1.04, ty: 0, dl: -1.5, dh: 0.92, pa: 0.0, ps: 1, fw: -0.9, sway: -2, dy: 0 },  // 尾が左（下へしなる）・ひれは前へ
    { bend: 0, ts: 0.78, tr: 0.94, tl: 0.86, ty: -1, dl: 0.3, dh: 1.06, pa: 0.5, ps: 1.05, fw: 0, sway: 0, dy: 1 }      // 中央・体が1px下
  ];
  // v17: 泳ぎは8コマ。4つの手描きポーズのあいだに中割りを入れる（体の上下は 0,-1,-1,-1,0,1,1,1）
  var SWIM_FP8 = (function () {
    var out = [], DY = [0, -1, -1, -1, 0, 1, 1, 1];
    for (var i = 0; i < 8; i++) {
      var a = SWIM_FP[i >> 1], b = SWIM_FP[((i >> 1) + 1) & 3], u = (i & 1) ? 0.5 : 0, q = {};
      ['bend', 'ts', 'tr', 'tl', 'ty', 'dl', 'dh', 'pa', 'ps', 'fw', 'sway'].forEach(function (k) {
        var va = a[k] == null ? (k === 'tl' ? 1 : 0) : a[k], vb = b[k] == null ? (k === 'tl' ? 1 : 0) : b[k];
        if (a[k] == null && b[k] == null) return;
        q[k] = va + (vb - va) * u;
      });
      if (u) { q.ty = Math.round(q.ty); q.sway = Math.round(q.sway); }
      q.dy = DY[i];
      out.push(q);
    }
    return out;
  })();
  var SURP_FP = [
    { ts: 0.6, tr: 0.82, dh: 0.55, ps: 0.8, pa: 1.3, sx: 0.86, sy: 0.88 },    // ぎゅっ
    { ts: 1.35, tr: 1.15, dh: 1.45, ps: 1.3, pa: -0.45, sx: 1.06, sy: 1.14 }, // びよーん
    { ts: 1.1, tr: 1.05, dh: 1.15, ps: 1.1, pa: 0.2, sx: 0.98, sy: 1.04 }     // もどり
  ];
  var BLINK_OK = { normal: 1, wide: 1, angry: 1, teary: 1, side: 1, surprised: 1, sparkle: 1, smug: 1, annoyed: 1 };
  var DEAD_EYES = { x: 1, dizzy: 1, stone: 1 };
  function keyframes(o) {
    var sw8 = o.swimF8 != null ? kfI(o.swimF8, 8, true) : -1;
    var sw = sw8 >= 0 ? sw8 >> 1 : kfI(o.swimF, 4, true), tu = kfI(o.turnF, 5), ch = kfI(o.chewF, 4, true), bl = kfI(o.blinkF, 3),
      ea = kfI(o.eatF, 3), ro = kfI(o.rollF, 6), su = kfI(o.surpF, 3);
    var tr = Math.max(0, Math.min(1, +o.trim || 0)); // v19: 散髪（ひれ・尾を短く。0..1）
    if (!tr && sw < 0 && sw8 < 0 && tu < 0 && ch < 0 && bl < 0 && ea < 0 && ro < 0 && su < 0) return null;
    if (sw8 < 0 && sw >= 0) sw8 = sw * 2;
    var K = { sw: sw, sw8: sw8, tu: tu, sx: 1, sy: 1, dy: 0, flip: false, tailAnchor: false, ay: 0, ov: {} }, ov = K.ov, fp = null;
    var eyes0 = o.eyes || 'normal', dead = !!DEAD_EYES[eyes0];
    if (sw8 >= 0) { fp = merge(SWIM_FP8[sw8], {}); K.dy += fp.dy; }
    if (su >= 0) {
      var sp = SURP_FP[su]; fp = fp || merge(BASE_FP, {});
      fp.ts *= sp.ts; fp.tr *= sp.tr; fp.dh *= sp.dh; fp.ps *= sp.ps; fp.pa = sp.pa; fp.bend *= 0.4; fp.dl *= 0.5;
      if (su === 0) ov._shrink = [sp.sx, sp.sy]; else { K.sx *= sp.sx; K.sy *= sp.sy; } // ぎゅっ：横顔は体を小さく描き直す（目の線がつぶれない）
      if (!dead) ov._eye = ['tight', 'surprised', 'wide'][su];
      ov._mouth = ['wavy', 'o', 'o'][su];
    }
    if (ch >= 0) {
      ov._cheeks = true; ov._bob = [0, 0, -1, 1][ch]; ov._mouth = ['c0', 'c1', 'c0', 'c0'][ch];
      if (ch === 2) ov._squint = true;
    }
    if (ea >= 0) {
      ov._mouth = ['gulp', 'c0', null][ea] || undefined;
      K.sx *= [1.12, 0.88, 0.97][ea]; K.sy *= [0.93, 1.1, 1.03][ea]; K.tailAnchor = true;
      if (ea === 1) { ov._cheeks = true; ov._bob = 1; }
    }
    if (ro > 0) {
      fp = fp || merge(BASE_FP, {});
      ov._rollA = [0, 0.25, 0.5, 0.25, 0, 0][ro] || undefined; // 横顔：体を軸にまわす（3 は 1 を上下反転＝135°）
      ov._roll = [0, 0.55, 1, 0.55, 0, 0][ro] || undefined;     // 正面・斜め：お腹の境目を上げる
      fp.ps *= [1, 0.9, 0.8, 0.9, 1, 1][ro];
      K.sy *= ro === 5 ? 0.84 : ro === 2 ? 0.94 : 1; K.sx *= ro === 5 ? 1.08 : ro === 2 ? 1.03 : 1;
      K.flip = ro >= 3;
      if (ro === 5) { K.ay = -1; K.dy += 2; }
    }
    if (bl > 0 && BLINK_OK[ov._eye || eyes0]) ov._eye = bl === 1 ? 'half' : 'shut';
    if (tr) { fp = fp || merge(BASE_FP, {}); fp.tl = (fp.tl || 1) * (1 - 0.7 * tr); fp.tr = (fp.tr || 1) * (1 - 0.3 * tr); fp.ts *= 1 - 0.5 * tr; fp.dh *= 1 - 0.85 * tr; fp.ps *= 1 - 0.75 * tr; }
    if (fp) ov._fp = fp;
    K.key = '|KF' + [sw8, tu, ch, bl, ea, ro, su, R(tr * 20)].join(',');
    return K;
  }

  // ---------- 死に際の手描きコマ（opts.die = { k: 死因ID, f: コマ番号 }） ----------
  // 1コマ = drawFish の opts（目・口・フラグ）＋ 以下の特別キー（右向き基準。dir<0 で左右が反転）
  //   dx dy … 位置ずれ(px×scale)  sc … 倍率  r … 回転(rad)  a … 不透明度  sx sy … 呼び出し側の値に掛け算
  //   mix:[先, k] … 体色から先のパレットへ k だけ寄せる（'poison' 'frozen' 'old' 'zen' など / パレット object）
  //   wipe:[opts, k] … 尾の側から k の割合だけ opts の姿（frozen / moss / 金 / 石色）に塗りかわる
  //   beak wing spikes … アヒルのくちばし・羽 / 竜のとげ（大きさ）   legK … 脚の長さ（legLen×legK）
  //   twin … 分裂の2つ目の頭（0..1）  mound … 隠者の砂山  clipT/clipB … その高さより上/下だけ描く（px×scale）
  //   draw:'duck'|'eyeball' … 魚の代わりに描く  fx:[[名前, 段階]...] … コマごとの演出（opts.t によらない）
  var DIE = {}, DIE_FRAMES = {};
  var DIE_KEEP = ['color', 'stage', 'dir', 'scale', 'rot', 'sx', 'sy', 't', 'fx', 'legLen', 'wag'];
  var DIE_PROPS = { hose: 1 }; // コマの中に描く小物（opts.props:false で描かない。main.js が自前で描くとき用）
  var DIE_SPECIAL = { dx: 1, dy: 1, sc: 1, r: 1, a: 1, sx: 1, sy: 1, mix: 1, wipe: 1, beak: 1, wing: 1, spikes: 1, legK: 1, twin: 1, mound: 1, clipT: 1, clipB: 1, draw: 1, fx: 1, roll: 1, flap: 1 };
  var RED_P = { B: '#ff4a3a', D: '#d0281e', L: '#ff9a7a', P: '#ffc4a8', F: '#ff6040', W: '#fffaf0', K: O };
  var DUCK_P = { B: '#ffd83a', D: '#e0a820', L: '#fff27a', P: '#fff4b0', F: '#ffe060', W: '#fffaf0', K: O };
  var MOSS_P = { B: '#6a9a3a', D: '#4a7a2a', L: '#9ac25a', P: '#c8dc98', F: '#7aaa4a', W: '#fffaf0', K: O };
  var BUG_P = { B: '#ff2aa0', D: '#20e8ff', L: '#ffff40', P: '#ffffff', F: '#20e8ff', W: '#ffffff', K: '#000000' };
  function dieSeq(k, poses, fin) { poses.push(fin); DIE[k] = poses; DIE_FRAMES[k] = { n: poses.length, hold: poses.length - 1, fps: 12 }; }
  (function () {
    var FZ = { frozen: true }, GD = { palette: 'gold' }, ST = { stone: true }, MS = { moss: true }, BB = { bubbly: true };
    var TW = { eyes: 'teary', brows: 'worried', mouth: 'wavy' }; // 涙目＋困り眉＋ふにゃ口
    var m = function (a, b) { return merge(a, b); };
    // ===== 突然死（予兆 → 本番 → 反応 → 余韻） =====
    dieSeq('instant', [
      { mouth: 'smile', swimF: 0 }, { mouth: 'smile', swimF: 1, look: 'up' }, { blinkF: 2, mouth: 'smile', swimF: 2 }, { eyes: 'happy', mouth: 'grin', swimF: 3 },
      { surpF: 0 }, { surpF: 1, mark: '!', dy: -3 },
      { eyes: 'surprised', mouth: 'o', sweat: true, dx: 1, dy: -2 }, { eyes: 'surprised', mouth: 'wavy', sweat: true, dx: -1, dy: -1 },
      { eyes: 'x', mouth: 'o', sx: 0.94, sy: 1.06 }, { eyes: 'x', mouth: 'o', roll: 0.25, dy: -1 }, { eyes: 'x', mouth: 'tongue', roll: 0.5, dy: -1 },
      { eyes: 'x', mouth: 'tongue', roll: 0.75 }, { eyes: 'x', mouth: 'tongue', flip: true, sy: 0.92, dy: 1 }
    ], { variant: 'instant' });
    dieSeq('poison', [
      { swimF: 1, mouth: 1 }, { eatF: 0 }, { eatF: 1 }, { chewF: 2 },
      { eyes: 'wide', mouth: 'c0', sx: 0.94, sy: 1.08, fx: [['gulp', 0]] },
      { eyes: 'surprised', mouth: 'wavy', mix: ['poison', 0.2] },
      m(TW, { sweat: true, mix: ['poison', 0.4], dx: -1 }), m(TW, { sweat: true, mix: ['poison', 0.6], dx: 1 }),
      { eyes: 'tight', mouth: 'wavy', mix: ['poison', 0.8], sx: 1.06, sy: 0.94, fx: [['shiver', 0]] },
      { eyes: 'dizzy', mouth: 'tongue', palette: 'poison', fumes: true, dx: -1 },
      { eyes: 'x', mouth: 'tongue', palette: 'poison', dy: -1, fx: [['skull', 0]] },
      { eyes: 'x', mouth: 'tongue', palette: 'poison', roll: 0.25, fx: [['skull', 1]] },
      { eyes: 'x', mouth: 'tongue', palette: 'poison', roll: 0.5, fx: [['skull', 2]] },
      { eyes: 'x', mouth: 'tongue', palette: 'poison', roll: 0.75, fumes: true }
    ], { variant: 'poison' });
    dieSeq('frozen', [
      { swimF: 0, mouth: 1 }, { eatF: 0 }, { eatF: 1 },
      { eyes: 'surprised', mouth: 'o', fx: [['frost', 0]] },
      m(TW, { mix: ['frozen', 0.2], dx: -1, fx: [['frost', 1], ['shiver', 0]] }), m(TW, { mix: ['frozen', 0.3], dx: 1, fx: [['frost', 2], ['shiver', 1]] }),
      { eyes: 'tight', mouth: 'wavy', wipe: [FZ, 0.25], dx: -1, fx: [['shiver', 0]] },
      m(TW, { wipe: [FZ, 0.45], dx: 1, fx: [['frost', 3]] }),
      { eyes: 'surprised', mouth: 'o', wipe: [FZ, 0.65] }, { eyes: 'wide', mouth: 'o', wipe: [FZ, 0.85], dx: -1 },
      { frozen: true, eyes: 'wide', mouth: 'o', sx: 1.05, sy: 1.05, fx: [['burst', 1]] },
      { frozen: true, eyes: 'wide', fx: [['glint', 0]] }, { frozen: true, eyes: 'wide', sy: 0.96, dy: 1, fx: [['glint', 1]] }
    ], { variant: 'frozen' });
    dieSeq('flower', [
      { chewF: 0 }, { chewF: 2 }, { eyes: 'closed', mouth: 'c0', sx: 0.95, sy: 1.06 }, { eyes: 'wide', mark: '?' },
      { eyes: 'surprised', mouth: 'o', flower: true, flowerStage: 0, dy: -1 },
      { eyes: 'wide', look: 'up', flower: true, flowerStage: 0 }, { eyes: 'wide', look: 'up', flower: true, flowerStage: 1, mark: '?' },
      { surpF: 0, flower: true, flowerStage: 1 },
      { eyes: 'surprised', mouth: 'o', flower: true, flowerStage: 2, sx: 1.04, sy: 0.94 },
      { eyes: 'sparkle', mouth: 'o', look: 'up', flower: true, flowerStage: 2 },
      { surpF: 1, flower: true, flowerStage: 3, fx: [['petals', 0]] },
      { eyes: 'happy', flower: true, flowerStage: 3, dy: -1, fx: [['petals', 1]] },
      { eyes: 'dizzy', mouth: 'wavy', flower: true, flowerStage: 3, r: 0.1 }
    ], { variant: 'flower', eyes: 'x' });
    dieSeq('burnt', [
      { chewF: 0 }, { chewF: 2, blush: true },
      { eyes: 'wide', cheeks: true, blush: true, mix: [RED_P, 0.2], fx: [['steam', 0]] },
      { eyes: 'surprised', cheeks: true, blush: true, mix: [RED_P, 0.35], dx: 1, fx: [['steam', 1]] },
      { eyes: 'tight', cheeks: true, blush: true, mix: [RED_P, 0.5], sx: 1.08, sy: 1.08, fx: [['steam', 2]] },
      { eyes: 'tight', cheeks: true, mix: [RED_P, 0.6], sx: 1.14, sy: 1.12, dx: -1, fx: [['steam', 2], ['shiver', 1]] },
      { eyes: 'closed', mouth: 'yawn', mix: [RED_P, 0.5], sx: 0.92, dx: -3, fx: [['flame', 0]] },
      { eyes: 'closed', mouth: 'yawn', mix: ['burnt', 0.4], sx: 0.9, dx: -5, fx: [['flame', 1]] },
      { eyes: 'surprised', mouth: 'yawn', mix: ['burnt', 0.6], dx: -6, fx: [['flame', 1]] },
      { eyes: 'dizzy', mouth: 'o', mix: ['burnt', 0.8], smoke: true, dx: -5 },
      { burnt: true, eyes: 'x', mouth: 'o', dx: -3, fx: [['puff', 0]] },
      { burnt: true, eyes: 'x', mouth: 'wavy', smoke: true, sy: 0.95, dx: -2 },
      { burnt: true, eyes: 'x', smoke: true, dx: -1 }
    ], { variant: 'burnt' });
    dieSeq('shock', [
      { chewF: 0 }, { chewF: 2 }, { eyes: 'wide', mouth: 'c0', fx: [['spark', 0]] },
      { surpF: 0, fx: [['zap', 0]] },
      { spiky: 0.5, eyes: 'x', mouth: 'o', sx: 1.08, sy: 1.08, fx: [['zap', 1], ['burst', 0]] },
      { spiky: true, eyes: 'surprised', mouth: 'grin', dx: 2, fx: [['spark', 1]] },
      { spiky: 0.6, eyes: 'x', mouth: 'o', sx: 1.1, sy: 1.1, dx: -2, fx: [['zap', 1]] },
      { spiky: true, eyes: 'dizzy', mouth: 'grin', dx: 1, fx: [['spark', 2]] },
      { spiky: true, eyes: 'x', mouth: 'tongue', mix: ['burnt', 0.2], fx: [['spark', 0], ['puff', 0]] },
      { spiky: true, eyes: 'x', mouth: 'tongue', mix: ['burnt', 0.2], spark: true, dy: 1 },
      { spiky: true, eyes: 'x', mouth: 'tongue', roll: 0.25, spark: true }, { spiky: true, eyes: 'x', roll: 0.5, spark: true },
      { spiky: true, eyes: 'x', roll: 0.75, spark: true }, { spiky: true, eyes: 'x', flip: true, spark: true, bolt: true, sy: 0.95 }
    ], { variant: 'shock' });
    dieSeq('dizzy', [
      { eyes: 'sparkle', mouth: 'grin' },
      { turnF: 1, eyes: 'wide', mouth: 'o', fx: [['spin', 0]] }, { turnF: 2, eyes: 'dizzy', mouth: 'o', fx: [['spin', 1]] },
      { turnF: 3, eyes: 'dizzy', mouth: 'wavy', fx: [['spin', 2]] }, { turnF: 4, eyes: 'dizzy', mouth: 'wavy', fx: [['spin', 0]] },
      { turnF: 3, eyes: 'dizzy', mouth: 'o', sweat: true, fx: [['spin', 1]] }, { turnF: 2, eyes: 'dizzy', mouth: 'o', sweat: true, fx: [['spin', 2]] },
      { turnF: 1, eyes: 'dizzy', mouth: 'tongue', sweat: true },
      { eyes: 'dizzy', mouth: 'wavy', r: 0.35, stars: true }, { eyes: 'dizzy', mouth: 'tongue', r: -0.3, dy: 1, stars: true },
      { eyes: 'dizzy', mouth: 'tongue', r: 0.2, dx: 1, stars: true },
      { eyes: 'dizzy', mouth: 'tongue', roll: 0.5, stars: true }, { eyes: 'dizzy', mouth: 'tongue', roll: 0.75 }
    ], { variant: 'dizzy' });
    dieSeq('bubblegone', [
      { eyes: 'sparkle', mouth: 'o' }, { eatF: 0 }, { surpF: 1, mark: '!' },
      m(TW, { sweat: true, dx: 1 }), m(TW, { sweat: true, swimF: 0, dx: -1, dy: -1 }),
      { eyes: 'teary', mouth: 'o', swimF: 2, dy: -2 },
      { eyes: 'tight', mouth: 'wavy', sx: 0.9, sy: 0.9, dy: -2, fx: [['squeeze', 0]] },
      { eyes: 'surprised', mouth: 'o', wipe: [BB, 0.2], dy: -2 }, { eyes: 'surprised', mouth: 'o', wipe: [BB, 0.4], dy: -3 },
      m(TW, { wipe: [BB, 0.6], dy: -4 }), { eyes: 'wide', mouth: 'o', wipe: [BB, 0.8], dy: -5 },
      { bubbly: true, dy: -6, fx: [['bubbles', 0]] }, { bubbly: true, dy: -6, sx: 1.05, sy: 1.05, fx: [['bubbles', 1]] }
    ], { bubbly: true, dy: -6 });
    dieSeq('floataway', [
      { eyes: 'wide', mouth: 'o' }, { surpF: 1, mouth: 'o' },
      { balloon: true, eyes: 'surprised', mouth: 'o', sc: 0.9 }, { balloon: true, eyes: 'wide', mouth: 'o', sweat: true },
      { balloon: true, eyes: 'teary', brows: 'worried', mouth: 'wavy', sweat: true, sc: 1.08 },
      { balloon: true, eyes: 'tight', mouth: 'wavy', sc: 1.15, sx: 1.04, sy: 0.96 },
      { balloon: true, eyes: 'surprised', mouth: 'o', sc: 1.25 },
      { balloon: true, eyes: 'surprised', mouth: 'o', sc: 1.2, dy: -2 }, { balloon: true, eyes: 'wide', sc: 1.14, r: -0.08, dy: -4 },
      { balloon: true, eyes: 'dizzy', sc: 1.1, r: -0.2, dy: -5 }, { balloon: true, eyes: 'dizzy', sc: 1.05, r: -0.05, dy: -6 },
      { balloon: true, eyes: 'dizzy', r: 0.08, dy: -5 }, { balloon: true, eyes: 'dizzy', r: -0.1, dy: -3 }
    ], { variant: 'floataway' });
    dieSeq('stuck', [
      { eyes: 'angry', mouth: 'grin', sx: 0.9, dx: -2 }, { eyes: 'angry', mouth: 'grin', sx: 0.85, dx: -4 },
      { eyes: 'wide', mouth: 'o', sx: 1.25, sy: 0.85, dx: 3, fx: [['speed', 0]] }, { eyes: 'wide', mouth: 'o', sx: 1.3, sy: 0.82, dx: 6, fx: [['speed', 0]] },
      { surpF: 0, sx: 0.78, sy: 1.15, dx: 7, fx: [['burst', 0]] },
      { stuck: true, sx: 1.08, dx: 4, fx: [['stars', 0]] }, { stuck: true, swimF: 0, dx: 3, fx: [['stars', 1]] },
      { stuck: true, swimF: 2, dx: 2, fx: [['stars', 0]] }, { stuck: true, swimF: 0, dx: 1, fx: [['shiver', 0]] },
      { stuck: true, swimF: 2, fx: [['shiver', 1]] }, { stuck: true, swimF: 1, sy: 0.97 }
    ], { variant: 'stuck' });
    dieSeq('hiccupfly', [
      { eyes: 'closed', mouth: 'o', sx: 1.08, sy: 0.9 }, { eyes: 'surprised', mouth: 'o', sx: 0.9, sy: 1.15, dy: -5, mark: '!' },
      { eyes: 'wide', mouth: 'wavy', dy: -3 }, { eyes: 'closed', mouth: 'wavy', sx: 1.1, sy: 0.88, dy: -2 },
      { eyes: 'surprised', mouth: 'o', sx: 0.85, sy: 1.2, dy: -9, fx: [['burst', 0]] },
      { eyes: 'dizzy', mouth: 'o', dy: -8 }, { eyes: 'x', mouth: 'o', dy: -7 },
      { eyes: 'closed', mouth: 'smile', halo: true, dy: -7 },
      { eyes: 'closed', mouth: 'smile', halo: true, wings: true, dy: -6, t: 0 }, { eyes: 'closed', mouth: 'smile', halo: true, wings: true, dy: -5, t: 0.25 },
      { eyes: 'closed', mouth: 'smile', halo: true, wings: true, dy: -4, t: 0.5 }, { eyes: 'closed', mouth: 'smile', halo: true, wings: true, dy: -2, t: 0.1, fx: [['sparkle', 0]] }
    ], { variant: 'hiccupfly' });
    dieSeq('knotted', [
      { eyes: 'sparkle', mouth: 'grin', r: 0.3 }, { eyes: 'sparkle', mouth: 'grin', r: 0.8, fx: [['spin', 0]] },
      { eyes: 'wide', mouth: 'o', r: 1.4, sx: 0.9, fx: [['spin', 1]] }, { eyes: 'wide', mouth: 'o', r: 2.2, sx: 0.88, fx: [['spin', 2]] },
      { eyes: 'dizzy', mouth: 'o', r: 3.0, sx: 0.85, fx: [['spin', 0]] }, { eyes: 'dizzy', mouth: 'wavy', r: 3.8, sx: 0.85, sweat: true, fx: [['spin', 1]] },
      { eyes: 'dizzy', mouth: 'wavy', r: 4.6, sx: 0.85, fx: [['spin', 2]] }, { surpF: 0, r: 5.9 },
      { knot: true, t: 0.5, eyes: 'surprised', mouth: 'o', r: 0.3, fx: [['burst', 0]] }, { knot: true, t: 0.5, eyes: 'wide', mouth: 'o', r: -0.1, mark: '?' },
      { knot: true, t: 0.5, eyes: 'teary', brows: 'worried', mouth: 'wavy', sweat: true, r: -0.15 },
      { knot: true, t: 0.5, eyes: 'teary', brows: 'worried', mouth: 'wavy', sweat: true, r: 0.1, dx: 1 },
      { knot: true, t: 0.5, eyes: 'dizzy', mouth: 'wavy', r: 0.08 }
    ], { variant: 'knotted', eyes: 'x' });
    dieSeq('flat', [
      { eyes: 'closed', mouth: 'o', sy: 1.05 }, { eyes: 'closed', mouth: 'yawn', sx: 0.94, sy: 1.1, r: -0.1, dx: 1 },
      { eyes: 'closed', mouth: 'yawn', sx: 0.9, sy: 1.15, r: -0.2, dx: 2 }, { eyes: 'closed', mouth: 'yawn', sx: 0.88, sy: 1.18, r: -0.28, dx: 2 },
      { eyes: 'tight', mouth: 'o', sx: 1.15, sy: 0.85, r: 0.15, dx: -1, fx: [['sneeze', 0]] },
      { eyes: 'surprised', mouth: 'o', sx: 1.3, sy: 0.8, dx: -3, fx: [['speed', 1]] }, { eyes: 'surprised', mouth: 'o', sx: 1.35, sy: 0.78, dx: -5, fx: [['speed', 1]] },
      { flat: true, eyes: 'x', mouth: 'o', sx: 1.2, sy: 1.2, fx: [['burst', 0]] }, { flat: true, eyes: 'x', mouth: 'o', sx: 1.1, sy: 1.1 },
      { flat: true, eyes: 'x', mouth: 'o', sx: 0.9, sy: 0.9 }, { flat: true, eyes: 'x', mouth: 'wavy', sx: 1.05, sy: 1.05 }
    ], { variant: 'flat' });
    dieSeq('nowake', [
      { eyes: 'sleepy' }, { blinkF: 1 }, { eyes: 'closed' }, { eyes: 'closed', mark: 'zzz' },
      { eyes: 'closed', mark: 'zzz', sx: 0.97, sy: 1.05 }, { eyes: 'closed', mouth: 'o', mark: 'zzz', sx: 1.03, sy: 0.95 },
      { eyes: 'closed', mark: 'zzz', sx: 0.96, sy: 1.06, dy: 1 }, { eyes: 'closed', mouth: 'o', sx: 1.03, sy: 0.95, dy: 1 },
      { eyes: 'closed', r: 0.06, dy: 1 }, { eyes: 'closed', r: 0.1, dy: 1 },
      { eyes: 'closed', r: 0.12, dy: 1, fx: [['soul', 0]] }, { eyes: 'closed', r: 0.08, dy: 1, fx: [['soul', 1]] }
    ], { variant: 'nowake', soul: false });
    // ---- 小物つき（魚の反応だけ。猫の手・鳥・網・UFO・板前の手・隕石は main.js） ----
    dieSeq('cat', [
      { look: 'up', eyes: 'sparkle', mouth: 'smile', blush: true }, { look: 'up', eyes: 'sparkle', mouth: 'smile', blush: true, dy: -1 },
      { look: 'up', eyes: 'wide', mark: '?' }, { surpF: 0 }, { surpF: 1, mark: '!', dy: -2 },
      { eyes: 'surprised', mouth: 'o', sweat: true, sx: 0.9, sy: 1.12, r: -0.35, dy: -4 },
      { eyes: 'tight', mouth: 'wavy', sx: 0.85, sy: 1.1, r: -0.6, dy: -5, fx: [['shiver', 0]] },
      m(TW, { swimF: 0, r: -0.8, dy: -6 }), m(TW, { swimF: 2, r: -1.0, dy: -7 }),
      { eyes: 'x', mouth: 'o', sy: 1.1, r: -1.2, dy: -7 }, { eyes: 'x', mouth: 'tongue', r: -1.4, dy: -7 }
    ], { eyes: 'x', mouth: 'tongue', wag: 0, r: -1.57, dy: -7 });
    dieSeq('bird', [
      { eyes: 'sparkle', mouth: 'grin', dy: -2 }, { eyes: 'closed', mouth: 'grin', r: -0.3, dy: -4 }, { eyes: 'closed', mouth: 'grin', r: -0.15, dy: -6 },
      { surpF: 1, mark: '!', dy: -7 },
      { eyes: 'surprised', mouth: 'o', sweat: true, r: -0.3, dy: -9 }, { eyes: 'surprised', mouth: 'o', sweat: true, r: -0.6, dy: -10 },
      m(TW, { swimF: 0, r: -0.9, dy: -10 }), m(TW, { swimF: 2, r: -1.1, dy: -10 }), m(TW, { swimF: 0, r: -0.9, dy: -11, fx: [['drops', 0]] }),
      { eyes: 'x', mouth: 'o', r: 0.6, dy: -10 }, { eyes: 'x', mouth: 'o', r: 1.1, dy: -10 }
    ], { eyes: 'x', mouth: 'tongue', wag: 0, r: 1.45, dy: -10 });
    dieSeq('netted', [
      { look: 'up', eyes: 'wide', mark: '?' }, { surpF: 0 }, { surpF: 1, mark: '!' },
      m(TW, { sweat: true, swimF: 0, dx: -2 }), m(TW, { sweat: true, swimF: 2, dx: 2, r: 0.2 }), m(TW, { sweat: true, swimF: 0, dx: -1, r: -0.2 }),
      { eyes: 'tight', mouth: 'wavy', sx: 0.9, sy: 1.05, r: 0.3 },
      { eyes: 'teary', mouth: 'o', swimF: 1, sx: 0.95, r: -0.25, dy: -2 }, { eyes: 'teary', mouth: 'o', swimF: 3, r: 0.35, dy: -4, fx: [['drops', 0]] },
      { eyes: 'dizzy', mouth: 'wavy', r: 0.3, dy: -5, sc: 0.95 }, { eyes: 'x', mouth: 'o', sc: 0.9, r: 0.3, dy: -6 }
    ], { eyes: 'x', mouth: 'o', sc: 0.85, r: 0.3, dy: -6 });
    dieSeq('jumpout', [
      { eyes: 'wide', mouth: 'wavy', sweat: true }, { eyes: 'wide', mouth: 'wavy', sweat: true, dx: 1, fx: [['shiver', 0]] }, { eyes: 'wide', mouth: 'wavy', sweat: true, dx: -1, fx: [['shiver', 1]] },
      { surpF: 0, dy: 1 }, { surpF: 1, mark: '!', r: -0.5, sy: 1.15, dy: -6, fx: [['drops', 0]] },
      { eyes: 'surprised', mouth: 'o', r: -0.35, dy: -10 }, { eyes: 'surprised', mouth: 'o', r: -0.1, dy: -12, fx: [['drops', 1]] },
      { eyes: 'surprised', mouth: 'o', sweat: true, r: 0.2, dy: -12 }, m(TW, { sweat: true, r: 0.45, dy: -10 }),
      { eyes: 'surprised', mouth: 'o', sx: 1.15, sy: 0.85, r: 0.6, dy: -3 }, { eyes: 'surprised', mouth: 'o', sweat: true, r: 0.2, dy: -1 }
    ], { variant: 'jumpout' });
    dieSeq('abducted', [
      { look: 'up', mark: '?' }, { look: 'up', eyes: 'wide' }, { surpF: 1, mark: '!' },
      { eyes: 'surprised', mouth: 'o', sweat: true, swimF: 0, r: -0.15, dy: -2 },
      m(TW, { swimF: 2, r: 0.2, dy: -4 }), m(TW, { swimF: 0, r: -0.1, dy: -6 }),
      { eyes: 'dizzy', mouth: 'o', r: 0.5, dy: -7 }, { eyes: 'dizzy', mouth: 'o', r: 1.1, dy: -8 },
      { eyes: 'dizzy', mouth: 'o', r: 1.8, sc: 0.95, dy: -9 }, { eyes: 'dizzy', mouth: 'wavy', r: 2.6, sc: 0.9, dy: -10 },
      { eyes: 'dizzy', mouth: 'o', r: 3.4, sc: 0.85, dy: -11 }
    ], { variant: 'abducted' });
    dieSeq('meteor', [
      { look: 'up', mark: '?' }, { look: 'up', eyes: 'wide' }, { surpF: 1, mark: '!' },
      { eyes: 'teary', brows: 'worried', mouth: 'o', sweat: true, sy: 0.92, dy: 1 },
      { eyes: 'tight', mouth: 'wavy', sx: 1.05, sy: 0.88, dy: 2, fx: [['shiver', 0]] },
      { eyes: 'x', mouth: 'o', mix: ['burnt', 0.5], sx: 1.4, sy: 0.5, dy: 4, fx: [['burst', 1]] },
      { eyes: 'x', mouth: 'o', mix: ['burnt', 0.7], sx: 1.5, sy: 0.45, dy: 5 },
      { burnt: true, eyes: 'dizzy', mouth: 'wavy', smoke: true, sx: 1.3, sy: 0.6, dy: 4 },
      { burnt: true, eyes: 'dizzy', mouth: 'wavy', smoke: true, sx: 1.2, sy: 0.7, dy: 3 },
      { meteor: true, sx: 1.08, sy: 1.1, dy: 1, fx: [['puff', 0]] }, { meteor: true, sx: 1.02, sy: 1.02 }
    ], { variant: 'meteor' });
    // ===== 結末（ふつうの金魚 → 完成形） =====
    dieSeq('duck', [
      {}, { eyes: 'wide', mark: '?' }, { eyes: 'sparkle', mouth: 'o', sx: 0.95, sy: 1.08, mix: [DUCK_P, 0.2] },
      { eyes: 'surprised', mouth: 'o', sy: 1.1, mix: [DUCK_P, 0.4], beak: 2 }, { eyes: 'surprised', mouth: 'o', mix: [DUCK_P, 0.55], beak: 3 },
      { eyes: 'wide', sx: 0.95, sy: 1.12, mix: [DUCK_P, 0.7], beak: 4 }, { eyes: 'wide', mix: [DUCK_P, 0.85], beak: 5, wing: 1 },
      { eyes: 'sparkle', sx: 0.92, sy: 1.14, mix: [DUCK_P, 1], beak: 5, wing: 2 }, { eyes: 'sparkle', sx: 0.9, sy: 1.15, mix: [DUCK_P, 1], beak: 6, wing: 3 },
      { eyes: 'closed', sx: 0.88, sy: 1.18, mix: [DUCK_P, 1], beak: 6, wing: 3, fx: [['poof', 0]] },
      { draw: 'duck', sc: 0.85, fx: [['poof', 1]] }, { draw: 'duck', sc: 0.95, dy: -1 }
    ], { draw: 'duck' });
    dieSeq('moss', [
      {}, { eyes: 'sleepy' }, { eyes: 'sleepy', mix: [MOSS_P, 0.15], fx: [['spores', 0]] }, { eyes: 'side', mix: [MOSS_P, 0.25], fx: [['spores', 1]] },
      { eyes: 'wide', mix: [MOSS_P, 0.3], wipe: [MS, 0.2], fx: [['spores', 2]] }, { eyes: 'wide', sweat: true, mix: [MOSS_P, 0.35], wipe: [MS, 0.35] },
      m(TW, { mix: [MOSS_P, 0.4], wipe: [MS, 0.5], dx: 1 }), m(TW, { mix: [MOSS_P, 0.4], wipe: [MS, 0.65], dx: -1 }),
      { eyes: 'tight', mouth: 'wavy', mix: [MOSS_P, 0.45], wipe: [MS, 0.8] },
      { moss: true, eyes: 'wide' }, { moss: true, eyes: 'normal' }, { moss: true, eyes: 'sleepy' }, { moss: true, eyes: 'sleepy', sy: 0.95, dy: 1 }
    ], { variant: 'moss', eyes: 'x' });
    // v22 空腹でスケルトン：ぐぅ〜 → だんだん やせる → げっそり（肋骨・背骨が浮く）→ ガクッ → 身がとけて骨だけに
    dieSeq('skeleton', [
      {}, { eyes: 'sleepy', mouth: 'wavy', fx: [['growl', 0]] }, m(TW, { fx: [['growl', 1]] }),
      { eyes: 'sleepy', mouth: 'wavy', sy: 0.92, mix: ['gaunt', 0.3], fx: [['growl', 0]] }, m(TW, { sy: 0.86, mix: ['gaunt', 0.6] }),
      m(TW, { sy: 0.8, mix: ['gaunt', 1], dx: 1, fx: [['growl', 1]] }), { eyes: 'tight', mouth: 'wavy', sy: 0.78, mix: ['gaunt', 1] },
      { skeleton: true, eyes: 'teary', mouth: 'wavy', sy: 0.96 }, { skeleton: true, eyes: 'sleepy', mouth: 'o', sx: 0.94 },
      { skeleton: true, eyes: 'sleepy', mouth: 'o', sx: 0.9, dy: 1, fly: true }, { skeleton: true, eyes: 'x', mouth: 'o', r: 0.1, dy: 2, fly: true },
      { skeleton: true, eyes: 'x', mouth: 'o', a: 0.7, fx: [['burst', 0]] }, { bones: true, eyes: 'x', a: 0.85 }, { bones: true, eyes: 'x', dy: 1, r: -0.06 }
    ], { bones: true, eyes: 'x' });    dieSeq('overeat', [
      { chewF: 0 }, { chewF: 1 }, { chewF: 2 }, { chewF: 3 },
      { cheeks: true, eyes: 'happy', mouth: 'c0', sx: 1.05, sy: 1.1 },
      { belly: true, eyes: 'happy', mouth: 1, sy: 0.85 }, { belly: true, eyes: 'happy', mouth: 1, sy: 0.95 }, { belly: true, eyes: 'closed', mouth: 'smile' },
      { belly: true, eyes: 'happy', mouth: 1, sweat: true, sy: 0.97 }, { belly: true, eyes: 'wide', mouth: 'o', sweat: true, sx: 1.04, sy: 1.06 },
      { belly: true, eyes: 'surprised', mouth: 'o', sweat: true, sx: 1.06, sy: 1.08 }, { belly: true, eyes: 'closed', mouth: 'yawn', fx: [['burp', 0]] },
      { belly: true, eyes: 'dizzy', mouth: 'wavy', sweat: true }
    ], { variant: 'overeat', eyes: 'x' });
    dieSeq('golden', [
      {}, { eyes: 'closed', mouth: 'smile', fx: [['sparkle', 0]] }, { eyes: 'closed', mouth: 'smile', dy: -1, fx: [['sparkle', 1]] },
      { eyes: 'wide', mark: '?', wipe: [GD, 0.15] }, { eyes: 'surprised', mouth: 'o', wipe: [GD, 0.3] }, { eyes: 'surprised', mouth: 'o', wipe: [GD, 0.45], dx: 1 },
      { eyes: 'wide', wipe: [GD, 0.6] }, { eyes: 'wide', mouth: 'o', wipe: [GD, 0.75] }, { eyes: 'wide', wipe: [GD, 0.9] },
      { palette: 'gold', shine: true, eyes: 'sparkle', mouth: 'grin', fx: [['burst', 0]] }, { palette: 'gold', shine: true, eyes: 'sparkle', mouth: 'grin', dy: -1 },
      { palette: 'gold', shine: true, sparkle: true, eyes: 'smug', sy: 0.97 }, { palette: 'gold', shine: true, sparkle: true, eyes: 'smug', sy: 0.95, dy: 1 }
    ], { variant: 'golden', eyes: 'x' });
    dieSeq('hermit', [
      {}, { eyes: 'annoyed', brows: 'angry', mark: 'anger' }, { eyes: 'annoyed', brows: 'angry', dx: -1 },
      { eyes: 'side', brows: 'worried', sweat: true }, { eyes: 'side', brows: 'worried', sweat: true, dy: -2 },
      { eyes: 'closed', mouth: 'o', r: 0.5, dy: -10, mound: 1 }, { eyes: 'closed', mouth: 'o', r: 0.9, dy: -12, mound: 1, fx: [['sand', 0]] },
      { eyes: 'closed', r: 1.3, dy: -8, mound: 1, fx: [['sand', 1]] }, { r: 1.57, dy: -3, mound: 1, fx: [['sand', 2]] },
      { r: 1.57, dy: 1, swimF: 0, mound: 1 }, { r: 1.57, dy: 3, swimF: 2, mound: 1 }, { r: 1.57, dy: 6, swimF: 0, mound: 1 }
    ], { hermit: true });
    dieSeq('cleanfreak', [
      { eyes: 'surprised', mark: '!', palette: 'sky' },
      { eyes: 'tight', mouth: 'wavy', palette: 'sky', dx: -3, r: -0.2 },
      { eyes: 'tight', mouth: 'wavy', white: true, dx: 3, r: 0.2 }
    ], { variant: 'cleanfreak' });
    dieSeq('babies', [
      {}, { eyes: 'surprised', mouth: 'o', sy: 1.06 }, { belly: true, eyes: 'wide', mouth: 'o' }, { belly: true, eyes: 'wide', mouth: 'o', sweat: true, dx: 1 },
      { belly: true, eyes: 'tight', mouth: 'wavy', sweat: true, sx: 1.05, sy: 1.05 }, { belly: true, eyes: 'tight', mouth: 'wavy', sweat: true, sx: 1.08, sy: 1.08, dx: -1, fx: [['shiver', 0]] },
      { eyes: 'surprised', mouth: 'o', fx: [['pops', 0]] }, { eyes: 'happy', mouth: 'grin', fx: [['pops', 1]] },
      { mom: true, fx: [['pops', 1]] }, { mom: true, fx: [['pops', 2]] }, { mom: true, eyes: 'surprised', fx: [['pops', 2]] }, { mom: true, eyes: 'dizzy', fx: [['pops', 2]] }
    ], { variant: 'babies', eyes: 'x' });
    dieSeq('bug', [
      {}, { eyes: 'wide', mark: '?' }, { glitch: true, eyes: 'wide', t: 0.1 }, { eyes: 'wide', dx: 3 },
      { eyes: 'x', mix: [BUG_P, 0.5], dx: -2, t: 0.3 }, { glitch: true, eyes: 'dizzy', sx: 1.1, dx: -2, t: 0.55 },
      { glitch: true, eyes: 'wide', sx: 0.9, sy: 1.1, t: 0.7 }, { eyes: 'x', mouth: 'o', mix: ['xray', 0.6], t: 0.8 },
      { glitch: true, eyes: 'x', mouth: 'o', mix: ['xray', 0.6], t: 0.9 }, { glitch: true, eyes: 'surprised', mouth: 'o', dx: 2, t: 1.0 },
      { glitch: true, eyes: 'wide', mouth: 'wavy', sy: 1.1, t: 1.05 }, { glitch: true, eyes: 'wide', t: 1.2 }
    ], { variant: 'bug' });
  })();

  // ===================== v16 追加：掃除機・新しい芸・イベント・死因の小物 =====================
  function segD(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, u = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    var qx = ax + dx * u - px, qy = ay + dy * u - py;
    return Math.sqrt(qx * qx + qy * qy);
  }
  var v16Cache = {};
  function v16(key, w, h, fn) { // 形を関数で塗って輪郭をつけたグリッド（キャッシュ）
    if (v16Cache[key]) return v16Cache[key];
    var g = new Grid(w, h, w >> 1, h >> 1);
    fn(g);
    return (v16Cache[key] = g);
  }

  // ---- 掃除機の吸い口（大）：(x,y)=吸い口の口（下端の中央）。ホースは画面の上まで ----
  // o: { t, suck, bulge(0..1 ホースを上っていくふくらみ), bulgeCol, top(ホースの上端y), open(口のひらき0..1) }
  var VAC_HEAD = (function () {
    var g = new Grid(36, 22, 18, 18);
    g.stamp(function (x, y) {
      if (y < -16 || y > 0) return null;
      var hw = 6 + (y + 16) / 16 * 9; // 上は細く、下は広い
      if (Math.abs(x + 0.5) > hw) return null;
      if (y >= -1) return '#3a2a2e';                         // 口のふち（暗い）
      if (y >= -3) return '#625673';  // 下の帯
      if (y <= -15) return '#9aa6b4';                        // 金属の継ぎ目
      if (x + 0.5 < -hw + 3) return '#e5ddec';               // つや
      if (x + 0.5 > hw - 3) return '#766b87';                // 影
      return '#a99db6';
    }, O, [-17, -17, 17, 1]);
    for (var x = -5; x <= 5; x++) g.set(x, -14, '#d8e0e8');
    for (var k = -12; k < -4; k += 3) g.set(-6 - ((k + 16) >> 2), k, '#ffffff');
    return g;
  })();
  function drawVacuum(ctx, x, y, o) {
    o = o || {}; x = R(x); y = R(y);
    var t = +o.t || 0, top = o.top == null ? -2 : o.top, hy = y - 17;
    var by = o.bulge == null ? null : hy - (hy - top + 12) * o.bulge, bc = o.bulgeCol || '#ff8a00';
    for (var yy = hy; yy >= top; yy--) { // ホース（じゃばら）
      var e = by == null ? 0 : 5 * Math.exp(-((yy - by) * (yy - by)) / 30);
      var hw = 4 + R(e), rib = ((yy - R(t * 30)) % 3 + 3) % 3 === 0;
      rect(ctx, x - hw - 1, yy, hw * 2 + 3, 1, O);
      rect(ctx, x - hw, yy, hw * 2 + 1, 1, rib ? '#189ab9' : '#57d6e6');
      if (e > 2) rect(ctx, x - hw + 2, yy, hw * 2 - 3, 1, rib ? hexMix(bc, '#000000', 0.25) : bc);
      rect(ctx, x - hw + 1, yy, 1, 1, rib ? '#38bed3' : '#c4faff');
    }
    if (o.suck) drawSuctionLines(ctx, x, y + 2, t);
    blit(ctx, VAC_HEAD, x, y);
    if (o.suck) { // 口の中の暗がりがゆれる
      var w = 12 + R(Math.sin(t * 40) * 1);
      rect(ctx, x - w, y - 1, w * 2 + 1, 1, '#120a10');
    }
  }

  // ---- じゃんけんの手（上から差し出す）：(x,y)=手のひらの中心。sign: rock|scissors|paper ----

  // ---- 釣り針（糸は画面の上から）：(x,y)=針の曲がりの底。worm=ミミズ ----
  var HOOK_PTS = (function () { var p = [], i; for (i = -16; i <= -3; i++) p.push([4, i]); for (i = 0; i <= 9; i++) { var a = i / 9 * Math.PI * 1.1; p.push([R(Math.cos(a) * 4), R(-3 + Math.sin(a) * 4)]); } p.push([-4, -4], [-4, -5], [-3, -6]); return p; })();
  function drawHook(ctx, x, y, o) {
    o = o || {}; x = R(x); y = R(y); var t = +o.t || 0, top = o.top == null ? 0 : o.top;
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x + 4, top, 1, Math.max(0, y - 17 - top));
    for (var i = 0; i < HOOK_PTS.length; i++) rect(ctx, x + HOOK_PTS[i][0] - 1, y + HOOK_PTS[i][1], 3, 1, O);
    for (i = 0; i < HOOK_PTS.length; i++) rect(ctx, x + HOOK_PTS[i][0], y + HOOK_PTS[i][1], 1, 1, i < 6 ? '#e8eef4' : '#a8b4c0');
    rect(ctx, x + 2, y - 18, 5, 2, O); rect(ctx, x + 3, y - 18, 3, 1, '#c8d0dc'); // 糸の結び目
    rect(ctx, x - 4, y - 7, 1, 1, O); rect(ctx, x - 5, y - 6, 1, 1, O);             // かえし
    if (o.worm) { // ミミズ（針にからまって、くねくね）
      for (var k = 0; k < 13; k++) {
        var wx = x + R(Math.sin(k * 0.8 + t * 10) * 3) - 1, wy = y - 12 + k;
        rect(ctx, wx - 2, wy, 6, 1, O); rect(ctx, wx - 1, wy, 4, 1, k % 3 === 0 ? '#e0607e' : '#ff9ab0'); rect(ctx, wx - 1, wy, 1, 1, '#ffc8d4');
      }
      rect(ctx, x + R(Math.sin(12 * 0.8 + t * 10) * 3) - 2, y + 1, 4, 1, O);
      var wx = x + R(Math.sin(t * 10) * 3);
      outEllipse(ctx, wx - 2, y - 14, 2, 2, '#fff');
      outEllipse(ctx, wx + 2, y - 13, 2, 2, '#fff');
      rect(ctx, wx - 2, y - 14, 1, 1, O); rect(ctx, wx + 2, y - 13, 1, 1, O);
    }
  }

  // ---- 猛暑：太陽・温度計・氷 ----
  function drawSun(ctx, x, y, t, o) {
    o = o || {}; x = R(x); y = R(y); t = +t || 0;
    var ph = Math.floor(t * 6) % 2;
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4, rx = x + R(Math.cos(a) * 11), ry = y + R(Math.sin(a) * 11);
      rect(ctx, rx - 2, ry - 2, 6 + (ph & i), 5, O);
      rect(ctx, rx - 1, ry - 1, 4 + (ph & i), 3, '#ffdf29');
    }
    ellipse(ctx, x, y, 10, 10, O); ellipse(ctx, x, y, 9, 9, '#ffb12b');
    outEllipse(ctx, x - 4, y - 2, 3, 3, '#fff'); outEllipse(ctx, x + 4, y - 2, 3, 3, '#fff');
    rect(ctx, x - 4, y - 3, 1, 2, O); rect(ctx, x + 4, y - 3, 1, 2, O);
    outEllipse(ctx, x, y + 4, 3, 1.8, LIP); rect(ctx, x - 1, y + 4, 3, 1, O);
    if (o.sweat) drawDrop(ctx, x + 9, y - 6);
  }
  function drawThermo(ctx, x, y, lv) { // (x,y)=球の中心。lv 0..1
    x = R(x); y = R(y); lv = Math.max(0, Math.min(1, +lv || 0));
    rect(ctx, x - 3, y - 44, 7, 42, O); rect(ctx, x - 2, y - 43, 5, 41, '#fff7e0');
    ellipse(ctx, x, y, 5, 5, O); ellipse(ctx, x, y, 4, 4, '#ff4128');
    rect(ctx, x - 2, y, 1, 2, '#fff7e0');
    var h = R(38 * lv); rect(ctx, x - 1, y - 2 - h, 3, h + 2, '#e8302a'); rect(ctx, x - 1, y - 2 - h, 1, h + 2, '#ff8a7a');
    for (var k = 0; k < 6; k++) rect(ctx, x + 2, y - 8 - k * 6, 2, 1, O);
  }
  function drawIce(ctx, x, y, s) {
    x = R(x); y = R(y); s = s || 5;
    cardRoundRect(ctx, x - s - 1, y - s - 1, 2 * s + 3, 2 * s + 3, O);
    cardRoundRect(ctx, x - s, y - s, 2 * s + 1, 2 * s + 1, '#72e2ed');
    var side = Math.max(2, R(s * 0.4));
    rect(ctx, x + s - side + 1, y - s + 2, side, 2 * s - 3, '#08a7c2');
    rect(ctx, x - s + 2, y - s + 1, 2 * s - side - 1, 2, '#eeffff');
    rect(ctx, x - s + 2, y - s + 3, 2, Math.max(1, R(s * 0.65)), '#eeffff');
    rect(ctx, x + s - side, y + s - 2, side - 1, 1, '#ceffff');
  }
  function drawTowel(ctx, x, y) { // 頭にのせる手ぬぐい（たたんだもの）。(x,y)=下端の中央
    x = R(x); y = R(y);
    rect(ctx, x - 7, y - 4, 15, 5, O); rect(ctx, x - 6, y - 5, 13, 1, O);
    rect(ctx, x - 6, y - 4, 13, 4, '#ffffff'); rect(ctx, x - 6, y - 2, 13, 1, '#5a9ae8'); rect(ctx, x - 6, y - 1, 13, 1, '#dfe8f4');
  }

  // ---- カメラ（水槽の前で構える） ----
  function drawCamera(ctx, x, y, o) {
    o = o || {}; x = R(x); y = R(y); var t = +o.t || 0;
    rect(ctx, x - 19, y - 12, 39, 25, O); rect(ctx, x - 18, y - 13, 37, 27, O);
    rect(ctx, x - 18, y - 12, 37, 25, '#ff792b'); rect(ctx, x - 18, y - 12, 37, 4, CREAM); rect(ctx, x - 18, y + 9, 37, 4, CREAM);
    rect(ctx, x - 18, y - 8, 37, 1, O); rect(ctx, x - 18, y + 8, 37, 1, O);
    rect(ctx, x + 12, y - 4, 5, 5, O); rect(ctx, x + 13, y - 3, 3, 3, '#ffde3a');
    rect(ctx, x + 8, y - 17, 9, 5, O); rect(ctx, x + 9, y - 16, 7, 4, o.flash ? '#ffffff' : '#e8f0f8'); // フラッシュ
    rect(ctx, x - 14, y - 15, 6, 3, O); rect(ctx, x - 13, y - 14, 4, 2, '#e84a3a');                      // シャッター
    ellipse(ctx, x, y, 10, 10, O); ellipse(ctx, x, y, 9, 9, CREAM); ellipse(ctx, x, y, 7, 7, O); ellipse(ctx, x, y, 5, 5, '#0d8191');
    rect(ctx, x - 3, y - 3, 2, 2, '#ffffff'); rect(ctx, x + 2, y + 2, 1, 1, '#9ac8ff');
    if (o.rec && (Math.floor(t * 3) & 1)) rect(ctx, x + 14, y - 9, 2, 2, '#ff3a3a');
    if (o.flash) { var a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * 0.6; ellipse(ctx, x + 12, y - 15, 14, 9, '#ffffe0'); ctx.globalAlpha = a0; }
  }
  // ---- ポラロイド写真：(x,y)=中心。o: 写真に写す魚の opts（eyes mouth color stage）。scale / sx で幅 ----
  function drawPolaroid(ctx, x, y, o) {
    o = o || {}; var sc = o.scale === true ? 2 : (+o.scale || 1), sxm = o.sx == null || !isFinite(+o.sx) ? 1 : Math.max(0.15, Math.min(2, +o.sx || 1));
    x = R(x); y = R(y);
    var hw = Math.max(1, R(15 * sc * sxm)), hh = R(18 * sc), py0 = y - hh + R(3 * sc), ph = R(25 * sc);
    rect(ctx, x - hw - 1, y - hh, hw * 2 + 3, hh * 2 + 1, O); rect(ctx, x - hw, y - hh - 1, hw * 2 + 1, hh * 2 + 3, O);
    rect(ctx, x - hw, y - hh, hw * 2 + 1, hh * 2 + 1, CREAM);
    var iw = Math.max(0, hw - R(3 * sc));
    if (iw > 0) {
      rect(ctx, x - iw, py0, iw * 2 + 1, ph, '#7ad8c4'); rect(ctx, x - iw, py0 + ph - R(5 * sc), iw * 2 + 1, R(5 * sc), '#f0b070');
      ctx.save(); ctx.beginPath(); ctx.rect(x - iw, py0, iw * 2 + 1, ph); ctx.clip();
      drawFish(ctx, x, py0 + R(13 * sc), { color: o.color, stage: o.stage, front: true, eyes: o.photoEyes || 'surprised', mouth: o.photoMouth || 'o', scale: 0.62 * sc, sx: sxm, t: 0 });
      ctx.restore();
      if (sxm > 0.6) { rect(ctx, x - iw + 1, py0 + 1, 3, 1, 'rgba(255,255,255,0.8)'); rect(ctx, x - iw + 1, py0 + 2, 1, 2, 'rgba(255,255,255,0.8)'); }
      rect(ctx, x - iw, py0 + ph, iw * 2 + 1, 1, '#ba9e84');
    }
    if (sxm > 0.7 && sc >= 1) { // 下の余白の手書き文字
      rect(ctx, x - R(8 * sc), y + hh - R(5 * sc), R(5 * sc), 1, '#8a7a6a'); rect(ctx, x - R(1 * sc), y + hh - R(6 * sc), R(9 * sc), 1, '#8a7a6a');
    }
  }

  // ---- 手品：シルクハット・白手袋・ステッキ ----
  var HAT = (function () {
    var g = new Grid(40, 34, 20, 30);
    g.stamp(function (x, y) {
      var px = x + 0.5;
      if (y >= -3 && y <= 0 && Math.abs(px) <= 16) return y === -3 ? '#81758b' : '#362a37';     // つば
      if (y < -3 && y >= -26 && Math.abs(px) <= 10) {
        if (y >= -9 && y <= -6) return '#ff4e53';                       // リボン
        if (px < -6) return '#4a4a60';
        return '#2a2a3a';
      }
      if (y === -27 && Math.abs(px) <= 9) return '#4a4a60';
      return null;
    }, O, [-18, -29, 18, 2]);
    for (var y = -24; y < -10; y += 3) g.set(-8, y, '#7a7a96');
    return g;
  })();
  function drawTopHat(ctx, x, y, o) { o = o || {}; var r = +o.rot; blit(ctx, HAT, x, y, r && isFinite(r) ? { rot: r } : o.flip ? { flip: true } : null); }
  function drawGlove(ctx, x, y, o) { // 上から差しこむ白手袋。(x,y)=手の中心。wand=ステッキを持つ
    o = o || {}; x = R(x); y = R(y);
    for (var yy = Math.max(0, y - 120); yy < y - 6; yy++) { rect(ctx, x - 5, yy, 11, 1, O); rect(ctx, x - 4, yy, 9, 1, yy > y - 12 ? '#ffffff' : '#2a2a3a'); }
    rect(ctx, x - 6, y - 12, 13, 3, O); rect(ctx, x - 5, y - 11, 11, 1, '#ffffff'); // 袖口
    ellipse(ctx, x + 5, y + 1, 3, 3, O); ellipse(ctx, x, y, 7, 6, O); ellipse(ctx, x, y, 6, 5, '#fff9ec');
    ellipse(ctx, x + 5, y + 1, 2, 2, '#fff9ec');
    for (var k = -1; k <= 1; k++) { rect(ctx, x + k * 3 - 1, y + 4, 3, 3, O); rect(ctx, x + k * 3, y + 4, 1, 2, '#f0f0f8'); }
    rect(ctx, x + 2, y - 3, 3, 1, '#d8d8e8'); rect(ctx, x + 2, y + 1, 3, 1, '#d8d8e8');
    if (o.wand) {
      var a = o.wand === true ? 0.6 : +o.wand, ca = Math.cos(a), sa = Math.sin(a);
      for (var d = -2; d < 20; d++) { var wx = x + R(ca * d), wy = y + R(sa * d); rect(ctx, wx - 1, wy - 1, 3, 3, O); }
      for (var d2 = -2; d2 < 20; d2++) rect(ctx, x + R(ca * d2), y + R(sa * d2), 1, 1, d2 > 15 ? '#ffda38' : '#6c5b7c');
      if (o.spark) { var sx2 = x + R(ca * 22), sy2 = y + R(sa * 22); star4(ctx, sx2, sy2, 3, '#fff27a', '#ffffff'); rect(ctx, sx2 + 3, sy2 - 4, 1, 1, '#ffffff'); }
    }
  }
  // ---- ハト（lips=金魚のくちびると目のまま） ----
  function pigeonGrid(fr, lips) {
    return v16('pg' + fr + (lips ? 'L' : ''), 48, 40, function (g) {
      var wy = [-14, -4, 6][fr];
      g.stamp(function (x, y) {
        var px = x + 0.5, py = y + 0.5;
        var body = (px + 1) * (px + 1) / 121 + (py - 2) * (py - 2) / 49 < 1;
        var head = (px - 9) * (px - 9) / 36 + (py + 6) * (py + 6) / 36 < 1;
        var tail = px < -9 && px > -19 && Math.abs(py - 1 + (px + 9) * 0.35) < 2.5 + (-9 - px) * 0.3;
        var wing = segD(px, py, -2, -1, -9, wy) < 4.2 || segD(px, py, -9, wy, -16, wy + (fr === 2 ? 3 : -2)) < 3;
        if (wing) return px < -10 ? '#eee0c8' : '#fff9e9';
        if (head || body || tail) return py > 5 ? '#eee0c8' : '#fff9e9';
        if (!lips && px > 14 && px < 18.5 && Math.abs(py + 5.5) < 1.3) return '#ff9a2a';
        return null;
      }, O, [-21, -20, 21, 15]);
      if (lips) { // 金魚の大きな白目と赤いくちびるのまま
        g.stamp(function (x, y) { var px = x + 0.5, py = y + 0.5; return (px - 10) * (px - 10) + (py + 10) * (py + 10) < 17 ? '#ffffff' : null; }, FK, [4, -16, 16, -4]);
        g.set(12, -10, '#000000'); g.set(13, -10, '#000000'); g.set(12, -9, '#000000'); g.set(13, -9, '#000000');
        g.stamp(function (x, y) { var px = x + 0.5, py = y + 0.5; var e = (px - 16) * (px - 16) / 14 + (py + 3) * (py + 3) / 8; return e < 1 ? (py < -4 ? LIP_L : '#ff3a2a') : null; }, FK, [11, -8, 21, 1]);
        for (var k = 14; k <= 18; k++) g.set(k, -3, SLIT);
        g.set(6, -3, BLUSH); g.set(7, -3, BLUSH);
      } else popEye(g, 10, -7, 3.7, 1);
      g.set(-2, 9, '#ff9a2a'); g.set(-2, 10, '#ff9a2a'); g.set(2, 9, '#ff9a2a'); g.set(2, 10, '#ff9a2a'); // あし
    });
  }
  function drawPigeon(ctx, x, y, t, o) {
    o = o || {}; var fr = o.flap != null ? o.flap % 3 : Math.floor((+t || 0) * 10) % 3, bo = {};
    if (o.dir < 0) bo.mirror = true; if (o.scale && o.scale !== 1) bo.scale = o.scale;
    blit(ctx, pigeonGrid(fr, !!o.lips), x, y, bo);
  }
  // ---- 星（金魚の顔つき）：星になった ----
  var STARF = (function () {
    var g = new Grid(30, 30, 15, 15), pts = [];
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i & 1 ? 5.5 : 12; pts.push([Math.cos(a) * r, Math.sin(a) * r + 1]); }
    g.stamp(function (x, y) { var px = x + 0.5, py = y + 0.5; return inPoly(px, py, pts) ? (py < -2 && px < 0 ? '#fff27a' : py > 4 ? '#f0b020' : '#ffd23a') : null; }, '#8a5a08', [-13, -12, 13, 13]);
    g.stamp(function (x, y) { var px = x + 0.5, py = y + 0.5; return ((px + 3) * (px + 3) + (py + 1) * (py + 1) < 5.5 || (px - 3) * (px - 3) + (py + 1) * (py + 1) < 5.5) ? '#ffffff' : null; }, FK, [-6, -4, 6, 2]);
    g.set(-3, -1, '#000000'); g.set(3, -1, '#000000');
    g.stamp(function (x, y) { var px = x + 0.5, py = y + 0.5; return px * px / 7 + (py - 4) * (py - 4) / 2.5 < 1 ? LIP : null; }, FK, [-3, 2, 3, 6]);
    g.set(-1, 4, SLIT); g.set(0, 4, SLIT);
    g.set(-6, 2, BLUSH); g.set(6, 2, BLUSH);
    return g;
  })();
  function drawFishStar(ctx, x, y, t, o) {
    o = o || {}; t = +t || 0; var s = +o.scale || 1, tw = Math.floor(t * 4) % 4;
    blit(ctx, STARF, x, y, s !== 1 ? { scale: s } : null);
    var L = R((3 + (tw === 1 ? 3 : tw === 3 ? 1 : 2)) * s), x0 = R(x + 12 * s), y0 = R(y - 11 * s);
    star4(ctx, x0, y0, L, '#ffffff', '#fff27a');
    if (tw & 1) star4(ctx, R(x - 13 * s), R(y + 8 * s), R(2 * s), '#fff8c0');
  }

  // ---- 新しい死因の静止形（drawFish から呼ぶ） ----
  var BOIL_P = { B: '#ff5040', D: '#d8302a', L: '#ff9a80', P: '#ffd0c0', F: '#ff6a50', W: '#ffffff', K: FK };
  function drawBoiled(ctx, x, y, o) {
    var sc = o.scale === true ? 2 : (+o.scale || 1);
    var q = merge(o, { boiled: false, _pal: BOIL_P, _dk: (o._dk || '') + 'bo' });
    drawFish(ctx, x, y, q);
    var A = dieAnchor(merge(q, { scale: sc }), x, y);
    drawTowel(ctx, A.top[0] - A.dir * R(1 * sc), A.top[1] + R(3 * sc));
    if (o.fx !== false && o.steam !== false) { var tt = +o.t || 0; for (var i = 0; i < 3; i++) { var ph = (tt * 0.8 + i / 3) % 1; ellipse(ctx, A.top[0] + R((i - 1) * 7 * sc + Math.sin(ph * 6 + i) * 2), A.top[1] - R((4 + ph * 14) * sc), R(1 + ph * 2), R(1 + ph * 2), 'rgba(255,255,255,' + (0.8 * (1 - ph)).toFixed(2) + ')'); } }
  }

  // ===== v16：新しい死に方のコマ（小物は main.js が描く） =====
  (function () {
    var TW = { eyes: 'teary', brows: 'worried', mouth: 'wavy' };
    var m = function (a, b) { return merge(a, b); };
    var DN = Math.PI / 2; // 頭を下へ（右向き基準。dir<0 は左右反転で同じく下）
    // 吸い込まれた：気づく 0-2 → 振りむいて下へ 3-5 → ふんばる 6-9 → ぐいっと引かれる 10-11 → のびる 12-15 → 最後
    dieSeq('sucked', [
      { look: 'up', eyes: 'side', mark: '?' }, { look: 'up', eyes: 'wide' }, { surpF: 1, mark: '!' },
      { eyes: 'surprised', mouth: 'o', sweat: true, r: 0.5, dy: 1 }, m(TW, { sweat: true, r: 1.0, swimF: 0 }), m(TW, { sweat: true, r: 1.35, swimF: 2 }),
      { eyes: 'angry', mouth: 'grin', sweat: true, r: DN, swimF: 0, sx: 0.94, sy: 1.04 }, { eyes: 'angry', mouth: 'grin', sweat: true, r: DN, swimF: 1 },
      { eyes: 'tight', mouth: 'grin', sweat: true, r: DN, swimF: 2, sx: 1.04, sy: 0.97 }, { eyes: 'angry', mouth: 'grin', sweat: true, r: DN, swimF: 3 },
      { surpF: 0, r: DN }, { eyes: 'surprised', mouth: 'o', mark: '!', r: DN, sx: 1.12, sy: 0.93 },
      m(TW, { sweat: true, r: DN, swimF: 0, sx: 1.2, sy: 0.9 }), m(TW, { sweat: true, r: DN, swimF: 2, sx: 1.32, sy: 0.85 }),
      { eyes: 'tight', mouth: 'wavy', r: DN, sx: 1.45, sy: 0.8, fx: [['shiver', 0]] }, { eyes: 'surprised', mouth: 'o', r: DN, sx: 1.6, sy: 0.75 }
    ], { eyes: 'x', mouth: 'o', r: DN, sx: 1.6, sy: 0.75, wag: 0 });
    // 釣られた：ミミズにぱくっ → もぐもぐ → チクッ → 引っぱられて口から上へ
    dieSeq('fished', [
      { eyes: 'sparkle', mouth: 'o', look: 'up' }, { eatF: 0 }, { chewF: 1 }, { chewF: 2, blush: true },
      { surpF: 0 }, { surpF: 1, mark: '!', r: -0.3, dy: -2 },
      m(TW, { mouth: 'o', sweat: true, r: -0.6, dy: -3, swimF: 0 }), m(TW, { mouth: 'o', r: -0.9, dy: -4, swimF: 2 }),
      m(TW, { mouth: 'o', r: -0.6, dy: -4, swimF: 0, fx: [['drops', 0]] }), { eyes: 'tight', mouth: 'o', r: -1.0, dy: -5, swimF: 2, fx: [['shiver', 0]] },
      { eyes: 'surprised', mouth: 'o', sweat: true, r: -1.3, dy: -6 }, { eyes: 'dizzy', mouth: 'o', r: -1.45, dy: -6 }
    ], { eyes: 'x', mouth: 'o', r: -DN, dy: -6, wag: 0 });
    // のぼせた：あつい → まっ赤 → ぐるぐる → いい湯だな（手ぬぐい）
    dieSeq('boiled', [
      { eyes: 'normal', sweat: true }, { eyes: 'side', sweat: true, mix: [BOIL_P, 0.1] }, m(TW, { sweat: true, mix: [BOIL_P, 0.2] }),
      { eyes: 'teary', mouth: 'tongue', sweat: true, mix: [BOIL_P, 0.35], fx: [['steam', 0]] },
      { eyes: 'dizzy', mouth: 'tongue', sweat: true, mix: [BOIL_P, 0.5], r: 0.15, fx: [['steam', 1]] },
      { eyes: 'dizzy', mouth: 'wavy', mix: [BOIL_P, 0.65], r: -0.12, fx: [['steam', 2]] },
      { eyes: 'closed', mouth: 'o', mix: [BOIL_P, 0.8], sx: 1.05, sy: 0.95, fx: [['steam', 1]] },
      { eyes: 'calm', mouth: 'smile', blush: true, mix: [BOIL_P, 0.92], fx: [['steam', 2]] },
      { boiled: true, steam: false, eyes: 'calm', mouth: 'smile', blush: true, dy: -1, fx: [['burst', 0]] },
      { boiled: true, steam: false, eyes: 'calm', mouth: 'o', blush: true, fx: [['steam', 2]] },
      { boiled: true, steam: false, eyes: 'calm', mouth: 'smile', blush: true, r: 0.08, fx: [['steam', 1]] },
      { boiled: true, steam: false, eyes: 'closed', mouth: 'smile', blush: true, r: -0.06, dy: 1, fx: [['steam', 2]] }
    ], { boiled: true, eyes: 'calm', mouth: 'smile', blush: true });
    // 写真になった：カメラに振り向く → フラッシュ → 色がとぶ → くるっと写真に
    dieSeq('photo', [
      { eyes: 'normal' }, { turnF: 1, eyes: 'wide' }, { turnF: 2, eyes: 'wide', mouth: 'o' },
      { front: true, surpF: 0 }, { front: true, eyes: 'surprised', mouth: 'o', mix: ['white', 0.3], fx: [['burst', 1]] },
      { front: true, eyes: 'surprised', mouth: 'o', mix: ['white', 0.6] }, { front: true, eyes: 'surprised', mouth: 'o', mix: ['white', 0.85], sx: 0.7 },
      { front: true, eyes: 'surprised', mouth: 'o', mix: ['white', 1], sx: 0.35 },
      { photo: true, sx: 0.3 }, { photo: true, sx: 0.7 }, { photo: true, fx: [['sparkle', 0]] }, { photo: true, dx: 1 }, { photo: true, dx: -1 }
    ], { photo: true });
    // ハトにされた：シルクハットをかぶせられて…ポン（ハトが出るのは main.js が帽子を上げてから）
    // 星になった：かがむ → 発射（頭が上）→ くるくる小さく → 星
    dieSeq('star', [
      { eyes: 'sparkle', mouth: 'grin' }, { eyes: 'closed', mouth: 'grin', sx: 1.15, sy: 0.8, dy: 2 }, { eyes: 'closed', mouth: 'grin', sx: 1.25, sy: 0.72, dy: 3 },
      { eyes: 'surprised', mouth: 'o', r: -DN, sx: 0.85, sy: 1.25, fx: [['speed', 0]] }, { eyes: 'surprised', mouth: 'o', r: -DN, sx: 0.9, sy: 1.15, fx: [['speed', 0]] },
      { eyes: 'dizzy', mouth: 'o', r: -1.0, sc: 0.85 }, { eyes: 'dizzy', mouth: 'o', r: 0.2, sc: 0.7 }, { eyes: 'dizzy', mouth: 'o', r: 1.6, sc: 0.55 },
      { eyes: 'x', mouth: 'o', r: 3.0, sc: 0.45, fx: [['burst', 0]] },
      { draw: 'star', sc: 0.5 }, { draw: 'star', sc: 0.85, fx: [['sparkle', 0]] }, { draw: 'star', sc: 1.15 }
    ], { draw: 'star' });

    // ===== v19：お客さんとの突然死（12コマ/秒の手描きキー → 中割りで36コマ/秒） =====
    // 散髪されすぎ（カニ）：きょとん → チョキ（尾）→ ひやっ → チョキ（背びれ）→ チョキ（胸びれ）→ 涙目でまるはだか → くたっと浮く
    dieSeq('haircut', [
      { eyes: 'sparkle', mouth: 'smile' }, { eyes: 'sparkle', mouth: 'o', look: 'down' },
      { surpF: 0, fx: [['snip', 0]] }, { surpF: 1, trim: 0.25, fx: [['snip', 1]] }, { eyes: 'surprised', mouth: 'o', trim: 0.3, dy: -2, sweat: true },
      { eyes: 'tight', mouth: 'wavy', trim: 0.45, dx: -1, fx: [['snip', 0]] }, { eyes: 'teary', mouth: 'o', trim: 0.55, dx: 1, fx: [['snip', 1]] },
      { eyes: 'tight', mouth: 'wavy', trim: 0.7, fx: [['snip', 0]] }, { eyes: 'teary', mouth: 'o', trim: 0.8, sweat: true, fx: [['snip', 1]] },
      { eyes: 'teary', brows: 'worried', mouth: 'wavy', trim: 0.95, sx: 0.96, sy: 1.04, fx: [['shiver', 0]] },
      { eyes: 'teary', brows: 'worried', mouth: 'wavy', trim: 1, sx: 1.03, sy: 0.97, fx: [['shiver', 1]] },
      { eyes: 'x', mouth: 'o', trim: 1, roll: 0.25, dy: -1 }, { eyes: 'x', mouth: 'o', trim: 1, roll: 0.5, dy: -2 }, { eyes: 'x', mouth: 'tongue', trim: 1, roll: 0.75, dy: -1 }
    ], { eyes: 'x', mouth: 'tongue', trim: 1, flip: true, sy: 0.94 });
    dieSeq('squashed', [
      { eyes: 'side', mouth: 'o' }, { eyes: 'surprised', mark: '!' },
      { eyes: 'tight', mouth: 'wavy', sx: 1.14, sy: 0.55, dy: 4 }
    ], { variant: 'squashed', dy: 8 });
    dieSeq('loach', [
      { eyes: 'side', mouth: 'o', mark: '?' },
      { eyes: 'closed', mouth: 'grin', r: 0.65 },
      { eyes: 'surprised', mouth: 'o', r: 1.57, dy: 9 },
      { eyes: 'tight', mouth: 'wavy', r: 1.35, dy: 15 }
    ], { eyes: 'tight', mouth: 'wavy', r: 1.57, dy: 18, wag: 0 });
    // v20 ナマズにのまれた（ナマズ）：ごあいさつ → 大きな口 → ぎょっ → 吸いよせられる（のびる・ちぢむ）→ ちいさくなって消える
    dieSeq('catfish', [
      { eyes: 'sparkle', mouth: 'smile' }, { eyes: 'normal', mouth: 0, look: 'up' },
      { surpF: 0 }, { surpF: 1, mark: '!', dy: -2 }, { eyes: 'surprised', mouth: 'o', sweat: true, dx: -1 },
      { eyes: 'tight', mouth: 'wavy', sweat: true, dx: -2, sx: 0.94, sy: 1.04, fx: [['shiver', 0]] },
      { eyes: 'tight', mouth: 'wavy', sweat: true, dx: 1, sx: 1.12, sy: 0.92, fx: [['shiver', 1]] },
      { eyes: 'surprised', mouth: 'o', dx: 4, sx: 1.25, sy: 0.85, r: 0.08 }, { eyes: 'surprised', mouth: 'o', dx: 8, sx: 1.3, sy: 0.8, sc: 0.85, r: 0.12 },
      { eyes: 'x', mouth: 'o', dx: 12, sx: 1.25, sy: 0.82, sc: 0.65, r: 0.2 }, { eyes: 'x', mouth: 'o', dx: 15, sc: 0.45, r: 0.3 }
    ], { eyes: 'x', mouth: 'o', dx: 17, sc: 0.25, r: 0.4, a: 0.6 });
  })();

  // v17: 死に際のコマの「中割り」。となりあう2コマのあいだに2コマずつ足して、1秒24コマでなめらかに送る。
  //  目・口・フラグ・演出(fx)は前のコマのまま、位置・回転・倍率・透明度・色の寄せ具合・裏返り などの数値だけを補間する。
  //  小さく左右にふるえるコマ（ぶるぶる）は補間せず、そのまま置く（ふるえの勢いを残す）。
  //  main.js がコマ番号を直接指定する死因（sucked fished pigeon star）は対象外。DEATH_FRAMES[k].sub が分割数（中割りなしは 1）。
  (function () {
    var SUB = 3, SKIP = {}, PID = 0;   // v20: 吸い込み・釣り・ハト・星にも中割り（main.js はコマ番号×sub で指定）
    var DEF = { dx: 0, dy: 0, r: 0, sx: 1, sy: 1, sc: 1, a: 1 };       // 片方に無くても補間してよい値（無い＝既定値）
    var BOTH = ['roll', 'twin', 'legK', 'clipT', 'clipB'];               // 両方にあるときだけ補間
    var INTS = ['beak', 'wing', 'spikes'];                               // 大きさ（整数）
    var jitter = function (a, b, lim) { return a * b < 0 && Math.abs(a) <= lim && Math.abs(b) <= lim; };
    function between(A, B, u) {
      var P = merge(A, {}), k;
      delete P._gm;
      for (k in DEF) {
        if (A[k] == null && B[k] == null) continue;
        var a = A[k] == null ? DEF[k] : +A[k], b = B[k] == null ? DEF[k] : +B[k];
        if (!isFinite(a) || !isFinite(b)) continue;
        if ((k === 'dx' || k === 'dy') && jitter(a, b, 2)) continue;
        if (k === 'r' && jitter(a, b, 0.3)) continue;
        P[k] = a + (b - a) * u;
      }
      BOTH.forEach(function (k) { if (typeof A[k] === 'number' && typeof B[k] === 'number') P[k] = A[k] + (B[k] - A[k]) * u; });
      INTS.forEach(function (k) { if (typeof A[k] === 'number' && typeof B[k] === 'number') P[k] = Math.round(A[k] + (B[k] - A[k]) * u); });
      if (A.mix && B.mix && A.mix[0] === B.mix[0]) P.mix = [A.mix[0], Math.round((A.mix[1] + (B.mix[1] - A.mix[1]) * u) * 20) / 20];
      if (A.wipe && B.wipe && A.wipe[0] === B.wipe[0]) P.wipe = [A.wipe[0], A.wipe[1] + (B.wipe[1] - A.wipe[1]) * u];
      if (P.dx != null) P.dx = Math.round(P.dx); if (P.dy != null) P.dy = Math.round(P.dy);
      if (P.sx != null) P.sx = Math.round(P.sx * 40) / 40; if (P.sy != null) P.sy = Math.round(P.sy * 40) / 40;
      if (P.sc != null) P.sc = Math.round(P.sc * 20) / 20;
      P._tw = 1;
      // v20: 前のコマと数値が1つも変わらない中割りは作らず、前のコマをそのまま使う（省く）
      var same = true; for (k in P) if (k !== '_tw' && k !== '_gm' && P[k] !== A[k] && !(Array.isArray(P[k]) && Array.isArray(A[k]) && P[k].join() === A[k].join())) { same = false; break; }
      return same ? A : P;
    }
    Object.keys(DIE).forEach(function (k) {
      if (SKIP[k]) { DIE_FRAMES[k].sub = 1; return; }
      var D = DIE[k], out = [];
      for (var i = 0; i < D.length; i++) {
        out.push(D[i]);
        if (i < D.length - 1) for (var j = 1; j < SUB; j++) out.push(between(D[i], D[i + 1], j / SUB));
      }
      out.forEach(function (P) { if (P._pid == null) P._pid = ++PID; });
      DIE[k] = out;
      DIE_FRAMES[k] = { n: out.length, hold: out.length - 1, fps: 12 * SUB, sub: SUB, keys: D.length };
    });
  })();

  var mixMemo = {};
  function dieTarget(t, col) {
    if (typeof t === 'object') return t;
    if (t === 'old') return PAL[OLDPAL[col]];
    if (t === 'zen') return zenPal(col);
    return FISH_PALETTES[t] || PAL[t] || FISH_PALETTES.normal;
  }
  function mixPal(col, t, k) {
    var from = FISH_PALETTES[col === 'orange' ? 'normal' : col], to = dieTarget(t, col);
    if (k >= 1) return to;
    var key = col + '|' + (typeof t === 'object' ? t.B : t) + '|' + k;
    if (mixMemo[key]) return mixMemo[key];
    var r = {};
    ['B', 'D', 'L', 'P', 'F', 'W'].forEach(function (c) { r[c] = hexMix(from[c], to[c], k); });
    r.VF = hexMix(from.VF, to.VF || to.F, k);
    r.K = k > 0.6 ? to.K : from.K;
    return (mixMemo[key] = r);
  }
  // 2つのグリッドを x のしきい値で合成（pick=true の所は B）
  function compose(A, B, pick) {
    var a = bbox(A), b = bbox(B);
    var x0 = Math.min(a[0], b[0]) - 1, y0 = Math.min(a[1], b[1]) - 1, x1 = Math.max(a[2], b[2]) + 1, y1 = Math.max(a[3], b[3]) + 1;
    var G = new Grid(x1 - x0, y1 - y0, -x0, -y0);
    G.K = A.K; G.keep = A.keep; G.keepSep = A.keepSep;
    for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) { var c = pick(x, y) ? B.get(x, y) : A.get(x, y); if (c) G.set(x, y, c); }
    return G;
  }
  function dieMods(P) {
    if (P._gm !== undefined) return P._gm;
    var list = [];
    if (P.wipe) list.push(function (g, o, S, frame, tframe, isFront) {
      var ob = merge(o, P.wipe[0]); ob._pal = P.wipe[0]._pal || null; ob._gm = null;
      var gB = isFront ? buildFront(ob, frame, S, tframe) : buildFish(ob, frame, S, null, tframe);
      var lo = S.tb - S.tl - 5, hi = S.cx + S.rx + 5, th = lo + (hi - lo) * P.wipe[1];
      return compose(g, gB, function (x, y) { return x + 0.5 + 1.6 * Math.sin(y * 0.9) < th; });
    });
    if (P.beak) list.push(function (g, o, S) {
      var L = P.beak, E = eyeCenters(S, o), my = R(S.ry * 0.16) + 1, bx = E.front - 2 + L * 0.5;
      g.stamp(function (x, y) {
        var dx = (x + 0.5 - bx) / (L * 0.62 + 1.5), dy = (y + 0.5 - my) / (1.6 + L * 0.2);
        if (dx * dx + dy * dy > 1) return null;
        return y + 0.5 > my + 0.3 ? '#e0761a' : (y + 0.5 < my - 1 && x < bx) ? '#ffc060' : '#ff9a2a';
      }, O, [bx - L - 3, my - 5, bx + L + 3, my + 5]);
      for (var k = 1; k < L; k++) g.set(R(bx - L * 0.62 + k), my, '#b85a10');
    });
    if (P.wing) list.push(function (g, o, S) {
      var n = P.wing, wx = S.cx - 9 + n * 0.5, wy = 2, ru = 3 + n * 1.5, rv = 2 + n * 0.6, a = 0.25 + n * 0.08, c = Math.cos(a), s = Math.sin(a);
      g.stamp(function (x, y) {
        var dx = x + 0.5 - wx, dy = y + 0.5 - wy, u = c * dx + s * dy, v = -s * dx + c * dy;
        if (u * u / (ru * ru) + v * v / (rv * rv) > 1) return null;
        if (u < -ru * 0.3 && (x & 1) === 0 && v > -rv * 0.3) return '#e0a820';
        return v < -rv * 0.3 ? '#fff6b0' : '#ffe060';
      }, O, [wx - ru - 2, wy - ru - 2, wx + ru + 2, wy + ru + 2]);
    });
    if (P.spikes) list.push(function (g, o, S) {
      var n = P.spikes, AC = ACCENT[colorOf(o)], top = -R(S.ry) + 1;
      var tri = [];
      for (var i = 0; i < 4; i++) { var bx = S.cx - 13 + i * 5; tri.push([[bx - 2, top + 1], [bx + 2, top + 1], [bx - 1, top - n - (i === 1 ? 1 : 0)]]); }
      g.stamp(function (x, y) { for (var j = 0; j < tri.length; j++) if (inPoly(x + 0.5, y + 0.5, tri[j])) return (x & 1) ? AC[0] : AC[1]; return null; }, O, [S.cx - 18, top - n - 3, S.cx + 8, top + 2]);
      // 角とひげ
      var E = eyeCenters(S, o), hx = E.ex2, hy = E.ey - R(E.r) - 1;
      for (var k = 0; k < Math.min(4, n); k++) { g.set(hx - 1 - k, hy - k, '#fff0b0'); g.set(hx - k, hy - k, '#c8a040'); }
      var my = R(S.ry * 0.16) + 2;
      for (var w = 0; w < n + 1; w++) g.set(E.front + w, my + 1 + (w >> 1), AC[1]);
    });
    P._gm = list.length ? function (g, o, S, frame, tframe, isFront) { for (var i = 0; i < list.length; i++) g = list[i](g, o, S, frame, tframe, isFront) || g; return g; } : null;
    return P._gm;
  }

  // 魚の各部の画面位置（回転・左右・倍率込み）
  function dieAnchor(q, X, Y) {
    var S = STAGES[stageOf(q)], dir = q.dir < 0 ? -1 : 1, sc = q.scale, fx = q.sx == null ? 1 : +q.sx || 1, fy = q.sy == null ? 1 : +q.sy || 1;
    var rot = q.rot || 0, cs = Math.cos(rot), sn = Math.sin(rot), front = !!q.front;
    var pt = function (dx, dy) { var u = dir * dx * fx * sc, v = (q.flip ? -dy : dy) * fy * sc; return [R(X + cs * u - sn * v), R(Y + sn * u + cs * v)]; };
    var nose = front ? [X, R(Y + 3 * sc)] : pt(S.cx + S.rx - S.vc, R(S.ry * 0.16) + 1);
    var top = front ? [X, R(Y - (S.ry + 2) * sc * fy)] : pt(S.cx - 2 - S.vc, -S.ry - 3);
    var E = eyeCenters(S, q);
    return { x: R(X), y: R(Y), dir: dir, sc: sc, S: S, nose: nose, rot: rot, tip: front ? [X, Y] : pt(S.tb - S.tl - S.vc, 0), top: top, tail: front ? [X, Y] : pt(S.tb - S.tl * 0.6 - S.vc, 0), eye: front ? [X, R(Y + E.ey * sc)] : pt(E.ex1 - S.vc, E.ey), belly: front ? [X, R(Y + S.ry * 0.6 * sc)] : pt(S.cx - S.vc, S.ry * 0.7), w: (S.rx + 10) * sc * fx, h: (S.ry + 2) * sc * fy };
  }
  function star4(ctx, x, y, r, col, c2) {
    rect(ctx, x, y - r, 1, r * 2 + 1, col); rect(ctx, x - r, y, r * 2 + 1, 1, col);
    if (c2) rect(ctx, x, y, 1, 1, c2);
  }
  var SKULL = art(['.ooooo.', 'oWWWWWo', 'oWKWKWo', 'oWWWWWo', '.oWKWo.', '..ooo..'], { o: '#2a1a40', W: '#f4f0ff', K: '#2a1a40' });
  // 掃除のホースの吸い口（口が下。回転して魚の尾へ向ける）
  var HOSE = (function () {
    var rows = [], i;
    for (i = 0; i < 30; i++) rows.push(i % 3 === 2 ? '...oDDDDo...' : '...oGhGgo...');
    rows.push('..oooooooo..', '.oGGhGGGgGo.', '.oGGhGGGggo.', 'oGGGhGGGGggo', 'oggggggggggo', 'oDDDDDDDDDDo', '.oooooooooo.');
    return art(rows, { o: O, G: '#b8c4d0', g: '#8a98a8', h: '#ffffff', D: '#3a4658' });
  })();
  var DIE_FX = {
    sweatpop: function (ctx, A) { drawDrop(ctx, A.top[0] + A.dir * 6, A.top[1] - 2); drawDrop(ctx, A.top[0] - A.dir * 4, A.top[1] - 4); },
    snip: function (ctx, A, k) { // チョキン：はさみの線と、ひらひら落ちるひれのかけら
      var tx = A.tail[0], ty = A.tail[1];
      for (var i = 0; i < 3; i++) rect(ctx, tx - 3 + i * 3, ty - 6 - (i & 1) * 2 - k, 2, 1, '#ffffff');
      rect(ctx, tx - 1, ty - 9 - k, 1, 3, '#ffffff'); rect(ctx, tx + 2, ty - 9 - k, 1, 3, '#ffffff');
      for (var j = 0; j < 2 + k; j++) { var fx = tx + R((hash(j, 31) - 0.5) * 14), fy = ty + 4 + j * 4 + k * 2; rect(ctx, fx, fy, 2, 1, '#ff9512'); rect(ctx, fx + 1, fy + 1, 1, 1, '#e06a00'); }
    },
    sunbeam: function (ctx, A, k) { // お日さま（右上）と光の線
      var sx = A.x + 22, sy = A.y - 26; ellipse(ctx, sx, sy, 5, 5, '#ffd23a'); ellipse(ctx, sx, sy, 3, 3, '#fff27a');
      for (var i = 0; i < 8; i++) { var an = i / 8 * Math.PI * 2 + k * 0.4; rect(ctx, sx + R(Math.cos(an) * (8 + k)), sy + R(Math.sin(an) * (8 + k)), 1, 1, '#ffe060'); }
    },
    dryheat: function (ctx, A, k) { // ゆらゆら湯気（かわいていく）
      for (var i = 0; i < 3; i++) { var bx = A.x - 8 + i * 8; for (var j = 0; j < 5; j++) rect(ctx, bx + ((j + k + i) & 1), A.top[1] - 3 - j * 2, 1, 1, '#ffffff'); }
    },
    salt: function (ctx, A, k) { // 塩のつぶ
      for (var i = 0; i < 9; i++) { var px = A.x + R((hash(i, 81) - 0.5) * A.w * 1.6), py = A.y + R((hash(i, 83) - 0.5) * A.h * 1.4); rect(ctx, px, py, 1, 1, (i + k) % 3 ? '#ffffff' : '#e8f0f0'); }
      if (k) star4(ctx, A.x + R(A.w * 0.5), A.y - R(A.h * 0.8), 2, '#ffffff', '#fff6c0');
    },
    whiskers: function (ctx, A, k) { // ドジョウのひげ（口のまわりに）
      var nx = A.nose[0], ny = A.nose[1], d = A.dir, L = 2 + k * 2;
      for (var i = 0; i < 3; i++) for (var j = 1; j <= L; j++) rect(ctx, nx + d * (1 + j), ny - 2 + i * 2 + R(j * (i - 1) * 0.35), 1, 1, '#6a5020');
    },
    hose: function (ctx, A, k) { // 吸い口が尾をのみこんでいく（k 0=少し離れて 7=尾の付け根まで）
      var a = 0.75, ux = -A.dir * Math.cos(a), uy = -Math.sin(a); // 吸い口→ホースの向き（うしろ上）
      var dep = [-7, -4, -1, 1, 3, 5, 7, 9][Math.max(0, Math.min(7, k))] * A.sc;
      var mx = A.tip[0] - ux * dep, my = A.tip[1] - uy * dep;
      var th = Math.atan2(ux, -uy); // 絵の「上」(0,-1) をホースの向きへ
      var hh = HOSE.h / 2 - 3;
      blit(ctx, HOSE, R(mx + ux * hh * A.sc), R(my + uy * hh * A.sc), { rot: th, scale: A.sc });
      for (var i = 0; i < 3; i++) { var d = 6 + ((i * 4 + k * 3) % 9); rect(ctx, R(mx - ux * d + (i - 1) * 4 * uy), R(my - uy * d - (i - 1) * 4 * ux), 2, 1, '#ffffff'); }
    },
    zap: function (ctx, A, k) { // 上から稲妻が落ちる（k 0=細い 1=直撃・光）
      var x0 = A.top[0] + 5, y0 = A.top[1] - 34, x1 = A.top[0], y1 = A.top[1] - 2, pts = [[x0, y0]];
      for (var i = 1; i < 6; i++) pts.push([R(x0 + (x1 - x0) * i / 6 + ((i & 1) ? 4 : -4)), R(y0 + (y1 - y0) * i / 6)]);
      pts.push([x1, y1]);
      if (k) { var a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * 0.35; ellipse(ctx, A.x, A.y, A.w * 0.9 + 6, A.h + 8, '#fff8a0'); ctx.globalAlpha = a0; }
      [[k ? 4 : 3, '#c88a00'], [k ? 2 : 1, '#ffe23a'], [1, '#ffffff']].forEach(function (L) {
        for (var j = 0; j < pts.length - 1; j++) {
          var p0 = pts[j], p1 = pts[j + 1], n = Math.max(Math.abs(p1[0] - p0[0]), Math.abs(p1[1] - p0[1]));
          for (var s = 0; s <= n; s++) rect(ctx, R(p0[0] + (p1[0] - p0[0]) * s / n) - (L[0] >> 1), R(p0[1] + (p1[1] - p0[1]) * s / n), L[0], 1, L[1]);
        }
      });
    },
    shiver: function (ctx, A, k) { // ぶるぶるの線
      for (var s = -1; s <= 1; s += 2) for (var i = 0; i < 3; i++) rect(ctx, A.x + s * R(A.w * 0.8 + 3 + ((i + k) & 1)), A.y - 4 + i * 4, 1, 2, '#ffffff');
    },
    drops: function (ctx, A, k) { // 水しぶき
      for (var i = 0; i < 6; i++) { var an = -Math.PI * (0.15 + i * 0.14), d = 8 + k * 6 + (i & 1) * 3; drawDrop(ctx, A.x + R(Math.cos(an) * (A.w * 0.6 + d)), A.y + R(Math.sin(an) * (A.h * 0.6 + d)) + k * 2); }
    },
    burst: function (ctx, A, k) { // ピキーン / ドーン：放射の線と十字の光
      var r0 = R(A.w * 0.75 + 2), L = 4 + k * 3;
      if (k) { var a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * 0.3; ellipse(ctx, A.x, A.y, A.w * 0.9 + 4, A.h + 6, '#ffffff'); ctx.globalAlpha = a0; }
      for (var i = 0; i < 8; i++) {
        var an = i / 8 * Math.PI * 2 + 0.2, ca = Math.cos(an), sa = Math.sin(an);
        for (var d = 0; d < L; d++) rect(ctx, R(A.x + ca * (r0 + d)), R(A.y + sa * (r0 * 0.7 + d)), 1, 1, d < L / 2 ? '#ffffff' : '#fff27a');
      }
      star4(ctx, A.x - R(A.w * 0.6), A.y - R(A.h + 2), 2 + k, '#ffffff', '#fff27a'); star4(ctx, A.x + R(A.w * 0.55), A.y + R(A.h * 0.4), 1 + k, '#ffffff');
    },
    glint: function (ctx, A, k) {
      var gx = A.x - R(A.w * 0.55) + k * 6, gy = A.y - R(A.h + 1) + k * 2;
      star4(ctx, gx, gy, 3 - k, '#ffffff', '#c4eaf8');
      for (var i = 0; i < 4; i++) rect(ctx, gx + 3 + i + k * 10, gy + 4 + i, 1, 1, 'rgba(255,255,255,0.8)');
    },
    frost: function (ctx, A, k) {
      for (var i = 0; i < 3 + k * 2; i++) {
        var fx2 = A.tail[0] + R((hash(i, 11) - 0.5) * 20 * A.sc) + A.dir * R(i * 3 * A.sc), fy2 = A.y + R((hash(i, 13) - 0.5) * A.h * 2);
        star4(ctx, fx2, fy2, i % 3 === 0 ? 1 : 0, '#ffffff');
      }
    },
    petals: function (ctx, A, k) {
      for (var i = 0; i < 8; i++) {
        var px = A.top[0] + R((hash(i, 21) - 0.5) * 30 * A.sc + (k ? (i - 4) * 2 : 0)), py = A.top[1] - R(10 * A.sc) + R(hash(i, 23) * 10 * A.sc) + k * 6 + (i & 1) * k * 3;
        rect(ctx, px, py, 2, 1, i & 1 ? '#ff8ab0' : '#ffd0e0'); rect(ctx, px + (i & 1), py + 1, 1, 1, '#e8508a');
      }
    },
    steam: function (ctx, A, k) {
      for (var i = 0; i <= k; i++) {
        var sx = A.top[0] - A.dir * R((4 - i * 3) * A.sc), sy = A.top[1] - R((2 + i * 5 + k * 2) * A.sc);
        var r = 1.5 + i * 0.5 + k * 0.4;
        ellipse(ctx, sx, sy, r + 1, r + 0.6, '#c8d8e0'); ellipse(ctx, sx, sy - 1, r, r, '#ffffff');
      }
    },
    flame: function (ctx, A, k) {
      drawFlame(ctx, A.nose[0] + A.dir * 2, A.nose[1], A.dir, 0.15 + k * 0.2);
      if (k) drawFlame(ctx, A.nose[0] + A.dir * 8, A.nose[1] - 1, A.dir, 0.45);
      for (var i = 0; i < 3; i++) rect(ctx, A.tail[0] - A.dir * (6 + i * 4), A.y - 4 + i * 4, 3 + k * 2, 1, '#ffffff'); // 反動の線
    },
    puff: function (ctx, A, k) {
      for (var i = 0; i < 6; i++) {
        var an = i / 6 * Math.PI * 2 + 0.4, px = A.x + R(Math.cos(an) * A.w * 0.8), py = A.y + R(Math.sin(an) * (A.h + 3));
        ellipse(ctx, px, py, 3, 2.4, '#5a5048'); ellipse(ctx, px - 1, py - 1, 2, 1.6, '#8a8078');
      }
    },
    spark: function (ctx, A, k) {
      for (var i = 0; i < 6; i++) {
        var an = i / 6 * Math.PI * 2 + k * 0.7, px = A.x + R(Math.cos(an) * (A.w * 0.7 + 4)), py = A.y + R(Math.sin(an) * (A.h + 4));
        rect(ctx, px, py, 2, 1, '#fff27a'); rect(ctx, px + 1, py + 1, 2, 1, '#ffd83a'); rect(ctx, px + 2, py + 2, 1, 1, '#ffffff');
      }
    },
    suck: function (ctx, A, k) { drawSuctionLines(ctx, A.x, A.y - R(30 * A.sc), k * 0.25); },
    bubbles: function (ctx, A, k) {
      for (var i = 0; i < 4; i++) drawBubble(ctx, A.x + R((hash(i, 31 + k) - 0.5) * A.w * 2), A.y - R(hash(i, 33) * A.h * 1.4) - k * 3, i & 1 ? 1 : 2);
      star4(ctx, A.x + R((k - 1) * 8), A.y - R(A.h + 3), 1, '#ffffff');
    },
    spin: function (ctx, A, k) { // ぐるぐるの線
      for (var i = 0; i < 10; i++) {
        var an = k * 2.1 + i * 0.22, px = A.x + R(Math.cos(an) * (A.w * 0.8 + 3)), py = A.y + R(Math.sin(an) * (A.h + 3));
        rect(ctx, px, py, 1, 1, i < 5 ? '#ffffff' : '#bff4ea');
      }
    },
    squeeze: function (ctx, A) { for (var i = -1; i <= 1; i += 2) for (var j = 0; j < 3; j++) rect(ctx, A.x + i * R(A.w * 0.75 + 2 + j), A.y - 3 + j * 3, 2, 1, '#ffffff'); },
    pop: function (ctx, A) { drawPop(ctx, A.x, A.y, R(18 * A.sc), 0.5); },
    speed: function (ctx, A, k) {
      var bx = k ? A.nose[0] + A.dir * 3 : A.tail[0] - A.dir * 6;
      for (var i = 0; i < 4; i++) { var L = 6 + (i & 1) * 4; rect(ctx, k ? (A.dir > 0 ? bx : bx - L) : (A.dir > 0 ? bx - L : bx), A.y - 7 + i * 4, L, 1, '#ffffff'); }
    },
    stars: function (ctx, A, k) { drawStars(ctx, A.nose[0] - A.dir * 3, A.top[1] - 2, 0.2 + k * 0.3); },
    sneeze: function (ctx, A) {
      for (var i = 0; i < 9; i++) { var d = 3 + hash(i, 41) * 14, px = A.nose[0] + A.dir * R(d), py = A.nose[1] + R((hash(i, 43) - 0.5) * d * 0.7); rect(ctx, px, py, i & 1 ? 2 : 1, 1, '#e8fff8'); }
      for (var j = 0; j < 3; j++) rect(ctx, A.nose[0] + A.dir * (4 + j * 5), A.nose[1] - 5 - j, 1, 3, '#ffffff');
    },
    soul: function (ctx, A, k) { var a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * (0.45 + k * 0.3); drawSoul(ctx, A.top[0], A.top[1] - R((2 + k * 8) * A.sc), 0.3 + k * 0.4, (0.45 + k * 0.25) * Math.min(1, A.sc)); ctx.globalAlpha = a0; },
    poof: function (ctx, A, k) {
      var n = 7, rr = A.w * (0.55 + k * 0.15);
      for (var i = 0; i < n; i++) { var an = i / n * Math.PI * 2, px = A.x + R(Math.cos(an) * rr), py = A.y + R(Math.sin(an) * rr * 0.6); ellipse(ctx, px, py, 5 + k, 4 + k, '#3a6a70'); }
      for (var j = 0; j < n; j++) { var an2 = j / n * Math.PI * 2, qx = A.x + R(Math.cos(an2) * rr), qy = A.y + R(Math.sin(an2) * rr * 0.6); ellipse(ctx, qx, qy, 4 + k, 3 + k, '#ffffff'); ellipse(ctx, qx + 1, qy + 1, 2 + k * 0.5, 1.5, '#dff2f0'); }
      star4(ctx, A.x + R(rr) + 2, A.y - R(rr * 0.6) - 2, 2, '#fff27a', '#ffffff');
    },
    skull: function (ctx, A, k) {
      var bx = A.top[0] + A.dir * 2, by = A.top[1] - 6 - k * 6;
      drawBubble(ctx, bx, by, 6); blit(ctx, SKULL, bx, by);
      if (k) drawBubble(ctx, bx - A.dir * 9, by + 8, 2);
    },
    gulp: function (ctx, A) { ellipse(ctx, A.belly[0], A.belly[1] - 2, 2.5, 2, '#ffe0b0'); rect(ctx, A.nose[0] - A.dir * 4, A.nose[1] - 9, 1, 3, '#ffffff'); rect(ctx, A.nose[0] - A.dir * 2, A.nose[1] - 10, 1, 3, '#ffffff'); },
    growl: function (ctx, A, k) { // ぐぅ〜のうず
      var gx = A.belly[0], gy = A.belly[1] + 6 + k;
      for (var i = 0; i < 7; i++) rect(ctx, gx - 6 + i * 2, gy + ((i + k) & 1), 2, 1, '#ffffff');
      for (var j = 0; j < 5; j++) rect(ctx, gx - 4 + j * 2, gy + 3 + ((j + k + 1) & 1), 2, 1, '#e8fff8');
    },
    burp: function (ctx, A) { drawBubble(ctx, A.nose[0] + A.dir * 6, A.nose[1] - 6, 5); drawBubble(ctx, A.nose[0] + A.dir * 12, A.nose[1] - 14, 2); rect(ctx, A.nose[0] + A.dir * 3, A.nose[1] - 1, 1, 1, '#ffffff'); },
    aura: function (ctx, A, k) {
      for (var i = 0; i < 14; i++) {
        var an = i / 14 * Math.PI * 2, wob = (i + k) & 1 ? 2 + k : 0, px = A.x + R(Math.cos(an) * (A.w * 0.75 + 2 + wob)), py = A.y + R(Math.sin(an) * (A.h + 3 + wob));
        rect(ctx, px, py, 1, 2, i & 1 ? '#fff27a' : '#ffa020');
      }
    },
    sparkle: function (ctx, A, k) { drawSparkles(ctx, A.x, A.y, 0.1 + k * 0.3, R(A.w * 0.9)); },
    scales: function (ctx, A, k) { for (var i = 0; i < 2 + k; i++) drawScale(ctx, A.x + R((hash(i, 51) - 0.5) * A.w * 1.2), A.y + R(A.h * 0.6 + i * 4 + k * 3), i + k); },
    sand: function (ctx, A, k) { for (var i = 0; i < 8; i++) { var px = A.x + R((hash(i, 61) - 0.5) * 30 * A.sc), py = A.y0 - R(hash(i, 63) * 10 * A.sc) - k * 2 + R(i * 0.5); rect(ctx, px, py, 1 + (i & 1), 1, i % 3 ? SAND : SAND_D); } },
    spores: function (ctx, A, k) { for (var i = 0; i < 6 + k * 2; i++) rect(ctx, A.x + R((hash(i, 71) - 0.5) * A.w * 2), A.y + R((hash(i, 73) - 0.5) * A.h * 2.4) - k * 2, 1, 1, i & 1 ? '#9ac25a' : '#5a8a2a'); },
    pops: function (ctx, A, k) {
      for (var i = 0; i <= k; i++) { var px = A.belly[0] + A.dir * R((i - 1) * 9 * A.sc), py = A.belly[1] + R((6 + i * 3) * A.sc); drawPop(ctx, px, py, 5 + i, 0.3 + k * 0.2); }
      drawMark(ctx, A.top[0] - A.dir * 8, A.top[1] - 2, 'heart', 0, A.sc);
    }
  };

  // 死に際のコマを前もって全部作っておく（竜・合成コマは初回 5〜15ms かかるため）
  var NOCTX = { fillStyle: '', globalAlpha: 1, fillRect: function () {}, save: function () {}, restore: function () {}, beginPath: function () {}, rect: function () {}, clip: function () {} };
  function prewarmDeath(k, base) {
    if (!DIE[k]) return;
    for (var f = 0; f < DIE[k].length; f++) drawFish(NOCTX, 80, 120, merge(base || {}, { die: { k: k, f: f } }));
  }
  function drawDie(ctx, x, y, o) {
    var k = o.die.k, D = DIE[k], n = D.length;
    var f = Math.floor(+o.die.f); if (!isFinite(f)) f = 0; f = f < 0 ? 0 : f >= n ? n - 1 : f;
    var P = D[f], hold = f === n - 1, q = {}, i, key;
    for (i = 0; i < DIE_KEEP.length; i++) if (o[DIE_KEEP[i]] !== undefined) q[DIE_KEEP[i]] = o[DIE_KEEP[i]];
    for (key in P) if (!DIE_SPECIAL[key] && key.charAt(0) !== '_') q[key] = P[key];
    var dir = (+q.dir || 1) < 0 ? -1 : 1, sc0 = q.scale === true ? 2 : (+q.scale || 1);
    x = +x || 0; y = +y || 0;
    q.dir = dir; if (q.scale != null || P.sc) q.scale = sc0 * (P.sc || 1);
    if (P.r) q.rot = (+q.rot || 0) + dir * P.r; // 回転なしのコマは variant の rot をそのまま使う
    if (P.sx != null) q.sx = (q.sx == null ? 1 : (+q.sx || 1)) * P.sx;
    if (P.sy != null) q.sy = (q.sy == null ? 1 : (+q.sy || 1)) * P.sy;
    if (!hold && P.t == null) q.t = f / (DIE_FRAMES[k].fps || 12); // 途中のコマは opts.t によらず決まる（完成形は呼び出し側の t で動き続ける）
    if (P.legK != null) q.legLen = Math.max(2, R((o.legLen == null ? 24 : (+o.legLen || 24)) * P.legK));
    var col = colorOf(q), gm = dieMods(P);
    if (P.mix) q._pal = mixPal(col, P.mix[0], P.mix[1]);
    if (gm) q._gm = gm;
    if (P.roll != null) { var ra = Math.max(0, Math.min(1, +P.roll || 0)); if (ra > 0 && ra < 1) q._rollA = ra <= 0.5 ? ra : 1 - ra; q._roll = Math.sin(Math.PI * ra) || undefined; if (ra > 0.5) q.flip = true; } // 裏返り（0..1）
    q._dk = k + '#' + (P._pid || f); // ポーズごとに別のキャッシュ（同じポーズのコマは共有）
    var sc = sc0 * (P.sc || 1), X = x + dir * (P.dx || 0) * sc, Y = y + (P.dy || 0) * sc;
    var A = dieAnchor(merge(q, { scale: sc }), X, Y); A.y0 = R(y - sc);
    var a0 = ctx.globalAlpha, clip = P.clipT != null || P.clipB != null;
    if (P.a != null) ctx.globalAlpha = a0 * P.a;
    if (clip) { // その高さより上（clipB）／下（clipT）だけ
      ctx.save(); ctx.beginPath();
      if (P.clipB != null) ctx.rect(X - 200, y - 400, 400, 400 + R(P.clipB * sc)); else ctx.rect(X - 200, y + R(P.clipT * sc), 400, 400);
      ctx.clip();
    }
    if (P.draw === 'duck') blit(ctx, DUCK || (DUCK = buildDuckToy()), X, Y + R(Math.sin((+q.t || 0) * 3)), sc !== 1 ? { scale: sc, mirror: dir < 0 } : { mirror: dir < 0 });
    else if (P.draw === 'eyeball') blit(ctx, EYEBALL, A.eye[0], A.eye[1], sc !== 1 ? { scale: sc } : null);
    else if (P.draw === 'pigeon') drawPigeon(ctx, X, Y, q.t, { dir: dir, lips: true, flap: P.flap, scale: sc });
    else if (P.draw === 'star') drawFishStar(ctx, X, Y, q.t, { scale: sc });
    else {
      drawFish(ctx, X, Y, q);
      if (P.twin != null) { // 体のうしろから逆向きの頭がもう一つ
        var ts = Math.round((0.35 + 0.65 * P.twin) * 20) / 20 * sc, Xr = R(X);
        ctx.save(); ctx.beginPath();
        if (dir > 0) ctx.rect(Xr - 400, Y - 400, 401, 800); else ctx.rect(Xr, Y - 400, 400, 800);
        ctx.clip();
        drawFish(ctx, X, Y, merge(q, { dir: -dir, scale: ts, turn: 0, sx: 1, sy: 1 }));
        ctx.restore();
      }
    }
    if (clip) ctx.restore();
    ctx.globalAlpha = a0;
    if (P.mound) blit(ctx, hermitMound(), x, y, { scale: sc });
    if (P.fx && o.fx !== false) for (i = 0; i < P.fx.length; i++) { var fn = DIE_FX[P.fx[i][0]]; if (fn && (o.props !== false || !DIE_PROPS[P.fx[i][0]])) fn(ctx, A, P.fx[i][1] || 0); }
  }

  function q20(v, lo, hi) { v = +v; if (!isFinite(v) || v === 0) v = 1; v = Math.max(lo, Math.min(hi, v)); return Math.round(v * 20) / 20; }

  function drawFish(ctx, x, y, opts) {
    var o = opts || {};
    if (o.die && DIE[o.die.k]) return drawDie(ctx, x, y, o);
    // main.js の「分裂」は体のうしろに逆向きの頭を重ねて描く（v15 では静止形そのものが2つ頭なので、その重ね描きは描かない）
    if (o.variant === 'split' && o.split === false && o.turn === 0 && (+o.scale || 1) < 1 && o.sx === 1 && o.sy === 1) return;
    if (o.variant && VARIANTS[o.variant]) o = merge(VARIANTS[o.variant], o);
    if (o.photo) return drawPolaroid(ctx, x, y, o);
    if (o.boiled) return drawBoiled(ctx, x, y, o);
    if (o.balloon && !o.puff) o = merge(o, { puff: true });
    if (o.bubble && !o.mark) o = merge(o, { mark: o.bubble });
    if (o.meteor || o.sushi || o.ghost || o.zen || o.mom) o = newCauseOpts(o);
    var KF = keyframes(o);
    if (KF) o = merge(o, KF.ov);
    var st = stageOf(o), S = STAGES[st];
    var tt = +o.t || 0;
    var frame = Math.floor(tt * 8) & 7;
    var wag = o.wag == null ? 1 : +o.wag; if (!isFinite(wag)) wag = 1;
    var tframe = Math.floor(tt * 8 * wag) & 7;
    if (o.stone || o.frozen || o.flat) frame = tframe = 0;
    if (o.stuck) tframe = ((Math.floor(tt * 7) % 5) < 2) ? (Math.floor(tt * 16) & 1) * 2 : 0; // 尾がぴくぴく
    if (KF && KF.sw8 >= 0 && !(o.stone || o.frozen || o.flat)) frame = tframe = KF.sw8; // 泳ぎコマに飾りの揺れも合わせる
    // 振り返り：0=dir向き 0.5=正面 1=逆向き（turnF があればコマ優先）
    var tv = o.front ? 0.5 : (+o.turn || 0); tv = Math.max(0, Math.min(1, tv));
    if (KF && KF.tu >= 0) tv = [0, 0.25, 0.5, 0.75, 1][KF.tu];
    if (o.sushi) tv = tv > 0.5 ? 1 : 0; // 寿司は横向きだけ（正面・中間は横顔のまま）
    var cs = Math.cos(Math.PI * tv), ac = Math.abs(cs);
    var noFront = !!(o.stone || o.bones || o.split || o.splitBody || o.stuck || o.knot || o.sushi);
    var isQ = !!(KF && (KF.tu === 1 || KF.tu === 3) && !noFront && !(o.puff || o.legs || o.ghost || o.moss || o.flower || o.flat || o.wings || o.hermit || o.dragon));
    var isFront = !isQ && ac < 0.35 && !noFront;
    var turnBack = cs < 0 && !isFront;
    var tsx = isFront || isQ ? 1 : Math.max(0.3, ac);
    if (o._shrink && (o.flat || o.knot || o.split)) tsx *= o._shrink[0];
    var shY = o._shrink && (o.flat || o.knot || o.split) ? o._shrink[1] : 1;
    var qx = q20(tsx * (o.sx == null ? 1 : o.sx) * (KF ? KF.sx : 1), 0.15, 3), qy = q20((o.sy == null ? 1 : o.sy) * (KF ? KF.sy : 1) * shY, 0.15, 3);
    var mk = mouthOf(o);
    var key = st + '|' + frame + '|' + (o.eyes || 'normal') + '|' + mk + '|' + (o.palette || '') + '|' + (o.look || '');
    for (var i = 0; i < FLAG_KEYS.length; i++) if (o[FLAG_KEYS[i]]) key += '|' + FLAG_KEYS[i];
    if (o.spiky) key += '|sk' + o.spiky;
    if (o.legs) key += '|L';
    if (o.flower) key += '|fs' + (o.flowerStage == null ? 3 : Math.round(+o.flowerStage || 0));
    if (o.xray) key += '|x' + (o.xray === 'blink' ? ((frame >> 1) & 1) : 0);
    if (tframe !== frame) key += '|w' + tframe;
    if (o.brows) key += '|b' + o.brows;
    if (o.cheeks) key += '|ch' + cheekBob(o);
    if (isFront) key += '|FRONT';
    if (isQ) key += '|Q';
    if (KF) key += KF.key;
    if (o._dk) key += '|D' + o._dk;
    var fcol = colorOf(o); if (fcol !== 'orange') key += '|c' + fcol;
    var sc = o.scale === true ? 2 : (+o.scale || 1);
    var mirror = ((+o.dir || 1) < 0) !== turnBack;
    var bo = { mirror: mirror, flip: !!o.flip !== !!(KF && KF.flip), rot: +o.rot || 0, scale: sc, offx: isQ ? -2 : isFront ? 0 : S.vc, offy: 0 };
    var fxInfo = { front: isFront, fx: isQ ? qx * 0.45 : qx, fy: qy, mirror: mirror };
    if (KF && KF.dy) y += KF.dy * sc;
    var sqx = (KF && KF.tailAnchor && !isFront && !isQ) ? S.tb - S.tl : bo.offx, sqy = KF && KF.ay ? R(KF.ay * S.ry) : 0;
    var sqk = (sqx !== bo.offx || sqy) ? '@' + sqx + ',' + sqy : '';
    if (o.hermit) { drawHermit(ctx, x, y + R(8 * sc), tt); return; }
    if (o.dragon) { dragonBlit(ctx, x, y, tt, mirror ? -1 : 1, sc, bo.rot, bo.flip, fcol); return; }
    if (o.wings && o.fx !== false) drawWings(ctx, x, y, o, sc, S, tt, fxInfo);
    if (o.flat || o.knot) {
      var gk = cached(key + (o.flat ? '|flat' : '|knot'), function () { var gk1 = o.flat ? buildFlat(o, S) : buildKnot(o, frame, S, tframe); return o._gm ? o._gm(gk1, o, S, frame, tframe, false) : gk1; });
      if (o.flat) { bo.mirror = false; fxInfo.front = true; }
      bo.offx = 0;
      if (qx !== 1 || qy !== 1) { var gk0 = gk; gk = cached(key + (o.flat ? '|flat' : '|knot') + '|q' + qx + ',' + qy, function () { return squeeze(gk0, qx, qy, 0, 0); }); }
      blit(ctx, gk, x, y, bo);
      if (o.fx !== false) drawFishFx(ctx, x, y, o, sc, S, tt, fxInfo);
      if (o.mark) drawFishMark(ctx, x, y, o, sc, S, tt, fxInfo);
      return;
    }
    if (o.split || o.splitBody) {
      var spv = o.split || o.splitBody, gap = typeof spv === 'number' ? Math.max(0, Math.round(spv)) : 2;
      var gs = cached(key + '|split' + gap, function () { return buildSplit(o, frame, S, gap); });
      if (qx !== 1 || qy !== 1) { var gs0 = gs; gs = cached(key + '|split' + gap + '|q' + qx + ',' + qy, function () { return squeeze(gs0, qx, qy, 0, 0); }); }
      bo.mirror = false; bo.offx = 0;
      if (o.glitch) glitchGhosts(ctx, gs, x, y, bo, frame);
      blit(ctx, gs, x, y, bo);
      if (o.fx !== false) drawFishFx(ctx, x, y, o, sc, S, tt, fxInfo);
      if (o.mark) drawFishMark(ctx, x, y, o, sc, S, tt, fxInfo);
      return;
    }
    if (o.legs && !o.skeleton) {
      var ll = o.legLen == null ? 24 : Math.max(2, Math.round(+o.legLen || 0));
      var lkey = st + '|legs|' + frame + '|' + ll + '|' + (o.palette || '') + (o.white ? 'w' : '') + (o.frozen ? 'f' : '') + (o.burnt ? 'b' : '') + (o.stone ? 's' : '') + (o.wrinkles ? 'o' : '') + (o.drown ? 'd' : '') + (fcol !== 'orange' ? '|c' + fcol : '') + (o._dk ? '|D' + o._dk : '');
      var lg = cached(lkey, function () { return buildLegs(o, frame, S, ll); });
      var lbo = merge(bo, {});
      if (isFront) { lbo.offx = S.cx - 1; lbo.mirror = false; }
      var lqx = isFront ? q20(o.sx == null ? 1 : o.sx, 0.15, 3) : qx;
      if (lqx !== 1 || qy !== 1) { var lg0 = lg; lg = cached(lkey + '|q' + lqx + ',' + qy + (isFront ? 'F' : ''), function () { return squeeze(lg0, lqx, qy, lbo.offx, 0); }); }
      blit(ctx, lg, x, y, lbo);
    }
    var g = cached(key, function () {
      var gb = isQ ? buildQuarter(o, frame, S, tframe) : isFront ? buildFront(o, frame, S, tframe) : buildFish(o, frame, S, null, tframe);
      if (o.ghost) gb = ghostify(gb, o, S, isFront, frame);
      else if (o.sushi) gb = sushify(gb, o, S);
      if (o._gm) gb = o._gm(gb, o, S, frame, tframe, isFront);
      return gb;
    });
    if (qx !== 1 || qy !== 1) { var g0 = g; g = cached(key + '|q' + qx + ',' + qy + sqk, function () { return squeeze(g0, qx, qy, sqx, sqy); }); }
    if (o.meteor) { var g1 = g; g = cached(key + '|q' + qx + ',' + qy + '|bump', function () { return addBump(g1, S, isFront, bo.offx, qx); }); }
    if (o.zen) drawZenBack(ctx, x, y, o, sc, S, tt, fxInfo);
    if (o.glitch) glitchGhosts(ctx, g, x, y, bo, frame);
    var ga0 = ctx.globalAlpha;
    if (o.ghost) ctx.globalAlpha = ga0 * (0.78 + 0.08 * Math.sin(tt * 3));
    blit(ctx, g, x, y, bo);
    ctx.globalAlpha = ga0;
    if (o.zen) drawZenFront(ctx, x, y, o, sc, S, tt, fxInfo);
    if (o.fx !== false) drawFishFx(ctx, x, y, o, sc, S, tt, fxInfo);
    if (o.mark) drawFishMark(ctx, x, y, o, sc, S, tt, fxInfo);
  }

  // バグ：色チャンネルずれ（マゼンタ/シアンの残像）＋ノイズの帯
  function glitchGhosts(ctx, g, x, y, bo, frame) {
    var a0 = ctx.globalAlpha;
    var d1 = 1 + Math.floor(hash(frame, 1) * 3), d2 = 1 + Math.floor(hash(frame, 2) * 3);
    ctx.globalAlpha = a0 * 0.7;
    blit(ctx, tinted(g, '#ff2aa0'), x - d1, y, bo);
    blit(ctx, tinted(g, '#20e8ff'), x + d2, y + (frame & 1), bo);
    ctx.globalAlpha = a0;
    var sc = bo.scale || 1;
    for (var k = 0; k < 4; k++) {
      if (hash(k, frame + 9) < 0.45) continue;
      var by = R(y + (hash(k + 3, frame) - 0.5) * 30 * sc), bx = R(x + (hash(k + 7, frame) - 0.5) * 40 * sc);
      var bw = 4 + Math.floor(hash(k, frame + 4) * 14 * sc);
      rect(ctx, bx, by, bw, 1, ['#ff00ff', '#00ffff', '#ffff00', '#ffffff'][(k + frame) & 3]);
      if (hash(k, frame + 5) > 0.6) rect(ctx, bx + 2, by + 1, Math.max(1, bw - 4), 1, '#000000');
    }
  }

  function headPos(x, y, o, sc, S, info) {
    var dir = info && info.mirror ? -1 : 1;
    var fx = info ? info.fx : 1, fy = info ? info.fy : 1;
    var hh = (o.puff ? 16 : S.ry + 2) * sc * fy;
    var headX = info && info.front ? x : x + dir * (S.cx + S.rx - S.vc - 6) * sc * fx;
    return { dir: dir, hh: hh, headX: R(headX) };
  }
  // 頭上の記号（opts.mark / opts.bubble）
  function drawFishMark(ctx, x, y, o, sc, S, t, info) {
    x = R(x); y = R(y);
    var H = headPos(x, y, o, sc, S, info);
    var m = o.mark;
    var top = o.flip ? y + H.hh + 9 : y - H.hh - 6;
    if (o.flower && !o.flip) top -= 12 * sc;
    if ((MARK_ALIAS[m] || m) === 'sweat') drawMark(ctx, H.headX - H.dir * R(3 * sc), y - H.hh + R(5 * sc), 'sweat', t, sc);
    else if ((MARK_ALIAS[m] || m) === 'zzz') drawMark(ctx, H.headX + H.dir * R(2 * sc), top, 'zzz', t, sc);
    else drawMark(ctx, H.headX + H.dir * R(5 * sc), top - R(2 * sc), m, t, sc);
  }

  // 魚の周りの演出（t でアニメ）。opts.fx=false で描かない
  function drawFishFx(ctx, x, y, o, sc, S, t, info) {
    x = R(x); y = R(y);
    var H = headPos(x, y, o, sc, S, info);
    var dir = H.dir, hh = H.hh, headX = H.headX;
    if (o.smoke) drawSmoke(ctx, x - dir * 3 * sc, y - hh - 2, t);
    if (o.fumes) drawFumes(ctx, x, y - hh - 1, t);
    if (o.stars) drawStars(ctx, headX - dir * 2, y - hh - 6 * sc, t);
    if (o.lightning) { drawLightning(ctx, x - 22 * sc, y - 4, t); drawLightning(ctx, x + 22 * sc, y + 2, t + 0.37); }
    if (o.bolt) drawBolt(ctx, headX - dir * R(4 * sc), y - hh - R(o.spiky ? 13 : 6) * sc, Math.min(1, sc), Math.floor(t * 6) & 1, o.flip);
    if (o.sparkle) drawSparkles(ctx, x, y, t, 22 * sc);
    if (o.sweat) {
      var sy = y - hh - 2 + (R(t * 6) % 3);
      var swx = o.split ? x : headX + dir * 2;
      drawDrop(ctx, swx - 4 * sc, sy); drawDrop(ctx, swx + 5 * sc, sy + 2);
    }
    if (o.bubbly) for (var bk = 0; bk < 4; bk++) { var bq = (t * 0.5 + bk / 4) % 1; drawBubble(ctx, x + R((hash(bk, 3) - 0.5) * 36 * sc + Math.sin(bq * 7 + bk) * 2), y - R((6 + bq * 30) * sc), bk & 1 ? 1 : 2); }
    if (o.balloon) { // ぷかぷか：まわりの小さな泡（v15：風船のひもはなし）
      for (var k = 0; k < 3; k++) { var bp = (t * 0.6 + k / 3) % 1; drawBubble(ctx, x + dir * R((k - 1) * 9 * sc) + R(Math.sin(bp * 6 + k) * 1.5), y - R((10 + bp * 14) * sc), k === 1 ? 2 : 1); }
    }
    if (o.ghost) drawHitodama(ctx, x, y, o, sc, S, t, info);
    if (o.zen) for (var zk = 0; zk < 5; zk++) { var zp = (t * 0.35 + zk / 5) % 1; rect(ctx, x + R((hash(zk, 7) - 0.5) * 34 * sc + Math.sin(zp * 7 + zk) * 2), y + R((10 - zp * 34) * sc), 1, 1, zk & 1 ? '#fff6b0' : '#ffe14a'); }
    if (o.halo) drawHalo(ctx, headX - dir * R(2 * sc), o.flip ? y + hh + R(5 * sc) : y - hh - R(5 * sc), sc, t);
    if (o.soul) drawSoul(ctx, x + dir * R(4 * sc), y - hh - R(14 * sc), t, sc < 0.9 ? Math.max(0.4, sc) : 1);
    if (o.stuck) { var ckx = x + dir * R((S.cx - 1 - S.vc) * sc * info.fx); drawCrack(ctx, ckx, y - R(2 * sc), 0.55 * sc); }
    if (o.butterfly) drawButterfly(ctx, headX + R(Math.cos(t * 1.7) * 12 * sc), (o.flip ? y + hh + 16 * sc : y - hh - 16 * sc) + R(Math.sin(t * 3.4) * 4), t);
    if (o.fly) { var fa = t * 4; drawFly(ctx, x + R(Math.cos(fa) * 20 * sc), y - hh + R(Math.sin(fa * 1.3) * 6 * sc) - 4, t); }
    if (o.burnt && o.smoke) for (var ak = 0; ak < 4; ak++) { var ap = (t * 0.4 + ak / 4) % 1; rect(ctx, x + R((hash(ak, 3) - 0.5) * 30 * sc + Math.sin(ap * 9 + ak) * 2), y - hh + R(ap * 30 * sc), 2, 1, ak & 1 ? '#c8c0b8' : '#8a8078'); }
    if (o.spark && (Math.floor(t * 12) & 1)) for (var sk = 0; sk < 5; sk++) rect(ctx, x + R((hash(sk, Math.floor(t * 12)) - 0.5) * 50 * sc), y + R((hash(Math.floor(t * 12), sk) - 0.5) * 34 * sc), 1, 1, sk & 1 ? '#ffffff' : '#fff27a');
    if (o.shine && o.sparkle && o.palette !== 'gold') for (var bb2 = 0; bb2 < 3; bb2++) { var bp = (t * 0.5 + bb2 / 3) % 1; drawBubble(ctx, x + R((bb2 - 1) * 12 * sc + Math.sin(bp * 8) * 2), y - R(bp * 26 * sc), bb2 === 1 ? 2 : 1); }
    if (o.stars) for (var sw2 = 0; sw2 < 2; sw2++) for (var sa = 0; sa < 7; sa++) { var an2 = t * 5 + sw2 * Math.PI + sa * 0.12; rect(ctx, x + R(Math.cos(an2) * 22 * sc), y + R(Math.sin(an2) * 9 * sc), 1, 1, 'rgba(255,255,255,' + (0.9 - sa * 0.12).toFixed(2) + ')'); }
    if (o.drown) { // 口からぶくぶく
      var mx = headX + dir * 8 * sc, my = y + 2;
      for (var b = 0; b < 4; b++) {
        var ph2 = (t * 1.4 + b * 0.25) % 1;
        drawBubble(ctx, mx + dir * R(Math.sin((ph2 + b) * 9) * 2), my - R(ph2 * 26), b % 2 ? 1 : 2);
      }
    }
  }
  // ---------- 水槽 ----------
  function drawSeaweed(ctx, bx, by, len, phase, t, amp) {
    var top = by - len;
    var pts = [];
    for (var y = by; y >= top; y--) {
      var k = (by - y) / len;
      var cx = bx + Math.sin(y * 0.07 + t * 1.6 + phase) * amp * k + Math.sin(y * 0.15 + phase) * 1.5;
      var w = Math.max(1, R(7 * (1 - k * 0.8)));
      if (k > 0.94) w = 1;
      pts.push([R(cx - w / 2), y, w]);
    }
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      rect(ctx, p[0] - 1, p[1], p[2] + 2, 1, O);
    }
    rect(ctx, pts[pts.length - 1][0], top - 1, 1, 1, O);
    for (var j = 0; j < pts.length; j++) {
      var q = pts[j];
      rect(ctx, q[0], q[1], q[2], 1, WEED);
      if (q[2] >= 3) rect(ctx, q[0] + 1, q[1], Math.max(1, q[2] - 3), 1, WEED_L);
      else if (q[2] === 2 && (q[1] & 1)) rect(ctx, q[0], q[1], 1, 1, WEED_L);
    }
  }
  function ellipse(ctx, cx, cy, rx, ry, col) {
    for (var y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      var yy = (y + 0.5 - 0.5) / ry; if (Math.abs(yy) > 1) continue;
      var hw = rx * Math.sqrt(1 - yy * yy);
      var x0 = R(cx - hw), x1 = R(cx + hw);
      if (x1 > x0) rect(ctx, x0, cy + y, x1 - x0, 1, col);
    }
  }
  function leaf(ctx, cx, cy, rx, ry) {
    ellipse(ctx, cx, cy, rx + 1, ry + 1, O);
    ellipse(ctx, cx, cy, rx, ry, WEED_L);
    rect(ctx, R(cx - rx / 2), cy, R(rx), 1, WEED);
  }
  function rock(ctx, cx, cy, rx, ry) {
    ellipse(ctx, cx, cy, rx + 1, ry + 1, O);
    ellipse(ctx, cx, cy, rx, ry, '#9e9286');
    ellipse(ctx, cx - 1, cy - 1, rx - 2, ry - 2, '#b4a89a');
    rect(ctx, cx - R(rx / 2), cy - R(ry / 2), 2, 1, '#d0c4b4');
  }

  function tankSurfaceY(x, t) {
    return 22 + R(Math.sin(x * 0.13 + t * 2.2) * 1.1 + Math.sin(x * 0.31 - t * 1.3) * 0.6);
  }

  // 砂面の形と粒は固定。背景と遮蔽に同じドットを使う。
  var SAND_Y = 220, sandFront = new Grid(160, 23, 0, 0);
  var sandHeights = [];
  function sandY(x) { return sandHeights[Math.max(0, Math.min(159, R(x)))]; }
  for (var sx = 0; sx < 160; sx++) {
    var top = SAND_Y + R(1.6 * Math.sin(sx * 0.085) + 0.65 * Math.sin(sx * 0.22));
    sandHeights.push(top);
    for (var sy = top; sy < 240; sy++) {
      var grain = hash(sx, sy);
      sandFront.set(sx, sy - 217, sy === top ? '#8a5228' :
        grain > 0.93 ? SAND_D : grain < 0.06 ? '#ffd8a0' : sy >= 235 ? SAND_B : SAND);
    }
  }
  function drawSandFront(ctx, t, dirt, crater) {
    blit(ctx, sandFront, 0, 217);
    if (dirt >= 3) {
      ctx.fillStyle = 'rgba(70,90,30,0.55)';
      for (var x = 0; x < 160; x += 2) if (hash(x, 99) > 0.4) ctx.fillRect(x, sandY(x) + 1, 2, 2 + (dirt - 3) * 2);
    }
    if (crater) {
      // くぼみの手前半分は砂の一部として描き、奥側は魚の背後に残す。
      ctx.save(); ctx.beginPath();
      for (var i = Math.max(0, crater.x - 28); i < Math.min(160, crater.x + 28); i++) {
        var y = sandY(i);
        ctx.rect(i, y, 1, 240 - y);
      }
      ctx.clip(); drawCrater(ctx, crater.x, crater.y, t); ctx.restore();
    }
  }

  function drawTank(ctx, t, dirt) {
    t = t || 0; dirt = dirt || 0;
    // 空気と水
    rect(ctx, 0, 0, 160, 24, AIR);
    rect(ctx, 0, 22, 160, 218, WATER);
    rect(ctx, 0, 150, 160, 90, WATER_D);
    for (var x = 0; x < 160; x += 2) if (((x >> 1) & 1)) rect(ctx, x, 149, 2, 1, WATER_D);
    // ガラスの映り込み
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    for (var i = 0; i < 26; i++) { ctx.fillRect(14 + i, 40 - i, 3, 1); ctx.fillRect(26 + i, 40 - i, 1, 1); }
    for (var i2 = 0; i2 < 20; i2++) ctx.fillRect(130 + i2, 140 - i2, 2, 1);
    // 水面の波
    for (var wx = 0; wx < 160; wx++) {
      var wy = tankSurfaceY(wx, t);
      rect(ctx, wx, 18, 1, wy - 18, AIR);
      rect(ctx, wx, wy, 1, 1, '#f4f0d8');
      rect(ctx, wx, wy + 1, 1, 2, '#3fb8ac');
      rect(ctx, wx, wy + 3, 1, 1, '#4cc2b0');
    }
    for (var k = 0; k < 9; k++) {
      var lx = ((k * 23 + R(t * 6)) % 176) - 8, ly = 28 + (k % 3) * 2;
      rect(ctx, lx, ly, 5 + (k % 3) * 2, 1, '#8ee0cc');
      if (k % 2) rect(ctx, lx + 2, ly + 1, 3, 1, '#f4f0d8');
    }
    // 漂う小さな泡
    for (var b = 0; b < 7; b++) {
      var bx = [138, 146, 26, 120, 60, 150, 40][b];
      var spd = 8 + b * 2, yy = 220 - ((t * spd + b * 37) % 190);
      var r = (b % 3 === 0) ? 2 : 1;
      drawBubble(ctx, bx + R(Math.sin(t * 2 + b) * 1.5), yy, r);
    }
    // 水草（左）
    drawSeaweed(ctx, 20, sandY(20) + 2, 112, 0, t, 5);
    drawSeaweed(ctx, 32, sandY(32) + 2, 84, 1.7, t, 4);
    drawSeaweed(ctx, 12, sandY(12) + 2, 78, 3.1, t, 3);
    drawSeaweed(ctx, 40, sandY(40) + 2, 50, 4.4, t, 3);
    // 右の丸葉の水草
    var sw = R(Math.sin(t * 1.2) * 1);
    var stems = [[132, 128, 196], [142, 146, 184], [124, 116, 200], [150, 156, 204]];
    stems.forEach(function (s, i) {
      var ex = s[1] + (i % 2 ? sw : -sw);
      var root = sandY(s[0]) + 2, n = root - s[2];
      for (var j = 0; j <= n; j++) {
        var px = R(s[0] + (ex - s[0]) * j / n), py = root - j;
        rect(ctx, px - 1, py, 3, 1, O); rect(ctx, px, py, 1, 1, WEED);
      }
    });
    var lv = [[128, 194, 6, 3], [146, 182, 6, 4], [114, 199, 5, 3], [156, 203, 5, 3], [136, 206, 5, 3], [122, 212, 5, 3], [150, 214, 6, 3], [140, 196, 4, 3], [132, 186, 4, 3]];
    lv.forEach(function (l, i) { leaf(ctx, l[0] + (i % 2 ? sw : -sw), l[1], l[2], l[3]); });
    // 石
    rock(ctx, 24, sandY(24) - 3, 8, 5); rock(ctx, 40, sandY(40) - 2, 6, 4);
    rock(ctx, 136, sandY(136) - 3, 8, 5); rock(ctx, 151, sandY(151) - 2, 5, 4);
    // 汚れ
    if (dirt > 0) {
      ctx.fillStyle = 'rgba(110,120,40,' + (0.06 * dirt) + ')';
      ctx.fillRect(0, 24, 160, 200);
      var n = dirt * 45;
      for (var d = 0; d < n; d++) {
        var px = Math.floor(hash(d, 11) * 160), py = 26 + Math.floor(hash(d, 29) * 196);
        var sz = 1 + Math.floor(hash(d, 3) * (1 + dirt * 0.7));
        ctx.fillStyle = hash(d, 5) > 0.5 ? 'rgba(80,110,40,0.45)' : 'rgba(120,96,50,0.4)';
        ctx.fillRect(px, py, sz, sz);
        if (sz > 2) ctx.fillRect(px + 1, py + sz, sz - 2, 1);
      }
      if (dirt >= 2) {
        ctx.fillStyle = 'rgba(90,100,40,0.35)';
        for (var s2 = 0; s2 < dirt * 4; s2++) {
          var sx2 = Math.floor(hash(s2, 77) * 160), l = 6 + Math.floor(hash(s2, 78) * dirt * 10);
          ctx.fillRect(sx2, 26, 1, l); ctx.fillRect(sx2, 26 + l, 2, 2);
        }
      }
    }
    drawSandFront(ctx, t, dirt);
  }

  // ---------- 演出エフェクト（t 秒でアニメ。状態は持たない） ----------
  function disc(ctx, cx, cy, r, col) { ellipse(ctx, R(cx), R(cy), r, r, col); }
  // 煙（黒焦げ）：灰色のもくもくが上へ
  function drawSmoke(ctx, x, y, t) {
    t = t || 0;
    for (var i = 0; i < 4; i++) {
      var ph = (t * 0.55 + i / 4) % 1;
      var px = x + Math.sin(ph * 6 + i * 2) * 3 + (i - 1.5) * 2, py = y - ph * 26;
      var r = 1.5 + ph * 3.5, a = (1 - ph) * 0.85;
      disc(ctx, px, py, r + 1, 'rgba(40,40,40,' + (a * 0.6).toFixed(2) + ')');
      disc(ctx, px, py, r, 'rgba(150,150,150,' + a.toFixed(2) + ')');
      disc(ctx, px - r * 0.3, py - r * 0.3, Math.max(0.6, r * 0.45), 'rgba(205,205,205,' + a.toFixed(2) + ')');
    }
  }
  var SKULL = art(['.ooooo.', 'oWWWWWo', 'oWKWKWo', 'oWWWWWo', '.oWKWo.', '.oWWWo.', '..ooo..'], { o: '#2a1a40', W: '#f4f0ff', K: '#2a1a40' });
  // 毒の湯気：紫のゆらゆら＋小さなドクロ
  function drawFumes(ctx, x, y, t) {
    t = t || 0; x = R(x); y = R(y);
    for (var i = 0; i < 3; i++) {
      var bx = x + (i - 1) * 6;
      for (var k = 0; k < 12; k++) {
        var ph = (k + t * 10) % 12;
        var yy = y - ph * 1.2 - 1;
        var xx = bx + Math.sin(ph * 0.7 + i + t * 3) * 1.6;
        ctx.fillStyle = k % 3 === 0 ? 'rgba(200,140,240,0.85)' : 'rgba(160,90,210,0.7)';
        ctx.fillRect(R(xx), R(yy), 1, 1);
      }
    }
    var sp = (t * 0.5) % 1;
    var a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * Math.max(0, 1 - sp);
    blit(ctx, SKULL, x + R(Math.sin(t * 2) * 3), y - 12 - R(sp * 8));
    ctx.globalAlpha = a0;
  }
  var STAR = art(['...o...', '..oYo..', 'ooYYYoo', 'oYYWYYo', '.oYYYo.', 'oYYoYYo', 'oo...oo'], { o: '#8a5a10', Y: '#ffd83a', W: '#fff8c0' });
  var CHICK = art(['.oooo..', 'oYYYYo.', 'oYKYYoo', 'oYYYYBB', 'oYYYYoo', '.oYYo..', '..oo...'], { o: '#8a5a10', Y: '#ffe060', K: O, B: '#f08030' });
  // 目を回した頭上を回る星とひよこ
  function drawStars(ctx, x, y, t) {
    t = t || 0;
    var items = [STAR, CHICK, STAR, CHICK];
    var list = [];
    for (var i = 0; i < 4; i++) {
      var a = t * 3 + i * Math.PI / 2;
      list.push([Math.sin(a), x + Math.cos(a) * 11, y + Math.sin(a) * 3, items[i]]);
    }
    list.sort(function (p, q) { return p[0] - q[0]; });
    for (var j = 0; j < list.length; j++) {
      var it = list[j];
      if (it[0] < -0.3) { var a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * 0.6; blit(ctx, it[3], it[1], it[2]); ctx.globalAlpha = a0; }
      else blit(ctx, it[3], it[1], it[2]);
    }
  }
  // 稲妻（約12x28、点滅する）
  function drawLightning(ctx, x, y, t) {
    t = t || 0; x = R(x); y = R(y);
    var f = Math.floor(t * 12);
    if (f % 4 === 3) return;
    var pts = [[0, -14]], cx = 0;
    for (var k = 1; k <= 6; k++) { cx = (k & 1) ? 3 + R(hash(f, k) * 2) : -3 - R(hash(k, f) * 2); pts.push([cx, -14 + k * 4]); }
    pts[pts.length - 1][0] = 0;
    var seg = function (col, w) {
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
        for (var s = 0; s <= n; s++) rect(ctx, x + R(a[0] + (b[0] - a[0]) * s / n) - (w >> 1), y + R(a[1] + (b[1] - a[1]) * s / n), w, 1, col);
      }
    };
    seg('#c88a00', 4); seg('#ffe23a', 2); seg('#ffffff', 1);
    if (f & 1) { rect(ctx, x - 6, y - 10, 1, 1, '#fff27a'); rect(ctx, x + 6, y + 4, 1, 1, '#fff27a'); rect(ctx, x + 5, y - 6, 1, 1, '#ffffff'); }
  }
  // 頭の上の大きな稲妻マーク（⚡）＋ぴりぴりの線。(x,y)=稲妻の下端。flip でも上に描く
  var BOLT = art(['...oooo', '..oYYo.', '..oYo..', '.oYYooo', '.oYYYYo', 'ooooYo.', '...oYo.', '...oo..', '..oo...'], { o: '#6a4a00', Y: '#ffe23a' });
  var BOLT2 = art(['....ooooo', '...oYYYo.', '...oYWo..', '..oYYo...', '..oYWoooo', '.oYYYYYYo', '.ooooYYo.', '....oYo..', '...oYo...', '...oo....', '..oo.....'], { o: '#6a4a00', Y: '#ffe23a', W: '#ffffff' });
  function drawBolt(ctx, x, y, sc, ph, flip) {
    x = R(x); y = R(y);
    var b = sc >= 0.9 ? BOLT2 : BOLT;
    blit(ctx, b, x, y - (b.h >> 1));
    var c = ph ? '#fff27a' : '#ffd000';
    [[-9, -6, -6, -3], [8, -8, 5, -4], [-11, 1, -7, 0], [10, 0, 6, 0]].forEach(function (q, i) {
      if ((i + ph) % 3 === 2) return;
      var n = Math.max(Math.abs(q[2] - q[0]), Math.abs(q[3] - q[1]));
      for (var k = 0; k <= n; k++) rect(ctx, x + R(q[0] + (q[2] - q[0]) * k / n), y + R(q[1] + (q[3] - q[1]) * k / n) - 4, 1, 1, c);
    });
  }
  // ピカピカのきらめき
  function drawSparkles(ctx, x, y, t, r) {
    t = t || 0; r = r || 16; x = R(x); y = R(y);
    for (var i = 0; i < 5; i++) {
      var a = i * 2.4 + 0.5, ph = (t * 1.6 + i * 0.37) % 1;
      var s = R(Math.sin(ph * Math.PI) * 3);
      if (s <= 0) continue;
      var px = x + R(Math.cos(a) * r * (0.7 + 0.3 * hash(i, 1))), py = y + R(Math.sin(a) * r * 0.6);
      rect(ctx, px - s, py, s * 2 + 1, 1, '#ffffff'); rect(ctx, px, py - s, 1, s * 2 + 1, '#ffffff');
      if (s >= 2) { rect(ctx, px - 1, py - 1, 3, 3, '#fffbe0'); rect(ctx, px, py, 1, 1, '#ffffff'); }
    }
  }
  // 汗（青いしずく）
  function drawDrop(ctx, x, y) {
    x = R(x); y = R(y);
    rect(ctx, x, y - 1, 1, 1, '#2a6a9a'); rect(ctx, x - 1, y, 3, 1, '#2a6a9a'); rect(ctx, x - 2, y + 1, 5, 2, '#2a6a9a'); rect(ctx, x - 1, y + 3, 3, 1, '#2a6a9a');
    rect(ctx, x, y, 1, 1, '#bfe8ff'); rect(ctx, x - 1, y + 1, 3, 2, '#8ad0ff'); rect(ctx, x - 1, y + 1, 1, 1, '#ffffff');
  }
  // 吸い込み線：(x,y)＝ノズルの口へ下から集まる線と汚れ
  function drawSuctionLines(ctx, x, y, t) {
    t = t || 0; x = R(x); y = R(y);
    for (var i = 0; i < 7; i++) {
      var a = Math.PI * (0.18 + i * 0.64 / 6);
      var ca = Math.cos(a), sa = Math.sin(a);
      for (var d = 7; d < 34; d++) {
        var m = (d + t * 50 + i * 3) % 9;
        if (m < 4) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - d / 60).toFixed(2) + ')'; ctx.fillRect(x + R(ca * d), y + R(sa * d), 1, 1); }
      }
      // 吸われる汚れ
      var dd = 30 - ((t * 30 + i * 11) % 26);
      ctx.fillStyle = i % 2 ? 'rgba(90,110,40,0.9)' : 'rgba(120,90,50,0.9)';
      ctx.fillRect(x + R(ca * dd), y + R(sa * dd), 2, 2);
    }
    // 口元の渦
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    var sp = Math.floor(t * 10) % 4;
    ctx.fillRect(x - 4 + sp, y + 2, 2, 1); ctx.fillRect(x + 3 - sp, y + 4, 2, 1);
  }
  // ぽちゃん：水しぶきの王冠（t=0..1 で一回分）
  function drawSplash(ctx, x, y, t) {
    t = Math.max(0, Math.min(1, t == null ? 0.4 : t)); x = R(x); y = R(y);
    var h = Math.sin(t * Math.PI);
    for (var i = -3; i <= 3; i++) {
      if (!i) continue;
      var px = x + i * (2 + t * 4), py = y - R(h * (9 - Math.abs(i) * 2));
      rect(ctx, R(px), py, 2, 2, '#ffffff'); rect(ctx, R(px), py + 2, 2, 1, '#bff4ea');
    }
    var rw = R(4 + t * 12);
    rect(ctx, x - rw, y, rw * 2, 1, '#e8fff8');
    if (t > 0.3) { rect(ctx, x - rw - 2, y + 1, 3, 1, '#bff4ea'); rect(ctx, x + rw - 1, y + 1, 3, 1, '#bff4ea'); }
  }
  // 口から吹く炎（dir=1 で右へ）
  function drawFlame(ctx, x, y, dir, t) {
    t = t || 0; dir = dir < 0 ? -1 : 1; x = R(x); y = R(y);
    var f = Math.floor(t * 14), L = 22;
    for (var d = 0; d <= L; d++) {
      var w = 1 + d * 0.32 + Math.sin(d * 0.9 + f) * 0.8;
      var wave = R(Math.sin(d * 0.5 - t * 20) * d * 0.06);
      for (var yy = -Math.ceil(w); yy <= Math.ceil(w); yy++) {
        var ay = Math.abs(yy) / w;
        if (ay > 1) continue;
        if (d > L - 4 && hash(d * 7 + yy, f) > 0.5) continue;
        var core = ay < 0.35 && d < L * 0.6, mid = ay < 0.7 && d < L * 0.85;
        rect(ctx, x + dir * d, y + yy + wave, 1, 1, core ? '#fff6a0' : mid ? '#ffa020' : '#e03a18');
      }
    }
    for (var k = 0; k < 5; k++) { var e = hash(k, f); rect(ctx, x + dir * R(L * (0.6 + e * 0.6)), y + R((hash(f, k) - 0.5) * 14), 1, 1, e > 0.5 ? '#ffd040' : '#ff6a20'); }
  }
  // 泡がはじける
  function drawPop(ctx, x, y, r, t) {
    r = r || 12; t = Math.max(0, Math.min(1, t == null ? 0.5 : t)); x = R(x); y = R(y);
    for (var i = 0; i < 10; i++) {
      var a = i / 10 * Math.PI * 2 + 0.2, d0 = r * (0.7 + t * 0.6);
      for (var k = 0; k < 3; k++) rect(ctx, x + R(Math.cos(a) * (d0 + k)), y + R(Math.sin(a) * (d0 + k)), 1, 1, k ? '#e8fff8' : '#ffffff');
    }
    for (var j = 0; j < 6; j++) { var b = j * 1.05; rect(ctx, x + R(Math.cos(b) * r * (0.3 + t)), y + R(Math.sin(b) * r * (0.3 + t)), 2, 2, '#d4f8ee'); }
  }
  // 鳥（約26x14、2コマで羽ばたく）。右向き
  // 空を飛ぶ鳥。くちばしの先は x + 13。
  function drawBird(ctx, x, y, t, dir, carry) {   // v23.2：ユーザーの絵のカモメ。carry＝くわえた金魚の色
    var d = dir < 0 ? -1 : 1;
    if (carry) drawFish(ctx, x + d * 19, y + 9, { scale: 0.5, color: carry, eyes: 'x', rot: d * 1.3, dir: d, t: 0, fx: false });
    drawAsset(ctx, 'gull', x, y, { dir: d, frame: Math.floor((t || 0) * 8) & 3 });
  }

  // ---------- 小物 ----------
  var PELLETS = {
    normal: art(['.oooo.', 'oLLBBo', 'oLBBBo', 'oBBBDo', 'oBBDDo', '.oooo.'], { o: O, L: '#ecc276', B: '#c8903c', D: '#9a6a2a' }),
    poison: art(['..ooooo..', '.oLLPPPo.', 'oLPWWWPPo', 'oPWKWKWPo', 'oPWWWWWDo', 'oPPWKWPDo', 'oPgWWWDDo', '.oPPDgDo.', '..ooooo..'],
      { o: '#2a1a40', L: '#d8a8f8', P: '#9a4ac8', D: '#6a2a90', W: '#f4f0ff', K: '#2a1a40', g: '#7cf04a' }),
    ice: art(['oooooo', 'oWWLLo', 'oWLLBo', 'oLLLBo', 'oLBBBo', 'oooooo'], { o: '#2a6a90', W: '#ffffff', L: '#c8f0ff', B: '#88c8ec' }),
    seed: art(['.oo.', 'oDWo', 'oDWo', 'oWDo', 'oDWo', '.oo.'], { o: O, D: '#4a3a28', W: '#f0ead0' }),
    fire: art(['..r..', '.rr.r', 'rYrrr', 'rYYOr', 'rOYOr', '.rrr.'], { r: '#c83020', O: '#ff8a20', Y: '#ffe060' }),
    spark: art(['y.....y', '..ooo..', '.oYYYo.', 'yoYWYoy', '.oYYYo.', '..ooo..', 'y.....y'], { o: O, Y: '#ffd83a', W: '#ffffff', y: '#fff27a' })
  };
  // type='poison' は紫のドクロ玉＋立ちのぼる湯気（t 秒でゆらぐ。省略時は静止）
  function drawPellet(ctx, x, y, type, t) {
    if (type === 'gold') return drawGoldPellet(ctx, x, y, t);
    blit(ctx, PELLETS[type] || PELLETS.normal, x, y);
    if (type === 'poison') {
      t = t || 0; x = R(x); y = R(y);
      for (var i = 0; i < 2; i++) for (var k = 0; k < 7; k++) {
        var ph = (k + t * 8) % 7;
        ctx.fillStyle = k & 1 ? 'rgba(210,150,250,0.9)' : 'rgba(150,80,200,0.75)';
        ctx.fillRect(x - 2 + i * 4 + R(Math.sin(ph * 0.9 + i * 2 + t * 4) * 1.2), y - 6 - R(ph * 1.3), 1, 1);
      }
    } else if (type === 'spark' && (Math.floor((t || 0) * 10) & 1)) {
      rect(ctx, R(x) - 5, R(y) - 1, 1, 1, '#fff27a'); rect(ctx, R(x) + 5, R(y) + 1, 1, 1, '#fff27a');
    }
  }

  var POOP = art(['.o..', 'oBo.', 'oBo.', '.oBo', '.oBo', 'oBo.', 'oBo.', 'oBo.', '.oBo', '.oo.'], { o: '#7a3a18', B: '#c87038' });
  function drawPoop(ctx, x, y) { blit(ctx, POOP, x, y); }

  function drawBubble(ctx, x, y, r) {
    r = r == null ? 2 : r; x = R(x); y = R(y);
    if (r <= 1) {
      ctx.fillStyle = '#d4f8ee';
      ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y + 1, 1, 1);
      return;
    }
    var col = '#e4fff6';
    var px = r, py = 0, err = 1 - r;
    ctx.fillStyle = 'rgba(220,255,245,0.18)';
    ellipse(ctx, x, y, r, r, 'rgba(220,255,245,0.18)');
    ctx.fillStyle = col;
    while (px >= py) {
      var pts = [[px, py], [py, px], [-py, px], [-px, py], [-px, -py], [-py, -px], [py, -px], [px, -py]];
      for (var i = 0; i < 8; i++) ctx.fillRect(x + pts[i][0], y + pts[i][1], 1, 1);
      py++;
      if (err < 0) err += 2 * py + 1; else { px--; err += 2 * (py - px) + 1; }
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - R(r * 0.5), y - R(r * 0.5), 1, 1);
    if (r >= 4) ctx.fillRect(x - R(r * 0.5) + 1, y - R(r * 0.5) - 1, 1, 1);
    if (r >= 8) { // 大きな泡：虹色のつやと太い光
      for (var a = 0; a < 14; a++) {
        var an = Math.PI * (1.05 + a * 0.045), rr2 = r - 2;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x + R(Math.cos(an) * rr2), y + R(Math.sin(an) * rr2), 1, 1);
      }
      var cols = ['#ffb0e0', '#b0d0ff', '#c0ffb0'];
      for (var b = 0; b < 9; b++) {
        var an2 = Math.PI * (0.1 + b * 0.05);
        ctx.fillStyle = cols[b % 3]; ctx.fillRect(x + R(Math.cos(an2) * (r - 1)), y + R(Math.sin(an2) * (r - 1)), 1, 1);
      }
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - R(r * 0.45), y - R(r * 0.55), 2, 2);
    }
  }

  // ブラシ（約2倍）。原点 (0,0) = 毛先の中心。上に柄が伸びる縦向きを 0.55rad 傾けて描く。
  var BRUSH = (function () {
    var g = new Grid(30, 56, 15, 50);
    var H = '#e8a868', Hm = '#d89050', h = '#b87040', W = '#c87a40', Wl = '#e09a58', w = '#a05a30', B = '#fff4dc', b = '#dccfb0';
    g.stamp(function (x, y) {
      // 毛（y -10..0）
      if (y >= -10 && y <= 0 && x >= -11 && x <= 10) {
        if (y >= -1) { var tuft = ((x + 12) % 4); if (y === 0 && tuft === 3) return null; if (y === -1 && tuft === 3 && (x & 4)) return null; }
        return (((x + 12) >> 1) & 1) ? b : B;
      }
      // 台（y -18..-11）角丸
      if (y >= -18 && y <= -11 && x >= -12 && x <= 11) {
        if ((y === -18 || y === -11) && (x === -12 || x === 11)) return null;
        if (y === -17) return Wl;
        if (y === -11 || y === -12) return w;
        return W;
      }
      // 柄（y -44..-19）
      if (y >= -44 && y <= -19 && x >= -3 && x <= 2) {
        if (y === -44 && (x === -3 || x === 2)) return null;
        if (y >= -40 && y <= -38 && (x === -1 || x === 0)) return O; // つり穴
        return x <= -2 ? H : x === 2 ? h : Hm;
      }
      return null;
    }, O);
    // 柄の付け根の金具
    for (var x = -4; x <= 3; x++) { g.set(x, -19, '#9aa8a8'); g.set(x, -20, x < -1 ? '#e8f0f0' : '#c4d0d0'); }
    g.set(-5, -19, O); g.set(-5, -20, O); g.set(4, -19, O); g.set(4, -20, O);
    return g;
  })();
  function drawBrush(ctx, x, y, t) {
    var dx = R(Math.sin((t || 0) * 18) * 3);
    blit(ctx, BRUSH, x + dx, y, { rot: 0.55 });
  }
  var NOZZLE = art([
    '..oooooo..',
    '..oGhGgo..',
    '..oGhGgo..',
    '..oGhGgo..',
    '..oGhGgo..',
    '.oooooooo.',
    'oGGhGGGgGo',
    'oGGhGGGggo',
    'oggggggggo',
    '.oDDDDDDo.',
    '..oooooo..'], { o: O, G: '#b8d4d0', g: '#8ab0ac', h: '#ffffff', D: '#2a4a48' });
  var TAILFIN = art(['...oBBBBBo...', '...oBBBBBo...', '....oBBBo....', '....oFFFo....', '...oFFoFFo...', '..oFFoFoFFo..', '.oFFoFFFoFFo.', '.oFoFFoFFoFo.', 'oFFFFo.oFFFFo', 'oFFFo...oFFFo', 'oFFo.....oFFo', 'ooo.......ooo'],
    { o: FK, F: '#ff9512', B: '#ff8a00' });
  // opts（省略可）: { suck: true で吸い込み線, tail: true で口から金魚の尾がのぞく, t: 秒 }
  function drawNozzle(ctx, x, y, opts) {
    x = R(x); y = R(y);
    var o = opts && typeof opts === 'object' ? opts : {};
    var t = +o.t || 0;
    var topY = y - 5;
    if (topY > 0) { rect(ctx, x - 3, 0, 6, topY, O); rect(ctx, x - 2, 0, 4, topY, '#6aa898'); rect(ctx, x - 1, 0, 1, topY, '#9ccfc0'); }
    if (o.suck) drawSuctionLines(ctx, x, y + 5, t);
    if (o.tail) { // 吸われていく尾びれ（ぴちぴち）
      var w = R(Math.sin(t * 18) * 1);
      blit(ctx, TAILFIN, x + w, y + 9 + (R(t * 6) & 1));
    }
    blit(ctx, NOZZLE, x, y);
    if (!o.suck) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(x - 6, y + 8, 1, 2); ctx.fillRect(x + 6, y + 8, 1, 2); ctx.fillRect(x, y + 9, 1, 2);
    }
  }

  // 旧来の小さな網（死因札アイコン用に残す）
  function drawNetMini(ctx, x, y, full) {
    x = R(x); y = R(y);
    var r = 12;
    // 柄
    for (var k = 0; k < 120; k++) {
      var hx = x + r - 1 + R(k * 0.35), hy = y - r - k + 2;
      if (hy < -2) break;
      rect(ctx, hx - 1, hy, 4, 1, O); rect(ctx, hx, hy, 2, 1, '#e0a060');
    }
    if (full) drawFish(ctx, x, y + 1, { scale: 0.45, eyes: 'wide', dir: 1 });
    // 網目
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (var yy = -r; yy <= r; yy++) for (var xx = -r; xx <= r; xx++) {
      if (xx * xx + yy * yy >= (r - 1) * (r - 1)) continue;
      if (((xx + 40) % 3 === 0) || ((yy + 40) % 3 === 0)) ctx.fillRect(x + xx, y + yy, 1, 1);
    }
    // 枠
    for (var a = 0; a < 96; a++) {
      var ang = a / 96 * Math.PI * 2;
      var fx = x + R(Math.cos(ang) * r), fy = y + R(Math.sin(ang) * r);
      rect(ctx, fx - 1, fy - 1, 3, 3, O);
    }
    for (var a2 = 0; a2 < 96; a2++) {
      var ang2 = a2 / 96 * Math.PI * 2;
      rect(ctx, x + R(Math.cos(ang2) * r), y + R(Math.sin(ang2) * r), 1, 1, '#4a8ad0');
    }
  }

  // ===== 金魚すくいの網（2層）=====
  // drawNetBack → 中身（魚など）→ drawNetFront の順に描くと、中身が網に入って見える。
  // (x,y)＝輪の中心。輪は幅約46・高さ約12の楕円、袋は深さ約18〜26（o.sag 0..1）。
  // o: { t: 秒, sag: 0..1（既定0.45、中身あり=1）, tilt: ラジアン（既定0）, wet: 袋に水, drip: しずく }
  var NET_RX = 23, NET_S = 6 / 23;
  var NET_RIM = '#3f86d6', NET_RIM_D = '#2c5f9e', NET_RIM_L = '#a8dcff';
  function netOpts(o) {
    o = o && typeof o === 'object' ? o : {};
    var sag = +o.sag; if (!isFinite(sag)) sag = 0.45; sag = Math.max(0, Math.min(1, sag));
    var tilt = +o.tilt; if (!isFinite(tilt)) tilt = 0; tilt = Math.max(-1.5, Math.min(1.5, tilt));
    var t = +o.t; if (!isFinite(t)) t = 0;
    return { sag: sag, tilt: tilt, t: t, wet: !!o.wet, drip: !!o.drip, c: Math.cos(tilt), s: Math.sin(tilt), D: 17 + 12 * sag, handle: o.handle || 290 };
  }
  // 袋の半径プロファイル（v=0 輪 → v=1 底）
  function netR(v, n) { var b = Math.sqrt(Math.max(0, 1 - v * v)); return NET_RX * b * (1 + 0.1 * n.sag * Math.sin(Math.PI * v)); }
  // 袋の3D点 → ローカル画面座標（傾き前）
  function netPt(th, v, n) {
    var w = 0.12 * Math.sin(n.t * 2.6 + v * 3.2 + th) * v;
    var r = netR(v, n), a = th + w;
    return [r * Math.cos(a), n.D * v + NET_S * r * Math.sin(a) + 0.7 * v * Math.sin(n.t * 2.1 + th * 2)];
  }
  function netTo(x, y, n, lx, ly) { return [x + lx * n.c - ly * n.s, y + lx * n.s + ly * n.c]; }
  // 網目（菱形）：front=true で手前側、false で奥側の糸だけ集める
  function netMesh(x, y, n, front) {
    var seen = {}, out = [], K = 9, j, sg, v, th, p, q, key, th0;
    for (j = 0; j < K; j++) for (sg = -1; sg <= 1; sg += 2) {
      th0 = j / K * Math.PI * 2;
      for (v = 0.04; v <= 0.985; v += 0.012) {
        th = th0 + sg * 1.6 * v;
        if ((Math.sin(th) > 0) !== front) continue;
        p = netPt(th, v, n); q = netTo(x, y, n, p[0], p[1]);
        key = R(q[0]) + ',' + R(q[1]);
        if (!seen[key]) { seen[key] = 1; out.push(R(q[0]), R(q[1])); }
      }
    }
    // 輪のすぐ下の横糸
    for (th = 0; th < Math.PI * 2; th += 0.03) {
      if ((Math.sin(th) > 0) !== front) continue;
      p = netPt(th, 0.3, n); q = netTo(x, y, n, p[0], p[1]);
      key = R(q[0]) + ',' + R(q[1]);
      if (!seen[key]) { seen[key] = 1; out.push(R(q[0]), R(q[1])); }
    }
    return { pts: out, seen: seen };
  }
  function plot(ctx, pts, col) { ctx.fillStyle = col; for (var i = 0; i < pts.length; i += 2) ctx.fillRect(pts[i], pts[i + 1], 1, 1); }
  // 輪（半分）。front=true で手前の太い縁
  function netRim(ctx, x, y, n, front) {
    var pts = [], th, q, i;
    for (th = 0; th <= Math.PI * 2 + 0.001; th += 0.025) {
      var sn = Math.sin(th);
      if (front ? sn < -0.02 : sn > 0.02) continue;
      q = netTo(x, y, n, NET_RX * Math.cos(th), NET_S * NET_RX * sn);
      pts.push(R(q[0]), R(q[1]), th);
    }
    for (i = 0; i < pts.length; i += 3) rect(ctx, pts[i] - 1, pts[i + 1] - 1, 3, front ? 4 : 3, O);
    for (i = 0; i < pts.length; i += 3) {
      if (front) {
        var c = Math.cos(pts[i + 2]);
        rect(ctx, pts[i], pts[i + 1], 1, 2, NET_RIM);
        rect(ctx, pts[i], pts[i + 1] + 1, 1, 1, NET_RIM_D);
        if (c > -0.7 && c < 0.25) rect(ctx, pts[i], pts[i + 1], 1, 1, NET_RIM_L);
      } else rect(ctx, pts[i], pts[i + 1], 1, 1, NET_RIM_D);
    }
  }
  // 柄：輪の右端から右上へ。part: 'wood'（奥）/ 'ferrule'（手前の金具）
  function netHandle(ctx, x, y, n, part) {
    var ang = -1.0, dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
    var bx = NET_RX - 1, by = 0, s0 = part === 'wood' ? 7 : 0, s1 = part === 'wood' ? n.handle : 9;
    var pass, sv, k, q, col;
    for (pass = 0; pass < 2; pass++) for (sv = s0; sv <= s1; sv += 0.5) {
      var hw = sv < 9 ? 2.5 : 2;
      for (k = -3; k <= 3; k++) {
        var ak = Math.abs(k);
        if (ak > hw + 0.6) continue;
        var edge = ak > hw - 0.5;
        if ((pass === 0) !== edge) continue;
        q = netTo(x, y, n, bx + dx * sv + px * k * 0.5 * 2, by + dy * sv + py * k);
        if (edge) col = O;
        else if (sv < 9) { // 金具
          col = k < 0 ? '#f4fbff' : k === 0 ? '#bccbd2' : '#7f939c';
          if (Math.abs(sv - 3) < 0.6 || Math.abs(sv - 7.5) < 0.6) col = '#5f737c';
        } else if (sv > 24 && sv < 46) { // 握りのテープ（しましま）
          col = ((sv + k * 0.8) % 5) < 2.4 ? '#ffffff' : '#e8504a';
          if (k > 0) col = col === '#ffffff' ? '#d8d0cc' : '#b83a3a';
          if (sv < 25.2 || sv > 44.8) col = '#8a2a2a';
        } else { // 木
          col = k < 0 ? '#ffd090' : k === 0 ? '#e8a860' : '#b8783c';
          if (k === 0 && (R(sv * 2) % 23 === 0)) col = '#c88848';
        }
        rect(ctx, R(q[0]), R(q[1]), 1, 1, col);
      }
    }
  }
  // 袋の中の水（半透明の水色）
  function netWater(ctx, x, y, n) {
    var vw = 0.55, zw = n.D * vw, i, j, v, xs, ys;
    var vs = [];
    for (v = vw; v <= 1.0001; v += 0.04) vs.push(v, n.D * v, netR(v, n));
    var hit = function (lx, ly) {
      for (var k = 0; k < vs.length; k += 3) {
        var r = vs[k + 2], z = vs[k + 1];
        if (Math.abs(lx) > r) continue;
        var h = NET_S * Math.sqrt(r * r - lx * lx);
        if (Math.abs(ly - z) <= h && (ly >= zw || k === 0)) return true;
      }
      return false;
    };
    var ext = NET_RX + n.D + 4;
    var surf = 0, pts = [], top = [];
    for (j = -ext; j <= ext; j++) for (i = -ext; i <= ext; i++) {
      // 画面ピクセル → ローカル（逆回転）
      xs = i * n.c + j * n.s; ys = -i * n.s + j * n.c;
      if (ys < zw - NET_RX * NET_S - 1 || ys > n.D + 2) continue;
      if (!hit(xs + 0.5, ys + 0.5)) continue;
      pts.push(x + i, y + j);
      // 水面の手前の線
      var r0 = netR(vw, n), e = (xs / r0) * (xs / r0) + ((ys - zw) / (NET_S * r0)) * ((ys - zw) / (NET_S * r0));
      if (e > 0.55 && e < 1.25 && ys < zw + 2) top.push(x + i, y + j);
    }
    plot(ctx, pts, 'rgba(120,210,255,0.38)');
    plot(ctx, top, 'rgba(230,250,255,0.55)');
    surf = pts.length;
    return surf;
  }
  function drawNetBack(ctx, x, y, o) {
    x = R(x); y = R(y);
    var n = netOpts(o);
    netHandle(ctx, x, y, n, 'wood');
    netRim(ctx, x, y, n, false);
    plot(ctx, netMesh(x, y, n, false).pts, 'rgba(190,225,222,0.42)');
    if (n.wet) netWater(ctx, x, y, n);
  }
  function drawNetFront(ctx, x, y, o) {
    x = R(x); y = R(y);
    var n = netOpts(o), th, p, q, pts = [], seen = {}, key;
    // 袋のふち（シルエット）をうっすら
    for (var side = 0; side < 2; side++) for (var v = 0.0; v <= 1.0; v += 0.01) {
      p = netPt(side ? Math.PI : 0, v, n); q = netTo(x, y, n, p[0], p[1]);
      key = R(q[0]) + ',' + R(q[1]); if (!seen[key]) { seen[key] = 1; pts.push(R(q[0]), R(q[1])); }
    }
    plot(ctx, pts, 'rgba(29,77,74,0.5)');
    plot(ctx, netMesh(x, y, n, true).pts, 'rgba(255,255,255,0.45)');
    netRim(ctx, x, y, n, true);
    netHandle(ctx, x, y, n, 'ferrule');
    if (n.drip) {
      for (var i = 0; i < 3; i++) {
        var ox = [-4, 1, 5][i], ph = (n.t * 0.9 + [0, 0.41, 0.73][i]) % 1;
        p = netPt(Math.PI / 2 + ox * 0.04, 0.93, n); q = netTo(x, y, n, p[0] + ox * 0.6, p[1]);
        var dx = R(q[0]), dy = R(q[1]) + 1;
        if (ph < 0.25) { // ふくらみかけ
          rect(ctx, dx - 1, dy, 3, 2, O); rect(ctx, dx, dy, 1, 1, '#8ad0ff');
        } else {
          var f = (ph - 0.25) / 0.75;
          dy += R(3 + f * f * 34);
          rect(ctx, dx - 1, dy - 1, 3, 1, O); rect(ctx, dx - 2, dy, 5, 3, O); rect(ctx, dx - 1, dy + 3, 3, 1, O);
          rect(ctx, dx, dy - 1, 1, 1, '#bfe8ff'); rect(ctx, dx - 1, dy, 3, 3, '#8ad0ff'); rect(ctx, dx - 1, dy, 1, 1, '#ffffff'); rect(ctx, dx + 1, dy + 2, 1, 1, '#4aa0d8');
        }
      }
    }
  }
  // 互換：drawNet(ctx,x,y,full)。full なら中に金魚（驚き顔）＋水＋しずく
  function drawNet(ctx, x, y, full, t) {
    var o = full ? { sag: 1, wet: true, drip: true, t: t || 0 } : { sag: 0.45, t: t || 0 };
    drawNetBack(ctx, x, y, o);
    if (full) drawFish(ctx, R(x) + 1, R(y) + 14, { scale: 0.8, eyes: 'wide', dir: 1, rot: 0.3 });
    drawNetFront(ctx, x, y, o);
  }

  // opts（省略可）: { fish: true で爪に引っかけた金魚, t: 秒 }
  function drawCatPaw(ctx, x, y, opts) {   // v23 P5c：ユーザーの絵の猫の手。(x,y)＝肉球
    x = R(x); y = R(y);
    var o = opts && typeof opts === 'object' ? opts : {};
    if (o.fish) drawFish(ctx, x + 1, y + 13, { scale: 0.7, eyes: 'x', t: 0, rot: 0.2, dir: 1, fx: false });
    var top = y - 43;   // 絵の上のはしより上は、腕をのばす
    if (top > 0) { rect(ctx, x - 7, 0, 14, top + 1, FK); rect(ctx, x - 5, 0, 10, top + 1, '#3a3036'); }
    drawAsset(ctx, 'catpaw', x, y);
  }


  var FEATHER = art([
    '.....o.....',
    '....oCo....',
    '...oCqCo...',
    '..oCCqCCo..',
    '..oCcqCCo..',
    '.oCCCqCCCo.',
    '.oCCCqCcCo.',
    '.ocCCqCCCo.',
    '.oCCCqCCCo.',
    '..oCcqCCo..',
    '..oCCqcCo..',
    '...oCqCo...',
    '...oCqo....',
    '....oqo....',
    '.....q.....',
    '.....q.....'], { o: O, C: '#fff4dc', c: '#ecd4ac', q: '#f0a070' });
  function drawFeather(ctx, x, y, rot) { blit(ctx, FEATHER, x, y, { rot: (rot || 0) + 0.9 }); }

  var DUCK = null;   // v22: ポップなアヒルのおもちゃ（buildDuckToy。初回に作る）
  function drawDuck(ctx, x, y, t) {
    var by = R(Math.sin((t || 0) * 3) * 1);
    blit(ctx, DUCK || (DUCK = buildDuckToy()), x, y + by);
  }

  var EYEBALL = art([
    '...ooo...',
    '..oWWWo..',
    '.oWWWWWo.',
    'oWrWKKKWo',
    'oWWKKhKWo',
    'orWKKKKWo',
    'oWrWKKWWo',
    '.oWWWrWo.',
    '..ooooo..'], { o: O, W: '#ffffff', K: '#111111', h: '#ffffff', r: '#e06060' });
  function drawEyeball(ctx, x, y) { blit(ctx, EYEBALL, x, y); }

  // ---------- アイコン（吹き出し・右上枠共用、約12x12） ----------
  var ICONS = {
    food: art([
      '....ooo.....',
      '...oLBBo....',
      '...oBBDo....',
      '...oBDDo....',
      '.ooo.ooo.ooo',
      'oLBBooLBBoBo',
      'oBBDooBBDoDo',
      'oBDDooBDDoDo',
      '.ooo..ooo.o.'], { o: O, L: '#ecc276', B: '#c8903c', D: '#9a6a2a' }),
    dirty: art([
      '.s..s...s...',
      's..s...s....',
      '.s..s...s...',
      '............',
      '...oooo.....',
      '..oGGgGoo...',
      '.oGgGGGGGo..',
      'oGGGGgGGGGo.',
      'oGgGGGGGgGGo',
      '.ooooooooooo'], { o: '#3a4a20', G: '#7a8a3a', g: '#a0a050', s: '#8a9a50' }),
    heart: art([
      '.ooo...ooo.',
      'oRWRo.oRRRo',
      'oWRRRoRRRRo',
      'oRRRRRRRRRo',
      '.oRRRRRRRo.',
      '..oRRRRRo..',
      '...oRRRo...',
      '....oRo....',
      '.....o.....'], { o: O, R: '#f05a6a', W: '#ffc0c8' }),
    zzz: art([
      '......ZZZZZ',
      '.........Z.',
      '........Z..',
      '.......Z...',
      '..zzz.ZZZZZ',
      '....z......',
      '...z.......',
      '..zzz......',
      'zz.........',
      '.z.........',
      'zz.........'], { Z: O, z: '#3a7a74' }),
    angry: art([
      '..oo...oo..',
      '.oRRo.oRRo.',
      '.oRRo.oRRo.',
      '..ooo.ooo..',
      'ooo.....ooo',
      'oRRo...oRRo',
      'ooo.....ooo',
      '..ooo.ooo..',
      '.oRRo.oRRo.',
      '.oRRo.oRRo.',
      '..oo...oo..'], { o: '#8a1a1a', R: '#f04040' }),
    note: art([
      '....oooooo',
      '....oooooo',
      '....o....o',
      '....o....o',
      '....o....o',
      '....o....o',
      '.ooNo..ooo',
      'oNNNo.oNNo',
      'oNNNo.oNNo',
      '.ooo...oo.'], { o: O, N: '#3a7a74' }),
    clean: art([
      '.......oo..s',
      '......oHo...',
      '.....oHo..s.',
      '....oHo.....',
      '.ooooo......',
      'oWWWWWo.....',
      'oooooooo....',
      'oBbBbBbo....',
      'oBbBbBbo..s.',
      '.oooooo..sss',
      '..........s.'], { o: O, H: '#e8a868', W: '#c87a40', B: '#fff4dc', b: '#dccfb0', s: '#ffd83a' }),
    touch: art([
      '...oo.......',
      '..oSSo......',
      '..oSSo......',
      '..oSSoooo...',
      '..oSSoSSoo..',
      'oooSSoSSoSo.',
      'oSoSSSSSSSo.',
      'oSSSSSSSSSo.',
      '.oSSSSSSSso.',
      '..oSSSSSso..',
      '...oSSSSo...',
      '...oooooo...'], { o: O, S: '#ffe0c0', s: '#e8b890' }),
    net: art([
      '.........oo',
      '........oHo',
      '.......oHo.',
      '..oooooHo..',
      '.oBwBwBo...',
      'oBwBwBwBo..',
      'owBwBwBwo..',
      'oBwBwBwBo..',
      '.oBwBwBo...',
      '..ooooo....'], { o: O, H: '#e0a060', B: '#4a8ad0', w: '#e8f4ff' }),
    duck: art([
      '.....ooo....',
      '....oYYYo...',
      '....oYKYoo..',
      '....oYYYBBo.',
      '.o...oYYoo..',
      'oYo.oYYYYo..',
      'oYYoYYYYYYo.',
      'oYyyYYYYYYo.',
      '.oYYYYYYYo..',
      '..ooooooo...'], { o: O, Y: '#ffd83a', y: '#f0b020', K: O, B: '#f08030' })
  };
  function drawIcon(ctx, x, y, icon) { if (ICONS[icon]) blit(ctx, ICONS[icon], x, y); }

  // ---------- 吹き出し ----------
  var CLOUD = (function () {
    var g = new Grid(44, 36, 20, 14);
    var circ = [[-9, 1, 6.5], [-2, -4, 7.5], [7, -2, 7], [11, 3, 5.5], [3, 5, 6.5], [-6, 6, 5.5]];
    g.stamp(function (x, y) {
      for (var i = 0; i < circ.length; i++) {
        var c = circ[i], dx = x + 0.5 - c[0], dy = y + 0.5 - c[1];
        if (dx * dx + dy * dy <= c[2] * c[2]) return CREAM;
      }
      var t1 = [-13, 15, 2.4], t2 = [-17, 19, 1.5];
      var a = (x + 0.5 - t1[0]), b = (y + 0.5 - t1[1]);
      if (a * a + b * b <= t1[2] * t1[2]) return CREAM;
      a = x + 0.5 - t2[0]; b = y + 0.5 - t2[1];
      if (a * a + b * b <= t2[2] * t2[2]) return CREAM;
      return null;
    }, O);
    return g;
  })();
  function drawThought(ctx, x, y, icon, mirror) {
    blit(ctx, CLOUD, x, y, mirror ? { mirror: true } : null); // v19: mirror=しっぽ（小さな泡）が右下へ
    if (icon === 'food') { // 参考画像の「皿にのった餌」
      x = R(x); y = R(y);
      rect(ctx, x - 6, y + 2, 13, 1, O); rect(ctx, x - 7, y + 3, 1, 1, O); rect(ctx, x + 7, y + 3, 1, 1, O);
      rect(ctx, x - 6, y + 4, 13, 1, O); rect(ctx, x - 6, y + 3, 13, 1, '#fff4dc');
      blit(ctx, PELLETS.normal, x, y);
      rect(ctx, x - 4, y - 7, 1, 2, '#f0a040'); rect(ctx, x, y - 8, 1, 2, '#f0a040'); rect(ctx, x + 4, y - 7, 1, 2, '#f0a040');
      return;
    }
    drawIcon(ctx, x, y, icon);
  }

  // ---------- UI ----------
  function drawGauge(ctx, value, max) {
    max = max || 25; value = Math.max(0, Math.min(max, value || 0));
    var x = 4, y = 30, w = 8, h = 111;
    rect(ctx, x + 1, y, w - 2, h, FK); rect(ctx, x, y + 1, w, h - 2, FK);   // v23 P5：こげ茶の輪郭・水色の中身（参考画像13）
    rect(ctx, x + 1, y + 1, w - 2, h - 2, CREAM);
    var ih = h - 4, fh = R(ih * value / max);
    var full = value >= max;
    if (fh > 0) {
      var fy = y + 2 + ih - fh;
      var main = full ? '#ffd83a' : '#5ce0d6', hi = full ? '#fff6a0' : '#b8f8f2', sh = full ? '#e0b020' : '#2fb3aa';
      rect(ctx, x + 2, fy, 4, fh, main);
      rect(ctx, x + 2, fy, 1, fh, hi);
      rect(ctx, x + 5, fy, 1, fh, sh);
      rect(ctx, x + 2, fy, 4, 1, hi);
      if (full) for (var k = fy + 6; k < fy + fh - 2; k += 14) rect(ctx, x + 3, k, 1, 3, '#ffffff');
    }
  }

  function drawIconSlot(ctx, icon) {
    var x = 136, y = 4, w = 20, h = 20;
    rect(ctx, x + 1, y, w - 2, h, FK); rect(ctx, x, y + 1, w, h - 2, FK);
    rect(ctx, x + 1, y + 1, w - 2, h - 2, CREAM);
    rect(ctx, x + 2, y + h - 2, w - 4, 1, '#e8dcc0');
    if (icon) drawIcon(ctx, x + 10, y + 10, icon);
  }

  var FONT = '"Hiragino Maru Gothic ProN","Hiragino Kaku Gothic ProN","Noto Sans CJK JP","Noto Sans JP","Yu Gothic",sans-serif';

  var CARD_WING = art([
    '..........oooo..',
    '........ooWWWo..',
    '......ooWWWWo...',
    '....ooWWWWWWooo.',
    '..ooWWWWWWWWWWo.',
    '.oWWWWWWWWWWoo..',
    'oWWWWWWWWooo....',
    'oWWWssssso......',
    '.oooooooo.......'
  ], { o: O, W: '#fff9e9', s: '#eee0c8' });

  // 死因ミニ絵（札・図鑑で使用）。size<=1: 図鑑用の小さな絵（魚は scale 0.5*size）
  // size>1: 小物つきの場面（約 31*size x 21*size に収まる。size=2 で魚は等倍）
  var ICON_ASSET = { giant: 'giant', overeat: 'overeat', fishman: 'fishman', split: 'split', dragon: 'dragon', skeleton: 'skeleton', possessed: 'possessed_ghost', overpolished: 'overpolished', stone: 'stone', oldage: 'oldage', sushi: 'sushi', pigeon: 'pigeon' };
  var iconColor = 'orange';
  function drawCauseIcon(ctx, x, y, id, size, t) {
    size = size || 1; t = t || 0;
    var big = size > 1, fs = 0.5 * size, u = size / 2;
    x = R(x); y = R(y);
    // v23: ユーザーの絵がある死因は、その絵をそのまま使う（色ちがいはカードの金魚の色）
    var an = ICON_ASSET[id], ac = an && assetCanvas(an, iconColor);
    if (ac) {
      var inf = ASSET_INFO[an], aw = ac.width / (inf.frames || 1), ah = ac.height;
      if (id === 'giant') {   // v23 P5：体を横に寝かせて、絵の窓いっぱいに全身を描く（回したあとの外形 106x69）
        var gk = Math.min(62 * u / 106, 42 * u / 69) * 0.95;
        drawAsset(ctx, an, x - R(5 * gk), y + R(4 * gk), { color: iconColor, scale: gk, rot: -0.87 });
        return;
      }
      var boxW = 60 * u, boxH = 40 * u, k = Math.min(boxW / aw, boxH / ah);
      var ax = inf.ax == null ? 0.5 : inf.ax, ay = inf.ay == null ? 0.5 : inf.ay;
      if (big && (id === 'overeat' || id === 'fishman')) { rect(ctx, x - R(30 * u), y + R(17 * u), R(60 * u), 1, '#a86a3a'); rect(ctx, x - R(30 * u), y + R(18 * u), R(60 * u), R(3 * u), SAND); }
      drawAsset(ctx, an, x + R((ax - 0.5) * aw * k), y + R((ay - 0.5) * ah * k), { color: iconColor, scale: k });
      return;
    }
    var F = function (dx, dy, o) { drawFish(ctx, x + R(dx * u), y + R(dy * u), merge(merge(VARIANTS[id] || {}, { scale: fs, t: t, rot: 0, fx: big }), o || {})); };
    var surf = function (dy) { // 水面
      var yy = y + R(dy * u);
      rect(ctx, x - R(34 * u), yy - R(8 * u), R(68 * u), R(8 * u), AIR);
      rect(ctx, x - R(34 * u), yy, R(68 * u), 1, '#f4f0d8'); rect(ctx, x - R(34 * u), yy + 1, R(68 * u), 1, '#3fb8ac');
    };
    var sand = function (dy) { var yy = y + R(dy * u); rect(ctx, x - R(34 * u), yy, R(68 * u), 1, '#a86a3a'); rect(ctx, x - R(34 * u), yy + 1, R(68 * u), R(12 * u), SAND); };
    var glass = function (dx) { var gx = x + R(dx * u); ctx.fillStyle = 'rgba(220,250,255,0.35)'; ctx.fillRect(gx, y - R(30 * u), 2, R(60 * u)); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(gx, y - R(30 * u), 1, R(60 * u)); };
    // 小物を描く座標だけ縮め、金魚は既存のピクセル単位の縮小を使う。
    var prop = function (dx, dy, factor, draw) {
      var px = x + R(dx * u), py = y + R(dy * u), k = factor * u;
      var alpha = ctx.globalAlpha;
      draw({
        globalAlpha: alpha,
        fillRect: function (lx, ly, w, h) {
          var left = R(lx * k), top = R(ly * k);
          var width = R((lx + w) * k) - left, height = R((ly + h) * k) - top;
          if (!width || !height) return;
          ctx.globalAlpha = this.globalAlpha;
          ctx.fillStyle = this.fillStyle;
          ctx.fillRect(px + left, py + top, width, height);
        }
      });
      ctx.globalAlpha = alpha;
    };
    var fright = { gone: false, eyes: 'surprised', mouth: 'o' };
    var react = function (dx, dy, options) {
      F(dx, dy, merge(fright, merge({ scale: fs * 0.87, fx: false }, options || {})));
    };
    var flash = function (dx, dy) {
      star4(ctx, x + R(dx * u), y + R(dy * u), big ? 4 : 2, '#fff27a', '#ffffff');
    };
    switch (id) {
      // --- v19：お客さんの突然死 ---
      case 'haircut':
        if (big) sand(16);
        F(-8, -2, { flip: false, eyes: 'surprised', mouth: 'o', scale: fs * 0.87 });
        drawCrab(ctx, x + R(18 * u), y + R(11 * u), t, { pinch: true, scale: 0.67 * u });
        flash(15, -9);
        break;
      case 'squashed':
        if (big) sand(15);
        F(6, 9, { eyes: 'x', sx: 1.3, sy: 0.35, scale: fs * 0.9 });
        drawTurtleLook(ctx, x - R(11 * u), y + R(3 * u), 0, { dir: 1, look: 1, scale: 0.9 * u });
        break;
      case 'loach':   // v23.2：まねして頭から砂にささり、尾だけ出てばたばた。となりでドジョウが顔を出す
        F(-6, 4, { dir: 1, rot: 1.5, eyes: 'x', scale: fs * 0.95 });
        sand(6); rect(ctx, x - R(34 * u), y + R(17 * u), R(68 * u), R(8 * u), SAND);
        prop(-6, 6, 1, function (ctx) { rect(ctx, -10, -1, 3, 1, SAND_D); rect(ctx, 6, -1, 3, 1, SAND_D); rect(ctx, -14, -3, 1, 1, SAND); rect(ctx, 11, -4, 1, 1, SAND); });
        drawLoach(ctx, x + R(19 * u), y + R(5 * u), t, { dir: -1, dig: 0.55, scale: 0.7 * u, still: true });
        drawMark(ctx, x - R(22 * u), y - R(16 * u), '?', t, u);
        rect(ctx, x - R(15 * u), y - R(19 * u), 1, R(3 * u), '#ffffff'); rect(ctx, x + R(3 * u), y - R(19 * u), 1, R(3 * u), '#ffffff');
        break;
      case 'catfish':
        drawCatfish(ctx, x + R(9 * u), y + R(1 * u), t, { dir: -1, open: 1, scale: 0.9 * u });
        react(-16, 4, { scale: fs * 0.69, rot: -0.14 });
        flash(-21, -11);
        break;
      case 'poison':
        F(-5, 3, { flip: false, eyes: 'dizzy', mouth: 'o', fumes: false });
        prop(21, -9, 1, function (ctx) { drawPellet(ctx, 0, 0, 'poison', t); });
        if (big) drawFumes(ctx, x + 10, y - 10, t);
        break;
      case 'frozen':
        prop(0, 1, 1, function (ctx) { drawIce(ctx, 0, 0, 18); });
        react(-1, 1, { frozen: false, scale: fs * 0.83 });
        prop(0, 1, 1, function (ctx) {
          rect(ctx, -13, 10, 2, 4, '#dfffff'); rect(ctx, -11, 8, 2, 3, '#dfffff');
          rect(ctx, 13, -8, 2, 4, '#dfffff'); rect(ctx, 11, -5, 2, 3, '#dfffff');
        });
        flash(19, -13); flash(-19, 13);
        break;
      case 'cat':
        drawAsset(ctx, 'cat', x + R(6 * u), y + R(6 * u), { scale: 0.42 * u });
        drawAsset(ctx, 'catpaw', x + R(22 * u), y + R(2 * u), { scale: 0.62 * u });
        react(-7, 7, { dir: -1, rot: -0.25 });
        flash(-22, -8);
        break;
      case 'duck':
        prop(18, 4, 0.76, function (ctx) { drawDuck(ctx, 0, 0, t); });
        react(-12, -2, { dir: -1, legs: true, legLen: 5, eyes: 'side', mouth: 'pout', scale: fs * 0.8 });
        prop(-22, 13, 1, function (ctx) {
          cardRoundRect(ctx, -5, -4, 11, 9, O);
          rect(ctx, -3, -6, 7, 2, O);
          rect(ctx, -4, -3, 9, 7, '#f4a85a');
          rect(ctx, -2, -3, 1, 7, '#fff2c9');
          rect(ctx, 2, -3, 1, 7, '#fff2c9');
        });
        break;
      case 'instant':
        if (big) { surf(-17); drawSplash(ctx, x - 6, y - 17, 0.45); drawBubble(ctx, x + 16, y - 6, 2); drawBubble(ctx, x + 20, y - 11, 1); }
        else { rect(ctx, x - 5, y - 8, 1, 1, '#ffffff'); rect(ctx, x + 4, y - 8, 1, 1, '#ffffff'); rect(ctx, x - 1, y - 9, 2, 1, '#ffffff'); }
        F(0, 2, { rot: 0.19, scale: fs * 0.93 }); break;
      case 'flower':
        F(0, big ? 4 : 2, { scale: fs * 0.93, t: t + 0.6 }); break;
      case 'burnt':
        F(big ? -8 : 0, big ? 3 : 1, { smoke: big, eyes: 'surprised', mouth: 'o' });
        if (big) { drawFlame(ctx, x + 15, y + 5, 1, t); ellipse(ctx, x - 8, y + 20, 18, 2, 'rgba(40,30,20,0.35)'); }
        else drawSmoke(ctx, x + 2, y - 4, 0.35);
        break;
      case 'shock':
        F(0, big ? 3 : 1, { flip: false, eyes: 'surprised', mouth: 'o', smoke: false });
        if (big) { drawLightning(ctx, x - 25, y - 2, t); drawLightning(ctx, x + 25, y + 2, t + 0.4); drawPellet(ctx, x + 16, y - 15, 'spark', t); }
        else { rect(ctx, x + 6, y - 9, 1, 2, '#ffe23a'); rect(ctx, x + 5, y - 7, 2, 1, '#ffe23a'); rect(ctx, x + 5, y - 6, 1, 2, '#ffe23a'); }
        break;
      case 'overpolished':
        prop(23, 1, 0.76, function (ctx) { drawBrush(ctx, 0, 0, t); });
        react(-7, 3, { white: false, shine: false, sparkle: false });
        ctx.save(); ctx.beginPath();
        ctx.rect(x - R(29 * u), y - R(19 * u), R(13 * u), R(39 * u)); ctx.clip();
        react(-7, 3, { shine: false, sparkle: false });
        ctx.restore();
        flash(-21, -12); flash(13, -12); flash(18, 13);
        if (big) drawBubble(ctx, x - 24, y + 12, 3);
        break;
      case 'bird':   // v23.2：カモメが金魚をくわえて水面の上を飛んでいく
        if (big) surf(16);
        drawFish(ctx, x - R(20 * u), y + R(8 * u), { scale: fs * 0.62, color: iconColor, eyes: 'x', rot: -1.3, dir: -1, t: 0, fx: big });
        drawAsset(ctx, 'gull', x + R(2 * u), y - R(4 * u), { scale: 1.1 * u, frame: 0 });
        flash(-24, -14);
        break;
      case 'dizzy':
        F(0, 4, { rot: -0.19, stars: false, scale: fs * 0.9 });
        prop(2, -13, 1, function (ctx) { drawStars(ctx, 0, 0, t); });
        break;
      case 'bubblegone':
        prop(-3, 0, 1, function (ctx) { drawBubble(ctx, 0, 0, 18); });
        react(-4, 3, { scale: fs * 0.78, front: true });
        prop(18, -7, 1, function (ctx) { drawPop(ctx, 0, 0, 10, 0.46); });
        break;
      case 'floataway':
        if (big) { surf(2); ellipse(ctx, x + 20, y - 18, 6, 2, '#ffffff'); ellipse(ctx, x + 16, y - 19, 4, 2, '#ffffff'); drawBird(ctx, x - 19, y - 13, t, 1); }
        F(0, -6, { rot: -0.15, scale: fs * 0.86, eyes: 'wide', mouth: 'o' });
        break;
      case 'netted':
        prop(0, -8, 0.89, function (ctx) { drawNetBack(ctx, 0, 0, { sag: 1, wet: true, t: t, handle: 17 }); });
        react(0, 5, { scale: fs * 0.84, rot: 0.14 });
        prop(0, -8, 0.89, function (ctx) { drawNetFront(ctx, 0, 0, { sag: 1, wet: true, t: t, handle: 17 }); });
        break;
      // --- 追加の突然死 ---
      case 'stuck':
        if (big) { glass(9); react(-7, 2, { stuck: false, sx: 0.76, scale: fs * 0.94 }); drawCrack(ctx, x + 13, y + 4, 0.54); drawDrop(ctx, x - 20, y - 12); for (var sl = 0; sl < 3; sl++) rect(ctx, x + 5 + sl * 3, y - 14 + sl * 2, 3, 1, '#ffffff'); }
        else { glass(11); react(-5, 1, { stuck: false, sx: 0.76 }); drawCrack(ctx, x + R(15 * u), y + 2, 0.34); }
        break;
      case 'hiccupfly':
        if (big) { surf(-17); for (var hl = 0; hl < 4; hl++) rect(ctx, x - 12 + hl * 8, y + 14 + (hl & 1) * 3, 1, 6, 'rgba(255,255,255,0.6)'); }
        F(0, big ? 4 : 3, { fx: true, scale: fs * (big ? 0.94 : 0.9) });
        break;
      case 'knotted':
        F(-3, 1, { scale: fs * 0.86 });
        if (big) { drawMark(ctx, x + 24, y - 14, '?', t, 1); drawDrop(ctx, x - 20, y - 12); }
        break;
      case 'flat':
        if (big) { ctx.fillStyle = 'rgba(220,250,255,0.25)'; ctx.fillRect(x - 34, y - 24, 68, 48); }
        F(0, 0, { scale: fs * 0.93, rot: -0.12 });
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        for (var fl = 0; fl < R(12 * u); fl++) { ctx.fillRect(x - R(16 * u) + fl, y - R(4 * u) - fl, 2, 1); ctx.fillRect(x + R(2 * u) + fl, y + R(8 * u) - fl, 1, 1); }
        break;
      case 'nowake':
        if (big) { sand(14); F(0, 6, { soul: false, flip: false, scale: fs * 0.92 }); drawSoul(ctx, x + 6, y - 12, t); }
        else { F(0, 5, { soul: false }); drawSoul(ctx, x + 2, y - 5, t, 0.4); }
        break;
      case 'jumpout': // 地震で水槽のふちを飛び越えて外の床へ
        if (big) {
          // 左：水槽（水・ガラスの壁・ふち）、右：外の床
          rect(ctx, x - 34, y - 1, 30, 26, WATER); rect(ctx, x - 34, y - 2, 30, 1, '#f4f0d8'); rect(ctx, x - 34, y - 1, 30, 1, '#3fb8ac');
          for (var jw = 0; jw < 4; jw++) rect(ctx, x - 32 + jw * 7, y - 3 - (jw & 1), 3, 1, '#ffffff');
          rect(ctx, x - 4, y - 8, 3, 33, O); rect(ctx, x - 3, y - 7, 1, 32, '#e8fcff'); rect(ctx, x - 5, y - 9, 5, 2, O);
          rect(ctx, x - 1, y + 17, 35, 1, O); rect(ctx, x - 1, y + 18, 35, 7, '#d8a070');
          for (var jf = 0; jf < 35; jf += 9) rect(ctx, x - 1 + jf, y + 20 + (jf % 2), 6, 1, '#b8804e');
          // しぶき・軌跡（水面から弧を描いて）
          drawSplash(ctx, x - 18, y - 2, 0.4);
          for (var ja = 0; ja < 7; ja++) { var aa = ja / 7; rect(ctx, x - 20 + R(aa * 24), y - 3 - R(Math.sin(aa * Math.PI * 0.6) * 15), 1, 1, '#ffffff'); }
          var jy = R(Math.sin(t * 6) * 1);
          F(11, -10 + jy, { rot: 0.35, scale: fs * 0.73, eyes: 'surprised', fx: true, sweat: false });
          drawDrop(ctx, x + 3, y - 20); drawDrop(ctx, x + 22, y - 19 + (R(t * 6) % 2));
          // 床に落ちたしずく
          ellipse(ctx, x + 20, y + 16, 7, 1, '#9fe0f0'); drawDrop(ctx, x + 14, y + 9); drawDrop(ctx, x + 25, y + 5);
          // 揺れ線（地震）
          for (var jq = 0; jq < 3; jq++) { rect(ctx, x - 33, y - 18 + jq * 4, 1, 2, O); rect(ctx, x + 32, y - 6 + jq * 4, 1, 2, O); }
        } else {
          rect(ctx, x - 11, y + 1, 9, 6, WATER); rect(ctx, x - 11, y, 9, 1, '#3fb8ac');
          rect(ctx, x - 2, y - 2, 2, 9, O); rect(ctx, x, y + 6, 10, 1, '#b8804e');
          react(9, -6, { scale: fs * 0.83, rot: 0.45 });
          rect(ctx, x - 8, y - 2, 1, 1, '#ffffff'); rect(ctx, x - 6, y - 4, 1, 1, '#ffffff'); rect(ctx, x + 9, y - 8, 1, 2, '#8ad8ff');
        }
        break;
      // --- 結末 ---
      case 'bug':
        F(0, 1, { t: 0.375, scale: fs * 0.94, mouth: 'o' }); break;
      case 'moss':
        if (big) sand(14);
        F(0, big ? 3 : 1, { moss: false, eyes: 'wide', mouth: 'o' });
        prop(-6, -7, 1, function (ctx) {
          outEllipse(ctx, -9, 0, 5, 4, '#76af44');
          outEllipse(ctx, -4, -4, 5, 4, '#91cc51');
          outEllipse(ctx, 1, -2, 4, 3, '#528831');
          outEllipse(ctx, -11, 12, 4, 3, '#76af44');
        });
        break;
      case 'stone':
        if (big) sand(14);
        F(0, 2, { eyes: 'wide', scale: fs * 0.96 });
        flash(17, -12); break;
      case 'split':
        F(0, big ? 2 : 0, { scale: fs * (big ? 0.77 : 0.67) });
        break;
      case 'skeleton':
        F(0, 0, { bones: false, skeleton: true, eyes: 'wide', t: t + 0.3 });
        if (!big) drawFly(ctx, x + 7, y - 6, 0.1);
        break;
      case 'overeat':
        if (big) { drawPellet(ctx, x - 24, y + 14, 'normal'); drawPellet(ctx, x + 24, y + 16, 'normal'); drawPellet(ctx, x + 18, y + 18, 'normal'); }
        F(0, -3, { scale: fs * 0.94, mouth: 'grin' }); break;
      case 'fishman':
        if (big) { surf(-17); drawFloatRing(ctx, x + 20, y - 19, t); }
        F(0, -2, { legLen: big ? 6 : 4, eyes: 'surprised', mouth: 'o' }); break;
      case 'oldage':
        F(0, -1, { scale: fs * 0.93, eyes: 'closed', mouth: 'smile' }); break;
      case 'dragon':
        dragonBlit(ctx, x + R(1 * u), y - R(8 * u), t, 1, 0.37 * u, -0.1, false);
        react(-10, 8, { dragon: false, scale: fs * 0.72, eyes: 'sparkle' });
        flash(23, 9);
        break;
      case 'golden':
        if (big) { sand(14); }
        F(0, 2, { scale: fs * 0.94, sparkle: false });
        flash(21, -11); flash(-17, 11);
        if (!big) { rect(ctx, x - 6, y - 7, 1, 3, '#ffffff'); rect(ctx, x - 7, y - 6, 3, 1, '#ffffff'); }
        break;
      case 'hermit':   // v23.2：砂山にもぐって目だけ出し、網をにらむ
        if (big) sand(14);
        F(-4, 5, { eyes: 'annoyed', brows: 'angry', mouth: 'pout', scale: fs * 1.05, dir: 1 });
        prop(-4, 15, 1, function (ctx) { ellipse(ctx, 0, 0, 31, 11, SAND_D); ellipse(ctx, 0, 1, 30, 10, SAND); rect(ctx, -12, -3, 2, 1, SAND_D); rect(ctx, 6, -1, 2, 1, SAND_D); rect(ctx, 16, 2, 1, 1, SAND_D); });
        prop(21, -12, 0.67, function (ctx) { drawNetMini(ctx, 0, 7, false); });
        drawMark(ctx, x - R(22 * u), y - R(12 * u), 'anger', t, u);
        break;
      case 'giant':
        F(0, 1, { eyes: 'closed', mouth: 'o', scale: fs * 1.22, rot: 0.65, dir: -1 });
        rect(ctx, x - R(24 * u), y - R(19 * u), 1, R(38 * u), '#367d72');
        rect(ctx, x + R(24 * u), y - R(19 * u), 1, R(38 * u), '#367d72');
        flash(20, -14);
        break;
      case 'cleanfreak':
        F(0, 2, { scale: fs * 0.88 });
        drawBubble(ctx, x - R(17 * u), y - R(8 * u), big ? 4 : 2);
        drawBubble(ctx, x + R(12 * u), y + R(8 * u), big ? 5 : 3);
        drawBubble(ctx, x + R(18 * u), y - R(8 * u), big ? 3 : 2);
        flash(-7, -13);
        break;
      // --- 追加：お客さんイベントの突然死 ---
      case 'abducted':
        prop(0, -5, 1, function (ctx) { drawBeam(ctx, 0, 0, 26, t, 43); });
        drawUFO(ctx, x, y - R(9 * u), t, { scale: 0.72 * u });
        react(0, 10, { scale: fs * 0.78, rot: 0.2 });
        flash(22, 0);
        break;
      case 'sushi':
        if (big) sand(16);
        prop(19, 5, 0.72, function (ctx) { drawChefHand(ctx, 0, 0, t, { knife: true, len: 29 }); });
        F(-9, 4, { fx: false, scale: fs * 0.86 });
        flash(-22, -10);
        break;
      case 'meteor': // 隕石直撃
        if (big) {
          sand(12); drawCrater(ctx, x - 2, y + 13, t);
          F(-4, 5, { meteor: false, burnt: true, eyes: 'dizzy', mouth: 'o', sx: 1.05, sy: 0.75 });
          drawMeteor(ctx, x + 18, y - 14, t, 0.75);
        } else {
          rect(ctx, x - 9, y + 4, 18, 1, '#a86a3a'); rect(ctx, x - 9, y + 5, 18, 3, SAND); rect(ctx, x - 5, y + 4, 10, 1, '#7a4a2a');
          F(-2, 3, { meteor: false, burnt: true, eyes: 'dizzy', mouth: 'o', scale: fs * 0.95 });
          drawMeteor(ctx, x + 6, y - 5, 0.3, 0.32);
        }
        break;
      case 'possessed':
        drawGhost(ctx, x + R(16 * u), y - R(5 * u), t, { scale: 0.77 * u, dir: -1 });
        react(-10, 5, { ghost: false, scale: fs * 0.9 });
        flash(-22, -9);
        break;
      case 'sucked':
        prop(2, -6, 0.85, function (ctx) { drawVacuum(ctx, 0, 0, { t: t, suck: true, top: -19 }); });
        react(2, 8, { rot: -1.13, sx: 1.04, sy: 0.87, scale: fs * 0.91 });
        if (big) drawDrop(ctx, x - 18, y + 4);
        break;
      case 'fished':
        if (big) surf(-14);
        prop(11, 3, 0.85, function (ctx) { drawHook(ctx, 0, 0, { worm: true, t: t, top: -28 }); });
        react(-2, 6, { scale: fs * 0.88, rot: -0.58 });
        if (big) drawDrop(ctx, x + 15, y + 15);
        break;
      case 'boiled': // のぼせた
        if (big) {
          ctx.fillStyle = 'rgba(255,120,80,0.25)'; ctx.fillRect(x - 34, y - 21, 68, 42);
          surf(-12); F(-4, 4);
          drawThermo(ctx, x + 26, y + 14, 0.95);
        } else { F(-3, 2, { steam: false, scale: fs * 0.9 }); prop(19, 13, 0.66, function (ctx) { drawThermo(ctx, 0, 0, 0.95); }); }
        break;
      case 'photo':
        drawPolaroid(ctx, x - R(10 * u), y + R(1 * u), { color: 'orange', stage: 2, scale: 1.18 * u });
        prop(19, 8, 0.68, function (ctx) { drawCamera(ctx, 0, 0, {}); });
        flash(19, -10);
        break;
      case 'pigeon':
        prop(-7, 19, 0.72, function (ctx) { drawTopHat(ctx, 0, 0, {}); });
        blit(ctx, CARD_WING, x + R(9 * u), y - R(9 * u), { scale: 1.2 * u });
        react(-6, 0, { dir: -1, scale: fs * 0.82, rot: -0.2 });
        blit(ctx, CARD_WING, x + R(9 * u), y + R(1 * u), { scale: 0.94 * u });
        flash(-22, -10);
        break;
      case 'star':
        if (big) rect(ctx, x - 32, y - 21, 64, 42, '#42678b');
        drawFishStar(ctx, x + R(17 * u), y - R(8 * u), t, { scale: 0.88 * u });
        react(-9, 5, { rot: -0.29, scale: fs * 0.89, eyes: 'sparkle' });
        flash(-22, -9); flash(22, 12);
        break;
      // --- 追加の結末 ---
      case 'babies': // 子だくさん
        if (big) {
          F(-5, -1, { scale: fs * 0.88, eyes: 'happy', mouth: 'grin' });
          [[16, -12, 'pink', 1], [24, -2, 'lime', -1], [14, 9, 'sky', 1], [-24, 12, 'yellow', 1], [-26, -10, 'purple', -1], [2, 16, 'orange', 1], [26, 13, 'orange', -1]].forEach(function (b, i) {
            drawBaby(ctx, x + b[0], y + b[1], t, { color: b[2], dir: b[3], phase: i * 0.9 });
          });
          drawMark(ctx, x - 22, y - 18, 'heart', t, 1);
        } else {
          F(-3, 0, { scale: fs * 0.85, sweat: false });
          drawBaby(ctx, x + 6, y - 3, 0, { color: 'pink', scale: 0.6 });
          drawBaby(ctx, x + 7, y + 3, 0.2, { color: 'sky', scale: 0.6, phase: 1 });
          drawBaby(ctx, x - 8, y + 4, 0.1, { color: 'lime', scale: 0.6, dir: -1, phase: 2 });
        }
        break;
      default:
        F(0, 0);
    }
  }

  // 上下の2行を1pxずつ段落としして角を丸める。
  function cardRoundRect(ctx, x, y, w, h, color) {
    rect(ctx, x + 2, y, w - 4, 1, color);
    rect(ctx, x + 1, y + 1, w - 2, 1, color);
    rect(ctx, x, y + 2, w, h - 4, color);
    rect(ctx, x + 1, y + h - 2, w - 2, 1, color);
    rect(ctx, x + 2, y + h - 1, w - 4, 1, color);
  }

  // info = { no: 図鑑の番号, total: 全部の数, float: 'float'|'sink'|'gone' }（なくても描ける）
  function drawCard(ctx, cause, isNew, info) {
    cause = cause || { id: '', name: '？？？', kind: 'sudden' }; info = info || {};
    iconColor = info.color || 'orange';
    var cx = 80, x = 10, y = 40, w = 140, h = 146, ending = cause.kind === 'ending';
    var band = ending ? '#226e64' : '#b63d30', bandEdge = ending ? O : FK;
    cardRoundRect(ctx, x + 2, y + 3, w, h, 'rgba(16,40,40,0.4)');
    cardRoundRect(ctx, x, y, w, h, O);
    cardRoundRect(ctx, x + 2, y + 2, w - 4, h - 4, CREAM);

    var headerY = y + 4;
    cardRoundRect(ctx, x + 5, headerY, w - 10, 17, bandEdge);
    cardRoundRect(ctx, x + 7, headerY + 2, w - 14, 13, band);
    ctx.textBaseline = 'middle'; ctx.font = 'bold 9px ' + FONT;
    ctx.textAlign = 'left'; ctx.fillStyle = CREAM;
    ctx.fillText(ending ? 'けつまつ' : 'しいん', x + 12, headerY + 9);
    if (info.no) {
      ctx.textAlign = 'right';
      ctx.fillText('No.' + (info.no < 10 ? '0' : '') + info.no + (info.total ? ' / ' + info.total : ''), x + w - (isNew ? 26 : 12), headerY + 9);
    }

    // 絵の窓は下端まで独立させ、リボンとの間にクリーム色の余白を残す。
    var bw = 126, bh = 83, bx = cx - bw / 2, by = headerY + 21;
    cardRoundRect(ctx, bx - 2, by - 2, bw + 4, bh + 4, O);
    rect(ctx, bx, by, bw, bh, WATER);
    rect(ctx, bx, by, bw, 10, '#7adcc6');
    rect(ctx, bx, by + bh - 7, bw, 7, SAND); rect(ctx, bx, by + bh - 8, bw, 1, '#a86a3a');
    for (var k = 0; k < bw - 2; k += 5) rect(ctx, bx + k + ((k / 5) & 1), by + bh - 4 + ((k / 5) % 3 === 0 ? 1 : 0), 2, 1, SAND_D);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; for (var r2 = 0; r2 < 3; r2++) ctx.fillRect(bx + 18 + r2 * 34, by + 10, 10, bh - 18);
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    if (typeof ctx.scale === 'function') { ctx.translate(cx, by + 40); ctx.scale(2, 2); drawCauseIcon(ctx, 0, 0, cause.id, 2, 0.2); }
    else drawCauseIcon(ctx, cx, by + 40, cause.id, 2, 0.2);
    iconColor = 'orange';
    ctx.restore();
    drawBubble(ctx, bx + 6, by + 6, 2); drawBubble(ctx, bx + bw - 7, by + bh - 14, 1);

    var ry = by + bh + 3, rh = 17, rx = x + 10, rw = w - 20;
    cardRoundRect(ctx, rx - 4, ry + 4, rw + 8, rh - 4, bandEdge);
    cardRoundRect(ctx, rx - 2, ry + 6, rw + 4, rh - 8, band);
    cardRoundRect(ctx, rx, ry, rw, rh, bandEdge);
    cardRoundRect(ctx, rx + 2, ry + 2, rw - 4, rh - 4, band);
    var name = cause.name || '？？？', size = 12; ctx.font = 'bold 12px ' + FONT;
    while (size > 8 && ctx.measureText(name).width > rw - 10) { size--; ctx.font = 'bold ' + size + 'px ' + FONT; }
    ctx.textAlign = 'center'; ctx.fillStyle = CREAM; ctx.fillText(name, cx, ry + 9);

    var fl = info.float || cause.float, fy = y + h - 16;
    if (fl) {
      var lab = fl === 'sink' ? '沈んだ' : fl === 'gone' ? '消えた' : fl === 'stay' ? 'とどまった' : '浮いた';
      var col = fl === 'sink' ? '#725426' : fl === 'gone' || fl === 'stay' ? '#66518e' : '#23679b';
      ctx.font = 'bold 9px ' + FONT;
      var tw = Math.ceil((ctx.measureText(lab).width + 22) / 2) * 2;
      cardRoundRect(ctx, cx - tw / 2, fy, tw, 13, O);
      cardRoundRect(ctx, cx - tw / 2 + 2, fy + 2, tw - 4, 9, '#fff4dc');
      var ax = cx - tw / 2 + 8, ay = fy + 6;
      if (fl === 'sink' || fl === 'float') {
        var d = fl === 'sink' ? 1 : -1;
        rect(ctx, ax, ay - 2, 1, 5, col);
        rect(ctx, ax - 2, ay, 5, 1, col);
        rect(ctx, ax - 1, ay + d, 3, 1, col);
      } else {
        rect(ctx, ax - 2, ay - 1, 2, 2, col);
        rect(ctx, ax + 1, ay - 2, 1, 1, col);
        rect(ctx, ax + 2, ay + 1, 1, 1, col);
      }
      ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.fillText(lab, ax + 6, fy + 7);
    }
    // NEW!（ギザギザの星）
    if (isNew) {
      var nx = x + w - 12, ny = y + 2;
      for (var i = 0; i < 16; i++) { var an = i / 16 * Math.PI * 2, rr = i & 1 ? 9 : 13; rect(ctx, R(nx + Math.cos(an) * rr) - 1, R(ny + Math.sin(an) * rr) - 1, 3, 3, O); }
      ellipse(ctx, nx, ny, 11, 11, O); ellipse(ctx, nx, ny, 10, 10, '#ffd83a');
      for (var j = 0; j < 16; j += 2) { var an2 = j / 16 * Math.PI * 2; rect(ctx, R(nx + Math.cos(an2) * 11), R(ny + Math.sin(an2) * 11), 2, 2, '#ffd83a'); }
      ctx.fillStyle = '#d83a2a'; ctx.font = 'bold 7px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('NEW', nx, ny + 0.5);
    }
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  }


  function zukanCols(n) { return n > 48 ? 7 : 6; }
  function drawZukan(ctx, discoveredIds, causes, cursor) {
    causes = causes || [];
    var has = function (id) {
      if (!discoveredIds) return false;
      if (typeof discoveredIds.has === 'function') return discoveredIds.has(id);
      return discoveredIds.indexOf(id) >= 0;
    };
    ctx.fillStyle = 'rgba(29,77,74,0.7)'; ctx.fillRect(0, 0, 160, 240);
    rect(ctx, 5, 6, 150, 228, O); rect(ctx, 4, 7, 152, 226, O);
    rect(ctx, 5, 7, 150, 226, CREAM);
    var n = 0; for (var i = 0; i < causes.length; i++) if (has(causes[i].id)) n++;
    // タイトル
    rect(ctx, 5, 7, 150, 16, '#3a9a8a'); rect(ctx, 5, 23, 150, 1, O);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillStyle = '#fff8e8'; ctx.font = 'bold 10px ' + FONT;
    ctx.fillText('ずかん  ' + n + ' / ' + (causes.length || 24), 80, 15.5);
    // v21：49種以上は横7列にして、下の説明枠（y=194〜）に重ならない高さに収める
    var COLS = causes.length > 48 ? 7 : 6;
    var nTot = Math.max(24, causes.length), rows = Math.ceil(nTot / COLS), compact = rows > 4;
    var gap = compact ? 2 : 3, gy = compact ? 27 : 30, cw = COLS === 7 ? 20 : 23, gx = COLS === 7 ? 11 : 11;
    var ch = compact ? Math.max(15, Math.floor((192 - gy - (rows - 1) * gap) / rows)) : 30;
    for (var k = 0; k < nTot; k++) {
      var c = causes[k], col = k % COLS, row = (k / COLS) | 0;
      var x = gx + col * cw, y = gy + row * (ch + gap);
      var found = c && has(c.id);
      var sel = k === cursor;
      var ending = c && c.kind === 'ending';
      rect(ctx, x + 1, y, cw - 3, ch, sel ? '#d88a10' : O); rect(ctx, x, y + 1, cw - 1, ch - 2, sel ? '#d88a10' : O);
      rect(ctx, x + 1, y + 1, cw - 3, ch - 2, found ? (ending ? '#c8eee2' : '#bfeee2') : '#e0d6c0');
      if (found) rect(ctx, x + 1, y + ch - 2, cw - 3, 1, ending ? '#3a9a8a' : '#d85a4a');
      if (sel) { rect(ctx, x + 1, y + 1, cw - 3, 1, '#ffd83a'); rect(ctx, x + 1, y + ch - 2, cw - 3, 1, '#ffd83a'); rect(ctx, x + 1, y + 1, 1, ch - 2, '#ffd83a'); rect(ctx, x + cw - 3, y + 1, 1, ch - 2, '#ffd83a'); }
      ctx.fillStyle = found ? '#3a7a74' : '#a89c84'; ctx.font = 'bold 6px ' + FONT;
      ctx.fillText(String(k + 1), x + cw / 2 - 1, y + ch - (compact ? 4 : 5));
      var iy = y + (compact ? Math.round((ch - 7) / 2) : 12);
      if (found) {
        ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 2, cw - 5, ch - (compact ? 8 : 10)); ctx.clip();
        drawCauseIcon(ctx, x + cw / 2 - 1, iy, c.id, compact ? (COLS === 7 ? 0.68 : 0.75) : 0.8);
        ctx.restore();
      } else {
        ctx.fillStyle = '#8a7e68'; ctx.font = 'bold ' + (compact ? 10 : 11) + 'px ' + FONT;
        ctx.fillText('？', x + cw / 2 - 1, iy);
      }
    }
    // 説明枠（つめた表示のときは main.js が下に自前の枠を描くので描かない）
    if (compact) { ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic'; return; }
    var by = 166;
    rect(ctx, 10, by, 140, 30, O); rect(ctx, 11, by + 1, 138, 28, '#fff4dc');
    var cc = causes[cursor];
    ctx.fillStyle = O;
    if (cc && has(cc.id)) {
      ctx.font = 'bold 7px ' + FONT; ctx.fillStyle = cc.kind === 'ending' ? '#3a9a8a' : '#d85a4a';
      ctx.fillText((cc.kind === 'ending' ? 'けつまつ' : 'しいん') + '  No.' + (cursor + 1), 80, by + 8);
      ctx.fillStyle = O; ctx.font = 'bold 11px ' + FONT;
      ctx.fillText(cc.name, 80, by + 20);
    } else {
      ctx.font = 'bold 11px ' + FONT; ctx.fillText(cursor != null && cursor >= 0 ? '？？？' : '', 80, by + 16);
    }
    if (compact) { ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic'; return; }
    // 下に金魚の飾り
    drawFish(ctx, 52, 214, { scale: 0.6, eyes: 'happy', t: 0 });
    drawBubble(ctx, 70, 206, 2); drawBubble(ctx, 76, 200, 1);
    drawFish(ctx, 112, 216, { scale: 0.5, dir: -1, t: 0.3 });
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  }


  // ====================================================================
  // ---- 水槽の仲間・おもちゃ（巻貝・カニ・小エビ・ボール・指の輪・金の粒・名札） ----
  // ====================================================================
  function hexMix(a, b, k) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var r = R(((pa >> 16) & 255) * (1 - k) + ((pb >> 16) & 255) * k), g = R(((pa >> 8) & 255) * (1 - k) + ((pb >> 8) & 255) * k), bl = R((pa & 255) * (1 - k) + (pb & 255) * k);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  // 線分 (ax,ay)-(bx,by) までの距離²
  function segD2(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, k = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
    k = k < 0 ? 0 : k > 1 ? 1 : k;
    var qx = ax + dx * k - px, qy = ay + dy * k - py; return qx * qx + qy * qy;
  }
  function gline(g, x0, y0, x1, y1, col) {
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0 || 1;
    for (var i = 0; i <= n; i++) g.set(R(x0 + (x1 - x0) * i / n), R(y0 + (y1 - y0) * i / n), col);
  }



  // ---- ビーチボール（直径9） ----
  var BALL_C = ['#ff4a4a', '#ffd83a', '#3a8aff'];
  var ballCache = [];
  function buildBall(fr) {
    if (ballCache[fr]) return ballCache[fr];
    var g = new Grid(14, 14, 7, 7), sp = fr / 8 * Math.PI * 2 / 3;
    g.stamp(function (x, y) {
      var px = x + 0.5 - 0, py = y + 0.5 - 0, r2 = px * px + py * py;
      if (r2 > 4.6 * 4.6) return null;
      if (r2 < 1.6) return '#ffffff';
      var a = Math.atan2(py, px * 1.4) + sp, k = Math.floor(((a / (Math.PI * 2)) % 1 + 1) % 1 * 6);
      var c = k & 1 ? '#ffffff' : BALL_C[(k >> 1) % 3];
      if (px + py > 4.4 && c !== '#ffffff') return hexMix(c, '#000000', 0.18);
      return c;
    }, O, [-6, -6, 6, 6]);
    g.set(-2, -3, '#ffffff'); g.set(-3, -2, '#ffffff'); g.set(-3, -3, '#ffffff');
    g.K = O; g.keep = [O];
    ballCache[fr] = g; return g;
  }
  function drawBall(ctx, x, y, t) { blit(ctx, buildBall(((Math.floor(num(t, 0) * 8) % 8) + 8) % 8), x, y); }

  // ---- 指の輪（OKサイン。上から差しこまれた手。原点 = 輪の内側の中心） ----
  var SKIN = '#f7c6a3', SKIN_D = '#e0a07a', SKIN_L = '#ffe0c8', NAIL = '#ffe8e0', SURF_Y = 22;
  var hoopCache = {};
  function buildHoop(fr) {
    if (hoopCache[fr]) return hoopCache[fr];
    var g = new Grid(64, 70, 26, 48), RI = 11, RO = 16;
    // 手のひら（輪の上）
    g.stamp(function (x, y) {
      var px = x + 0.5, py = y + 0.5;
      if (py < -46 || py > -12) return null;
      var k = Math.max(0, py + 36), hw = 7 + k * 0.32;
      var cx0 = 1 + k * 0.12;
      if (Math.abs(px - cx0) > hw) return null;
      if (py > -18 && px < -8) return null;
      if (px - cx0 > hw - 2.2) return SKIN_D;
      if (px - cx0 < -hw + 2) return SKIN_L;
      return SKIN;
    }, O, [-14, -48, 20, -10]);
    // 立てた3本の指（中指・薬指・小指）：手のひらの右から下向きに
    var FING = [[9, -30, 22, -21 + (fr ? 1 : 0), 2.2], [9, -25, 24, -13, 2.4], [9, -20, 22, -4, 2.6]];
    FING.forEach(function (f, i) {
      g.stamp(function (x, y) {
        var px = x + 0.5, py = y + 0.5, d = segD2(px, py, f[0], f[1], f[2], f[3]);
        if (d > f[4] * f[4]) return null;
        var side = (px - f[0]) * (f[3] - f[1]) - (py - f[1]) * (f[2] - f[0]);
        return side > 2 ? SKIN_D : SKIN;
      }, O, [8, -32, 32, 4]);
      var fx = f[2], fy = f[3], ux = f[2] - f[0], uy = f[3] - f[1], L = Math.sqrt(ux * ux + uy * uy); ux /= L; uy /= L;
      // つめ
      g.set(R(fx - ux * 1.2 - uy * 0.6), R(fy - uy * 1.2 + ux * 0.6), NAIL); g.set(R(fx - ux * 1.2 - uy * 0.6 - ux), R(fy - uy * 1.2 + ux * 0.6 - uy), NAIL);
      // 関節のしわ
      var mx = f[0] + (f[2] - f[0]) * 0.5, my = f[1] + (f[3] - f[1]) * 0.5;
      g.set(R(mx - uy * 1), R(my + ux * 1), SKIN_D); g.set(R(mx), R(my), SKIN_D);
    });
    // 輪（親指＋人差し指）
    g.stamp(function (x, y) {
      var px = x + 0.5, py = y + 0.5, r = Math.sqrt(px * px + py * py);
      if (r < RI || r > RO) return null;
      var m = (r - RI) / (RO - RI);
      if (py > 9 && m > 0.55) return SKIN_D;
      if (px < -9 && m < 0.35) return SKIN_D;
      if (py < -3 && m > 0.2 && m < 0.55 && px < 4) return SKIN_L;
      return py > 6 ? hexMix(SKIN, SKIN_D, 0.4) : SKIN;
    }, O, [-17, -17, 17, 17]);
    // 内側のふち（穴の縁取り）
    for (var a = 0; a < 96; a++) { var an = a / 96 * Math.PI * 2; var ix = R(Math.cos(an) * (RI - 0.5) - 0.5), iy = R(Math.sin(an) * (RI - 0.5) - 0.5); if (Math.hypot(ix + 0.5, iy + 0.5) < RI) g.set(ix, iy, O); }
    // 指先の合わせ目（下）：親指の爪と人差し指の先
    for (var yy = RI; yy <= RO; yy++) g.set(1, yy, O);
    g.set(-1, RI + 1, NAIL); g.set(-2, RI + 1, NAIL); g.set(-1, RI + 2, NAIL); g.set(-2, RI + 2, SKIN_D);
    g.set(3, RI + 1, NAIL); g.set(4, RI + 1, NAIL); g.set(3, RI + 2, SKIN_D);
    // 指の関節（輪の側）
    [[-0.9, 1], [0.15, 0], [2.4, 1], [3.2, 0]].forEach(function (k) {
      var an2 = k[0] * Math.PI / 2 + Math.PI / 2, cx2 = Math.cos(an2), cy2 = Math.sin(an2);
      for (var rr = RI + 2; rr <= RO - 1; rr++) if (rr % 2 === k[1]) g.set(R(cx2 * rr), R(cy2 * rr), SKIN_D);
    });
    // 手のひらと輪の境目
    for (var xx = -8; xx <= 10; xx++) if (!g.get(xx, -16) || g.get(xx, -16) === SKIN || g.get(xx, -16) === SKIN_L) { if (Math.abs(xx) > 4) g.set(xx, -17 + (xx > 0 ? 0 : 0), SKIN_D); }
    g.K = O; g.keep = [O, NAIL, SKIN_D];
    hoopCache[fr] = g; return g;
  }
  var tintMemo = {};
  function tintCol(c) { var v = tintMemo[c]; if (!v) v = tintMemo[c] = hexMix(c, WATER, 0.2); return v; }
  // y が水面より下の行は水色を 20% まぜて描く
  function blitTint(ctx, g, cx, cy) {
    cx = R(cx); cy = R(cy);
    for (var y = 0; y < g.h; y++) {
      var sy = cy + y - g.oy, under = sy >= SURF_Y, run = null, rs = 0, row = y * g.w;
      for (var x = 0; x <= g.w; x++) {
        var col = x < g.w ? g.c[row + x] : null;
        if (col !== run) { if (run) rect(ctx, cx + rs - g.ox, sy, x - rs, 1, under ? tintCol(run) : run); run = col; rs = x; }
      }
    }
  }
  function drawFingerHoop(ctx, x, y, t) {
    t = num(t, 0); x = R(x); y = R(y);
    var fr = (Math.floor(t * 2) & 1), g = buildHoop(fr);
    // 手首：手のひらの上端から画面上端まで
    var top = y - 46, wx0 = x - 6, ww = 15;
    blitTint(ctx, g, x, y);
    for (var yy = 0; yy <= top; yy++) {
      if (yy < 0) continue;
      var u = yy >= SURF_Y;
      rect(ctx, wx0 - 1, yy, 1, 1, O); rect(ctx, wx0 + ww, yy, 1, 1, O);
      rect(ctx, wx0, yy, 3, 1, u ? tintCol(SKIN_L) : SKIN_L);
      rect(ctx, wx0 + 3, yy, ww - 6, 1, u ? tintCol(SKIN) : SKIN);
      rect(ctx, wx0 + ww - 3, yy, 3, 1, u ? tintCol(SKIN_D) : SKIN_D);
    }
    // 水面のさざ波（手首のまわり）
    if (top < SURF_Y + 2 && y > SURF_Y) {
      var sp = (t * 6) % 6;
      for (var s = -1; s <= 1; s += 2) {
        var rx = s < 0 ? wx0 - 3 - R(sp) : wx0 + ww + 2 + R(sp);
        rect(ctx, s < 0 ? rx - 2 : rx, SURF_Y - 1, 3, 1, '#ffffff');
        rect(ctx, s < 0 ? rx - 5 - R(sp * 0.5) : rx + 4 + R(sp * 0.5), SURF_Y, 2, 1, 'rgba(255,255,255,0.7)');
      }
    }
  }

  // ---- 金の粒（ふつうの粒より大きく、キラッと光る） ----
  var GOLD_PELLET = art(['..oooo..', '.oWLLYo.', 'oWLYYYDo', 'oLYYYYDo', 'oYYYYDDo', 'oYYYDDDo', '.oDDDDo.', '..oooo..'],
    { o: '#7a4a10', W: '#ffffff', L: '#fff2a0', Y: '#ffd030', D: '#d89a18' });
  function drawGoldPellet(ctx, x, y, t) {
    t = num(t, 0); x = R(x); y = R(y);
    blit(ctx, GOLD_PELLET, x, y);
    var ph = ((t * 1.6) % 1 + 1) % 1;
    if (ph < 0.35) { // キラッ（十字の光）
      var L = ph < 0.12 ? 2 : ph < 0.24 ? 3 : 1, gx = x + 2, gy = y - 3;
      rect(ctx, gx, gy, 1, 1, '#ffffff');
      for (var k = 1; k <= L; k++) { var c = k === L ? '#fff27a' : '#ffffff'; rect(ctx, gx - k, gy, 1, 1, c); rect(ctx, gx + k, gy, 1, 1, c); rect(ctx, gx, gy - k, 1, 1, c); rect(ctx, gx, gy + k, 1, 1, c); }
    } else {
      var j = Math.floor(ph * 6) % 3;
      rect(ctx, x - 5 + j * 4, y + 3 - j * 3, 1, 1, '#fff27a');
    }
  }

  // 任意：初回生成（1〜5ms/種）をロード画面などで先に済ませる
  function prewarmFriends() {
    var f; for (f = 0; f < 4; f++) buildSnail(f, false); buildSnail(0, true);
    for (f = 0; f < 2; f++) { buildCrab(f, false, false); buildCrab(f, true, false); buildCrab(f, false, true); buildCrab(f, true, true); }
    for (f = 0; f < 4; f++) buildShrimp(f, false); buildShrimp(0, true);
    for (f = 0; f < 4; f++) {
    }
    for (f = 0; f < 8; f++) {
      for (var d = 0; d <= 6; d++) buildLoach(f, d / 6, false);
      buildBall(f);
    }
    buildHoop(0); buildHoop(1);
  }
  // ---- 名札 ----
  function drawBadge(ctx, x, y, label) {
    label = label == null ? '' : String(label);
    var f0 = ctx.font, a0 = ctx.textAlign, b0 = ctx.textBaseline;
    ctx.font = '8px sans-serif';
    var m = ctx.measureText ? ctx.measureText(label) : null, tw = Math.ceil(m && isFinite(m.width) ? m.width : label.length * 8);
    var w = Math.max(8, tw + 6), h = 11, x0 = R(num(x, 0) - w / 2), y0 = R(num(y, 0) - h / 2);
    rect(ctx, x0 + 1, y0, w - 2, 1, O); rect(ctx, x0 + 1, y0 + h - 1, w - 2, 1, O);
    rect(ctx, x0, y0 + 1, 1, h - 2, O); rect(ctx, x0 + w - 1, y0 + 1, 1, h - 2, O);
    rect(ctx, x0 + 1, y0 + 1, w - 2, h - 2, CREAM);
    rect(ctx, x0 + 1, y0 + h - 2, w - 2, 1, '#ecdcb8');
    rect(ctx, x0 + 1, y0 + h, w - 1, 1, 'rgba(29,77,74,0.35)');
    ctx.fillStyle = O; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x0 + w / 2, y0 + h / 2);
    ctx.font = f0; ctx.textAlign = a0; ctx.textBaseline = b0;
  }

  // ====================================================================
  // ---- イベント用の小物（猫の影・怪しい粒・合図の吹き出し） ----
  // ====================================================================
  // 猫の顔の上半分（耳・目・ひげ）。原点 = 顔の下端の中心（水面の高さ）

  // (x,y)=水面。耳と白目を残して引っ込む。
  function drawCatShadow(ctx, x, y, t, o) {   // v23 P5c：水面の上からのぞく黒猫（ユーザーの絵）
    o = o || {}; t = num(t, 0);
    x = R(num(x, 80)); y = R(num(y, 40));
    var bob = R(Math.sin(t * 1.7));
    drawAsset(ctx, 'cat', x, y + 10 + bob, { scale: 0.75 });
    if (o.angry && !o.flee) drawMark(ctx, x + 18, y - 30 + bob, 'anger', t, 1);
  }


  // 怪しく虹色に光る粒（約 9px＋光の輪）
  var RAINBOW = ['#ff5a6a', '#ffa23a', '#ffe24a', '#6ae06a', '#4ac8ff', '#8a7aff', '#e06aff'];
  function drawMysteryPellet(ctx, x, y, t) {
    t = num(t, 0); x = R(num(x, 0)); y = R(num(y, 0));
    var a0 = ctx.globalAlpha, ph = t * 6;
    // 光の輪（脈うつ）
    var rr = 7.5 + Math.sin(t * 5) * 1.2;
    for (var k = 0; k < 20; k++) {
      var a = k / 20 * Math.PI * 2 + t * 1.5;
      ctx.globalAlpha = a0 * 0.55;
      rect(ctx, x + R(Math.cos(a) * rr), y + R(Math.sin(a) * rr), 1, 1, RAINBOW[(k + Math.floor(ph)) % 7]);
    }
    ctx.globalAlpha = a0 * (0.3 + 0.12 * Math.sin(t * 5)); ellipse(ctx, x, y, 6.5, 6.5, '#fff6c8'); ctx.globalAlpha = a0 * 0.35; ellipse(ctx, x, y, 5.5, 5.5, RAINBOW[Math.floor(ph * 0.5) % 7]);
    ctx.globalAlpha = a0;
    // 粒本体（虹のしま模様が流れる）
    for (var yy = -4; yy <= 4; yy++) for (var xx = -4; xx <= 4; xx++) {
      var d = xx * xx + yy * yy;
      if (d > 21) continue;
      var col = d > 13 ? '#2a1a40' : RAINBOW[(((xx + yy + 16 + Math.floor(ph)) / 2) | 0) % 7];
      rect(ctx, x + xx, y + yy, 1, 1, col);
    }
    rect(ctx, x - 2, y - 2, 2, 1, '#ffffff'); rect(ctx, x - 2, y - 1, 1, 1, '#ffffff');
    // ?マークの影＋きらめき
    rect(ctx, x, y, 1, 1, '#2a1a40'); rect(ctx, x + 1, y - 1, 1, 1, '#2a1a40');
    var sp = Math.floor(t * 4) % 4, sxy = [[7, -7], [-8, -4], [6, 6], [-6, 8]][sp];
    var sc = RAINBOW[(sp * 2) % 7];
    rect(ctx, x + sxy[0], y + sxy[1] - 1, 1, 3, sc); rect(ctx, x + sxy[0] - 1, y + sxy[1], 3, 1, sc); rect(ctx, x + sxy[0], y + sxy[1], 1, 1, '#ffffff');
  }

  // イベントの合図：赤枠の吹き出しに「！」＋押すボタンのアイコン。(x,y)=吹き出しの中心（幅30）
  var ALERT_R = '#e8363a', ALERT_RL = '#ff8a7a', ALERT_Y = '#ffe44a';
  var BANG = art(['.oooo.', 'oRRRRo', 'oRrRRo', 'oRRRRo', 'oRRRRo', '.oRRo.', '.oRRo.', '.oRRo.', '..oo..', '.oooo.', 'oRRRRo', 'oRRRRo', '.oooo.'],
    { o: '#7a1014', R: ALERT_R, r: ALERT_RL });
  function drawAlert(ctx, x, y, t, icon) {
    t = num(t, 0); x = R(num(x, 0)); y = R(num(y, 0));
    var on = (Math.floor(t * 4) & 1) === 0;
    var bob = R(-Math.abs(Math.sin(t * Math.PI * 2)) * 3);
    y += bob;
    var w = 30, h = 34, x0 = x - 15, y0 = y - 17;
    var fr = on ? ALERT_R : '#b81e24', inner = on ? CREAM : '#fff0d0';
    // 影
    ctx.fillStyle = 'rgba(29,77,74,0.35)'; ctx.fillRect(x0 + 2, y0 + 3, w, h);
    // 枠（角丸）＋しっぽ
    rect(ctx, x0 + 2, y0, w - 4, h, fr); rect(ctx, x0, y0 + 2, w, h - 4, fr); rect(ctx, x0 + 1, y0 + 1, w - 2, h - 2, fr);
    rect(ctx, x0 + 3, y0 + 2, w - 6, h - 4, inner); rect(ctx, x0 + 2, y0 + 3, w - 4, h - 6, inner);
    for (var k = 0; k < 5; k++) rect(ctx, x - 3 + k, y0 + h + k, 7 - 2 * k > 0 ? 7 - 2 * k : 1, 1, fr);
    rect(ctx, x - 2, y0 + h - 2, 5, 1, inner); rect(ctx, x - 1, y0 + h - 1, 3, 1, inner);
    rect(ctx, x0 + 3, y0 + 2, w - 6, 1, '#ffffff');
    // 「！」
    blit(ctx, BANG, x, y0 + 9);
    // 仕切り
    rect(ctx, x0 + 5, y0 + 17, w - 10, 1, on ? ALERT_RL : '#e8c0b0');
    // ボタンのアイコン
    if (ICONS[icon]) blit(ctx, ICONS[icon], x, y0 + 25);
    // 点滅の光
    if (on) {
      rect(ctx, x0 - 3, y0 + 4, 2, 1, ALERT_Y); rect(ctx, x0 - 4, y0 + 8, 2, 1, ALERT_Y); rect(ctx, x0 - 3, y0 + 12, 2, 1, ALERT_Y);
      rect(ctx, x0 + w + 1, y0 + 4, 2, 1, ALERT_Y); rect(ctx, x0 + w + 2, y0 + 8, 2, 1, ALERT_Y); rect(ctx, x0 + w + 1, y0 + 12, 2, 1, ALERT_Y);
    }
  }

  // ====================================================================
  // ---- 追加の死因6種（宇宙人・寿司・隕石・おばけ・悟り・子だくさん）の魚の形と小物 ----
  // ====================================================================
  function dflt(v, d) { return v == null ? d : v; }
  // 新しい死因フラグの既定値をまとめて入れる（個別 opts が優先）
  function newCauseOpts(o) {
    var a = {};
    if (o.meteor) {
      a.burnt = true; a.eyes = dflt(o.eyes, 'dizzy'); a.mouth = dflt(o.mouth, 'wavy'); a.stars = dflt(o.stars, true); a.smoke = dflt(o.smoke, true); a.wag = dflt(o.wag, 0);
      a.sx = (o.sx == null ? 1 : (+o.sx || 1)) * 1.3; a.sy = (o.sy == null ? 1 : (+o.sy || 1)) * 0.55;
    }
    if (o.sushi) { a.eyes = dflt(o.eyes, 'x'); a.wag = dflt(o.wag, 0); a.mouth = dflt(o.mouth, 0); }
    if (o.ghost) { a.eyes = dflt(o.eyes, 'sleepy'); a.mouth = dflt(o.mouth, 'wavy'); a.brows = dflt(o.brows, 'worried'); }
    if (o.zen) { a.eyes = dflt(o.eyes, 'calm'); a.mouth = dflt(o.mouth, 'smile'); a.wag = dflt(o.wag, 0.3); if (o.front == null && o.turn == null) a.front = true; }
    if (o.mom) { a.eyes = dflt(o.eyes, 'closed'); a.mouth = dflt(o.mouth, 'smile'); a.sweat = dflt(o.sweat, true); a.blush = dflt(o.blush, true); }
    return merge(o, a);
  }
  // 悟り：体色をほんのり金色に寄せたパレット
  var zenMemo = {};
  function zenPal(c) {
    if (zenMemo[c]) return zenMemo[c];
    var b = c === 'orange' ? PAL.normal : PAL[c], k = (c === 'sky' || c === 'purple' || c === 'lime') ? 0.16 : 0.38;
    return (zenMemo[c] = { B: hexMix(b.B, '#ffdc5a', k), D: hexMix(b.D, '#d89a20', k), L: hexMix(b.L, '#fff6c0', k + 0.1), P: hexMix(b.P, '#fff0a8', 0.4), F: hexMix(b.F, '#ffe070', k), W: '#fffaf0', K: O });
  }
  // 中身の外周（空きに接する所）を輪郭にする
  function reoutline(G, K) {
    var c0 = G.c.slice(), W = G.w, N = c0.length;
    for (var i = 0; i < N; i++) {
      var c = c0[i]; if (!c || c === K) continue;
      var x = i % W;
      if (x === 0 || !c0[i - 1] || x === W - 1 || !c0[i + 1] || i < W || !c0[i - W] || i + W >= N || !c0[i + W]) G.c[i] = K;
    }
  }

  // ---- おばけ：下半分が煙になって尾のように巻く。三角の天冠・うらめしやの手 ----
  var GH_W = '#eef8fd', GH_S = '#d0e4f0';
  function ghostify(g, o, S, isFront, frame) {
    var K = PAL.ghost.K, ph = frame / 8 * Math.PI * 2;
    var G = new Grid(g.w + 8, g.h + 20, g.ox + 4, g.oy + 4);
    G.K = K; G.keep = g.keep; G.keepSep = g.keepSep;
    var ry = S.ry, cutF, ctrl, r0;
    if (isFront) {
      var bw = ry * 1.12;
      cutF = function (x) { return ry * 0.28 + Math.sin(x * 0.8 + ph) * 1.1; };
      ctrl = [[0, ry * 0.1], [Math.sin(ph) * 1.2, ry * 0.8], [3, ry + 5], [8, ry + 8], [12, ry + 6], [12, ry + 2]];
      r0 = bw * 0.82;
    } else {
      cutF = function (x) { return ry * 0.26 + Math.max(0, x - S.cx) * 0.8 + Math.sin(x * 0.7 + ph) * 1.1; };
      ctrl = [[S.cx + 1, ry * 0.1], [S.tb + 4, ry * 0.42 + 1], [S.tb - 4, ry * 0.5 + 2 + Math.sin(ph)], [S.tb - 11, ry * 0.25], [S.tb - 13, -3], [S.tb - 10, -6]];
      r0 = ry * 0.78;
    }
    var pts = pathSamples(ctrl, 1), bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    pts.forEach(function (q) {
      q.y += Math.sin(q.f * 9 - ph) * 1.1 * q.f;
      q.r = Math.max(0.9, r0 * Math.pow(1 - q.f, 1.05));
      bx0 = Math.min(bx0, q.x - q.r); bx1 = Math.max(bx1, q.x + q.r); by0 = Math.min(by0, q.y - q.r); by1 = Math.max(by1, q.y + q.r);
    });
    G.stamp(function (x, y) {
      var px = x + 0.5, py = y + 0.5;
      for (var i = 0; i < pts.length; i++) { var q = pts[i], dx = px - q.x, dy = py - q.y; if (dx * dx + dy * dy <= q.r * q.r) return (dy > q.r * 0.3 || (i > pts.length * 0.5 && dy > -q.r * 0.2)) ? GH_S : GH_W; }
      return null;
    }, K, [bx0 - 1, by0 - 1, bx1 + 1, by1 + 1]);
    // 体（尾びれと下半分を消して煙に重ねる）
    var W = g.w;
    for (var j = 0; j < g.h; j++) for (var i = 0; i < W; i++) {
      var c = g.c[j * W + i]; if (!c) continue;
      var lx = i - g.ox, ly = j - g.oy;
      if (!isFront && lx < S.tb - 1) continue;
      if (ly > cutF(lx)) continue;
      G.set(lx, ly, c);
    }
    reoutline(G, K);
    var E = isFront ? { ex1: 0, ex2: 0 } : eyeCenters(S, o);
    // 三角の天冠
    var tx = isFront ? 0 : R((E.ex1 + E.ex2) / 2), ty = -G.oy;
    while (ty < 0 && !G.get(tx, ty)) ty++;
    var base = ty + 1;
    G.stamp(function (x, y) {
      var d = base - y; if (d < 0 || d > 5) return null;
      return Math.abs(x + 0.5 - (tx + 0.5)) <= (5 - d) * 0.75 + 0.4 ? (d === 0 ? '#e4ecf2' : '#ffffff') : null;
    }, K, [tx - 6, base - 7, tx + 6, base + 1]);
    // うらめしやの手（手首から先がだらんと垂れる）
    var my = R(ry * 0.16) + 1;
    var hands = isFront ? [[-R(bw * 0.62), my + 3, -R(bw * 0.3), my + 4, GH_S], [R(bw * 0.62), my + 3, R(bw * 0.3), my + 4, GH_S]]
      : [[S.cx + S.rx * 0.35 - 3, my + 6, E.front - 1, my + 5, GH_S], [S.cx + S.rx * 0.35, my + 4, E.front + 2, my + 3, GH_W]];
    hands.forEach(function (h) {
      var ax0 = h[0], ay0 = h[1], ax1 = h[2], ay1 = h[3], col = h[4];
      G.stamp(function (x, y) {
        var px = x + 0.5, py = y + 0.5;
        if (!isFront && segDist2(px, py, ax0, ay0, ax1, ay1) <= 1.2) return col;
        var hx = px - (ax1 + 0.5), hy = py - (ay1 + 1.5);
        if (hx * hx / 3.4 + hy * hy / 3.2 <= 1) return col;
        if (py > ay1 + 2.5 && py < ay1 + 5 && (x === R(ax1) - 1 || x === R(ax1) + 1)) return col;
        return null;
      }, K, [Math.min(ax0, ax1) - 3, Math.min(ay0, ay1) - 3, Math.max(ax0, ax1) + 3, ay1 + 7]);
    });
    G._bb = null;
    return G;
  }
  // 人魂（青白い炎）
  var HITO = [
    art(['..o..', '.oBo.', 'oBLBo', 'oLWLo', 'oLWLo', '.oLo.', '..o..'], { o: '#3a7ad8', B: '#6ac8ff', L: '#bfefff', W: '#ffffff' }),
    art(['...o.', '..oBo', '.oBLo', 'oLWLo', 'oLWLo', '.oLo.', '..o..'], { o: '#3a7ad8', B: '#6ac8ff', L: '#bfefff', W: '#ffffff' })
  ];
  function drawHitodamaAt(ctx, x, y, t, s) {
    var a0 = ctx.globalAlpha, fr = Math.floor(t * 6) & 1;
    ctx.globalAlpha = a0 * 0.3; ellipse(ctx, R(x), R(y + 1), 4 * s, 4 * s, '#9adcff');
    ctx.globalAlpha = a0 * 0.9; blit(ctx, HITO[fr], x, y, s !== 1 ? { scale: s } : null);
    ctx.globalAlpha = a0;
  }
  function drawHitodama(ctx, x, y, o, sc, S, t, info) {
    var s = sc >= 1.4 ? 2 : 1;
    for (var k = 0; k < 2; k++) {
      var an = t * 1.4 + k * Math.PI;
      drawHitodamaAt(ctx, x + R(Math.cos(an) * 26 * sc), y - R((6 + Math.sin(an) * 6) * sc), t + k * 0.3, s);
    }
  }

  // ---- 寿司：魚がシャリの上に乗ったにぎり（目は×、わさび少々） ----
  var RICE = '#fdfdf6', RICE_G = '#e2e0ce', RICE_S = '#d8d4c0';
  function sushify(g, o, S) {
    var K = g.K || O;
    var x0 = S.tb - 1, x1 = S.cx + S.rx - 2, xc = (x0 + x1) / 2, rx = (x1 - x0) / 2 + 1;
    var top = R(S.ry * 0.3), ryr = 6.5, yc = top + ryr;
    var G = new Grid(g.w, g.h + 12, g.ox, g.oy);
    G.K = K; G.keep = g.keep; G.keepSep = g.keepSep;
    var inR = function (x, y) { var ax = Math.abs(x + 0.5 - xc) / rx, ay = Math.abs(y + 0.5 - yc) / ryr; return Math.pow(ax, 2.6) + Math.pow(ay, 2.2) <= 1; };
    G.stamp(function (x, y) {
      if (!inR(x, y)) return null;
      if (!inR(x, y + 2)) return RICE_S;
      var h = hash((x + 40) >> 1, y + (((x + 40) >> 1) & 1) * 7);
      if (h > 0.72 && ((x + y) & 1)) return RICE_G;
      return RICE;
    }, O, [x0 - 4, top - 2, x1 + 4, yc + ryr + 2]);
    var cut = top + 3, W = g.w, mark = {};
    for (var j = 0; j < g.h; j++) for (var i = 0; i < W; i++) {
      var c = g.c[j * W + i]; if (!c) continue;
      var lx = i - g.ox, ly = j - g.oy;
      if (ly > cut && inR(lx, ly)) continue;
      G.set(lx, ly, c); mark[lx + ',' + ly] = 1;
    }
    // 魚の下端（シャリに乗る所）に輪郭
    for (var k in mark) {
      var xy = k.split(','), X = +xy[0], Y = +xy[1];
      if (!mark[X + ',' + (Y + 1)] && inR(X, Y + 1) && G.get(X, Y) !== K) G.set(X, Y, K);
    }
    // わさび
    var wx = R(S.cx - 1);
    [[0, 1, '#8cd03a'], [1, 1, '#a6e05a'], [2, 1, '#8cd03a'], [3, 1, '#8cd03a'], [-1, 1, '#6ab02a'], [0, 2, '#6ab02a'], [1, 2, '#6ab02a'], [2, 2, '#6ab02a']].forEach(function (q) { G.set(wx + q[0], cut + q[1], q[2]); });
    G._bb = null;
    return G;
  }

  // ---- 隕石：たんこぶ（ぺしゃんこにした後の格子に足す） ----
  function addBump(g0, S, isFront, offx, qx) {
    var g = new Grid(g0.w, g0.h + 8, g0.ox, g0.oy + 8);
    for (var i = 0; i < g0.c.length; i++) if (g0.c[i]) g.c[i + 8 * g0.w] = g0.c[i];
    g.K = g0.K; g.keep = g0.keep; g.keepSep = g0.keepSep;
    var hx = isFront ? 1 : R(offx + (S.cx + S.rx * 0.2 - offx) * qx);
    var ty = -g.oy; while (ty < g.h - g.oy && !g.get(hx, ty)) ty++;
    var K = g.K, cy = ty + 1;
    g.stamp(function (x, y) {
      var dx = x + 0.5 - (hx + 0.5), dy = y + 0.5 - cy;
      if (dy > 0.5 || dx * dx / 16 + dy * dy / 20 > 1) return null;
      return (dx < 0 && dy < -1.5 && dx > -2.6) ? '#e8a090' : (dy < -2 ? '#c8645a' : '#a8443e');
    }, K, [hx - 6, cy - 7, hx + 6, cy + 1]);
    g.set(hx - 1, cy - 3, '#ffffff');
    g._bb = null;
    return g;
  }

  // ---- 悟り：光背（後光）と蓮の花 ----
  function ringPx(ctx, cx, cy, r, w, col, edge) {
    var ro = r + w, n = Math.ceil(ro) + 1;
    for (var dy = -n; dy <= n; dy++) for (var dx = -n; dx <= n; dx++) {
      var d = Math.sqrt((dx + 0.5) * (dx + 0.5) + (dy + 0.5) * (dy + 0.5));
      if (d < r || d > ro) continue;
      rect(ctx, cx + dx, cy + dy, 1, 1, (d > ro - 0.8 || d < r + 0.6) ? edge : col);
    }
  }
  var lotusG = null;
  function petal(g, bx, by, tx, ty, w, cols) {
    var vx = tx - bx, vy = ty - by, L = Math.sqrt(vx * vx + vy * vy), ux = vx / L, uy = vy / L;
    g.stamp(function (x, y) {
      var px = x + 0.5 - bx, py = y + 0.5 - by, u = (px * ux + py * uy) / L, v = -px * uy + py * ux;
      if (u < 0 || u > 1) return null;
      var hw = w * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.75) * (1 - u * 0.25);
      if (Math.abs(v) > hw) return null;
      if (u > 0.55 && Math.abs(v) < hw * 0.45) return cols[0];
      return u < 0.25 ? cols[2] : cols[1];
    }, cols[3], [Math.min(bx, tx) - w - 2, Math.min(by, ty) - w - 2, Math.max(bx, tx) + w + 2, Math.max(by, ty) + w + 2]);
  }
  function buildLotus() {
    if (lotusG) return lotusG;
    var C = ['#ffd8ec', '#ff9ac8', '#e8649e', '#a8306a'];
    var back = new Grid(56, 30, 28, 20), front = new Grid(56, 30, 28, 20);
    back.K = front.K = C[3]; back.keep = front.keep = [];
    // 葉（下の丸い台）
    back.stamp(function (x, y) { var dx = (x + 0.5) / 23, dy = (y + 0.5 - 7) / 3.2; if (dx * dx + dy * dy > 1) return null; return dy < -0.3 ? '#7ccc5a' : '#4aa040'; }, '#24602a', [-25, 2, 25, 12]);
    [[-15, -7, 5], [15, -7, 5], [-8, -12, 5.2], [8, -12, 5.2], [0, -14, 5.5]].forEach(function (q) { petal(back, q[0] * 0.3, 5, q[0], q[1], q[2], C); });
    [[-21, -1, 4.6], [21, -1, 4.6], [-12, -4, 5], [12, -4, 5], [0, -5, 5]].forEach(function (q) { petal(front, q[0] * 0.35, 6, q[0], q[1], q[2], C); });
    lotusG = [back, front];
    return lotusG;
  }
  function zenSpot(x, y, o, sc, S, info) {
    var H = headPos(x, y, o, sc, S, info), front = info.front;
    return { hx: front ? x : H.headX - H.dir * R(2 * sc), hy: y - R((front ? S.ry * 0.38 : S.ry * 0.32) * sc), ly: y + R((S.ry + (front ? 0 : 1)) * sc * (info.fy || 1)), ls: sc * (front ? 1 : 1.2), front: front };
  }
  function drawZenBack(ctx, x, y, o, sc, S, t, info) {
    x = R(x); y = R(y);
    var Z = zenSpot(x, y, o, sc, S, info), a0 = ctx.globalAlpha, rr = (Z.front ? 16 : 14) * sc;
    if (o.fx !== false) {
      ctx.globalAlpha = a0 * (0.2 + 0.06 * Math.sin(t * 2.5));
      ellipse(ctx, x, y, (Z.front ? 21 : 32) * sc, 19 * sc, '#fff2a0');
      ctx.globalAlpha = a0 * 0.5;
      for (var k = 0; k < 16; k++) {
        var an = k / 16 * Math.PI * 2 + t * 0.4, L = rr * ((k & 1) ? 1.3 : 1.55);
        for (var d = rr + 2; d < L; d += 1) rect(ctx, Z.hx + R(Math.cos(an) * d), Z.hy + R(Math.sin(an) * d), 1, 1, '#ffe88a');
      }
    }
    ctx.globalAlpha = a0 * 0.45; ellipse(ctx, Z.hx, Z.hy, rr, rr, '#fff4c0');
    ctx.globalAlpha = a0;
    ringPx(ctx, Z.hx, Z.hy, rr - 1.5 * Math.max(1, sc), 1.8 * Math.max(1, sc), '#ffd84a', '#c8962a');
    var L2 = buildLotus();
    blit(ctx, L2[0], x, Z.ly, Z.ls !== 1 ? { scale: Z.ls } : null);
  }
  function drawZenFront(ctx, x, y, o, sc, S, t, info) {
    x = R(x); y = R(y);
    var Z = zenSpot(x, y, o, sc, S, info);
    blit(ctx, buildLotus()[1], x, Z.ly, Z.ls !== 1 ? { scale: Z.ls } : null);
  }

  // ---- 子だくさん：ちびの稚魚（幅約10px） ----
  var babyCache = {};
  function buildBaby(col, fr) { // 稚魚：まんまるの体・大きな目2つ・赤いくちびる・二股の尾（v15 の小型版）
    var key = col + fr; if (babyCache[key]) return babyCache[key];
    var p = col === 'orange' ? PAL.normal : PAL[col], wv = fr ? 0.7 : -0.3;
    var g = new Grid(16, 13, 8, 6);
    g.stamp(function (x, y) {
      var px = x + 0.5, py = y + 0.5, bx = (px - 1) / 3.3, by = py / 3.1;
      if (bx * bx + by * by <= 1) return py > 1.4 ? p.P : p.B;
      var tx = px + 3.2, t1 = py + 1.3 - wv, t2 = py - 1.3 - wv;
      if (px < -1.6 && px > -5.6 && (Math.abs(t1) < 1.2 || Math.abs(t2) < 1.2)) return p.F;
      return null;
    }, FK, [-7, -5, 6, 5]);
    g.set(3, -2, '#ffffff'); g.set(4, -2, '#ffffff'); g.set(4, -1, PUPIL); g.set(3, -1, '#ffffff');
    g.set(0, -1, '#ffffff'); g.set(1, -1, PUPIL);
    g.set(3, 1, LIP); g.set(4, 1, LIP); g.set(4, 2, FK);
    g.K = FK; g.keep = [PUPIL];
    return (babyCache[key] = g);
  }

  // o: { color, dir, scale, phase }
  function drawBaby(ctx, x, y, t, o) {
    o = o && typeof o === 'object' ? o : {};
    t = num(t, 0);
    var col = COLORS[o.color] ? o.color : 'orange', ph = num(o.phase, 0);
    var fr = Math.floor(t * 6 + ph * 3) & 1, s = num(o.scale, 1) || 1;
    var hop = -R(Math.abs(Math.sin(t * 5 + ph)) * 2 * Math.min(1, s));
    var bo = { mirror: num(o.dir, 1) < 0 };
    if (s < 0.8) { // 図鑑など小さいときは専用の極小ドット
      var tk = 'tiny' + col; if (!babyCache[tk]) { var pp = col === 'orange' ? PAL.normal : PAL[col]; babyCache[tk] = art(['.oooo.', 'oFBBko', 'oFBPBo', '.oooo.'], { o: O, F: pp.F, B: pp.B, P: pp.P, k: PUPIL }); }
      blit(ctx, babyCache[tk], num(x, 0), num(y, 0), bo); return;
    }
    if (s !== 1) bo.scale = s;
    blit(ctx, buildBaby(col, fr), num(x, 0), num(y, 0) + hop, bo);
  }

  // ---- 宇宙人にさらわれた：UFO と光の柱 ----
  var ufoCache = {};
  function buildUFO(fr) {
    if (ufoCache[fr]) return ufoCache[fr];
    var g = new Grid(56, 32, 28, 20);
    var HL = '#f1e9ff', HB = '#bbb0cb', HD = '#82748f', HDD = '#62546d';
    friendOval(g, 0, -6, 11.4, 7.3, '#41d9ba');
    g.line([[-7, -10], [-5, -12], [-2, -12]], '#dcfff2');
    g.line([[0, -12], [0, -17]], O);
    friendOval(g, 0, -17, 1.8, 1.8, '#ffdd32');
    // 円盤
    g.stamp(function (x, y) {
      var dx = (x + 0.5) / 22, dy = (y + 0.5) / 4.6; if (dx * dx + dy * dy > 1) return null;
      var py = y + 0.5;
      if (py < -2) return (x < -6 && x > -16) ? HL : HB;
      if (py > 2.2) return HDD;
      if (py > 0.8) return HD;
      return HB;
    }, O, [-24, -6, 24, 6]);
    g.line([[-12, -3], [-11, -3], [-10, -3], [-9, -3]], '#ffffff');
    // 回るライト
    var LC = [['#fff04f', '#f5ba26'], ['#fff04f', '#f5ba26'], ['#fff04f', '#f5ba26']];
    [-18, -12, -6, 0, 6, 12, 18].forEach(function (lx, i) {
      var on = ((i + fr) % 3) === 0, c = LC[i % 3];
      g.set(lx - 1, 0, on ? c[0] : c[1]); g.set(lx, 0, on ? c[0] : c[1]); g.set(lx - 1, 1, on ? c[0] : c[1]); g.set(lx, 1, on ? '#ffffff' : c[1]);
    });
    popEye(g, -4, -6, 3.5, 1); popEye(g, 4, -6, 3.5, 1);
    // 下の光る出口
    g.stamp(function (x, y) { var dx = (x + 0.5) / 6, dy = (y + 0.5 - 5) / 1.6; return dx * dx + dy * dy <= 1 ? (fr & 1 ? '#eaffb0' : '#d0ff8a') : null; }, O, [-7, 3, 7, 7]);
    g.K = O; g.keep = ['#111111'];
    return (ufoCache[fr] = g);
  }
  // (x,y)=円盤の中心（幅約44）。o: { scale, rot }
  function drawUFO(ctx, x, y, t, o) {
    o = o && typeof o === 'object' ? o : {};
    t = num(t, 0);
    var fr = ((Math.floor(t * 8) % 6) + 6) % 6, s = num(o.scale, 1) || 1, bob = R(Math.sin(t * 3) * 1 * Math.min(1, s));
    var bo = {}; if (s !== 1) bo.scale = s; if (num(o.rot, 0)) bo.rot = num(o.rot, 0);
    blit(ctx, buildUFO(fr), num(x, 0), num(y, 0) + bob, bo);
  }
  // UFO の下から真下へ伸びる光の柱。(x,y)=上端の中心、len=長さ、w=下端の幅（既定26）
  function drawBeam(ctx, x, y, len, t, w) {
    t = num(t, 0); x = R(num(x, 0)); y = R(num(y, 0)); len = Math.max(1, R(num(len, 60))); w = Math.max(4, num(w, 26));
    var fl = 0.04 * Math.sin(t * 9);
    for (var yy = 0; yy < len; yy++) {
      var k = yy / len, hw = R((w * 0.5 + w * 0.5 * k) / 2);
      ctx.fillStyle = 'rgba(13,200,152,' + (0.6 + fl).toFixed(3) + ')'; ctx.fillRect(x - hw, y + yy, hw * 2 + 1, 1);
      ctx.fillStyle = 'rgba(207,255,221,0.63)'; ctx.fillRect(x - R(hw * 0.4), y + yy, R(hw * 0.8) + 1, 1);
      ctx.fillStyle = 'rgba(41,225,170,0.75)'; ctx.fillRect(x - hw, y + yy, 1, 1); ctx.fillRect(x + hw, y + yy, 1, 1);
    }
    for (var i = 0; i < 3; i++) { // 上へのぼる光の輪
      var ph = (t * 0.7 + i / 3) % 1, ry = R(len * (1 - ph)), hw2 = R((w * 0.5 + w * 0.5 * (ry / len)) / 2);
      ctx.fillStyle = 'rgba(231,255,232,' + (0.55 * (1 - ph * 0.6)).toFixed(2) + ')';
      for (var xx = -hw2; xx <= hw2; xx += 2) ctx.fillRect(x + xx, y + ry, 1, 1);
    }
    for (var j = 0; j < 6; j++) { var pp = (t * 0.5 + j / 6) % 1, kx = (hash(j, 3) - 0.5) * w * 0.7; rect(ctx, x + R(kx * (0.5 + pp * 0.5)), y + R(len * (1 - pp)), 1, 1, (j & 1) ? '#ffffff' : '#f0ffb0'); }
  }

  // ---- 板前の手（上から差しこまれる。白い袖、o.knife で包丁） ----
  var SKIN = '#f8d2aa', SKIN_D = '#e2aa80', SKIN_L = '#ffe6cc';
  var handCache = {};
  function buildChefHand(knife) {
    var key = knife ? 1 : 0; if (handCache[key]) return handCache[key];
    var g = new Grid(64, 26, 46, 12);
    if (knife) {
      // 包丁（柳刃）…刃は左へ
      var BL = '#e4eaf0', BLL = '#ffffff', BLE = '#a8b4c0';
      g.stamp(function (x, y) {
        var px = x + 0.5, py = y + 0.5;
        if (px <= -7 && px >= -40) {
          var tip = px < -34 ? (px + 40) / 6 : 1;            // 切っ先へ細る
          if (py >= -2 + (1 - tip) * 3 && py <= 2.6) return py > 1.6 ? BLE : py < -0.8 ? BLL : BL;
        }
        if (px > -7 && px <= -5 && py >= -2.5 && py <= 2.5) return '#4a3a30';      // 口金
        if (px > -5 && px <= 10 && py >= -2 && py <= 2) return py < -0.8 ? '#e0b070' : py > 1 ? '#8a5a2a' : '#c89050'; // 柄
        return null;
      }, O, [-42, -5, 12, 5]);
      // 握りこぶし
      g.stamp(function (x, y) {
        var dx = (x + 0.5 - 1.5) / 5.8, dy = (y + 0.5 + 0.5) / 5.2;
        if (dx * dx + dy * dy > 1) return null;
        return (y + 0.5 > 2.5) ? SKIN_D : (dx < -0.3 && dy < -0.3 ? SKIN_L : SKIN);
      }, O, [-6, -8, 9, 6]);
      [-2, 1, 4].forEach(function (fx) { g.set(fx, 1, SKIN_D); g.set(fx, 2, O); });
      g.set(-3, -2, O); g.set(-3, -1, O); g.set(-3, 0, SKIN_D);   // 親指
    } else {
      // ひらいた手（指先は下）
      g.stamp(function (x, y) {
        var px = x + 0.5, py = y + 0.5, dx = px / 5.4, dy = (py + 2) / 4.4;
        if (dx * dx + dy * dy <= 1) return dy > 0.5 ? SKIN_D : SKIN;
        var fs2 = [[-3.6, 6], [-1.2, 7.2], [1.2, 7], [3.6, 5.8]];
        for (var i = 0; i < 4; i++) if (segDist2(px, py, fs2[i][0], 0, fs2[i][0], fs2[i][1]) <= 0.9) return py > fs2[i][1] - 1 ? SKIN_L : SKIN;
        if (segDist2(px, py, 4.5, -2, 7.5, 2.5) <= 1.1) return SKIN;  // 親指
        return null;
      }, O, [-7, -8, 9, 9]);
    }
    g.K = O; g.keep = [];
    return (handCache[key] = g);
  }
  // (x,y)=手の中心。袖は上（y - len）までのびる。o: { knife, dir(刃の向き 既定 -1=左), len, scale }
  function chefFace() {
    return v16('chefFace', 28, 24, function (g) {
      friendOval(g, 0, 0, 9.4, 8.2, '#ffc28c');
      g.stamp(function (x, y) {
        if (y >= -1 || y < -10 || Math.abs(x + 0.5) > (y < -7 ? 8 : 10)) return null;
        return y >= -5 ? '#e6e0ee' : '#fffaf2';
      }, O, [-12, -11, 12, 0]);
      popEye(g, -4, 0, 3.4, 1); popEye(g, 4, 0, 3.4, 1);
      friendMouth(g, 0, 5, 3.1, 1.4);
    });
  }
  function drawChefHand(ctx, x, y, t, o) {
    o = o && typeof o === 'object' ? o : {};
    t = num(t, 0); x = R(num(x, 0)); y = R(num(y, 0) + Math.sin(t * 4) * 1);
    var s = num(o.scale, 1) || 1, dir = num(o.dir, -1) > 0 ? 1 : -1;
    var len = Math.max(10, num(o.len, y + 4)), sw = Math.max(5, R(14 * s)), top = y - R(len), bot = y - R(5 * s);
    var x0 = x - (sw >> 1) + (o.knife ? R(1 * s) * -dir : 0);
    // 袖（白い割烹着）
    rect(ctx, x0 - 1, top, sw + 2, bot - top + 1, O);
    rect(ctx, x0, top, sw, bot - top, '#ffffff');
    rect(ctx, x0 + sw - Math.max(1, R(3 * s)), top, Math.max(1, R(3 * s)), bot - top, '#dfe6ee');
    for (var fy = bot - R(4 * s); fy > top; fy -= Math.max(3, R(7 * s))) rect(ctx, x0 + 1, fy, Math.max(1, R(sw * 0.4)), 1, '#e6ecf2');
    rect(ctx, x0, bot - Math.max(1, R(2 * s)), sw, Math.max(1, R(2 * s)), '#cfd8e2');
    var bo = { mirror: dir > 0 }; if (s !== 1) bo.scale = s;
    if (len >= 28) blit(ctx, chefFace(), x + R(3 * s) * -dir, y - R(20 * s), bo);
    blit(ctx, buildChefHand(!!o.knife), x, y, bo);
    if (o.knife) { // 刃のきらり
      var gp = ((t * 0.8) % 1 + 1) % 1, gx = x + dir * R((8 + gp * 28) * s);
      if (gp < 0.8) { rect(ctx, gx, y - R(1 * s), 1, 1, '#ffffff'); rect(ctx, gx - dir, y - R(1 * s), 1, 1, '#ffffff'); }
    }
  }

  // ---- 隕石と砂のくぼみ ----
  function drawMeteor(ctx, x, y, t, size) {
    t = num(t, 0); size = num(size, 1) || 1;
    var r = 5.5 * size, fr = Math.floor(t * 10);
    for (var i = 12; i >= 0; i--) {
      var k = i / 12, d = r * (0.4 + k * 4.4);
      var cx = x + d * 0.74, cy = y - d * 0.67;
      var rr = Math.max(0.7, r * (1 - k * 0.83) * (0.8 + hash(i, fr) * 0.32));
      disc(ctx, cx, cy, rr + size, '#ff4927');
      disc(ctx, cx, cy, rr * 0.66, '#ffdd28');
    }
    disc(ctx, x, y, r + 1, O);
    disc(ctx, x, y, r, '#b8a1b9');
    disc(ctx, x - r * 0.38, y - r * 0.2, r * 0.26, '#775467');
    disc(ctx, x + r * 0.35, y + r * 0.15, r * 0.29, '#775467');
    disc(ctx, x - r * 0.1, y + r * 0.55, r * 0.2, '#775467');
  }
  // (x,y)=くぼみの中心（砂の表面の高さ）
  function drawCrater(ctx, x, y, t) {
    t = num(t, 0); x = R(num(x, 0)); y = R(num(y, 0));
    ellipse(ctx, x, y, 22, 6, O);
    ellipse(ctx, x, y, 21, 5, SAND_D);
    ellipse(ctx, x, y - 1, 20, 4, '#ffd8a0');
    ellipse(ctx, x, y, 16, 3.4, '#a86a3a');
    ellipse(ctx, x, y + 1, 12, 2.4, '#7a4a2a');
    ellipse(ctx, x, y + 1, 7, 1.4, '#3a2820');
    [[-24, -1], [-21, 2], [23, 0], [26, -2], [-27, 3]].forEach(function (q, i) { rect(ctx, x + q[0], y + q[1], i & 1 ? 1 : 2, 1, i & 1 ? '#a86a3a' : SAND_D); });
    var fr = Math.floor(t * 8);
    for (var e = 0; e < 3; e++) if (hash(e, fr) > 0.4) rect(ctx, x + R((hash(e + 5, fr) - 0.5) * 16), y + R(hash(fr, e) * 2), 1, 1, e & 1 ? '#ffd040' : '#ff6a20');
    rect(ctx, x - 15, y - 6, 3, 2, '#ffd8a0');
    rect(ctx, x + 17, y - 7, 2, 2, '#ffd8a0');
  }

  // ---- 水槽に入ってくる大きめのおばけ（幅約30px）。o.angry で怒り顔 ----
  function buildGhost(angry, fr) {
    return v16('ghost:' + angry + fr, 44, 50, function (g) {
      g.stamp(function (x, y) {
        var ax = Math.abs(x + 0.5), py = y + 0.5;
        var head = pE(x, y, 0, -8, 10.5, 11);
        var handY = angry ? -5 : 1;
        var arms = pSeg(x, y, x < 0 ? -7 : 7, 1, x < 0 ? -14 : 14, handY, 3);
        var hem = 16 + R(Math.cos(x * 0.62 + fr * Math.PI / 2) * 2);
        if (head || arms || (py >= -9 && py <= hem && ax < 10 + Math.max(0, py) * 0.19))
          return py > 8 || (x > 7 && y > 0) ? '#e6d9bf' : '#fff7df';
        return null;
      }, O, [-19, -21, 19, 20]);
      popEye(g, -5, -7, 4, 1); popEye(g, 5, -7, 4, 1);
      if (angry) {
        g.line([[-9, -12], [-2, -8]], O);
        g.line([[9, -12], [2, -8]], O);
      }
      friendMouth(g, 0, 0, 3.1, angry ? 2.5 : 1.5);
    });
  }
  // (x,y)=頭の中心あたり。o: { angry, scale, dir }
  function drawGhost(ctx, x, y, t, o) {
    o = o && typeof o === 'object' ? o : {};
    t = num(t, 0); x = num(x, 0); y = num(y, 0);
    var fr = ((Math.floor(t * 5) % 4) + 4) % 4, s = num(o.scale, 1) || 1;
    var px = x + R(Math.sin(t * 1.3) * 2 * s), py = y + R(Math.sin(t * 2.4) * 2 * s);
    var a0 = ctx.globalAlpha, bo = { mirror: num(o.dir, 1) < 0 }; if (s !== 1) bo.scale = s;
    ctx.globalAlpha = a0 * 0.94; blit(ctx, buildGhost(!!o.angry, fr), px, py, bo);
    ctx.globalAlpha = a0;
    if (o.angry) drawMark(ctx, R(px + 13 * s), R(py - 18 * s), 'anger', t, s);
    drawHitodamaAt(ctx, px + R(Math.cos(t * 1.6) * 20 * s), py + R((Math.sin(t * 1.6) * 5 - 10) * s), t, s >= 1.4 ? 2 : 1);
  }

  // ================= v19：遊びにくる生き物（カメ・クラゲ・タコ） =================
  function outEllipse(ctx, x, y, rx, ry, col, k) { ellipse(ctx, x, y, rx + 1, ry + 1, k || O); ellipse(ctx, x, y, rx, ry, col); }
  // ================= v22：ポップなお客さん（金魚と同じ流儀：こげ茶 1px の輪郭・大きな白目と黒目のひかり・ほっぺ・明るい色） =================
  // すべて右向きで設計し、dir<0 は左右反転。Grid で作って形ごとにキャッシュする。
  var PK = FK, POP_BL = '#ff8aa0';
  function pE(x, y, cx, cy, rx, ry) { var a = (x + 0.5 - cx) / rx, b = (y + 0.5 - cy) / ry; return a * a + b * b <= 1; }
  function pSeg(x, y, x0, y0, x1, y1, r) {
    var px = x + 0.5, py = y + 0.5, dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L2));
    var qx = x0 + dx * t - px, qy = y0 + dy * t - py; return qx * qx + qy * qy <= r * r;
  }
  function pBox(cx, cy, rx, ry) { return [cx - rx - 2, cy - ry - 2, cx + rx + 2, cy + ry + 2]; }
  // 目：白目（輪郭）＋黒目2×2＋ひかり。look=-1..1 で黒目が左右へ。closed で にっこり目
  function popEye(g, cx, cy, r, look, closed) {
    if (closed) { g.set(cx - 2, cy, PK); g.set(cx - 1, cy - 1, PK); g.set(cx, cy - 1, PK); g.set(cx + 1, cy, PK); return; }
    g.stamp(function (x, y) { return pE(x, y, cx, cy, r, r) ? '#ffffff' : null; }, PK, pBox(cx, cy, r, r));
    var lx = R(cx - 1 + (look || 0)), ly = R(cy - 0.5);
    g.set(lx, ly, PK); g.set(lx + 1, ly, PK); g.set(lx, ly + 1, PK); g.set(lx + 1, ly + 1, PK); g.set(lx, ly, '#ffffff');
  }
  function popBlush(g, x, y) { g.set(x, y, POP_BL); g.set(x + 1, y, POP_BL); }
  // 3色ぬり（下は影・左上はハイライト）
  function shade3(x, y, cx, cy, ry, base, dark, light) { var py = y + 0.5 - cy; return py > ry * 0.38 ? dark : (py < -ry * 0.45 && x + 0.5 < cx) ? light : base; }
  var popCache = {}, popN = 0;
  function popGet(key, build) { if (popCache[key]) return popCache[key]; if (popN > 400) { popCache = {}; popN = 0; } popN++; return (popCache[key] = build()); }

  var FRIEND_CREAM = '#ffe2ab', FRIEND_RED = '#ff5033';
  function friendOval(g, x, y, rx, ry, color, outline) {
    g.stamp(function (px, py) { return pE(px, py, x, y, rx, ry) ? color : null; },
      outline === false ? false : PK, pBox(x, y, rx, ry));
  }  function friendMouth(g, x, y, width, height) {
    friendOval(g, x, y, width + 1, height + 1, PK);
    friendOval(g, x, y, width, height, FRIEND_RED, false);
  }



  // ---- 巻貝（原点＝殻と足の中心、右へ進む設計） ----
  function buildSnail(fr, hide) {
    return popGet('sn' + fr + hide, function () {
      var g = new Grid(36, 32, 17, 19), sway = fr === 1 ? 1 : fr === 3 ? -1 : 0;
      g.stamp(function (x, y) {
        if (pE(x, y, 1, 4, hide ? 11 : 13, 3.3) ||
            (!hide && pE(x, y, 9, 1, 5, 5))) return y >= 5 ? '#e5b87e' : FRIEND_CREAM;
        return null;
      }, PK, [-13, -6, 16, 9]);
      if (!hide) {
        g.stamp(function (x, y) {
          return pSeg(x, y, 7, 1, 7 + sway, -9, 1.4) ||
            pSeg(x, y, 12, 1, 13 + sway, -9, 1.4) ? FRIEND_CREAM : null;
        }, PK, [4, -12, 17, 4]);
      }
      g.stamp(function (x, y) {
        if (!pE(x, y, -3, -4, 9.5, 9.5)) return null;
        if (!pE(x, y, -3, -4, 8.6, 8.6)) return PK;
        return y > 0 ? '#e97110' : '#ff9615';
      }, PK, pBox(-3, -4, 10, 10));
      g.line([[-8,0],[-7,1],[-6,2],[-5,2],[-4,2],[-3,2],[-2,1],[-1,1],
        [0,0],[1,-1],[1,-2],[1,-3],[0,-4],[-1,-5],[-2,-5],[-3,-5],
        [-4,-4],[-4,-3],[-4,-2],[-3,-2],[-2,-2],[-2,-3]], PK);
      if (hide) {
        popEye(g, 4, 2, 2.3, 1);
        popEye(g, 9, 2, 2.3, 1);
      } else {
        popEye(g, 6 + sway, -10, 3.1, 1);
        popEye(g, 13 + sway, -10, 3.1, 1);
        friendMouth(g, 10, 0, 2.4, 1.1);
      }
      return g;
    });
  }
  function drawSnail(ctx, x, y, t, o) {
    o = o && typeof o === 'object' ? o : {};
    var fr = Math.floor(num(t, 0) * 4) & 3, hide = !!o.surprised;
    // v23: タニシ（ユーザーの絵 8コマ：0-3 歩く・4 びっくり・5 すくめる・6 こもる・7 顔を出す）
    if (drawAsset(ctx, 'tanishi_sheet', x, y + 7, { frame: hide ? 6 : fr, rot: num(o.rot, 0), scale: o.scale || 1 })) {
      if (hide && (Math.floor(num(t, 0) * 3) & 1)) drawDrop(ctx, R(x) + 9, R(y) - 12);
      return;
    }
    blit(ctx, buildSnail(hide ? 0 : fr, hide), x, y, { rot: num(o.rot, 0), scale: o.scale || 1 });
    if (hide && (Math.floor(num(t, 0) * 3) & 1)) drawDrop(ctx, R(x) + 9, R(y) - 10);
  }

  // ---- カニ（足先は y+5 付近） ----
  function buildCrab(fr, pinch, angry) {
    return popGet('cr' + fr + pinch + angry, function () {
      var g = new Grid(60, 34, 30, 26), red = '#ff5039', dark = '#d63927';
      for (var side = -1; side <= 1; side += 2) {
        for (var i = 0; i < 3; i++) {
          var tip = side * (11 + i * 4), foot = 4 - ((i + fr) & 1);
          g.stamp(function (x, y) {
            return pSeg(x, y, side * (7 + i * 3), -4 - i, tip, foot, 1.6) ? dark : null;
          }, PK, pBox(tip, 0, 8, 9));
        }
        var cx = side * 20, cy = angry ? -17 : pinch ? -15 : -12 - ((fr + (side > 0)) & 1);
        g.stamp(function (x, y) {
          return pSeg(x, y, side * 11, -5, cx, cy + 2, 2.2) ? dark : null;
        }, PK, pBox(side * 16, -10, 9, 10));
        g.stamp(function (x, y) {
          var dx = (x + 0.5 - cx) * side, dy = y + 0.5 - cy;
          if (!pE(x, y, cx, cy, 6.3, 5.5)) return null;
          if (!pinch && dx < 1 && Math.abs(dy + 1) < 1.2 - dx * 0.43) return null;
          return dy > 2 ? dark : red;
        }, PK, pBox(cx, cy, 7, 6));
        if (pinch) gline(g, cx - side * 5, cy - 1, cx, cy, PK);
      }
      g.stamp(function (x, y) {
        if (!pE(x, y, 0, -6, 15.8, 9.5)) return null;
        if (!pE(x, y, 0, -6, 14.9, 8.6)) return PK;
        return y >= -4 && Math.abs(x + 0.5) < 12 - Math.max(0, y - 1) ? FRIEND_CREAM :
          y >= -3 ? dark : red;
      }, PK, [-17, -17, 17, 5]);
      popEye(g, -6, -16, 4.1, 0);
      popEye(g, 6, -16, 4.1, 0);
      if (angry) {
        gline(g, -10, -19, -3, -15, PK);
        gline(g, -9, -19, -3, -16, PK);
        gline(g, 9, -19, 2, -15, PK);
        gline(g, 8, -19, 2, -16, PK);
      }
      friendMouth(g, 0, -8, 3.7, 1.5);
      return g;
    });
  }
  function drawCrab(ctx, x, y, t, o) {
    o = o && typeof o === 'object' ? o : {};
    t = num(t, 0);
    var fr = Math.floor(t * 8) & 1, sc = o.scale == null ? 1 : +o.scale || 1;
    blit(ctx, buildCrab(fr, !!o.pinch, !!o.angry), x, y, sc !== 1 ? { scale: sc } : null);
    if (o.angry && (Math.floor(t * 4) & 1)) drawMark(ctx, R(x) + R(16 * sc), R(y) - R(24 * sc), 'anger', 0, 1);
  }

  // ---- エビ（体の中心。jump は尾をお腹の下に巻く） ----
  function buildShrimp(fr, jump) {
    return popGet('sh' + fr + jump, function () {
      var g = new Grid(48, 34, 24, 17), orange = '#ff7231', dark = '#df4821';
      var points = jump ? [[8,-4],[4,-5],[0,-4],[-4,-1],[-5,3],[-3,7],[1,9]] :
        [[10,-2],[6,-3],[2,-3],[-2,-2],[-6,-1],[-9,1],[-12,2 + (fr & 1)]];
      for (var i = 1; i < 5; i++) {
        var q = points[i], step = ((i + fr) & 1) ? 1 : -1;
        gline(g, q[0], q[1] + 2, q[0] + 2, q[1] + 4, PK);
        gline(g, q[0] + 2, q[1] + 4, q[0] + 2 + step, q[1] + 6, PK);
      }
      var tail = points[6], tx = tail[0], ty = tail[1], fan = jump ? 1 : -1;
      g.stamp(function (x, y) {
        return pSeg(x, y, tx, ty, tx + fan * 4, ty - 2, 1.7) ||
          pSeg(x, y, tx, ty, tx + fan * 3, ty + 3, 1.7) ? orange : null;
      }, PK, pBox(tx, ty, 6, 5));
      gline(g, tx, ty, tx + fan * 4, ty, PK);
      g.stamp(function (x, y) {
        for (var j = 0; j < points.length; j++) {
          var q = points[j], r = 4.8 - j * 0.43;
          if (pE(x, y, q[0], q[1], r, r * 0.9)) {
            return j & 1 ? FRIEND_CREAM : y > q[1] + 1 ? dark : orange;
          }
        }
        return null;
      }, PK, [-18, -12, 17, 13]);
      var hx = points[0][0], hy = points[0][1], flick = fr & 1;
      gline(g, hx + 3, hy - 1, hx + 5, hy - 7, PK);
      gline(g, hx + 5, hy - 7, hx + 9, hy - 10 + flick, PK);
      gline(g, hx + 9, hy - 10 + flick, hx + 13, hy - 10 + flick, PK);
      gline(g, hx + 3, hy, hx + 8, hy - 5, PK);
      gline(g, hx + 8, hy - 5, hx + 12, hy - 6 - flick, PK);
      popEye(g, hx - 2, hy - 4, 3.0, 1);
      popEye(g, hx + 4, hy - 3, 3.2, 1);
      friendMouth(g, hx + 3, hy + 2, 2.1, 1);
      return g;
    });
  }
  function drawShrimp(ctx, x, y, t, o) {
    o = o && typeof o === 'object' ? o : {};
    var fr = Math.floor(num(t, 0) * 8) & 3;
    blit(ctx, buildShrimp(o.jump ? 0 : fr, !!o.jump), x, y, { mirror: num(o.dir, 1) < 0, scale: o.scale || 1 });
  }

  // ---- アヒルのおもちゃ（ぷかぷか。原点＝体の中心） ----
  function buildDuckToy() {
    var g = new Grid(36, 30, 17, 16), Y = '#ffd83a', D = '#f0a818', Lc = '#fff6a8';
    g.stamp(function (x, y) { return pE(x, y, 0, 4, 12, 7.5) || pE(x, y, -10, -1, 4, 4) ? shade3(x, y, 0, 4, 7.5, Y, D, Lc) : null; }, PK, [-16, -6, 14, 13]);
    g.stamp(function (x, y) { return pE(x, y, 4, -6, 6.5, 6) ? shade3(x, y, 4, -6, 6, Y, D, Lc) : null; }, PK, [-4, -14, 12, 2]);
    g.stamp(function (x, y) { return pE(x, y, 12, -4, 4.5, 2.3) ? (y + 0.5 > -4 ? '#e86a20' : '#ff9a3a') : null; }, PK, [6, -8, 18, 0]);
    for (var i = 9; i <= 15; i++) g.set(i, -4, '#c04a10');
    popEye(g, 4, -8, 3.5, 1); popEye(g, 9, -8, 2.9, 1); popBlush(g, 4, -4);
    g.stamp(function (x, y) { return pE(x, y, -1, 4, 5, 3) ? (y + 0.5 > 4 ? '#f0a818' : '#ffe060') : null; }, PK, [-7, 0, 5, 8]);   // はね
    g.set(-6, 1, '#ffffff'); g.set(-5, 0, '#ffffff'); g.set(1, -10, '#ffffff'); g.set(2, -11, '#ffffff');
    return g;
  }


  function drawTurtle(ctx, x, y, t, o) {   // v23 P5c：ユーザーの絵のミドリガメ（泳ぐ4コマ）
    o = o || {};
    var f = o.still ? 0 : Math.floor(num(t, 0) * 5) & 3;
    drawAsset(ctx, 'turtle', x, y, { dir: o.dir < 0 ? -1 : 1, scale: o.scale || 1, frame: f, sy: o.hide ? 1 - 0.15 * o.hide : 1 });
  }


  // v23 P5：カメが頭をこちら（画面の前）に向けて、じっと見る。o.look 0..1（0=横顔、1=正面）、o.blink
  function drawTurtleLook(ctx, x, y, t, o) {
    o = o || {}; var d = o.dir < 0 ? -1 : 1, sc = o.scale || 1;
    drawAsset(ctx, 'turtle', x, y, { dir: d, scale: sc, frame: 0 });
    if (!(o.look > 0.5)) return;
    var hx = R(x + d * 14 * sc), hy = R(y - 10 * sc), k = sc * 1.15;
    var E = function (dx, dy, rx, ry, c) { ellipse(ctx, hx + R(dx * k), hy + R(dy * k), Math.max(1, R(rx * k)), Math.max(1, R(ry * k)), c); };
    var Q = function (dx, dy, w, h, c) { rect(ctx, hx + R(dx * k), hy + R(dy * k), Math.max(1, R(w * k)), Math.max(1, R(h * k)), c); };
    E(0, 0, 10, 8, '#2a1408'); E(0, 0, 9, 7, '#cce43c'); E(0, 3, 8, 4, '#b4d030'); E(-2, -4, 4, 2, '#e4f48c');
    Q(-10, 1, 2, 3, '#fc4830'); Q(8, 1, 2, 3, '#fc4830');   // 赤い耳
    if (o.blink) { Q(-6, -1, 5, 1, '#2a1408'); Q(2, -1, 5, 1, '#2a1408'); }
    else {
      E(-4, -1, 3.5, 3.5, '#2a1408'); E(4, -1, 3.5, 3.5, '#2a1408'); E(-4, -1, 2.5, 2.5, '#ffffff'); E(4, -1, 2.5, 2.5, '#ffffff');
      Q(-5, -1, 2, 2, '#2a1408'); Q(4, -1, 2, 2, '#2a1408');   // 黒目はまっすぐ正面
      Q(-6, -3, 5, 1, '#2a1408'); Q(2, -3, 5, 1, '#2a1408');   // 半目（じとっ）
    }
    Q(-2, 4, 4, 1, '#2a1408');   // 口はまっすぐ
  }

  // v23 P5：ボタンの絵（参考画像13の上の段）。32x28 の水色の札に、金魚と道具。kind = feed / clean / touch / net
  function drawButtonIcon(ctx, kind) {   // v23 P5c：道具だけの絵（えさ・ブラシ・指・網）。32x28
    var B = FK, yel = '#ffc83a';
    var ex = function (x, y) { rect(ctx, x, y, 1, 3, yel); rect(ctx, x + 3, y - 1, 1, 4, yel); rect(ctx, x + 6, y, 1, 3, yel); };
    if (kind === 'feed') {   // えさ皿と粒
      [[9, 13], [16, 13], [23, 13], [12, 8], [19, 8]].forEach(function (p) { ellipse(ctx, p[0], p[1], 3, 3, B); ellipse(ctx, p[0], p[1], 2, 2, '#9a5a24'); rect(ctx, p[0] - 1, p[1] - 2, 1, 1, '#d8925a'); });
      rect(ctx, 4, 16, 24, 9, B); rect(ctx, 5, 26, 22, 1, B); rect(ctx, 5, 17, 22, 7, '#fff0c8'); rect(ctx, 5, 21, 22, 3, '#e8c88a'); rect(ctx, 6, 18, 6, 1, '#ffffff');
      ex(22, 4);
    } else if (kind === 'clean') {   // ブラシ
      for (var n = 0; n < 10; n++) { rect(ctx, 2 + n, 1 + n, 4, 1, B); rect(ctx, 3 + n, 1 + n, 2, 1, '#c8803a'); }
      rect(ctx, 9, 9, 16, 16, B); rect(ctx, 10, 10, 14, 14, '#fff4d8'); rect(ctx, 10, 10, 14, 4, '#a85a2a');
      for (var m = 0; m < 4; m++) rect(ctx, 12 + m * 3, 15, 1, 8, '#e0c890');
      rect(ctx, 26, 3, 1, 5, yel); rect(ctx, 24, 5, 5, 1, yel); rect(ctx, 28, 11, 1, 3, yel); rect(ctx, 27, 12, 3, 1, yel);
    } else if (kind === 'touch') {   // 指さし
      rect(ctx, 11, 0, 10, 19, B); rect(ctx, 12, 0, 8, 19, '#ffd2b0'); rect(ctx, 18, 0, 2, 19, '#e8a888');   // 人さし指（上から）
      rect(ctx, 12, 19, 8, 2, B); rect(ctx, 13, 21, 6, 1, B); rect(ctx, 12, 18, 8, 1, '#ffd2b0'); rect(ctx, 13, 19, 6, 2, '#ffd2b0');
      rect(ctx, 13, 14, 6, 4, '#fff0e4'); rect(ctx, 13, 14, 6, 1, '#e8a888');   // つめ
      ex(4, 22); ex(22, 22);
    } else if (kind === 'net') {   // 網
      for (var q = 0; q < 12; q++) { rect(ctx, 16 + q, 16 + q * 0.9, 3, 2, B); rect(ctx, 17 + q, 16 + q * 0.9, 1, 1, '#d89a4a'); }
      ellipse(ctx, 11, 11, 10, 10, '#2a4a8a'); ellipse(ctx, 11, 11, 8, 8, '#e8fbff');
      for (var m2 = -6; m2 <= 6; m2 += 3) { rect(ctx, 11 + m2, 4, 1, 15, '#9fd8e8'); rect(ctx, 4, 11 + m2, 15, 1, '#9fd8e8'); }
      ex(23, 3);
    }
  }


  // 甲羅ぼしの岩山。岩の頂点を top に合わせる。
  function buildBaskRock(top) {
    return popGet('bask:' + top, function () {
      var g = new Grid(42, Math.max(224, top + 16) - Math.min(179, top), 21, -Math.min(179, top));
      var rocks = [[0, 213, 18, 9], [-8, 201, 12, 8], [7, 199, 12, 8],
        [-2, 187, 13, 8], [3, top + 6, 11, 5]];
      for (var i = 0; i < rocks.length; i++) {
        var r = rocks[i];
        g.stamp(function (x, y) {
          var dx = x + 0.5 - r[0], dy = y + 0.5 - r[1];
          if (Math.abs(dy) >= r[3] || Math.abs(dx) > r[2] - Math.abs(dy) * 0.72) return null;
          return dy > 1 || dx > r[2] * 0.52 ? '#8f7c78' : '#bbaba6';
        }, PK, pBox(r[0], r[1], r[2], r[3]));
      }
      return g;
    });
  }
  function drawBaskRock(ctx, x, top, lamp, t) {
    x = R(x); top = R(top);
    blit(ctx, buildBaskRock(top), x, 0);
    if (!lamp) return;
    var ly = top - 40;
    rect(ctx, x + 2, ly - 6, 3, 6, PK);
    rect(ctx, x - 2, ly - 1, 11, 2, PK);
    rect(ctx, x - 5, ly + 1, 17, 5, PK);
    rect(ctx, x - 2, ly + 1, 11, 2, '#4f4b53');
    rect(ctx, x - 3, ly + 4, 13, 2, '#ffcc48');
    rect(ctx, x, ly + 6, 7, 1, '#ffcc48');
    var ray = (Math.floor(num(t, 0) * 3) & 1) ? '#ffe189' : '#ffcc48';
    rect(ctx, x + 3, ly + 9, 2, 6, ray);
    rect(ctx, x - 3, ly + 9, 2, 2, ray);
    rect(ctx, x - 5, ly + 11, 2, 3, ray);
    rect(ctx, x + 9, ly + 9, 2, 2, ray);
    rect(ctx, x + 11, ly + 11, 2, 3, ray);
  }

  // ---- ドジョウ（原点＝体の中心、砂に入る境界は y+4） ----
  function buildLoach(fr, dig, happy) {
    return popGet('lo' + fr + ':' + dig + ':' + happy, function () {
      var g = new Grid(64, 55, 32, 22), phase = fr * Math.PI / 4;
      var tuck = R(14 * dig * dig), length = 44 - tuck;
      var spine = [];
      for (var i = 0; i <= length; i++) {
        var u = i / length;
        var wave = Math.sin(phase - u * 5) * (0.8 + u * 2.4);
        var dive = dig * (24 * (1 - u) * (1 - u) - 15 * u) + Math.max(0, dig - 0.66) * 44;
        spine[i] = R(wave + dive);
      }
      var ty = spine[length], tx = -24 + tuck;
      friendOval(g, tx, ty, 3.6, 4.3, '#eab474');
      gline(g, tx - 2, ty - 1, tx + 1, ty, '#895636');
      gline(g, tx - 2, ty + 2, tx + 1, ty + 1, '#895636');
      friendOval(g, -2, spine[24] - 3, 4.6, 3.0, '#eab474');
      friendOval(g, 7, spine[15] + 4, 3.3, 2.3, '#eab474');
      g.stamp(function (x, y) {
        var i = Math.max(0, Math.min(length, 22 - x));
        var dy = y + 0.5 - spine[i], r = 4.4 - i * 0.045;
        if (Math.abs(dy) > r || x < -22 + tuck || x > 24 || (x > 22 && Math.abs(dy) > 2.8)) return null;
        if (dy > 0.4) return FRIEND_CREAM;
        var spot = (x + 24) % 9;
        return (spot < 3 && dy < -0.5 && dy > -3.5) || (spot === 5 && dy < -1.5) ? '#875437' : '#cc8a55';
      }, PK, [-24, -18, 25, 26]);
      var hy = spine[1];
      if (hy < 7) {
        for (var w = 0; w < 3; w++) {
          gline(g, 22, hy + 2, 26 + w, hy + 2 + w, PK);
          gline(g, 26 + w, hy + 2 + w, 28 + w, hy + 4 + w * 2, PK);
        }
        popEye(g, 14, hy - 4, 3.3, 1);
        popEye(g, 21, hy - 4, 3.6, 1);
        friendMouth(g, 21, hy + 2, 2.8, 1.2);
        if (happy) g.line([[14,hy+2],[15,hy+2],[16,hy+2]], '#ff906c');
      }
      if (dig) {
        // 砂煙の出る x=0 付近に、底砂までつながる盛り上がりを描く。
        g.stamp(function (x, y) {
          var surface = 4 + Math.floor(Math.abs(x + 1) / 3) + ((x & 3) === 0 ? 1 : 0);
          if (y < surface || y > 11) return null;
          return y === surface ? '#b47b44' : '#f5c783';
        }, false, [-18, 4, 17, 11]);
        g.line([[-10,8],[-4,6],[1,9],[5,7],[9,9]], '#b47b44');
        if (dig < 0.9) g.line([[-8,-1],[-4,-3],[2,0]], '#eab474');
      }
      return g;
    });
  }
  function drawLoach(ctx, x, y, t, o) {
    o = o || {};
    var fr = Math.floor(num(t, 0) * 10) & 7;
    var dig = Math.round(Math.max(0, Math.min(1, +o.dig || 0)) * 6) / 6;
    if (!dig && drawAsset(ctx, 'loach_fish', x, y + (o.still ? 0 : (fr >> 2) & 1), { dir: o.dir < 0 ? -1 : 1, scale: o.scale || 1 })) return;
    blit(ctx, buildLoach(o.still ? 0 : fr, dig, !!o.happy), x, y,
      { mirror: o.dir < 0, scale: o.scale || 1 });
  }


  function drawCatfish(ctx, x, y, t, o) {   // v23 P5c：ユーザーの絵のナマズ（8コマ：0-1 ふつう、2-5 口があく、6-7 とじる）
    o = o || {};
    var op = Math.max(0, Math.min(1, +o.open || 0));
    var f = op > 0.05 ? 2 + Math.min(3, Math.floor(op * 4)) : (o.belly ? 6 : (Math.floor(num(t, 0) * 3) & 1));
    drawAsset(ctx, 'catfish', x, y + (o.belly ? 1 : 0), { dir: o.dir < 0 ? -1 : 1, scale: +o.scale || 1, frame: f, sy: o.belly ? 1.08 : 1 });
  }


  // ================= v23：水槽のかざり（図鑑3つごとに1段、最大16段） =================
  var DECOR_MAX = 16;
  var decorCache = Object.create(null);
  function decorSprite(key, build) {
    return decorCache[key] || (decorCache[key] = build());
  }
  // 1px 広げた形を Grid の輪郭つきで描き、その上に本体を重ねる。
  function decorShape(g, fill) {
    g.stamp(function (x, y) {
      return fill(x, y) || fill(x - 1, y) || fill(x + 1, y) ||
        fill(x, y - 1) || fill(x, y + 1) ? PK : null;
    }, PK);
    g.stamp(fill, false);
  }
  function decorBox(g, x, y, w, h, color) {
    for (var dy = 0; dy < h; dy++) for (var dx = 0; dx < w; dx++) g.set(x + dx, y + dy, color);
  }
  function decorEyes(g, y) {
    decorBox(g, -5, y, 4, 3, '#fff8e8');
    decorBox(g, 1, y, 4, 3, '#fff8e8');
    decorBox(g, -3, y + 1, 1, 2, PK);
    decorBox(g, 3, y + 1, 1, 2, PK);
    g.set(0, y + 4, PK);
  }
  function dShell() {
    return decorSprite('shell', function () {
      var g = new Grid(24, 16, 12, 12);
      decorShape(g, function (x, y) {
        if (y > 0 || !pE(x, y, 0, -1, 9, 8)) return null;
        return y >= -2 || (y <= -6 && (x === -4 || x === 3)) ? '#e66c9c' : '#ffacd0';
      });
      decorEyes(g, -5);
      return g;
    });
  }
  function dStar() {
    return decorSprite('star', function () {
      var g = new Grid(26, 24, 13, 13);
      decorShape(g, function (x, y) {
        var px = x + 0.5, py = y + 1.5, angle = Math.atan2(py, px);
        var tip = 5 + 4 * Math.cos((angle + Math.PI / 2) * 2.5) ** 2;
        if (px * px + py * py > tip * tip) return null;
        return y >= 1 && Math.abs(x + 0.5) > 2 ? '#e77b28' : '#ffb748';
      });
      decorEyes(g, -3);
      return g;
    });
  }
  var decorPebbles = [
    [47, '#ff919e', '#d95c72'], [64, '#8ad4ff', '#459fce'],
    [84, '#ffe06a', '#deaa3c'], [104, '#bd9bff', '#9068d7'],
    [120, '#8ae0a0', '#4eaf72'], [73, '#fff0d8', '#ccb395'],
    [29, '#ffb67a', '#db824b']
  ];
  function dPebble(color, dark) {
    return decorSprite(color, function () {
      var g = new Grid(12, 10, 6, 6);
      decorShape(g, function (x, y) {
        return pE(x, y, 0, 0, 3.5, 2.5) ? (y >= 1 ? dark : color) : null;
      });
      return g;
    });
  }
  function dCoral(pink, frame) {
    return decorSprite('coral' + pink + frame, function () {
      var g = new Grid(30, 34, 15, 31);
      var branches = [[0, 0, 0, -25], [0, -5, -7, -13], [-7, -13, -9, -21],
        [0, -9, 7, -16], [7, -16, 9 + frame, -23]];
      var color = pink ? '#ff91c8' : '#ff8069';
      var dark = pink ? '#df569b' : '#db473c';
      decorShape(g, function (x, y) {
        if (y > 0) return null;
        for (var i = 0; i < branches.length; i++) {
          var b = branches[i];
          if (pSeg(x, y, b[0], b[1], b[2], b[3], 2)) return y >= -8 ? dark : color;
        }
        return null;
      });
      return g;
    });
  }
  function dChest(open) {
    return decorSprite('chest' + open, function () {
      var g = new Grid(28, 24, 14, 21);
      decorShape(g, function (x, y) {
        if (x < -9 || x > 8 || y > 0 || y < (open ? -17 : -12)) return null;
        if (open && y >= -13 && y <= -9) return PK;
        if (y === -8 || (!open && y === -9)) return '#ffd34e';
        return x >= 5 || y >= -2 ? '#a95b2a' : '#df8a40';
      });
      if (open) {
        decorBox(g, -7, -12, 14, 4, '#ffd34e');
        decorBox(g, -5, -13, 4, 2, '#ffe885');
        decorBox(g, 1, -14, 3, 3, '#8ad4ff');
        decorBox(g, 5, -12, 3, 2, '#ff919e');
      }
      decorBox(g, -3, -8, 6, 6, PK);
      decorBox(g, -2, -7, 4, 4, '#ffd34e');
      g.set(0, -5, PK);
      return g;
    });
  }
  function dAnemone(frame) {
    return decorSprite('anemone' + frame, function () {
      var g = new Grid(30, 23, 15, 20), arms = [];
      for (var i = 0; i < 5; i++) {
        var angle = -Math.PI * (0.15 + i * 0.175);
        arms.push([Math.cos(angle) * 4, Math.cos(angle) * 10 + Math.sin(frame * Math.PI / 4 + i),
          -4 + Math.sin(angle) * 10]);
      }
      decorShape(g, function (x, y) {
        if (y > 0) return null;
        if (pE(x, y, 0, -3, 8, 5)) return y >= -2 ? '#9e56b4' : '#e394ee';
        for (var i = 0; i < arms.length; i++) {
          var arm = arms[i];
          if (pSeg(x, y, arm[0], -4, arm[1], arm[2], 1.5)) return y >= -8 ? '#9e56b4' : '#e394ee';
        }
        return null;
      });
      decorEyes(g, -5);
      return g;
    });
  }
  function dCastle(gold) {
    return decorSprite('castle' + gold, function () {
      var g = new Grid(44, 55, 22, 52);
      var cream = '#ffe8bb', stone = '#d5aa81', roof = '#ff85a7', roofDark = '#d9527e';
      decorShape(g, function (x, y) {
        if (x < -11 || x > 11 || y > 0 || y < -23) return null;
        if (y < -20 && (x < -10 || (x + 10) % 4 >= 2)) return null;
        return y >= -3 ? stone : cream;
      });
      for (var tower = -14; tower <= 14; tower += 28) {
        decorShape(g, function (x, y) {
          var dx = x - tower;
          if (Math.abs(dx) > 4 || y < -30 || y > 0) return null;
          return dx >= 2 || y >= -3 ? stone : cream;
        });
        decorShape(g, function (x, y) {
          var dx = x + 0.5 - tower;
          if (y < -42 || y > -31 || Math.abs(dx) > 1 + (y + 42) * 5 / 12) return null;
          return dx >= 1 ? roofDark : roof;
        });
        g.stamp(function (x, y) {
          return pE(x, y, tower, -24, 1.6, 2.4) ? '#80c7dc' : null;
        }, PK, [tower - 3, -28, tower + 3, -20]);
      }
      decorShape(g, function (x, y) {
        return y <= 0 && pE(x, y, 0, -3, 4, 6) ? '#a95b2a' : null;
      });
      g.set(2, -4, '#ffd34e');
      decorBox(g, -15, -50, 2, 8, PK);
      decorShape(g, function (x, y) {
        return x >= -13 && x <= -8 && y >= -50 && y <= -47 ?
          (gold ? '#ffd34e' : '#ff6b66') : null;
      });
      if (gold) {
        decorShape(g, function (x, y) {
          if (y < -50 || y > -45 || x < 11 || x > 17) return null;
          return y >= -46 || (x >= 13 && x <= 15) ? '#ffd34e' : null;
        });
      }
      return g;
    });
  }
  function dLighthouse(frame) {
    return decorSprite('lighthouse' + frame, function () {
      var g = new Grid(20, 34, 10, 31);
      decorShape(g, function (x, y) {
        if (y > 0 || y < -21 || Math.abs(x + 0.5) > 3.5 + (y + 21) * 0.06) return null;
        var stripe = Math.floor((y + 21) / 5) % 2;
        return stripe ? (x >= 2 ? '#dac0a2' : '#fff0d8') : (x >= 2 ? '#ce423c' : '#ff6b59');
      });
      decorBox(g, -5, -29, 10, 10, PK);
      decorBox(g, -3, -26, 6, 5, frame ? '#ffe885' : '#f4b744');
      decorBox(g, -4, -31, 8, 2, PK);
      decorBox(g, -2, -12, 4, 5, PK);
      decorBox(g, -1, -11, 2, 3, '#80c7dc');
      return g;
    });
  }
  function dTorii() {
    return decorSprite('torii', function () {
      var g = new Grid(28, 26, 14, 23);
      decorShape(g, function (x, y) {
        var dx = Math.abs(x);
        if (y >= -20 && y <= -17 && dx <= 11 - (y >= -18 ? 1 : 0)) return y >= -18 ? '#cb4032' : '#ff6851';
        if (y >= -13 && y <= -12 && dx <= 8) return '#ff6851';
        if (y >= -16 && y <= 0 && dx >= 4 && dx <= 6) return y >= -3 || x === 6 ? '#cb4032' : '#ff6851';
        return null;
      });
      return g;
    });
  }
  function dLily(flower) {
    return decorSprite('lily' + flower, function () {
      var g = new Grid(20, 20, 10, 10);
      g.line([[-2, 2], [-2, 3], [-1, 4], [-1, 5], [0, 6]], '#346847');
      g.line([[2, 2], [2, 3], [3, 4], [3, 5]], '#346847');
      g.stamp(function (x, y) {
        if (!pE(x, y, 0, 0, 7, 2)) return null;
        return y >= 0 ? '#389a56' : '#91d86a';
      }, PK);
      g.set(4, -1, PK);
      g.set(5, -2, PK);
      if (flower) {
        g.stamp(function (x, y) {
          if (!pE(x, y, 0, -6, 2, 3) && !pE(x, y, -3, -4, 2, 2) &&
              !pE(x, y, 3, -4, 2, 2) && !pE(x, y, 0, -3, 4, 2)) return null;
          return y >= -3 ? '#e66c9c' : '#ffacd0';
        }, PK);
        decorBox(g, -1, -5, 2, 1, '#ffd34e');
      }
      return g;
    });
  }
  var decorLilies = [[122, 0], [140, 1.3], [104, 2.4]];
  var decorRays = [[30, 53, 208], [65, 83, 198], [105, 116, 201], [136, 145, 194]];
  var decorGlints = [[60, 194], [83, 191], [100, 201], [116, 193], [142, 191], [124, 197]];
  var decorRainbow = ['#ff727a', '#ffad50', '#ffe76a', '#87d978', '#66c9ff', '#ba9bff'];

  function drawDecor(ctx, lv, t) {
    lv = Math.max(0, Math.min(DECOR_MAX, lv | 0));
    t = num(t, 0);
    if (!lv) return;
    var fy = SAND_Y, f2 = Math.floor(t * 2) & 1, alpha = ctx.globalAlpha;
    if (lv >= 8) {
      for (var r = 0; r < decorRays.length; r++) {
        var ray = decorRays[r], startX = ray[0] + R(Math.sin(t * 0.6 + r) * 2);
        var startY = tankSurfaceY(startX, t) + 1;
        for (var y = startY; y < ray[2]; y += 2) {
          var p = (y - startY) / (ray[2] - startY);
          ctx.globalAlpha = alpha * (0.15 + 0.03 * Math.sin(t * 1.3 + r)) * (1 - p * 0.65);
          rect(ctx, R(startX + (ray[1] - startX) * p), y, 3 + R(p * 3), 2, '#fff8dc');
        }
      }
      ctx.globalAlpha = alpha;
    }
    if (lv >= 15) {
      // 砂まで届く低い弧。手前の城・宝箱・サンゴが根元を隠す。
      ctx.globalAlpha = alpha * 0.52;
      for (var c = 0; c < decorRainbow.length; c++) {
        for (var x = -43 + c * 2; x <= 43 - c * 2; x++) {
          var u = x / (43 - c * 2);
          rect(ctx, 76 + x, fy - R((32 - c * 2) * Math.sqrt(1 - u * u)), 1, 2, decorRainbow[c]);
        }
      }
      ctx.globalAlpha = alpha;
    }
    if (lv >= 13) {
      for (var i = 0; i < decorGlints.length; i++) {
        if (Math.sin(t * 2 + i * 1.7) <= 0.2) continue;
        var glint = decorGlints[i];
        rect(ctx, glint[0] - 1, glint[1], 3, 1, '#fff1a0');
        rect(ctx, glint[0], glint[1] - 1, 1, 3, '#fff8e8');
      }
    }
    // 城の両端まで砂に届くようにし、下端は手前の砂で隠す。
    if (lv >= 7) blit(ctx, dCastle(lv >= 16), 74, sandY(74) + 2);
    if (lv >= 14) {
      if (f2) {
        ctx.globalAlpha = alpha * 0.25;
        for (var q = 0; q < 14; q++) rect(ctx, 145 - 3 - q * 2, fy - 25 - R(q * 0.4), 2, 2 + R(q * 0.3), '#fff6a0');
        ctx.globalAlpha = alpha;
      }
      blit(ctx, dLighthouse(f2), 145, sandY(145));
    }
    if (lv >= 11) {
      for (var l = 0; l < decorLilies.length; l++) {
        var lily = decorLilies[l], lx = lily[0] + R(Math.sin(t * 0.8 + lily[1]) * 2);
        blit(ctx, dLily(lv >= 12 && l === 0), lx, tankSurfaceY(lx, t));
      }
    }
    if (lv >= 10) blit(ctx, dTorii(), 31, sandY(31));
    if (lv >= 4) blit(ctx, dCoral(false, f2), 113, sandY(113));
    if (lv >= 9) blit(ctx, dCoral(true, 1 - f2), 128, sandY(128));
    if (lv >= 6) blit(ctx, dAnemone(Math.floor(t * 3) & 7), 96, sandY(96));
    if (lv >= 5) blit(ctx, dChest(lv >= 12), 54, sandY(54));
    if (lv >= 3) {
      for (var j = 0; j < decorPebbles.length; j++) {
        var pebble = decorPebbles[j], pebbleX = pebble[0];
        if (lv >= 7) {
          if (pebbleX === 73) pebbleX = 81;
          else if (pebbleX === 84) pebbleX = 89;
        }
        blit(ctx, dPebble(pebble[1], pebble[2]), pebbleX, sandY(pebbleX) - 1);
      }
    }
    if (lv >= 2) blit(ctx, dStar(), 17, sandY(17) - 6);
    if (lv >= 1) blit(ctx, dShell(), 38, sandY(38));
  }


  var GoldfishSprites = {
    drawAsset: drawAsset, hasAsset: hasAsset,
    zukanCols: zukanCols, drawTurtle: drawTurtle, drawTurtleLook: drawTurtleLook, assetBox: assetBox, drawButtonIcon: drawButtonIcon, drawBaskRock: drawBaskRock, drawLoach: drawLoach, drawCatfish: drawCatfish, drawDecor: drawDecor, DECOR_MAX: DECOR_MAX,
    drawTank: drawTank, drawSandFront: drawSandFront,
    drawFish: drawFish,
    drawPellet: drawPellet,
    drawPoop: drawPoop,
    drawBubble: drawBubble,
    drawBrush: drawBrush,
    drawNozzle: drawNozzle,
    drawNet: drawNet,
    drawNetBack: drawNetBack,
    drawNetFront: drawNetFront,
    drawCatPaw: drawCatPaw,
    drawFeather: drawFeather,
    drawDuck: drawDuck,
    drawEyeball: drawEyeball,
    drawThought: drawThought,
    drawGauge: drawGauge,
    drawIconSlot: drawIconSlot,
    drawCard: drawCard,
    drawZukan: drawZukan,
    // 追加（任意で使える）
    drawIcon: drawIcon,
    drawCauseIcon: drawCauseIcon,
    drawSmoke: drawSmoke,
    drawFumes: drawFumes,
    drawStars: drawStars,
    drawLightning: drawLightning,
    drawSparkles: drawSparkles,
    drawDrop: drawDrop,
    drawSuctionLines: drawSuctionLines,
    drawSplash: drawSplash,
    drawFlame: drawFlame,
    drawPop: drawPop,
    drawBird: drawBird,
    // 追加の死因の小物
    drawCrack: drawCrack,
    drawSoul: drawSoul,
        drawSmear: drawSmear,
    drawDragon: drawDragon,
    drawScale: drawScale,
    drawHermit: drawHermit,
        // 水槽の仲間・おもちゃ
    drawSnail: drawSnail,
    drawCrab: drawCrab,
    drawShrimp: drawShrimp,
    drawBall: drawBall,
    drawFingerHoop: drawFingerHoop,
    drawBadge: drawBadge,
    prewarmFriends: prewarmFriends,
    // イベント用の小物
    drawCatShadow: drawCatShadow,
    drawMysteryPellet: drawMysteryPellet,
    drawAlert: drawAlert,
    // 追加の死因6種の小物
    drawUFO: drawUFO,
    drawBeam: drawBeam,
    drawChefHand: drawChefHand,
    drawMeteor: drawMeteor,
    drawCrater: drawCrater,
    drawGhost: drawGhost,
    drawBaby: drawBaby,
    // v16
    drawVacuum: drawVacuum, drawHook: drawHook, drawSun: drawSun, drawThermo: drawThermo, drawIce: drawIce,
    drawTowel: drawTowel, drawCamera: drawCamera, drawPolaroid: drawPolaroid, drawTopHat: drawTopHat, drawGlove: drawGlove,
    drawPigeon: drawPigeon, drawFishStar: drawFishStar,
    COLORS: ['orange', 'lime', 'pink', 'yellow', 'sky', 'purple'],
    VARIANTS: VARIANTS,
    DEATH_FRAMES: DIE_FRAMES,
    prewarmDeath: prewarmDeath,
    PALETTE: { outline: O, water: WATER, cream: CREAM, sand: SAND }
  };

  if (typeof window !== 'undefined') window.GoldfishSprites = GoldfishSprites;
  else if (typeof globalThis !== 'undefined') globalThis.GoldfishSprites = GoldfishSprites;
  if (typeof module !== 'undefined') module.exports = GoldfishSprites;
})();
