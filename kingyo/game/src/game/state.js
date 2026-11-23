// state.js — 画面の状態（魚・粒・道具・小物）
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import { FLOOR } from './consts.js';

export default function install(G) {
  Object.assign(G, { initTreasures });

  // ---------------- 状態 ----------------
  G.T = 0;
  const fish = { x: 80, y: -30, dir: 1, eyes: 'normal', mouth: 0, vis: false, opts: {}, rot: 0, speed: 25,
    tx: 80, ty: 120, ox: 0, oy: 0, free: true, glitch: false, split: 0, smugUntil: 0, vx: 0, vy: 0, turn: 3, legLen: 0 }; Object.assign(G, { fish });
  G.pellets = [], G.poops = [], G.bubbles = [], G.fx = [];
  G.thought = null;           // {icon, until}
  G.mode = 'title';           // title | play | dead | card | zukan
  G.busy = false, G.queued = null;
  G.task = null;
  G.netReady = false, G.netQueued = false;
  G.causeId = null, G.cardT = 0, G.cardNew = false;
  G.wipes = null, G.wipeDirt = 0, G.sparkle = false;
  const AIR_X = 98; Object.assign(G, { AIR_X });   // エアストーンの位置
  G.treasures = [], G.carry = null;
  function initTreasures() { return [{ kind: 'pebble', x: 62, y: FLOOR + 5 }, { kind: 'pebble', x: 116, y: FLOOR + 6 }]; }
  G.hoop = null, G.ball = null, G.visitor = null, G.visitAt = 40, G.forceVisitor = null;
  G.crack = null, G.soul = null, G.bigFace = null, G.smear = null, G.spot = null, G.scales = [];
  G.finger = null, G.brush = null, G.nozzle = null, G.net = null, G.paw = null, G.duck = null, G.feather = null, G.eyeball = null, G.bigBubble = null;
  G.songCheckAt = 0;
  G.wanderAt = 0, G.hintAt = 4, G.puText = 0, G.bootT = -1, G.feeding = false, G.gest = null, G.gestAt = 12, G.lastGest = null;
  Object.assign(fish, { face: 1, turnP: 0, sq: 0, sx: 1, sy: 1, chewUntil: 0, blinkAt: 2, blinkUntil: 0, ex: {} });
}
