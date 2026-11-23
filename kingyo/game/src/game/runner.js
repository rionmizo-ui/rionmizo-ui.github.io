// runner.js — ジェネレータで書いた演出（タスク）を毎フレーム進める
//
//   yield 秒数        … その秒数だけ待つ
//   yield () => 条件  … 条件が true になるまで待つ（毎フレーム呼ばれる）
//
// どの待ちにも逃げ道をつける：条件待ちが limit 秒を超えたら、警告を出して先へ進める。
// （試作では「泡が先に消えて待ちっぱなし」「壁ぎわの餌に届かない」で止まったことがある）

export const RUNNING = 0, DONE = 1, REPLACED = 2;

// opts.limit      条件待ちの上限（秒）
// opts.maxSteps   1フレームで進める yield の上限（無限ループよけ）
// opts.zeroWaits  true なら yield 0 でもそのフレームは止まる（見本再生用）
// opts.label      警告に出す名前
export function makeRunner(it, opts = {}) {
  return { it, wait: 0, cond: null, condAge: 0, timeouts: 0,
    limit: opts.limit ?? 20, maxSteps: opts.maxSteps ?? 50, zeroWaits: !!opts.zeroWaits, label: opts.label || 'task' };
}

// stillMine: next() のあとで、このランナーがまだ現役か（演出の中で別のタスクに差しかえられることがある）
export function stepRunner(r, dt, stillMine = () => true) {
  if (r.wait > 0) { r.wait -= dt; if (r.wait > 0) return RUNNING; }
  if (r.cond) {
    r.condAge += dt;
    if (!r.cond()) {
      if (r.condAge < r.limit) return RUNNING;
      r.timeouts++;
      if (typeof console !== 'undefined') console.warn(`[${r.label}] 待ちが ${r.limit} 秒を超えたので先へ進めます`);
    }
    r.cond = null;
  }
  for (let k = 0; k < r.maxSteps; k++) {
    const x = r.it.next();
    if (!stillMine()) return REPLACED;
    if (x.done) return DONE;
    const v = x.value;
    if (typeof v === 'number') { if (v > 0 || r.zeroWaits) { r.wait = v; return RUNNING; } }
    else if (typeof v === 'function') { if (!v()) { r.cond = v; r.condAge = 0; return RUNNING; } }
  }
  return RUNNING;
}
