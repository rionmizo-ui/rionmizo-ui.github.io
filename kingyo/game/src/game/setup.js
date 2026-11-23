// setup.js — 起動時の設定（URLパラメータ・保存先・ルールエンジン）
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import L from '../logic/index.js';

export default function install(G) {
  G.cfg = G.cfg || {};
  const params = new URLSearchParams(location.search);
  const SPEED = G.cfg.main ? parseFloat(params.get('speed') || '1') : 1; Object.assign(G, { SPEED });
  const ctx = G.cv.getContext('2d'); Object.assign(G, { ctx });
  ctx.imageSmoothingEnabled = false;

  let storage = null;
  if (G.cfg.main) { try { storage = window.localStorage; storage.setItem('_gf', '1'); } catch (e) { storage = null; } }
  if (G.cfg.main && params.has('fresh') && storage) storage.removeItem('goldfish_v1');
  const g = L.create({ rng: G.cfg.rng || (() => Math.random()), storage }); Object.assign(G, { g });
  if (G.cfg.main) { try { g.load && g.load(); } catch (e) { console.warn('load failed', e); } }
}
