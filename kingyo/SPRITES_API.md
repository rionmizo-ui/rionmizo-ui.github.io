# sprites.js の取り決め（ファイル冒頭のコメントそのまま）

```
 sprites.js — 金魚育成ゲーム ドット絵（状態を持たない描画関数群）
 内部解像度 160x240。全関数 (ctx, x, y, opts) で x,y は中心。fillRect ベース。

 ■ drawFish(ctx,x,y,opts) の opts（CONTRACT.md の基本 opts に加えて）
   variant: 死因ID … VARIANTS のプリセットを下敷きにする（個別 opts が優先）
   flower + flowerStage 0..3 … 頭の植物 0=芽 1=双葉 2=つぼみ 3=開花（省略時 3）
   xray: true | 'blink' … 感電のレントゲン（暗い体に白い骨）。'blink' は t で点滅
   spark / lightning … 体の周りのスパーク（格子内）/ 左右に点滅する稲妻（エフェクト）
   burnt + smoke … 黒焦げ（ひび割れの残り火・ちりちりのひれ）/ 立ちのぼる煙
   palette:'poison' + fumes … 紫に変色＋緑の斑点・よだれ / 紫の湯気と小さなドクロ
   white + shine + sparkle … 真っ白（オレンジが落ちた）/ ブラシ跡とつや / きらめき
   stars … 頭上を回る星とひよこ（目を回した）
   balloon … パンパンの風船体（トゲなし・つや・ひも付き）。puff を内包
   moss … 全身コケ＋輪郭のもこもこの房（目だけ見える。eyes で ぱち/× を切替）
   stone … 魚の輪郭が浮き彫りで残る丸石。eyes/look/dir で目だけ動く
   skeleton … ガリガリ（細い体・こけた腹・浮いた肋骨と背骨・くま・ぼろぼろの尾）
   bones … 旧スケルトン（骨だけの魚）
   belly … 巨大に膨らんだお腹（つや・へそ） / wrinkles … しわ・白い眉・長い白ひげ
   legs + drown … 魚人の手足＋両手を上げてばたばた・口からぶくぶく
   glitch … 帯状の横ずれ＋マゼンタ/シアンの色ずれ残像＋ノイズ帯
   sweat … 汗のしずく（分裂・水槽がせまい） / fx:false … 上記エフェクト類を描かない
   エフェクト類（smoke fumes stars lightning sparkle sweat balloon のひも drown の泡）は opts.t でアニメ

 ■ v15 デザイン（references/v15）：まんまる体・前に飛び出す白い大目2つ・赤いくちびる・えら線・クリーム色のお腹・
   すじ入り背びれ・二股の尾・足びれ2つ・こげ茶の輪郭。stage2 で尾込み幅 約46px、くちびる中心 (x+dir*12, y+5)・前端 x+dir*17
   mouth に 'frown'（への字くちびる）を追加。eyes:'annoyed' で自動。happy は 'grin'。skeleton は頭と尾が残り胴が魚の骨
 ■ カートゥーン化で追加した opts（すべて省略可。省略時は通常の横顔）
   turn 0..1 … 振り返り。0=dir向き 0.5=正面 1=逆向き。中間は横幅 |cos(πt)|（最小0.3）に縮めた横顔、|cos|<0.35 は正面顔
   front:true … 正面顔（turn=0.5 と同じ）。stone / bones / split は正面顔なし（縮めた横顔になる）
   sx, sy … つぶし・伸ばし倍率（体の中心基準。0.05刻みでキャッシュ）
   cheeks:true + chew 0..1 … ほっぺぷくっ＋もぐもぐ（chew 0=閉じ 0.5=開く。ほっぺも上下）。chew だけでも口が動く
   mouth … 0|1 に加え 'o' 'yawn' 'grin' 'pout' 'smile' 'wavy' 'tongue'
   eyes … 既存に加え 'angry' 'blink' 'surprised' 'annoyed' 'love' 'teary' 'sparkle' 'closed' 'side'
   brows … 'none' 'up' 'down' 'worried' 'angry'（annoyed は へ の字眉、angry 目は怒り眉が自動）
   blush:true … 強いほっぺ（ふだんも薄く赤い） / mark|bubble … 頭上の記号 'zzz' '!' '?' 'note'(♪) 'anger'(💢) 'heart' 'sweat'
   wag … 尾の振り速度倍率（既定1、0で止まる）

 ■ 追加・拡張した関数
   drawPellet(ctx,x,y,type,t)   'poison' は紫のドクロ玉＋湯気（t でゆらぐ）、'spark' は t で火花、'gold' は金の粒（8px、t でキラッ）
   drawSnail(ctx,x,y,t,{rot,surprised}) 巻貝 / drawCrab(ctx,x,y,t,{pinch,angry}) カニ（足先 y+5）
   drawShrimp(ctx,x,y,t,{dir,jump}) 小エビ / drawBall(ctx,x,y,t) ビーチボール(直径9)
   drawFingerHoop(ctx,x,y,t) OKサインの指の輪（(x,y)=輪の内側中心、内径22、手首は画面上端まで）
   drawBadge(ctx,x,y,label) 名札（8px 文字、幅は文字に合わせる）
   drawNozzle(ctx,x,y,{suck,tail,t})  suck=吸い込み線と汚れ、tail=口から金魚の尾がのぞく
   drawCatPaw(ctx,x,y,{fish,t})  大きな猫の手（肉球・爪）。fish=爪に金魚
   drawSmoke(ctx,x,y,t) 煙 / drawFumes(ctx,x,y,t) 毒の湯気 / drawStars(ctx,x,y,t) 星とひよこ
   drawLightning(ctx,x,y,t) 稲妻 / drawSparkles(ctx,x,y,t,r) きらめき / drawDrop(ctx,x,y) 汗
   drawSuctionLines(ctx,x,y,t) (x,y)＝吸い口へ集まる線 / drawSplash(ctx,x,y,p) ぽちゃん(p=0..1)
   drawFlame(ctx,x,y,dir,t) 口から吹く炎 / drawPop(ctx,x,y,r,p) 泡がはじける / drawBird(ctx,x,y,t,dir) 鳥
   drawCauseIcon(ctx,x,y,id,size,t)  size<=1 図鑑用 / size>1 小物つき場面（size=2 で約62x42）
   drawCard は ctx.scale があればミニ絵を2倍ドットで大きく描く

 ■ 体色・イベント小物（追加）
   drawFish opts.color 'orange'(既定)|'lime'|'pink'|'yellow' … 体・ひれ・尾・うろこ・ハイライト一式。
     palette / 死因フラグ（frozen burnt white stone skeleton bald xray moss など）があればそちらが優先。
     wrinkles は色ごとのくすんだ色、dragon は体色＋差し色。drawDragon(ctx,x,y,t,dir,color)
   死因 'jumpout'（飛び出した）… VARIANTS / drawCauseIcon 対応
   drawCatShadow(ctx,x,y,t,{angry,flee}) 水面の上からのぞく猫の顔の上半分（(x,y)=顔の下端中心、幅約60）
   drawMysteryPellet(ctx,x,y,t) 虹色に光る怪しい粒 / drawAlert(ctx,x,y,t,icon) 赤枠「！」＋ボタンアイコン（幅30）

 ■ 体色2種・死因6種（追加2）
   opts.color に 'sky'（水色・お腹クリーム） 'purple'（ラベンダー） … 老衰色・竜の差し色つき。COLORS は6色
   eyes 'calm' … 穏やかに閉じた目 ‿
   sushi:true … シャリに乗ったにぎり（目×・わさび）。正面なし：front/turn<=0.5 は横顔、>0.5 は逆向き
   meteor:true … 黒焦げ＋ぺしゃんこ（sx×1.3, sy×0.55）＋赤いたんこぶ＋星＋煙（burnt/stars/smoke を内包）
   ghost:true … 半透明の白いおばけ（下半分が煙の尾・三角の天冠・うらめしや手・人魂）。眠い目＋困り眉が既定
   zen:true … 閉じ目・光背・蓮の花・ほんのり金色。front/turn 未指定なら正面になる
   mom:true … 満足げ（closed 目・smile・blush）＋汗
   drawUFO(ctx,x,y,t,{scale,rot}) 幅約44 / drawBeam(ctx,x,y,len,t,w=26) (x,y)=上端中心から下へ len
   drawChefHand(ctx,x,y,t,{knife,dir(-1=刃が左),len,scale}) (x,y)=手、袖は y-len まで（既定は画面上端）
   drawMeteor(ctx,x,y,t,size) 尾は右上へ / drawCrater(ctx,x,y,t) (x,y)=砂の表面のくぼみ中心
   drawGhost(ctx,x,y,t,{angry,scale,dir}) 幅約30（人魂つき） / drawBaby(ctx,x,y,t,{color,dir,scale,phase}) 幅約10（scale<0.8 は極小ドット）

 ■ 手描きコマ（キーフレーム）opts … 整数のコマ番号。渡さなければ従来どおり（出力は1ドットも変わらない）
   swimF 0..3 泳ぎ（0=尾が右(上へしなる) 1=中央・体1px上 2=尾が左(下へ) 3=中央・体1px下。尾/背/胸/腹びれがコマごとのポーズ。4以上は折り返し）
   turnF 0..4 振り返り（0=横顔 1=斜め45° 2=正面 3=逆向き斜め 4=逆向き横顔＝dir反転と同じ）。turn/front より優先
     斜めは stone bones split stuck knot sushi puff/balloon legs ghost moss flower flat wings では縮めた横顔で代用
   chewF 0..3 もぐもぐ（ほっぺ自動。0=閉 1=少し開く 2=ほっぺ↑で目が細い 3=閉じてほっぺ↓。折り返し）
   blinkF 0..2 まばたき（0=開 1=半目 2=閉）。eyes が x dizzy happy closed などの特殊目なら無視
   eatF 0..2 ぱくっ（0=大口で前へのびる 1=閉じてちぢむ 2=もどり）。横顔は尾の先を支点にのび縮み
   rollF 0..5 裏返り（1=薄く・お腹が見える 2=真横でお腹が上半分 3=ほぼ裏 4=flipと同じ 5=沈んでつぶれる(+2px)）。flip と併用すると反転が逆になる
   surpF 0..2 びっくり（0=ぎゅっと縮む >< 1=のびて目が大きくひれ全開 2=もどり）。eyes/mouth を上書き（x 目は残す）
   優先：口 eatF > chewF > surpF、目 blinkF > surpF。sx/sy とは掛け算。コマは opts.t によらず決まる（swimF 指定時は飾りの揺れも swimF に同期）

 ■ 死に際の手描きコマ opts.die = { k: 死因ID, f: コマ番号 }（12fps で 0→hold と送る。hold=最後＝静止形）
   GoldfishSprites.DEATH_FRAMES[k] = { n, hold, fps:12 }（43死因すべて）。prewarmDeath(k, {color,stage}) で先に作れる
   呼び出し側の color stage dir scale rot sx sy t fx legLen wag だけ使い、目・口・フラグはコマが決める（variant/eyes などは無視）
   途中のコマは opts.t によらず決まる。hold コマだけ t で煙・きらめき等が動く。hold の絵は既存の静止形と同じ
   小物（猫の手・鳥・網・ノズル・大きな泡・UFO・板前の手・隕石・魂・赤ちゃん・巨大な顔）は描かない（main.js 側）
```
