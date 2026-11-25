// Codex 用の参考画像（今のデザイン）を書き出す
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [file, outDir] = process.argv.slice(2);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1800, height: 1400 }, deviceScaleFactor: 1 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + file); await pg.waitForFunction(() => window.GoldfishSprites && window.GoldfishLogic);
  await pg.evaluate(() => { (window.__games || []).forEach(g => g.stop()); document.body.innerHTML = ''; document.body.style.background = '#222'; });
  fs.mkdirSync(path.join(outDir, 'death_frames'), { recursive: true });
  const save = async (name, data) => { fs.writeFileSync(path.join(outDir, name), Buffer.from(data.split(',')[1], 'base64')); };
  const sheets = await pg.evaluate(() => {
    const S = GoldfishSprites, L = GoldfishLogic, C = L.CAUSES, out = {};
    const mk = (w, h, bg) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); } return [c, x]; };
    const up = (c, k) => { const [d, x] = mk(c.width * k, c.height * k); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, d.width, d.height); return d.toDataURL(); };
    const label = (x, s, px, py, col) => { x.font = '8px sans-serif'; x.fillStyle = col || '#fff'; x.fillText(s, px, py); };
    // 1) 死亡カード 50枚（10列×5行、1枚 160×240）
    { const [c, x] = mk(1600, 1200, '#5fcfb8'); C.forEach((cs, i) => { x.save(); x.translate((i % 10) * 160, Math.floor(i / 10) * 240); x.beginPath(); x.rect(0, 0, 160, 240); x.clip(); S.drawTank(x, 0.5, 0); S.drawCard(x, cs, i % 7 === 0); x.restore(); }); out['cards_all_50.png'] = up(c, 1); }
    // 2) 図鑑アイコン 50個（大 size=2 と 小 size=1）
    { const [c, x] = mk(10 * 80, 5 * 90, '#cfeee6'); C.forEach((cs, i) => { const px = (i % 10) * 80 + 40, py = Math.floor(i / 10) * 90 + 40; S.drawCauseIcon(x, px, py, cs.id, 2, 0.4); S.drawCauseIcon(x, px + 30, py + 34, cs.id, 1, 0.4); label(x, (i + 1) + ' ' + cs.name, px - 38, py + 46, '#1d4d4a'); }); out['icons_all_50.png'] = up(c, 2); }
    // 3) 死に際のキーコマ（死因ごと）
    C.forEach((cs, i) => {
      const D = S.DEATH_FRAMES[cs.id]; if (!D) return; const sub = D.sub || 1, keys = Math.round((D.n - 1) / sub) + 1;
      const [c, x] = mk(keys * 64, 64, '#5fcfb8');
      for (let k = 0; k < keys; k++) { x.fillStyle = k & 1 ? '#56c4ae' : '#5fcfb8'; x.fillRect(k * 64, 0, 64, 64); S.drawFish(x, k * 64 + 32, 34, { die: { k: cs.id, f: Math.min(D.hold, k * sub) }, color: 'orange', stage: 2, dir: 1, t: k / 12 }); label(x, String(k), k * 64 + 2, 9, '#1d4d4a'); }
      out['death_frames/' + String(i + 1).padStart(2, '0') + '_' + cs.id + '.png'] = up(c, 3);
    });
    // 4) 金魚：6色×3段階、手描きコマ（泳ぎ8・振り返り5・まばたき3・ぱくっ3・びっくり3・裏返り6）
    { const [c, x] = mk(8 * 64, 10 * 64, '#5fcfb8'); const cols = ['orange', 'lime', 'pink', 'yellow', 'sky', 'purple'];
      cols.forEach((col, r) => [1, 2, 3].forEach((st, j) => S.drawFish(x, j * 64 + 32, r * 64 + 32, { color: col, stage: st, swimF8: 0 })));
      for (let f = 0; f < 8; f++) S.drawFish(x, 3 * 64 + 32 + 0, 0, {}); 
      const row = (r, list) => list.forEach((o, j) => S.drawFish(x, j * 64 + 32, r * 64 + 32, Object.assign({ color: 'orange', stage: 2 }, o)));
      row(6, [0, 1, 2, 3, 4, 5, 6, 7].map(f => ({ swimF8: f })));
      row(7, [0, 1, 2, 3, 4].map(f => ({ turnF: f })).concat([0, 1, 2].map(f => ({ blinkF: f }))));
      row(8, [0, 1, 2].map(f => ({ eatF: f })).concat([0, 1, 2].map(f => ({ surpF: f }))).concat([{ chewF: 1 }, { chewF: 2 }]));
      row(9, [0, 1, 2, 3, 4, 5].map(f => ({ rollF: f })));
      out['fish_poses.png'] = up(c, 2); }
    // 5) 表情（目・口）
    { const eyes = ['normal', 'angry', 'blink', 'surprised', 'annoyed', 'love', 'teary', 'sparkle', 'closed', 'side', 'happy', 'x', 'dizzy', 'wide', 'smug', 'calm'];
      const mouths = [0, 1, 'o', 'yawn', 'grin', 'pout', 'smile', 'wavy', 'tongue', 'frown'];
      const [c, x] = mk(8 * 64, 4 * 64 + 2 * 64, '#5fcfb8');
      eyes.forEach((e, i) => { S.drawFish(x, (i % 8) * 64 + 32, Math.floor(i / 8) * 64 + 32, { eyes: e }); label(x, e, (i % 8) * 64 + 2, Math.floor(i / 8) * 64 + 62, '#1d4d4a'); });
      mouths.forEach((m, i) => { S.drawFish(x, (i % 8) * 64 + 32, (2 + Math.floor(i / 8)) * 64 + 32, { mouth: m }); label(x, String(m), (i % 8) * 64 + 2, (2 + Math.floor(i / 8)) * 64 + 62, '#1d4d4a'); });
      out['fish_faces.png'] = up(c, 2); }
    // 6) お客さん（6種）・イベントの小物
    { const [c, x] = mk(8 * 100, 4 * 90, '#5fcfb8'); let k = 0;
      const put = (name, fn) => { const px = (k % 8) * 100 + 50, py = Math.floor(k / 8) * 90 + 50; x.save(); x.beginPath(); x.rect(px - 50, py - 50, 100, 90); x.clip(); x.fillStyle = (k + Math.floor(k / 8)) & 1 ? '#56c4ae' : '#5fcfb8'; x.fillRect(px - 50, py - 50, 100, 90); try { fn(px, py); } catch (e) { label(x, 'ERR', px, py); } x.restore(); label(x, name, px - 46, py + 36, '#1d4d4a'); k++; };
      put('巻貝 snail', (a, b) => S.drawSnail(x, a, b, 0.2, {}));
      put('カニ crab', (a, b) => S.drawCrab(x, a, b + 10, 0.2, {}));
      put('カニ ちょきん', (a, b) => S.drawCrab(x, a, b + 10, 0.2, { pinch: true, angry: true }));
      put('エビ shrimp', (a, b) => S.drawShrimp(x, a, b, 0.2, { dir: 1 }));
      put('ミドリガメ歩く', (a, b) => S.drawTurtle(x, a, b + 10, 0.2, { dir: 1, walk: true }));
      put('ミドリガメ首', (a, b) => S.drawTurtle(x, a, b + 10, 0, { dir: 1, walk: true, neck: 1, happy: true }));
      put('ミドリガメ泳ぐ', (a, b) => S.drawTurtle(x, a, b, 0.3, { dir: -1 }));
      put('ドジョウ', (a, b) => S.drawLoach(x, a, b, 0.3, { dir: 1 }));
      put('ドジョウもぐる', (a, b) => S.drawLoach(x, a, b, 0.3, { dir: 1, dig: 0.6 }));
      put('ナマズ', (a, b) => S.drawCatfish(x, a, b, 0.3, { dir: -1 }));
      put('ナマズあくび', (a, b) => S.drawCatfish(x, a, b, 0.3, { dir: -1, open: 1 }));
      put('ナマズ満腹', (a, b) => S.drawCatfish(x, a, b, 0.3, { dir: -1, belly: true }));
      put('岩山＋ライト', (a, b) => { x.save(); x.translate(0, -170); S.drawBaskRock(x, a, b + 140, true, 0.3); x.restore(); });
      put('UFO', (a, b) => S.drawUFO(x, a, b, 0.2, {}));
      put('板前の手', (a, b) => S.drawChefHand(x, a, b + 20, 0.2, { knife: true, len: 30 }));
      put('隕石', (a, b) => S.drawMeteor(x, a, b, 0.2, 10));
      put('おばけ', (a, b) => S.drawGhost(x, a, b, 0.2, {}));
      put('猫（水面）', (a, b) => S.drawCatShadow(x, a, b + 20, 0.2, {}));
      put('猫の手', (a, b) => S.drawCatPaw(x, a, b, { t: 0.2 }));
      put('鳥', (a, b) => S.drawBird(x, a, b, 0.2, 1));
      put('アヒル', (a, b) => S.drawDuck(x, a, b));
      put('網', (a, b) => S.drawNet(x, a, b, false));
      put('ハト', (a, b) => S.drawPigeon(x, a, b, 0.2, { dir: 1, lips: true }));
      put('竜', (a, b) => S.drawDragon(x, a, b, 0.2, 1, 'orange'));
      put('赤ちゃん', (a, b) => S.drawBaby(x, a, b, 0.2, { color: 'pink' }));
      put('おばけ怒り', (a, b) => S.drawGhost(x, a, b, 0.2, { angry: true }));
      put('なぞの粒', (a, b) => S.drawMysteryPellet(x, a, b, 0.2));
      put('ボール', (a, b) => S.drawBall(x, a, b, 0.2));
      put('指の輪', (a, b) => S.drawFingerHoop(x, a, b + 10, 0.2));
      put('ブラシ', (a, b) => S.drawBrush(x, a, b, 0));
      put('吹き出し', (a, b) => S.drawThought(x, a, b, 'food'));
      put('吹き出し左右反転', (a, b) => S.drawThought(x, a, b, 'heart', true));
      out['visitors_props.png'] = up(c, 2); }
    // 7) 水槽のかざり 0〜16段
    { const [c, x] = mk(9 * 160, 2 * 240); for (let lv = 0; lv <= 16; lv++) { x.save(); x.translate((lv % 9) * 160, Math.floor(lv / 9) * 240); x.beginPath(); x.rect(0, 0, 160, 240); x.clip(); S.drawTank(x, 1, 0); S.drawDecor(x, lv, 1); label(x, 'Lv.' + lv, 4, 236, '#1d4d4a'); x.restore(); } out['decor_levels.png'] = up(c, 1); }
    return out;
  });
  for (const [k, v] of Object.entries(sheets)) await save(k, v);
  console.log(Object.keys(sheets).length, 'images', errs);
  await b.close();
})();
