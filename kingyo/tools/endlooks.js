// 死に方ごとの「最後の姿」を書き出す（描き直し用の参考）
// node tools/endlooks.js out/sample.full.html outDir
//  outDir/NN_id_zoom.png   最後の瞬間の金魚まわり（4倍）
//  outDir/NN_id_screen.png そのときの画面（2倍）
//  outDir/NN_id_fish.png   金魚だけ・透明背景（4倍。手描きコマがある死因のみ）
//  outDir/NN_id_card.png   札の絵（2倍）
//  outDir/index.json
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [file, outDir] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch(); const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(file)); await pg.waitForFunction(() => window.GoldfishGame && window.GoldfishSprites);
  await pg.waitForTimeout(500);
  const res = await pg.evaluate(() => {
    (window.__games || []).forEach(g => g.stop()); document.querySelectorAll('.tank').forEach(t => t.remove());
    const S = GoldfishSprites, C = GoldfishLogic.CAUSES, out = [];
    const up = (src, sx, sy, w, h, k, bg) => { const d = document.createElement('canvas'); d.width = w * k; d.height = h * k; const x = d.getContext('2d'); x.imageSmoothingEnabled = false; if (bg) { x.fillStyle = bg; x.fillRect(0, 0, d.width, d.height); } x.drawImage(src, sx, sy, w, h, 0, 0, d.width, d.height); return d.toDataURL('image/png'); };
    for (const cs of C) {
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = 240;
      const gm = GoldfishGame.mount(cv, { demo: cs.id, manual: true });
      let fx = 80, fy = 120, shot = null, last = null, deadAt = -1;
      for (let f = 0; f < 70 * 24; f++) {
        gm.step(1 / 24);
        const vis = gm.fish && gm.fish.vis && !gm.fish.inNet, dying = gm.mode === 'dead' || gm.mode === 'ending' || (gm.mode === 'play' && gm.busy);
        if (vis) { fx = gm.fish.x; fy = gm.fish.y; }
        if (gm.mode === 'dead' && deadAt < 0) deadAt = f;
        if (vis && dying && f % 2 === 0 && (deadAt < 0 || f < deadAt + 34)) { const c2 = document.createElement('canvas'); c2.width = 160; c2.height = 240; c2.getContext('2d').drawImage(cv, 0, 0); last = { c: c2, fx, fy }; }
        if (gm.mode === 'dead' && !shot && !vis && last) shot = last;   // 消えるタイプ：消える直前
        if (gm.mode === 'card') break;
      }
      gm.stop();
      shot = shot || last || { c: cv, fx, fy };
      const z = 72, zx = Math.max(0, Math.min(160 - z, Math.round(shot.fx - z / 2))), zy = Math.max(0, Math.min(240 - z, Math.round(shot.fy - z / 2)));
      const rec = { id: cs.id, name: cs.name, kind: cs.kind, zoom: up(shot.c, zx, zy, z, z, 4), screen: up(shot.c, 0, 0, 160, 240, 2) };
      // 金魚だけ（透明）
      const D = S.DEATH_FRAMES[cs.id];
      const AN = { possessed: 'possessed_ghost', overeat: 'overeat', split: 'split', dragon: 'dragon', fishman: 'fishman', giant: 'giant', skeleton: 'skeleton' }[cs.id];
      if (AN && S.assetBox && S.assetBox(AN)) { const bx = S.assetBox(AN); const c3 = document.createElement('canvas'); c3.width = Math.ceil(bx.w) + 8; c3.height = bx.h + 8; S.drawAsset(c3.getContext('2d'), AN, 4 + bx.w * bx.ax, 4 + bx.h * bx.ay, { color: 'orange' }); rec.fish = up(c3, 0, 0, c3.width, c3.height, 4); }
      else if (D) { const c3 = document.createElement('canvas'); c3.width = 96; c3.height = 96; S.drawFish(c3.getContext('2d'), 48, 52, { die: { k: cs.id, f: D.hold }, color: 'orange', stage: 3, dir: 1, t: 0 }); rec.fish = up(c3, 0, 0, 96, 96, 4); }
      else if (S.assetBox && S.assetBox(cs.id === 'possessed' ? 'possessed_ghost' : cs.id)) { const n = cs.id === 'possessed' ? 'possessed_ghost' : cs.id, bx = S.assetBox(n); const c3 = document.createElement('canvas'); c3.width = Math.ceil(bx.w) + 8; c3.height = bx.h + 8; S.drawAsset(c3.getContext('2d'), n, 4 + bx.w * bx.ax, 4 + bx.h * bx.ay, { color: 'orange' }); rec.fish = up(c3, 0, 0, c3.width, c3.height, 4); }
      // 札
      const c4 = document.createElement('canvas'); c4.width = 160; c4.height = 240; const x4 = c4.getContext('2d'); x4.imageSmoothingEnabled = false; S.drawTank(x4, 0.5, 0); S.drawCard(x4, cs, false);
      rec.card = up(c4, 9, 38, 142, 152, 2);
      out.push(rec);
    }
    return out;
  });
  const idx = [];
  res.forEach((r, i) => {
    const base = String(i + 1).padStart(2, '0') + '_' + r.id;
    for (const k of ['zoom', 'screen', 'fish', 'card']) if (r[k]) fs.writeFileSync(path.join(outDir, base + '_' + k + '.png'), Buffer.from(r[k].split(',')[1], 'base64'));
    idx.push({ no: i + 1, id: r.id, name: r.name, kind: r.kind, files: ['zoom', 'screen', 'fish', 'card'].filter(k => r[k]).map(k => base + '_' + k + '.png') });
  });
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(idx, null, 1));
  console.log('done', res.length, 'errs', errs); await b.close();
})();
