// game/index.js — ゲーム本体の組み立て
//
// mount(canvas, cfg) で1台ぶんのゲームを作る。
//   cfg.main: true  … 本体（入力・音・保存あり）
//   cfg.demo: id    … 見本再生（無音・保存なし）。'g:しぐさ名' でしぐさ・芸・お客さん
//   cfg.rng         … ルールの乱数（省略時 Math.random）
//
// 各モジュールは install(G) で、自分の関数と状態を共有の箱 G に載せる。
// 並び順が組み込み順。後ろのモジュールは前のモジュールの関数をそのまま取り出して使い、
// 前のモジュールが後ろの関数を使うときは G.名前 で呼ぶ。
import setup from './setup.js';
import state from './state.js';
import tasks from './tasks.js';
import audio from './audio.js';
import input from './input.js';
import flow from './flow.js';
import care from './care.js';
import touch from './touch.js';
import gestures from './gestures.js';
import visitors from './visitors.js';
import death from './death.js';
import endings from './endings.js';
import water from './water.js';
import update from './update.js';
import render from './render.js';
import reward from './reward.js';
import loop from './loop.js';
import demo from './demo.js';
import start from './start.js';

const MODULES = [setup, state, tasks, audio, input, flow, care, touch, gestures, visitors, death, endings, water, update, render, reward, loop, demo, start];

export function mount(cv, cfg) {
  const G = { cv, cfg };
  for (const install of MODULES) install(G);
  return G.api;
}
