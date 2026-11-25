// 文字だけの死因リスト（docs/DEATHS.md）を、ゲームのデータから作る
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const L = require(path.join(root, 'src/logic.js'));
const tpl = fs.readFileSync(path.join(root, 'src/sample.template.html'), 'utf8');
const HOW = eval('(' + tpl.match(/const HOW = (\{[\s\S]*?\n  \});/)[1] + ')');
const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
const HINTS = eval('(' + main.match(/const HINTS = (\{[\s\S]*?\n  \});/)[1] + ')');
const FLOAT = { float: '浮く', sink: '沈む', gone: '消える', stay: 'とどまる' };
const GROUP = id => {
  if (id === 'instant') return '登場';
  if (['poison', 'frozen', 'flower', 'burnt', 'shock'].includes(id)) return '餌';
  if (['sucked', 'overpolished'].includes(id)) return '掃除';
  if (['cat', 'bird', 'dizzy', 'bubblegone', 'floataway', 'star', 'cleanfreak'].includes(id)) return 'ふれあい・芸';
  if (id === 'netted') return '網';
  if (['stuck', 'hiccupfly', 'knotted', 'flat', 'nowake', 'overhere'].includes(id)) return 'しぐさ（放置）';
  if (['haircut', 'squashed', 'loach', 'catfish'].includes(id)) return 'お客さん（放置）';
  return 'イベント';
};
const W = Object.fromEntries(L.ENDING_RULES.map(r => [r.id, r.w]));
let out = `# きんぎょのさいご 死因リスト（v23・全${L.CAUSES.length}種）\n\n`;
out += `- 育成途中の突然死 ${L.CAUSES.filter(c => c.kind === 'sudden').length}種 ＋ 満タン時の結末 ${L.CAUSES.filter(c => c.kind === 'ending').length}種\n`;
out += `- 番号は図鑑の番号。「きっかけ」はゲーム内の図鑑ヒント。「％」は今の確率\n`;
out += `- 結末は、当てはまるもの（条件）の中から重みつきの抽選。まだ図鑑にない結末は2倍出やすい\n\n`;
out += `## 育成途中の突然死\n\n`;
L.CAUSES.forEach((c, i) => {
  if (c.kind !== 'sudden') return;
  out += `${String(i + 1).padStart(2, '0')}. **${c.name}**（${GROUP(c.id)}・${FLOAT[c.float]}）\n    - ${HOW[c.id] || ''}\n    - きっかけ：${HINTS[c.id] || ''}\n`;
});
out += `\n## 満タン時の結末\n\n`;
L.CAUSES.forEach((c, i) => {
  if (c.kind !== 'ending') return;
  out += `${String(i + 1).padStart(2, '0')}. **${c.name}**（${FLOAT[c.float]}）\n    - 条件：${HOW[c.id] || ''}\n    - きっかけ：${HINTS[c.id] || ''}\n`;
});
fs.writeFileSync(path.join(root, 'DEATHS.md'), out);
console.log(out.split('\n').length, 'lines');
