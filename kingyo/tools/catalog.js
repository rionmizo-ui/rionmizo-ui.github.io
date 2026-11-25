const fs = require('fs'), path = require('path'); const { minify } = require(process.env.TERSER);
const root = path.join(__dirname, '..');
(async () => {
  const sp = (await minify(fs.readFileSync(path.join(root, 'src2/sprites.js'), 'utf8'), { compress: { passes: 2 }, mangle: true })).code;
  const L = require(path.join(root, 'logic.js'));
  const causes = JSON.stringify(L.CAUSES.map(c => ({ id: c.id, name: c.name, kind: c.kind })));
  const shot = f => 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'design/ref', f)).toString('base64');
  const SHOTS = JSON.stringify([['タイトル', shot('screen_title.png')], ['遊んでいるところ', shot('screen_play.png')], ['図鑑', shot('screen_zukan.png')], ['かざり最大（Lv.16）', shot('screen_decor_lv16.png')]]);
  let t = fs.readFileSync(path.join(root, 'catalog/catalog.template.html'), 'utf8');
  t = t.replace('/*SPRITES*/', () => sp + '\nwindow.__CAUSES=' + causes + ';').replace('/*SHOTS*/', () => SHOTS);
  fs.writeFileSync(path.join(root, 'catalog/kingyo-design-book.html'), t);
  console.log('bytes', t.length);
})();
