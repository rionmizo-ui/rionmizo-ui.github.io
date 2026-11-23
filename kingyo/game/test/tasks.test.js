// node test/tasks.test.js — 演出タスクのランナー
import { makeRunner, stepRunner, RUNNING, DONE, REPLACED } from '../src/game/runner.js';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('NG:', m); } };
const quiet = console.warn; console.warn = () => {};

{ // 秒数待ち
  const log = [];
  const r = makeRunner((function* () { log.push('a'); yield 0.5; log.push('b'); })());
  ok(stepRunner(r, 0.1) === RUNNING && log.join('') === 'a', '最初の yield まで進む');
  stepRunner(r, 0.3); ok(log.join('') === 'a', '0.4秒ではまだ');
  ok(stepRunner(r, 0.2) === DONE && log.join('') === 'ab', '0.5秒で先へ進み、終わる');
}
{ // 条件待ち
  let flag = false;
  const r = makeRunner((function* () { yield () => flag; })());
  ok(stepRunner(r, 0.1) === RUNNING, '条件が偽なら待つ');
  flag = true; ok(stepRunner(r, 0.1) === DONE, '条件が真になれば進む');
}
{ // 逃げ道：条件待ちが上限を超えたら先へ
  const r = makeRunner((function* () { yield () => false; yield 0.1; })(), { limit: 2 });
  for (let i = 0; i < 19; i++) stepRunner(r, 0.1);
  ok(r.cond && r.timeouts === 0, '上限前は待ち続ける');
  stepRunner(r, 0.2); ok(!r.cond && r.timeouts === 1, '上限を超えたら先へ進む');
}
{ // yield 0 はそのまま続ける／zeroWaits なら止まる
  const mk = z => makeRunner((function* () { yield 0; yield 0; yield 1; })(), { zeroWaits: z });
  const a = mk(false); stepRunner(a, 0.01); ok(a.wait === 1, 'yield 0 は同じフレームで続く');
  const b = mk(true); stepRunner(b, 0.01); ok(b.wait === 0, 'zeroWaits なら yield 0 で止まる');
}
{ // 演出の中で差しかえられた
  let cur = null;
  const r = cur = makeRunner((function* () { cur = 'other'; yield 1; })());
  ok(stepRunner(r, 0.1, () => cur === r) === REPLACED, '差しかえを知らせる');
}
{ // 無限ループよけ
  const r = makeRunner((function* () { for (;;) yield 0; })(), { maxSteps: 10 });
  ok(stepRunner(r, 0.1) === RUNNING, 'maxSteps で1フレームを打ち切る');
}
console.warn = quiet;
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
