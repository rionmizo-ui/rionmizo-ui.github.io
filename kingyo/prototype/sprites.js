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
(function () {
  'use strict';

  // ---------- パレット ----------
  var O = '#1d4d4a';           // 濃い縁
  var WATER = '#5fcfb8', WATER_D = '#56c4ae', AIR = '#a6e6d6';
  var CREAM = '#fff8e8', PAPER = '#f8f0d8';
  var SAND = '#f0b070', SAND_D = '#c98a50', SAND_B = '#e49c5c';
  var WEED = '#3d9a3a', WEED_L = '#7cc24a';

  var PAL = {
    normal: { B: '#f08a30', D: '#d4661f', L: '#ffb060', P: '#ffe0b0', F: '#f89a40', W: '#fffaf0', K: O },
    white: { B: '#f4f6f8', D: '#cfd6dc', L: '#ffffff', P: '#ffffff', F: '#e2e8ee', W: '#ffffff', K: '#3a5a66' },
    frozen: { B: '#9fd4f0', D: '#6aa8d4', L: '#c4eaf8', P: '#e6f8ff', F: '#b4dcf0', W: '#ffffff', K: '#2a5a80' },
    burnt: { B: '#3a2a24', D: '#221814', L: '#5a4034', P: '#6a5040', F: '#2e221c', W: '#f0e6d0', K: '#120c0a' },
    stone: { B: '#9a948a', D: '#77716a', L: '#ada79c', P: '#c2bcb0', F: '#a49e94', W: '#b8b2a6', K: '#5a5650' },
    poison: { B: '#9a5cc0', D: '#6e3a94', L: '#c08ae0', P: '#dcc4ee', F: '#8a52b0', W: '#e8ffd8', K: '#2a1a40' },
    gaunt: { B: '#d89a6a', D: '#b07448', L: '#e8b88a', P: '#f0dcc0', F: '#c48a5e', W: '#fffaf0', K: O },
    xray: { B: '#1c2c5a', D: '#14204a', L: '#2a3e74', P: '#22346a', F: '#1a2a58', W: '#9fe8ff', K: '#bff4ff' },
    old: { B: '#e0884a', D: '#bc6a3a', L: '#f0aa74', P: '#f6dcc0', F: '#eaa472', W: '#fffaf0', K: O },
    gold: { B: '#f6c42a', D: '#c88a14', L: '#fff27a', P: '#ffe58a', F: '#eeb420', W: '#fffbe0', K: '#6a3e0c' },
    bald: { B: '#f6b4a8', D: '#dc8c86', L: '#ffd4cc', P: '#ffe4dc', F: '#f0a49a', W: '#fffaf0', K: O }
  };

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
  // 設計座標: 右向き。体の中心付近が (0,0)。stage で体形が変わる（1=まるい幼魚 → 3=すらっと）。
  //  cx,rx,ry: 胴の楕円 / tb: 尾の付け根 x / hp: 尾柄の半高 / tl: 尾の長さ / er: 目の半径 / vc: 見た目の中心 x
  //  カートゥーン体形：頭が大きく胴は短い（卵形）。尾は丸い二つの房。
  var STAGES = {
    1: { cx: 2, rx: 12.5, ry: 11.2, tb: -9, hp: 3.6, tl: 13, er: 5.4, vc: -5 },
    2: { cx: 2, rx: 14, ry: 10.3, tb: -11, hp: 3.3, tl: 14, er: 5.0, vc: -6 },
    3: { cx: 3, rx: 15.6, ry: 9.2, tb: -13, hp: 2.9, tl: 15, er: 4.6, vc: -6 }
  };
  var fishCache = {}, fishCacheN = 0;
  var BLUSH = '#ff7a8a', BLUSH_S = '#ffa890', TONGUE = '#ff6a7a', MOUTH_IN = '#8a2a1a', LIP = '#ff8aa0', TOOTH = '#ffffff';
  var TEAR = '#8ad8ff', TEAR_D = '#3a9ad8', HEART = '#ff3a6a', HEART_L = '#ffa0b8', SPARK_P = '#203070';

  function stageOf(o) { var s = Math.round(+o.stage || 2); return s < 1 ? 1 : s > 3 ? 3 : s; }
  function palOf(o) {
    if (o.palette && PAL[o.palette]) return PAL[o.palette];
    if (o.bald) return PAL.bald;
    if (o.burnt) return PAL.burnt;
    if (o.skeleton) return PAL.gaunt;
    if (o.stone) return PAL.stone;
    if (o.frozen) return PAL.frozen;
    if (o.white) return PAL.white;
    if (o.wrinkles) return PAL.old;
    return PAL.normal;
  }

  // 胴体の内外判定（半ピクセル中心）
  function bodyIn(x, y, S, o) {
    var px = x + 0.5, py = y + 0.5;
    if (o.puff) { var qx = px - (S.cx - 1); return qx * qx + py * py <= 15.2 * 15.2; }
    var t = (px - S.cx) / S.rx;
    if (t >= -1 && t <= 1) {
      var h;
      if (t > 0) h = S.ry * Math.pow(1 - Math.pow(t, 2.6), 1 / 2.6); // 大きくまるい頭
      else h = S.ry * Math.sqrt(1 - t * t) * (1 + 0.2 * t);         // 短く絞れる胴
      var hh = py > 0 ? h * 1.06 : h;
      if (S.gaunt && py > 0) hh = h * (1 - 0.4 * Math.max(0, 1 - Math.abs(t - 0.05) * 1.5));
      if (py >= -hh && py <= hh) return true;
    }
    // 尾柄（尾の付け根へ細くなる）
    var xe = S.cx - S.rx * 0.6;
    if (px >= S.tb && px <= xe) {
      var he = S.ry * 0.62, hp = S.hp + (he - S.hp) * Math.pow((px - S.tb) / (xe - S.tb), 1.3);
      if (Math.abs(py) <= hp) return true;
    }
    if (o.belly) { var bx = (px - S.cx + 1) / (S.rx * 0.98), by = (py - S.ry * 0.72) / (S.ry * 1.5); if (bx * bx + by * by <= 1) return true; }
    return false;
  }

  function eyeCenters(S, o) {
    var front = o.puff ? S.cx + 14 : S.cx + S.rx;
    var r = S.er;
    var ex1 = Math.round(front - r - 1.2);
    var ex2 = ex1 - Math.round(1.55 * r);
    var ey = Math.round(o.puff ? -6 : -S.ry * 0.42);
    return { ex1: ex1, ex2: ex2, ey: ey, r: r, front: Math.round(front) };
  }

  // ---- 口（右端＝顔の先端に合わせる横顔用 / 中央に置く正面用） ----
  // K=輪郭 d=口の中 r=舌 w=歯 p=くちびる
  var MOUTHS = {
    '0': { a: ['K...K', '.KKK.'], ax: -1, dy: 1 },
    '1': { a: ['KKKKKK', '.KdddK', '.KdrrK', '..KKK.'], ax: 0, dy: 0, f: ['.KKKK.', 'KddddK', 'KdrrdK', '.KKKK.'] },
    o: { a: ['.KKK.', 'KdddK', 'KdrdK', '.KKK.'], ax: -1, dy: -1, f: ['.KK.', 'KddK', 'KddK', '.KK.'] },
    yawn: { a: ['..KKKK.', '.KddddK', 'KdddddK', 'KdddddK', 'KddrrdK', '.KdrrK.', '..KKK..'], ax: 0, dy: -3, f: ['.KKKK.', 'KddddK', 'KddddK', 'KddddK', 'KdrrdK', '.KKKK.'] },
    grin: { a: ['KKKKKKK', 'KwwwwwK', '.KdrdK.', '..KKK..'], ax: 0, dy: 0 },
    pout: { a: ['..KKK.', '.KpppK', '.KpppK', '..KKK.'], ax: 3, dy: 0, f: ['.KK.', 'KppK', 'KppK', '.KK.'] },
    smile: { a: ['K.....K', '.K...K.', '..KKK..'], ax: -1, dy: 0 },
    wavy: { a: ['.K...K.', 'K.K.K.K', '...K...'], ax: -1, dy: 1, f: ['.K...K.', 'K.K.K.K', '...K...'] },
    tongue: { a: ['K.....K', '.KKKKK.', '...KrrK', '...KrrK', '....KK.'], ax: 0, dy: 1, f: ['K....K', '.KKKK.', '.KrrK.', '.KrrK.', '..KK..'] },
    c0: { a: ['KKKK'], ax: -1, dy: 2, f: ['KKKK'] },
    c1: { a: ['.KKK', 'KddK', '.KK.'], ax: -1, dy: 1, f: ['.KK.', 'KddK', '.KK.'] },
    c2: { a: ['.KKK.', 'KdddK', 'KdrdK', '.KKK.'], ax: -1, dy: 0 }
  };
  function mouthOf(o) {
    if (o.chew != null && o.chew !== false && isFinite(+o.chew)) {
      var cp = ((+o.chew % 1) + 1) % 1, op = 0.5 - 0.5 * Math.cos(cp * Math.PI * 2);
      return op < 0.3 ? 'c0' : op < 0.75 ? 'c1' : 'c2';
    }
    var m = o.mouth;
    if (typeof m === 'string' && MOUTHS[m] && m !== 'c0' && m !== 'c1' && m !== 'c2') return m;
    if (m && m !== '0') return '1';
    if (o.eyes === 'happy' && !o.wrinkles) return '1';
    return '0';
  }
  function cheekBob(o) {
    if (!o.cheeks || o.chew == null || !isFinite(+o.chew)) return 0;
    return R(Math.sin(((+o.chew % 1) + 1) % 1 * Math.PI * 2) * 1);
  }
  function putMouth(g, key, x0c, y0, front, p, K) {
    var M = MOUTHS[key] || MOUTHS['0'];
    var rows = front && M.f ? M.f : M.a, w = rows[0].length;
    var lg = { K: K, d: MOUTH_IN, r: p === PAL.poison ? '#7cf04a' : (p === PAL.normal || p === PAL.old || p === PAL.white || p === PAL.gaunt || p === PAL.bald) ? TONGUE : p.D, w: TOOTH, p: LIP };
    var x0 = front ? x0c - (w >> 1) : x0c - (w - 1) + M.ax;
    stampArt(g, rows, x0, y0 + M.dy, lg);
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
    [[E.ex2, 1], [E.ex1, -1]].forEach(function (ee) {
      var ex = ee[0], inward = ee[1]; // 内側（もう一方の目）の向き
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
        if ((pc === p.B || pc === p.D || pc === p.L) && hash(px2 >> 1, (py2 >> 1) + 50) > 0.84) g.set(px2, py2, hash(px2, py2) > 0.5 ? '#7cf04a' : '#4ab02a');
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

    // --- 焦げ：ひび割れから残り火 ---
    if (o.burnt) {
      var emb = (frame & 2) ? '#ff9a30' : '#ff6a20';
      var bq = A.isFront ? [[[-9, 2], [-8, 3], [-7, 3], [-6, 4]], [[5, 5], [6, 6], [7, 6]], [[-3, 8], [-2, 9]]]
        : [[[cx - 9, -3], [cx - 8, -2], [cx - 7, -2], [cx - 6, -1], [cx - 6, 0]], [[cx + 2, 5], [cx + 3, 6], [cx + 4, 6]], [[cx - 12, 2], [cx - 11, 3], [cx - 11, 4]], [[A.tb - 4, -3], [A.tb - 5, -2]]];
      // 炭化したひび（細かい網目）と灰
      var cid = function (x, y) { return Math.floor((x + 2 * Math.sin(y * 0.9)) / 6.5) * 31 + Math.floor((y + 1.5 * Math.sin(x * 0.7)) / 5.5); };
      for (var cy8 = -26; cy8 <= 26; cy8++) for (var cx8 = -46; cx8 <= 30; cx8++) {
        var cc8 = g.get(cx8, cy8); if (cc8 !== p.B && cc8 !== p.L) continue;
        var me = cid(cx8, cy8);
        if (me !== cid(cx8 + 1, cy8) || me !== cid(cx8, cy8 + 1)) g.set(cx8, cy8, hash(cx8, cy8 * 5) > 0.9 ? ((frame & 2) ? '#ff9a30' : '#ff6a20') : K);
      }
      for (var ax8 = -40; ax8 <= 26; ax8++) { var ay8 = -30; while (ay8 < 0 && g.get(ax8, ay8) !== K) ay8++; if (ay8 < 0 && hash(ax8, 21) > 0.45 && g.get(ax8, ay8 + 1) && g.get(ax8, ay8 + 1) !== K) g.set(ax8, ay8 + 1, '#bdb2a6'); }
      bq.forEach(function (l) { g.line(l, emb); });
      g.set(bq[0][2][0], bq[0][2][1], '#ffd040'); g.set(bq[1][1][0], bq[1][1][1], '#ffd040');
      for (var by3 = -26; by3 <= 26; by3++) for (var bx3 = -44; bx3 <= 26; bx3++) {
        var bc = g.get(bx3, by3);
        if (bc === p.F && hash(bx3 * 5, by3 * 3) > 0.83) g.set(bx3, by3, hash(bx3, by3) > 0.5 ? K : null);
      }
      var hx0 = A.isFront ? 0 : cx + 3, hy0 = A.top;
      g.stamp(function (x, y) {
        var dx = x + 0.5 - hx0, dy = y + 0.5 - (hy0 - 1);
        if (dy > 0.8) return null;
        if (dx * dx / 16 + dy * dy / 6 > 1) return null;
        return hash(x, y) > 0.6 ? '#4a3a32' : '#1e1410';
      }, K, [hx0 - 6, hy0 - 5, hx0 + 6, hy0 + 1]);
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

    // --- まんまる：球の陰影と大きなつや ---
    if (o.round) {
      var rcx = A.isFront ? 0 : cx - 1;
      for (var ry5 = -17; ry5 <= 17; ry5++) for (var rx5 = rcx - 17; rx5 <= rcx + 17; rx5++) {
        var rc5 = g.get(rx5, ry5); if (rc5 !== p.B && rc5 !== p.P && rc5 !== p.L) continue;
        var ddx = rx5 + 0.5 - rcx, ddy = ry5 + 0.5, dd = ddx * ddx + ddy * ddy;
        if (ddx * 0.5 + ddy * 0.86 > 9.5 && dd > 110) g.set(rx5, ry5, rc5 === p.P ? '#f4c890' : p.D);
      }
      g.line([[rcx - 10, -4], [rcx - 10, -5], [rcx - 9, -7], [rcx - 8, -8], [rcx - 7, -9], [rcx - 6, -10]], '#ffffff');
      g.line([[rcx - 9, -4], [rcx - 9, -5], [rcx - 8, -6]], p.L); g.set(rcx - 4, -11, '#ffffff');
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
    // --- ハゲ：鳥肌・うろこの跡・毛のように残った1枚 ---
    if (o.bald) {
      for (var by5 = -26; by5 <= 26; by5++) for (var bx5 = -46; bx5 <= 30; bx5++) {
        var bc5 = g.get(bx5, by5);
        if (bc5 === p.B && hash(bx5 * 3, by5 * 5) > 0.92) g.set(bx5, by5, p.D);
        else if (bc5 === p.B && ((bx5 + 40) % 4 === 0) && ((by5 + 40) % 3 === 0) && hash(bx5, by5 + 9) > 0.5) g.set(bx5, by5, '#e8968e');
        else if ((bc5 === p.F || bc5 === p.L) && hash(bx5 * 3, by5 * 7 + 1) > 0.83) g.set(bx5, by5, null);
      }
      var hx5 = A.isFront ? 0 : cx + 2, hy5 = A.top - 1, sw5 = R(Math.sin(ph) * 1.3);
      g.line([[hx5, hy5], [hx5, hy5 - 1], [hx5 + (sw5 > 0 ? 1 : 0), hy5 - 2], [hx5 + sw5, hy5 - 3]], K);
      var scx5 = hx5 + sw5 + 1, scy5 = hy5 - 6;
      g.stamp(function (x, y) {
        var dx = x + 0.5 - scx5, dy = y + 0.5 - scy5;
        if (dx * dx / 5.2 + dy * dy / 8 > 1) return null;
        return (dx < 0 && dy < 0) ? '#ffb060' : dy > 1.2 ? '#d4661f' : '#f08a30';
      }, O, [scx5 - 4, scy5 - 5, scx5 + 4, scy5 + 4]);
      g.set(scx5 - 1, scy5 - 1, '#fff0d0');
    }
    // --- アイドル：大きなリボン＋マイク ---
    if (o.idol) {
      var RB = '#ff5a9a', RL = '#ffa8cc', RD = '#d02a6a', RK = '#6a1036';
      var ibx = A.isFront ? 0 : cx + 1, iby = A.top - 3;
      g.stamp(function (x, y) {
        var px = x + 0.5 - ibx, py = y + 0.5 - iby;
        if (px * px + py * py <= 3.4) return (px < 0 && py < 0) ? RL : RD;
        for (var s = -1; s <= 1; s += 2) {
          var u = px - s * 5.4, v = py + 1.2, a = s * 0.35, c = Math.cos(a), sn = Math.sin(a), uu = c * u + sn * v, vv = -sn * u + c * v;
          if (uu * uu / 30 + vv * vv / 13 <= 1) {
            if (Math.abs(px) < 2.6) return RD;
            if (((x + y + 80) % 4 === 0) && (x & 1)) return '#ffffff';
            return vv < -1.2 ? RL : RB;
          }
          if (segDist2(px, py, s * 1.2, 1, s * 4.5, 4.6) <= 1.3) return RB;
        }
        return null;
      }, RK, [ibx - 13, iby - 8, ibx + 13, iby + 8]);
      var mxx = A.isFront ? R(A.front * 0.55) + 2 : A.fxm + 3, myy = A.my + 2;
      var hx6 = A.isFront ? mxx + 3 : mxx - 5, hy6 = myy + 9;
      g.stamp(function (x, y) {
        var px = x + 0.5, py = y + 0.5, dx = px - mxx, dy = py - myy;
        if (dx * dx + dy * dy <= 7) return ((x + y) & 1) ? '#d4d8e4' : '#8a90a0';
        if (segDist2(px, py, mxx, myy + 2, hx6, hy6) <= 1.3) return py < myy + 4 ? '#ff5a9a' : '#3a3a48';
        return null;
      }, '#1a1a24', [Math.min(mxx, hx6) - 4, myy - 4, Math.max(mxx, hx6) + 4, hy6 + 3]);
      g.set(mxx - 1, myy - 1, '#ffffff');
      var fx6 = (mxx + hx6) / 2, fy6 = (myy + 2 + hy6) / 2 + 1;
      g.stamp(function (x, y) { var dx = x + 0.5 - fx6, dy = y + 0.5 - fy6; return dx * dx / 7 + dy * dy / 4 <= 1 ? (((x + y) % 3 === 0) ? p.L : p.F) : null; }, K, [fx6 - 4, fy6 - 3, fx6 + 4, fy6 + 3]);
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

  // 顔（目・眉・ほっぺ・口）を描く。横顔/正面で共通
  function drawFace(g, o, p, A) {
    var K = p.K, E = A.E;
    var cheeks = !!o.cheeks && !o.stone;
    var bob = cheekBob(o);
    var mk = mouthOf(o);
    var cr = Math.max(3, E.r * 0.72);
    if (cheeks) {
      if (A.isFront) { puffCheek(g, -A.cw, A.my + 1.5 + bob, cr, p, K); puffCheek(g, A.cw, A.my + 1.5 + bob, cr, p, K); }
      else puffCheek(g, A.fxm - cr - 1.5, A.my + 3 + bob, cr, p, K);
    }
    // 目
    drawEyesOnGrid(g, o, p, E, A.isFront);
    // ほっぺの赤み（いつもうっすら。blush / happy / split で強く）
    var dead = o.eyes === 'x' || o.eyes === 'dizzy';
    var warm = p === PAL.normal || p === PAL.old || p === PAL.white || p === PAL.gaunt || p === PAL.bald;
    var strong = (o.blush || o.eyes === 'happy' || o.split || o.eyes === 'love') && !o.stone && !o.burnt && !o.frozen;
    if (!cheeks && (strong || (warm && !dead))) {
      var by = E.ey + Math.ceil(E.r) + 1;
      var spots = A.isFront ? [[E.ex2 - 1, by], [E.ex1 - 1, by]] : [[E.ex1 - 3, by]];
      spots.forEach(function (s) {
        if (strong) {
          for (var dx = -1; dx <= 2; dx++) { if (g.get(s[0] + dx, s[1]) !== K) g.set(s[0] + dx, s[1], BLUSH); if (dx >= 0 && dx <= 1 && g.get(s[0] + dx, s[1] + 1) !== K) g.set(s[0] + dx, s[1] + 1, BLUSH); }
          if (o.blush) { g.set(s[0] - 1, s[1] + 1, '#e04a6a'); g.set(s[0] + 1, s[1], '#e04a6a'); g.set(s[0] + 3, s[1] - 1, '#e04a6a'); }
        } else {
          if (g.get(s[0], s[1]) !== K) g.set(s[0], s[1], BLUSH_S); if (g.get(s[0] + 1, s[1]) !== K) g.set(s[0] + 1, s[1], BLUSH_S);
        }
      });
    }
    // 口
    if (A.isFront) putMouth(g, mk, 0, A.my, true, p, K);
    else putMouth(g, mk, A.fxm, A.my, false, p, K);
  }

  function buildFish(o, frame, S, splitExt, tframe) {
    var g = new Grid(100, 80, 52, 40);
    var p = palOf(o);
    var K = p.K;
    var still = o.stone || o.frozen;
    var ph = still ? 0 : frame / 8 * Math.PI * 2;
    var pht = still ? 0 : (tframe == null ? frame : tframe) / 8 * Math.PI * 2;
    var puff = !!(o.puff || o.balloon);

    g.K = K; g.keep = [PUPIL]; g.keepSep = p.W;
    if (o.bones) return buildSkeleton(g, o, ph, S, splitExt);
    if (o.stone) return buildStone(g, o, S, splitExt);
    if (o.skeleton) S = { cx: S.cx, rx: S.rx - 1, ry: S.ry * 0.62, tb: S.tb, hp: S.hp * 0.7, tl: S.tl - 1, er: S.er * 0.95, vc: S.vc, gaunt: true, st: S };
    var E = eyeCenters(S, o);
    var ry = puff ? 15 : S.ry;
    var cx = S.cx;

    // --- 尾びれ（丸い二つの房・ぷるんと揺れる） / 分裂時は尾柄を延長して切り口 ---
    if (splitExt != null) {
      g.stamp(function (x, y) {
        if (x >= S.tb + 1 || x < S.tb - splitExt) return null;
        return Math.abs(y + 0.5) <= S.hp + 0.5 ? (y + 0.5 > 0.8 ? p.P : p.B) : null;
      }, K, [S.tb - splitExt - 1, -S.hp - 2, S.tb + 1, S.hp + 2]);
    } else {
      var tb = puff ? S.cx - 14 : S.tb;
      var tl = puff ? (o.round ? 7 : 11) : S.tl;
      var dL = tl * 0.6, yL = tl * 0.36 * (1 + 0.07 * Math.sin(pht + 1)), rL = tl * 0.41 * (1 + 0.05 * Math.sin(pht));
      var hp0 = S.hp + 0.3;
      g.stamp(function (x, y) {
        var d = tb - (x + 0.5); if (d < -1.5 || d > tl + 2) return null;
        var k = Math.max(0, d) / tl;
        var wv = Math.sin(pht - k * 2.4) * 2.0 * k * k;   // 付け根から先へ波が伝わる
        var yy = y + 0.5 - wv;
        var ins = false;
        if (d <= dL) { var hw = hp0 + (yL + rL * 0.62 - hp0) * Math.pow(Math.max(0, d) / dL, 0.9); ins = Math.abs(yy) <= hw; }
        if (!ins) {
          var ex = d - dL, e1 = yy - yL, e2 = yy + yL;
          ins = ex * ex + e1 * e1 <= rL * rL || ex * ex + e2 * e2 <= rL * rL;
        }
        if (!ins) return null;
        if (d < 1.5) return p.B;
        var a = Math.atan2(yy, d + 2) * 6 / Math.PI + 20;
        if (d > 3 && (a % 1) < 0.28) return p.L; // 放射状のすじ
        return p.F;
      }, K, [tb - tl - 4, -tl - 6, tb + 2, tl + 6]);
    }

    // --- 背びれ（丸くやわらか） ---
    var top = -ry;
    var dw = Math.sin(ph) * 1.1;
    var dorsal = puff ? [[cx + 1, top + 3], [cx - 2, top - 5], [cx - 6, top - 5.5], [cx - 9, top + 3]]
      : [[cx + 1, top + 2], [cx - 1.5, top - 3.5], [cx - 4, top - 5.5 - dw * 0.3], [cx - 7 + dw, top - 5.2], [cx - 9.5 + dw, top - 2.5], [cx - 11, top + 3]];
    g.stamp(function (x, y) {
      if (!inPoly(x + 0.5, y + 0.5, dorsal)) return null;
      return ((x - y + 60) % 3 === 0) ? p.L : p.F;
    }, K, [cx - 15, top - 10, cx + 6, top + 5]);

    // --- 腹びれ・尻びれ（丸いおでき型） ---
    var bo = o.belly ? R(S.ry * 1.25) : 0;
    var bot = ry;
    var fw = Math.sin(ph + 1) * 0.8;
    var fins = puff ? [[cx + 3, bot + 1, 2.2, 3, 0.3], [cx - 10, bot - 1, 2.6, 2.4, -0.4]]
      : [[cx + 2 + fw * 0.5, bot + 1.2 + bo, 2.2, 3.0, 0.35], [cx - 8, bot - 1.5 + bo * 0.5, 2.6, 2.4, -0.5]];
    g.stamp(function (x, y) {
      for (var i = 0; i < fins.length; i++) {
        var f = fins[i], c = Math.cos(f[4]), s = Math.sin(f[4]);
        var dx = x + 0.5 - f[0], dy = y + 0.5 - f[1];
        var u = c * dx + s * dy, v = -s * dx + c * dy;
        if (u * u / (f[2] * f[2]) + v * v / (f[3] * f[3]) <= 1) return ((x + 60) % 2 === 0) ? p.L : p.F;
      }
      return null;
    }, K, [cx - 15, bot - 6, cx + 8, bot + bo + 7]);

    // --- 胴体 ---
    var bellyLine = puff ? 4 : S.ry * 0.22;
    if (o.belly) bellyLine = S.ry * 0.15;
    var patches = S.gaunt ? []
      : puff ? [[cx - 5, -4], [cx + 2, 6]]
      : S === STAGES[1] ? [[cx - 4, -2]]
      : S === STAGES[2] ? [[cx - 5, -2]]
      : [[cx - 4, -2], [cx - 11, -1]];
    g.stamp(function (x, y) {
      if (!bodyIn(x, y, S, o)) return null;
      var py = y + 0.5;
      if (py > bellyLine + (x < cx - 6 ? (cx - 6 - x) * 0.14 : 0) - (x > cx + S.rx * 0.5 ? (x - cx - S.rx * 0.5) * 0.3 : 0)) return p.P;
      for (var i = 0; i < patches.length; i++) {
        var dx = x - patches[i][0] + 1, dy = y - patches[i][1] + 1;
        if (dx >= -3 && dx <= 4 && dy >= -3 && dy <= 4) {
          var qx = dx + 3, qy = dy + 3, bx2 = qx % 3, by2 = qy % 3, ix = (qx / 3) | 0, iy = (qy / 3) | 0;
          if (bx2 < 2 && by2 < 2 && (ix === 1 || iy === 1)) return p.L;
        }
      }
      if (!bodyIn(x, y - 1, S, o) && x < cx + S.rx * 0.2) return p.D;
      if (!bodyIn(x, y - 2, S, o) && x < cx - 2 && x > cx - S.rx * 0.6) return p.D;
      return p.B;
    }, K, puff ? [cx - 18, -17, cx + 16, 17] : [S.tb - 1, -S.ry - 2, cx + S.rx + 2, S.ry * 2.4 + 2]);
    // 背中のつや
    if (!S.gaunt && !puff) { g.set(cx - 7, -R(ry) + 2, p.L); g.set(cx - 6, -R(ry) + 2, p.L); g.set(cx - 9, -R(ry * 0.9) + 2, p.L); }

    // --- 食べすぎ：張りつめたお腹のつや・すじ ---
    if (o.belly && !puff) {
      var bcy = R(S.ry * 1.25), bcx = cx - 1;
      g.line([[bcx - 6, bcy - 2], [bcx - 5, bcy - 3], [bcx - 4, bcy - 3], [bcx - 3, bcy - 4], [bcx - 2, bcy - 4]], '#ffffff');
      g.set(bcx - 6, bcy - 1, '#ffffff'); g.set(bcx - 1, bcy - 4, '#fff4e0');
      g.line([[bcx + 4, bcy + 5], [bcx + 5, bcy + 4], [bcx + 6, bcy + 3]], p.L);
      g.set(bcx + 1, bcy + 2, p.D); g.set(bcx + 1, bcy + 3, p.D);
      // 張りさけそうな肉割れ線
      g.line([[bcx - 9, bcy + 4], [bcx - 8, bcy + 5]], p.D); g.line([[bcx - 7, bcy + 7], [bcx - 6, bcy + 8]], p.D);
      g.line([[bcx + 8, bcy + 6], [bcx + 9, bcy + 5]], p.D); g.line([[bcx + 3, bcy + 9], [bcx + 4, bcy + 10]], p.D);
      g.set(bcx - 3, bcy - 5, '#ffffff');
    }

    // --- ガリガリ：浮き出た肋骨・背骨・こけた頬 ---
    if (S.gaunt) {
      var BNc = '#fff6e4', ry0 = S.ry;
      for (var gx = S.tb + 2; gx <= cx + 4; gx++) if (bodyIn(gx, -1, S, o)) { g.set(gx, -1, (gx & 1) ? BNc : '#f0dcc0'); if (gx % 3 === 0) g.set(gx, -2, p.D); }
      for (var rbx = cx + 3; rbx > S.tb + 3; rbx -= 3) {
        for (var ry2 = -R(ry0); ry2 <= R(ry0); ry2++) {
          var cxr = rbx + R(Math.abs(ry2) * 0.45) - 1;
          if (!bodyIn(cxr, ry2, S, o) || !bodyIn(cxr, ry2 - 1, S, o) && ry2 < 0) continue;
          if (ry2 === -1) continue;
          g.set(cxr, ry2, BNc); if (bodyIn(cxr + 1, ry2, S, o)) g.set(cxr + 1, ry2, p.D);
        }
      }
      for (var vx = S.tb + 3; vx < cx + 2; vx += 3) {
        var vy = -R(ry0) - 1; while (vy < 0 && !bodyIn(vx, vy, S, o)) vy++;
        if (g.get(vx, vy - 1) === K) { g.set(vx, vy - 1, BNc); g.set(vx, vy - 2, K); g.set(vx - 1, vy - 1, K); g.set(vx + 1, vy - 1, K); }
      }
      for (var ty2 = -22; ty2 <= 22; ty2++) for (var tx2 = S.tb - S.tl - 4; tx2 < S.tb - 3; tx2++) {
        var tc = g.get(tx2, ty2);
        if ((tc === p.F || tc === p.L) && hash(tx2 * 3, ty2 * 7) > 0.8) g.set(tx2, ty2, null);
      }
    }

    // --- 胸びれ（体の上・ぱたぱた） ---
    if (!puff) {
      var pyb = R(bellyLine) + 1 + (o.belly ? 1 : 0);
      var pa = 0.55 + Math.sin(ph * 2) * 0.25, pcx = cx - 2.5, pcy = pyb + 1.8;
      var pc0 = Math.cos(pa), ps0 = Math.sin(pa);
      g.stamp(function (x, y) {
        var dx = x + 0.5 - pcx, dy = y + 0.5 - pcy;
        var u = pc0 * dx + ps0 * dy, v = -ps0 * dx + pc0 * dy;
        if (u * u / 14 + v * v / 4.4 > 1) return null;
        return ((x + y + 60) % 3 === 0) ? p.L : p.F;
      }, K, [cx - 9, pyb - 3, cx + 4, pyb + 7]);
    }

    // --- 輪郭を太く ---
    thicken(g, K);

    // --- 顔 ---
    var my = R(S.ry * 0.16) + 1;
    if (puff) my = 2;
    var fxm = E.front; while (fxm > cx && !bodyIn(fxm, my, S, o)) fxm--;
    var A = { cx: cx, top: -R(ry), bot: R(ry), front: E.front, back: S.tb - 4, E: E, fxm: fxm, my: my, isFront: false, S: S, ry: ry, tb: S.tb };
    if (!o.stuck) drawFace(g, o, p, A);
    if (S.gaunt) {
      [E.ex1, E.ex2].forEach(function (ex) { for (var k = -2; k <= 1; k++) { var yy = E.ey + Math.ceil(E.r) + 1; if (g.get(ex + k, yy) !== K) g.set(ex + k, yy, '#8a5a40'); } });
    }
    decorate(g, o, p, A, frame, ph);
    if (o.stuck) stuckCut(g, S, p, K);
    return g;
  }

  // ---------- 正面顔（こちらを向く） ----------
  function buildFront(o, frame, S, tframe) {
    var g = new Grid(100, 80, 50, 40);
    var p = palOf(o), K = p.K;
    var still = o.stone || o.frozen;
    var ph = still ? 0 : frame / 8 * Math.PI * 2;
    var pht = still ? 0 : (tframe == null ? frame : tframe) / 8 * Math.PI * 2;
    var puff = !!(o.puff || o.balloon), gaunt = !!o.skeleton;
    g.K = K; g.keep = [PUPIL]; g.keepSep = p.W;
    var bw = puff ? 15.5 : S.ry * (gaunt ? 0.85 : 1.12), bh = puff ? 15 : S.ry * (gaunt ? 0.8 : 1.0);
    var top = -bh, tl = S.tl;
    // 尾（体のうしろ、左右下にのぞく二つの房）
    var sw = Math.sin(pht) * 1.6;
    g.stamp(function (x, y) {
      for (var s = -1; s <= 1; s += 2) {
        var lcx = s * bw * 0.78 + sw, lcy = bh * 0.6 + Math.sin(pht + (s > 0 ? 0 : 1.6)) * 0.8;
        var a = s * 0.45, c = Math.cos(a), sn = Math.sin(a);
        var dx = x + 0.5 - lcx, dy = y + 0.5 - lcy;
        var u = c * dx + sn * dy, v = -sn * dx + c * dy;
        var rx = tl * 0.55, rr = tl * 0.24 * (0.6 + 0.4 * Math.min(1, Math.abs(u + rx) / rx));
        if (u * u / (rx * rx) + v * v / (rr * rr) <= 1) return (Math.abs(v * 3 / rr) | 0) === 1 ? p.L : p.F;
      }
      return null;
    }, K, [-bw - 12, 0, bw + 12, bh + 12]);
    // 背びれ（上に薄い刃）
    var dw = R(Math.sin(ph) * 1);
    g.stamp(function (x, y) {
      var dy = top + 1.5 - (y + 0.5); if (dy < 0 || dy > 6.5) return null;
      var c = (dy > 3 ? dw : 0) * (dy / 6.5);
      var w = 1.6 * (1 - dy / 9);
      return Math.abs(x + 0.5 - c) <= w ? p.F : null;
    }, K, [-5, top - 9, 5, top + 2]);
    // 胸びれ（両側にぱたぱた）
    var fl = Math.sin(ph * 2) * 0.35;
    g.stamp(function (x, y) {
      for (var s = -1; s <= 1; s += 2) {
        var fcx = s * (bw + 0.2), fcy = bh * 0.1;
        var a = s * (0.6 + fl), c = Math.cos(a), sn = Math.sin(a);
        var dx = x + 0.5 - fcx, dy = y + 0.5 - fcy;
        var u = c * dx + sn * dy, v = -sn * dx + c * dy;
        if (u * u / 10 + v * v / 3.6 <= 1) return ((x + y + 60) % 3 === 0) ? p.L : p.F;
      }
      return null;
    }, K, [-bw - 8, -2, bw + 8, bh + 4]);
    // 腹びれ（下に二つ）… 尾と重なるので puff のときだけ
    if (puff) g.stamp(function (x, y) {
      for (var s = -1; s <= 1; s += 2) { var dx = x + 0.5 - s * 3.5, dy = y + 0.5 - (bh + 0.8); if (dx * dx / 2.6 + dy * dy / 6 <= 1) return p.F; }
      return null;
    }, K, [-7, bh - 3, 7, bh + 5]);
    // 体
    var inB = function (x, y) {
      var px = (x + 0.5) / bw, py = (y + 0.5) / (y + 0.5 > 0 ? bh * 1.04 : bh);
      if (o.belly) { var qx = (x + 0.5) / (bw * 1.05), qy = (y + 0.5 - bh * 0.55) / (bh * 1.0); if (qx * qx + qy * qy <= 1) return true; }
      return Math.pow(Math.abs(px), 2.3) + Math.pow(Math.abs(py), 2.3) <= 1;
    };
    g.stamp(function (x, y) {
      if (!inB(x, y)) return null;
      var px = (x + 0.5) / bw;
      if (y + 0.5 > bh * 0.2 + px * px * bh * 0.55) return p.P;
      if (!inB(x, y - 1) || !inB(x - 1, y) && x < 0 || !inB(x + 1, y) && x > 0) return p.D;
      if (!gaunt && !puff) {
        var dx = x - (-R(bw * 0.55)), dy = y - R(bh * 0.15); // ほっぺ横のうろこ
        if ((dx === 0 || dx === 1) && (dy === 0 || dy === 1) && x < -3) return p.L;
      }
      return p.B;
    }, K, [-bw - 2, -bh - 2, bw + 2, bh * 2 + 2]);
    g.set(-1, R(top) + 1, p.L); g.set(0, R(top) + 1, p.L); g.set(1, R(top) + 2, p.L);
    if (o.belly) { var bcy = R(bh * 1.1); g.line([[-7, bcy - 2], [-6, bcy - 3], [-5, bcy - 3], [-4, bcy - 4]], '#ffffff'); g.set(0, bcy + 2, p.D); g.set(0, bcy + 3, p.D); }
    if (gaunt) { for (var ryb = 1; ryb < bh; ryb += 3) for (var s2 = -1; s2 <= 1; s2 += 2) for (var k = 2; k < bw - 1; k++) if (inB(s2 * k, ryb + R(k * 0.2))) g.set(s2 * k, ryb + R(k * 0.2), '#fff6e4'); }
    thicken(g, K);
    // 顔
    var r = S.er * (gaunt ? 0.95 : 1.02);
    var esp = Math.round(r + 0.4);
    var E = { ex1: esp, ex2: -esp, ey: Math.round(-bh * 0.3), r: r, front: R(bw) };
    var my = R(bh * 0.34) + 1;
    if (puff) my = 4;
    var A = { cx: 0, top: R(top), bot: R(bh), front: R(bw), back: -R(bw), E: E, fxm: 0, my: my, isFront: true, S: S, ry: bh, tb: -R(bw), cw: R(bw - 1.8) };
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

  // 丸い石（魚の輪郭が浮き彫りで残る）。目だけは生きている
  function buildStone(g, o, S, splitExt) {
    var p = PAL.stone, K = p.K;
    var ref = buildFish(merge(o, { stone: false, moss: false, glitch: false, flower: false, frozen: false, xray: false, palette: 'stone', eyes: 'normal', legs: false }), 0, S, splitExt);
    var front = S.cx + S.rx, back = S.tb - S.tl;
    var scx = (front + back) / 2 + 1, srx = (front - back) / 2 - 2, sry = S.ry + 5, scy = 1;
    var STL = '#c2bcb0', STB = '#9a948a', STD = '#77716a', STE = '#5e5a52', STH = '#d2ccc0';
    // 形＝胴の楕円 ∪ 魚のシルエットをぼかして丸めたもの
    var bb = bbox(ref), rK = ref.K;
    var X0 = bb[0] - 1, X1 = bb[2] + 1, Y0 = bb[1] - 1, Y1 = bb[3] + 1;
    var Wm = X1 - X0 + 1, mask = new Array(Wm * (Y1 - Y0 + 1));
    // 円形カーネル（半径√17）の占有率を行ごとの累積和で数える
    var PX0 = X0 - 5, PY0 = Y0 - 5, PW = X1 - X0 + 11, PH = Y1 - Y0 + 11, pre = new Int32Array(PH * (PW + 1));
    for (var py = 0; py < PH; py++) { var acc = 0; for (var pxx = 0; pxx < PW; pxx++) { if (ref.get(pxx + PX0, py + PY0)) acc++; pre[py * (PW + 1) + pxx + 1] = acc; } }
    var span = [], tot = 0;
    for (var v = -4; v <= 4; v++) { var hw = Math.floor(Math.sqrt(17 - v * v)); span.push(hw); tot += 2 * hw + 1; }
    for (var yy = Y0; yy <= Y1; yy++) for (var xx = X0; xx <= X1; xx++) {
      var cnt = 0;
      for (var vi = 0; vi < 9; vi++) { var row = (yy + vi - 4 - PY0) * (PW + 1), a0 = xx - span[vi] - PX0, a1 = xx + span[vi] - PX0 + 1; cnt += pre[row + a1] - pre[row + a0]; }
      var ex = (xx + 0.5 - scx) / srx, ey = (yy + 0.5 - scy) / sry;
      mask[(yy - Y0) * Wm + xx - X0] = cnt > tot * 0.8 || ex * ex + ey * ey <= 1;
    }
    var inS = function (x, y) { if (x < X0 || x > X1 || y < Y0 || y > Y1) return false; return mask[(y - Y0) * Wm + x - X0]; };
    g.stamp(function (x, y) {
      if (!inS(x, y)) return null;
      var dx = (x + 0.5 - scx) / (srx + 8), dy = (y + 0.5 - scy) / (sry + 3);
      var sh = dx * 0.5 + dy;
      if (!inS(x - 1, y - 1) || !inS(x - 2, y - 2) && sh < -0.2) return STL;
      if (!inS(x + 1, y + 1) || !inS(x + 2, y + 2) && sh > 0.2) return STD;
      if (hash(x + 99, y) > 0.93) return hash(x, y + 7) > 0.5 ? STH : STD;
      return STB;
    }, K, [X0, Y0, X1, Y1]);
    // 浮き彫り：元の魚の輪郭線を彫る（外周近くは省く）
    for (var y = Y0; y <= Y1; y++) for (var x = X0; x <= X1; x++) {
      if (ref.get(x, y) !== rK) continue;
      if (!inS(x - 1, y) || !inS(x + 1, y) || !inS(x, y - 1) || !inS(x, y + 1) || !inS(x - 2, y) || !inS(x + 2, y) || !inS(x, y - 2) || !inS(x, y + 2)) continue;
      g.set(x, y, STE);
      if (inS(x + 1, y + 1) && ref.get(x + 1, y + 1) !== rK && g.get(x + 1, y + 1) !== STE) g.set(x + 1, y + 1, STH);
    }
    // ひび
    var ck = '#4e4a44';
    g.line([[R(scx) - 4, -sry + 3], [R(scx) - 3, -sry + 4], [R(scx) - 3, -sry + 5], [R(scx) - 2, -sry + 6]], ck);
    g.line([[R(scx) - 6, 7], [R(scx) - 5, 8], [R(scx) - 4, 8]], ck);
    // 苔むした頭・地衣・小さな芽
    var mossX0 = scx - srx * 0.85, mossX1 = scx + srx * 0.35;
    for (y = Y0; y <= Y1; y++) for (x = X0; x <= X1; x++) {
      if (!inS(x, y) || x < mossX0 || x > mossX1) continue;
      var depth = 0; while (depth < 4 && inS(x, y - depth - 1)) depth++;
      var lim = 1 + Math.floor(hash(x >> 1, 3) * 3);
      if (depth < lim && hash(x, y + 5) > 0.15) g.set(x, y, depth === 0 ? WEED_L : (hash(x, y) > 0.5 ? WEED : '#2a6a2a'));
      else if (depth === lim && hash(x * 3, 9) > 0.7) g.set(x, y, '#2a6a2a');
    }
    for (y = Y0; y <= Y1; y++) for (x = X0; x <= X1; x++) if (inS(x, y) && g.get(x, y) === STB && hash(x * 13, y * 7) > 0.985) { g.set(x, y, '#d8d07a'); g.set(x + 1, y, '#b8b05a'); }
    var spx = R(scx - srx * 0.2), spy = Y0; while (spy < Y1 && !inS(spx, spy)) spy++;
    g.set(spx, spy - 1, '#2a8a2a'); g.set(spx, spy - 2, '#2a8a2a');
    g.set(spx - 1, spy - 3, WEED_L); g.set(spx - 2, spy - 3, WEED_L); g.set(spx - 2, spy - 4, '#1f6a2a'); g.set(spx + 1, spy - 3, WEED_L); g.set(spx + 2, spy - 4, WEED_L); g.set(spx + 2, spy - 5, '#1f6a2a');
    // 目（生きている）
    var E = eyeCenters(S, o);
    var et = o.eyes || 'normal';
    if (EYE_TYPES.indexOf(et) < 0 || et === 'love' || et === 'sparkle') et = 'normal';
    var ep = { B: STB, D: STD, L: STL, W: '#f6f4ec', K: '#3a3832' };
    drawEye(g, E.ex2, E.ey, E.r, et, ep, o.look || 'fwd');
    drawEye(g, E.ex1, E.ey, E.r, et, ep, o.look || 'fwd');
    g.K = K; g.keep = [PUPIL];
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
  var LOOK = { fwd: [0.75, -0.66], up: [0.15, -1], down: [0.3, 0.95], back: [-0.8, -0.5], front: [1, 0], center: [0, 0], fc: [0, -0.25] };
  var PUPIL = '#111111';
  var EYE_TYPES = ['normal', 'happy', 'x', 'dizzy', 'smug', 'sleepy', 'wide', 'stone', 'angry', 'blink', 'surprised', 'annoyed', 'love', 'teary', 'sparkle', 'closed', 'side'];
  function drawEye(g, ex, ey, r, type, p, look) {
    var K = p.K;
    if (type === 'closed') { // にっこり閉じ ^^（白目なし）
      var m0 = Math.max(2, Math.floor(r) - 1);
      for (var k0 = -m0; k0 < m0; k0++) { var a0 = Math.abs(k0 + 0.5), y0 = ey + Math.round(a0 * 0.9) - 1; g.set(ex + k0, y0, K); g.set(ex + k0, y0 + 1, K); }
      return;
    }
    var lid = type === 'happy' || type === 'sleepy' || type === 'stone' || type === 'blink';
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
      var ps = type === 'wide' ? 2 : (r >= 4.8 ? 4 : 3) + big;
      var off = type === 'wide' ? 0.3 : type === 'side' ? rr - ps / 2 - 0.4 : Math.max(0.5, r - ps / 2 - 1.1);
      pcx = ex + L[0] * off; pcy = ey + L[1] * off;
      px0 = R(pcx - ps / 2); py0 = R(pcy - ps / 2);
      for (j = 0; j < ps; j++) for (i = 0; i < ps; i++) put(px0 + i, py0 + j, PUPIL);
      if (ps >= 3) { put(px0, py0, p.W); if (ps >= 4) put(px0 + ps - 1, py0 + ps - 1, '#5a6a8a'); } // ハイライト
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
    } else if (type === 'dizzy') {
      for (var a = 0; a < Math.PI * 4.2; a += 0.12) {
        var sr2 = 0.3 + a * (r - 1.6) / (Math.PI * 4.2);
        put(Math.floor(ex + Math.cos(a) * sr2), Math.floor(ey + Math.sin(a) * sr2), K);
      }
    } else if (type === 'happy') {
      for (k = -m; k < m; k++) { var ak = Math.abs(k + 0.5), yk = ey + Math.round(ak) - 1; put(ex + k, yk, K); if (ak > m - 1) put(ex + k, yk + 1, K); }
      for (k = -m + 1; k < m - 1; k++) put(ex + k, ey + Math.round(Math.abs(k + 0.5)) + 1, p.L);
    } else if (type === 'sleepy') {
      for (k = -m; k < m; k++) { var bk = Math.abs(k + 0.5); put(ex + k, ey - (Math.round(bk) - 2), K); }
      put(ex - m - 1, ey - (Math.round(m + 0.5) - 2) - 1, K);
    } else if (type === 'stone') {
      for (k = -m; k < m; k++) put(ex + k, ey, K);
      for (k = -m + 1; k < m - 1; k++) put(ex + k, ey + 1, p.D);
    }
  }
  function drawEyesOnGrid(g, o, p, E, isFront) {
    var type = o.eyes || 'normal';
    if (EYE_TYPES.indexOf(type) < 0) type = 'normal';
    var look = o.look || 'fwd';
    if (isFront && look === 'fwd') look = 'fc';
    drawEye(g, E.ex2, E.ey, E.r, type, p, look);
    drawEye(g, E.ex1, E.ey, E.r, type, p, look);
    if (type === 'teary') { // こぼれる涙
      [E.ex2, E.ex1].forEach(function (ex, i) {
        if (!isFront && i === 0) return;
        var tx = ex + (isFront ? (i ? 2 : -3) : -2), ty = E.ey + Math.ceil(E.r) + 1;
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
  }

  // ---------- 魚人の手足（体の後ろに描く別レイヤー） ----------
  function segDist2(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
    var l2 = vx * vx + vy * vy, t = l2 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / l2)) : 0;
    var dx = wx - vx * t, dy = wy - vy * t;
    return dx * dx + dy * dy;
  }
  function buildLegs(o, frame, S, legLen) {
    var p = palOf(o), K = p.K;
    var ph = frame / 8 * Math.PI * 2;
    var cx = S.cx, ry = S.ry;
    var footB = 12 + legLen;          // 足裏の下端（この行は輪郭）
    var g = new Grid(64, footB + 34, 32, 22);
    g.K = K; g.keep = [];
    var hipY = ry - 3, ankY = footB - 3;
    var legs = [], arms = [];
    [[cx - 5, 0], [cx + 2, Math.PI]].forEach(function (L) {
      var hx = L[0], kn = R(Math.sin(ph + L[1]) * 1.2), mid = (hipY + ankY) / 2;
      legs.push([hx + 0.5, hipY, hx + 0.5 + kn + 0.6, mid], [hx + 0.5 + kn + 0.6, mid, hx + 0.5, ankY]);
    });
    var sw = Math.sin(ph) * 0.8;
    var ay0 = R(ry * 0.25), hy = R(ry) + 8;
    var hands;
    if (o.drown) { // おぼれて両手をばたばた上げる
      var w1 = Math.sin(ph * 2) * 2, w2 = Math.sin(ph * 2 + 2) * 2;
      var rx1 = cx + S.rx * 0.62 + 4, rx2 = cx - S.rx * 0.55 - 4, uy = -R(ry) - 7;
      arms.push([cx + S.rx * 0.5, ay0, rx1, ay0 - 3 + w1 * 0.5], [rx1, ay0 - 3 + w1 * 0.5, rx1 + 1 + w1 * 0.5, uy + w1]);
      arms.push([cx - S.rx * 0.45, ay0, rx2, ay0 - 3 + w2 * 0.5], [rx2, ay0 - 3 + w2 * 0.5, rx2 - 1 + w2 * 0.5, uy + w2]);
      hands = [[rx1 + 1 + w1 * 0.5, uy + w1 - 2], [rx2 - 1 + w2 * 0.5, uy + w2 - 2]];
    } else {
      arms.push([cx + S.rx * 0.55, ay0, cx + S.rx * 0.62 + 2.5, hy - 4 + sw], [cx + S.rx * 0.62 + 2.5, hy - 4 + sw, cx + S.rx * 0.62 + 2, hy + sw]);
      arms.push([cx - S.rx * 0.5, ay0, cx - S.rx * 0.55 - 2.5, hy - 4 - sw], [cx - S.rx * 0.55 - 2.5, hy - 4 - sw, cx - S.rx * 0.55 - 2, hy - sw]);
      hands = [[cx + S.rx * 0.62 + 2, hy + sw + 1], [cx - S.rx * 0.55 - 2, hy - sw + 1]];
    }
    var feet = [cx - 5, cx + 2];
    g.stamp(function (x, y) {
      var px = x + 0.5, py = y + 0.5, i;
      // 足（つま先は前）
      for (i = 0; i < 2; i++) {
        var fx = feet[i];
        if (y >= ankY && y < footB) {
          var w0 = fx - 1, w1 = fx + 4 - (y === ankY ? 2 : 0);
          if (x >= w0 && x <= w1) {
            if (y === footB - 1 && x === w1) return null;
            return y === footB - 1 ? p.D : p.F;
          }
        }
      }
      for (i = 0; i < legs.length; i++) if (segDist2(px, py, legs[i][0], legs[i][1], legs[i][2], legs[i][3]) <= 1.0) return x <= legs[i][0] - 0.5 + 0 ? p.L : p.F;
      for (i = 0; i < hands.length; i++) {
        var hdx = px - hands[i][0], hdy = py - hands[i][1];
        if (hdx * hdx + hdy * hdy <= 2.6) return p.F;
        var fyy = o.drown ? R(hands[i][1]) - 2 : R(hands[i][1]) + 2;
        if (y === fyy && (x === R(hands[i][0] - 2) || x === R(hands[i][0]) || x === R(hands[i][0] + 1))) return p.F;
      }
      for (i = 0; i < arms.length; i++) if (segDist2(px, py, arms[i][0], arms[i][1], arms[i][2], arms[i][3]) <= (o.drown ? 0.7 : 0.4)) return p.F;
      return null;
    }, K);
    if (o.frozen || o.stone || o.burnt) { /* 色はパレットで十分 */ }
    return g;
  }

  // 分裂：尾の付け根でつながった2匹（外向き）を1枚に合成
  function buildSplit(o, frame, S, gap) {
    var ext = Math.max(1, Math.ceil(gap / 2));
    var one = buildFish(merge(o, { glitch: false, frozen: false }), frame, S, ext);
    var bb = bbox(one);
    var shift = S.tb - ext;                // one の x=shift が合成の x=0 に来る
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
    // つながった所のしわ・汗
    g.set(0, -R(S.hp) - 2, K); g.set(-1, -R(S.hp) - 3, K);
    // キリトリ線
    for (var ky = -R(S.hp) - 6; ky <= R(S.hp) + 6; ky++) if (((ky + 60) % 3) !== 2) g.set(0, ky, '#ffffff'); else if (!g.get(0, ky)) g.set(0, ky, null);
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
  function buildKnot(o, frame, S, tframe) {
    var g = new Grid(100, 80, 50, 40);
    var p = palOf(o), K = p.K;
    var ph = frame / 8 * Math.PI * 2, pht = (tframe == null ? frame : tframe) / 8 * Math.PI * 2;
    g.K = K; g.keep = [PUPIL]; g.keepSep = p.W;
    var k0 = S.ry / 10.3;
    var ctrl = [[-20, 6], [-11, 6], [-3, 4], [5, -2], [8, -9], [3, -15], [-4, -14], [-8, -8], [-6, -1], [0, 4], [8, 7], [14, 6], [19, 4]];
    var pts = pathSamples(ctrl, 0.5);
    var rb = 4.3 * k0, rh = 8.6 * k0;
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
    var hq = pts[pts.length - 1], hx = hq.x, hy = hq.y, er = S.er * 0.86;
    var ex1 = R(hx + rh - er - 1.4), E = { ex1: ex1, ex2: ex1 - R(1.55 * er), ey: R(hy - rh * 0.38), r: er, front: R(hx + rh) };
    drawEyesOnGrid(g, o, p, E, false);
    var my = R(hy + rh * 0.32), fxm = R(hx + Math.sqrt(Math.max(0, rh * rh - (my + 0.5 - hy) * (my + 0.5 - hy)))) - 1;
    putMouth(g, mouthOf(o), fxm, my, false, p, K);
    g.set(E.ex1 - 3, E.ey + Math.ceil(er) + 1, BLUSH_S); g.set(E.ex1 - 2, E.ey + Math.ceil(er) + 1, BLUSH_S);
    // 締めつけのしわ
    g.line([[-2, -3], [-1, -2]], p.D); g.line([[2, 8], [3, 9]], p.D);
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
  function buildDragon(frame) {
    if (dragonCache[frame]) return dragonCache[frame];
    var g = new Grid(170, 100, 90, 52);
    var p = PAL.normal, K = O, ph = frame / 8 * Math.PI * 2;
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
    g.stamp(function (x, y) { for (var j = 0; j < spikes.length; j++) if (inPoly(x + 0.5, y + 0.5, spikes[j])) return ((x + y) & 1) ? '#ff7a3a' : '#e8442a'; return null; }, K, [-62, -30, 30, 20]);
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
        if (Math.abs(u) <= T[2] && Math.abs(v) <= Math.max(0.6, w)) return v < 0 ? '#ff8a4a' : '#e8442a';
      }
      return null;
    }, K, [hx - 24, hy - 15, hx - 1, hy + 14]);
    // 頭（金魚の丸い頭＋竜の鼻づら）
    var inA = function (px, py) { var a = (px - hx) / 9, b = (py - hy) / 8; return a * a + b * b <= 1; };
    var inB = function (px, py) { var a = (px - hx - 8) / 6.5, b = (py - hy - 2) / 4.6; return a * a + b * b <= 1; };
    g.stamp(function (x, y) {
      var px = x + 0.5, py = y + 0.5;
      if (!inA(px, py) && !inB(px, py)) return null;
      if (py > hy + 3.5) return p.P;
      if (!inA(px, py - 1.5) && !inB(px, py - 1.5)) return p.D;
      if (inB(px, py) && !inA(px, py) && py < hy + 0.5 && px > hx + 10) return p.L;
      return p.B;
    }, K, [hx - 11, hy - 10, hx + 16, hy + 9]);
    thicken(g, K);
    // 角（2本・金）
    var horns = [[hx - 2, hy - 7, hx - 6, hy - 13], [hx - 6, hy - 13, hx - 10, hy - 15], [hx - 5, hy - 11, hx - 3, hy - 15],
      [hx + 2, hy - 7.5, hx - 0.5, hy - 14], [hx - 0.5, hy - 14, hx - 3.5, hy - 17.5], [hx, hy - 12, hx + 2.5, hy - 15.5]];
    g.stamp(function (x, y) {
      for (var j = 0; j < horns.length; j++) { var h2 = horns[j]; if (segDist2(x + 0.5, y + 0.5, h2[0], h2[1], h2[2], h2[3]) <= 0.9) return (j < 3) ? '#e8b030' : '#ffd84a'; }
      return null;
    }, K, [hx - 14, hy - 21, hx + 6, hy - 5]);
    g.set(hx - 10, hy - 16, '#fff4a0'); g.set(hx - 4, hy - 18, '#fff4a0');
    // 目・鼻・口
    drawEye(g, hx + 1, hy - 2, 3.9, 'normal', p, 'fwd');
    g.line([[hx - 3, hy - 7], [hx - 2, hy - 7], [hx - 1, hy - 8], [hx, hy - 8], [hx + 1, hy - 8], [hx + 2, hy - 8], [hx + 3, hy - 7], [hx + 4, hy - 6]], K);
    g.set(hx + 12, hy - 1, K); g.set(hx + 13, hy - 1, K);
    g.line([[hx + 14, hy + 3], [hx + 13, hy + 4], [hx + 12, hy + 4], [hx + 11, hy + 4], [hx + 10, hy + 4], [hx + 9, hy + 4], [hx + 8, hy + 3], [hx + 7, hy + 3]], K);
    g.set(hx + 11, hy + 5, '#ffffff'); g.set(hx + 11, hy + 6, K);
    g.set(hx + 3, hy + 3, BLUSH); g.set(hx + 4, hy + 3, BLUSH);
    // ひげ（2本、ゆらゆら）
    for (var w = 0; w < 2; w++) for (var kk = 0; kk < 16; kk++) {
      var wx = hx + 14 + kk * (w ? 0.8 : 1.0), wy = hy + 1 + w * 2 + kk * 0.55 + Math.sin(kk * 0.45 - ph * 1.5 + w) * 1.6 * (kk / 16);
      g.set(R(wx), R(wy) + 1, K); g.set(R(wx), R(wy), w ? '#ffe890' : '#fff4c0');
    }
    g._bb = null;
    dragonCache[frame] = g;
    return g;
  }
  function dragonBlit(ctx, x, y, t, dir, sc, rot, flip) {
    var g = buildDragon(Math.floor((+t || 0) * 8) & 7);
    blit(ctx, g, x, y, { mirror: dir < 0, flip: !!flip, rot: rot || 0, scale: sc || 1, offx: -6, offy: 0 });
  }
  // 竜（約 120x50。dir<0 で左向き）
  function drawDragon(ctx, x, y, t, dir) { dragonBlit(ctx, x, y, t, dir, 1, 0, false); }

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
    e.stamp(function (x, y) { var dx = (x + 0.5) / 8, dy = (y + 0.5 + 9 - sy) / 5.5; return dx * dx + dy * dy <= 1 ? (y + 0.5 + 9 - sy < -2 ? p.L : p.B) : null; }, O, [-10, -18, 10, 0]);
    var ep = { B: p.B, D: p.D, L: p.L, W: p.W, K: O };
    [-4, 4].forEach(function (ex) {
      drawEye(e, ex, -11 + sy, 3.6, 'normal', ep, look);
      for (var i = -4; i <= 4; i++) { var cc = e.get(ex + i, -15 + sy); if (cc === p.W) e.set(ex + i, -15 + sy, p.B); var c2 = e.get(ex + i, -14 + sy); if (c2 === p.W) e.set(ex + i, -14 + sy, p.B); }
      e.line([[ex - 3, -16 + sy + (ex < 0 ? 0 : 1)], [ex - 2, -16 + sy + (ex < 0 ? 0 : 1)], [ex - 1, -15 + sy], [ex, -15 + sy], [ex + 1, -15 + sy], [ex + 2, -16 + sy + (ex < 0 ? 1 : 0)], [ex + 3, -16 + sy + (ex < 0 ? 1 : 0)]], O);
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
  function faceAt(ctx, cx, cy, Rr, t) {
    cx = R(cx); cy = R(cy);
    var k = function (v) { return R(v * Rr); }, th = Math.max(1, R(Rr * 0.04));
    var fin = Math.sin((+t || 0) * 4) * 0.08;
    ellipse(ctx, cx - k(1.05), cy + k(0.35), Rr * (0.35 + fin) + th, Rr * 0.18 + th, O); ellipse(ctx, cx - k(1.05), cy + k(0.35), Rr * (0.35 + fin), Rr * 0.18, '#f89a40');
    ellipse(ctx, cx + k(1.05), cy + k(0.35), Rr * (0.35 - fin) + th, Rr * 0.18 + th, O); ellipse(ctx, cx + k(1.05), cy + k(0.35), Rr * (0.35 - fin), Rr * 0.18, '#f89a40');
    ellipse(ctx, cx, cy, Rr + th * 2, Rr * 0.94 + th * 2, O);
    ellipse(ctx, cx, cy, Rr, Rr * 0.94, '#f08a30');
    ellipse(ctx, cx, cy + k(0.48), Rr * 0.72, Rr * 0.38, '#ffe0b0');
    ellipse(ctx, cx - k(0.45), cy - k(0.6), Rr * 0.16, Rr * 0.07, '#ffb060');
    ellipse(ctx, cx + k(0.2), cy - k(0.75), Rr * 0.1, Rr * 0.05, '#ffb060');
    [-1, 1].forEach(function (s) {
      var ex = cx + k(s * 0.38), ey = cy - k(0.18);
      ellipse(ctx, ex, ey, Rr * 0.28 + th, Rr * 0.28 + th, O);
      ellipse(ctx, ex, ey, Rr * 0.28, Rr * 0.28, '#fffaf0');
      ellipse(ctx, ex - k(s * 0.03), ey + k(0.03), Rr * 0.16, Rr * 0.16, PUPIL);
      ellipse(ctx, ex - k(s * 0.03) - k(0.06), ey - k(0.04), Math.max(0.6, Rr * 0.055), Math.max(0.6, Rr * 0.055), '#ffffff');
      ellipse(ctx, ex - k(s * 0.03) + k(0.06), ey + k(0.08), Math.max(0.5, Rr * 0.025), Math.max(0.5, Rr * 0.025), '#ffffff');
      ellipse(ctx, cx + k(s * 0.62), cy + k(0.2), Rr * 0.11, Rr * 0.05, BLUSH);
    });
    // つぶれた鼻（ガラスに押しつけ）
    ellipse(ctx, cx, cy + k(0.14), Rr * 0.2 + th, Rr * 0.12 + th, '#e08a48');
    ellipse(ctx, cx, cy + k(0.14), Rr * 0.2, Rr * 0.12, '#ffc890');
    ellipse(ctx, cx, cy + k(0.1), Rr * 0.13, Rr * 0.04, 'rgba(255,255,255,0.7)');
    ellipse(ctx, cx - k(0.07), cy + k(0.17), Math.max(0.6, Rr * 0.028), Math.max(0.6, Rr * 0.03), '#8a3a1a');
    ellipse(ctx, cx + k(0.07), cy + k(0.17), Math.max(0.6, Rr * 0.028), Math.max(0.6, Rr * 0.03), '#8a3a1a');
    // 口（ぺたっと）
    ellipse(ctx, cx, cy + k(0.42), Rr * 0.15 + th, Rr * 0.1 + th, O);
    ellipse(ctx, cx, cy + k(0.42), Rr * 0.15, Rr * 0.1, LIP);
    ellipse(ctx, cx, cy + k(0.43), Rr * 0.09, Rr * 0.055, MOUTH_IN);
    ellipse(ctx, cx, cy + k(0.46), Rr * 0.05, Rr * 0.025, TONGUE);
  }
  function drawBigFace(ctx, p, t) {
    p = Math.max(0, Math.min(1, +p || 0)); t = +t || 0;
    var Rr = 18 + 142 * p * p + 20 * p;
    var cy = 118 + R(Math.sin(t * 2) * Rr * 0.01) + R(p * 20);
    faceAt(ctx, 80, cy, Rr, t);
    // 息のくもり
    var br = 0.5 + 0.5 * Math.sin(t * 2.5);
    ellipse(ctx, 80, R(cy + Rr * 0.3), Rr * (0.3 + 0.08 * br), Rr * (0.14 + 0.04 * br), 'rgba(255,255,255,' + (0.12 + 0.1 * br).toFixed(2) + ')');
    if (p > 0.4) { // ガラスの映り込み
      ctx.fillStyle = 'rgba(255,255,255,' + (0.1 + 0.15 * p).toFixed(2) + ')';
      for (var i = 0; i < 40; i++) { ctx.fillRect(18 + i, 70 - i, 4, 1); ctx.fillRect(34 + i, 70 - i, 2, 1); ctx.fillRect(110 + i * 0.5 | 0, 200 - i, 2, 1); }
    }
  }
  function drawSpotlight(ctx, x, y, t) {
    t = +t || 0; x = R(x); y = R(y);
    var top = Math.min(y - 20, -2), H = y - top, fl = 0.05 * Math.sin(t * 7) + 0.03 * Math.sin(t * 13);
    for (var yy = top; yy <= y; yy++) {
      var k = (yy - top) / H, hw = R(5 + k * 20);
      ctx.fillStyle = 'rgba(255,240,150,' + (0.16 + fl).toFixed(3) + ')'; ctx.fillRect(x - hw, yy, hw * 2 + 1, 1);
      ctx.fillStyle = 'rgba(255,250,210,0.18)'; ctx.fillRect(x - R(hw * 0.45), yy, R(hw * 0.9) + 1, 1);
    }
    ellipse(ctx, x, y, 25, 5, 'rgba(255,245,170,0.35)');
    ellipse(ctx, x, y, 17, 3, 'rgba(255,255,220,0.35)');
    for (var i = 0; i < 7; i++) { var ph = (t * 0.3 + i / 7) % 1, k2 = (i * 0.137 + 0.2) % 1; if (Math.sin(t * 5 + i * 2) > 0.2) rect(ctx, x + R((k2 - 0.5) * (8 + ph * 30)), R(top + H * ph), 1, 1, '#fffbe0'); }
  }

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
    instant: { eyes: 'x', flip: true, mouth: 'tongue' },
    poison: { eyes: 'x', palette: 'poison', flip: true, fumes: true, mouth: 'tongue' },
    frozen: { frozen: true, eyes: 'wide' },
    flower: { flower: true, flowerStage: 3, eyes: 'happy', butterfly: true },
    burnt: { burnt: true, eyes: 'x', smoke: true },
    shock: { eyes: 'x', xray: 'blink', spark: true, lightning: true, flip: true },
    sucked: { eyes: 'dizzy', gone: true, icon: 'nozzle' },
    overpolished: { white: true, shine: true, sparkle: true, eyes: 'happy' },
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
    split: { split: true, eyes: 'wide', sweat: true },
    skeleton: { skeleton: true, eyes: 'sleepy', fly: true },
    overeat: { belly: true, eyes: 'happy', mouth: 1, sweat: true },
    cramped: { scale: 2, eyes: 'smug', sweat: true },
    fishman: { legs: true, drown: true, eyes: 'wide' },
    oldage: { wrinkles: true, eyes: 'sleepy' },
    // 追加の突然死
    stuck: { stuck: true },
    hiccupfly: { halo: true, wings: true, eyes: 'closed', mouth: 'smile' },
    knotted: { knot: true, eyes: 'dizzy', mouth: 'wavy' },
    flat: { flat: true, eyes: 'x', mouth: 'o' },
    nowake: { eyes: 'closed', soul: true },
    overhere: { gone: true, eyes: 'wide' },
    // 追加の結末
    dragon: { dragon: true },
    golden: { palette: 'gold', shine: true, sparkle: true, eyes: 'smug' },
    bald: { bald: true, eyes: 'teary', mouth: 'wavy', brows: 'worried' },
    hermit: { hermit: true },
    idol: { idol: true, eyes: 'sparkle', blush: true, mouth: 'grin' },
    round: { round: true, eyes: 'closed', mouth: 'smile', blush: true }
  };

  function merge(a, b) { var r = {}, k; for (k in a) r[k] = a[k]; for (k in b) if (b[k] !== undefined) r[k] = b[k]; return r; }

  var FLAG_KEYS = ['white', 'frozen', 'burnt', 'flower', 'moss', 'stone', 'skeleton', 'bones', 'belly', 'wrinkles', 'puff', 'balloon', 'spark', 'shine', 'glitch', 'blush', 'stuck', 'knot', 'flat', 'bald', 'idol', 'round'];
  function cached(key, fn) {
    var g = fishCache[key];
    if (!g) {
      if (fishCacheN > 400) { fishCache = {}; fishCacheN = 0; }
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

  function q20(v, lo, hi) { v = +v; if (!isFinite(v) || v === 0) v = 1; v = Math.max(lo, Math.min(hi, v)); return Math.round(v * 20) / 20; }

  function drawFish(ctx, x, y, opts) {
    var o = opts || {};
    if (o.variant && VARIANTS[o.variant]) o = merge(VARIANTS[o.variant], o);
    if (o.round && !o.puff) o = merge(o, { puff: true });
    if (o.balloon && !o.puff) o = merge(o, { puff: true });
    if (o.bubble && !o.mark) o = merge(o, { mark: o.bubble });
    var st = stageOf(o), S = STAGES[st];
    var tt = +o.t || 0;
    var frame = Math.floor(tt * 8) & 7;
    var wag = o.wag == null ? 1 : +o.wag; if (!isFinite(wag)) wag = 1;
    var tframe = Math.floor(tt * 8 * wag) & 7;
    if (o.stone || o.frozen || o.flat) frame = tframe = 0;
    if (o.stuck) tframe = ((Math.floor(tt * 7) % 5) < 2) ? (Math.floor(tt * 16) & 1) * 2 : 0; // 尾がぴくぴく
    // 振り返り：0=dir向き 0.5=正面 1=逆向き
    var tv = o.front ? 0.5 : (+o.turn || 0); tv = Math.max(0, Math.min(1, tv));
    var cs = Math.cos(Math.PI * tv), ac = Math.abs(cs);
    var noFront = !!(o.stone || o.bones || o.split || o.stuck || o.knot);
    var isFront = ac < 0.35 && !noFront;
    var turnBack = cs < 0 && !isFront;
    var tsx = isFront ? 1 : Math.max(0.3, ac);
    var qx = q20(tsx * (o.sx == null ? 1 : o.sx), 0.15, 3), qy = q20(o.sy == null ? 1 : o.sy, 0.15, 3);
    var mk = mouthOf(o);
    var key = st + '|' + frame + '|' + (o.eyes || 'normal') + '|' + mk + '|' + (o.palette || '') + '|' + (o.look || '');
    for (var i = 0; i < FLAG_KEYS.length; i++) if (o[FLAG_KEYS[i]]) key += '|' + FLAG_KEYS[i];
    if (o.flower) key += '|fs' + (o.flowerStage == null ? 3 : Math.round(+o.flowerStage || 0));
    if (o.xray) key += '|x' + (o.xray === 'blink' ? ((frame >> 1) & 1) : 0);
    if (tframe !== frame) key += '|w' + tframe;
    if (o.brows) key += '|b' + o.brows;
    if (o.cheeks) key += '|ch' + cheekBob(o);
    if (isFront) key += '|FRONT';
    var sc = o.scale === true ? 2 : (+o.scale || 1);
    var mirror = ((+o.dir || 1) < 0) !== turnBack;
    var bo = { mirror: mirror, flip: !!o.flip, rot: +o.rot || 0, scale: sc, offx: isFront ? 0 : S.vc, offy: 0 };
    var fxInfo = { front: isFront, fx: qx, fy: qy, mirror: mirror };
    if (o.hermit) { drawHermit(ctx, x, y + R(8 * sc), tt); return; }
    if (o.dragon) { dragonBlit(ctx, x, y, tt, mirror ? -1 : 1, sc, bo.rot, bo.flip); return; }
    if (o.wings && o.fx !== false) drawWings(ctx, x, y, o, sc, S, tt, fxInfo);
    if (o.flat || o.knot) {
      var gk = cached(key + (o.flat ? '|flat' : '|knot'), function () { return o.flat ? buildFlat(o, S) : buildKnot(o, frame, S, tframe); });
      if (o.flat) { bo.mirror = false; fxInfo.front = true; }
      bo.offx = 0;
      if (qx !== 1 || qy !== 1) { var gk0 = gk; gk = cached(key + (o.flat ? '|flat' : '|knot') + '|q' + qx + ',' + qy, function () { return squeeze(gk0, qx, qy, 0, 0); }); }
      blit(ctx, gk, x, y, bo);
      if (o.fx !== false) drawFishFx(ctx, x, y, o, sc, S, tt, fxInfo);
      if (o.mark) drawFishMark(ctx, x, y, o, sc, S, tt, fxInfo);
      return;
    }
    if (o.split) {
      var gap = typeof o.split === 'number' ? Math.max(0, Math.round(o.split)) : 2;
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
      var lkey = st + '|legs|' + frame + '|' + ll + '|' + (o.palette || '') + (o.white ? 'w' : '') + (o.frozen ? 'f' : '') + (o.burnt ? 'b' : '') + (o.stone ? 's' : '') + (o.wrinkles ? 'o' : '') + (o.drown ? 'd' : '');
      var lg = cached(lkey, function () { return buildLegs(o, frame, S, ll); });
      var lbo = merge(bo, {});
      if (isFront) { lbo.offx = S.cx - 1; lbo.mirror = false; }
      var lqx = isFront ? q20(o.sx == null ? 1 : o.sx, 0.15, 3) : qx;
      if (lqx !== 1 || qy !== 1) { var lg0 = lg; lg = cached(lkey + '|q' + lqx + ',' + qy + (isFront ? 'F' : ''), function () { return squeeze(lg0, lqx, qy, lbo.offx, 0); }); }
      blit(ctx, lg, x, y, lbo);
    }
    var g = cached(key, function () { return isFront ? buildFront(o, frame, S, tframe) : buildFish(o, frame, S, null, tframe); });
    if (qx !== 1 || qy !== 1) { var g0 = g; g = cached(key + '|q' + qx + ',' + qy, function () { return squeeze(g0, qx, qy, bo.offx, 0); }); }
    if (o.glitch) glitchGhosts(ctx, g, x, y, bo, frame);
    blit(ctx, g, x, y, bo);
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
    if (o.sparkle) drawSparkles(ctx, x, y, t, 22 * sc);
    if (o.sweat) {
      var sy = y - hh - 2 + (R(t * 6) % 3);
      var swx = o.split ? x : headX + dir * 2;
      drawDrop(ctx, swx - 4 * sc, sy); drawDrop(ctx, swx + 5 * sc, sy + 2);
    }
    if (o.balloon) { // 風船のひも（体の下に垂れる）
      var by0 = y + R(16 * sc), sw = Math.sin(t * 3);
      rect(ctx, x - 1, by0, 3, 2, O); rect(ctx, x, by0, 1, 1, '#f08a30');
      for (var k = 2; k < 18 * Math.max(0.6, sc); k++) rect(ctx, x + R(Math.sin(k * 0.45 + t * 4) * 1.5 * (k / 10) + sw * k * 0.05), by0 + k, 1, 1, '#fff8e8');
    }
    if (o.halo) drawHalo(ctx, headX - dir * R(2 * sc), o.flip ? y + hh + R(5 * sc) : y - hh - R(5 * sc), sc, t);
    if (o.soul) drawSoul(ctx, x + dir * R(4 * sc), y - hh - R(14 * sc), t, sc < 0.9 ? Math.max(0.4, sc) : 1);
    if (o.stuck) { var ckx = x + dir * R((S.cx - 1 - S.vc) * sc * info.fx); drawCrack(ctx, ckx, y - R(2 * sc), 0.55 * sc); }
    if (o.butterfly) drawButterfly(ctx, headX + R(Math.cos(t * 1.7) * 12 * sc), (o.flip ? y + hh + 16 * sc : y - hh - 16 * sc) + R(Math.sin(t * 3.4) * 4), t);
    if (o.fly) { var fa = t * 4; drawFly(ctx, x + R(Math.cos(fa) * 20 * sc), y - hh + R(Math.sin(fa * 1.3) * 6 * sc) - 4, t); }
    if (o.idol) {
      var nt = (t * 0.8) % 1, na = ctx.globalAlpha; ctx.globalAlpha = na * (1 - nt);
      drawMark(ctx, x - dir * R(14 * sc), y - hh - R(nt * 14), (Math.floor(t * 0.8) & 1) ? 'heart' : 'note', t, sc);
      ctx.globalAlpha = na;
    }
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
      var wy = 22 + R(Math.sin(wx * 0.13 + t * 2.2) * 1.1 + Math.sin(wx * 0.31 - t * 1.3) * 0.6);
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
    drawSeaweed(ctx, 20, 226, 140, 0, t, 5);
    drawSeaweed(ctx, 32, 226, 104, 1.7, t, 4);
    drawSeaweed(ctx, 12, 226, 96, 3.1, t, 3);
    drawSeaweed(ctx, 40, 226, 62, 4.4, t, 3);
    // 右の丸葉の水草
    var sw = R(Math.sin(t * 1.2) * 1);
    var stems = [[132, 226, 128, 196], [142, 226, 146, 184], [124, 226, 116, 200], [150, 226, 156, 204]];
    stems.forEach(function (s, i) {
      var ex = s[2] + (i % 2 ? sw : -sw);
      var n = s[1] - s[3];
      for (var j = 0; j <= n; j++) {
        var px = R(s[0] + (ex - s[0]) * j / n), py = s[1] - j;
        rect(ctx, px - 1, py, 3, 1, O); rect(ctx, px, py, 1, 1, WEED);
      }
    });
    var lv = [[128, 194, 6, 3], [146, 182, 6, 4], [114, 199, 5, 3], [156, 203, 5, 3], [136, 206, 5, 3], [122, 212, 5, 3], [150, 214, 6, 3], [140, 196, 4, 3], [132, 186, 4, 3]];
    lv.forEach(function (l, i) { leaf(ctx, l[0] + (i % 2 ? sw : -sw), l[1], l[2], l[3]); });
    // 石
    rock(ctx, 24, 221, 8, 5); rock(ctx, 40, 223, 6, 4); rock(ctx, 136, 222, 8, 5); rock(ctx, 151, 222, 5, 4);
    // 砂
    for (var sx = 0; sx < 160; sx++) {
      var top = 224 + ((sx * 7 + (sx >> 2) * 3) % 5 < 2 ? 0 : 1) + (Math.sin(sx * 0.25) > 0.6 ? -1 : 0);
      rect(ctx, sx, top, 1, 1, '#a86a3a');
      rect(ctx, sx, top + 1, 1, 240 - top - 1, SAND);
    }
    rect(ctx, 0, 235, 160, 5, SAND_B);
    for (var dy = 226; dy < 240; dy += 2) for (var dx = 0; dx < 160; dx += 3) {
      var hv = hash(dx, dy);
      if (hv > 0.72) rect(ctx, dx + (dy & 1), dy, hv > 0.9 ? 2 : 1, 1, SAND_D);
      else if (hv < 0.06) rect(ctx, dx, dy, 1, 1, '#ffd8a0');
    }
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
      if (dirt >= 3) { // 砂の上のヘドロ
        ctx.fillStyle = 'rgba(70,90,30,0.55)';
        for (var m = 0; m < 160; m += 2) if (hash(m, 99) > 0.4) ctx.fillRect(m, 222 + (m % 3 ? 1 : 0), 3, 2 + (dirt - 3) * 2);
      }
    }
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
  var BIRD = [0, 1].map(function (fr) {
    var g = new Grid(32, 24, 16, 12);
    var Wc = '#f4f4f0', Gr = '#a8b0b8', Bk = '#3a4048', Bk2 = '#f0a030';
    var wy = fr ? 4 : -8; // 羽先の高さ
    g.stamp(function (x, y) {
      var px = x + 0.5, py = y + 0.5;
      // 羽（付け根 (-2,0)〜羽先 (±?,wy)）
      for (var side = 0; side < 2; side++) {
        var ax = -1, ay = 0, bx = side ? -11 : 3, by = side ? wy : wy * 0.8;
        var d2 = segDist2(px, py, ax, ay, bx, by);
        var lim = 2.6 - 1.6 * Math.min(1, ((px - ax) * (px - ax) + (py - ay) * (py - ay)) / ((bx - ax) * (bx - ax) + (by - ay) * (by - ay)));
        if (d2 <= Math.max(0.5, lim)) return Math.abs(px - bx) + Math.abs(py - by) < 2.5 ? Bk : Gr;
      }
      var dx = (px - 0) / 7, dy = (py - 2) / 3.2; if (dx * dx + dy * dy <= 1) return py > 3 ? Gr : Wc; // 胴
      var hx = px - 7, hy = py; if (hx * hx + hy * hy <= 6.5) return Wc; // 頭
      if (px > -11 && px < -6 && py > 1 && py < 4 && py - 2 < (-6 - px) * 0.6) return Wc; // 尾
      if (px >= 9 && px <= 12.5 && py >= 0 && py <= 1.6) return Bk2; // くちばし
      return null;
    }, O);
    g.set(7, -1, O); g.set(8, -1, O);
    g.K = O; g.keep = [O];
    return g;
  });
  // 空を飛ぶ鳥（シルエット）
  function drawBird(ctx, x, y, t, dir) { blit(ctx, BIRD[Math.floor((t || 0) * 6) & 1], x, y, { mirror: dir < 0 }); }

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
  var TAILFIN = art(['...oBBBBBo...', '...oBDBBBo...', '....oBBBo....', '....oBBBo....', '...oFFFFFo...', '..oFFLFLFFo..', '.oFFLFoFLFFo.', '.oFLFFoFFLFo.', 'oFFLFo.oFLFFo', 'oFLFo...oFLFo', 'oFFo.....oFFo', 'ooo.......ooo'],
    { o: O, F: '#f89a40', L: '#ffb060', B: '#f08a30', D: '#d4661f' });
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
    return { sag: sag, tilt: tilt, t: t, wet: !!o.wet, drip: !!o.drip, c: Math.cos(tilt), s: Math.sin(tilt), D: 17 + 12 * sag };
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
    var bx = NET_RX - 1, by = 0, s0 = part === 'wood' ? 7 : 0, s1 = part === 'wood' ? 290 : 9;
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

  // 猫の手（約25x26、原点＝手のひらの中心）。上に腕が伸びる。肉球と出した爪
  var PAW = (function () {
    var g = new Grid(30, 34, 15, 18);
    var A = '#b8b0a8', Al = '#d0c8c0', st = '#7c7670', pk = '#ff9ab0', pkd = '#e06a88';
    var toes = [[-7.5, 7], [-2.5, 9], [2.5, 9], [7.5, 7]];
    g.stamp(function (x, y) {
      var px = x + 0.5, py = y + 0.5, i;
      var inArm = px >= -8 && px <= 8 && py <= 0 && py >= -18;
      var dx = px / 11.5, dy = (py - 2) / 7.5, inPalm = dx * dx + dy * dy <= 1;
      var inToe = -1;
      for (i = 0; i < 4; i++) { var tx = px - toes[i][0], ty = py - toes[i][1]; if (tx * tx + ty * ty <= 9.5) inToe = i; }
      if (!inArm && !inPalm && inToe < 0) return null;
      // 肉球
      var pdx = px / 4.6, pdy = (py - 2.5) / 3.2;
      if (pdx * pdx + pdy * pdy <= 1) return py > 3.5 ? pkd : pk;
      if (inToe >= 0) { var bx = px - toes[inToe][0], by = py - toes[inToe][1] - 0.6; if (bx * bx + by * by <= 2.2) return pk; }
      // しま模様（腕）
      if (inArm && py < -4 && ((y + 40) % 6 < 2) && Math.abs(px) > 2.5) return st;
      if (px < -5 && py < 2) return Al;
      return A;
    }, O);
    // 指の間の線
    [-5, 0, 5].forEach(function (x) { g.set(x, 8, O); g.set(x, 9, O); });
    // 爪（白、内側へ曲がる）
    toes.forEach(function (t, i) {
      var tx = Math.round(t[0]), ty = Math.round(t[1]) + 3, c = i < 2 ? 1 : -1;
      g.set(tx, ty, '#ffffff'); g.set(tx, ty + 1, '#ffffff'); g.set(tx + c, ty + 2, '#ffffff');
      g.set(tx - c, ty + 1, '#9aa0a8'); g.set(tx - c, ty, O); g.set(tx + c, ty + 3, O); g.set(tx, ty + 2, O);
    });
    g.K = O; g.keep = ['#ffffff', pk];
    return g;
  })();
  // opts（省略可）: { fish: true で爪に引っかけた金魚, t: 秒 }
  function drawCatPaw(ctx, x, y, opts) {
    x = R(x); y = R(y);
    var o = opts && typeof opts === 'object' ? opts : {};
    if (o.fish) drawFish(ctx, x + 1, y + 17, { scale: 0.7, eyes: 'x', t: 0, rot: 0.2, dir: 1, fx: false });
    var top = y - 18;
    if (top > 0) {
      rect(ctx, x - 9, 0, 1, top, O); rect(ctx, x + 9, 0, 1, top, O);
      rect(ctx, x - 8, 0, 17, top, '#b8b0a8'); rect(ctx, x - 8, 0, 3, top, '#d0c8c0');
      for (var yy = top - 2; yy > -2; yy -= 6) { rect(ctx, x - 8, yy, 6, 2, '#7c7670'); rect(ctx, x + 3, yy, 6, 2, '#7c7670'); }
    }
    blit(ctx, PAW, x, y);
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

  var DUCK = art([
    '...........oooo.........',
    '..........oYYhYo........',
    '.........oYYhhYYo.......',
    '.........oYYYYKYYo......',
    '.........oYYYYYYYoooo...',
    '.........oYYYYYYoBBBBo..',
    '..........oYYYYYYobbbo..',
    '...........oYYYYYoooo...',
    '.oo........oYYYYYo......',
    'oYYo......oYYYYYYYo.....',
    'oYYYoooooYYYYYYYYYYo....',
    'oYYYYYYYYYYYYYYYYYYYo...',
    'oYYyYYYYYYYYYYYYYYYYo...',
    '.oYYyyYYYYYYYYYYYYYo....',
    '.oYYYyyyyYYYYYYYYYYo....',
    '..oYYYYYYYYYYYYYYYo.....',
    '...ooooooooooooooo......'], { o: O, Y: '#ffd83a', y: '#f0b020', h: '#fff6a8', K: O, B: '#f08030', b: '#c85a20' });
  function drawDuck(ctx, x, y, t) {
    var by = R(Math.sin((t || 0) * 3) * 1);
    blit(ctx, DUCK, x, y + by);
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
  function drawThought(ctx, x, y, icon) {
    blit(ctx, CLOUD, x, y);
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
    rect(ctx, x + 1, y, w - 2, h, O); rect(ctx, x, y + 1, w, h - 2, O);
    rect(ctx, x + 1, y + 1, w - 2, h - 2, CREAM);
    var ih = h - 4, fh = R(ih * value / max);
    var full = value >= max;
    if (fh > 0) {
      var fy = y + 2 + ih - fh;
      var main = full ? '#ffd83a' : '#f09a3a', hi = full ? '#fff6a0' : '#ffc070', sh = full ? '#e0b020' : '#d27a2a';
      rect(ctx, x + 2, fy, 4, fh, main);
      rect(ctx, x + 2, fy, 1, fh, hi);
      rect(ctx, x + 5, fy, 1, fh, sh);
      rect(ctx, x + 2, fy, 4, 1, hi);
      if (full) for (var k = fy + 6; k < fy + fh - 2; k += 14) rect(ctx, x + 3, k, 1, 3, '#ffffff');
    }
  }

  function drawIconSlot(ctx, icon) {
    var x = 136, y = 4, w = 20, h = 20;
    rect(ctx, x + 1, y, w - 2, h, O); rect(ctx, x, y + 1, w, h - 2, O);
    rect(ctx, x + 1, y + 1, w - 2, h - 2, CREAM);
    rect(ctx, x + 2, y + h - 2, w - 4, 1, '#e8dcc0');
    if (icon) drawIcon(ctx, x + 10, y + 10, icon);
  }

  var FONT = '"Hiragino Maru Gothic ProN","Hiragino Kaku Gothic ProN","Noto Sans CJK JP","Noto Sans JP","Yu Gothic",sans-serif';

  // 死因ミニ絵（札・図鑑で使用）。size<=1: 図鑑用の小さな絵（魚は scale 0.5*size）
  // size>1: 小物つきの場面（約 31*size x 21*size に収まる。size=2 で魚は等倍）
  function drawCauseIcon(ctx, x, y, id, size, t) {
    size = size || 1; t = t || 0;
    var big = size > 1, fs = 0.5 * size, u = size / 2;
    x = R(x); y = R(y);
    var F = function (dx, dy, o) { drawFish(ctx, x + R(dx * u), y + R(dy * u), merge(merge(VARIANTS[id] || {}, { scale: fs, t: t, rot: 0, fx: big }), o || {})); };
    var surf = function (dy) { // 水面
      var yy = y + R(dy * u);
      rect(ctx, x - R(34 * u), yy - R(8 * u), R(68 * u), R(8 * u), AIR);
      rect(ctx, x - R(34 * u), yy, R(68 * u), 1, '#f4f0d8'); rect(ctx, x - R(34 * u), yy + 1, R(68 * u), 1, '#3fb8ac');
    };
    var sand = function (dy) { var yy = y + R(dy * u); rect(ctx, x - R(34 * u), yy, R(68 * u), 1, '#a86a3a'); rect(ctx, x - R(34 * u), yy + 1, R(68 * u), R(12 * u), SAND); };
    var glass = function (dx) { var gx = x + R(dx * u); ctx.fillStyle = 'rgba(220,250,255,0.35)'; ctx.fillRect(gx, y - R(30 * u), 2, R(60 * u)); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(gx, y - R(30 * u), 1, R(60 * u)); };
    var sc1 = big ? 1 : 0;
    switch (id) {
      case 'instant':
        if (big) { surf(-17); drawSplash(ctx, x - 6, y - 17, 0.45); drawBubble(ctx, x + 16, y - 6, 2); drawBubble(ctx, x + 20, y - 11, 1); }
        else { rect(ctx, x - 5, y - 8, 1, 1, '#ffffff'); rect(ctx, x + 4, y - 8, 1, 1, '#ffffff'); rect(ctx, x - 1, y - 9, 2, 1, '#ffffff'); }
        F(0, big ? 4 : 2); break;
      case 'poison':
        F(big ? -3 : 0, big ? 4 : 2);
        if (big) { drawPellet(ctx, x + 22, y - 10, 'poison', t); drawBubble(ctx, x + 10, y + 12, 1); } else drawPellet(ctx, x + 7, y - 6, 'poison');
        break;
      case 'frozen':
        F(0, 0);
        if (big) { drawPellet(ctx, x - 24, y - 12, 'ice'); drawPellet(ctx, x + 25, y + 12, 'ice'); for (var fz = 0; fz < 6; fz++) rect(ctx, x - 28 + fz * 11, y - 20 + (fz % 2) * 3, 1, 1, '#ffffff'); }
        break;
      case 'flower':
        F(0, big ? 7 : 4, big ? { t: t + 0.6 } : null); break;
      case 'burnt':
        F(big ? -8 : 0, big ? 4 : 1, { smoke: big });
        if (big) { drawFlame(ctx, x + 15, y + 5, 1, t); ellipse(ctx, x - 8, y + 20, 18, 2, 'rgba(40,30,20,0.35)'); }
        else drawSmoke(ctx, x + 2, y - 4, 0.35);
        break;
      case 'shock':
        F(0, 0, { xray: true, flip: false, lightning: false });
        if (big) { drawLightning(ctx, x - 25, y - 2, t); drawLightning(ctx, x + 25, y + 2, t + 0.4); drawPellet(ctx, x + 16, y - 15, 'spark', t); }
        else { rect(ctx, x + 6, y - 9, 1, 2, '#ffe23a'); rect(ctx, x + 5, y - 7, 2, 1, '#ffe23a'); rect(ctx, x + 5, y - 6, 1, 2, '#ffe23a'); }
        break;
      case 'sucked':
        if (big) { drawNozzle(ctx, x + 6, y - 6, { tail: true, suck: true, t: t }); rect(ctx, x - 26, y + 14, 2, 2, '#7a8a3a'); rect(ctx, x + 18, y + 16, 2, 1, '#8a6a3a'); drawScale(ctx, x - 14, y + 4, t * 3); }
        else drawNozzle(ctx, x, y - 2, { tail: true });
        break;
      case 'overpolished':
        F(big ? -4 : 0, big ? 2 : 0);
        if (big) { drawBrush(ctx, x + 24, y + 2, 0); drawBubble(ctx, x - 22, y - 12, 3); drawBubble(ctx, x - 16, y - 18, 2); drawBubble(ctx, x + 12, y - 18, 2); }
        else drawSparkles(ctx, x, y, 0.15, 9);
        break;
      case 'cat':
        if (big) {
          surf(-14);
          ellipse(ctx, x - 14, y - 24, 2, 2, '#ffd83a'); ellipse(ctx, x + 14, y - 24, 2, 2, '#ffd83a'); rect(ctx, x - 14, y - 26, 1, 4, O); rect(ctx, x + 14, y - 26, 1, 4, O);
          drawCatPaw(ctx, x, y - 5, { fish: true, t: t });
          for (var cs = 0; cs < 3; cs++) rect(ctx, x + 20 + cs * 3, y + 6 - cs, 1, 7, 'rgba(255,255,255,0.7)');
        } else blit(ctx, PAW, x, y - 2, { scale: 0.65 });
        break;
      case 'bird':
        if (big) { surf(-6); drawBird(ctx, x + 14, y - 15, t); blit(ctx, TAILFIN, x + 27, y - 12, { scale: 0.45, rot: -1.2 }); drawFeather(ctx, x - 8, y + 6, 0.4); drawFeather(ctx, x - 20, y + 14, 1.4); }
        else drawFeather(ctx, x, y, 0);
        break;
      case 'dizzy':
        F(0, big ? 5 : 2, { stars: big });
        if (!big) blit(ctx, STAR, x + 5, y - 7);
        break;
      case 'bubblegone':
        if (big) { drawBubble(ctx, x - 6, y - 3, 13); drawPop(ctx, x - 6, y - 3, 13, 0.3); drawEyeball(ctx, x + 14, y + 11); drawBubble(ctx, x + 14, y - 14, 2); drawBubble(ctx, x + 20, y - 4, 3); drawBubble(ctx, x - 24, y + 12, 1); }
        else { drawBubble(ctx, x - 1, y - 1, 7); drawEyeball(ctx, x + 6, y + 5); }
        break;
      case 'floataway':
        if (big) { surf(2); ellipse(ctx, x + 20, y - 18, 6, 2, '#ffffff'); ellipse(ctx, x + 16, y - 19, 4, 2, '#ffffff'); drawBird(ctx, x - 22, y - 16, t, 1); }
        F(0, big ? -6 : -1, { rot: big ? -0.15 : 0, scale: fs * 0.85 });
        break;
      case 'netted':
        if (big) { drawNetMini(ctx, x, y + 3, true); for (var nd = 0; nd < 3; nd++) drawDrop(ctx, x - 6 + nd * 6, y + 18 + ((R(t * 6) + nd) % 3)); }
        else drawIcon(ctx, x, y, 'net');
        break;
      // --- 追加の突然死 ---
      case 'stuck':
        if (big) { glass(1); F(-6, 2, { t: t, fx: false }); drawCrack(ctx, x + 1, y, 0.7); drawDrop(ctx, x - 20, y - 12); for (var sl = 0; sl < 3; sl++) rect(ctx, x + 5 + sl * 3, y - 14 + sl * 2, 3, 1, '#ffffff'); }
        else { glass(6); F(-2, 1); drawCrack(ctx, x + R(6 * u) - 1, y, 0.45); }
        break;
      case 'hiccupfly':
        if (big) { surf(-17); for (var hl = 0; hl < 4; hl++) rect(ctx, x - 12 + hl * 8, y + 14 + (hl & 1) * 3, 1, 6, 'rgba(255,255,255,0.6)'); }
        F(0, big ? 4 : 3, { fx: true, scale: fs * (big ? 1 : 0.9) });
        break;
      case 'knotted':
        F(0, big ? 2 : 0, { scale: fs * (big ? 1 : 0.9) });
        if (big) { drawMark(ctx, x + 24, y - 14, '?', t, 1); drawDrop(ctx, x - 20, y - 12); }
        break;
      case 'flat':
        if (big) { ctx.fillStyle = 'rgba(220,250,255,0.25)'; ctx.fillRect(x - 34, y - 24, 68, 48); }
        F(0, 0, { scale: fs * (big ? 1 : 0.8) });
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        for (var fl = 0; fl < R(12 * u); fl++) { ctx.fillRect(x - R(16 * u) + fl, y - R(4 * u) - fl, 2, 1); ctx.fillRect(x + R(2 * u) + fl, y + R(8 * u) - fl, 1, 1); }
        break;
      case 'nowake':
        if (big) { sand(14); F(0, 9, { soul: false, flip: false }); drawSoul(ctx, x + 6, y - 12, t); }
        else { F(0, 5, { soul: false }); drawSoul(ctx, x + 2, y - 5, t, 0.4); }
        break;
      case 'overhere':
        if (big) { faceAt(ctx, x + 4, y + 2, 19, t); drawSmear(ctx, x - 24, y - 12, 0.55); ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (var ov = 0; ov < 14; ov++) ctx.fillRect(x + 14 + ov, y - 6 - ov, 2, 1); }
        else faceAt(ctx, x, y + 1, 7.5, 0);
        break;
      // --- 結末 ---
      case 'bug':
        F(0, 0, { t: 0.375 }); break;
      case 'duck':
        if (big) { surf(-6); drawDuck(ctx, x, y - 10, 0); drawSparkles(ctx, x, y, t + 0.2, 26); drawMark(ctx, x - 16, y + 8, '?', t, 1); }
        else { drawIcon(ctx, x, y, 'duck'); }
        break;
      case 'moss':
        if (big) sand(14);
        F(0, big ? 3 : 1); break;
      case 'stone':
        if (big) sand(14);
        F(0, big ? 3 : 1); break;
      case 'split':
        F(0, 0, { split: big ? 3 : 1, scale: fs * (big ? 0.62 : 0.6) });
        if (big) { var scs = art(['oo...oo', 'oWo.oWo', '.oWoWo.', '..oKo..', '.oWoWo.', 'oKKo.oKK', 'oKKo.oKK'], { o: O, W: '#e8f0f0', K: '#f04a3a' }); blit(ctx, scs, x, y - 16); }
        break;
      case 'skeleton':
        F(0, 0, big ? { t: t + 0.3 } : null);
        if (!big) drawFly(ctx, x + 7, y - 6, 0.1);
        break;
      case 'overeat':
        if (big) { drawPellet(ctx, x - 24, y + 14, 'normal'); drawPellet(ctx, x + 24, y + 16, 'normal'); drawPellet(ctx, x + 18, y + 18, 'normal'); }
        F(0, big ? -4 : -2); break;
      case 'cramped':
        if (big) { // 四角い水槽にぎっちり。ガラスに頬が押しつく
          rect(ctx, x - 28, y - 18, 56, 36, O); rect(ctx, x - 27, y - 17, 54, 34, WATER);
          rect(ctx, x - 27, y + 14, 54, 3, SAND);
          F(-1, 0, { scale: 1.3, eyes: 'dizzy', sweat: false, sx: 0.92 });
          ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(x + 25, y - 6, 2, 12); ctx.fillStyle = 'rgba(255,200,180,0.8)'; ctx.fillRect(x + 23, y - 4, 2, 8);
          rect(ctx, x - 29, y - 19, 58, 1, O); rect(ctx, x - 29, y + 18, 58, 1, O); rect(ctx, x - 29, y - 19, 1, 38, O); rect(ctx, x + 28, y - 19, 1, 38, O);
        } else {
          F(0, 0, { scale: fs * 1.25 });
          rect(ctx, x - 9, y - 7, 18, 1, O); rect(ctx, x - 9, y + 6, 18, 1, O); rect(ctx, x - 9, y - 7, 1, 14, O); rect(ctx, x + 8, y - 7, 1, 14, O);
        }
        break;
      case 'fishman':
        if (big) { surf(-17); drawFloatRing(ctx, x + 20, y - 19, t); }
        F(0, big ? 0 : -5, { legLen: big ? 6 : 4 }); break;
      case 'oldage':
        F(0, big ? -2 : -1); break;
      case 'dragon':
        if (big) { ellipse(ctx, x - 18, y + 14, 10, 3, 'rgba(255,255,255,0.6)'); ellipse(ctx, x + 20, y - 16, 9, 3, 'rgba(255,255,255,0.6)'); dragonBlit(ctx, x - 4, y + 2, t, 1, 0.45, -0.15, false); drawSparkles(ctx, x, y, t, 26); }
        else dragonBlit(ctx, x, y, 0.2, 1, 0.16, -0.55, false);
        break;
      case 'golden':
        if (big) { sand(14); }
        F(0, big ? 5 : 1, big ? null : { fx: false });
        if (!big) { rect(ctx, x - 6, y - 7, 1, 3, '#ffffff'); rect(ctx, x - 7, y - 6, 3, 1, '#ffffff'); }
        break;
      case 'bald':
        F(big ? -2 : 0, big ? -2 : 1);
        if (big) { drawScale(ctx, x + 20, y + 10 + (R(t * 8) % 4), t * 2); drawScale(ctx, x - 22, y + 16, 1.2); drawScale(ctx, x + 6, y + 19, 2.4); drawScale(ctx, x - 12, y - 16 + (R(t * 6) % 3), 0.6); }
        else drawScale(ctx, x + 6, y + 6, 0.8);
        break;
      case 'hermit':
        if (big) { sand(14); drawHermit(ctx, x, y + 15, t + 0.3); drawNetMini(ctx, x + 26, y - 18, false); drawMark(ctx, x - 20, y - 6, 'anger', t, 1); }
        else { rect(ctx, x - 10, y + 5, 20, 5, SAND); drawHermit(ctx, x, y + 6, 0.3); }
        break;
      case 'idol':
        if (big) { drawSpotlight(ctx, x, y + 18, t); F(0, 0); drawMark(ctx, x - 24, y - 10, 'heart', t, 1); drawMark(ctx, x + 24, y - 14, 'note', t, 1); }
        else F(0, 3);
        break;
      case 'round':
        if (big) { sand(16); drawPellet(ctx, x - 22, y + 14, 'normal'); }
        F(0, big ? 0 : 1, { scale: fs * 0.9 });
        break;
      default:
        F(0, 0);
    }
  }

  function drawCard(ctx, cause, isNew) {
    cause = cause || { id: '', name: '？？？', kind: 'sudden' };
    var cx = 80, x = 10, y = 40, w = 140, h = 146;
    // 影
    ctx.fillStyle = 'rgba(29,77,74,0.35)'; ctx.fillRect(x + 3, y + 4, w, h);
    rect(ctx, x + 1, y, w - 2, h, O); rect(ctx, x, y + 1, w, h - 2, O);
    rect(ctx, x + 1, y + 1, w - 2, h - 2, CREAM);
    rect(ctx, x + 3, y + 3, w - 6, 1, '#efe2c4'); rect(ctx, x + 3, y + h - 4, w - 6, 1, '#efe2c4');
    // 見出し帯
    var ending = cause.kind === 'ending';
    rect(ctx, x + 1, y + 1, w - 2, 13, ending ? '#3a9a8a' : '#d85a4a');
    rect(ctx, x + 1, y + 14, w - 2, 1, O);
    ctx.fillStyle = '#fff8e8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 9px ' + FONT;
    ctx.fillText(ending ? '― けつまつ ―' : '― しいん ―', cx, y + 8);
    // ミニ絵（2倍ドットで大きく）
    var bw = 124, bh = 96, bx = cx - bw / 2, by = y + 19;
    rect(ctx, bx - 1, by - 1, bw + 2, bh + 2, O);
    rect(ctx, bx, by, bw, bh, WATER);
    rect(ctx, bx, by + bh - 6, bw, 6, SAND); rect(ctx, bx, by + bh - 7, bw, 1, '#a86a3a');
    for (var k = 0; k < bw; k += 5) rect(ctx, bx + k + ((k / 5) & 1), by + bh - 4 + ((k / 5) % 3 === 0 ? 1 : 0), 2, 1, SAND_D);
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    if (typeof ctx.scale === 'function') {
      ctx.translate(cx, by + 45); ctx.scale(2, 2);
      drawCauseIcon(ctx, 0, 0, cause.id, 2, 0.2);
    } else drawCauseIcon(ctx, cx, by + 45, cause.id, 2, 0.2);
    ctx.restore();
    // 名前
    ctx.fillStyle = O; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var name = cause.name || '？？？';
    var size = 13; ctx.font = 'bold 13px ' + FONT;
    while (size > 8 && ctx.measureText(name).width > w - 10) { size--; ctx.font = 'bold ' + size + 'px ' + FONT; }
    ctx.fillText(name, cx, y + h - 15);
    // NEW
    if (isNew) {
      var nx = x + w - 22, ny = y - 6;
      rect(ctx, nx, ny, 26, 12, O); rect(ctx, nx + 1, ny + 1, 24, 10, '#ffd83a');
      ctx.fillStyle = '#d83a2a'; ctx.font = 'bold 8px ' + FONT; ctx.fillText('NEW!', nx + 13, ny + 6.5);
    }
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  }

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
    var nTot = Math.max(24, causes.length), rows = Math.ceil(nTot / 6), compact = rows > 4;
    var cw = 23, ch = compact ? Math.max(18, Math.floor((174 - (rows - 1) * 2) / rows)) : 30, gap = compact ? 2 : 3, gx = 11, gy = compact ? 27 : 30;
    for (var k = 0; k < nTot; k++) {
      var c = causes[k], col = k % 6, row = (k / 6) | 0;
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
        drawCauseIcon(ctx, x + cw / 2 - 1, iy, c.id, compact ? 0.75 : 0.8);
        ctx.restore();
      } else {
        ctx.fillStyle = '#8a7e68'; ctx.font = 'bold ' + (compact ? 10 : 11) + 'px ' + FONT;
        ctx.fillText('？', x + cw / 2 - 1, iy);
      }
    }
    // 説明枠
    var by = compact ? gy + rows * (ch + gap) + 2 : 166;
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

  // ---- 巻貝（右へ這う設計。原点 = 殻と足の中心） ----
  var SN_S = '#e89a4a', SN_SL = '#ffd08a', SN_SD = '#b0642a', SN_B = '#f2e2b0', SN_BD = '#cdb680';
  var snailCache = {};
  function buildSnail(fr, hide) {
    var key = fr + '|' + hide; if (snailCache[key]) return snailCache[key];
    var g = new Grid(28, 24, 13, 14), sw = [0, 1, 0, -1][fr];
    if (!hide) {
      // 足（ガラスに張りつく平たい体）＋ 頭
      g.stamp(function (x, y) {
        var px = x + 0.5, py = y + 0.5;
        if (py >= 1.5 && py <= 4.5 && px >= -7 && px <= 6) { if (px < -5 && py < 3 - (-5 - px)) return null; return py > 3.5 ? SN_BD : SN_B; }
        var hx = px - 5, hy = py - 1.5; if (hx * hx / 6 + hy * hy / 7 <= 1) return hy > 1 ? SN_BD : SN_B;
        return null;
      }, O, [-9, -6, 9, 6]);
    }
    // 殻（うず巻き）
    var scx = hide ? 0 : -1, scy = hide ? 0 : -1.5, sr = 5.6;
    g.stamp(function (x, y) {
      var dx = x + 0.5 - scx, dy = y + 0.5 - scy, r = Math.sqrt(dx * dx + dy * dy);
      if (r > sr) return null;
      if (dx + dy < -4.2 && r > 3.2) return SN_SL;
      return dy > 2.5 ? '#d07e3a' : SN_S;
    }, O, [-8, -9, 6, 6]);
    for (var th = 0.8; th < 4 * Math.PI; th += 0.06) { // うず巻きの線
      var rr = 0.36 * th; if (rr > sr - 1.3) break;
      g.set(Math.floor(scx + rr * Math.cos(th + 2.4)), Math.floor(scy + rr * Math.sin(th + 2.4)), SN_SD);
    }
    if (!hide) {
      // 触角（2本、先に目玉）
      var hx0 = 5, hy0 = -0.5;
      [[4, -4], [6.5, -3]].forEach(function (tp, i) {
        var tx = hx0 + tp[0] + (i ? sw : -sw) * 0.6, ty = hy0 + tp[1];
        gline(g, hx0 + i, hy0, tx, ty, SN_BD);
        g.set(R(tx), R(ty), O); g.set(R(tx) + 1, R(ty), O); g.set(R(tx), R(ty) - 1, O); g.set(R(tx) + 1, R(ty) - 1, '#ffffff');
      });
      g.set(7, 1, O); // 口もと
      g.set(6, 3, '#ff9aa0');
    } else {
      // 殻の口（ふた）とあせ
      g.set(3, 4, '#7a4a2a'); g.set(4, 3, '#7a4a2a'); g.set(4, 4, O);
    }
    g.K = O; g.keep = [O, SN_SD, SN_BD];
    snailCache[key] = g; return g;
  }
  function drawSnail(ctx, x, y, t, o) {
    o = o && typeof o === 'object' ? o : {};
    t = num(t, 0);
    var fr = Math.floor(t * 4) & 3, hide = !!o.surprised;
    blit(ctx, buildSnail(hide ? 0 : fr, hide), x, y, { rot: num(o.rot, 0) });
    if (hide && (Math.floor(t * 6) & 1)) { rect(ctx, R(x) + 6, R(y) - 7, 1, 2, '#ffffff'); rect(ctx, R(x) + 8, R(y) - 5, 2, 1, '#ffffff'); }
  }

  // ---- カニ（正面。原点 = 胴の中心、足先は y+5） ----
  var CR_R = '#e8483a', CR_L = '#ff8a6a', CR_D = '#b02a20';
  var crabCache = {};
  function buildCrab(fr, pinch, angry) {
    var key = fr + '|' + pinch + '|' + angry; if (crabCache[key]) return crabCache[key];
    var g = new Grid(32, 28, 16, 16);
    // 足（左右3本ずつ。fr で前後に交互）
    for (var s = -1; s <= 1; s += 2) for (var k = 0; k < 3; k++) {
      var ph = ((k + fr) & 1) ? 1 : 0, bx = s * (3 + k * 1.6), by = 2;
      var kx = s * (6 + k * 1.4), ky = 2 + ph * -1, fx = s * (6.5 + k * 1.5 - ph * 0.8), fy = 5 - ph;
      g.stamp((function (bx, by, kx, ky, fx, fy) { return function (x, y) {
        var px = x + 0.5, py = y + 0.5;
        return (segD2(px, py, bx, by, kx, ky) <= 0.36 || segD2(px, py, kx, ky, fx, fy) <= 0.3) ? CR_D : null; }; })(bx, by, kx, ky, fx, fy), O, [-12, -2, 12, 7]);
    }
    // 腕＋はさみ
    for (var s2 = -1; s2 <= 1; s2 += 2) {
      var ax = s2 * 5, ay = 0, cx = s2 * 9, cy = pinch ? -8 : -2, open = pinch && (fr & 1);
      g.stamp((function (ax, ay, cx, cy) { return function (x, y) { return segD2(x + 0.5, y + 0.5, ax, ay, cx, cy + 1.5) <= 0.8 ? CR_R : null; }; })(ax, ay, cx, cy), O, [-13, -12, 13, 4]);
      g.stamp((function (cx, cy, s2, open) { return function (x, y) {
        var dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx / 7 + dy * dy / 6.2 > 1) return null;
        // 切れこみ（上向き）
        if (dy < (open ? 0.6 : -0.6) && Math.abs(dx + s2 * 0.2) < (open ? 1.1 : 0.55)) return null;
        return (dx * s2 < -0.8 && dy < 0) ? CR_L : (dy > 1.3 ? CR_D : CR_R);
      }; })(cx, cy, s2, open), O, [cx - 4, cy - 4, cx + 4, cy + 4]);
    }
    // 胴（甲羅）
    g.stamp(function (x, y) {
      var px = x + 0.5, py = y + 0.5;
      if (px * px / 36 + py * py / 14 > 1) return null;
      if (py > 1.8) return CR_D;
      if (px < -1.5 && py < -1 && px > -5) return CR_L;
      return CR_R;
    }, O, [-7, -5, 7, 5]);
    // 目（柄の先）
    [-2.5, 2.5].forEach(function (ex) {
      var X = R(ex) - (ex < 0 ? 1 : 0);
      g.set(X, -4, O); g.set(X, -5, O);
      g.stamp(function (x, y) { var dx = x + 0.5 - (X + 0.5), dy = y + 0.5 + 6; return dx * dx + dy * dy <= 2.6 ? '#ffffff' : null; }, O, [X - 2, -9, X + 2, -4]);
      g.set(X + (angry ? (ex < 0 ? 1 : 0) : 0), -6, O);
      if (angry) { // 怒り眉
        var inner = ex < 0 ? 1 : -1;
        g.set(X + inner, -9, O); g.set(X, -8, O); g.set(X - inner, -9, O); g.set(X - inner * 2, -9, null);
        g.set(X + inner, -8, O); g.set(X - inner, -10, O);
      }
    });
    // 口
    if (angry) { g.set(-1, 1, O); g.set(0, 0, O); g.set(1, 1, O); }
    else { g.set(-1, 0, O); g.set(0, 1, O); g.set(1, 0, O); }
    g.set(-4, 0, '#ff9a9a'); g.set(4, 0, '#ff9a9a');
    g.K = O; g.keep = [O, '#ffffff', CR_D];
    crabCache[key] = g; return g;
  }
  function drawCrab(ctx, x, y, t, o) {
    o = o && typeof o === 'object' ? o : {};
    t = num(t, 0);
    var fr = Math.floor(t * 8) & 1, bob = (o.pinch ? 0 : fr);
    blit(ctx, buildCrab(fr, !!o.pinch, !!o.angry), x, y - bob * 0);
    if (o.angry && (Math.floor(t * 4) & 1)) { // 怒りマーク
      var ax = R(x) + 8, ay = R(y) - 12;
      [[0, 0], [2, 0], [0, 2], [2, 2]].forEach(function (d) { rect(ctx, ax + d[0], ay + d[1], 1, 1, '#ff3030'); });
      rect(ctx, ax + 1, ay - 1, 1, 1, '#ff3030'); rect(ctx, ax - 1, ay + 1, 1, 1, '#ff3030'); rect(ctx, ax + 3, ay + 1, 1, 1, '#ff3030'); rect(ctx, ax + 1, ay + 3, 1, 1, '#ff3030');
    }
  }

  // ---- 小エビ（右向き設計。原点 = 体の中心） ----
  var SH_B = '#ffaab4', SH_L = '#ffdbe0', SH_D = '#ec7a90', SH_K = '#a8485e';
  var shrimpCache = {};
  function buildShrimp(fr, jump) {
    var key = fr + '|' + jump; if (shrimpCache[key]) return shrimpCache[key];
    var g = new Grid(36, 26, 16, 13), i, n = 8;
    // 背骨（頭→尾）
    var P = [];
    for (i = 0; i <= n; i++) {
      var s = i / n, x0, y0;
      if (jump) { x0 = 5 - 8.5 * Math.sin(s * 2.6); y0 = -2.5 + 4.2 * (1 - Math.cos(s * 2.6)); }
      else { x0 = 5.5 - s * 12.5; y0 = -0.5 - Math.sin(s * 3.1) * 1.6 + s * s * 1.2; }
      P.push([x0, y0]);
    }
    // 脚（体の下にぱたぱた）
    for (i = 1; i <= 5; i++) {
      var q = P[i], sw = ((i + fr) & 1) ? 1.2 : -0.6;
      gline(g, q[0], q[1] + 2.4, q[0] + sw - 0.4, q[1] + 4.2, SH_K);
    }
    // 胴（節ごとに縞）
    g.stamp(function (x, y) {
      var px = x + 0.5, py = y + 0.5, best = 99, bi = 0;
      for (var j = 0; j < n; j++) { var d = segD2(px, py, P[j][0], P[j][1], P[j + 1][0], P[j + 1][1]); if (d < best) { best = d; bi = j; } }
      var rr = bi < 2 ? 2.7 : 2.6 - (bi - 1) * 0.28; if (best > rr * rr) return null;
      // 上側は明るく
      var nx = P[bi + 1][0] - P[bi][0], ny = P[bi + 1][1] - P[bi][1], side = (px - P[bi][0]) * ny - (py - P[bi][1]) * nx;
      var tx = P[bi + 1][0] - P[bi][0], ty = P[bi + 1][1] - P[bi][1], tl2 = tx * tx + ty * ty || 1, along = ((px - P[bi][0]) * tx + (py - P[bi][1]) * ty) / tl2;
      if (bi >= 2 && bi < n - 1 && along > 0.85 && side > -1.2) return SH_D;
      return side > 0.8 ? SH_L : side < -1.2 ? SH_D : SH_B;
    }, SH_K, [-10, -6, 9, 10]);
    // 尾びれ（扇）
    var tl = P[n], tp = P[n - 1], ux = tl[0] - tp[0], uy = tl[1] - tp[1], ul = Math.sqrt(ux * ux + uy * uy) || 1; ux /= ul; uy /= ul;
    g.stamp(function (x, y) {
      var px = x + 0.5 - tl[0], py = y + 0.5 - tl[1], f = px * ux + py * uy, sd = px * -uy + py * ux;
      if (f < 0 || f > 3.6) return null;
      if (Math.abs(sd) > 0.8 + f * 0.75) return null;
      return Math.abs(sd) < 0.6 ? SH_D : SH_L;
    }, SH_K, [tl[0] - 5, tl[1] - 5, tl[0] + 5, tl[1] + 5]);
    // 頭のとげ・目
    var hx = P[0][0], hy = P[0][1];
    gline(g, hx + 1, hy - 2, hx + 4, hy - 2.5, SH_K);
    g.set(R(hx) - 1, R(hy) - 2, O); g.set(R(hx), R(hy) - 2, O); g.set(R(hx) - 1, R(hy) - 3, O); g.set(R(hx), R(hy) - 3, '#ffffff');
    // 長いひげ（前へのびて後ろにしなる）
    var sway = [0, 0.6, 1, 0.6][fr];
    for (var w = 0; w < 2; w++) {
      var px0 = hx + 2, py0 = hy - 1 + w;
      for (var k = 0; k <= 18; k++) {
        var u = k / 18, xx = px0 + Math.sin(u * 2.2) * (9 - w * 2), yy = py0 - u * (7 - w * 4) - Math.sin(u * 3) * 1.5 + u * u * (4 + sway + w * 3);
        if (u > 0.55) xx -= (u - 0.55) * (8 + w * 3);
        if (!g.get(R(xx), R(yy))) g.set(R(xx), R(yy), w ? SH_D : SH_K);
      }
    }
    g.K = SH_K; g.keep = [O, SH_K, SH_D, '#ffffff'];
    shrimpCache[key] = g; return g;
  }
  function drawShrimp(ctx, x, y, t, o) {
    o = o && typeof o === 'object' ? o : {};
    t = num(t, 0);
    var fr = Math.floor(t * 10) & 3, a0 = ctx.globalAlpha;
    if (typeof a0 !== 'number') a0 = 1;
    ctx.globalAlpha = a0 * 0.88;
    blit(ctx, buildShrimp(o.jump ? 0 : fr, !!o.jump), x, y, { mirror: num(o.dir, 1) < 0 });
    ctx.globalAlpha = a0;
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
    for (f = 0; f < 8; f++) buildBall(f);
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

  var GoldfishSprites = {
    drawTank: drawTank,
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
    drawBigFace: drawBigFace,
    drawSmear: drawSmear,
    drawDragon: drawDragon,
    drawScale: drawScale,
    drawHermit: drawHermit,
    drawSpotlight: drawSpotlight,
    // 水槽の仲間・おもちゃ
    drawSnail: drawSnail,
    drawCrab: drawCrab,
    drawShrimp: drawShrimp,
    drawBall: drawBall,
    drawFingerHoop: drawFingerHoop,
    drawBadge: drawBadge,
    prewarmFriends: prewarmFriends,
    VARIANTS: VARIANTS,
    PALETTE: { outline: O, water: WATER, cream: CREAM, sand: SAND }
  };

  if (typeof window !== 'undefined') window.GoldfishSprites = GoldfishSprites;
  else if (typeof globalThis !== 'undefined') globalThis.GoldfishSprites = GoldfishSprites;
  if (typeof module !== 'undefined') module.exports = GoldfishSprites;
})();
