// main.js — 統合（演出・魚の動き・入力キュー・音）
var GoldfishGame = (function () {
 const L = GoldfishLogic, S = GoldfishSprites;
 const W = 160, H = 240, WATER = 22, FLOOR = 212, MID = 105, EAT_Y = 30, CHASE_Y = 145;   // 餌は水に入ったらすぐ食べに行く
 const SAND_Y = 220;   // 波打つ砂面の基準。魚の移動範囲は FLOOR を使う。
 // cfg: { main: true } 本体（入力・音・保存あり） / { demo: '死因ID' } 見本再生（無音・保存なし）
 function mount(cv, cfg) {
  cfg = cfg || {};
  const params = new URLSearchParams(location.search);
  const stat = k => { const w = typeof window !== 'undefined' && window.__stats; if (w) w[k] = (w[k] || 0) + 1; };   // 出現回数の記録（bot 用）
  const SPEED = cfg.main ? parseFloat(params.get('speed') || '1') : 1;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let storage = null;
  if (cfg.main) { try { storage = window.localStorage; storage.setItem('_gf', '1'); } catch (e) { storage = null; } }
  if (cfg.main && params.has('fresh') && storage) storage.removeItem('goldfish_v1');
  const g = L.create({ rng: cfg.rng || (() => Math.random()), storage });
  if (cfg.main) { try { g.load && g.load(); } catch (e) { console.warn('load failed', e); } }

  const cause = id => L.CAUSES.find(c => c.id === id) || { id, name: id, kind: 'sudden', float: 'float' };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------------- 状態 ----------------
  let T = 0;
  const fish = { x: 80, y: -30, dir: 1, eyes: 'normal', mouth: 0, vis: false, opts: {}, rot: 0, speed: 25,
    tx: 80, ty: 120, ox: 0, oy: 0, free: true, glitch: false, split: 0, smugUntil: 0, vx: 0, vy: 0, turn: 3, legLen: 0 };
  let pellets = [], poops = [], bubbles = [], fx = [];
  let thought = null;           // {icon, until}
  let mode = 'title';           // title | play | dead | card | zukan
  let busy = false, queued = null;
  let task = null;
  let netReady = false, netQueued = false;
  let causeId = null, cardT = 0, cardNew = false;
  let wipes = null, wipeDirt = 0, sparkle = false;
  const FISH_COLORS = ['orange', 'lime', 'pink', 'yellow', 'sky', 'purple'];
  const PERSONA_DESC = { glutton: 'すぐおなかがすく', clingy: 'かまってほしがり', neat: 'よごれが苦手', timid: 'ストレスに弱い', lazy: 'なんでもゆっくり', showoff: '芸が得意' };
  const COLOR_NAME = { orange: 'オレンジ', lime: '黄緑', pink: 'ピンク', yellow: '黄色', sky: '水色', purple: '紫' };
  const AIR_X = 98;   // エアストーンの位置
  let treasures = [], carry = null;
  function initTreasures() { return [{ kind: 'pebble', x: 62, y: FLOOR + 5 }, { kind: 'pebble', x: 116, y: FLOOR + 6 }]; }
  let birdObj = null, evLoop = 0, babies = [];
  let ufo = null, chef = null, meteor = null, crater = null, ghost = null, ghostPellets = [];
  let hoop = null, ball = null, visitor = null, visitAt = 40, forceVisitor = null;
  let crack = null, soul = null, bigFace = null, smear = null, scales = [];
  let finger = null, brush = null, nozzle = null, net = null, paw = null, duck = null, feather = null, eyeball = null, bigBubble = null;
  let songCheckAt = 0, lastWant = null;
  let xo = {};   // v16 の小物（掃除機・釣り針・猛暑・カメラ・写真・手品・星）
  const MG_WAIT = 8;   // v23 P5：お誘いを待つ秒数（4.5→8）
  let demoInvite = false, mini = null, mgInvite = null, mgAt = 80, dtNow = 0, omenG = 0, omenAt = 30, cardHint = { t: -1, s: '' };
  let wanderAt = 0, leftAt = 0, hintAt = 4, puText = 0, bootT = -1, feeding = false, gest = null, gestAt = 12, lastGest = null;
  Object.assign(fish, { face: 1, turnP: 0, sq: 0, sx: 1, sy: 1, chewUntil: 0, blinkAt: 2, blinkUntil: 0, ex: {}, swimPh: 0, eatT: -9, surpT: -9, rollF: null });

  // ---------------- タスク（ジェネレータで演出を書く） ----------------
  function startTask(fn) { task = { it: fn(), wait: 0, cond: null }; }
  function stepTask(dt) {
    const cur = task; if (!cur) return;
    if (cur.wait > 0) { cur.wait -= dt; if (cur.wait > 0) return; }
    if (cur.cond) { if (!cur.cond()) return; cur.cond = null; }
    for (let guard = 0; guard < 50; guard++) {
      const r = cur.it.next();
      if (task !== cur) return;
      if (r.done) { task = null; return; }
      const v = r.value;
      if (typeof v === 'number') { if (v > 0) { cur.wait = v; return; } }
      else if (typeof v === 'function') { if (!v()) { cur.cond = v; return; } }
    }
  }
  function* tween(dur, f) { const t0 = T; yield () => { const p = Math.min(1, (T - t0) / dur); f(p); return p >= 1; }; }
  function* swimTo(x, y, sp = 40) { x = clamp(x, 22, 138); y = clamp(y, 32, FLOOR + 2); fish.free = true; fish.tx = x; fish.ty = y; fish.speed = sp; fish.turn = 6; yield () => Math.hypot(fish.x - x, fish.y - y) < 2.5; fish.turn = 3; }
  function* shake(dur) { const t0 = T; yield () => { fish.ox = Math.round(Math.sin((T - t0) * 30) * 2); if (T - t0 >= dur) { fish.ox = 0; return true; } return false; }; }
  const ease = p => p * p * (3 - 2 * p);

  // ---------------- 音（WebAudio 合成） ----------------
  const A = {
    ac: null, master: null, bgm: null, sfx: null, amb: null, song: null, step: 0, nextT: 0, timer: null, duckUntil: 0,
    init() {
      if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ac = this.ac = new AC();
      this.master = ac.createGain(); this.master.gain.value = 0.5; this.master.connect(ac.destination);
      this.bgm = ac.createGain(); this.bgm.gain.value = 0.35; this.bgm.connect(this.master);
      this.sfx = ac.createGain(); this.sfx.gain.value = 0.8; this.sfx.connect(this.master);
      // 水音：ローパスしたノイズ
      const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 350;
      this.amb = ac.createGain(); this.amb.gain.value = 0.05;
      src.connect(lp); lp.connect(this.amb); this.amb.connect(this.master); src.start();
      this.timer = setInterval(() => this.schedule(), 50);
    },
    tone(f, dur, type = 'square', vol = 0.15, when = 0, slide = 0, out) {
      if (!this.ac) return; const ac = this.ac, t = ac.currentTime + when;
      const o = ac.createOscillator(), gn = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
      gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(gn); gn.connect(out || this.sfx); o.start(t); o.stop(t + dur + 0.02);
    },
    play(name) {
      if (!this.ac) return;
      const m = n => 440 * Math.pow(2, (n - 69) / 12);
      const seq = (notes, len = 0.1, type = 'square', vol = 0.15) => notes.forEach((n, i) => n && this.tone(m(n), len * 0.9, type, vol, i * len));
      switch (name) {
        case 'boot': seq([72, 76, 79, 84, 0, 79, 84], 0.09); this.duck(1.2); break;
        case 'plop': this.tone(500, 0.25, 'sine', 0.4, 0, 0.3); this.tone(900, 0.12, 'sine', 0.2, 0.05, 0.5); break;
        case 'drop': [0, 0.1, 0.2].forEach(w => this.tone(1200, 0.05, 'sine', 0.15, w, 0.7)); break;
        case 'eat': this.tone(300, 0.06, 'square', 0.12, 0, 1.6); break;
        case 'munch': [0, .12, .24, .36].forEach(w => this.tone(180, 0.06, 'square', 0.1, w, 1.4)); break;
        case 'buzz': this.tone(110, 0.2, 'square', 0.12); break;
        case 'nope': this.tone(400, 0.08, 'triangle', 0.15); this.tone(300, 0.1, 'triangle', 0.15, 0.1); break;
        case 'brush': this.noiseBurst(0.15, 2500, 0.15); break;
        case 'suck': this.tone(80, 1.0, 'sawtooth', 0.12, 0, 4); this.noiseBurst(1.0, 800, 0.2); this.duck(2); break;
        case 'bubble': this.tone(600, 0.12, 'sine', 0.2, 0, 2); break;
        case 'pop': this.tone(900, 0.05, 'square', 0.15, 0, 0.4); break;
        case 'jump': this.tone(300, 0.25, 'square', 0.12, 0, 3); break;
        case 'splash': this.noiseBurst(0.3, 1500, 0.25); break;
        case 'pet': seq([84, 88], 0.08, 'triangle', 0.15); break;
        case 'spin': seq([72, 74, 76, 77, 79, 81, 83, 84], 0.05, 'square', 0.08); break;
        case 'puff': this.tone(200, 0.4, 'triangle', 0.2, 0, 2); break;
        case 'net': this.noiseBurst(0.2, 1200, 0.15); break;
        case 'smug': seq([79, 0, 84], 0.08, 'square', 0.12); break;
        case 'death': seq([67, 66, 65, 64], 0.18, 'square', 0.12); this.duck(1.5); break;
        case 'zap': for (let i = 0; i < 8; i++) this.tone(rnd(800, 2000), 0.04, 'sawtooth', 0.1, i * 0.05); this.duck(1.5); break;
        case 'meow': this.tone(700, 0.35, 'triangle', 0.2, 0, 0.6); this.duck(1.5); break;
        case 'tweet': seq([96, 98, 96], 0.06, 'sine', 0.15); break;
        case 'fanfare': seq([72, 72, 72, 76, 0, 79, 0, 84], 0.11); this.duck(2); break;
        case 'pu': this.tone(260, 0.1, 'square', 0.15, 0, 0.8); break;
        case 'koton': this.tone(150, 0.15, 'triangle', 0.35, 0, 0.5); this.tone(120, 0.1, 'triangle', 0.2, 0.15, 0.5); break;
        case 'quack': this.tone(500, 0.12, 'sawtooth', 0.12, 0, 0.6); this.tone(500, 0.12, 'sawtooth', 0.12, 0.18, 0.6); break;
        case 'card': seq([76, 79, 84], 0.09, 'triangle', 0.18); break;
        case 'grow': this.tone(100, 1.5, 'square', 0.1, 0, 3); this.duck(2); break;
        case 'hint': this.tone(880, 0.1, 'sine', 0.08, 0); this.tone(1320, 0.14, 'sine', 0.07, 0.1); this.tone(1760, 0.2, 'triangle', 0.05, 0.22); break;
        case 'blink': this.tone(1500, 0.03, 'sine', 0.05); break;
        case 'chapon': this.tone(900, 0.12, 'sine', 0.18, 0, 0.35); this.tone(1400, 0.06, 'sine', 0.08, 0.06, 0.5); break;
        case 'mogu': this.tone(220, 0.07, 'triangle', 0.16, 0, 0.7); this.tone(200, 0.07, 'triangle', 0.14, 0.18, 0.7); break;
        case 'gulp': this.tone(160, 0.12, 'sine', 0.3, 0, 2.2); break;
        case 'hic': this.tone(900, 0.06, 'square', 0.1, 0, 1.5); break;
        case 'sneeze': this.noiseBurst(0.08, 3000, 0.12); this.tone(700, 0.15, 'square', 0.12, 0.25, 0.4); this.noiseBurst(0.25, 1500, 0.2); break;
        case 'yawn': this.tone(300, 0.7, 'triangle', 0.12, 0, 0.6); break;
        case 'bonk': this.tone(180, 0.12, 'square', 0.2, 0, 0.5); this.tone(1200, 0.05, 'sine', 0.1, 0.05); break;
        case 'boing': this.tone(200, 0.3, 'sine', 0.2, 0, 2.5); break;
        case 'snore': this.tone(120, 0.5, 'sawtooth', 0.04, 0, 1.3); break;
        case 'twinkle': [0, 0.08, 0.16].forEach((w, i) => this.tone(1800 + i * 400, 0.12, 'sine', 0.1, w)); break;
        case 'dance': seq([72, 76, 79, 76, 72, 0, 79, 84], 0.09, 'square', 0.08); break;
      }
    },
    noiseBurst(dur, freq, vol) {
      const ac = this.ac, t = ac.currentTime;
      const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = ac.createBufferSource(); s.buffer = buf;
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
      const gn = ac.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(gn); gn.connect(this.sfx); s.start(t);
    },
    duck(sec) { if (!this.ac) return; this.duckUntil = Math.max(this.duckUntil, this.ac.currentTime + sec); },
    setSong(name) { if (this.song === name) return; this.song = name; this.step = 0; if (this.ac) this.nextT = this.ac.currentTime + 0.05; },
    // BGM：メロディ・ベース・分散和音・軽いリズムのチップチューン（8分音符単位、[音, 長さ]）
    SONGS: (() => {
      const C = [60, 64, 67], Am = [57, 60, 64], F = [53, 57, 60], G = [55, 59, 62], Dm = [50, 53, 57], E = [52, 56, 59], Em = [52, 55, 59];
      return {
        // ふだん：のんびりした水槽の曲（C-Am-F-G を2回、メロディは2周目で少し変わる）
        main: { bpm: 104, lead: 'triangle',
          mel: [[76, 2], [79, 2], [81, 1], [79, 1], [76, 2], [72, 2], [74, 1], [76, 1], [74, 4],
                [69, 2], [72, 2], [74, 1], [72, 1], [69, 2], [71, 2], [74, 2], [67, 4],
                [76, 1], [77, 1], [79, 2], [84, 2], [83, 1], [81, 1], [79, 2], [76, 2], [72, 4],
                [74, 1], [76, 1], [77, 2], [76, 1], [74, 1], [72, 2], [74, 2], [71, 2], [72, 4]],
          chords: [C, Am, F, G, C, Am, F, G], bass: [48, 45, 41, 43, 48, 45, 41, 43], drum: 'k-h-s-h-k-hkh-s-h' },
        // 札：とぼけた哀愁（Dm-A-Dm-A で、ゆっくり）
        card: { bpm: 84, lead: 'square',
          mel: [[74, 3], [72, 1], [70, 2], [69, 2], [69, 4], [0, 4], [70, 2], [69, 1], [67, 1], [65, 2], [64, 2], [62, 6], [0, 2]],
          chords: [Dm, E, Dm, E], bass: [38, 40, 38, 40], drum: 'k---h---k---h---' },
        // ごきげん（コンボ・満腹など、ストレスが低い時）
        happy: { bpm: 128, lead: 'square',
          mel: [[72, 1], [76, 1], [79, 1], [84, 1], [83, 2], [79, 2], [81, 1], [79, 1], [77, 1], [76, 1], [74, 4],
                [72, 1], [74, 1], [76, 1], [79, 1], [77, 2], [74, 2], [76, 1], [74, 1], [71, 1], [74, 1], [72, 4]],
          chords: [C, F, G, C], bass: [48, 41, 43, 48], drum: 'k-h-shh-k-hks-hh' },
        // ピンチ（空腹・汚れ・ストレスが限界の時）
        tense: { bpm: 112, lead: 'square',
          mel: [[69, 1], [0, 1], [69, 1], [72, 1], [71, 2], [68, 2], [69, 1], [0, 1], [69, 1], [76, 1], [74, 4],
                [72, 1], [0, 1], [71, 1], [69, 1], [68, 2], [64, 2], [65, 2], [68, 2], [69, 4]],
          chords: [Am, E, Am, E], bass: [45, 40, 45, 40], drum: 'k-hhk-h-k-hhkshh' },
      };
    })(),
    bgmOn: true, songT: 0, loud: 1,
    setSong(name) {
      if (this.song === name) return;
      this.song = name; this.step = 0; this.melIdx = 0; this.melLeft = 0;
      if (this.ac) this.nextT = this.ac.currentTime + 0.05;
    },
    schedule() {
      const ac = this.ac; if (!ac) return;
      const ducked = ac.currentTime < this.duckUntil;
      const on = this.song && this.bgmOn;
      this.bgm.gain.setTargetAtTime(on ? (ducked ? 0.12 : 0.42) : 0, ac.currentTime, 0.1);
      const s = this.SONGS[this.song]; if (!s || !this.bgmOn) return;
      const len = 60 / s.bpm / 2, m = n => 440 * Math.pow(2, (n - 69) / 12);
      if (this.nextT < ac.currentTime) this.nextT = ac.currentTime + 0.02;
      const barLen = 8, total = s.chords.length * barLen;
      while (this.nextT < ac.currentTime + 0.25) {
        const i = this.step % total, w = this.nextT - ac.currentTime, bar = Math.floor(i / barLen), b8 = i % barLen;
        // メロディ（音の長さつき）
        if (this.melLeft <= 0) {
          const [n, d] = s.mel[this.melIdx % s.mel.length]; this.melIdx++;
          this.melLeft = d;
          if (n) { this.tone(m(n), len * d * 0.92, s.lead, s.lead === 'triangle' ? 0.16 : 0.07, w, 0, this.bgm); this.tone(m(n) * 2, len * d * 0.5, 'sine', 0.025, w, 0, this.bgm); }
        }
        this.melLeft--;
        // ベース（1拍目と3拍目、裏で5度）
        const root = s.bass[bar];
        if (b8 === 0 || b8 === 4) this.tone(m(root), len * 1.8, 'triangle', 0.2, w, 0, this.bgm);
        if (b8 === 6) this.tone(m(root + 7), len * 0.9, 'triangle', 0.12, w, 0, this.bgm);
        // 分散和音（細かく小さく）
        const ch = s.chords[bar];
        this.tone(m(ch[b8 % 3] + 12), len * 0.45, 'square', 0.022, w, 0, this.bgm);
        this.tone(m(ch[(b8 + 1) % 3] + 12), len * 0.4, 'square', 0.016, w + len / 2, 0, this.bgm);
        // リズム（k=キック s=スネア h=ハイハット、16分の並び）
        for (let h2 = 0; h2 < 2; h2++) {
          const c = s.drum[(b8 * 2 + h2) % s.drum.length], ww = w + h2 * len / 2;
          if (c === 'k') this.tone(120, 0.12, 'sine', 0.35, ww, 0.35, this.bgm);
          else if (c === 's') this.noise(0.08, 2200, 0.08, ww);
          else if (c === 'h') this.noise(0.03, 7000, 0.04, ww);
        }
        this.step++; this.nextT += len;
      }
    },
    noise(dur, freq, vol, when) {
      const ac = this.ac, t = ac.currentTime + (when || 0);
      if (!this._nb) { this._nb = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate); const d = this._nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      const src = ac.createBufferSource(); src.buffer = this._nb;
      const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = freq;
      const gn = ac.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(gn); gn.connect(this.bgm); src.start(t); src.stop(t + dur + 0.02);
    },
  };
  const sfx = n => A.play(n);

  // ---------------- 入力 ----------------
  const BTN_ICON = { feed: 'food', clean: 'clean', touch: 'touch' };
  // 餌と網は 0.12 秒だけ待って、もう片方が来たら「同時押し」＝図鑑を開く
  const COMBO_WIN = 0.12;
  let pendingBtn = null;
  function press(btn) {
    A.init();
    flashButton(btn);
    if (mini && mode === 'play') { miniPress(); return; }
    if (mode !== 'zukan' && (mode === 'play' || mode === 'dead') && (btn === 'feed' || btn === 'net')) {
      if (pendingBtn && pendingBtn.btn !== btn && T - pendingBtn.t <= COMBO_WIN) { pendingBtn.cancel = true; pendingBtn = null; openZukanPaused(); return; }
      const pb = { btn, t: T, cancel: false }; pendingBtn = pb;
      setTimeoutT(() => { if (!pb.cancel) { if (pendingBtn === pb) pendingBtn = null; pressNow(btn); } }, COMBO_WIN);
      return;
    }
    pressNow(btn);
  }
  let zukanFrom = null;
  let zukanCur = 0, zukanDetail = false;
  function openZukan(from) { zukanFrom = from; mode = 'zukan'; zukanDetail = false; const i = L.CAUSES.findIndex(c => c.id === causeId); zukanCur = i >= 0 ? i : 0; sfx('card'); }
  function openZukanPaused() { openZukan(mode); }
  function pressNow(btn) {
    if (mini && mode === 'play') { miniPress(); return; }
    try { g.press(btn, T); } catch (e) {}
    if (mgInvite && mode === 'play') { if (btn === 'touch' && !busy) { startMini(); return; } mgInvite = null; thought = null; }
    if (ev && !ev.result && mode === 'play') { ev.result = btn === ev.need ? 'ok' : 'fail'; return; }   // 特殊イベント中は、押したボタンで結果が決まる
    if (mode === 'title') { if (bootT < 0) boot(); return; }
    if (mode === 'boot') return;
    if (mode === 'card') {
      if (T - cardT < 4) return;
      if (btn === 'net') { openZukan('card'); } else { bubbleWipe(); }
      return;
    }
    if (mode === 'zukan') {
      // 図鑑の操作：餌＝←、ふれあい＝→、掃除＝↓、網＝戻る
      const n = L.CAUSES.length;
      // 図鑑は横6列（49種以上は7列）。餌＝左、ふれあい＝右、掃除＝下（いちばん下まで行ったら同じ列のいちばん上へ）、網＝戻る
      if (btn === 'feed') { zukanCur = (zukanCur + n - 1) % n; zukanDetail = false; sfx('blink'); }
      else if (btn === 'touch') { zukanCur = (zukanCur + 1) % n; zukanDetail = false; sfx('blink'); }
      else if (btn === 'clean') { const C = S.zukanCols ? S.zukanCols(n) : 6; zukanCur = zukanCur + C < n ? zukanCur + C : zukanCur % C; zukanDetail = false; sfx('blink'); }
      else { mode = zukanFrom || 'card'; zukanFrom = null; zukanDetail = false; sfx('blink'); }
      return;
    }
    if (mode === 'dead') { if (btn === 'net') { if (netReady) collect(); else netQueued = true; } return; }
    if (mode !== 'play') return; // ending中は入力停止
    if (btn === 'net') { if (!busy) runAction('net'); return; }
    if (btn === 'feed' && feeding) { if (g.canFeed(pellets.length)) dropBatch(); else sfx('nope'); return; }
    if (T < restUntil) { sfx('nope'); fx.push({ k: 'text', s: 'ひとやすみ中', x: 80, y: 46, t: T, d: 0.8, c: '#ffffff' }); return; }   // v20
    if (busy) { queued = btn; return; }
    runAction(btn);
  }
  const KEYS = { '1': 'feed', 'z': 'feed', '2': 'clean', 'x': 'clean', '3': 'touch', 'c': 'touch', '4': 'net', 'v': 'net', ' ': 'net' };
  if (cfg.main) {
    window.addEventListener('keydown', e => { const b = KEYS[e.key.toLowerCase()]; if (b && !e.repeat) { e.preventDefault(); press(b); } });
    document.querySelectorAll('[data-btn]').forEach(el => {
      el.addEventListener('pointerdown', e => { e.preventDefault(); press(el.dataset.btn); });
    });
  }
  if (cfg.main) {
    const bb = document.getElementById('bgmbtn');
    try { A.bgmOn = localStorage.getItem('goldfish_bgm') !== 'off'; } catch (e) {}
    const paint = () => { if (bb) { bb.textContent = A.bgmOn ? '♪ BGM' : '♪ OFF'; bb.classList.toggle('off', !A.bgmOn); } };
    paint();
    if (bb) bb.addEventListener('click', e => { e.preventDefault(); A.init(); A.bgmOn = !A.bgmOn; try { localStorage.setItem('goldfish_bgm', A.bgmOn ? 'on' : 'off'); } catch (er) {} paint(); });
  }
  function flashButton(btn) {
    if (!cfg.main) return;
    const el = document.querySelector(`[data-btn="${btn}"]`); if (!el) return;
    el.classList.add('down'); setTimeout(() => el.classList.remove('down'), 120);
  }

  // ---------------- 進行 ----------------
  function boot() {
    mode = 'boot'; bootT = T; sfx('boot');
    for (let i = 0; i < 6; i++) setTimeoutT(() => sfx('bubble'), 0.15 + i * 0.22);
    startTask(function* () {
      yield BOOT_T;
      // 前回の続き
      const s = g.s;
      if (s.phase === 'ending' && s.cause) { resumeEnding(s.cause); return; }
      if (s.phase === 'alive' && s.gauge > 0) { resumeFish(); return; }
      if (s.phase === 'dead' && s.cause) { try { g.record(s.cause); } catch (e) {} }   // v17: 札の前に閉じた死も図鑑に残す
      nextFish();
    });
  }

  // 札のあと：泡で画面をおおって、水槽をまっさらに戻してから次の魚
  function bubbleWipe() {
    mode = 'boot'; bootT = T; A.setSong(null); sfx('boot');
    for (let i = 0; i < 6; i++) setTimeoutT(() => sfx('bubble'), 0.15 + i * 0.22);
    startTask(function* () {
      yield BOOT_T * 0.5;
      resetScene(); waveH.fill(0); waveV.fill(0); treasures = initTreasures();   // 画面が泡でおおわれている間に全部リセット
      yield BOOT_T * 0.5;
      nextFish();
    });
  }

  function resetScene() {
    pellets = []; poops = []; bubbles = []; fx = []; thought = null; queued = null; busy = false; feeding = false;
    netReady = false; netQueued = false; wipes = null; sparkle = false;
    finger = brush = nozzle = net = paw = duck = feather = eyeball = bigBubble = null; fish.rollF = null; fish.die = null; fish.asset = null; fish.assetFrame = null; fish.assetScale = 1;
    babies = []; ufo = chef = meteor = crater = ghost = null; ghostPellets = [];
    xo = {};
    ev = null; catObj = mpel = glow = null; dark = 0; shakeAmp = 0; evAt = T + rnd(35, 60); restUntil = 0;
    crack = soul = bigFace = smear = birdObj = null; scales = []; fish.hermit = false; hoop = ball = null; visitor = null; visitAt = T + rnd(25, 45);
    Object.assign(fish, { x: 80, y: -30, dir: 1, eyes: 'normal', vis: false, opts: {}, rot: 0, ox: 0, oy: 0, free: true, glitch: false, split: 0, smugUntil: 0, vx: 0, vy: 0, legLen: 0, cruise: false, turn: 3, look: null, wps: [], shakeUntil: 0, splitHead: 0, face: 1, turnP: 0, sq: 0, sx: 1, sy: 1, chewUntil: 0, blinkAt: 2, blinkUntil: 0, ex: {}, swimPh: 0, eatT: -9, surpT: -9, rollF: null });
    gest = null; omenG = 0; omenAt = T + rnd(30, 40); mini = null; mgInvite = null; mgAt = T + rnd(20, 35);   // v23 P5：1匹目のうちに会えるよう早めに
  }

  function nextFish() {
    resetScene(); mode = 'play'; busy = true; A.setSong(null);
    const r = g.newFish();
    fish.color = FISH_COLORS[Math.random() * FISH_COLORS.length | 0];   // 6色からランダム
    g.s.color = fish.color;   // v17: 体色も保存
    startTask(function* () {
      fish.vis = true; fish.free = false; fish.x = rnd(60, 100); fish.y = -20; fish.dir = Math.random() < 0.5 ? 1 : -1;
      yield* tween(0.35, p => { fish.y = -20 + p * 50; });
      sfx('plop'); splash(fish.x, WATER); splashAt(fish.x, 70);
      yield* tween(0.6, p => { fish.y = 30 + ease(p) * 50; });
      fish.free = true; fish.tx = fish.x; fish.ty = fish.y;
      if (r && r.instantDeath) {
        yield 0.5;
        yield* suddenDeath('instant');
        return;
      }
      const pe = g.persona && g.persona();
      if (decorNews) {   // v19：図鑑がふえて水槽が豪華になった
        fx.push({ k: 'text', s: 'すいそうが ごうかに なった！', x: 80, y: 96, t: T + 0.1, d: 2.6, c: '#ffd23a', big: true });
        fx.push({ k: 'text', s: 'かざり Lv.' + decorNews, x: 80, y: 112, t: T + 0.4, d: 2.2, c: '#ffffff' });
        fx.push({ k: 'rainbow', t: T, d: 1.2 }); sfx('fanfare'); decorNews = 0; yield 2.2;
      }
      fx.push({ k: 'badge', s: g.s.fishNo + '匹目　' + (COLOR_NAME[fish.color] || '') + (pe ? '　' + pe.name : ''), t: T + 0.3, d: 3.0 });
      if (pe) fx.push({ k: 'badge', s: PERSONA_DESC[pe.id] || '', t: T + 0.5, d: 2.8, y: 62 });
      yield 2.5;           // ぽちゃんの後の静けさ
      A.setSong('main');
      busy = false; afterAction();
    });
  }

  function resumeFish() {
    resetScene(); mode = 'play'; fish.vis = true; fish.x = 80; fish.y = 110; fish.tx = 80; fish.ty = 110;
    fish.color = g.s.color || 'orange';   // v17: 前回と同じ色で
    A.setSong('main');
  }

  function runAction(type) {
    if (gest) endGesture();
    busy = true; fish.cruise = false; fish.turn = 3;
    const fn = ACTIONS[type];
    startTask(function* () {
      const res = yield* fn();
      if (res === 'dead') return;
      busy = false;
      if (type !== 'net' && mode === 'play' && !g.isFull()) { g.s.careN = (g.s.careN || 0) + 1; if (g.s.careN % REST_EVERY === 0) startRest(); }
      try { g.save && g.save(); } catch (e) {}
      afterAction();
    });
  }

  // v20：ひと休み。世話3回ごとに金魚がマイペースに休む（約9秒）。そのあいだに しぐさ・お客さん を見られる
  let restUntil = 0, restStart = 0;
  const REST_EVERY = 3, REST_LEN = 9, REST_MIN = 5;
  // v22：ひと休みのあいだは、しぐさ・お客さんの事故は起きない（休憩は安心して見られる時間）
  { const ga = g.gestureAccident.bind(g), va = g.visitorAccident.bind(g);
    g.gestureAccident = n => (T < restUntil ? null : ga(n)); g.visitorAccident = k => (T < restUntil ? null : va(k)); }
  function startRest() {
    if (cfg.demo) return;   // 見本では休まない
    restStart = T; restUntil = T + REST_LEN; queued = null;
    fx.push({ k: 'text', s: 'ひとやすみ…', x: 80, y: 46, t: T, d: 1.4, c: '#ffffff' });
    if (!gest && !visitor && mode === 'play') { gestAt = T + 0.6; }
  }
  function afterAction() {
    if (g.isFull()) { startEnding(); return; }
    if (celebrate && mode === 'play') {
      // コンボのお祝い：虹色にきらめいて宙返り
      celebrate = false; busy = true;
      startTask(function* () { yield* gShowOff(); fish.ex = {}; busy = false; afterAction(); });
      return;
    }
    if (queued) { const q = queued; queued = null; runAction(q); }
  }

  // ---------------- 世話 ----------------
  const ACC_PELLET = { poison: 'poison', frozen: 'ice', flower: 'seed', burnt: 'fire', shock: 'spark' };
  const mouthX = () => fish.x + fish.dir * 18;   // 新しい金魚のくちびる（v15）
  const MOUTH_DY = 4; const mouthY = () => fish.y + MOUTH_DY;

  // 3粒の組を落とす（食べている最中でも追加できる。場に9粒まで）
  function dropBatch() {
    const pend = pellets.filter(p => p.mine).length;
    const r = g.startFeed(pend);
    sfx('drop');
    const bad = r.accident ? (Math.random() * 3 | 0) : -1;
    const baseX = rnd(35, 125);
    const batch = { r, eaten: 0 };
    for (let i = 0; i < 3; i++) {
      const gold = r.gold && i === 1;
      pellets.push({ x: clamp(baseX + rnd(-16, 16), 28, 132), y: WATER - 6 - i * 8, vy: rnd(13, 16), ph: rnd(0, 6),
        type: i === bad ? ACC_PELLET[r.accident] : gold ? 'gold' : 'normal', bad: i === bad, gold, rot: 0, mine: r.willEat, batch });
    }
    if (!r.willEat) {
      // 満腹：首を振る
      g.finishFeed(false, pellets.some(p => p.mine));
      fish.shakeUntil = T + 1.4; thought = { icon: 'angry', until: T + 1.4 };
    }
  }

  function* actFeed() {
    if (!g.canFeed(pellets.length)) { sfx('nope'); yield* shake(0.5); return; }
    feeding = true;
    dropBatch();
    for (;;) {
      const rem = pellets.filter(p => p.mine);
      if (!rem.length) break;
      // 真ん中まで落ちた粒を近い順に。まだなら一番下の粒を見上げて待つ
      const ready = rem.filter(p => p.y >= EAT_Y);
      const dist = p => Math.hypot(p.x - fish.x, p.y - fish.y);
      const p = ready.length ? ready.sort((a, b) => dist(a) - dist(b))[0] : rem.sort((a, b) => b.y - a.y)[0];
      fish.free = true; fish.speed = 42; fish.turn = 6;
      yield () => {
        if (!pellets.includes(p)) return true;
        const d = p.x > fish.x ? 1 : -1;
        if (Math.abs(p.x - fish.x) > 6) fish.dir = d;
        if (p.y < EAT_Y) {
          if (pellets.some(q => q.mine && q !== p && q.y >= EAT_Y)) return true;   // 別の粒が先に来たら乗り換え
          fish.eyes = 'normal'; fish.look = 'up'; fish.speed = 34;
          fish.tx = clamp(p.x - d * 20, 25, 135); fish.ty = EAT_Y + 6;
          fish.mouth = (Math.sin(T * 8) > 0) ? 1 : 0;
          return false;
        }
        const hurry = p.y < CHASE_Y;   // 中央ちょい下までは全力で追う
        fish.eyes = hurry ? 'wide' : 'normal'; fish.look = null; fish.speed = hurry ? 85 : 50; fish.turn = hurry ? 11 : 8;
        if (!p.t0) p.t0 = T;
        // 壁ぎわの粒には反対側から回り込む
        const side = p.x - 20 < 26 ? -1 : p.x + 20 > 134 ? 1 : d;
        if (Math.abs(fish.x - (p.x - side * 20)) < 10) fish.dir = side;
        const lead = p.y < FLOOR + 4 ? p.vy * (hurry ? 0.5 : 0.35) : 0;   // 落ちる先を狙う
        fish.tx = clamp(p.x - side * 18, 25, 135); fish.ty = clamp(p.y + lead - MOUTH_DY, 35, FLOOR + 2);
        const tol = T - p.t0 > 4 ? 12 : 7;
        if (T < fish.chewUntil) return false;
        if (T - p.t0 > 6) { p.x += (mouthX() - p.x) * 0.3; p.y += (mouthY() - p.y) * 0.3; }   // 届かなければ吸い寄せる
        return Math.abs(mouthX() - p.x) < tol && Math.abs(mouthY() - p.y) < tol;
      };
      if (!pellets.includes(p) || p.y < EAT_Y) continue;
      pellets.splice(pellets.indexOf(p), 1); fish.turn = 3; fish.look = null;
      // ぱくっ → ほっぺをふくらませて、もぐもぐ（噛みながら次の粒へ向かえる）
      fish.mouth = 'o'; sfx('eat'); fish.sq = 1; fish.eatT = T;
      const e = g.eatPellet();
      if (!p.left) p.batch.eaten++;
      yield 0.08; fish.mouth = 0;
      fish.chewUntil = T + 0.5; setTimeoutT(() => sfx('mogu'), 0.05); setTimeoutT(() => { sfx('gulp'); fish.sq = 0.7; }, 0.5);
      if (p.bad) { feeding = false; yield 0.4; return yield* suddenDeath(p.batch.r.accident); }
      if (p.gold) {
        g.ateGold(); sfx('fanfare'); fish.sq = 1.2;
        fx.push({ k: 'text', s: 'きんのつぶ！ +2', x: fish.x, y: fish.y - 20, t: T, d: 1.6, c: '#ffd23a', big: true });
        for (let i = 0; i < 10; i++) fx.push({ k: 'star', x: fish.x + rnd(-18, 18), y: fish.y + rnd(-10, 10), t: T + i * 0.05, d: 0.6 });
      }
      if (p.batch.eaten === 3) {
        const f = g.finishFeed(true, pellets.some(q => q.mine)); reward(f);
        if (f && f.okawari) { thought = { icon: 'food', until: T + 10 }; }
        // おいしい！
        fish.ex = { eyes: 'closed', blush: true, mark: 'heart' }; sfx('pet');
        setTimeoutT(() => { if (fish.ex.mark === 'heart') fish.ex = {}; }, 0.9);
      }
      if (e && e.poop) {
        sfx('munch');
        yield* tween(0.8, q => { fish.mouth = (q * 8 | 0) % 2; });
        fish.mouth = 0;
        poops.push({ x: fish.x - fish.dir * 24, y: fish.y + 4, vy: 8 });
      }
      yield 0.05;
    }
    feeding = false;
    if (g.s.satiety >= L.SATIETY_MAX - 2) {   // まんぷく
      fish.ex = { eyes: 'closed', mouth: 'smile', cheeks: true, blush: true, mark: 'heart', sx: 1.12, sy: 1.05 };
      yield 0.9;
    }
    fish.ex = {};
  }

  function* actClean() {
    const r = g.startClean();
    const dirt0 = g.s.dirt;
    if (r.accident === 'sucked') {
      // v16：掃除機の吸い口が水槽に入ってくる → 気づいて逃げる → ふんばる・引き戻される → のびて → スポン → ホースをのぼっていく
      fish.free = false; fish.vx = fish.vy = 0; fish.ex = {}; fish.rot = 0;
      try { S.prewarmDeath && S.prewarmDeath('sucked', { color: fish.color, stage: stageNow() }); } catch (e) {}
      const st = stageNow(), TAIL = [17.5, 21.5, 23.5][st - 1], NOSE = [17, 20.5, 23][st - 1];
      const vx = clamp(fish.x - fish.face * 6, 36, 124), my = clamp(fish.y - 46, WATER + 16, 120);   // 吸い口の口の高さ
      xo.vac = { x: vx, y: -24, suck: false, bulge: null, top: -2, ox: 0 };
      sfx('suck'); A.duck(8);
      let wet = false;
      const pullDirt = () => {   // フン・食べ残しも吸われる
        const vv = xo.vac; if (!vv) return;
        for (const arr of [poops, pellets]) for (let i = arr.length - 1; i >= 0; i--) {
          const q = arr[i], dx = vv.x - q.x, dy = vv.y - q.y, d = Math.hypot(dx, dy) || 1;
          q.x += dx / d * 2.2; q.y += dy / d * 2.2; if (q.vy) q.vy = 0;
          if (d < 5) arr.splice(i, 1);
        }
      };
      yield* tween(0.9, p => { xo.vac.y = -24 + (my + 24) * ease(p); if (!wet && xo.vac.y > WATER) { wet = true; splashAt(vx, 45); sfx('chapon'); } });
      xo.vac.suck = true; sfx('suck');
      wipeDirt = Math.max(0, dirt0 - 1); wipes = [{ x: vx, y: my, r: 0 }];
      const setF = f => { fish.die = dfr('sucked', f); };
      const shake = a => { xo.vac.ox = Math.round(Math.sin(T * 50) * a); };
      // 1) 気づく（吸われて少しずつ寄っていく）
      const x0 = fish.x, y0 = fish.y;
      for (const [f, d] of [[0, 0.4], [1, 0.3], [2, 0.35]]) { setF(f); if (f === 2) sfx('nope'); yield* tween(d, p => { fish.x += (vx - fish.x) * 0.04; pullDirt(); wipes[0].r += 1.2; }); }
      // 2) 頭を下へ向けて逃げようとする
      const tailAt = (sx) => fish.y - TAIL * sx;   // 頭が下のとき、尾の先の高さ
      const startY = my + TAIL + 34;                 // 尾の先が吸い口から 34px 下
      for (const f of [3, 4, 5]) { setF(f); const fy = fish.y; yield* tween(0.14, p => { setF(f + Math.min(0.67, p)); fish.x += (vx - fish.x) * 0.3; fish.y = fy + (startY - fy) * 0.35; pullDirt(); }); }
      fish.x = vx;
      // 3) ふんばる → ぐいっと引き戻される（3回）
      const SAY = ['ふんぬぬ…！', 'いやだ〜！', 'たすけて〜！'];
      for (let k = 0; k < 3; k++) {
        fx.push({ k: 'text', s: SAY[k], x: clamp(vx + 34, 40, 120), y: fish.y + 6, t: T, d: 1.1, c: '#ffffff' });
        const fy = fish.y, t0 = T;
        yield* tween(0.62, p => {
          setF(6 + Math.floor((T - t0) * 12) % 4);
          fish.y = fy + 8 * Math.sin(p * Math.PI / 2); pullDirt(); shake(1); wipes[0].r += 1.5;
          if (Math.random() < 0.35) bubbles.push({ x: fish.x + rnd(-6, 6), y: fish.y + NOSE + 2, r: 1, vy: -18 });
        });
        setF(10); sfx('pu'); A.tone(90, 0.25, 'sawtooth', 0.14, 0, 0.5);
        fx.push({ k: 'text', s: 'ズズッ', x: vx - 26, y: my + 8, t: T, d: 0.8, c: '#ffd23a' });
        const fy2 = fish.y;
        yield* tween(0.22, p => { setF(p < 0.5 ? 10 : 11); fish.y = fy2 - 14 * ease(p); shake(2); });
        xo.vac.ox = 0; yield 0.12;
      }
      // 4) 尾が吸い口に入る：のびて、のびて…（吸い口より上は見えない）
      xo.clipY = my - 1;
      const noseY = fish.y + NOSE;   // 鼻先はここでふんばる
      const SX = [1.2, 1.32, 1.45, 1.6];
      for (let i = 0; i < 4; i++) {
        const f = 12 + i, ny0 = fish.y, ny1 = Math.max(noseY - NOSE * SX[i] + (i * 2), my + TAIL * SX[i] - 6);
        if (i === 2) { sfx('puff'); fx.push({ k: 'text', s: 'の〜び〜る〜', x: clamp(vx + 32, 40, 122), y: noseY - 6, t: T, d: 1.2, c: '#ffffff' }); }
        yield* tween(i < 2 ? 0.32 : 0.28, p => { setF(f); fish.y = ny0 + (ny1 - ny0) * ease(p); shake(1); pullDirt(); });
      }
      yield 0.2;
      // 5) スポン！
      setF(16); sfx('pop'); A.tone(140, 0.18, 'square', 0.2, 0, 0.4);
      const sy0 = fish.y;
      yield* tween(0.16, p => { fish.y = sy0 - (sy0 - (my - NOSE * 1.6 - 4)) * p * p; });
      fish.vis = false; fish.die = null; xo.clipY = null;
      fx.push({ k: 'text', s: 'スポン！', x: vx, y: my + 18, t: T, d: 1.0, c: '#ffd23a', big: true });
      for (let i = 0; i < 6; i++) fx.push({ k: 'drop', x: vx + rnd(-10, 10), y: my + 2, vx: rnd(-30, 30), vy: rnd(-10, 20), t: T, d: 0.5 });
      // 6) ふくらみがホースをのぼっていく（ごくん、ごくん）
      xo.vac.bulge = 0; xo.vac.bulgeCol = FISH_HEX[fish.color] || '#ff8a00';
      for (let k = 0; k < 3; k++) A.tone(260 - k * 50, 0.12, 'sine', 0.3, k * 0.28, 0.6);
      yield* tween(1.0, p => { xo.vac.bulge = p; shake(p < 0.9 ? 1 : 0); });
      xo.vac.bulge = null; xo.vac.ox = 0;
      // 7) げふっ（うろこが一枚）
      yield 0.25;
      sfx('bubble'); bubbles.push({ x: vx, y: my + 2, r: 4, vy: -10 });
      fx.push({ k: 'text', s: 'げふっ', x: vx + 22, y: my + 10, t: T, d: 1.2, c: '#ffffff' });
      scales.push({ x: vx, y: my + 4, vx: 0, vy: 14, rot: 0.4, t: T });
      xo.vac.suck = false;
      yield 0.7;
      const vy0 = xo.vac.y; let out = false;
      yield* tween(0.7, p => { xo.vac.y = vy0 - (vy0 + 50) * p * p; if (!out && xo.vac.y < WATER) { out = true; splashAt(vx, 30); sfx('splash'); } });
      xo.vac = null; wipes = [{ x: 80, y: 120, r: 200 }];
      return yield* deathSettle('sucked');
    }
    const spots = [[rnd(35, 70), rnd(50, 90)], [rnd(90, 130), rnd(90, 140)], [rnd(40, 80), rnd(150, 190)]];
    brush = { x: 175, y: 30, a: 0 };
    wipeDirt = Math.max(0, dirt0 - 1); wipes = r.effective ? [] : null;
    sparkle = !r.effective && dirt0 === 0;
    for (let i = 0; i < 3; i++) {
      const [sx, sy] = spots[i];
      const bx0 = brush.x, by0 = brush.y;
      // 魚はブラシを避ける
      fish.free = true; fish.speed = 35;
      fish.tx = clamp(sx < 80 ? sx + 60 : sx - 60, 25, 135); fish.ty = clamp(sy + rnd(-30, 30), 40, 200);
      yield* tween(0.35, p => { brush.x = bx0 + (sx - bx0) * ease(p); brush.y = by0 + (sy - by0) * ease(p); });
      if (r.accident === 'overpolished' && i === 2) {
        // ブラシが魚を巻き込む
        fish.free = false; const fx0 = fish.x, fy0 = fish.y;
        yield* tween(0.4, p => { brush.x = sx + (fx0 - sx) * p; brush.y = sy + (fy0 - sy) * p; });
        yield* tween(0.4, p => { brush.x = fx0 + p * 100; brush.y = fy0 - p * 100; });
        brush = null; wipes = null;
        // v23.2：ユーザーの絵。スポンジでごしごしこすられて、真っ白になる（透けて消える演出はなくした）
        fish.dir = fish.face = -1; fish.turnP = 0; fish.opts = {}; fish.ex = {};
        for (let k = 0; k < 4; k++) setTimeoutT(() => sfx('brush'), 0.3 + k * 0.5);
        yield* playSeq('overpolished', { d: 3.0 });
        sfx('death');
        return yield* suddenDeath('overpolished', true);
      }
      const w = { x: sx, y: sy, r: 0 }; if (wipes) wipes.push(w);
      for (let k = 0; k < 3; k++) { sfx('brush'); yield* tween(0.2, p => { brush.a = Math.sin(p * Math.PI * 2) * 7; w.r = Math.max(w.r, (k * 0.2 + p * 0.2) / 0.6 * 30); }); }
      brush.a = 0;
    }
    const bx0 = brush.x, by0 = brush.y;
    yield* tween(0.4, p => { brush.x = bx0 + (180 - bx0) * p; brush.y = by0 + (20 - by0) * p; });
    brush = null;
    reward(g.finishClean());
    wipes = null; sparkle = false;
    if (r.effective) {
      poops = poops.slice(0, Math.max(0, poops.length - 2));
      // ぴかぴか！ ごきげんで一周
      sparkle = true; sfx('fanfare');
      fish.ex = { eyes: 'sparkle', mouth: 'grin', blush: dirt0 >= 3, mark: 'note' };
      const sx0 = fish.x < 80 ? 125 : 35;
      yield* swimTo(sx0, clamp(fish.y + rnd(-30, 30), 50, 190), 85);
      yield* swimTo(80, clamp(fish.y, 60, 180), 70);
      sparkle = false; fish.ex = {};
    } else {
      // きれいなのに磨かれた
      fish.ex = { eyes: 'side', brows: 'down', mouth: 'wavy', mark: '?' }; yield 0.8; fish.ex = {};
    }
  }

  // ---------------- 人の指 ----------------
  function* fingerTo(x, y, dur) {
    if (!finger) finger = { x, y: -34 };
    const x0 = finger.x, y0 = finger.y;
    yield* tween(dur, p => { const e = ease(p); finger.x = x0 + (x - x0) * e; finger.y = y0 + (y - y0) * e; });
  }
  function* fingerOut(dur) { if (!finger) return; yield* fingerTo(finger.x, -40, dur || 0.45); finger = null; }
  function* fingerPoke(dx, dy) { const x0 = finger.x, y0 = finger.y; yield* tween(0.12, p => { finger.x = x0 + dx * p; finger.y = y0 + dy * p; }); yield* tween(0.15, p => { finger.x = x0 + dx * (1 - p); finger.y = y0 + dy * (1 - p); }); }

  function* actTouch() {
    const r = g.startTouch(); stat('t:' + (r.reaction || (r.hungry ? 'hungry' : 'refused')));
    const above = () => [clamp(fish.x, 30, 130), clamp(fish.y - 14, 26, 200)];
    if (r.refused) {
      // ふれあいばかりで飽きた：指が来ても、ぷいっ
      fish.free = true; fish.tx = fish.x; fish.ty = fish.y;
      yield* fingerTo(clamp(fish.x + fish.dir * 26, 28, 132), clamp(fish.y - 6, 30, 200), 0.6);
      sfx('nope'); fish.sq = 0.9; fish.dir = -fish.dir;
      fish.ex = { eyes: 'annoyed', brows: 'angry', mouth: 'pout', mark: 'anger' };
      yield* swimTo(clamp(fish.x + fish.dir * 34, 30, 130), fish.y, 55);
      yield* tween(0.5, p => { finger.x += Math.sin(p * 20) * 0.6; });   // 指がしょんぼり
      yield* fingerOut(0.6);
      yield 0.3; fish.ex = {};
      g.finishTouch(); return;
    }
    if (r.hungry || !r.reaction) {
      yield* fingerTo(...above(), 0.6);
      thought = { icon: 'food', until: T + 2.5 }; fish.ex = { eyes: 'teary', brows: 'worried', mouth: 'pout' };
      yield* shake(0.8); yield* fingerOut(); fish.ex = {}; return;
    }
    const acc = r.accident;
    switch (r.reaction) {
      case 'pet': {
        yield* swimTo(80, 80, 45); fish.dir = fish.face;
        if (acc === 'cat') {
          // 指だと思ったら…猫の手だった：ゆっくり下りてきて、ためて、さっとすくう
          fish.free = false; fish.look = 'up'; fish.ex = { eyes: 'sparkle', mouth: 'smile', blush: true };
          paw = { x: 80, y: -50 };
          yield* tween(0.9, p => { paw.y = -50 + ease(p) * 40; paw.x = 80 + Math.sin(p * 5) * 3; });
          yield* tween(0.45, p => { paw.y = -10 - Math.sin(p * Math.PI) * 6; fish.oy = Math.round(Math.sin(p * Math.PI) * -1); });   // ため
          fish.look = null; sfx('meow');
          yield* tween(0.7, p => dieAt('cat', p * 0.75));   // 気づいて、こわばる
          const fy = fish.y;
          yield* tween(0.3, p => { paw.y = -10 + (fy - 14 + 10) * p * p; dieAt('cat', 0.75 + p * 0.25); });
          fish.die = null; fish.vis = false; paw.fish = true; fish.sq = 0; splashAt(paw.x, 40);
          yield* tween(0.75, p => { paw.y = (fy - 14) - ease(p) * (fy + 60); paw.x = 80 + Math.sin(p * 14) * 4 * (1 - p); });
          paw = null;
          return yield* deathSettle('cat');
        }
        fish.free = false;
        yield* fingerTo(80, 66, 0.6);
        // なでなで
        fish.ex = { eyes: 'closed', mouth: 'smile', blush: true, mark: 'heart' };
        for (let k = 0; k < 3; k++) {
          sfx('pet'); fish.sq = 0.4;
          yield* tween(0.5, p => { finger.x = 80 + Math.sin(p * Math.PI * 2) * 9; finger.y = 66 + Math.abs(Math.sin(p * Math.PI * 2)) * 1; fish.oy = Math.round(Math.sin(p * Math.PI * 2) * 1); });
        }
        fish.oy = 0;
        yield* fingerOut();
        fish.ex = { eyes: 'sparkle', mouth: 'grin', blush: true }; yield 0.5;
        fish.ex = {}; fish.free = true; break;
      }
      case 'jump': {
        const jx = clamp(fish.x, 40, 120);
        yield* swimTo(jx, 58, 55);
        yield* fingerTo(jx + fish.dir * 4, WATER + 6, 0.6);   // 水面に指先をちょんと浸けて構える
        fish.look = 'up'; fish.ex = { eyes: 'sparkle', mouth: 'o' }; yield 0.5; fish.look = null;
        fish.free = false; sfx('jump'); const x0 = fish.x;
        splash(fish.x, WATER);
        if (acc === 'bird') {
          // 跳びすぎて水の外へ → 横から鳥がさらっていく
          fish.ex = { eyes: 'closed', mouth: 'grin' };
          yield* tween(0.5, p => { fish.y = 58 - ease(p) * 50; fish.rot = -fish.dir * 0.5 * (1 - p); });
          fish.ex = { eyes: 'surprised', mouth: 'o', mark: '!' }; fish.rot = 0;
          const from = fish.x < 80 ? 1 : -1;
          birdObj = { x: fish.x + from * 100, y: -10, dir: -from }; sfx('tweet');
          yield* tween(0.9, p => { birdObj.x = fish.x + from * 100 * (1 - p); birdObj.y = -10 + 14 * Math.sin(p * Math.PI / 2); fish.y = 8 - Math.sin(p * Math.PI) * 3; dieAt('bird', p); });
          fish.die = null; fish.vis = false; sfx('pop'); fish.ex = {}; birdObj.carry = fish.color;   // v23.2：くちばしに金魚をくわえて飛んでいく
          yield* tween(0.9, p => { birdObj.x += -from * 2.4; birdObj.y = 4 - p * 34; });
          birdObj = null;
          yield* tween(0.6, p => { finger.x += Math.sin(p * 30) * 0.8; });   // 指もびっくり
          yield* fingerOut(0.3);
          yield 0.6;
          feather = { x: x0, y: -10, rot: 0 };
          yield* tween(3, p => { feather.y = -10 + p * (WATER + 4 + 10); feather.x = x0 + Math.sin(p * 9) * 8; feather.rot = Math.sin(p * 9) * 0.6; });
          return yield* deathSettle('bird');
        }
        // ジャンプして指先にタッチ
        const top = WATER + 18;
        yield* tween(0.4, p => { fish.y = 58 + (top - 58) * Math.sin(p * Math.PI / 2); fish.rot = -fish.dir * 0.5 * (1 - p); });
        yield* tween(0.25, p => { fish.y = top - Math.sin(p * Math.PI) * 14; });   // 水面からぴょんと跳ねて指先へ
        sfx('blink'); sfx('pet'); fish.sq = 1; fish.ex = { eyes: 'closed', mouth: 'grin', mark: 'heart' };
        fx.push({ k: 'star', x: finger.x, y: finger.y + 2, t: T, d: 0.5 });
        yield* fingerPoke(0, -3);
        yield* tween(0.45, p => { fish.y = top + (58 - top) * p * p; fish.rot = fish.dir * 0.4 * p; });
        fish.rot = 0; splash(fish.x, WATER); sfx('splash');
        yield* fingerOut(0.4);
        fish.ex = {}; fish.free = true; fish.tx = fish.x; fish.ty = fish.y;
        break;
      }
      case 'spin': {
        fish.free = false; fish.vx = fish.vy = 0;
        const cx0 = clamp(fish.x, 40, 120), cy0 = clamp(fish.y, 60, 180); fish.x = cx0; fish.y = cy0;
        const R = 24;
        yield* fingerTo(cx0 + R, cy0 - 4, 0.6);
        sfx('spin');
        if (acc === 'dizzy') {
          // 指につられてどんどん速く回り、止まれずにふらふら…逆さま
          fish.ex = { eyes: 'sparkle', mouth: 'o' };
          const aEnd = 8 * Math.PI;
          yield* tween(2.4, p => {
            const a = p * (0.35 + 0.65 * p) * aEnd; finger.x = cx0 + Math.cos(a) * R; finger.y = cy0 - 4 + Math.sin(a) * R * 0.5;
            fish.rot = fish.dir * a; fish.x = cx0 + Math.sin(a) * 4 * p; fish.y = cy0 - (1 - Math.cos(a)) * 3 * p;
            if (p > 0.5) fish.ex = { eyes: 'dizzy', mouth: 'wavy', sweat: true };
          });
          finger = null;
          yield* tween(1.35, p => {
            fish.rot = fish.dir * (aEnd + 3 * Math.PI * (1 - (1 - p) ** 2) + Math.sin(p * 27) * 0.22 * (1 - p));
            fish.x = cx0 + Math.sin(p * 23) * 4 * (1 - p);
            fish.y = cy0 + Math.cos(p * 18) * 2 * (1 - p);
          });
          fish.dir = fish.face = -fish.dir;
          fish.rot = 0; fish.ex = {}; fish.opts = { variant: 'dizzy', flip: true }; fish.eyes = 'dizzy'; sfx('death');
          return yield* deathSettle('dizzy');
        }
        // 指が円を描くと、ついてくるりと一回転
        fish.ex = { eyes: 'sparkle', mouth: 'o' };
        yield* tween(1.5, p => { const a = ease(p) * Math.PI * 2; finger.x = cx0 + Math.cos(a) * R; finger.y = cy0 - 4 + Math.sin(a) * R * 0.5;
          fish.rot = fish.dir * a; fish.x = cx0 + Math.sin(a) * 6 * fish.dir; fish.y = cy0 - (1 - Math.cos(a)) * 6; });
        fish.rot = 0; fish.x = cx0; fish.y = cy0; fish.sq = 1; fish.ex = { eyes: 'closed', mouth: 'grin', mark: 'note' }; sfx('pet');
        yield* fingerOut(0.45);
        yield 0.3; fish.ex = {}; fish.tx = fish.x; fish.ty = fish.y; fish.free = true; break;
      }
      case 'bubble': {
        // 指先から泡がぽこっ
        const bx = clamp(fish.x + fish.dir * 34, 30, 130), by = clamp(fish.y + 6, 50, 200);
        yield* fingerTo(bx, by - 6, 0.6);
        yield* tween(0.4, p => { finger.x = bx + Math.sin(p * 25) * 1.5; });
        const b = { x: bx, y: by - 2, r: 4, vy: -6 };
        bubbles.push(b); sfx('bubble');
        yield* fingerOut(0.4);
        fish.speed = 30; fish.free = true;
        b.vy = -4; const tb = T;
        yield () => {
          if (!bubbles.includes(b)) return true;   // 届く前に水面で消えた
          fish.tx = clamp(b.x - fish.dir * 20, 25, 135); fish.ty = clamp(b.y, 36, FLOOR); fish.dir = b.x > fish.x ? 1 : -1;
          return (Math.abs(mouthX() - b.x) < 6 && Math.abs(fish.y - b.y) < 7) || T - tb > 4;
        };
        if (!bubbles.includes(b)) bubbles.push(b);
        if (acc === 'bubblegone') {
          bubbles.splice(bubbles.indexOf(b), 1);
          // つついた泡がふくらんで魚を包み、ゆらゆら上がって…ぱちん
          bigBubble = { x: mouthX(), y: fish.y, r: 3 }; fish.free = false; sfx('bubble');
          fish.ex = { eyes: 'surprised', mouth: 'o' };
          yield* tween(0.9, p => { bigBubble.r = 3 + ease(p) * 27 + Math.sin(p * 14) * 1.5; bigBubble.x = mouthX() + (fish.x - mouthX()) * ease(p); bigBubble.y = fish.y; });
          fish.ex = { eyes: 'teary', mouth: 'wavy', sweat: true };
          const y0b = fish.y;
          yield* tween(1.4, p => { fish.y = y0b - ease(p) * 22; bigBubble.y = fish.y; bigBubble.x = fish.x; bigBubble.r = 30 + Math.sin(p * 10) * 2; dieAt('bubblegone', p * 0.4); });
          yield* tween(0.2, p => { bigBubble.r = 30 + p * 5; });
          sfx('pop'); popFx(fish.x, fish.y); for (let i = 0; i < 8; i++) fx.push({ k: 'drop', x: fish.x + rnd(-20, 20), y: fish.y + rnd(-20, 20), vx: rnd(-30, 30), vy: rnd(-30, 10), t: T, d: 0.5 });
          bigBubble = null;
          yield* tween(1.2, p => dieAt('bubblegone', 0.4 + p * 0.6));   // 泡の魚になっていく
          fish.die = null; fish.ex = {}; fish.opts = { bubbly: true };
          return yield* deathSettle('bubblegone');
        }
        sfx('pop'); bubbles.splice(bubbles.indexOf(b), 1); popFx(b.x, b.y);
        fish.ex = { eyes: 'closed', mouth: 'grin', mark: 'note' }; yield 0.8; fish.ex = {}; break;
      }
      case 'hoop': {         // 指の輪をくぐる
        const hx = clamp(fish.x < 80 ? fish.x + 40 : fish.x - 40, 50, 110), hy = clamp(fish.y, 70, 170);
        hoop = { x: hx, y: -30 };
        yield* tween(0.6, p => { hoop.y = -30 + (hy + 30) * ease(p); });
        const side = fish.x < hx ? -1 : 1;
        yield* swimTo(hx + side * 36, hy, 55);
        fish.ex = { eyes: 'sparkle', mouth: 'o' }; fish.dir = -side; yield 0.3;
        sfx('jump'); fish.free = false; const x0 = fish.x;
        if (acc === 'knotted') {
          // 輪の途中でひっかかって、もがくうちに結び目に
          yield* tween(0.35, p => { fish.x = x0 - side * 36 * ease(p); });
          sfx('bonk'); fish.ex = { eyes: 'surprised', mouth: 'o', sweat: true }; fish.sq = 1;
          for (let k = 0; k < 4; k++) { yield* tween(0.2, p => { fish.ox = Math.round(Math.sin(p * Math.PI * 2) * 3); fish.rot = Math.sin(p * Math.PI * 2) * 0.4; hoop.x = hx + Math.sin(p * Math.PI * 2) * 2; }); }
          yield* dieTo('knotted');
          fish.ox = 0; fish.rot = 0; sfx('koton'); fish.opts = { variant: 'knotted', knot: true }; fish.eyes = 'x'; fish.ex = {};
          yield* tween(0.5, p => { hoop.y = hy - (hy + 40) * ease(p); });
          hoop = null;
          return yield* deathSettle('knotted');
        }
        yield* tween(0.6, p => { fish.x = x0 - side * 72 * ease(p); fish.y = hy - Math.sin(p * Math.PI) * 3; });
        sfx('fanfare'); fish.sq = 1; fish.ex = { eyes: 'closed', mouth: 'grin', mark: 'note' };
        for (let i = 0; i < 8; i++) fx.push({ k: 'star', x: hx + rnd(-12, 12), y: hy + rnd(-12, 12), t: T + i * 0.05, d: 0.5 });
        yield* tween(0.5, p => { hoop.y = hy - (hy + 40) * ease(p); });
        hoop = null; fish.ex = {}; fish.free = true; fish.tx = fish.x; fish.ty = fish.y; break;
      }
      case 'deadplay': {     // 死んだふり → ジャーン
        fish.free = false; fish.tx = fish.x; fish.ty = fish.y;
        yield* fingerTo(clamp(fish.x, 30, 130), clamp(fish.y - 14, 26, 200), 0.6);
        yield* fingerPoke(0, 6); sfx('death');
        fish.opts = { flip: true }; fish.eyes = 'x'; fish.ex = {};
        yield* tween(0.8, p => { fish.y -= 0.2; });
        yield* fingerPoke(0, 6); yield 0.3; yield* fingerPoke(0, 6);
        if (acc === 'nowake') {
          // …起きない。つつく指がだんだん心配そうに
          for (let k = 0; k < 3; k++) { yield 0.4; yield* fingerPoke(0, 7); yield* tween(0.3, p => { finger.x += Math.sin(p * 30) * 0.7; }); }
          yield* dieTo('nowake');
          fish.opts = { variant: 'nowake', soul: false, flip: true }; sfx('yawn');
          soul = { x: fish.x, y: fish.y - 6 };
          const sx0 = soul.x, sy0 = soul.y;
          yield* tween(3.2, p => { soul.y = sy0 + (-30 - sy0) * p; soul.x = sx0 + Math.sin(p * 8) * 6; finger.y -= 0.15; });
          soul = null; yield* fingerOut(0.8);
          return yield* deathSettle('nowake', true);
        }
        sfx('fanfare'); fish.opts = {}; fish.eyes = 'normal'; fish.sq = 1.4; fish.ex = { eyes: 'sparkle', mouth: 'tongue', mark: '!' };
        yield* tween(0.3, p => { fish.oy = -Math.round(Math.sin(p * Math.PI) * 8); });
        fish.oy = 0; yield* fingerOut(0.4); yield 0.3; fish.ex = {}; fish.free = true; break;
      }
      case 'ball': {         // ボールが真ん中まで沈んできて、ドリブルして、最後はシュートでどこかへ
        const bx = clamp(fish.x + fish.face * 24, 40, 120), by = rnd(100, 125);
        yield* fingerTo(bx, 6, 0.5);
        ball = { x: bx, y: 8 };
        yield* fingerOut(0.3);
        yield* tween(0.3, p => { ball.y = 8 + (WATER - 8) * p * p; });
        splashAt(bx, 10); sfx('chapon');
        fish.free = true; fish.speed = 45; fish.tx = clamp(bx - fish.face * 32, 24, 136); fish.ty = by; fish.look = 'up';
        fish.ex = { eyes: 'sparkle', mouth: 'o' };
        yield* tween(1.3, p => { ball.y = WATER + (by - WATER) * ease(p); ball.x = bx + Math.sin(p * 7) * 3; });
        fish.look = null;
        let dir = ball.x < 80 ? 1 : -1;
        for (let k = 0; k < 5; k++) {
          yield* swimTo(clamp(ball.x - dir * 20, 24, 136), ball.y, 75); fish.dir = dir;
          sfx('boing'); fish.sq = 1; fish.ex = { eyes: 'closed', mouth: 'o' };
          const sx = ball.x, sy = ball.y, nx = clamp(sx + dir * rnd(18, 26), 30, 130), ny = clamp(by + rnd(-14, 14), 70, 165);
          yield* tween(0.35, p => { ball.x = sx + (nx - sx) * ease(p); ball.y = sy + (ny - sy) * ease(p) - Math.sin(p * Math.PI) * 9; });
          if (nx >= 128 || nx <= 32) dir = -dir;   // 壁で切り返し
          fish.ex = { eyes: 'sparkle', mouth: 'grin' };
        }
        // シュート：くるっと回って尾で蹴る
        yield* swimTo(clamp(ball.x - dir * 22, 24, 136), ball.y, 75); fish.dir = dir;
        fish.free = false; sfx('jump');
        yield* tween(0.35, p => { fish.rot = fish.face * ease(p) * Math.PI * 2; });
        fish.rot = 0; fish.sq = 1.4; sfx('fanfare');
        fx.push({ k: 'star', x: ball.x, y: ball.y, t: T, d: 0.6 });
        fx.push({ k: 'text', s: 'シュート！', x: ball.x, y: ball.y - 12, t: T, d: 1.0, c: '#ffd23a' });
        const ang = -Math.PI / 2 + dir * rnd(0.3, 0.9), sp = 230, bx0 = ball.x, by0 = ball.y;
        let crossed = false;
        yield* tween(1.0, p => {
          const tt = p * 1.0; ball.x = bx0 + Math.cos(ang) * sp * tt; ball.y = by0 + Math.sin(ang) * sp * tt + 90 * tt * tt;
          if (!crossed && ball.y < WATER) { crossed = true; splashAt(ball.x, 20); sfx('chapon'); }
          if (Math.random() < 0.5) fx.push({ k: 'star', x: ball.x, y: ball.y, t: T, d: 0.3 });
        });
        ball = null; fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: 'note' }; yield 0.7;
        fish.ex = {}; fish.free = true; break;
      }
      case 'limbo': {        // 指の下を、のけぞってリンボー
        const lx = clamp(fish.x < 80 ? fish.x + 36 : fish.x - 36, 50, 110), ly = clamp(fish.y, 70, 170);
        const side = fish.x < lx ? -1 : 1;
        yield* swimTo(lx + side * 34, ly + 4, 55);
        yield* fingerTo(lx, ly - 2, 0.6);
        fish.dir = -side; fish.free = false; fish.ex = { eyes: 'closed', mouth: 'o', sweat: true };
        fx.push({ k: 'text', s: 'リンボー', x: lx, y: ly - 30, t: T, d: 1.6, c: '#ffd23a' });
        const x0 = fish.x; sfx('spin');
        yield* tween(1.6, p => { fish.x = x0 - side * 68 * p; fish.rot = fish.dir * -0.55 * Math.sin(p * Math.PI); fish.y = ly + 4 + Math.sin(p * Math.PI) * 3; if ((p * 10 | 0) % 2) fish.sq = 0.2; });
        fish.rot = 0; sfx('fanfare'); fish.sq = 1; fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: 'note' };
        yield* tween(0.4, p => { finger.x += Math.sin(p * Math.PI * 4) * 1.2; });   // 指がぱちぱち
        yield* fingerOut(0.4); fish.ex = {}; fish.free = true; break;
      }
      case 'heartswim': {    // 泡でハートを描いて泳ぐ
        const cx = Math.round(clamp(fish.x, 56, 104)), cy = Math.round(clamp(fish.y, 90, 150));
        fish.free = false; fish.ex = { eyes: 'closed', mouth: 'o', blush: true }; sfx('bubble');
        const point = p => {
          const a = p * Math.PI * 2;
          return [cx + 25.6 * Math.sin(a) ** 3,
            cy - 1.6 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))];
        };
        const outline = Array.from({ length: 40 }, (_, i) => point(i / 40));   // v23.3：1周ちょうど40点。泳ぐ位置と同じ場所に泡を置く（前は1.2周分を別の速さで置いていてずれた）
        const until = T + 4.7;
        let next = 0;
        yield* tween(2.6, p => {
          const [x, y] = point(p);
          if (Math.abs(x - fish.x) > 0.01) fish.dir = fish.face = x > fish.x ? 1 : -1;
          fish.x = x; fish.y = y;
          while (next < outline.length && next / outline.length <= p) {
            const [bx, by] = outline[next++];
            bubbles.push({ x: bx, y: by, r: 2, vy: 0, pinned: true, until });
          }
        });
        yield* tween(0.35, p => { const [x, y] = outline[0]; fish.y = y - p * 36; fish.x = x + p * 29; });
        sfx('fanfare'); fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: 'heart' };
        yield* fingerTo(cx, cy - 40, 0.5);
        for (let k = 0; k < 3; k++) { sfx('pet'); yield* tween(0.18, p => { finger.x = cx + Math.sin(p * Math.PI * 2) * 3; }); }
        yield* fingerOut(0.4); fish.tx = fish.x; fish.ty = fish.y; fish.ex = {}; fish.free = true; break;
      }
      case 'sing': {         // こっちを向いて歌う。指が指揮
        yield* swimTo(clamp(fish.x, 50, 110), clamp(fish.y, 80, 150), 45);
        fish.free = false; fish.ex = { front: true, eyes: 'closed', mouth: 'o' };
        yield* fingerTo(fish.x + 30, fish.y - 30, 0.5);
        const notes = [72, 76, 79, 84, 79, 76, 72, 0];
        for (let k = 0; k < notes.length; k++) {
          if (notes[k]) A.tone(440 * Math.pow(2, (notes[k] - 69) / 12), 0.22, 'triangle', 0.18);
          fish.ex = { front: true, eyes: 'closed', mouth: k % 2 ? 'o' : 'yawn', blush: true };
          fx.push({ k: 'note', x: fish.x + rnd(-6, 6), y: fish.y - 18, t: T, d: 1.2, vx: rnd(-12, 12) });
          yield* tween(0.25, p => { finger.x = fish.x + 30 + Math.sin((k + p) * Math.PI) * 6; finger.y = fish.y - 30 - Math.abs(Math.sin((k + p) * Math.PI)) * 4; });
        }
        sfx('fanfare'); fish.ex = { front: true, eyes: 'sparkle', mouth: 'grin', mark: 'note' }; yield 0.6;
        yield* fingerOut(0.4); fish.ex = {}; fish.free = true; break;
      }
      // ===== v16 の芸 =====
      case 'sumo': {        // 指ずもう：押して、押されて、おしだし
        const sx0 = clamp(fish.x, 50, 110), sy0 = clamp(fish.y, 90, 160);
        yield* swimTo(sx0, sy0, 45);
        fish.free = false; fish.dir = fish.face; const d = fish.face;
        yield* fingerTo(sx0 + d * 24, sy0 - 2, 0.6);
        fish.ex = { eyes: 'angry', mouth: 'pout' };
        fx.push({ k: 'text', s: 'はっけよい…', x: 80, y: sy0 - 36, t: T, d: 0.9, c: '#ffffff' }); yield 0.8;
        fx.push({ k: 'text', s: 'のこった！', x: 80, y: sy0 - 36, t: T, d: 0.9, c: '#ffd23a', big: true }); sfx('blink');
        fish.ex = { eyes: 'angry', mouth: 'grin', sweat: true };
        let base = 0;
        for (let k = 0; k < 4; k++) {
          const amp = [6, -9, 8, -5][k], b0 = base;
          yield* tween(0.42, p => { base = b0 + amp * ease(p); fish.x = sx0 + d * base; finger.x = fish.x + d * 24; fish.swimPh += 0.45; fish.ox = (Math.floor(p * 10) & 1); });
          fish.ox = 0; fish.sq = 0.7; sfx('pu');
          if (amp < 0) { fish.ex = { eyes: 'tight', mouth: 'grin', sweat: true }; fx.push({ k: 'text', s: 'ぐぬぬ', x: fish.x, y: fish.y - 26, t: T, d: 0.6, c: '#ffffff' }); }
          else fish.ex = { eyes: 'angry', mouth: 'grin', sweat: true };
        }
        // おしだし：体あたりで指を水の外へ
        fish.ex = { eyes: 'angry', mouth: 'o' };
        const bx0 = fish.x;
        yield* tween(0.45, p => { fish.x = clamp(bx0 + d * 18 * ease(p), 24, 136); fish.swimPh += 0.6; finger.x = fish.x + d * 24 + d * p * 6; finger.y = sy0 - 2 - p * p * 50; });
        sfx('bonk'); fx.push({ k: 'star', x: finger.x, y: finger.y + 4, t: T, d: 0.6 });
        fx.push({ k: 'text', s: 'おしだし！', x: 80, y: sy0 - 36, t: T, d: 1.2, c: '#ffd23a', big: true });
        yield* fingerOut(0.3);
        fish.ex = { eyes: 'smug', brows: 'up', mouth: 'grin', mark: '!' }; sfx('fanfare'); yield 0.9;
        fish.ex = {}; fish.free = true; fish.tx = fish.x; fish.ty = fish.y; break;
      }
      case 'rocket': {      // ロケット：3・2・1で水面の外まで発射
        const rx = clamp(fish.x, 40, 120);
        yield* swimTo(rx, FLOOR - 12, 55);
        fish.free = false; fish.tx = fish.x; fish.ty = fish.y;
        yield* fingerTo(clamp(rx + fish.face * 30, 28, 132), FLOOR - 56, 0.5);
        fish.look = 'up'; fish.ex = { eyes: 'sparkle', mouth: 'grin' };
        for (const n of ['3', '2', '1']) {
          fx.push({ k: 'text', s: n, x: finger.x, y: finger.y - 28, t: T, d: 0.5, c: '#ffffff', big: true }); sfx('blink');
          yield* tween(0.45, p => { finger.y = FLOOR - 56 + Math.sin(p * Math.PI) * 3; fish.oy = Math.round(Math.sin(p * Math.PI)); });
        }
        fish.look = null; fish.oy = 0;
        fx.push({ k: 'text', s: 'はっしゃ！', x: 80, y: FLOOR - 70, t: T, d: 1.0, c: '#ffd23a', big: true });
        yield* fingerOut(0.25);
        const y0 = fish.y, x0 = fish.x;
        if (acc === 'bird') {
          const from = x0 < 80 ? 1 : -1;
          const entryX = from > 0 ? W + 32 : -32;
          const catchX = x0 + from * 12, exitX = from > 0 ? -44 : W + 44;
          birdObj = { x: entryX, y: 5, dir: -from };
          let crossed = false;
          fish.rot = -fish.face * Math.PI / 2;
          fish.ex = { eyes: 'closed', mouth: 'grin' }; sfx('jump');
          yield* tween(0.83, p => {
            fish.y = y0 + (15 - y0) * p * p;
            birdObj.x = entryX + (catchX - entryX) * ease(p);
            if (!crossed && fish.y <= WATER) {
              crossed = true; splash(x0, WATER); splashAt(x0, 55); sfx('tweet');
            }
          });
          fish.rot = 0; fish.ex = { eyes: 'surprised', mouth: 'o' };
          yield* tween(0.7, p => {
            birdObj.x = catchX + (exitX - catchX) * ease(p);
            birdObj.y = 5 - p * 23;
            fish.x = birdObj.x - from * 12; fish.y = birdObj.y + 10;
          });
          fish.vis = false; birdObj = null;
          feather = { x: x0, y: -10, rot: 0 };
          yield* tween(2.5, p => {
            feather.y = -10 + p * (WATER + 14);
            feather.x = x0 + Math.sin(p * 11) * 8;
            feather.rot = Math.sin(p * 11) * 0.65;
          });
          return yield* deathSettle('bird');
        }
        if (acc === 'star') {
          // いきおいが止まらず、そのまま空のかなたへ…キラーン
          try { S.prewarmDeath && S.prewarmDeath('star', { color: fish.color, stage: stageNow() }); } catch (e) {}
          fish.die = dfr('star', 1); yield 0.15; fish.die = dfr('star', 2); yield 0.2;
          sfx('jump'); A.tone(160, 1.0, 'sawtooth', 0.12, 0, 6);
          let out = false;
          yield* tween(0.8, p => {
            fish.die = dfr('star', 3 + (Math.floor(p * 10) & 1)); fish.y = y0 - (y0 + 60) * Math.pow(p, 1.4);
            if (fish.y > WATER) bubbles.push({ x: fish.x + rnd(-3, 3), y: fish.y + 26, r: 1 + (Math.random() < 0.3 ? 1 : 0), vy: -6 });
            if (!out && fish.y < WATER) { out = true; splash(fish.x, WATER); splashAt(fish.x, 90); sfx('splash'); }
          });
          fish.vis = false; fish.die = null;
          yield* fingerTo(clamp(x0 + 26, 28, 132), 70, 0.5);
          fx.push({ k: 'text', s: 'あれ？', x: finger.x, y: 40, t: T, d: 1.2, c: '#ffffff' });
          yield* tween(0.8, p => { finger.x += Math.sin(p * 20) * 0.8; });
          // 空のかなたで、くるくる小さくなって星に
          const sx = rnd(98, 126);
          fish.vis = true; fish.x = sx; fish.y = 12; fish.opts = { scale: 0.5 }; fish.free = false;
          for (let i = 15; i <= 36; i++) { const f = i / 3; fish.die = dfr('star', f); if (i === 27) { sfx('blink'); A.tone(1800, 0.3, 'sine', 0.12, 0, 1.5); } yield (f < 9 ? 0.1 : 0.16) / 3; }   // v20: 中割りで1/3ずつ
          fx.push({ k: 'text', s: 'キラーン☆', x: clamp(sx, 40, 120), y: 36, t: T, d: 1.6, c: '#fff27a', big: true });
          fish.die = null; fish.vis = false; fish.opts = {}; xo.star = { x: sx, y: 12, s: 0.5 };
          yield* tween(0.6, p => { finger.y = 70 - p * 4; });
          yield* fingerOut(0.8);
          return yield* deathSettle('star');
        }
        // ふつう：水面から飛び出して、くるっと回って、ドボン
        fish.ex = { eyes: 'closed', mouth: 'grin' };
        yield* tween(0.18, p => { fish.ex = { eyes: 'closed', mouth: 'grin', sx: 1 + 0.2 * p, sy: 1 - 0.25 * p }; fish.oy = Math.round(p * 2); });
        fish.oy = 0; fish.ex = { eyes: 'surprised', mouth: 'o' };
        sfx('jump'); A.tone(180, 0.6, 'sawtooth', 0.1, 0, 4);
        let out = false;
        yield* tween(0.6, p => {
          fish.rot = -fish.face * Math.PI / 2; fish.y = y0 - (y0 + 10) * Math.sin(p * Math.PI / 2);
          if (fish.y > WATER) bubbles.push({ x: fish.x + rnd(-3, 3), y: fish.y + 24, r: 1, vy: -6 });
          if (!out && fish.y < WATER) { out = true; splash(fish.x, WATER); splashAt(fish.x, 70); sfx('splash'); }
        });
        fx.push({ k: 'text', s: 'ひゅ〜', x: fish.x, y: 12, t: T, d: 1.0, c: '#ffffff' });
        yield* tween(0.5, p => { fish.rot = -fish.face * (Math.PI / 2 + Math.PI * p); fish.y = -10 + Math.sin(p * Math.PI) * -6; });
        let back = false;
        yield* tween(0.5, p => { fish.rot = -fish.face * (Math.PI * 1.5); fish.y = -10 + (110 + 10) * p * p; if (!back && fish.y > WATER) { back = true; splash(fish.x, WATER); splashAt(fish.x, 80); sfx('chapon'); fx.push({ k: 'text', s: 'ドボン', x: fish.x, y: 30, t: T, d: 1.0, c: '#ffffff' }); } });
        fish.rot = 0; fish.sq = 1.2; fish.ex = { eyes: 'dizzy', mouth: 'grin', mark: 'note' }; sfx('fanfare');
        yield* fingerTo(clamp(fish.x + 30, 28, 132), 70, 0.4);
        for (let k = 0; k < 3; k++) { sfx('pet'); yield* tween(0.16, p => { finger.x += Math.sin(p * Math.PI * 2) * 1.5; }); }
        yield* fingerOut(0.4); fish.ex = {}; fish.free = true; fish.tx = fish.x; fish.ty = fish.y; break;
      }
      case 'moonwalk': {    // ムーンウォーク：前を向いたまま、砂の上をうしろへすべる
        const fy = FLOOR - 12;
        yield* swimTo(clamp(fish.x, 56, 104), fy, 50);
        fish.free = false; fish.tx = fish.x; fish.ty = fish.y;
        const d = fish.x < 80 ? 1 : -1;      // 進むほう（うしろ向きに）
        fish.dir = -d; yield 0.35;
        yield* fingerTo(80, 70, 0.4);
        fx.push({ k: 'text', s: 'パチン♪', x: 80, y: 40, t: T, d: 0.8, c: '#ffffff' }); sfx('dance');
        fish.ex = { eyes: 'closed', mouth: 'smile', blush: true };
        const x0 = fish.x; let nt = 0;
        yield* tween(2.2, p => {
          fish.x = x0 + d * 52 * p; fish.oy = (Math.floor(p * 18) & 1) ? -1 : 0; fish.swimPh += 0.25;
          if (p - nt > 0.12) { nt = p; fx.push({ k: 'note', x: fish.x + rnd(-6, 6), y: fish.y - 18, t: T, d: 1.0, vx: rnd(-10, 10) }); if (Math.random() < 0.5) sandPuff(fish.x - d * 10, FLOOR + 2, 2); }
          finger.x = 80 + Math.sin(p * Math.PI * 6) * 3;
        });
        fish.oy = 0; fish.dir = d; fish.face = d; fish.turnP = 0;
        yield* tween(0.4, p => { fish.rot = d * Math.PI * 2 * ease(p); });
        fish.rot = 0; fish.sq = 1.3;
        fish.ex = { front: true, eyes: 'sparkle', mouth: 'o', mark: '!' }; sfx('smug');
        fx.push({ k: 'text', s: 'ポウ！', x: fish.x, y: fish.y - 30, t: T, d: 1.1, c: '#ffd23a', big: true });
        for (let k = 0; k < 3; k++) { sfx('pet'); yield* tween(0.16, p => { finger.x = 80 + Math.sin(p * Math.PI * 2) * 2; }); }
        yield* fingerOut(0.4); fish.ex = {}; fish.free = true; fish.tx = fish.x; fish.ty = fish.y; break;
      }
      case 'puff': {
        // お腹をつんっ → ぷくっ
        fish.free = false; fish.tx = fish.x; fish.ty = fish.y;
        yield* fingerTo(clamp(fish.x - fish.dir * 2, 28, 132), clamp(fish.y - 16, 26, 200), 0.6);
        yield* fingerPoke(0, 6); fish.sq = 1; fish.ex = { eyes: 'surprised', mouth: 'o' };
        sfx('puff'); fish.opts = { puff: true };
        if (acc === 'floataway') {
          // ぷくっ…が止まらない。指がつかもうとするけど、するっと浮いていく
          yield* fingerTo(finger.x - 18, finger.y - 10, 0.3);
          fish.ex = { eyes: 'surprised', mouth: 'o', sweat: true };
          yield* tween(0.9, p => { fish.opts = { puff: true, scale: Math.round((1 + 0.35 * ease(p)) * 20) / 20 }; fish.ox = Math.round(Math.sin(p * 40) * (1 - p)); });
          yield* dieTo('floataway');
          fish.ox = 0; fish.ex = {}; fish.eyes = 'dizzy'; fish.opts = { variant: 'floataway', puff: true, balloon: true };
          const y0f = fish.y, x0f = fish.x;
          yield* tween(1.0, p => { fish.y = y0f - ease(p) * 14; fish.x = x0f + Math.sin(p * 6) * 3; finger.x = fish.x + 4; finger.y = fish.y - 26 + (1 - p) * 6; });
          fish.x = x0f; yield* fingerPoke(0, 4); sfx('nope');   // つかみそこねる
          yield* fingerOut(0.4);
          const y1 = fish.y;
          yield* tween(3.0, p => { fish.y = y1 - (y1 + 40) * p * (0.4 + 0.6 * p); fish.x = x0f + Math.sin(p * 7) * 8; fish.rot = Math.sin(p * 7) * 0.2; });
          fish.vis = false; fish.ox = 0; fish.rot = 0;
          return yield* deathSettle('floataway');
        }
        yield* fingerOut(0.45);
        yield 0.5; fish.opts = {}; sfx('pop'); fish.sq = 1; fish.ex = { eyes: 'closed', mouth: 'grin' }; yield 0.4; fish.ex = {}; fish.free = true; break;
      }
    }
    finger = null;
    fish.eyes = 'normal';
    reward(g.finishTouch());
  }

  // 網ですくう：斜め上から水に入り、獲物の下へもぐって、袋に入れて持ち上げる
  // target: { x, y, inNet } を持つもの（魚・目玉・羽・アヒル）。null なら空振り
  function* scoop(target, opts) {
    opts = opts || {};
    const tx = target ? clamp(target.x, 30, 130) : clamp(opts.x || 80, 30, 130);
    const ty = target ? clamp(target.y, 30, FLOOR) : clamp(opts.y || 120, 30, FLOOR);
    const big = opts.big ? 2 : 1;   // v22: 大きくなりすぎた魚は大きな網で
    net = { x: tx + 34 * big, y: -34 * big, tilt: -0.35, sag: 0.3, wet: false, drip: false, scale: big };
    sfx('net');
    // 1) 斜めに水へ入って、獲物の少し下へ
    yield* tween(0.7, p => { const e = ease(p); net.x = tx + 34 * (1 - e); net.y = -34 + (ty + 16 + 34) * e; net.tilt = -0.35 * (1 - e); });
    net.wet = true;
    if (opts.dodge) { yield* opts.dodge(); }
    // 2) すくい上げ：袋に入れる
    let caught = false;
    yield* tween(0.35, p => {
      net.y = ty + 16 - 12 * ease(p);
      if (target && !caught && p > 0.45) { caught = true; target.inNet = true; sfx('splash'); }
      if (caught) { target.x = net.x + 2 + Math.sin(T * 18) * 1.2; target.y = net.y + (target === fish ? 14 : 10) * (net.scale || 1); net.sag = 1; }
    });
    if (!target) sfx('nope');
    if (opts.struggle && target) { for (let k = 0; k < 4; k++) { yield* tween(0.18, p => { target.x = net.x + Math.sin(p * Math.PI * 2) * 3; net.tilt = Math.sin(p * Math.PI * 2) * 0.08; }); } }
    yield 0.25;
    // 3) 持ち上げて水から出す（しずく）
    const y0 = net.y;
    yield* tween(1.0, p => {
      const e = p * p; net.y = y0 + (-60 - y0) * e; net.tilt = 0.25 * e;
      if (net.y < WATER) net.drip = true;
      if (target && target.inNet) { target.x = net.x + 2 + Math.sin(T * 10) * 1; target.y = net.y + (target === fish ? 14 : 10) * (net.scale || 1); }
    });
    if (target) target.inNet = false;
    net = null;
  }

  function* actNet() {
    const r = g.net();
    if (r.caught) {
      fish.free = false; fish.eyes = 'dizzy';
      yield* dieTo('netted', 0.7);
      yield* scoop(fish, { struggle: true });
      fish.vis = false;
      g.die('netted'); causeId = 'netted'; mode = 'dead';
      sfx('death'); yield 0.6;
      showCard('netted'); return 'dead';
    }
    // 逃げる：網が近づくと、さっと下へ
    yield* scoop(null, { x: fish.x, y: fish.y, dodge: function* () {
      fish.free = true; fish.speed = 95; fish.turn = 8; fish.tx = clamp(fish.x + rnd(-45, 45), 25, 135); fish.ty = 200; fish.sq = 1;
      fish.ex = { eyes: 'surprised', mouth: 'o' }; yield 0.15; } });
    fish.ex = {}; fish.speed = 25;
    if (r.smug) { fish.smugUntil = T + 2.2; sfx('smug'); yield 1; }
  }

  const ACTIONS = { feed: actFeed, clean: actClean, touch: actTouch, net: actNet };

  // ---------------- ゲーム内時間のタイマー ----------------
  const timers = [];
  function setTimeoutT(f, sec) { timers.push([T + sec, f]); }

  // ---------------- ふだんの表情 ----------------
  function moodFace() {
    const s = g.s, ex = fish.ex = {};
    fish.eyes = 'normal';
    if (T < fish.smugUntil) { fish.eyes = 'smug'; ex.brows = 'up'; return; }
    if (s.satiety <= 0.01) { fish.eyes = 'teary'; ex.mouth = 'pout'; ex.brows = 'worried'; return; }
    if (s.stress >= 75) { fish.eyes = 'annoyed'; ex.brows = 'angry'; ex.mouth = 'wavy'; return; }
    if (s.dirt >= 3) { fish.eyes = 'side'; ex.brows = 'down'; ex.mouth = 'wavy'; return; }
    if (s.stress <= 10) { ex.blush = true; }
  }

  // ---------------- しぐさ（ひまなときのバリエーション） ----------------
  function startGesture() {
    const s = g.s;
    const pool = [];
    const add = (fn, w) => { for (let i = 0; i < w; i++) pool.push(fn); };
    add(gLookAtYou, 3); add(gYawn, 2); add(gHiccup, 2); add(gBlowBubbles, 3); add(gTailChase, 2);
    add(gBonk, 2); add(gNibblePlant, 2); add(gDance, s.stress <= 30 ? 3 : 1); add(gPeek, 2); add(gShowOff, 2);
    add(gNap, s.satiety >= 12 ? 3 : 1);
    add(gDig, 4); add(gPebble, 2); add(gBubbleRide, 3); add(gSandHide, 2);   // 画面下でやること
    add(gSneeze, 2); if (s.dirt >= 1) add(gSneeze, 4);   // v23 P5：くしゃみ（ぺらぺらの入口）を出やすく
    const pe = s.persona;
    if (pe === 'lazy') add(gNap, 4);
    if (pe === 'showoff') { add(gShowOff, 3); add(gDance, 3); add(gLookAtYou, 2); }
    if (pe === 'clingy') { add(gLookAtYou, 3); add(gPeek, 2); }
    if (pe === 'neat' && s.dirt >= 1) add(gSneeze, 3);
    let fn = pool[Math.random() * pool.length | 0];
    for (let k = 0; k < 5 && fn === lastGest; k++) fn = pool[Math.random() * pool.length | 0];   // 同じしぐさを続けない
    lastGest = fn;
    if (typeof window !== 'undefined' && window.__stats) { const nm = Object.keys(GESTURES).find(k => GESTURES[k] === fn); stat('g:' + (nm || '?')); }
    fish.cruise = false; fish.wps = [];
    gest = { it: fn(), wait: 0, cond: null };
  }
  // ---------------- 特殊イベント（急に起きて、指示されたボタンを押せるかで結末が変わる） ----------------
  let ev = null, evAt = 55, catObj = null, mpel = null, dark = 0, shakeAmp = 0, forceEvent = null;
  const EV_KINDS = ['cat', 'blackout', 'quake', 'mystery', 'ufo', 'chef', 'meteor', 'ghost', 'hook', 'heat', 'camera', 'magic'];
  const EVENT_OF_CAUSE = { jumpout: 'quake', abducted: 'ufo', sushi: 'chef', meteor: 'meteor', possessed: 'ghost', fished: 'hook', boiled: 'heat', photo: 'camera', pigeon: 'magic' };
  function updateEvent() {
    if (mode !== 'play' || busy || ev || gest || mgInvite || T < evAt || g.s.gauge < 1) return;
    startEvent(forceEvent || EV_KINDS[Math.random() * EV_KINDS.length | 0]);
  }
  function startEvent(kind) {
    if (gest) endGesture();
    queued = null; busy = true; fish.cruise = false; fish.wps = [];
    ev = { kind, t0: T, limit: 3, need: 'clean', label: '', result: null }; stat('e:' + kind);
    startTask(function* () {
      const r = yield* EVENTS[kind](ev);
      ev = null; dark = 0; shakeAmp = 0; catObj = null; mpel = null;
      evAt = T + rnd(35, 60);
      if (r === 'dead') return;
      fish.ex = {}; fish.free = true; busy = false;
      try { g.save && g.save(); } catch (e) {}
      afterAction();
    });
  }
  function* waitResp(e) { e.t0 = T; yield () => !!e.result || T - e.t0 > e.limit; if (!e.result) e.result = 'timeout'; return e.result; }
  function evWin(text, n) { fx.push({ k: 'text', s: text, x: 80, y: 70, t: T, d: 1.6, c: '#ffd23a', big: true }); if (n) g.bonus(n); sfx('fanfare'); }
  const EVENTS = {
    *cat(e) {               // ねこ：掃除のブラシで追いはらう
      e.need = 'clean'; e.label = 'ねこだ！ そうじで追いはらえ'; e.limit = 3.2;
      catObj = { x: rnd(50, 110), y: WATER - 2, a: 0 };
      sfx('meow'); A.duck(4);
      fish.free = true; fish.speed = 85; fish.turn = 6; fish.tx = clamp(catObj.x + (catObj.x < 80 ? 50 : -50), 24, 136); fish.ty = FLOOR - 10;
      fish.ex = { eyes: 'teary', brows: 'worried', mouth: 'wavy', sweat: true };
      yield* tween(0.6, p => { catObj.a = p; });
      const r = yield* waitResp(e);
      if (r === 'ok') {
        brush = { x: 175, y: 20, a: 0 };
        yield* tween(0.3, p => { brush.x = 175 + (catObj.x + 14 - 175) * p; brush.y = 20 + (catObj.y + 6 - 20) * p; });
        for (let k = 0; k < 3; k++) { sfx('brush'); yield* tween(0.12, p => { brush.a = Math.sin(p * Math.PI * 2) * 8; }); }
        catObj.flee = true; sfx('meow');
        yield* tween(0.5, p => { catObj.a = 1 - p; catObj.y = WATER - 2 - p * 20; brush.x += 3; brush.y -= 2; });
        catObj = null; brush = null;
        fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: 'heart' }; evWin('げきたい！ +1', 1); yield 1.0;
        return 'ok';
      }
      // 間に合わない（ちがうボタン）→ 猫の手がさらう
      catObj.angry = true; sfx('meow'); fish.free = false;
      fish.ex = { eyes: 'surprised', mouth: 'o', mark: '!' };
      paw = { x: fish.x, y: -40 };
      const fy = fish.y;
      yield* tween(0.3, p => { paw.y = -40 + (fy - 14 + 40) * p * p; paw.x = fish.x; });
      fish.vis = false; paw.fish = true; fish.ex = {}; splashAt(paw.x, 40);
      yield* tween(0.8, p => { paw.y = (fy - 14) - ease(p) * (fy + 60); if (catObj) catObj.a = 1 - p; });
      paw = null; catObj = null;
      return yield* deathSettle('cat');
    },
    *blackout(e) {          // 停電：ふれあいで落ちつかせる
      e.need = 'touch'; e.label = '停電！ ふれあいで落ちつかせて'; e.limit = 4;
      sfx('zap'); A.duck(4);
      yield* tween(0.35, p => { dark = 0.86 * p; });
      fish.free = true; fish.ex = { eyes: 'surprised', mouth: 'o', sweat: true };
      let darting = true;
      const panic = () => { if (darting && Math.hypot(fish.tx - fish.x, fish.ty - fish.y) < 8) { fish.speed = 95; fish.tx = rnd(26, 134); fish.ty = rnd(40, 200); } };
      e.t0 = T;
      yield () => { panic(); return !!e.result || T - e.t0 > e.limit; };
      if (!e.result) e.result = 'timeout';
      darting = false;
      if (e.result === 'ok') {
        fish.free = false;
        yield* fingerTo(clamp(fish.x, 30, 130), clamp(fish.y - 14, 26, 200), 0.6);
        glow = { t: T };
        fish.ex = { eyes: 'closed', mouth: 'smile', blush: true, mark: 'heart' }; sfx('pet');
        for (let k = 0; k < 2; k++) yield* tween(0.4, p => { finger.x += Math.sin(p * Math.PI * 2) * 1.2; });
        g.addStress(-25);
        yield* tween(0.6, p => { dark = 0.86 * (1 - p); });
        glow = null; yield* fingerOut(0.4);
        evWin('ほっ… +1', 1); yield 0.8;
        return 'ok';
      }
      // パニックでガラスにごつんごつん
      for (let k = 0; k < 2; k++) {
        const side = k % 2 ? -1 : 1; fish.free = true; fish.speed = 100; fish.tx = side < 0 ? 24 : 136; fish.ty = rnd(60, 180);
        yield () => Math.abs(fish.x - fish.tx) < 4;
        sfx('bonk'); fish.sq = 1.2; fx.push({ k: 'star', x: fish.x + side * 22, y: fish.y - 4, t: T, d: 0.6 });
      }
      g.addStress(40);
      fx.push({ k: 'text', s: 'ストレス +40', x: 80, y: 70, t: T, d: 1.4, c: '#ff5a5a', big: true });
      fish.ex = { eyes: 'teary', brows: 'worried', mouth: 'wavy' };
      yield* tween(0.6, p => { dark = 0.86 * (1 - p); });
      yield 0.6;
      return 'fail';
    },
    *quake(e) {             // 地震：飛び出した魚を網で受けとめる
      e.need = 'net'; e.label = '地震！ 網で受けとめろ'; e.limit = 2.6;
      sfx('grow'); A.duck(4); shakeAmp = 3;
      fish.ex = { eyes: 'surprised', mouth: 'o', sweat: true };
      yield 0.7;
      fish.free = false; fish.vis = true;
      const x0 = fish.x, y0 = fish.y, side = x0 < 80 ? -1 : 1;
      splash(fish.x, WATER); sfx('jump');
      e.t0 = T;
      // ゆっくり（スローモーション）弧を描いて水槽の外へ
      yield () => {
        const p = Math.min(1, (T - e.t0) / e.limit);
        fish.x = x0 + side * (80 + 20) * p; fish.y = y0 + (-10 - y0) * Math.sin(Math.min(1, p * 1.6) * Math.PI / 2) + 120 * Math.max(0, p - 0.62) * Math.max(0, p - 0.62);
        fish.rot = side * p * Math.PI * 2;
        return !!e.result || p >= 1;
      };
      shakeAmp = 0;
      if (!e.result) e.result = 'timeout';
      if (e.result === 'ok') {
        net = { x: fish.x + 30, y: fish.y - 30, tilt: -0.3, sag: 0.3, wet: false, drip: false };
        sfx('net');
        const fx0 = fish.x, fy0 = fish.y;
        yield* tween(0.25, p => { net.x = fx0 + 30 * (1 - p); net.y = fy0 - 30 + 44 * p; });
        fish.rot = 0; fish.inNet = true; net.sag = 1; sfx('splash');
        yield* tween(0.8, p => { net.x = fx0 + (80 - fx0) * ease(p); net.y = fy0 + 14 + (110 - fy0) * ease(p); fish.x = net.x + 2; fish.y = net.y + 14; net.tilt = 0.3 * Math.sin(p * Math.PI); });
        fish.inNet = false; net = null; splashAt(80, 30);
        fish.x = 80; fish.y = 120; fish.tx = 80; fish.ty = 120; fish.eyes = 'normal';
        fish.ex = { eyes: 'dizzy', mouth: 'wavy' }; yield 0.6;
        fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: 'heart' }; evWin('ナイスキャッチ！ +1', 1); yield 0.9;
        return 'ok';
      }
      fish.rot = 0; yield* dieTo('jumpout', 0.8); fish.vis = false; sfx('koton');
      fx.push({ k: 'text', s: 'ぴちっ…', x: side < 0 ? 24 : 136, y: 40, t: T, d: 1.4, c: '#ffffff' });
      return yield* deathSettle('jumpout');
    },
    *mystery(e) {           // 謎の粒：網で取る？ それとも食べさせる？（当たりならゲージ+3、はずれは毒）
      e.need = 'net'; e.label = 'なぞの粒！ 網で取る？'; e.limit = 4;
      mpel = { x: rnd(40, 120), y: WATER - 8 };
      sfx('drop'); sfx('blink');
      fish.free = true; fish.look = 'up'; fish.ex = { eyes: 'sparkle', mouth: 'o' };
      e.t0 = T;
      const y0 = mpel.y;
      yield () => {
        const p = Math.min(1, (T - e.t0) / e.limit);
        mpel.y = y0 + (110 - y0) * p; mpel.x += Math.sin(T * 3) * 0.2;
        fish.speed = 25; fish.tx = clamp(mpel.x - fish.face * 24, 24, 136); fish.ty = clamp(mpel.y + 4, 40, 200);
        return !!e.result || p >= 1;
      };
      fish.look = null;
      if (!e.result) e.result = 'timeout';
      if (e.result === 'ok') {
        const t = { x: mpel.x, y: mpel.y, inNet: false };
        mpel.follow = t;
        yield* scoop(t, {});
        mpel = null;
        fish.ex = { eyes: 'side', mouth: 'pout', mark: '?' };
        fx.push({ k: 'text', s: 'セーフ', x: 80, y: 70, t: T, d: 1.2, c: '#ffffff', big: true }); yield 0.9;
        return 'ok';
      }
      // 食べちゃう
      yield* swimTo(clamp(mpel.x - fish.face * 20, 24, 136), mpel.y, 70);
      fish.mouth = 'o'; sfx('eat'); mpel = null; fish.chewUntil = T + 0.6; yield 0.7;
      if (Math.random() < 0.5) {
        fx.push({ k: 'rainbow', t: T, d: 1.0 });
        fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: 'heart' }; evWin('あたり！ +3', 3); yield 1.0;
        return 'ok';
      }
      return yield* suddenDeath('poison');
    },
  };
  Object.assign(EVENTS, {
    *ufo(e) {               // UFO：網で押さえる
      e.need = 'net'; e.label = 'UFO！ 網で押さえろ'; e.limit = 3.2;
      ufo = { x: -30, y: 6, beam: 0 }; sfx('grow'); A.duck(4);
      fish.free = false; fish.ex = { eyes: 'surprised', mouth: 'o', mark: '?' };
      const fx0 = fish.x; yield* tween(0.9, p => { ufo.x = -30 + (fx0 + 30) * ease(p); ufo.y = 6 + Math.sin(p * 8) * 2; });
      A.tone(300, 3, 'sine', 0.06, 0, 2);
      const y0 = fish.y; e.t0 = T;
      yield () => { const p = Math.min(1, (T - e.t0) / e.limit); ufo.beam = Math.max(10, fish.y - ufo.y); fish.y = y0 - (y0 - 40) * p * p; fish.ox = Math.round(Math.sin(T * 30)); ufo.x = fx0 + Math.sin(T * 2) * 3; return !!e.result || p >= 1; };
      if (!e.result) e.result = 'timeout';
      fish.ox = 0;
      if (e.result === 'ok') {
        net = { x: fish.x + 2, y: -30, tilt: 0, sag: 0.4, wet: true, drip: false }; sfx('net');
        yield* tween(0.3, p => { net.y = -30 + (fish.y - 8 + 30) * p; });
        fish.inNet = true; net.sag = 1;
        for (let k = 0; k < 4; k++) { sfx('zap'); yield* tween(0.2, p => { ufo.y = 6 + Math.sin(p * Math.PI * 2) * 3; ufo.beam = (k % 2) ? 0 : Math.max(10, fish.y - ufo.y); }); }
        ufo.beam = 0; sfx('nope'); fx.push({ k: 'text', s: 'ちぇっ', x: ufo.x, y: ufo.y + 14, t: T, d: 1, c: '#c8ff7a' });
        yield* tween(0.5, p => { ufo.x += 6; ufo.y -= 1; });
        ufo = null;
        yield* tween(0.8, p => { net.y = fish.y - 8 + p * 50; fish.y = net.y + 14; });
        fish.inNet = false; yield* tween(0.4, p => { net.y -= 6; }); net = null;
        fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: 'heart' }; evWin('まもった！ +1', 1); yield 0.8;
        return 'ok';
      }
      // さらわれる
      const fy = fish.y;
      yield* tween(1.2, p => dieAt('abducted', p * 0.6));   // 光に気づいて、ふわっと浮く
      yield* tween(0.9, p => { fish.y = fy - (fy - ufo.y) * p * p; dieAt('abducted', 0.6 + p * 0.4); });
      fish.die = null; fish.vis = false; fish.rot = 0; fish.opts = {}; ufo.beam = 0; sfx('pop'); A.tone(900, 0.5, 'square', 0.1, 0, 3);
      yield* tween(0.6, p => { ufo.x += 8 * p * 4; ufo.y -= 2; });
      ufo = null;
      return yield* deathSettle('abducted');
    },
    *chef(e) {              // 寿司職人の手：掃除のブラシで払う
      e.need = 'clean'; e.label = '板前の手！ そうじで払え'; e.limit = 3.0;
      chef = { x: clamp(fish.x + 20, 40, 130), y: -50, knife: true }; sfx('blink'); A.duck(4);
      fish.free = false; fish.ex = { eyes: 'teary', mouth: 'wavy', sweat: true };
      fx.push({ k: 'text', s: 'へい、らっしゃい', x: 80, y: 40, t: T, d: 1.6, c: '#ffffff' });
      yield* tween(0.8, p => { chef.y = -50 + (fish.y - 26 + 50) * ease(p); chef.x = fish.x + 20; });
      e.t0 = T;
      yield () => { chef.x = fish.x + 20 + Math.sin(T * 4) * 3; return !!e.result || T - e.t0 > e.limit; };
      if (!e.result) e.result = 'timeout';
      if (e.result === 'ok') {
        brush = { x: 175, y: 30, a: 0 };
        yield* tween(0.25, p => { brush.x = 175 + (chef.x + 6 - 175) * p; brush.y = 30 + (chef.y - 30) * p; });
        sfx('bonk'); fx.push({ k: 'star', x: chef.x, y: chef.y, t: T, d: 0.6 }); fx.push({ k: 'text', s: 'いてっ', x: chef.x, y: chef.y - 10, t: T, d: 1, c: '#ffffff' });
        yield* tween(0.5, p => { chef.y -= 4; brush.x += 3; brush.y -= 2; });
        chef = null; brush = null;
        fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: 'heart' }; evWin('ふう…！ +1', 1); yield 0.8;
        return 'ok';
      }
      // つかまって、トントン…へい、おまち
      fish.ex = {}; sfx('meow');
      const fy = fish.y;
      yield* tween(0.25, p => { chef.y = fy - 26 + 10 * p; });
      // v23.2：ユーザーの絵。手でにぎられて、しゃりの上に
      chef = null; fish.dir = fish.face = 1; fish.turnP = 0; fish.opts = {}; fish.rot = 0;
      for (let k = 0; k < 3; k++) setTimeoutT(() => { A.tone(200, 0.08, 'square', 0.2); fx.push({ k: 'star', x: fish.x, y: fish.y + 10, t: T, d: 0.3 }); }, 0.8 + k * 0.45);
      yield* playSeq('sushi', { d: 3.0 });
      fish.eyes = 'x';
      fx.push({ k: 'text', s: 'へい、おまち！', x: 80, y: 60, t: T, d: 1.8, c: '#ffd23a', big: true }); sfx('fanfare');
      yield 1.2;
      const fy2 = fish.y;
      yield* tween(0.8, p => { fish.y = fy2 - (fy2 + 60) * ease(p); });
      fish.vis = false;
      return yield* deathSettle('sushi');
    },
    *meteor(e) {            // 隕石：指ではじく
      e.need = 'touch'; e.label = '隕石！ 指ではじけ'; e.limit = 2.8;
      const tx = fish.x, ty = fish.y;
      meteor = { x: tx + 90, y: -30, size: 1.3 }; sfx('grow'); A.duck(4);
      fish.ex = { eyes: 'surprised', mouth: 'o', sweat: true, look: 'up' }; fish.free = false;
      e.t0 = T;
      yield () => { const p = Math.min(1, (T - e.t0) / e.limit); meteor.x = tx + 90 * (1 - p); meteor.y = -30 + (ty + 30) * p; if (Math.random() < 0.6) fx.push({ k: 'steam', x: meteor.x + 6, y: meteor.y - 6, t: T, d: 0.5 }); return !!e.result || p >= 1; };
      if (!e.result) e.result = 'timeout';
      if (e.result === 'ok') {
        yield* fingerTo(meteor.x - 6, meteor.y - 10, 0.2);
        sfx('bonk'); fx.push({ k: 'star', x: meteor.x, y: meteor.y, t: T, d: 0.6 });
        const mx = meteor.x, my = meteor.y;
        yield* tween(0.6, p => { meteor.x = mx + 140 * p; meteor.y = my - 120 * p; });
        meteor = null; yield* fingerOut(0.3);
        fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: 'heart' }; evWin('ホームラン！ +1', 1); yield 0.8;
        return 'ok';
      }
      // ドーン
      fx.push({ k: 'flash', t: T, d: 0.2 }); sfx('zap'); sfx('koton'); shakeAmp = 4; meteor = null;
      yield* dieTo('meteor');
      fish.opts = { variant: 'meteor', meteor: true }; fish.eyes = 'x'; fish.ex = {};
      for (let i = 0; i < 14; i++) fx.push({ k: 'steam', x: fish.x + rnd(-16, 16), y: fish.y + rnd(-8, 8), t: T + i * 0.04, d: 0.8 });
      yield 0.5; shakeAmp = 0;
      crater = { x: Math.round(fish.x), y: SAND_Y };
      return yield* deathSettle('meteor');
    },
    *ghost(e) {             // おばけ：餌で気をそらす
      e.need = 'feed'; e.label = 'おばけ！ 餌で気をそらせ'; e.limit = 3.4;
      const from = fish.x < 80 ? 1 : -1;
      ghost = { x: from > 0 ? W + 20 : -20, y: clamp(fish.y - 10, 50, 160), a: 0 }; sfx('yawn'); A.duck(4);
      fish.free = false; fish.ex = { eyes: 'teary', brows: 'worried', mouth: 'wavy', sweat: true };
      fx.push({ k: 'text', s: 'うらめしや〜', x: 80, y: 40, t: T, d: 1.8, c: '#e8f0ff' });
      const gx0 = ghost.x; e.t0 = T;
      yield () => { const p = Math.min(1, (T - e.t0) / e.limit); ghost.a = Math.min(0.9, p * 3); ghost.x = gx0 + (fish.x + from * 26 - gx0) * p; return !!e.result || p >= 1; };
      if (!e.result) e.result = 'timeout';
      if (e.result === 'ok') {
        sfx('drop');
        for (let i = 0; i < 3; i++) ghostPellets.push({ x: ghost.x + rnd(-10, 10), y: WATER - i * 6 });
        yield* tween(1.0, p => { for (const q of ghostPellets) q.y += 1.4; ghost.x += (ghostPellets[0].x - ghost.x) * 0.06; ghost.y += (ghostPellets[0].y - ghost.y) * 0.06; });
        ghostPellets = []; sfx('eat'); fx.push({ k: 'text', s: 'うまい…', x: ghost.x, y: ghost.y - 16, t: T, d: 1.2, c: '#e8f0ff' });
        yield* tween(0.8, p => { ghost.a = 0.9 * (1 - p); ghost.y -= 0.6; });
        ghost = null;
        fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: 'heart' }; evWin('成仏した！ +1', 1); yield 0.8;
        return 'ok';
      }
      // とりつかれる
      ghost.angry = true; sfx('meow');
      const gx = ghost.x, gy = ghost.y;
      yield* tween(0.4, p => { ghost.x = gx + (fish.x - gx) * p; ghost.y = gy + (fish.y - gy) * p; });
      ghost = null; fx.push({ k: 'flash', t: T, d: 0.15 }); sfx('zap');
      fish.dir = fish.face = -1; fish.turnP = 0; fish.ex = {}; fish.opts = {};
      yield* playSeq('possessed_ghost', { d: 2.8 });
      fish.opts = { variant: 'possessed', ghost: true }; fish.eyes = 'closed'; fish.ex = {};
      yield 0.8;
      const fy = fish.y, fx1 = fish.x;
      yield* tween(2.6, p => { fish.y = fy - (fy + 40) * ease(p); fish.x = fx1 + Math.sin(p * 8) * 10; });
      fish.vis = false;
      return yield* deathSettle('possessed');
    },
  });
  // ===== v16 のイベント：釣り針・猛暑・カメラ・手品師 =====
  const FISH_HEX = { orange: '#ff8a00', lime: '#7ccc2c', pink: '#ff86a8', yellow: '#ffc81e', sky: '#4cb8f4', purple: '#ac80ec' };
  // 死に際のコマの「くちびる」の位置（釣り針用）。r と dy は sprites.js の fished のコマと同じ
  const FISHED_R = [0, 0, 0, 0, 0, -0.3, -0.6, -0.9, -0.6, -1.0, -1.3, -1.45, -1.5708];
  const FISHED_DY = [0, 0, 0, 0, 0, -2, -3, -4, -4, -5, -6, -6, -6];
  function lipAt(f) {
    const st = stageNow(), nose = [17, 20.5, 23][st - 1] - 2, d = fish.face, rot = d * FISHED_R[f];
    const u = d * nose, v = 4;
    return [fish.x + Math.cos(rot) * u - Math.sin(rot) * v, fish.y + FISHED_DY[f] + Math.sin(rot) * u + Math.cos(rot) * v];
  }
  function shutter() { if (!A.ac) return; A.tone(2400, 0.03, 'square', 0.15); A.noiseBurst(0.08, 4000, 0.2); A.tone(1600, 0.04, 'square', 0.1, 0.08); }
  Object.assign(EVENTS, {
    *hook(e) {              // 釣り針：餌で気をそらす
      e.need = 'feed'; e.label = '釣り針！ 餌で気をそらせ'; e.limit = 3.6;
      const hx = clamp(fish.x < 80 ? fish.x + 44 : fish.x - 44, 44, 116), hy = clamp(fish.y + 12, 104, 170);
      xo.hook = { x: hx, y: -24, worm: true }; sfx('chapon'); A.duck(4);
      fx.push({ k: 'text', s: 'ちゃぽん…', x: hx, y: 34, t: T, d: 1.2, c: '#ffffff' });
      let wet = false;
      yield* tween(0.9, p => { xo.hook.y = -24 + (hy + 24) * ease(p); if (!wet && xo.hook.y > WATER) { wet = true; splashAt(hx, 25); } });
      fish.free = true; fish.ex = { eyes: 'sparkle', mouth: 'o', mark: 'heart' };
      e.t0 = T;
      yield () => {   // ミミズにつられて、じわじわ近づく
        fish.speed = 13; fish.turn = 5; fish.dir = xo.hook.x > fish.x ? 1 : -1;
        fish.tx = clamp(xo.hook.x - fish.dir * 22, 24, 136); fish.ty = clamp(xo.hook.y - 10, 36, 200);
        xo.hook.y = hy + Math.sin(T * 3) * 2;
        return !!e.result || T - e.t0 > e.limit;
      };
      if (!e.result) e.result = 'timeout';
      if (e.result === 'ok') {
        // 反対がわに餌：ぷいっとそっちへ
        const px = clamp(fish.x - fish.face * 46, 30, 130);
        xo.decoy = [0, 1, 2].map(i => ({ x: px + (i - 1) * 7, y: WATER - 2 - i * 5 })); sfx('drop');
        fish.dir = -fish.face; fish.ex = { eyes: 'sparkle', mouth: 'o', mark: '!' };
        yield* tween(0.8, p => { for (const q of xo.decoy) q.y = Math.min(q.y + 1.6, fish.y + 4); fish.tx = clamp(px - fish.dir * 20, 24, 136); fish.ty = clamp(fish.y, 40, 200); fish.speed = 60; });
        for (let i = 0; i < 3; i++) {
          const q = xo.decoy[0]; if (!q) break;
          yield* swimTo(clamp(q.x - fish.dir * 18, 24, 136), clamp(q.y - 4, 36, 200), 70);
          fish.mouth = 'o'; fish.eatT = T; sfx('eat'); xo.decoy.shift(); yield 0.12; fish.mouth = 0; fish.chewUntil = T + 0.4;
        }
        xo.decoy = null;
        const hy0 = xo.hook.y;
        yield* tween(0.6, p => { xo.hook.y = hy0 - (hy0 + 30) * p * p; });
        fx.push({ k: 'text', s: 'ちぇっ', x: hx, y: 14, t: T, d: 1.2, c: '#ffffff' });
        xo.hook = null; fish.ex = { eyes: 'happy', mouth: 'grin', mark: 'note' }; evWin('かわした！ +1', 1); yield 0.9;
        return 'ok';
      }
      // パクッ → チクッ → つりあげられる
      fish.free = false; fish.vx = fish.vy = 0;
      try { S.prewarmDeath && S.prewarmDeath('fished', { color: fish.color, stage: stageNow() }); } catch (er) {}
      const fx0 = fish.x, fy0 = fish.y;
      { const m0 = lipAt(0), ddx = xo.hook.x - m0[0], ddy = xo.hook.y - 6 - m0[1]; yield* tween(0.25, p => { fish.x = fx0 + ddx * p; fish.y = fy0 + ddy * p; }); }
      const hookOn = f => { const m = lipAt(f); xo.hook.x = m[0]; xo.hook.y = m[1] + 3; };
      fish.die = dfr('fished', 0); yield 0.15;
      fish.die = dfr('fished', 1); sfx('eat'); fish.eatT = T; xo.hook.worm = false; hookOn(1); yield 0.15;
      for (const f of [2, 3]) { sfx('mogu'); hookOn(f); for (let j = 0; j < 3; j++) { fish.die = dfr('fished', f + j / 3); yield 0.22 / 3; } }   // v20: 中割り
      fish.die = dfr('fished', 4); sfx('bonk'); hookOn(4);
      fx.push({ k: 'text', s: 'チクッ', x: fish.x, y: fish.y - 26, t: T, d: 0.9, c: '#ff5a5a', big: true }); yield 0.25;
      fish.die = dfr('fished', 5); hookOn(5); yield 0.25;
      // ぐいっ、ぐいっ（暴れながら上へ）
      let k = 0, out = false;
      for (let j = 0; j < 5; j++) {
        const fy = fish.y, step = j < 2 ? 12 : 22;
        if (j === 1) fx.push({ k: 'text', s: '大物だ〜！', x: 80, y: 14, t: T, d: 1.4, c: '#ffffff' });
        yield* tween(0.26, p => {
          const f = j < 4 ? 6 + (Math.floor(p * 4 + j) % 4) : 10 + Math.min(1, Math.floor(p * 2)); fish.die = dfr('fished', f);
          fish.y = fy - step * ease(p); fish.ox = j < 4 ? Math.round(Math.sin(T * 40) * 2) : 0; hookOn(f);
          if (!out && fish.y < WATER + 6) { out = true; splash(fish.x, WATER); splashAt(fish.x, 60); sfx('splash'); }
        });
        sfx('pu'); k++;
        if (j < 4) yield 0.12;
      }
      fish.ox = 0;
      fish.die = dfr('fished', 12); hookOn(12);
      const fy1 = fish.y;
      yield* tween(0.6, p => { fish.y = fy1 - (fy1 + 50) * p * p; hookOn(12); if (!out && fish.y < WATER + 6) { out = true; splash(fish.x, WATER); sfx('splash'); } });
      fish.vis = false; fish.die = null; xo.hook = null;
      fx.push({ k: 'text', s: 'つれた〜！', x: 80, y: 12, t: T, d: 1.6, c: '#ffd23a', big: true }); sfx('fanfare');
      return yield* deathSettle('fished');
    },
    *heat(e) {              // 猛暑：そうじ（水かえ・氷）で冷やす
      e.need = 'clean'; e.label = '猛暑！ そうじで水を冷やせ'; e.limit = 3.6;
      xo.sun = { x: 110, y: -16 }; xo.heat = 0; xo.thermo = 0.3; sfx('grow'); A.duck(4);
      yield* tween(0.6, p => { xo.sun.y = -16 + 28 * ease(p); });
      fx.push({ k: 'text', s: 'あ、あつい…', x: fish.x, y: fish.y - 28, t: T, d: 1.4, c: '#ffffff' });
      fish.free = true; fish.speed = 16; fish.ex = { eyes: 'teary', mouth: 'tongue', sweat: true };
      e.t0 = T;
      yield () => {
        const p = Math.min(1, (T - e.t0) / e.limit);
        xo.heat = 0.2 * p; xo.thermo = 0.3 + 0.65 * p;
        if (Math.random() < 0.2) fx.push({ k: 'steam', x: rnd(30, 130), y: WATER + 4, t: T, d: 0.8 });
        if (Math.random() < 0.12) bubbles.push({ x: rnd(30, 130), y: FLOOR - 2, r: 1, vy: -22 });
        if (Math.hypot(fish.tx - fish.x, fish.ty - fish.y) < 6) { fish.tx = rnd(30, 130); fish.ty = rnd(60, 190); }
        return !!e.result || p >= 1;
      };
      if (!e.result) e.result = 'timeout';
      if (e.result === 'ok') {
        xo.ices = [0, 1, 2].map(i => ({ x: 44 + i * 36 + rnd(-6, 6), y: -10 - i * 8, vy: 0, s: 5, wet: false }));
        const h0 = xo.heat, th0 = xo.thermo, sy0 = xo.sun.y;
        yield* tween(1.4, p => {
          for (const c of xo.ices) { if (c.y < WATER + 8) c.y += 3; else c.y = WATER + 8 + Math.sin(T * 4 + c.x) * 1.5; if (!c.wet && c.y > WATER) { c.wet = true; splash(c.x, WATER); sfx('chapon'); } }
          xo.heat = h0 * (1 - p); xo.thermo = th0 + (0.3 - th0) * p; xo.sun.y = sy0 - 30 * p * p;
        });
        xo.sun = null; xo.heat = 0;
        fish.ex = { eyes: 'closed', mouth: 'smile', blush: true, mark: 'heart' };
        fx.push({ k: 'text', s: 'ひんやり〜', x: fish.x, y: fish.y - 28, t: T, d: 1.2, c: '#bff4ff' });
        evWin('すずしい！ +1', 1);
        yield* tween(1.0, p => { for (const c of xo.ices) c.s = Math.max(1, 5 - p * 4); });
        xo.ices = null; xo.thermo = null;
        return 'ok';
      }
      // のぼせて、いい湯だな
      fish.free = false;
      for (let i = 0; i < 8; i++) fx.push({ k: 'steam', x: fish.x + rnd(-14, 14), y: fish.y - 10, t: T + i * 0.15, d: 0.9 });
      yield* dieTo('boiled');
      fish.opts = { variant: 'boiled', boiled: true, eyes: 'calm', mouth: 'smile', blush: true };
      fx.push({ k: 'text', s: 'いい湯だな〜', x: fish.x, y: fish.y - 30, t: T, d: 1.8, c: '#ffffff', big: true }); sfx('yawn');
      yield 0.8;
      return yield* deathSettle('boiled');
    },
    *camera(e) {            // カメラ：ふれあいでポーズを教える（間に合わないと、写真に魂をとられる）
      e.need = 'touch'; e.label = 'カメラ！ ふれあいでポーズ'; e.limit = 3.4;
      xo.camera = { x: 80, y: 270, flash: false, rec: true }; sfx('blink'); A.duck(4);
      yield* tween(0.6, p => { xo.camera.y = 270 - 78 * ease(p); });
      fx.push({ k: 'text', s: 'はい、チーズ…', x: 80, y: 150, t: T, d: 1.4, c: '#ffffff' });
      fish.free = true; fish.speed = 20; fish.ex = { eyes: 'side', mouth: 'o', mark: '?' };
      e.t0 = T;
      let said = 0;
      yield () => {
        const n = Math.floor((T - e.t0) / (e.limit / 3));
        if (n > said && n < 3) { said = n; fx.push({ k: 'text', s: String(3 - n), x: 80, y: 160, t: T, d: 0.6, c: '#ffd23a', big: true }); sfx('blink'); }
        if (Math.hypot(fish.tx - fish.x, fish.ty - fish.y) < 6) { fish.tx = rnd(30, 130); fish.ty = rnd(70, 160); }
        return !!e.result || T - e.t0 > e.limit;
      };
      if (!e.result) e.result = 'timeout';
      if (e.result === 'ok') {
        yield* swimTo(80, 120, 70); fish.free = false;
        fish.ex = { front: true, eyes: 'sparkle', mouth: 'grin', blush: true };
        yield* fingerTo(104, 104, 0.4);
        fx.push({ k: 'text', s: 'ピース！', x: 104, y: 78, t: T, d: 1.0, c: '#ffffff' }); yield 0.3;
        xo.camera.flash = true; fx.push({ k: 'flash', t: T, d: 0.12 }); shutter();
        yield 0.15; xo.camera.flash = false;
        yield* fingerOut(0.3);
        xo.photo = { x: 80, y: 190, sx: 1, color: fish.color, stage: stageNow(), eyes: 'sparkle', mouth: 'grin' };
        yield* tween(0.6, p => { xo.photo.y = 190 - 40 * ease(p); });
        evWin('いい写真！ +1', 1); fish.ex = { eyes: 'happy', mouth: 'grin', mark: 'heart' };
        yield 1.0;
        const cy = xo.camera.y, py = xo.photo.y;
        yield* tween(0.5, p => { xo.camera.y = cy + 90 * p; xo.photo.y = py + 110 * p; });
        xo.camera = null; xo.photo = null;
        return 'ok';
      }
      // あくびの途中で、パシャッ
      fish.free = false; fish.vx = fish.vy = 0;
      fish.ex = { eyes: 'closed', mouth: 'yawn' }; sfx('yawn'); yield 0.5;
      setTimeoutT(() => { if (xo.camera) xo.camera.flash = true; fx.push({ k: 'flash', t: T, d: 0.15 }); shutter(); }, 0.6);
      setTimeoutT(() => { if (xo.camera) xo.camera.flash = false; }, 0.8);
      fx.push({ k: 'text', s: 'パシャッ', x: 80, y: 150, t: T + 0.6, d: 1.0, c: '#ffffff', big: true });
      yield* dieTo('photo');
      fish.opts = { variant: 'photo', photo: true };
      fx.push({ k: 'text', s: '魂をとられた…', x: 80, y: fish.y - 32, t: T, d: 1.8, c: '#ffffff' });
      const cy = xo.camera.y;
      yield* tween(0.6, p => { xo.camera.y = cy + 90 * p; });
      xo.camera = null;
      return yield* deathSettle('photo');
    },
    *magic(e) {             // 手品師：網で帽子を取りあげる（間に合わないと、ワン・ツー・スリーでハトに）
      e.need = 'net'; e.label = '手品師！ 網で帽子をとれ'; e.limit = 3.4;
      const hx = clamp(fish.x, 50, 110), fy0 = fish.y, fx0 = fish.x, fyT = clamp(fish.y, 120, 170), top = fyT - 18;
      fish.free = false; fish.vx = fish.vy = 0;
      xo.hat = { x: hx, y: -12, rot: 0 }; xo.glove = { x: hx, y: -42 };
      const ws = hx < 80 ? 1 : -1; xo.wand = { x: hx + ws * 40, y: -30, a: ws > 0 ? 2.5 : 0.65, spark: false };
      fx.push({ k: 'text', s: 'さあ、お立ちあい！', x: 80, y: 36, t: T, d: 1.4, c: '#ffffff' }); sfx('blink'); A.duck(4);
      yield* tween(0.8, p => { xo.hat.y = -12 + (top + 12) * ease(p); xo.glove.y = xo.hat.y - 30; xo.wand.y = -30 + (top - 18 + 30) * ease(p); fish.x = fx0 + (hx - fx0) * ease(p); fish.y = fy0 + (fyT - fy0) * ease(p); fish.swimPh += 0.2; });
      fish.look = 'up'; fish.ex = { eyes: 'wide', mouth: 'o', mark: '?' };
      e.t0 = T; let said = 0;
      yield () => {
        const n = Math.floor((T - e.t0) / (e.limit / 2.4));
        if (n > said && n <= 2) { said = n; fx.push({ k: 'text', s: ['', 'ワン', 'ツー'][n], x: xo.wand.x, y: xo.wand.y - 14, t: T, d: 0.8, c: '#ffd23a', big: true }); sfx('blink'); xo.wand.spark = true; setTimeoutT(() => { if (xo.wand) xo.wand.spark = false; }, 0.3); }
        xo.hat.x = hx + Math.sin(T * 3) * 2; xo.glove.x = xo.hat.x;
        return !!e.result || T - e.t0 > e.limit;
      };
      if (!e.result) e.result = 'timeout';
      fish.look = null;
      if (e.result === 'ok') {
        net = { x: xo.hat.x + 40, y: -30, tilt: -0.3, sag: 0.3, wet: false, drip: false }; sfx('net');
        const n0x = net.x, tgtY = xo.hat.y + 4;
        yield* tween(0.3, p => { net.x = n0x + (xo.hat.x + 2 - n0x) * p; net.y = -30 + (tgtY + 30) * p; net.tilt = -0.3 * (1 - p); });
        net.sag = 1; net.wet = true; sfx('splash');
        xo.glove.x += 0; fx.push({ k: 'text', s: 'あっ！', x: xo.glove.x, y: Math.max(14, xo.glove.y - 6), t: T, d: 0.8, c: '#ffffff' });
        yield* tween(0.7, p => { net.y = tgtY - (tgtY + 60) * p * p; xo.hat.y = net.y + 2; xo.hat.x = net.x; if (net.y < WATER) net.drip = true; xo.glove.y -= 1.5; xo.wand.y -= 1.5; });
        net = null; xo.hat = null;
        fx.push({ k: 'text', s: 'タネあかし！', x: 80, y: 60, t: T, d: 1.2, c: '#ffffff' });
        yield* tween(0.5, p => { xo.glove.y -= 3; xo.wand.y -= 3; });
        xo.glove = null; xo.wand = null;
        fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: 'heart' }; evWin('見やぶった！ +1', 1); yield 0.8;
        return 'ok';
      }
      // スリー！：v23.2 ユーザーの絵。帽子をかぶって…ハトになって飛んでいく
      fx.push({ k: 'text', s: 'スリー！', x: xo.wand.x, y: xo.wand.y - 14, t: T, d: 0.9, c: '#ffd23a', big: true }); xo.wand.spark = true;
      xo.hat = null; fish.dir = fish.face = -1; fish.turnP = 0; fish.opts = {}; fish.look = null; fish.ex = {};
      setTimeoutT(() => { sfx('puff'); fx.push({ k: 'text', s: 'ポン！', x: hx, y: fish.y - 40, t: T, d: 0.8, c: '#ffffff', big: true }); }, 1.6);
      yield* playSeq('pigeon', { d: 3.2 });
      xo.wand.spark = false;
      sfx('tweet'); A.tone(420, 0.25, 'sine', 0.2, 0.05, 0.7); A.tone(420, 0.3, 'sine', 0.2, 0.35, 0.6);
      fx.push({ k: 'text', s: 'クルッポー', x: hx, y: fish.y - 30, t: T, d: 1.4, c: '#ffffff', big: true });
      const fyp = fish.y;
      yield* tween(1.6, p => { fish.y = fyp - (fyp + 60) * p * (0.3 + 0.7 * p); fish.x = hx - 40 * p + Math.sin(p * 10) * 3; xo.glove.y -= 1; xo.wand.y -= 1; });
      fish.vis = false; xo.glove = xo.wand = null;
      fx.push({ k: 'text', s: 'ご喝采！', x: 80, y: 40, t: T, d: 1.4, c: '#ffd23a' });
      return yield* deathSettle('pigeon');
    },
  });
  let glow = null;
  function drawEventLayer() {
    if (dark > 0) {
      ctx.fillStyle = 'rgba(8,14,28,' + dark.toFixed(3) + ')'; ctx.fillRect(0, WATER - 22, W, H);
      if (fish.vis && dark > 0.3) {   // 暗闇で光る目
        const ex2 = Math.round(fish.x + fish.face * 10), ey = Math.round(fish.y - 4);
        ctx.fillStyle = '#fff6a0'; ctx.fillRect(ex2 - 3, ey, 2, 2); ctx.fillRect(ex2 + 1, ey, 2, 2);
      }
      if (glow && finger) {
        const r = 18 + Math.sin(T * 6) * 2;
        const gr = ctx.createRadialGradient(finger.x, finger.y + 2, 1, finger.x, finger.y + 2, r * 2);
        gr.addColorStop(0, 'rgba(255,240,170,0.55)'); gr.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = gr; ctx.fillRect(finger.x - r * 2, finger.y - r * 2, r * 4, r * 4);
      }
    }
    if (ev && !ev.result && ev.t0) {
      const left = Math.max(0, 1 - (T - ev.t0) / ev.limit);
      const icon = { feed: 'food', clean: 'clean', touch: 'touch', net: 'net' }[ev.need];
      // v22：文字のヒントはやめて、押すボタンのアイコンだけを大きく（2倍）
      if (S.drawAlert) { ctx.save(); ctx.translate(80, 58); ctx.scale(2, 2); S.drawAlert(ctx, 0, 0, T, icon); ctx.restore(); }
      ctx.fillStyle = '#1d4d4a'; ctx.fillRect(39, 100, 82, 5);
      ctx.fillStyle = left < 0.35 ? '#ff5a5a' : '#ffd23a'; ctx.fillRect(40, 101, Math.round(80 * left), 3);
    }
  }

  // ---------------- お客さん（巻貝・カニ・エビ） ----------------
  function updateVisitor(dt, idle) {
    if (mode !== 'play') { if (visitor && mode !== 'dead') visitor = null; return; }
    if (!visitor) {
      if (idle && !gest && !mgInvite && T > visitAt) {
        const kind = forceVisitor || VISITORS[Math.random() * VISITORS.length | 0]; stat('v:' + kind);
        const from = Math.random() < 0.5 ? -1 : 1;
        visitor = kind === 'snail' ? { kind, x: rnd(30, 130), y: WATER + 4, vx: rnd(-3, 3), vy: 7, t0: T }
          : kind === 'crab' ? { kind, x: from < 0 ? -12 : W + 12, y: SAND_Y - 5, vx: -from * 16, vy: 0, t0: T }
          : kind === 'turtle' ? { kind, x: from < 0 ? -30 : W + 30, y: 66, vx: -from * 12, t0: T }
          : kind === 'loach' ? { kind, x: from < 0 ? -18 : W + 18, y: SAND_Y - 5, vx: -from * 22, vy: 0, t0: T, dig: 0 }        // v20 ドジョウ
          : kind === 'catfish' ? { kind, x: from < 0 ? -40 : W + 40, y: FLOOR - 16, vx: -from * 11, vy: 0, t0: T, open: 0 }     // v20 ナマズ
          : { kind, x: from < 0 ? -12 : W + 12, y: rnd(70, 170), vx: -from * 26, vy: 0, t0: T, hop: 0 };
        sfx(kind === 'crab' ? 'hic' : 'bubble');
        if (!busy) { gestAt = Math.max(gestAt, T + 8); fish.cruise = false; fish.wps = []; gest = { it: gVisitor(visitor), wait: 0, cond: null }; }
      }
      return;
    }
    const v = visitor;
    if (v.kind === 'snail') {
      if (!(v.hideUntil > T)) { v.x += v.vx * dt; v.y += v.vy * dt; }
      if (v.y > FLOOR - 4 || T - v.t0 > 24) { visitor = null; visitAt = T + rnd(35, 60); }
    } else if (v.kind === 'crab') {
      if (!(v.pauseUntil > T)) v.x += v.vx * dt;
      if (Math.random() < dt * 0.4) v.pauseUntil = T + rnd(0.4, 1.0);
      if (v.x < -20 || v.x > W + 20) { visitor = null; visitAt = T + rnd(35, 60); }
    } else if (v.kind === 'turtle') {
      if (!v.falling) v.y = 66 + Math.sin((T - v.t0) * 2) * 8;   // v23 P5c：画面の上のほうを泳ぐ
      if (!(v.pauseUntil > T)) v.x += v.vx * dt * (Math.sin(T * 5) > -0.3 ? 1 : 0.2);
      else v.neck = Math.min(1, (v.neck || 0) + dt * 2);
      if (!(v.pauseUntil > T)) v.neck = Math.max(0, (v.neck || 0) - dt * 2);
      if (!v.ride && Math.random() < dt * 0.25) v.pauseUntil = T + rnd(1, 2);
      if (v.x < -36 || v.x > W + 36) { visitor = null; visitAt = T + rnd(35, 60); }
    } else if (v.kind === 'loach') {    // v20 ドジョウ：くねくね進んで、ときどき砂にもぐって ばっと出る
      if (v.digUntil > T) { v.dig = Math.min(1, v.dig + dt * 3); }
      else { v.dig = Math.max(0, v.dig - dt * 4); if (v.dig < 0.05 && !(v.pauseUntil > T)) v.x += v.vx * dt * (0.6 + 0.4 * Math.sin(T * 9)); }
      if (!(v.pauseUntil > T) && Math.abs(v.vx) < 1) v.vx = Math.sign(v.vx || 1) * 22;
      if (!(v.digUntil > T) && Math.random() < dt * 0.25) { v.digUntil = T + rnd(1.2, 2.2); sandPuff(v.x, SAND_Y, 5); }
      if (v.x < -24 || v.x > W + 24) { visitor = null; visitAt = T + rnd(35, 60); }
    } else if (v.kind === 'catfish') {  // v20 ナマズ：底のほうを ゆったり。ときどき大あくび
      if (!(v.pauseUntil > T)) { v.x += v.vx * dt; v.y = FLOOR - 16 + Math.sin(T * 1.2) * 2; }
      if (!v.eat) v.open = v.yawnUntil > T ? Math.min(1, v.open + dt * 2) : Math.max(0, v.open - dt * 3);
      if (!v.eat && Math.random() < dt * 0.12) v.yawnUntil = T + 1.2;
      if (v.x < -48 || v.x > W + 48) { visitor = null; visitAt = T + rnd(35, 60); }
    } else {
      v.hop += dt; const ph = (v.hop % 0.9) / 0.9;
      v.x += v.vx * dt * (ph < 0.35 ? 2.2 : 0.3); v.y += Math.sin(T * 2) * 4 * dt;
      v.jump = ph < 0.35;
      if (v.x < -20 || v.x > W + 20) { visitor = null; visitAt = T + rnd(35, 60); }
    }
  }
  function drawVisitorBack() {   // 砂の上・水中のもの（魚より奥）
    const v = visitor; if (!v) return;
    if (v.kind === 'crab' && S.drawCrab) S.drawCrab(ctx, Math.round(v.x), Math.round(v.y), T, { pinch: v.pinch, angry: v.angry });
    if (v.kind === 'shrimp' && S.drawShrimp) S.drawShrimp(ctx, Math.round(v.x), Math.round(v.y), T, { dir: v.vx > 0 ? 1 : -1, jump: v.jump });
    if (v.rock && S.drawBaskRock) S.drawBaskRock(ctx, v.rock.x, v.rock.top, v.rock.sun, T);
    if (v.kind === 'turtle' && !v.falling) drawTurtleVisitor(v);
    if (v.kind === 'loach' && S.drawLoach) S.drawLoach(ctx, Math.round(v.x), Math.round(v.y), T, { dir: v.vx >= 0 ? 1 : -1, dig: v.dig, happy: v.happy });
    if (v.kind === 'catfish' && S.drawCatfish) S.drawCatfish(ctx, Math.round(v.x), Math.round(v.y), T, { dir: v.vx >= 0 ? 1 : -1, open: v.open, belly: v.belly, happy: v.happy });
  }
  function drawTurtleVisitor(v) {
    if (v.look && S.drawTurtleLook) { S.drawTurtleLook(ctx, Math.round(v.x), Math.round(v.y), T, { dir: Math.sign(v.vx), look: 1, blink: v.blink }); return; }
    S.drawTurtle(ctx, Math.round(v.x), Math.round(v.y), T,
      { dir: Math.sign(v.vx), happy: v.happy, neck: v.neck, surprised: v.falling });
  }
  function drawVisitorFront() {  // ガラスに張りつくもの（魚より手前）
    const v = visitor; if (!v) return;
    if (v.kind === 'turtle' && v.falling) drawTurtleVisitor(v);
    if (v.kind === 'snail' && S.drawSnail) S.drawSnail(ctx, Math.round(v.x), Math.round(v.y), T, { rot: Math.atan2(v.vy, v.vx), surprised: v.hideUntil > T });
  }
  // v22：お客さんと仲よくできたら（事故がなかったら）なかよし +1
  function friend(v) { if (v.friend || mode !== 'play') return; v.friend = true; g.bonus(1); sfx('card'); fx.push({ k: 'text', s: 'なかよし +1', x: clamp(fish.x, 40, 120), y: fish.y - 24, t: T, d: 1.3, c: '#ff9ad0' }); fx.push({ k: 'heart', x: fish.x, y: fish.y - 14, t: T, d: 1.0 }); }
  // 魚がお客さんに反応する（v19: カメ・クラゲ・タコを追加。カニ・カメ・クラゲ・タコは P.visit で事故）
  function* gVisitor(v) {
    yield 0.6;
    if (v.kind !== 'snail') {   // v20: 画面の中まで来てから近づく（v22: 待つあいだは、お客さんの来る側へ ゆっくり寄っていく）
      fish.ex = { eyes: 'sparkle', mouth: 'o', mark: '!' };
      yield () => { fish.free = true; fish.speed = 30; fish.tx = clamp(v.x + (v.vx >= 0 ? 34 : -34), 30, 130); fish.ty = clamp(v.y - 28, 44, FLOOR - 20); fish.dir = v.x > fish.x ? 1 : -1; return (v.x > 34 && v.x < 126) || visitor !== v; };
      if (visitor !== v) return; }
    if (v.kind === 'turtle') {   // v20 ミドリガメ：近づくと首をのばしてあいさつ → 背中にちょこんと乗って、のそのそ一緒に
      fish.ex = { eyes: 'sparkle', mouth: 'o', mark: '!' };
      yield () => { fish.free = true; fish.speed = 45; fish.tx = clamp(v.x + Math.sign(v.vx) * 22, 24, 136); fish.ty = v.y + 8; fish.dir = v.x > fish.x ? 1 : -1; return Math.hypot(fish.x - fish.tx, fish.y - fish.ty) < 5 || visitor !== v; };
      if (visitor !== v) return;
      v.pauseUntil = T + 1.6; v.neck = 0; fish.dir = -Math.sign(v.vx) || 1; sfx('pet'); yield 1.0;
      { const acc = g.visitorAccident('turtle'); if (acc) return gestDeath(acc, v); }
      v.happy = true; v.ride = true; fish.ex = { eyes: 'happy', mouth: 'grin', blush: true, mark: 'note' };
      for (let k = 0; k < 16 && visitor === v; k++) { fish.tx = clamp(v.x - Math.sign(v.vx) * 2, 24, 136); fish.ty = clamp(v.y - 24, 30, FLOOR - 4); fish.dir = v.vx > 0 ? 1 : -1; yield 0.25; }
      v.ride = false; fish.ex = { eyes: 'sparkle', mouth: 'smile' }; friend(v); yield go(fish.x, fish.y - 30, 40); yield 0.4; return;
    }
    if (v.kind === 'loach') {    // v20 ドジョウ：のぞきこむ → 砂にもぐる → ばっと出てきて、びっくり
      fish.ex = { eyes: 'sparkle', mouth: 'o', mark: '?' };
      const side = fish.x < v.x ? -1 : 1;
      yield () => { fish.free = true; fish.speed = 50; fish.tx = clamp(v.x + side * 28, 24, 136); fish.ty = FLOOR - 12; fish.dir = -side; return Math.hypot(fish.x - fish.tx, fish.y - fish.ty) < 5 || visitor !== v; };
      v.vx = Math.sign(v.vx) * 0.01; v.pauseUntil = T + 4;
      if (visitor !== v) return;
      { const acc = g.visitorAccident('loach'); if (acc) return gestDeath(acc, v); }
      v.digUntil = T + 1.6; sandPuff(v.x, SAND_Y, 8); fish.ex = { eyes: 'side', mouth: 'o', mark: '?' }; yield 1.6;
      v.digUntil = 0; sandPuff(v.x, SAND_Y, 10); sfx('pop'); fish.surpT = T; fish.sq = 1.2; fish.ex = { eyes: 'surprised', mouth: 'o', mark: '!' };
      yield go(fish.x - fish.face * 28, fish.y - 30, 80); fish.ex = { eyes: 'teary', mouth: 'smile' }; v.happy = true; friend(v); yield 0.8; return;
    }
    if (v.kind === 'catfish') {  // v20 ナマズ：ごあいさつ → 大あくび → あわてて逃げる
      fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: '!' };
      yield () => { fish.free = true; fish.speed = 45; fish.tx = clamp(v.x + Math.sign(v.vx) * 44, 24, 136); fish.ty = clamp(v.y - 4, 36, FLOOR - 4); fish.dir = v.x > fish.x ? 1 : -1; return Math.hypot(fish.x - fish.tx, fish.y - fish.ty) < 5 || visitor !== v; };
      if (visitor !== v) return;
      v.pauseUntil = T + 2.5; sfx('pet'); yield 0.6;
      { const acc = g.visitorAccident('catfish'); if (acc) return gestDeath(acc, v); }
      v.yawnUntil = T + 1.2; sfx('yawn'); fish.ex = { eyes: 'surprised', mouth: 'o', sweat: true }; fish.surpT = T; yield 0.5;
      yield go(fish.x + Math.sign(v.vx) * 40, fish.y - 40, 95); fish.ex = { eyes: 'teary', brows: 'worried', mouth: 'wavy' }; friend(v); yield 0.8; return;
    }
    if (v.kind === 'snail') {
      fish.ex = { eyes: 'surprised', mark: '?' };
      for (let k = 0; k < 3; k++) { yield go(v.x - fish.face * 24, v.y + 4, 40); fish.dir = v.x > fish.x ? 1 : -1; fish.ex = { eyes: 'sparkle', mouth: 'o' }; yield 0.6; }
      v.hideUntil = T + 1.4; sfx('pop'); fish.ex = { eyes: 'surprised', mouth: 'o', mark: '!' }; fish.sq = 1; yield 1.6;
      // v23.3 なかよし：顔を出したタニシの背中に乗って、ガラスをゆっくり下りる
      if (visitor === v) {
        fish.ex = { eyes: 'happy', mouth: 'grin', blush: true, mark: 'note' }; sfx('pet');
        for (let k = 0; k < 16 && visitor === v; k++) { fish.free = true; fish.speed = 40; fish.tx = clamp(v.x + 2, 24, 136); fish.ty = clamp(v.y - 15, 30, FLOOR - 12); fish.dir = v.vx >= 0 ? 1 : -1; yield 0.25; }
      }
      fish.ex = { eyes: 'sparkle', mouth: 'smile' }; friend(v); yield 0.8;
    } else if (v.kind === 'crab') {
      fish.ex = { eyes: 'sparkle', mark: '?' };
      yield go(v.x - fish.face * 34, FLOOR - 18, 45);
      yield () => { fish.tx = clamp(v.x - fish.face * 32, 24, 136); fish.ty = FLOOR - 18; fish.dir = v.x > fish.x ? 1 : -1; return Math.abs(fish.x - fish.tx) < 4 || v.x < -10 || v.x > W + 10; };
      if (visitor !== v) return;
      { const acc = g.visitorAccident('crab'); if (acc) return gestDeath(acc, v); }   // v19
      // チョキン！
      v.pinch = true; v.angry = true; v.pauseUntil = T + 1.2; sfx('bonk'); fish.sq = 1.3;
      fish.ex = { eyes: 'teary', mouth: 'o', mark: 'anger', sweat: true };
      fx.push({ k: 'text', s: 'チョキン', x: v.x, y: v.y - 14, t: T, d: 0.9, c: '#ff5a5a' });
      yield go(fish.x - fish.face * 50, FLOOR - 70, 95);
      v.pinch = false;
      fish.ex = { eyes: 'teary', brows: 'worried', mouth: 'wavy' }; yield 1.0;
    } else {
      fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: '!' };
      for (let k = 0; k < 6 && visitor === v; k++) {
        fish.ex = { eyes: 'sparkle', mouth: k % 2 ? 'o' : 'grin' }; yield go(v.x - Math.sign(v.vx) * 26, v.y, 75);
        if (k === 3 && v.kind === 'shrimp') { const acc = g.visitorAccident('shrimp'); if (acc) return gestDeath(acc, v); }   // v23.3 追いかけすぎ
      }
      fish.ex = { eyes: 'side', mouth: 'pout', mark: '?' }; friend(v); yield 0.9;
    }
  }

  // ---------------- しぐさ中の突然死 ----------------
  function gestDeath(id, side) {
    gest = null; fish.ex = {}; fish.rot = 0; fish.oy = 0; fish.ox = 0;
    busy = true; queued = null; fish.cruise = false; fish.free = false;
    startTask(function* () { yield* GDEATH[id](side); });
  }
  const VISITORS = ['snail', 'crab', 'shrimp', 'turtle', 'loach', 'catfish'];   // v20: 巻貝・カニ・エビ・ミドリガメ・ドジョウ・ナマズ
  const VISIT_OF_CAUSE = { haircut: 'crab', squashed: 'turtle', loach: 'loach', catfish: 'catfish', kicked: 'shrimp' };
  const GDEATH = {
    // ---- v19：お客さんの事故（v = お客さん） ----
    *kicked(v) {            // v23.3 エビの後ろげりで、画面のガラスにべちゃっ → ずり落ちる
      v.pauseUntil = T + 8; const d = v.vx >= 0 ? 1 : -1;
      fish.dir = fish.face = d; fish.turnP = 0; fish.ex = { eyes: 'sparkle', mouth: 'grin' };
      const ax = clamp(v.x - d * 16, 24, 136), ay = clamp(v.y, 40, FLOOR - 20), bx = fish.x, by = fish.y;
      yield* tween(0.4, p => { fish.x = bx + (ax - bx) * ease(p); fish.y = by + (ay - by) * ease(p); });
      v.jump = true; sfx('bonk'); fx.push({ k: 'text', s: 'ゲシッ', x: v.x, y: v.y - 14, t: T, d: 0.9, c: '#ffffff' });
      fish.ex = { eyes: 'surprised', mouth: 'o', mark: '!' }; fish.surpT = T;
      const x0 = fish.x, y0 = fish.y;
      yield* tween(0.5, p => { fish.opts = { scale: Math.round((1 + 1.5 * p) * 20) / 20 }; fish.x = x0 + (80 - x0) * p; fish.y = y0 + (100 - y0) * p; fish.rot = p * Math.PI * 2; });
      v.jump = false; fish.rot = 0; sfx('koton'); fx.push({ k: 'flash', t: T, d: 0.1 });
      fx.push({ k: 'text', s: 'べちゃっ', x: 80, y: 50, t: T, d: 1.4, c: '#ffd23a', big: true });
      fish.ex = { front: true, eyes: 'x', mouth: 'o' }; fish.opts = { scale: 2.5, sx: 1.2, sy: 0.85 };
      yield 1.0;
      yield* tween(1.6, p => { fish.y = 100 + 50 * p * p; });   // ガラスをずりずり…
      fish.ex = {}; fish.opts = { flip: true }; fish.eyes = 'x';
      return yield* deathSettle('kicked');
    },
    *haircut(v) {           // カニにチョキチョキ…ひれも尾もなくなる
      fish.dir = fish.face = v.x > fish.x ? 1 : -1; fish.turnP = 0; v.pauseUntil = T + 9;
      fx.push({ k: 'text', s: 'チョキ チョキ', x: v.x, y: v.y - 16, t: T, d: 2.2, c: '#ffffff' });
      for (let k = 0; k < 8; k++) setTimeoutT(() => { if (visitor === v) { v.pinch = !v.pinch; sfx('brush'); } }, 0.5 + k * 0.22);
      yield* dieTo('haircut');
      v.pinch = false; v.angry = false;
      fish.opts = { variant: 'haircut', trim: 1, flip: true }; fish.eyes = 'x'; sfx('death');
      return yield* deathSettle('haircut');
    },
    *squashed(v) {
      v.pauseUntil = T + 12; v.falling = true;
      const d = Math.sign(v.vx), x = clamp(v.x, 40, 120), y = v.y;
      const tailX = x - d * 34, x0 = fish.x, y0 = fish.y;
      fish.dir = fish.face = d; fish.turnP = 0;
      fish.ex = { eyes: 'side', mouth: 'o' };
      yield* tween(0.95, p => { fish.x = x0 + (tailX - x0) * ease(p); fish.y = y0 + (y + 6 - y0) * ease(p); });
      for (let k = 0; k < 2; k++) {
        sfx('pet');
        yield* tween(0.32, p => {
          fish.x = tailX + d * Math.sin(p * Math.PI) * (k ? -4 : 5);
          v.x = x - d * Math.sin(p * Math.PI) * (k ? 3 : 0);
        });
      }
      v.x = x;
      fish.ex = { eyes: 'surprised', mouth: 'o', mark: '!' };
      sfx('pu');
      yield* tween(0.48, p => { v.y = y - 19 * Math.sin(p * Math.PI); fish.x = tailX + (x - tailX) * ease(p); fish.y = y + 15; });
      yield* tween(0.28, p => { v.y = y + 11 * p * p; });
      // v23 P5：ぺたんこの金魚は頭をカメのうしろに出す。カメは乗ったまま振り向いて、こっちをじっと見る
      fish.ex = {}; fish.dir = fish.face = -d; fish.x = x + d * 13;
      fish.opts = { variant: 'squashed', eyes: 'tight', mouth: 'wavy', scale: 1, swimF: 0 }; fish.y = y + 20;
      sfx('koton');
      fx.push({ k: 'text', s: 'ぺたん！', x, y: y - 24, t: T, d: 1.2, c: '#ffd23a' });
      yield 0.7;
      { const vy0 = v.y, fy = SAND_Y - 4, dy = fy - fish.y;   // 乗ったまま砂の上まで、ずしーん
        const vy1 = fy - 12;
        yield* tween(0.9, p => { const e = p * p; fish.y = fy - dy * (1 - e); v.y = vy0 + (vy1 - vy0) * e; }); }
      sfx('koton'); sandPuff(fish.x, SAND_Y, 10); fish.opts.eyes = 'x';
      fx.push({ k: 'text', s: 'ずしーん', x, y: v.y - 26, t: T, d: 1.0, c: '#ffd23a' });
      yield 1.0;
      v.look = 1; sfx('blink'); yield 0.7;
      fx.push({ k: 'text', s: '……', x: x + d * 17, y: v.y - 34, t: T, d: 1.6, c: '#ffffff' });
      yield 1.2; v.blink = true; yield 0.15; v.blink = false; yield 0.9;
      return yield* deathSettle('squashed', true);
    },
    *loach(v) {
      const dir = v.vx >= 0 ? 1 : -1, x = clamp(v.x - dir * 28, 28, 132);
      v.digUntil = T + 3; v.pauseUntil = T + 6;
      fish.dir = fish.face = dir; fish.turnP = 0;
      fish.ex = { eyes: 'side', mouth: 'o', mark: '?' };
      sandPuff(v.x, SAND_Y, 8); yield 0.85;
      const x0 = fish.x, y0 = fish.y;
      fish.ex = { eyes: 'closed', mouth: 'grin' };
      yield* tween(0.65, p => { fish.x = x0 + (x - x0) * ease(p); fish.y = y0 + (SAND_Y - 22 - y0) * ease(p); fish.rot = dir * p * Math.PI / 2; });
      sfx('pop'); sandPuff(x, SAND_Y, 10);
      const depth = SAND_Y + 11;
      yield* tween(0.42, p => { fish.y = SAND_Y - 22 + (depth - SAND_Y + 22) * ease(p); });
      yield* tween(2.1, p => {
        fish.rot = dir * Math.PI / 2 + Math.sin(p * 56) * 0.24 * (1 - p);
        fish.y = depth - Math.abs(Math.sin(p * 32)) * 3 * (1 - p);
      });
      fish.opts = { wag: 0, swimF: 0 };
      sfx('koton');
      return yield* deathSettle('loach', true);
    },
    *catfish(v) {           // v20 ナマズの大きな口に吸いこまれる
      v.pauseUntil = T + 99; v.eat = true;
      const d = Math.sign(v.vx) || 1; v.vx = d * 0.01;
      fish.dir = fish.face = -d; fish.turnP = 0;
      const mx = () => v.x + d * 32, my = () => v.y - 2;
      yield* tween(0.8, p => { v.open = ease(p); });
      sfx('suck');
      const x0 = fish.x, y0 = fish.y;
      yield* tween(1.8, p => { dieAt('catfish', p); const q = p * p; fish.x = x0 + (mx() - x0) * q; fish.y = y0 + (my() - y0) * q; for (let i = 0; i < (Math.random() < 0.5 ? 1 : 0); i++) fx.push({ k: 'drop', x: mx() + d * rnd(6, 20), y: my() + rnd(-8, 8), vx: -d * 40, vy: 0, t: T, d: 0.3 }); });
      fish.vis = false; fish.die = null; sfx('gulp');
      yield* tween(0.3, p => { v.open = 1 - p; });
      v.open = 0; v.belly = true; v.eat = false;
      fx.push({ k: 'text', s: 'ごっくん', x: v.x, y: v.y - 18, t: T, d: 1.2, c: '#ffffff' });
      yield 0.8; sfx('bubble'); bubbles.push({ x: mx(), y: my() - 4, r: 4, vy: -10 }); fx.push({ k: 'text', s: 'げっぷ', x: mx(), y: my() - 26, t: T, d: 1.0, c: '#ffffff' });
      yield 0.6; v.pauseUntil = 0; v.vx = d * 10;
      return yield* deathSettle('catfish');
    },

    *stuck(side) {          // 勢いあまってガラスに刺さる
      side = side || (fish.x < 80 ? -1 : 1);
      sfx('bonk'); sfx('zap'); fish.dir = fish.face = side; fish.turnP = 0;
      crack = { x: side < 0 ? 17 : 143, y: Math.round(fish.y), size: 16 };
      fish.x = side < 0 ? 30 : 130;
      yield* dieTo('stuck');
      fish.opts = { variant: 'stuck', stuck: true }; fish.eyes = 'x';
      fx.push({ k: 'star', x: crack.x, y: crack.y, t: T, d: 0.8 });
      yield 0.8;
      return yield* deathSettle('stuck', true);
    },
    *hiccupfly() {          // 最後のしゃっくりで昇天
      sfx('hic'); sfx('boing'); fish.sq = 1.4; fish.eyes = 'closed';
      yield* tween(0.3, p => { fish.oy = -Math.round(Math.sin(p * Math.PI) * 10); });
      yield* dieTo('hiccupfly');
      fish.oy = 0; fish.opts = { variant: 'hiccupfly', halo: true, wings: true }; sfx('fanfare');
      const x0 = fish.x, y0 = fish.y;
      yield* tween(3.2, p => { fish.y = y0 + (-40 - y0) * p; fish.x = x0 + Math.sin(p * 9) * 6; });
      fish.vis = false;
      return yield* deathSettle('hiccupfly');
    },
    *knotted() {            // しっぽを追いすぎて結んじゃう
      sfx('spin'); fish.free = false;
      yield* tween(0.6, p => { fish.rot = fish.face * p * Math.PI * 4; });
      fish.rot = 0; sfx('koton'); fish.sq = 1.2;
      yield* dieTo('knotted');
      fish.opts = { variant: 'knotted', knot: true }; fish.eyes = 'x';
      yield 0.8;
      return yield* deathSettle('knotted');
    },
    *flat() {               // くしゃみの反動でガラスにぺたん
      const side = -fish.face, wx = side < 0 ? 26 : 134, x0 = fish.x;
      yield* tween(0.22, p => { fish.x = x0 + (wx - x0) * p * p; });
      sfx('bonk'); sfx('splash'); fish.sq = 0;
      yield* dieTo('flat');
      fish.opts = { variant: 'flat', flat: true }; fish.eyes = 'x';
      yield 0.6;
      const y0 = fish.y; yield* tween(3, p => { fish.y = y0 + 40 * p; });   // ずるずる滑り落ちる
      return yield* deathSettle('flat', true);
    },
    *nowake() {             // うたた寝のまま、魂が抜ける
      yield* dieTo('nowake', 1.2);
      fish.eyes = 'closed'; fish.opts = { variant: 'nowake', soul: false };
      yield 0.6; sfx('yawn');
      soul = { x: fish.x, y: fish.y - 6 };
      const x0 = soul.x, y0 = soul.y;
      yield* tween(3.5, p => { soul.y = y0 + (-30 - y0) * p; soul.x = x0 + Math.sin(p * 8) * 6; });
      soul = null;
      return yield* deathSettle('nowake', true);
    },

  };
  const GDEATH_GEST = { stuck: 'bonk', hiccupfly: 'hiccup', knotted: 'tail', flat: 'sneeze', nowake: 'nap' };

  // ---------------- 画面下でのしぐさ ----------------
  function sandPuff(x, y, n) { for (let i = 0; i < (n || 8); i++) fx.push({ k: 'sand', x: x + rnd(-6, 6), y, vx: rnd(-25, 25), vy: rnd(-35, -12), t: T, d: 0.8 }); }
  function* gDig() {             // 砂を掘る → ときどき宝物
    yield go(rnd(30, 130), FLOOR - 10, 45);
    fish.free = false; fish.ex = { eyes: 'closed', mouth: 'o' };
    yield* tween(0.3, p => { fish.rot = fish.face * 0.7 * p; });
    for (let k = 0; k < 3; k++) { sfx('brush'); sandPuff(mouthX(), FLOOR + 2, 7); yield* tween(0.35, p => { fish.ox = Math.round(Math.sin(p * Math.PI * 4) * 2); }); }
    fish.ox = 0;
    yield* tween(0.25, p => { fish.rot = fish.face * 0.7 * (1 - p); });
    fish.rot = 0;
    if (Math.random() < 0.5 && treasures.length < 10) {
      const kind = ['coin', 'shell', 'star', 'coin', 'crown'][Math.random() * 5 | 0];
      const t = { kind, x: mouthX(), y: FLOOR + 5 };
      sfx('fanfare'); fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: '!' }; fish.sq = 1;
      for (let i = 0; i < 8; i++) fx.push({ k: 'star', x: t.x + rnd(-8, 8), y: t.y - 6 + rnd(-6, 4), t: T + i * 0.05, d: 0.6 });
      fx.push({ k: 'text', s: { coin: 'コイン！', shell: 'かいがら！', star: 'ヒトデ！', crown: 'おうかん！？' }[kind], x: t.x, y: t.y - 16, t: T, d: 1.4, c: '#ffd23a' });
      treasures.push(t);
      yield 1.2;
    } else { fish.ex = { eyes: 'side', mouth: 'wavy', mark: '?' }; yield 0.8; }
    fish.free = true;
  }
  function* gPebble() {          // 小石をくわえて模様替え
    const peb = treasures.find(t => t.kind === 'pebble'); if (!peb) return;
    yield go(peb.x - fish.face * 20, FLOOR - 4, 45);
    fish.dir = peb.x > fish.x ? 1 : -1; yield 0.3;
    fish.ex = { mouth: 'o' }; sfx('eat'); treasures.splice(treasures.indexOf(peb), 1); carry = 'pebble'; fish.ex = { cheeks: true, eyes: 'closed' };
    const tx = peb.x < 80 ? rnd(95, 130) : rnd(30, 65);
    yield go(tx, FLOOR - 4, 35);
    sfx('koton'); carry = null; treasures.push({ kind: 'pebble', x: mouthX(), y: FLOOR + 5 }); sandPuff(mouthX(), FLOOR + 3, 4);
    fish.ex = { eyes: 'closed', mouth: 'smile', mark: 'note' }; yield 0.8;
  }
  function* gBubbleRide() {      // エアストーンの泡に乗って上へ
    yield go(AIR_X, FLOOR - 12, 50);
    fish.free = false; fish.ex = { eyes: 'closed', mouth: 'grin', blush: true }; sfx('bubble');
    const y0 = fish.y;
    yield* tween(2.2, p => { fish.y = y0 + (44 - y0) * p; fish.x = AIR_X + Math.sin(p * 14) * 4; fish.rot = Math.sin(p * 10) * 0.35; if ((p * 20 | 0) % 4 === 0) fish.sq = 0.3; });
    fish.rot = 0; sfx('pop'); fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: 'note' };
    yield 0.4; fish.free = true; yield go(fish.x + fish.face * 30, 110, 40);
  }
  function* gSandHide() {        // 砂にもぐって目だけ出す
    yield go(rnd(40, 120), FLOOR - 8, 45);
    fish.free = false; sfx('splash'); sandPuff(fish.x, FLOOR + 2, 12);
    fish.hermit = true; yield 3.2;
    sfx('boing'); sandPuff(fish.x, FLOOR + 2, 12); fish.hermit = false; fish.sq = 1.3;
    fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: '!' };
    yield* tween(0.35, p => { fish.y = FLOOR - 8 - Math.sin(p * Math.PI) * 18; });
    yield 0.4; fish.free = true;
  }

  const GESTURES = { look: gLookAtYou, yawn: gYawn, hiccup: gHiccup, sneeze: gSneeze, bubbles: gBlowBubbles, tail: gTailChase, bonk: gBonk,
    nibble: gNibblePlant, nap: gNap, dance: gDance, peek: gPeek, showoff: gShowOff,
    dig: gDig, pebble: gPebble, bubbleride: gBubbleRide, sandhide: gSandHide };
  function playGesture(name) { stat('g:' + name); fish.cruise = false; fish.wps = []; gest = { it: GESTURES[name](), wait: 0, cond: null }; }
  function endGesture() {
    gest = null; fish.ex = {}; fish.rot = 0; fish.oy = 0; fish.ox = 0; fish.turn = 3; fish.speed = 30; fish.free = true;
    if (carry) { treasures.push({ kind: carry, x: fish.x, y: FLOOR + 5 }); carry = null; }
    if (mode === 'play') fish.hermit = false;
    if (mode === 'play') fish.opts = {};
    wanderAt = 0;
  }
  function stepGesture(dt) {
    const d = gest;
    if (d.wait > 0) { d.wait -= dt; if (d.wait > 0) return; }
    if (d.cond) { if (!d.cond()) return; d.cond = null; }
    for (let k = 0; k < 20; k++) {
      const r = d.it.next(); if (gest !== d) return;
      if (r.done) { endGesture(); return; }
      if (typeof r.value === 'number') { if (r.value > 0) { d.wait = r.value; return; } }
      else if (typeof r.value === 'function' && !r.value()) { d.cond = r.value; return; }
    }
  }
  const go = (x, y, sp) => { fish.free = true; fish.cruise = false; fish.speed = sp || 40; fish.turn = 5; fish.tx = clamp(x, 24, 136); fish.ty = clamp(y, 36, FLOOR - 4);
    return () => Math.hypot(fish.x - fish.tx, fish.y - fish.ty) < 3; };
  const hold = () => { fish.tx = fish.x; fish.ty = fish.y; };

  function* gLookAtYou() {       // こっちを向いてにっこり
    hold(); fish.ex = { front: true }; yield 0.5;
    fish.ex = { front: true, eyes: 'sparkle', mouth: 'grin', blush: true, mark: 'heart' }; fish.sq = 0.8; sfx('pet'); yield 1.2;
    fish.ex = { front: true, eyes: 'closed', mouth: 'smile', blush: true }; yield 0.6;
  }
  function* gYawn() {            // 大あくび
    hold(); fish.ex = { eyes: 'closed', mouth: 'o' }; yield 0.3;
    sfx('yawn'); fish.ex = { eyes: 'closed', mouth: 'yawn', sy: 1.15, sx: 0.92 }; yield 0.9;
    fish.ex = { eyes: 'teary', mouth: 'smile' }; yield 0.5;
  }
  function* gHiccup() {          // しゃっくり
    hold(); const acc = g.gestureAccident('hiccup');
    for (let k = 0; k < 3; k++) {
      yield rnd(0.4, 0.8);
      if (acc && k === 2) return gestDeath(acc);
      sfx('hic'); fish.sq = 1; fish.ex = { eyes: 'surprised', mouth: 'o', mark: '!' };
      bubbles.push({ x: fish.x + fish.face * 20, y: fish.y, r: 2, vy: -16 });
      yield* tween(0.25, p => { fish.oy = -Math.round(Math.sin(p * Math.PI) * 5); });
      fish.ex = { mouth: 'wavy', brows: 'worried' };
    }
    yield 0.4;
  }
  function* gSneeze() {          // 汚れでくしゃみ
    hold(); fish.ex = { eyes: 'closed', mouth: 'o', sx: 0.9, sy: 1.1 }; yield 0.4;
    fish.ex = { eyes: 'closed', mouth: 'o', sx: 0.85, sy: 1.15 }; yield 0.35;
    sfx('sneeze'); fish.sq = 1.2; fish.ex = { eyes: 'closed', mouth: 'yawn', sx: 1.2, sy: 0.85 };
    for (let i = 0; i < 6; i++) bubbles.push({ x: fish.x + fish.face * 22, y: fish.y + rnd(-3, 3), r: 1 + (i % 2), vy: rnd(-20, -10) });
    { const acc = g.gestureAccident('sneeze'); if (acc) return gestDeath(acc); }
    const x0 = fish.x; yield* tween(0.3, p => { fish.x = x0 - fish.face * 10 * ease(p); });
    fish.ex = { eyes: 'side', brows: 'down', mouth: 'wavy' }; yield 0.8;
  }
  function* gBlowBubbles() {     // 泡をぷくぷく
    hold();
    for (let k = 0; k < 3; k++) {
      fish.ex = { mouth: 'o', cheeks: true }; yield 0.35;
      sfx('bubble'); fish.ex = { mouth: 'o' };
      bubbles.push({ x: fish.x + fish.face * 21, y: fish.y - 2, r: 2 + k, vy: -10 }); yield 0.3;
    }
    fish.ex = { eyes: 'closed', mouth: 'smile', mark: 'note' }; yield 0.7;
  }
  function* gTailChase() {       // 自分のしっぽを追いかける
    const cx = clamp(fish.x, 45, 115), cy = clamp(fish.y, 70, 170), r = 14, s0 = fish.face;
    yield go(cx + r, cy, 50);
    fish.free = false; fish.ex = { eyes: 'surprised', mouth: 'o' };
    yield* tween(2.2, p => {
      const a = p * Math.PI * 4;
      fish.x = cx + Math.cos(a) * r; fish.y = cy + Math.sin(a) * r * 0.6;
      fish.dir = fish.face = (Math.sin(a) * s0 > 0 ? -1 : 1);
    });
    { const acc = g.gestureAccident('tail'); if (acc) return gestDeath(acc); }
    fish.ex = { eyes: 'dizzy', mouth: 'wavy', mark: '?' }; fish.tx = fish.x; fish.ty = fish.y; fish.free = true; yield 1.0;
  }
  function* gBonk() {            // ガラスにごつん
    const side = fish.x < 80 ? -1 : 1;
    fish.ex = { eyes: 'closed', mouth: 'grin' };
    yield go(side < 0 ? 24 : 136, fish.y, 95);
    { const acc = g.gestureAccident('bonk'); if (acc) return gestDeath(acc, side); }
    sfx('bonk'); fish.ex = { eyes: 'x', mouth: 'o', sx: 0.75, sy: 1.15, mark: 'anger' };
    fx.push({ k: 'star', x: fish.x + side * 22, y: fish.y - 4, t: T, d: 0.6 });
    yield 0.35;
    fish.ex = { eyes: 'teary', brows: 'worried', mouth: 'wavy' };
    const x0 = fish.x; yield* tween(0.4, p => { fish.x = x0 - side * 14 * ease(p); });
    hold(); yield 0.9;
  }
  function* gNibblePlant() {     // 水草をかじる
    const right = Math.random() < 0.5;
    yield go(right ? 112 : 48, rnd(170, 190), 45);
    fish.dir = right ? 1 : -1; yield 0.3;
    for (let k = 0; k < 3; k++) { fish.ex = { mouth: 'o' }; yield 0.2; fish.ex = { cheeks: true }; fish.chewUntil = T + 0.5; sfx('mogu'); yield 0.55; }
    fish.ex = { eyes: 'closed', mouth: 'tongue', mark: 'note' }; yield 0.8;
  }
  function* gNap() {             // うたた寝
    yield go(clamp(fish.x, 50, 110), rnd(160, 185), 25);
    fish.ex = { eyes: 'closed', mouth: 0, wag: 0.25, mark: 'zzz' };
    for (let k = 0; k < 3; k++) { sfx('snore'); yield* tween(1.0, p => { fish.oy = Math.round(Math.sin(p * Math.PI * 2) * 1.5); fish.ex.sy = 1 + Math.sin(p * Math.PI * 2) * 0.05; }); }
    { const acc = g.gestureAccident('nap'); if (acc) return gestDeath(acc); }
    fish.oy = 0; sfx('boing'); fish.sq = 1.2; fish.ex = { eyes: 'surprised', mouth: 'o', mark: '!' };
    yield* tween(0.3, p => { fish.oy = -Math.round(Math.sin(p * Math.PI) * 8); });
    fish.ex = { eyes: 'side', mouth: 'wavy', blush: true }; yield 0.6;
  }
  function* gDance() {           // ごきげんダンス
    hold(); fish.free = false; sfx('dance');
    fish.ex = { eyes: 'closed', mouth: 'grin', mark: 'note', blush: true };
    yield* tween(1.6, p => { fish.oy = -Math.round(Math.abs(Math.sin(p * Math.PI * 4)) * 6); fish.rot = Math.sin(p * Math.PI * 4) * 0.25; if ((p * 8 | 0) % 2) fish.sq = 0.6; });
    fish.rot = 0; fish.oy = 0;
    fish.dir = -fish.dir; yield 0.3; fish.dir = -fish.dir; yield 0.3;
    fish.free = true; hold(); fish.ex = { eyes: 'sparkle', mouth: 'grin' }; yield 0.5;
  }
  function* gPeek() {            // ガラスに顔を近づけてのぞきこむ
    yield go(clamp(fish.x, 50, 110), clamp(fish.y, 80, 150), 35);
    fish.free = false; fish.ex = { front: true, eyes: 'surprised', mark: '?' };
    yield* tween(0.6, p => { fish.opts = { scale: Math.round((1 + 0.5 * ease(p)) * 20) / 20 }; });
    fish.ex = { front: true, eyes: 'normal', mouth: 'o' }; fish.blinkUntil = T + 0.15; yield 0.5;
    { const acc = g.gestureAccident('peek'); if (acc) return gestDeath(acc); }
    fish.blinkUntil = T + 0.15; yield 0.5;
    fish.ex = { front: true, eyes: 'sparkle', mouth: 'grin' }; yield 0.5;
    yield* tween(0.5, p => { fish.opts = { scale: Math.round((1.5 - 0.5 * ease(p)) * 20) / 20 }; });
    fish.opts = {}; fish.free = true; hold();
  }
  function* gShowOff() {         // ドヤっと宙返り
    hold(); fish.free = false; fish.ex = { eyes: 'smug', brows: 'up', mouth: 'smile' }; yield 0.3;
    sfx('jump'); const y0 = fish.y, x0 = fish.x;
    yield* tween(0.9, p => { const a = p * Math.PI * 2; fish.rot = -fish.face * a; fish.x = x0 + fish.face * Math.sin(a) * 10; fish.y = y0 - (1 - Math.cos(a)) * 10; });
    fish.rot = 0; fish.x = x0; fish.y = y0; fish.sq = 1; fish.ex = { eyes: 'smug', brows: 'up', mouth: 'grin', mark: 'heart' };
    fish.free = true; hold(); yield 0.9;
  }
  const leftovers = () => pellets.filter(p => !p.mine && p.y >= EAT_Y && p.rot < 4.5);
  function* gLeftover() {        // 残っていた粒を、おなかに入るぶんだけ拾って食べる
    for (let k = 0; k < 9; k++) {
      const left = leftovers();
      if (!left.length || g.s.satiety + 1 > L.SATIETY_MAX) break;
      const p = left.sort((a, b) => Math.hypot(a.x - fish.x, a.y - fish.y) - Math.hypot(b.x - fish.x, b.y - fish.y))[0];
      p.mine = true; p.left = true; const t0 = T;
      fish.free = true; fish.cruise = false; fish.speed = 55; fish.turn = 8; fish.eyes = 'wide';
      yield () => {
        if (!pellets.includes(p)) return true;
        const side = p.x - 20 < 26 ? -1 : p.x + 20 > 134 ? 1 : (p.x > fish.x ? 1 : -1);
        if (Math.abs(fish.x - (p.x - side * 20)) < 10) fish.dir = side;
        fish.tx = clamp(p.x - side * 18, 25, 135); fish.ty = clamp(p.y - MOUTH_DY, 35, FLOOR + 2);
        if (T - t0 > 4) { p.x += (mouthX() - p.x) * 0.3; p.y += (mouthY() - p.y) * 0.3; }
        return Math.abs(mouthX() - p.x) < 8 && Math.abs(mouthY() - p.y) < 8;
      };
      if (!pellets.includes(p)) continue;
      pellets.splice(pellets.indexOf(p), 1);
      fish.mouth = 'o'; sfx('eat'); fish.sq = 1; fish.eatT = T; fish.eyes = 'normal';
      const e = g.eatPellet();
      yield 0.08; fish.mouth = 0; fish.chewUntil = T + 0.5; setTimeoutT(() => sfx('mogu'), 0.05);
      if (e && e.poop) poops.push({ x: fish.x - fish.dir * 24, y: fish.y + 4, vy: 8 });
      yield 0.55;
    }
    fish.eyes = 'normal';
  }

  // ---------------- 途中死 ----------------
  const DEATH_LOOK = {
    instant: { flip: true }, poison: { flip: true, palette: 'poison' }, frozen: { frozen: true }, flower: { flower: true },
    burnt: { burnt: true }, shock: { flip: true, spark: true }, overpolished: { white: true, flip: true }, dizzy: { flip: true },
  };
  // ---------------- 突然死の演出（予兆 → 本番 → 反応 → 余韻） ----------------
  // 死に際の手描きコマを0から最後のポーズまで送る（溜めの3コマはゆっくり）
  const stageNow = () => { const gg = g.s.gauge / L.GAUGE_MAX; return gg < 0.36 ? 1 : gg < 0.72 ? 2 : 3; };
  // v20: 手で番号を指定するコマ（中割りつき）。f はキーの番号（小数なら中割り）
  function dfr(k, f) { const D = S.DEATH_FRAMES && S.DEATH_FRAMES[k], sub = (D && D.sub) || 1; return { k, f: Math.max(0, Math.min(D ? D.hold : 999, Math.round(f * sub))) }; }
  function dieAt(id, p) {   // 演出の進み p(0〜1) に合わせて、死に際のコマを選ぶ（小物の動きと同時に使う）
    const DF = S.DEATH_FRAMES && S.DEATH_FRAMES[id]; if (!DF) return;
    fish.ex = {}; fish.rollF = null; fish.die = { k: id, f: Math.max(0, Math.min(DF.hold, Math.floor(p * (DF.hold + 1)))) };
  }
  function* dieTo(id, slow) {
    const DF = S.DEATH_FRAMES && S.DEATH_FRAMES[id];
    if (!DF || !fish.vis) return;
    try { S.prewarmDeath && S.prewarmDeath(id, { color: fish.color, stage: stageNow() }); } catch (e) {}
    fish.ex = {}; fish.rollF = null; fish.ox = fish.oy = 0; fish.rot = 0; fish.turnP = 0;
    const sub = DF.sub || 1;   // v17: 中割りつき（1コマを sub に分けて同じ長さで送る）
    const y0 = fish.y;
    for (let f = 0; f <= DF.hold; f++) {
      // 砂山が出るキー5までに、そのふもとへ泳ぎ下りる。
      if (id === 'hermit') fish.y = y0 + (SAND_Y - 6 - y0) * ease(clamp((f / sub - 2) / 3, 0, 1));
      fish.die = { k: id, f };
      yield (Math.floor(f / sub) < 3 ? 0.2 : 0.125) / sub * (slow || 1);
    }
    fish.die = null;
  }
  function* suddenDeath(id, already) {
    mode = 'dead'; A.setSong(null); queued = null;
    fish.free = false; fish.vx = fish.vy = 0;
    const anim = DEATH_ANIM[id];
    if (anim) { yield* anim(); }
    else { if (!already) { yield* dieTo(id); sfx('death'); } fish.eyes = 'x'; fish.opts = Object.assign({ variant: id }, DEATH_LOOK[id] || { flip: true }); }
    return yield* deathSettle(id);
  }
  // 死に方の演出：手描きコマ（dieTo）に、音と小さな効果を重ねる
  const DEATH_ANIM = {
    *instant() {             // ぽちゃん→きょとん→裏返る→ぷくっと泡
      fish.ex = { eyes: 'normal', mouth: 'smile' }; yield 0.35;
      fish.blinkUntil = T + 0.15; yield 0.3;
      setTimeoutT(() => sfx('death'), 0.85);
      yield* dieTo('instant');
      fish.opts = { variant: 'instant', flip: true }; fish.eyes = 'x';
      bubbles.push({ x: mouthX(), y: fish.y, r: 3, vy: -12 }); sfx('bubble');
    },
    *poison() {              // ごっくん→色がじわじわ変わる→ぶるぶる→ドクロ→裏返る
      sfx('gulp');
      setTimeoutT(() => { for (let i = 0; i < 6; i++) fx.push({ k: 'skull', x: fish.x + rnd(-10, 10), y: fish.y - 10, t: T + i * 0.12, d: 1.2 }); sfx('death'); }, 1.475);
      yield* dieTo('poison');
      fish.opts = { variant: 'poison', flip: true, palette: 'poison', fumes: true }; fish.eyes = 'x';
    },
    *frozen() {              // ぶるぶる震え、霜がまとわりついて、ピキーン
      sfx('blink');
      for (let i = 0; i < 10; i++) fx.push({ k: 'frost', x: fish.x + rnd(-20, 20), y: fish.y + rnd(-10, 10), t: T + i * 0.08, d: 0.6 });
      setTimeoutT(() => { fx.push({ k: 'flash', t: T, d: 0.12 }); sfx('pop'); A.tone(2400, 0.4, 'sine', 0.2, 0, 0.5); }, 1.475);
      yield* dieTo('frozen');
      fish.opts = { variant: 'frozen', frozen: true }; fish.eyes = 'wide'; fish.sq = 1.2;
      yield 0.4;
    },
    *flower() {              // ほっぺの中で芽が出て、頭から花が咲く
      sfx('gulp');
      for (let k = 0; k < 4; k++) setTimeoutT(() => sfx('blink'), 0.6 + k * 0.25);
      setTimeoutT(() => { for (let i = 0; i < 8; i++) fx.push({ k: 'petal', x: fish.x + rnd(-6, 6), y: fish.y - 16, t: T + i * 0.08, d: 1.6, vx: rnd(-14, 14) }); sfx('pet'); }, 1.475);
      yield* dieTo('flower');
      fish.eyes = 'x'; fish.opts = { variant: 'flower', flower: true };
    },
    *burnt() {               // ほっぺが真っ赤→湯気→火を吹いて反動で後ろへ→黒焦げ
      sfx('gulp');
      for (let i = 0; i < 6; i++) fx.push({ k: 'steam', x: fish.x - fish.face * 6, y: fish.y - 14, t: T + 0.3 + i * 0.1, d: 0.8 });
      setTimeoutT(() => { sfx('zap'); fx.push({ k: 'fire', x: mouthX(), y: mouthY(), t: T, d: 1.0, dir: fish.face }); }, 0.975);
      yield* dieTo('burnt');
      fish.opts = { variant: 'burnt', burnt: true, smoke: true }; fish.eyes = 'x'; sfx('death');
      const x0 = fish.x; yield* tween(0.4, p => { fish.x = x0 - fish.face * 12 * ease(p); });
    },
    *shock() {               // ビリビリ：骨が透けて点滅、画面もピカピカ
      sfx('zap');
      for (const tt of [0.725, 0.8, 0.975, 1.05]) setTimeoutT(() => { fx.push({ k: 'flash', t: T, d: 0.04 }); sfx('zap'); }, tt);
      yield* dieTo('shock');
      fish.opts = { variant: 'shock', flip: true, spark: true, smoke: true }; fish.eyes = 'x'; sfx('death');
    },
    *overpolished() {        // v23.2：真っ白になったら、ピカーッ（絵はそのまま）
      for (let i = 0; i < 10; i++) fx.push({ k: 'star', x: fish.x + rnd(-20, 20), y: fish.y + rnd(-12, 12), t: T + i * 0.06, d: 0.5 });
      fx.push({ k: 'text', s: 'ピカーッ', x: 80, y: Math.max(40, fish.y - 30), t: T, d: 1.4, c: '#fff27a', big: true }); fx.push({ k: 'flash', t: T, d: 0.1 }); A.tone(2200, 0.5, 'sine', 0.15, 0, 1.2);
      yield 1.0; fish.eyes = 'x';
    },
    *dizzy() { yield* dieTo('dizzy'); fish.eyes = 'x'; fish.opts = { variant: 'dizzy', flip: true }; },
  };

  // 浮く／沈むまで漂い、網を待つ
  function* deathSettle(id, stay) {
    feeding = false; mode = 'dead'; A.setSong(null); queued = null; causeId = id;
    if (id !== 'netted') { try { g.die(id); g.save && g.save(); } catch (e) {} }   // v17: 死んだことも保存（開き直しで生き返らない）
    const c = cause(id);
    if (fish.vis && stay) {
      yield 0.8;
    } else if (fish.vis) {
      if (id !== 'dizzy' && id !== 'overpolished' && !fish.opts.frozen && !fish.opts.burnt && !fish.opts.zen) fish.eyes = 'x';
      bubbles.push({ x: fish.x, y: fish.y - 6, r: 2, vy: -10 });
      const sink = c.float === 'sink', ty = sink ? SAND_Y - (id === 'meteor' ? 5 : 10) : WATER + 10;
      const y0 = fish.y, x0 = fish.x, r0 = fish.rot || 0;
      // ゆらゆら揺れながら、ゆっくり傾いて浮く／沈む
      yield* tween(sink ? 2.0 : 2.6, p => { fish.y = y0 + (ty - y0) * (sink ? p * p : ease(p)); fish.x = x0 + Math.sin(p * 5) * 4 * (1 - p * 0.5); fish.rot = r0 + Math.sin(p * 4) * 0.12; });
      fish.rot = 0;
      if (sink) { sfx('koton'); fish.sq = 1.2; sandPuff(fish.x, SAND_Y, 10); yield* tween(0.4, p => { fish.oy = -Math.round(Math.sin(p * Math.PI) * 4); }); fish.oy = 0; }
      else { splashAt(fish.x, 12); for (let k = 0; k < 2; k++) yield* tween(0.5, p => { fish.oy = Math.round(Math.sin(p * Math.PI * 2) * 1.5); }); fish.oy = 0; }
    } else if (eyeball) {
      const y0 = eyeball.y;
      yield* tween(1.5, p => { eyeball.y = y0 + (FLOOR + 2 - y0) * p * p; });
      sfx('koton');
    } else {
      yield 1.0;
    }
    netReady = true;
    if (netQueued) { netQueued = false; collect(); }
    return 'dead';
  }

  // 網で回収 → 札
  function collect() {
    netReady = false;
    startTask(function* () {
      // 何をすくうか
      let target = null;
      if (fish.vis && fish.hermit) target = { x: fish.x, y: FLOOR + 4 };
      else if (fish.vis && causeId !== 'loach') target = fish;
      else if (eyeball) target = eyeball;
      else if (feather) target = feather;
      else if (duck) target = duck;
      if (causeId === 'squashed' && visitor && visitor.look) { yield 0.4; showCard(causeId); return; }   // v23 P5：カメが乗ったまま札へ
      if (target && target.y < WATER + 4) target.y = WATER + 6;   // 浮いているものも水面ですくう
      const buried = causeId === 'loach';
      yield* scoop(target, { x: buried ? fish.x : 80, y: buried ? FLOOR : 130, big: causeId === 'giant' || fish.opts.scale >= 2 });
      fish.vis = false; eyeball = feather = duck = null; net = null;
      yield 0.3;
      showCard(causeId);
    });
  }

  // v19：水槽のかざりの段（図鑑3つごとに1段）
  let demoDecor = null, decorNews = 0;
  function decorLv() { if (demoDecor != null) return demoDecor; const z = g.s.zukan; return Math.min(S.DECOR_MAX || 16, Math.floor((z ? z.size : 0) / 3)); }
  function showCard(id) {
    mode = 'card'; cardT = T;
    const z = g.s.zukan; const has = z && (z.has ? z.has(id) : z.includes(id));
    cardNew = !has;
    const lv0 = decorLv();
    try { g.record(id); } catch (e) {}
    if (decorLv() > lv0) decorNews = decorLv();
    try { g.save && g.save(); } catch (e) {}
    sfx('card'); A.setSong('card');
  }

  // ---------------- 満タン時の結末 ----------------
  // 変身後の完成形（交互表示でもこの姿を見せる）
  const END_LOOK = {
    bug: {}, duck: {}, moss: { moss: true }, split: {}, skeleton: { skeleton: true },
    babies: { mom: true },
    golden: { palette: 'gold', shine: true }, hermit: {},
  };
  function startEnding() {
    mode = 'ending'; busy = true; queued = null; thought = null;
    const id = g.decideEnding();
    try { g.save && g.save(); } catch (e) {}
    playEnding(id);
  }
  function resumeEnding(id) {
    resetScene(); fish.vis = true; fish.x = 80; fish.y = 110; mode = 'ending'; busy = true;
    fish.color = g.s.color || 'orange';
    playEnding(id);
  }
  function playEnding(id) {
    causeId = id; A.setSong(null);
    startTask(function* () {
      sfx('fanfare');
      yield* swimTo(80, 115, 45); fish.free = false; fish.dir = 1;
      yield 0.6;
      // 変身前 ⇄ 変身後をだんだん速く交互に見せ、変身後で止める
      const look = END_LOOK[id] || {};
      if (SEQ_END[id]) {   // v23 P5c：ユーザーの絵のコマ表で変身
        fish.dir = fish.face = -1; fish.turnP = 0; fish.opts = {}; fish.eyes = 'normal';
        yield* playSeq(id, SEQ_END[id]);
      } else if (id !== 'duck') {
        const beats = [0.55, 0.5, 0.42, 0.36, 0.3, 0.24, 0.19, 0.15];
        for (let k = 0; k < beats.length; k++) {
          const after = k % 2 === 1;
          applyLook(id, after, look);
          fx.push({ k: 'flash', t: T, d: 0.05 });
          sfx(after ? 'pet' : 'blink');
          yield beats[k];
        }
        // そのあと、手描きのコマで本当に変身していく
        applyLook(id, false, look);
        if (id === 'fishman') fish.legLen = Math.round(FLOOR + 4 - fish.y - 12);
        sfx('grow');
        yield* dieTo(id, 1.1);
        applyLook(id, true, look);
        fx.push({ k: 'flash', t: T, d: 0.12 }); sfx('fanfare');
        for (let i = 0; i < 10; i++) fx.push({ k: 'drop', x: fish.x, y: fish.y, vx: Math.cos(i * 0.63) * 40, vy: Math.sin(i * 0.63) * 40 - 20, t: T, d: 0.7 });
        yield 0.8;
      }
      yield* (ENDINGS[id] || ENDINGS.oldage)();
      // 網待ち
      netReady = true; mode = 'dead';
      if (netQueued) { netQueued = false; collect(); }
    });
  }
  // v23: ユーザーの絵で「変身後の姿」を出す結末
  const END_ASSET = { skeleton: 'skeleton' };
  // v23 P5c：コマ表で変身する結末と、変身にかける秒数・大きさ・動き
  const SEQ_END = { stone: { d: 3.2 }, oldage: { d: 3.4 }, overeat: { d: 3.2 }, split: { d: 3.4 }, dragon: { d: 3.4 }, fishman: { d: 3.6, y: () => SAND_Y - 36 }, giant: { d: 3.6, sc: 1.8 } };
  // コマ表を順に再生（コマが変わるたびに小さく弾む。となりのコマへ重ねてつなぐ）
  function* playSeq(name, o) {
    o = o || {};
    const bx = S.assetBox && S.assetBox(name); if (!bx) return;
    fish.asset = name; fish.assetScale = o.sc || 1; fish.assetFrame = 0;
    const n = bx.n, y0 = fish.y, y1 = o.y ? o.y() : y0;
    let last = 0; sfx('grow');
    yield* tween(o.d || 3.2, p => {
      const u = p * (n - 1), i = Math.floor(u), fr = u - i;
      fish.assetFrame = Math.min(n - 1, i + Math.max(0, Math.min(1, (fr - 0.55) / 0.45)));
      if (i !== last) { last = i; fish.sq = 0.7; sfx(i % 2 ? 'pet' : 'blink'); }
      fish.y = y0 + (y1 - y0) * ease(p);
    });
    fish.assetFrame = null;
    fx.push({ k: 'flash', t: T, d: 0.12 }); sfx('fanfare');
    for (let i = 0; i < 10; i++) fx.push({ k: 'drop', x: fish.x, y: fish.y, vx: Math.cos(i * 0.63) * 40, vy: Math.sin(i * 0.63) * 40 - 20, t: T, d: 0.7 });
    yield 0.8;
  }
  function applyLook(id, on, look) {
    fish.opts = on ? Object.assign({ variant: id }, look) : {};
    fish.asset = on && S.hasAsset && END_ASSET[id] && S.hasAsset(END_ASSET[id]) ? END_ASSET[id] : null;
    fish.hermit = on && id === 'hermit';
    fish.glitch = on && id === 'bug';
    fish.legLen = on && id === 'fishman' ? Math.round(FLOOR + 4 - fish.y - 12) : 0;
    fish.eyes = 'normal';
  }
  const ENDINGS = {
    *bug() {
      for (let k = 0; k < 8; k++) { sfx('pu'); puText = T + 0.5; yield 0.5; }
      // 網が来るまで続く（ループはupdate側で）
    },
    *duck() {
      // ブラシがどくと、アヒル
      brush = { x: 175, y: 30, a: 0 }; sparkle = true;
      const spots = [[80, 115], [60, 80], [100, 150]];
      for (const [sx, sy] of spots) {
        const bx0 = brush.x, by0 = brush.y;
        yield* tween(0.3, p => { brush.x = bx0 + (sx - bx0) * p; brush.y = by0 + (sy - by0) * p; });
        for (let k = 0; k < 2; k++) { sfx('brush'); yield* tween(0.2, p => { brush.a = Math.sin(p * Math.PI * 2) * 8; }); }
        if (sx === 80) fish.vis = false;
      }
      const bx0 = brush.x, by0 = brush.y;
      yield* tween(0.5, p => { brush.x = bx0 + (180 - bx0) * p; brush.y = by0 - p * 60; });
      brush = null; fish.vis = false;
      duck = { x: 80, y: WATER - 4 }; sfx('quack');
      yield 2;
    },
    *moss() {
      for (let i = 0; i < 18; i++) fx.push({ k: 'spore', x: fish.x + rnd(-24, 24), y: fish.y + rnd(-14, 14), t: T + i * 0.05, d: 1.2 });
      for (let k = 0; k < 4; k++) { fish.eyes = 'sleepy'; sfx('blink'); yield 0.3; fish.eyes = 'normal'; yield 0.6; }
      fish.eyes = 'x'; sfx('death'); yield* settleY(FLOOR - 6, 2);
    },
    *stone() {
      fish.eyes = 'normal';
      yield* tween(0.7, p => { fish.y = 115 + (FLOOR - 4 - 115) * p * p; });
      sfx('koton'); yield 0.5;
      for (let k = 0; k < 5; k++) { fish.dir = -fish.dir; yield 0.6; }
    },
    *split() {
      // 頭がふえすぎて…もがく
      for (let k = 0; k < 3; k++) { sfx('puff'); yield* tween(0.45, p => { fish.ox = Math.round(Math.sin(p * 40)); }); yield 0.25; }
      fish.ox = 0; yield 0.7;
      fish.eyes = 'x'; sfx('death'); yield 0.6;
      yield* settleY(WATER + 12, 2);
    },
    *skeleton() {
      fx.push({ k: 'text', s: 'ぐぅ〜…', x: fish.x, y: fish.y - 26, t: T, d: 1.6, c: '#ffffff' }); A.tone(70, 0.8, 'sawtooth', 0.12, 0, 0.7);
      yield 1.2; fish.eyes = 'x'; sfx('death'); yield* settleY(WATER + 10, 2.5);
    },
    *overeat() {
      for (let k = 0; k < 4; k++) { fish.ox = (k % 2) * 2; yield 0.4; }
      fx.push({ k: 'text', s: 'げぷっ', x: mouthX(), y: fish.y - 16, t: T, d: 1.2, c: '#ffffff' }); bubbles.push({ x: mouthX(), y: fish.y, r: 5, vy: -14 }); sfx('bubble'); yield 0.6;
      fish.ox = 0; fish.eyes = 'x'; sfx('death'); yield* settleY(FLOOR - 10, 2.5);
    },

    *fishman() {
      // 脚がぐんぐん伸びて底に立つ → 水の中で溺れる
      fish.eyes = 'wide';
      for (let k = 0; k < 6; k++) { fish.oy = (k % 2) * -2; sfx('splash'); bubbles.push({ x: fish.x + fish.dir * 20, y: fish.y - 4, r: 2, vy: -14 }); yield 0.35; }
      fish.oy = 0; fish.eyes = 'x'; sfx('death'); yield 1.5;
    },
    *oldage() {
      fish.eyes = 'sleepy'; fx.push({ k: 'text', s: 'ありがとう…', x: fish.x, y: fish.y - 28, t: T, d: 2.2, c: '#ffffff' }); yield 1.8;
      soul = { x: fish.x, y: fish.y - 6 }; const sx0 = soul.x, sy0 = soul.y;
      setTimeoutT(() => { soul = null; }, 2.6);
      yield* tween(0.1, () => {}); (function () { const t0 = T; timers.push([T + 0.01, function f() { if (!soul) return; const p = Math.min(1, (T - t0) / 2.6); soul.y = sy0 - p * 90; soul.x = sx0 + Math.sin(p * 8) * 5; if (p < 1) timers.push([T + 0.03, f]); }]); })(); fish.eyes = 'x'; sfx('death');
      fish.opts = Object.assign({}, fish.opts, { flip: true });
      yield* settleY(WATER + 10, 3);
    },
  };
  Object.assign(ENDINGS, {
    *babies() {             // ぽこぽこ子どもが生まれて、水槽じゅうを泳ぎまわる
      fish.eyes = 'surprised'; sfx('pop');
      for (let i = 0; i < 14; i++) {
        babies.push({ x: fish.x + rnd(-6, 6), y: fish.y + rnd(-4, 4), vx: rnd(-40, 40), vy: rnd(-30, 30), color: FISH_COLORS[(Math.random() * FISH_COLORS.length) | 0], dir: 1 });
        if (i % 3 === 0) sfx('pop'); fish.sq = 0.6; yield 0.12;
      }
      fx.push({ k: 'text', s: 'こんなに…！', x: fish.x, y: fish.y - 30, t: T, d: 1.6, c: '#ffffff' });
      fish.eyes = 'dizzy'; yield 1.8; fish.eyes = 'x'; sfx('death');
      yield* settleY(WATER + 10, 2.5);
    },
    *dragon() {             // 竜になって天へ
      sfx('grow');
      yield* tween(1.6, p => { fish.oy = Math.round(Math.sin(p * Math.PI * 4) * 3); });
      fish.oy = 0; sfx('fanfare');
      const x0 = fish.x, y0 = fish.y;
      for (let i = 0; i < 12; i++) fx.push({ k: 'drop', x: fish.x, y: fish.y, vx: Math.cos(i) * 50, vy: Math.sin(i) * 50 - 20, t: T, d: 0.9 });
      yield* tween(2.6, p => { fish.y = y0 + (-80 - y0) * ease(p); fish.x = x0 + Math.sin(p * 10) * 14; });
      fish.vis = false; yield 0.8;
    },
    *golden() {             // 純金になって、ずしん
      fish.eyes = 'closed'; sfx('fanfare');
      for (let i = 0; i < 14; i++) fx.push({ k: 'star', x: fish.x + rnd(-24, 24), y: fish.y + rnd(-14, 14), t: T + i * 0.08, d: 0.6 });
      yield 1.4; fish.eyes = 'x';
      yield* settleY(FLOOR - 8, 0.7); sfx('koton'); fish.sq = 1; yield 1;
    },
    *hermit() {             // 人間不信で砂の中へ
      sfx('splash'); fish.x = 80;
      yield 3.5;
    },
    *giant() {
      fx.push({ k: 'text', s: 'ミシミシ…', x: 80, y: 40, t: T, d: 1.8, c: '#ffffff' });
      for (let k = 0; k < 4; k++) { fish.ox = (k % 2) * 2 - 1; sfx('koton'); yield 0.35; }   // ガラスにつかえてもがく
      fish.ox = 0; yield 1.2;
    },
  });

  function* settleY(ty, dur) { const y0 = fish.y; yield* tween(dur, p => { fish.y = y0 + (ty - y0) * ease(p); }); }

  // ---------------- 水面の波（ちゃぽん） ----------------
  const WN = W + 1, waveH = new Float32Array(WN), waveV = new Float32Array(WN);
  function splashAt(x, power) {
    x = Math.round(clamp(x, 0, W));
    // 水面に広がる波紋の輪（強さに応じて1〜3重）
    const rings = power >= 30 ? 3 : power >= 15 ? 2 : 1;
    for (let i = 0; i < rings; i++) fx.push({ k: 'ring', x, t: T + i * 0.18, d: 0.9 + power / 80, r: 8 + power * 0.5 });
    power *= 3;
    const r = Math.max(2, Math.round(power / 6));
    for (let i = -r; i <= r; i++) { const k = x + i; if (k >= 0 && k < WN) waveV[k] += power * (1 - Math.abs(i) / (r + 1)); }
  }
  function stepWaves(dt) {
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let s2 = 0; s2 < n; s2++) {
      for (let i = 0; i < WN; i++) {
        const l = waveH[i > 0 ? i - 1 : i], r = waveH[i < WN - 1 ? i + 1 : i];
        waveV[i] += (-25 * waveH[i] + 500 * (l + r - 2 * waveH[i])) * h;
        waveV[i] *= Math.exp(-h * 2.2);
      }
      for (let i = 0; i < WN; i++) waveH[i] = clamp(waveH[i] + waveV[i] * h, -6, 6);
    }
  }
  let skyCol = '#a8e6d8', waterCol = '#6fd3be';
  try {
    const oc = document.createElement('canvas'); oc.width = W; oc.height = H; const ox = oc.getContext('2d');
    S.drawTank(ox, 0, 0);
    const px = (x, y) => { const d = ox.getImageData(x, y, 1, 1).data; return 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')'; };
    skyCol = px(80, 6); waterCol = px(80, WATER + 6);
  } catch (e) {}
  function drawWaves() {
    for (let x = 0; x < W; x++) {
      const hh = Math.round(waveH[x]);
      if (hh === 0) continue;
      if (hh > 0) { ctx.fillStyle = skyCol; ctx.fillRect(x, WATER - 1, 1, hh + 1); }   // 水面が下がった所
      else { ctx.fillStyle = waterCol; ctx.fillRect(x, WATER + hh, 1, -hh + 1); }     // 盛り上がった所
      ctx.fillStyle = '#eafff9'; ctx.fillRect(x, WATER + hh, 1, 1);
      if (Math.abs(hh) >= 3) { ctx.fillStyle = 'rgba(234,255,249,0.6)'; ctx.fillRect(x, WATER + hh + 2, 1, 1); }
    }
  }
  // 水面をまたいだものを見張って、ちゃぽん
  const crossers = [
    ['finger', () => finger && { x: finger.x, y: finger.y }, 26],
    ['net', () => net && { x: net.x, y: net.y + 10 }, 34],
    ['paw', () => paw && { x: paw.x, y: paw.y }, 30],
    ['nozzle', () => nozzle && { x: nozzle.x, y: nozzle.y }, 22],
    ['fish', () => fish.vis && !fish.inNet && { x: fish.x, y: fish.y }, 40],
  ];
  const lastY = {};
  function watchSurface() {
    for (const [k, get, pw] of crossers) {
      const o = get();
      if (!o) { lastY[k] = null; continue; }
      const prev = lastY[k];
      if (prev != null && (prev < WATER) !== (o.y < WATER)) {
        const down = o.y >= WATER;
        splashAt(o.x, down ? pw : pw * 0.7);
        for (let i = 0; i < (down ? 7 : 5); i++) fx.push({ k: 'drop', x: o.x + rnd(-8, 8), y: WATER, vx: rnd(-30, 30), vy: rnd(-55, -25), t: T, d: 0.7 });
        sfx(pw >= 30 ? 'splash' : 'chapon');
      }
      lastY[k] = o.y;
    }
  }

  // ---------------- 効果 ----------------
  function splash(x, y) { splashAt(x, 30); for (let i = 0; i < 6; i++) fx.push({ k: 'drop', x: x + rnd(-6, 6), y, vx: rnd(-20, 20), vy: rnd(-40, -20), t: T, d: 0.6 }); }
  function popFx(x, y) { for (let i = 0; i < 4; i++) fx.push({ k: 'drop', x, y, vx: rnd(-15, 15), vy: rnd(-15, 15), t: T, d: 0.3 }); }

  // ---------------- 更新 ----------------
  function update(dt) {
    if (mode === 'zukan' && zukanFrom && zukanFrom !== 'card') return;   // 図鑑を見ている間はゲームを止める
    T += dt; dtNow = dt;
    stepTask(dt);

    // 魚の移動
    if (fish.free && fish.vis) {
      const dx = fish.tx - fish.x, dy = fish.ty - fish.y, d = Math.hypot(dx, dy);
      // 目標へ向けてなめらかに舵を切る（カーブを描いて泳ぐ）
      const burst = fish.cruise ? 0.7 + 0.6 * Math.max(0, Math.sin(T * 3.4)) : 1;   // ひれで蹴って、すーっと進む
      const want = d > 0.3 ? fish.speed * burst * Math.min(1, d / (fish.cruise ? 4 : 14)) : 0;
      const dvx = d > 0.3 ? dx / d * want : 0, dvy = d > 0.3 ? dy / d * want : 0;
      const k = Math.min(1, dt * fish.turn);
      fish.vx += (dvx - fish.vx) * k; fish.vy += (dvy - fish.vy) * k;
      if (d < 2.5 && !fish.cruise) { fish.vx *= 0.8; fish.vy *= 0.8; }
      fish.x += fish.vx * dt; fish.y += fish.vy * dt;
      fish.x = clamp(fish.x, 22, 138); fish.y = clamp(fish.y, 32, FLOOR + 2);
      if (fish.vx > 4) fish.dir = 1; else if (fish.vx < -4) fish.dir = -1;
    }
    // 振り返り：いったん正面を向いてから反対を向く
    const tdur = fish.cruise ? 0.32 : 0.24;
    if (fish.dir !== fish.face) { fish.turnP += dt / tdur; if (fish.turnP >= 1) { fish.face = fish.dir; fish.turnP = 0; fish.sq = Math.max(fish.sq, 0.5); } }
    else if (fish.turnP > 0) fish.turnP = Math.max(0, fish.turnP - dt / tdur);
    // つぶし・伸ばし：速いほど伸び、止まる・食べる・振り返るとむにっと縮む
    const spd = Math.hypot(fish.vx, fish.vy);
    fish.sq *= Math.exp(-dt * 7);
    const st = Math.min(0.16, spd / 550);
    const wob = Math.sin(T * 22) * fish.sq;
    fish.sx = (1 + st - 0.16 * fish.sq + 0.04 * wob) * (fish.ex.sx || 1);
    fish.sy = (1 - st * 0.6 + 0.14 * fish.sq - 0.04 * wob) * (fish.ex.sy || 1);
    // まばたき
    fish.swimPh += dt * (3 + Math.hypot(fish.vx, fish.vy) / 10);   // 泳ぐ速さでコマが速く回る
    if (T > fish.blinkAt) { fish.blinkUntil = T + 0.2; fish.blinkAt = T + rnd(1.8, 4.5) + (Math.random() < 0.2 ? -1.6 : 0); }
    for (let i = timers.length - 1; i >= 0; i--) if (T >= timers[i][0]) { const f = timers[i][1]; timers.splice(i, 1); f(); }

    const idle = mode === 'play' && !busy && fish.vis;
    if (!idle && gest) endGesture();
    if (!idle) gestAt = Math.max(gestAt, T + rnd(3, 6));   // 世話のあとはしばらく泳ぐ（v20: 5〜9→3〜6秒）
    updateOmen(); updateMiniInvite();
    if (idle && !gest && !mgInvite && T > leftAt && g.s.satiety + 1 <= L.SATIETY_MAX && leftovers().length) {   // 残った粒は、おなかがすいたら拾いに行く
      leftAt = T + 3; fish.wps = []; gest = { it: gLeftover(), wait: 0, cond: null };
    }
    if (idle && !gest && !mgInvite && T > gestAt && !(fish.wps && fish.wps.length)) {
      gestAt = T + rnd(10, 18);   // v18: 14〜26→10〜18秒
      if (T < restUntil || Math.random() < 0.65) startGesture();   // v20: ひと休み中は必ず
    }
    if (idle && gest) stepGesture(dt);
    if (restUntil > T && T - restStart > REST_MIN && !gest && !visitor) restUntil = 0;   // v20: しぐさが終わったら早めに休憩おわり
    if (mode !== 'play') restUntil = 0;
    if (idle && !gest) {
      // ふらふら泳ぐ
      const near = Math.hypot(fish.tx - fish.x, fish.ty - fish.y) < 10;
      if (near && fish.cruise && fish.wps.length) { const w = fish.wps.shift(); fish.tx = w[0]; fish.ty = w[1]; }
      else if (T > wanderAt || (near && fish.cruise)) {
        fish.cruise = true; fish.turn = 2.6; fish.wps = [];
        const far = () => fish.x < 80 ? rnd(95, 136) : rnd(24, 65);
        const pick = (w) => { let x = Math.random() * w.reduce((a, b) => a + b[0], 0); for (const [n, f] of w) { if ((x -= n) < 0) return f; } return w[0][1]; };
        const startWps = () => { const w = fish.wps.shift(); fish.tx = w[0]; fish.ty = w[1]; };
        pick([
          [4, () => {   // 水槽じゅうを周遊
            fish.speed = rnd(45, 70); fish.tx = far(); fish.ty = clamp(fish.y + rnd(-100, 100), 40, 205); wanderAt = T + 3.5; }],
          [3, () => {   // ダッシュで端から端へ
            fish.speed = rnd(85, 110); fish.turn = 4.5; fish.tx = far(); fish.ty = rnd(40, 200); wanderAt = T + 2.5; }],
          [2, () => {   // ジグザグ
            fish.speed = rnd(55, 70); fish.turn = 5;
            const dir = fish.x < 80 ? 1 : -1, y0 = clamp(fish.y, 70, 170);
            for (let k = 1; k <= 4; k++) fish.wps.push([clamp(fish.x + dir * k * 24, 24, 136), y0 + (k % 2 ? -26 : 26)]);
            startWps(); wanderAt = T + 5; }],
          [1.5, () => { // 大きな輪
            fish.speed = rnd(50, 65); fish.turn = 5;
            const cx = clamp(fish.x, 50, 110), cy = clamp(fish.y, 80, 160), rr = 28, s0 = Math.random() < 0.5 ? 1 : -1;
            for (let k = 1; k <= 8; k++) { const a = s0 * k * Math.PI / 4; fish.wps.push([cx + Math.sin(a) * rr, cy - (1 - Math.cos(a)) * rr * 0.8 + rr * 0.4]); }
            startWps(); wanderAt = T + 6; }],
          [1.5, () => { // 8の字
            fish.speed = rnd(45, 60); fish.turn = 4.5;
            const cy = clamp(fish.y, 80, 160);
            for (const [x, y] of [[50, cy - 22], [30, cy], [50, cy + 22], [80, cy], [110, cy - 22], [130, cy], [110, cy + 22], [80, cy]]) fish.wps.push([x, y]);
            startWps(); wanderAt = T + 8; }],
          [1.5, () => { // ガラスぞいに上下へすべる
            const x = fish.x < 80 ? 26 : 134, up = fish.y > 120;
            fish.speed = rnd(40, 55); fish.turn = 4;
            fish.wps.push([x, fish.y], [x, up ? 50 : 195], [clamp(x + (x < 80 ? 30 : -30), 24, 136), up ? 60 : 185]);
            startWps(); wanderAt = T + 6; }],
          [1.5, () => { // すーっと沈んで、ぐんと浮く
            fish.speed = 18; fish.turn = 2; const x = fish.x;
            fish.tx = clamp(x + fish.dir * 10, 24, 136); fish.ty = clamp(fish.y + 50, 40, 190);
            setTimeoutT(() => { if (fish.cruise && !gest && !busy) { fish.speed = 95; fish.turn = 5; fish.wps = []; fish.tx = clamp(fish.x + fish.dir * 30, 24, 136); fish.ty = 50; fish.sq = 0.8; } }, 3.2);
            wanderAt = T + 5; }],
          [1.5, () => { // 止まって、きょろきょろ見回す
            fish.cruise = false; fish.speed = 12; fish.tx = fish.x; fish.ty = fish.y; wanderAt = T + 2.2;
            for (const t of [0.5, 1.2, 1.8]) setTimeoutT(() => { if (!gest && !busy && mode === 'play') fish.dir = -fish.dir; }, t); }],
          [1.5, () => { // 泡を追いかける
            const b = bubbles.filter(q => q.amb && q.y > 80).sort((a, c) => Math.abs(a.x - fish.x) - Math.abs(c.x - fish.x))[0];
            if (!b) { fish.speed = rnd(45, 70); fish.tx = far(); fish.ty = rnd(50, 190); wanderAt = T + 3; return; }
            fish.speed = 55; fish.turn = 6;
            for (let k = 0; k < 4; k++) fish.wps.push([clamp(b.x - fish.dir * 16, 24, 136), clamp(b.y - 20 - k * 18, 40, 200)]);
            startWps(); wanderAt = T + 4; }],
          [1, () => {   // 水面をのぞく
            fish.speed = rnd(45, 60); fish.tx = rnd(30, 130); fish.ty = rnd(34, 42); wanderAt = T + 3; }],
          [1, () => {   // 底をつつく
            fish.speed = rnd(40, 55); fish.tx = rnd(30, 130); fish.ty = rnd(192, FLOOR - 6); wanderAt = T + 3; }],
          [0.6, () => { // ほんの少し休む
            fish.cruise = false; fish.speed = 14; fish.tx = clamp(fish.x + rnd(-6, 6), 25, 135); fish.ty = clamp(fish.y + rnd(-4, 4), 40, 200); wanderAt = T + rnd(0.6, 1.2); }],
        ])();
      }
      fish.mouth = (Math.sin(T * 3) > 0.6) ? 1 : 0;
      moodFace();
    }
    if (idle) {
      const s = g.s;
      // 吹き出しは「いま欲しいもの」だけを出す（ランプの枠・ゲージの印と同じ）。切実なほどひんぱんに
      if (s.want !== lastWant) { lastWant = s.want; hintAt = T; }
      if (T > hintAt) {
        const urgent = (s.wantScore || 0) >= 0.7;
        hintAt = T + (urgent ? rnd(2.5, 3.5) : rnd(5, 8));
        const icon = s.want === 'none' ? (Math.random() < 0.4 ? 'note' : null) : WANT_ICON[s.want];
        if (icon && !(thought && thought.until > T)) thought = { icon, until: T + (urgent ? 2 : 2.5), urgent };
      }
    }
    try { g.tick(dt, idle); } catch (e) {}
    if (mode === 'play' && !mini && A.song && A.song !== 'card') {   // 状態で曲を切りかえる（数秒ごとに判定）
      if (!(T < songCheckAt)) {
        songCheckAt = T + 3;
        const st = g.s, pinch = st.satiety <= 2 || st.dirt >= 4 || st.stress >= 85;
        const good = !pinch && st.stress <= 15 && st.satiety >= 8 && st.dirt <= 1;
        A.setSong(pinch ? 'tense' : good ? 'happy' : 'main');
      }
    }
    stepWaves(dt); watchSurface();
    updateVisitor(dt, idle);
    for (const b of babies) { b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < 14 || b.x > 146) b.vx *= -1; if (b.y < 34 || b.y > FLOOR - 4) b.vy *= -1; if (Math.random() < dt * 0.8) { b.vx = rnd(-40, 40); b.vy = rnd(-25, 25); } b.dir = b.vx >= 0 ? 1 : -1; }
    updateEvent();

    // 餌
    for (let i = pellets.length - 1; i >= 0; i--) {
      const p = pellets[i];
      if (p.y < FLOOR + 4) { const py0 = p.y; p.y += p.vy * dt; if (py0 < WATER && p.y >= WATER) { splashAt(p.x, 5); if (Math.random() < 0.5) sfx('chapon'); } p.ph += dt * 3; p.x += Math.sin(p.ph) * 4 * dt; if (p.y >= FLOOR + 4) p.y = FLOOR + 4; }
      else if (!p.mine) { p.rot += dt; if (p.rot >= 5) { pellets.splice(i, 1); try { g.pelletRotted(); } catch (e) {} } }
    }
    for (const q of poops) { if (q.y < FLOOR + 5) q.y = Math.min(FLOOR + 5, q.y + q.vy * dt); }
    for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; b.y += b.vy * dt; if (!b.pinned) b.x += Math.sin(T * 3 + i) * 3 * dt; if (b.y < WATER || (b.until && T > b.until)) { if (b.until && b.y >= WATER) fx.push({ k: 'pop', x: b.x, y: b.y, t: T, d: 0.25 }); bubbles.splice(i, 1); } }
    // エアストーンからの泡の柱
    if ((mode === 'play' || mode === 'dead' || mode === 'ending') && Math.random() < dt * 7) bubbles.push({ x: AIR_X + rnd(-2, 2), y: SAND_Y - 1, r: Math.random() < 0.3 ? 2 : 1, vy: rnd(-34, -24), amb: true, air: true });
    // 環境の泡
    if (Math.random() < dt * 0.6 && mode !== 'card' && mode !== 'zukan') bubbles.push({ x: rnd(20, 150), y: FLOOR, r: Math.random() < 0.5 ? 1 : 2, vy: rnd(-12, -6), amb: true });
    fx = fx.filter(f => T - f.t < f.d + 0.01 || T < f.t);
    if (mode === 'dead' && causeId === 'bug' && fish.vis && Math.random() < dt * 2) { sfx('pu'); puText = T + 0.4; }
  }

  // ---------------- 描画 ----------------
  function netDraw(fn) {   // v22: net.scale=2 で大きな網（ふちも袋も柄も2倍）
    const o = { t: T, tilt: net.tilt || 0, sag: net.sag || 0, wet: net.wet, drip: net.drip };
    if ((net.scale || 1) === 1) { fn(ctx, Math.round(net.x), Math.round(net.y), o); return; }
    ctx.save(); ctx.translate(Math.round(net.x), Math.round(net.y)); ctx.scale(net.scale, net.scale); fn(ctx, 0, 0, o); ctx.restore();
  }
  function clipWipes() {
    ctx.beginPath();
    for (const w of wipes) { ctx.moveTo(w.x + w.r, w.y); ctx.arc(w.x, w.y, Math.max(0.1, w.r), 0, Math.PI * 2); }
    ctx.clip();
  }
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    if (mode === 'title' || mode === 'boot') { renderTitle(); return; }
    const dirt = g.s.dirt | 0;
    if (shakeAmp > 0) ctx.setTransform(1, 0, 0, 1, Math.round(rnd(-shakeAmp, shakeAmp)), Math.round(rnd(-shakeAmp, shakeAmp)));
    S.drawTank(ctx, T, dirt);
    if (wipes && wipes.length) {
      ctx.save(); clipWipes(); S.drawTank(ctx, T, wipeDirt); ctx.restore();
    }
    if (S.drawDecor) S.drawDecor(ctx, decorLv(), T);   // v19: 図鑑3つごとに豪華に
    drawWaves();
    if (sparkle) drawSparkles();
    for (const tr of treasures) drawTreasure(tr.kind, Math.round(tr.x), Math.round(tr.y));
    drawAirStone();
    for (const q of poops) S.drawPoop(ctx, Math.round(q.x), Math.round(q.y));
    for (const p of pellets) {
      if (p.rot > 0 && ((p.rot * 4) | 0) % 2 === 1 && p.rot > 3) continue; // 消えかけて点滅
      ctx.globalAlpha = 1 - Math.min(1, p.rot / 5) * 0.6;
      S.drawPellet(ctx, Math.round(p.x), Math.round(p.y), p.type);
      ctx.globalAlpha = 1;
    }
    for (const b of bubbles) S.drawBubble(ctx, Math.round(b.x), Math.round(b.y), b.r);
    drawVisitorBack();
    if (crater && S.drawCrater) S.drawCrater(ctx, crater.x, crater.y, T);
    for (const b of babies) if (S.drawBaby) S.drawBaby(ctx, Math.round(b.x), Math.round(b.y), T, { color: b.color, dir: b.dir });
    for (const p2 of ghostPellets) S.drawPellet(ctx, Math.round(p2.x), Math.round(p2.y), 'normal', T);
    if (mpel) { if (mpel.follow) { mpel.x = mpel.follow.x; mpel.y = mpel.follow.y; } if (S.drawMysteryPellet) S.drawMysteryPellet(ctx, Math.round(mpel.x), Math.round(mpel.y), T); }
    if (hoop && S.drawFingerHoop) S.drawFingerHoop(ctx, Math.round(hoop.x), Math.round(hoop.y), T);
    if (mini && mini.sweep) drawMiniNet(S.drawNetBack);
    if (net && S.drawNetBack) netDraw(S.drawNetBack);
    if (eyeball) S.drawEyeball(ctx, Math.round(eyeball.x), Math.round(eyeball.y));
    if (xo.decoy) for (const q of xo.decoy) S.drawPellet(ctx, Math.round(q.x), Math.round(q.y), 'normal', T);
    if (xo.ices) for (const c of xo.ices) S.drawIce(ctx, Math.round(c.x), Math.round(c.y), Math.round(c.s));
    // 掃除ホースの吸い口・手品の帽子用。砂への潜り込みは手前の砂で隠す。
    if (xo.clipY != null) { ctx.save(); ctx.beginPath(); ctx.rect(0, xo.clipY, W, H); ctx.clip(); drawFishEnt(); ctx.restore(); } else drawFishEnt();
    drawXo();
    if (bigBubble) S.drawBubble(ctx, Math.round(bigBubble.x), Math.round(bigBubble.y), Math.round(bigBubble.r));
    if (duck) S.drawDuck(ctx, Math.round(duck.x), Math.round(duck.y + Math.sin(T * 2) * 1), T);
    if (feather) S.drawFeather(ctx, Math.round(feather.x), Math.round(feather.y), feather.rot);
    if (crack && S.drawCrack) S.drawCrack(ctx, crack.x, crack.y, crack.size);
    if (smear && S.drawSmear) S.drawSmear(ctx, smear.x, smear.y, smear.size);
    for (const sc of scales) if (T >= sc.t && S.drawScale) { const tt = T - sc.t; S.drawScale(ctx, Math.round(sc.x + sc.vx * tt + Math.sin(tt * 4) * 3), Math.round(Math.min(FLOOR + 6, sc.y + sc.vy * tt)), sc.rot + tt * 3); }
    if (soul && S.drawSoul) S.drawSoul(ctx, Math.round(soul.x), Math.round(soul.y), T);
    if (carry) drawTreasure(carry, Math.round(mouthX() + fish.face * 2), Math.round(fish.y + 3));
    drawVisitorFront();
    S.drawSandFront(ctx, T, dirt, crater);
    if (dirt >= 3 && wipes && wipes.length) {
      ctx.save(); clipWipes(); S.drawSandFront(ctx, T, wipeDirt, crater); ctx.restore();
    }
    if (finger) drawFinger(Math.round(finger.x), Math.round(finger.y));
    if (ball && S.drawBall) S.drawBall(ctx, Math.round(ball.x), Math.round(ball.y), T);
    if (birdObj && S.drawBird) S.drawBird(ctx, Math.round(birdObj.x), Math.round(birdObj.y), T, birdObj.dir, birdObj.carry);
    if (paw) S.drawCatPaw(ctx, Math.round(paw.x), Math.round(paw.y), { fish: !!paw.fish, t: T });
    if (nozzle) S.drawNozzle(ctx, Math.round(nozzle.x), Math.round(nozzle.y), { suck: true, tail: !fish.vis, t: T });
    if (brush) { ctx.save(); ctx.translate(Math.round(brush.a), 0); S.drawBrush(ctx, Math.round(brush.x), Math.round(brush.y), T); ctx.restore(); }
    if (mini && mini.sweep) drawMiniNet(S.drawNetFront);
    if (net) {
      if (S.drawNetFront) netDraw(S.drawNetFront);
      else S.drawNet(ctx, Math.round(net.x), Math.round(net.y), (net.sag || 0) > 0.5);
    }
    if (ufo) { if (ufo.beam && S.drawBeam) S.drawBeam(ctx, Math.round(ufo.x), Math.round(ufo.y + 8), ufo.beam, T); if (S.drawUFO) S.drawUFO(ctx, Math.round(ufo.x), Math.round(ufo.y), T, {}); }
    if (chef && S.drawChefHand) S.drawChefHand(ctx, Math.round(chef.x), Math.round(chef.y), T, { knife: chef.knife });
    if (meteor && S.drawMeteor) S.drawMeteor(ctx, Math.round(meteor.x), Math.round(meteor.y), T, meteor.size || 10);
    if (ghost && S.drawGhost) { ctx.globalAlpha = Math.max(0, Math.min(1, ghost.a)); S.drawGhost(ctx, Math.round(ghost.x), Math.round(ghost.y + Math.sin(T * 3) * 2), T, { angry: ghost.angry }); ctx.globalAlpha = 1; }
    if (catObj && S.drawCatShadow) { ctx.globalAlpha = Math.max(0, Math.min(1, catObj.a)); S.drawCatShadow(ctx, Math.round(catObj.x), Math.round(catObj.y), T, { angry: catObj.angry, flee: catObj.flee }); ctx.globalAlpha = 1; }
    drawEventLayer();
    for (const f of fx) drawFx(f);
    if (mode === 'play') drawMini(ctx);
    if (puText > T && fish.vis) { ctx.fillStyle = '#1d4d4a'; ctx.font = '10px sans-serif'; ctx.fillText('ぷ', Math.round(fish.x + rnd(14, 22)), Math.round(fish.y - 16)); }
    if (thought && thought.until > T && fish.vis && (mode === 'play') && !ev) {   // v22: イベント中は大きなボタンのアイコンと重なるので出さない
      // v19：吹き出しは魚の向いている側の斜め上。しっぽの泡が魚の頭を指す。壁に近いときは反対側、上に余裕がないときは横へ
      let side = fish.face || 1;
      if (fish.x + side * 26 > 138 || fish.x + side * 26 < 22) side = -side;
      const room = fish.y - 40 >= 34;
      const tx = clamp(fish.x + side * (room ? 24 : 38), 22, 138), ty = room ? fish.y - 40 : clamp(fish.y - 12, 34, 200);
      S.drawThought(ctx, Math.round(tx + (thought.urgent ? Math.sin(T * 30) : 0)), Math.round(ty), thought.icon, side < 0);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    S.drawGauge(ctx, g.s.gauge, L.GAUGE_MAX);
    if (mode !== 'title' && mode !== 'boot') {
      drawStatus(); drawLamps();
      if (g.s.fishNo) { ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff8e0'; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(g.s.fishNo + '匹目', 63 + dx, 13 + dy); ctx.fillStyle = '#1d4d4a'; ctx.fillText(g.s.fishNo + '匹目', 63, 13); }
    }
    let icon = null;
    if (mode === 'play' && queued) icon = BTN_ICON[queued];
    if (mode === 'dead' && (netReady || netQueued) && ((T * 2) | 0) % 2 === 0) icon = 'net';
    if (mode === 'dead' && netQueued) icon = 'net';
    if (causeId === 'duck' && (mode === 'dead') && !netReady && !netQueued) icon = 'duck';
    S.drawIconSlot(ctx, icon);

    if (mode === 'card' || mode === 'zukan') {
      ctx.fillStyle = 'rgba(16,40,40,0.45)'; ctx.fillRect(0, 0, W, H);
      if (mode === 'card') {
        { const ci = L.CAUSES.findIndex(c => c.id === causeId); S.drawCard(ctx, cause(causeId), cardNew, { no: ci + 1, total: L.CAUSES.length, color: fish.color }); }
        const pe = g.persona && g.persona();
        ctx.fillStyle = '#fff8e0'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(g.s.fishNo + '匹目' + (pe ? '　' + pe.name + 'な金魚でした' : ''), 80, 34); ctx.textAlign = 'left';
        if (cardHint.t !== cardT) {   // まだ見ていない結末への手がかりを1つ
          const z = g.s.zukan, seen = id => z && z.has && z.has(id);
          const rest = L.CAUSES.filter(c => c.kind === 'ending' && c.id !== 'bug' && !seen(c.id));
          const pick = rest.length ? rest[Math.random() * rest.length | 0] : null;
          cardHint = { t: cardT, s: pick ? 'ヒント：' + HINTS[pick.id] + '…？' : '結末をぜんぶ見つけた！' };
        }
        if (T - cardT >= 1.5) {
          ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = '#1d4d4a'; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(cardHint.s, 80 + dx, 202 + dy);
          ctx.fillStyle = '#ffd86a'; ctx.fillText(cardHint.s, 80, 202); ctx.textAlign = 'left';
        }
        if (T - cardT >= 4 && ((T * 1.5) | 0) % 2 === 0) {
          ctx.fillStyle = '#fff8e0'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('網:図鑑  ほか:つぎの魚', 80, 211); ctx.textAlign = 'left';
        }
      } else {
        const z = g.s.zukan; const ids = z ? (z.has ? [...z] : z) : [];
        S.drawZukan(ctx, ids, L.CAUSES, zukanCur);
        drawZukanUI(ids);
      }
    }
  }

  function drawXo() {   // v16 の小物（魚より手前）
    const r = Math.round;
    if (xo.heat > 0) { ctx.fillStyle = 'rgba(255,128,96,' + xo.heat.toFixed(3) + ')'; ctx.fillRect(0, WATER, W, FLOOR + 12 - WATER); }
    if (xo.sun) S.drawSun(ctx, r(xo.sun.x), r(xo.sun.y), T, { sweat: true });
    if (xo.thermo != null) S.drawThermo(ctx, 146, 118, xo.thermo);
    if (xo.star) S.drawFishStar(ctx, r(xo.star.x), r(xo.star.y), T, { scale: xo.star.s });
    if (xo.hook) S.drawHook(ctx, r(xo.hook.x), r(xo.hook.y), { worm: xo.hook.worm, t: T });
    if (xo.vac) S.drawVacuum(ctx, r(xo.vac.x + (xo.vac.ox || 0)), r(xo.vac.y), { t: T, suck: xo.vac.suck, bulge: xo.vac.bulge, bulgeCol: xo.vac.bulgeCol, top: -2 });
    if (xo.hat) S.drawTopHat(ctx, r(xo.hat.x), r(xo.hat.y), { rot: xo.hat.rot });
    if (xo.glove) S.drawGlove(ctx, r(xo.glove.x), r(xo.glove.y), {});
    if (xo.wand) S.drawGlove(ctx, r(xo.wand.x), r(xo.wand.y), { wand: xo.wand.a, spark: xo.wand.spark });
    if (xo.photo) S.drawPolaroid(ctx, r(xo.photo.x), r(xo.photo.y), { color: xo.photo.color, stage: xo.photo.stage, photoEyes: xo.photo.eyes, photoMouth: xo.photo.mouth, sx: xo.photo.sx });
    if (xo.camera) S.drawCamera(ctx, r(xo.camera.x), r(xo.camera.y), { t: T, flash: xo.camera.flash, rec: xo.camera.rec });
  }
  // 人の指（上から差しこまれる。水に入った部分は少し水色がかる）
  const mixc = (a, b, t) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = sh => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
    return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')'; };
  const FING = { skin: '#f7c6a3', shade: '#e0a07a', nail: '#ffe8de', nailEdge: '#e9b7a4', crease: '#c98466', line: '#1d4d4a' };
  const FING_W = {}; for (const k in FING) FING_W[k] = k === 'line' ? FING[k] : mixc(FING[k], '#5fcfb8', 0.2);
  function drawFinger(x, tip) {
    for (let y = Math.max(-2, tip - 90); y <= tip + 1; y++) {
      if (y < 0) continue;
      const c = y > WATER ? FING_W : FING;
      const d = tip - y;
      if (d < 0) { ctx.fillStyle = c.line; ctx.fillRect(x - 3, y, 7, 1); continue; }
      const w = d <= 0 ? 4 : d <= 1 ? 5 : d <= 3 ? 6 : 7;      // 指先は丸く、幅15px
      ctx.fillStyle = c.line; ctx.fillRect(x - w - 1, y, 2 * w + 3, 1);
      ctx.fillStyle = c.skin; ctx.fillRect(x - w, y, 2 * w + 1, 1);
      ctx.fillStyle = c.shade; ctx.fillRect(x + w - 2, y, 3, 1);
      if (d >= 3 && d <= 12) { ctx.fillStyle = d === 12 ? c.nailEdge : c.nail; ctx.fillRect(x - 4, y, 8, 1); ctx.fillStyle = c.nailEdge; ctx.fillRect(x - 5, y, 1, 1); ctx.fillRect(x + 4, y, 1, 1); }
      if (d === 22 || d === 40) { ctx.fillStyle = c.crease; ctx.fillRect(x - 4, y, 8, 1); }
      if (d === 23 || d === 41) { ctx.fillStyle = c.crease; ctx.fillRect(x - 3, y, 6, 1); }
    }
    // 水面のゆらぎ
    if (tip > WATER) { ctx.fillStyle = '#e8fff8'; ctx.fillRect(x - 10, WATER, 3, 1); ctx.fillRect(x + 8, WATER, 3, 1); }
  }

  // ---------------- ミニゲーム ----------------
  const MG_N = 10, MG_Y = 168, PUFF_STOP = 1.2, JUMP_TIME = 0.82;
  const MINI_GAMES = {
    mini: { title: 'ぱくっとキャッチ', lines: ['口に来たら おす！'] },
    'mini-puff': { title: 'ふくらめ！チキンレース', lines: [
      'どのボタンでも おすと ふくらむ',
      'はじけるまえに 1.2秒 おさずに まつ',
      'はじける線に ちかいほど 高ランク！',
    ] },
    'mini-net': { title: 'よけろ！網', lines: [
      'どのボタンでも ジャンプ！',
      'よこからくる 網を よけよう',
      '10回きたら おわり。3回つかまっても おわり',
    ] },
  };
  const MINI_KEYS = Object.keys(MINI_GAMES);
  const miniRank = n => n >= 10 ? 'S' : n >= 8 ? 'A' : n >= 5 ? 'B' : 'C';

  function updateMiniInvite() {
    if (mgInvite && T > mgInvite.until) { mgInvite = null; thought = null; }
    if (mode !== 'play' || (cfg.demo && !demoInvite) || busy || ev || gest || visitor || mgInvite || !fish.vis || T < mgAt || g.s.gauge < 2) return;
    mgAt = T + rnd(35, 50);
    mgInvite = { kind: demoInvite || MINI_KEYS[Math.random() * MINI_KEYS.length | 0], until: T + MG_WAIT };
    thought = { icon: 'heart', until: T + MG_WAIT }; sfx('hint'); fish.sq = 1;
  }
  function startMini() {
    const kind = mgInvite.kind; stat('m:' + kind);
    mgInvite = null; thought = null;
    if (gest) endGesture();
    busy = true; queued = null; fish.cruise = false; fish.wps = [];
    const m = mini = { kind, n: 0, hits: 0, perfect: 0, phase: 'intro',
      say(s, c) { this.msg = { s, c, t: T }; } };
    startTask(function* () {
      yield* actMini(m);
      busy = false; mgAt = T + rnd(45, 60);
      try { g.save && g.save(); } catch (e) {}
      afterAction();
    });
  }
  function miniPress() {
    const m = mini;
    if (!m || m.phase !== 'play') return;
    if (m.kind === 'mini-puff') {
      if (m.pressure >= 1) return;
      m.pressure = Math.min(1, m.pressure + 0.135);
      m.lastPress = T; sfx('bubble');
      return;
    }
    if (m.kind === 'mini-net') {
      if (m.sweep && !m.sweep.caught && T - m.jumpAt >= JUMP_TIME) {
        m.jumpAt = T; sfx('jump');
      }
      return;
    }
    if (!m.cur || m.cur.done) return;
    const c = m.cur, d = c.y - mouthY();
    c.done = true; fish.eatT = T; fish.mouth = 'o'; setTimeoutT(() => { fish.mouth = 0; }, 0.12);
    if (c.bad) { m.say('ぺっ！', '#b06bff'); sfx('nope'); fish.ex = { eyes: 'x', mouth: 'tongue' }; g.addStress(4); c.gone = true; return; }
    if (Math.abs(d) <= 4) { m.hits++; m.perfect++; m.say('パーフェクト！', '#ffd23a'); sfx('fanfare'); c.gone = true; fish.chewUntil = T + 0.4; fish.ex = { eyes: 'happy', blush: true };
      for (let i = 0; i < 6; i++) fx.push({ k: 'star', x: mouthX() + rnd(-8, 8), y: fish.y + rnd(-8, 6), t: T, d: 0.5 }); }
    else if (Math.abs(d) <= 10) { m.hits++; m.say('ナイス！', '#ff9a3c'); sfx('eat'); c.gone = true; fish.chewUntil = T + 0.4; fish.ex = { eyes: 'closed' }; }
    else { m.say(d < 0 ? 'はやい！' : 'おそい！', '#9fd8ff'); sfx('buzz'); fish.ex = { eyes: 'teary', brows: 'worried' }; }
  }
  function* actMini(m) {
    A.setSong('happy');
    fish.ex = {}; fish.look = null;
    yield* swimTo(m.kind === 'mini' ? 58 : 80, MG_Y, 60);
    fish.free = false; fish.dir = 1; fish.vx = fish.vy = 0;
    fish.x = fish.tx; fish.y = fish.ty;
    if (m.kind === 'mini') {
      m.say('ぱくっとキャッチ！', '#ffffff'); yield 1;
      m.say(MINI_GAMES.mini.lines[0], '#ffffff'); yield 1;
    } else {
      m.showIntro = true; yield 4;
    }
    m.phase = 'play';
    const rank = yield* (m.kind === 'mini-puff' ? playMiniPuff(m)
      : m.kind === 'mini-net' ? playMiniNet(m) : playMiniCatch(m));
    m.phase = 'result'; m.rank = rank;
    let up = 0;
    if (rank === 'S') up = g.bonus(2); else if (rank === 'A' || rank === 'B') up = g.bonus(1);
    if (rank !== 'C') g.addStress(-15);
    m.reward = up > 0 ? 'ゲージ +' + up : rank === 'C' ? 'ざんねん…' : 'ストレス ダウン';
    sfx(rank === 'C' ? 'nope' : 'fanfare');
    fish.ex = rank === 'C' ? { eyes: 'teary', mouth: 'pout' } : { eyes: 'happy', blush: true, mark: 'heart' };
    if (rank === 'S') {
      fx.push({ k: 'rainbow', t: T, d: 1.0 });
      if (m.kind === 'mini') yield* gShowOff();
    }
    yield 2.4;
    fish.ex = {}; fish.free = true; mini = null; A.setSong('main');
  }

  function* playMiniCatch(m) {
    for (let i = 0; i < MG_N; i++) {
      m.n = i + 1; fish.ex = { eyes: 'wide', mouth: 'o' }; fish.look = 'up';
      const bad = i >= 2 && Math.random() < 0.22;
      const c = { x: mouthX(), y: WATER - 4, vy: 62 + i * 8 + rnd(0, 10), bad, done: false, gone: false };
      m.cur = c;
      yield () => {
        c.x = mouthX();
        if (!c.gone) c.y += c.vy * dtNow;
        if (!c.done && c.y > mouthY() + 11) {   // 通りすぎた
          c.done = true;
          if (c.bad) { m.hits++; m.say('よけた！', '#7fe08a'); sfx('pet'); fish.ex = { eyes: 'smug' }; }
          else { m.say('おそい！', '#9fd8ff'); sfx('buzz'); fish.ex = { eyes: 'teary', brows: 'worried' }; }
        }
        return c.done && (c.gone || c.y > FLOOR + 6);
      };
      m.cur = null; fish.look = null;
      yield 0.45;
    }
    return miniRank(m.hits);
  }

  function* playMiniPuff(m) {
    m.pressure = 0;
    m.lastPress = -Infinity;
    const until = T + 10;
    let last = T;
    yield () => {
      if (m.pressure >= 1) return true;
      m.pressure = Math.max(0, m.pressure - (T - last) * 0.035);
      last = T;
      fish.opts.balloon = m.pressure >= 0.28;
      fish.opts.scale = 1 + Math.round(m.pressure * 16) / 20;
      fish.ex = m.pressure >= 0.8 ? { eyes: 'wide', mouth: 'wavy', sweat: true } : { mouth: 'o' };
      return T >= until || (m.lastPress > -Infinity && T - m.lastPress >= PUFF_STOP);
    };
    const burst = m.pressure >= 1;
    m.score = burst ? 'はじけちゃった！' : 'ふくらみ ' + Math.floor(m.pressure * 100) + '%';
    if (burst) {
      m.phase = 'burst'; m.say('ぽんっ！', '#ffd86a'); sfx('pop'); popFx(fish.x, fish.y);
      fish.ex = { eyes: 'x', mouth: 'tongue' };
      yield* tween(1, p => {
        fish.x = 80 + Math.sin(p * 15) * 62 * (1 - p);
        fish.y = MG_Y - Math.abs(Math.sin(p * 12)) * 60 * (1 - p);
        fish.rot = Math.sin(p * 18) * (1 - p) * 1.5;
        fish.opts.balloon = p < 0.65;
        fish.opts.scale = Math.round((1.8 - p * 0.8) * 20) / 20;
      });
    }
    fish.opts = {}; fish.rot = 0;
    return burst ? 'C' : m.pressure >= 0.88 ? 'S' : m.pressure >= 0.72 ? 'A' : m.pressure >= 0.48 ? 'B' : 'C';
  }

  function* playMiniNet(m) {
    m.misses = 0; m.jumpAt = -Infinity;
    const reach = 28;
    for (let i = 0; i < MG_N && m.misses < 3; i++) {
      m.n = i + 1;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const speed = 125 + i * 18;
      const sweep = m.sweep = { dir, speed, x: 80 - dir * 108, caught: false };
      const start = T;
      yield () => {
        sweep.x = 80 + dir * ((T - start) * speed - 108);
        const p = clamp((T - m.jumpAt) / JUMP_TIME, 0, 1);
        fish.y = MG_Y - Math.sin(Math.PI * p) * 55;
        sweep.caught = Math.abs(sweep.x - 80) <= reach && fish.y > MG_Y - 25;
        return sweep.caught || (sweep.x - 80) * dir >= 108;
      };
      if (sweep.caught) {
        m.misses++; m.say('ぎゃっ！', '#ffa7c1'); sfx('buzz');
        fish.ex = { eyes: 'x', mouth: 'o' };
        fish.x = sweep.x; fish.y = MG_Y + 5; fish.opts.scale = 0.8;
        yield 0.24;
        const x = fish.x;
        sfx('jump');
        yield* tween(0.32, p => {
          fish.x = x + (80 - x) * p;
          fish.y = MG_Y + 5 * (1 - p) - Math.sin(p * Math.PI) * 33;
          sweep.x += dir * speed * dtNow;
        });
      } else {
        m.hits++; m.say('よけた！', '#7fe08a'); sfx('pet');
      }
      m.sweep = null; m.jumpAt = -Infinity;
      fish.x = 80; fish.y = MG_Y; fish.opts = {}; fish.ex = {};
      yield 0.35;
    }
    m.score = 'よけた ' + m.hits + ' / ' + MG_N;
    return miniRank(m.hits);
  }

  function drawMiniNet(draw) {
    const sweep = mini.sweep;
    ctx.save();
    ctx.translate(Math.round(sweep.x), MG_Y - 6);
    ctx.scale(-sweep.dir, 1);
    draw(ctx, 0, 0, { t: T, sag: sweep.caught ? 1 : 0.45, tilt: -0.18, handle: 100 });
    ctx.restore();
  }

  function drawMini(ctx) {
    if (mgInvite) {
      const blink = ((T * 3) | 0) % 2 === 0;
      const Y = fish.y < 120 ? 150 : 70;   // 魚と重ならない側に出す
      ctx.fillStyle = '#1d4d4a'; ctx.fillRect(19, Y - 1, 122, 28);
      ctx.fillStyle = blink ? '#ffe9a8' : '#fff8e0'; ctx.fillRect(20, Y, 120, 26);
      ctx.fillStyle = '#ff7aa8'; ctx.fillRect(20, Y, 120, 10);
      ctx.textAlign = 'center'; ctx.font = 'bold 8px sans-serif'; ctx.fillStyle = '#ffffff'; ctx.fillText(MINI_GAMES[mgInvite.kind].title, 80, Y + 8);
      ctx.fillStyle = '#5a2e2e'; ctx.font = 'bold 8px sans-serif'; ctx.fillText('ふれあい で あそぶ', 80, Y + 21);
      const w = Math.max(0, (mgInvite.until - T) / MG_WAIT);
      ctx.fillStyle = '#ff7aa8'; ctx.fillRect(20, Y + 26, Math.round(120 * w), 2);
      ctx.textAlign = 'left';
    }
    const m = mini; if (!m) return;
    if (m.cur && !m.cur.gone) {
      // 口の高さのガイド
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(Math.round(m.cur.x) - 9, Math.round(mouthY()) - 4, 18, 1); ctx.fillRect(Math.round(m.cur.x) - 9, Math.round(mouthY()) + 5, 18, 1);
      const px = Math.round(m.cur.x), py = Math.round(m.cur.y);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(px - 1, py - 14, 2, 10);   // 落ちてくる線
      ctx.save(); ctx.translate(px, py); ctx.scale(2, 2); S.drawPellet(ctx, 0, 0, m.cur.bad ? 'poison' : 'normal', T); ctx.restore();
    }
    ctx.textAlign = 'center';
    if (m.phase === 'intro' && m.showIntro) {
      const game = MINI_GAMES[m.kind];
      ctx.fillStyle = '#2a1408'; ctx.fillRect(5, 55, 150, 26 + game.lines.length * 12);
      ctx.fillStyle = '#fff8e0'; ctx.fillRect(7, 57, 146, 22 + game.lines.length * 12);
      ctx.fillStyle = '#5a2e2e'; ctx.font = 'bold 10px sans-serif'; ctx.fillText(game.title, 80, 70);
      ctx.font = 'bold 7px sans-serif';
      game.lines.forEach((line, i) => ctx.fillText(line, 80, 85 + 12 * i, 138));
    } else if (m.phase === 'play' || m.phase === 'burst' || (m.phase === 'result' && m.kind === 'mini')) {
      ctx.font = 'bold 8px sans-serif'; ctx.fillStyle = '#1d4d4a'; ctx.fillRect(44, 44, 72, 12);
      ctx.fillStyle = '#fff8e0'; ctx.fillText(m.kind === 'mini-puff' ? 'ふくらみ' : m.kind === 'mini-net'
        ? m.n + ' / ' + MG_N + '　ミス ' + m.misses + ' / 3' : 'キャッチ ' + m.hits + ' / ' + MG_N, 80, 53);
      if (m.kind === 'mini-puff') {
        ctx.fillStyle = '#2a1408'; ctx.fillRect(15, 61, 130, 12);
        ctx.fillStyle = '#fff8e0'; ctx.fillRect(17, 63, 126, 8);
        ctx.fillStyle = m.pressure >= 0.8 ? '#f6a63b' : '#ff7aa8';
        ctx.fillRect(17, 63, Math.round(123 * m.pressure), 8);
        ctx.fillStyle = '#b53350'; ctx.fillRect(140, 59, 3, 16);
        ctx.fillText('はじける線 ▲', 117, 84);
      }
    }
    if (m.msg && T - m.msg.t < 0.9) {
      const rise = (T - m.msg.t) * 10;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#1d4d4a'; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(m.msg.s, 80 + dx, 100 - rise + dy);
      ctx.fillStyle = m.msg.c; ctx.fillText(m.msg.s, 80, 100 - rise);
    }
    if (m.phase === 'result') {
      ctx.fillStyle = '#1d4d4a'; ctx.fillRect(13, 69, 134, 52);
      ctx.fillStyle = '#fff8e0'; ctx.fillRect(14, 70, 132, 50);
      ctx.font = 'bold 8px sans-serif'; ctx.fillStyle = '#5a2e2e'; ctx.fillText(m.score || 'けっか ' + m.hits + ' / ' + MG_N + (m.perfect ? '（パーフェクト ' + m.perfect + '）' : ''), 80, 82);
      ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = { S: '#ffb000', A: '#ff5aa0', B: '#4ab8ff', C: '#8a8a8a' }[m.rank]; ctx.fillText(m.rank, 80, 104);
      ctx.font = 'bold 8px sans-serif'; ctx.fillStyle = '#5a2e2e'; ctx.fillText(m.reward, 80, 116);
    }
    ctx.textAlign = 'left';
  }

  // ---------------- 結末の予感（今の育て方だと、どこへ向かいそうか） ----------------
  const OMEN = {
    duck: 'くちばしが むずむず…', dragon: 'ひげが のびてきた…？', babies: 'おなかが ぽかぽか…',
    golden: 'うろこが ぴかっ…', moss: 'からだが ぬるぬる…', stone: 'からだが かたくなる…', split: 'あたまが もうひとつ…？',
    hermit: 'からに こもりたい…', skeleton: 'ほねが すけてる…？', giant: 'どんどん おおきく…',
    overeat: 'おなかが はちきれそう', fishman: '足が はえそう…？',
    oldage: 'のんびり ながいき しそう',
  };
  function updateOmen() {
    if (mode !== 'play' || cfg.demo || !fish.vis) return;
    const gg = g.s.gauge;
    if (gg !== omenG) { if (gg > omenG && (gg === 5 || gg === 9 || gg === 12)) omenAt = Math.min(omenAt, T + 1.6); omenG = gg; }
    if (busy || ev || T < omenAt || gg < 4) return;
    omenAt = T + rnd(35, 50);
    const id = g.leaning ? g.leaning() : null;
    if (!id || !OMEN[id]) return;
    fx.push({ k: 'omen', s: OMEN[id], t: T, d: 3.2 });
    sfx('hint');
  }

  // ---------------- 図鑑の操作表示・くわしく ----------------
  const HINTS = {
    instant: '入ってきた瞬間…運しだい', poison: '怪しい粒も食べちゃう', frozen: '冷たいものを食べると', flower: '種を飲みこむと', burnt: '熱いものを食べると', shock: 'ビリビリする粒',
    sucked: '汚れた水槽の掃除で', overpolished: 'きれいなガラスを磨きすぎると', cat: '撫でる手が…', bird: 'ジャンプやロケットで水面を飛び出すと', dizzy: '回りすぎると', bubblegone: '大きな泡', floataway: 'ふくらみすぎ',
    netted: '網を入れすぎると', stuck: 'ガラスにごつん', hiccupfly: 'しゃっくり', knotted: 'しっぽ追いか輪くぐり', flat: 'くしゃみの反動', nowake: 'うたた寝か死んだふり',
    jumpout: '地震で網が間に合わない', abducted: '空から光が…', sushi: '板前さんの手', meteor: '空から燃える石', possessed: 'おばけが来たら',
    haircut: 'カニに近づきすぎると', squashed: 'カメのしっぽを引っぱると', loach: 'ドジョウのまねをすると', catfish: 'ナマズがあくびをしたら', kicked: 'エビを追いかけすぎると',
    fished: '釣り針にミミズ', boiled: '暑い日には', photo: 'カメラを向けられたら', pigeon: '手品師の帽子', star: 'ロケットの芸',
    bug: 'ボタンをすごく連打', duck: 'よく磨いて、ほとんどかまわない', moss: '汚れをためたまま', stone: 'ピリピリさせたまま', split: 'ほとんどふれあわない',
    hermit: '網を何度も入れる', skeleton: '腹ぺこのまま', giant: 'ほどよくふれあうか、もっともっと食べさせる', overeat: 'たくさん食べさせる', fishman: 'とにかくふれあいすぎる',
    oldage: 'ふつうに育てる', dragon: 'バランスよく育てる', golden: '金の粒を食べて、無理をさせない', babies: '3つの世話を順番にそろえる',
  };
  function fitText(t, w) { if (ctx.measureText(t).width <= w) return t; while (t.length > 1 && ctx.measureText(t + '…').width > w) t = t.slice(0, -1); return t + '…'; }
  function drawZukanUI(ids) {
    const has = id => ids.includes(id);
    const c = L.CAUSES[zukanCur];
    ctx.textAlign = 'center';
    if (zukanDetail && c) {
      ctx.fillStyle = 'rgba(16,40,40,0.55)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff8e0'; ctx.fillRect(12, 70, 136, 92); ctx.fillStyle = '#1d4d4a'; ctx.fillRect(12, 70, 136, 2); ctx.fillRect(12, 160, 136, 2); ctx.fillRect(12, 70, 2, 92); ctx.fillRect(146, 70, 2, 92);
      const found = has(c.id);
      if (found && S.drawCauseIcon) S.drawCauseIcon(ctx, 80, 100, c.id, 2, T);
      else { ctx.font = 'bold 26px sans-serif'; ctx.fillStyle = '#c9bfa6'; ctx.fillText('？', 80, 110); }
      ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#1d4d4a'; ctx.fillText((zukanCur + 1) + '. ' + (found ? c.name : '？？？'), 80, 138);
      ctx.font = '8px sans-serif'; ctx.fillStyle = '#4b6b68'; ctx.fillText((c.kind === 'ending' ? 'けつまつ' : 'しいん') + '　ヒント：' + (HINTS[c.id] || ''), 80, 152);
    }
    // 選んでいる死因のヒント（下の名前の枠の中）
    if (c) {   // 下の枠：見つけた死因は絵（動く）と名前ときっかけ、未発見は？？？とヒント
      const found = has(c.id), Y0 = 194;
      ctx.fillStyle = '#1d4d4a'; ctx.fillRect(9, Y0, 142, 34);
      ctx.fillStyle = '#fff8e0'; ctx.fillRect(10, Y0 + 1, 140, 32);
      ctx.textAlign = 'left';
      if (found) {
        ctx.fillStyle = '#bfe8df'; ctx.fillRect(12, Y0 + 3, 34, 28);
        ctx.save(); ctx.beginPath(); ctx.rect(12, Y0 + 3, 34, 28); ctx.clip();
        if (S.drawCauseIcon) S.drawCauseIcon(ctx, 29, Y0 + 18, c.id, 1, T); ctx.restore();
        ctx.font = 'bold 6px sans-serif'; ctx.fillStyle = c.kind === 'ending' ? '#3a8fd0' : '#e0503a';
        ctx.fillText((c.kind === 'ending' ? 'けつまつ' : 'しいん') + ' No.' + (zukanCur + 1), 50, Y0 + 9);
        ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#1d4d4a'; ctx.fillText(c.name, 50, Y0 + 20);
        ctx.font = '6px sans-serif'; ctx.fillStyle = '#6a5a3a'; ctx.fillText(fitText('きっかけ：' + (HINTS[c.id] || ''), 98), 50, Y0 + 29);
      } else {
        ctx.fillStyle = '#e4dcc4'; ctx.fillRect(12, Y0 + 3, 34, 28);
        ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = '#b8ad90'; ctx.textAlign = 'center'; ctx.fillText('？', 29, Y0 + 23); ctx.textAlign = 'left';
        ctx.font = 'bold 6px sans-serif'; ctx.fillStyle = '#9a8a6a'; ctx.fillText('No.' + (zukanCur + 1) + '　まだ見ていない', 50, Y0 + 9);
        ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#9a8a6a'; ctx.fillText('？？？', 50, Y0 + 20);
        ctx.font = '6px sans-serif'; ctx.fillStyle = '#6a5a3a'; ctx.fillText(fitText('ヒント：' + (HINTS[c.id] || ''), 98), 50, Y0 + 29);
      }
      ctx.textAlign = 'center';
    }
    // 操作の案内（画面の一番下）
    ctx.fillStyle = 'rgba(29,77,74,0.92)'; ctx.fillRect(0, H - 12, W, 12);
    ctx.font = 'bold 7px sans-serif'; ctx.fillStyle = '#fff8e0';
    ctx.fillText('餌:◀　ふれあい:▶　掃除:▼　網:もどる', 80, H - 3);
    ctx.textAlign = 'left';
  }

  // ---------------- 気分ボーナスとコンボ ----------------
  let celebrate = false;
  function reward(out) {
    if (!out) return;
    if (out.wantMet) {
      sfx('card'); fish.sq = 1;
      fx.push({ k: 'text', s: 'きぶん +1', x: fish.x, y: fish.y - 22, t: T, d: 1.2, c: '#ff9a3c' });
      thought = { icon: 'heart', until: T + 1.2 };
    }
    if (out.combo) {
      sfx('fanfare'); celebrate = true; thought = null;
      fx.push({ k: 'text', s: 'コンボ！ +1', x: 80, y: 60, t: T + 0.2, d: 1.6, c: '#ff5aa0', big: true });
      fx.push({ k: 'rainbow', t: T, d: 1.0 });
      lampFlash = T + 1.2;
    }
  }
  let lampFlash = 0;
  const WANT_ICON = { feed: 'food', clean: 'dirty', touch: 'heart' };
  // 左上の3つのランプ：点灯＝コンボの進み具合、オレンジの枠＝魚がいま欲しい世話
  function drawLamps() {
    const s = g.s, kinds = ['feed', 'clean', 'touch'], icons = { feed: 'food', clean: 'clean', touch: 'touch' };
    if (restUntil > T && mode === 'play') {   // v20: ひと休みの残り
      const k = Math.max(0, (restUntil - T) / REST_LEN), x = 15, y = 19;
      ctx.fillStyle = '#1d4d4a'; ctx.fillRect(x - 1, y - 1, 46, 6); ctx.fillStyle = '#fff3c4'; ctx.fillRect(x, y, 44, 4);
      ctx.fillStyle = '#8ac8ff'; ctx.fillRect(x, y, Math.round(44 * k), 4);
      ctx.fillStyle = '#1d4d4a'; for (let i = 0; i < 3; i++) if (((T * 2 | 0) + i) % 3) ctx.fillRect(x + 48 + i * 3, y + 3 - i * 2, 2, 1);
    }
    for (let i = 0; i < 3; i++) {
      const k = kinds[i], x = 16 + i * 15, y = 3;
      const lit = (s.combo || []).includes(k) || T < lampFlash;
      const want = s.want === k;
      ctx.fillStyle = '#1d4d4a'; ctx.fillRect(x - 1, y - 1, 15, 15);
      ctx.fillStyle = lit ? (T < lampFlash && ((T * 8) | 0) % 2 ? '#ffd6ea' : '#fff3c4') : '#9fc9bf'; ctx.fillRect(x, y, 13, 13);
      ctx.globalAlpha = lit ? 1 : 0.45;
      if (S.drawIcon) S.drawIcon(ctx, x + 6, y + 6, icons[k]);
      ctx.globalAlpha = 1;
      if (want && mode === 'play') {
        { ctx.fillStyle = Math.sin(T * 6) > 0 ? '#ff8a1c' : '#ffcf3a'; ctx.fillRect(x - 2, y - 2, 17, 2); ctx.fillRect(x - 2, y + 13, 17, 2); ctx.fillRect(x - 2, y, 2, 13); ctx.fillRect(x + 13, y, 2, 13); }
      }
    }
  }

  // ---------------- 底の小物（宝物・小石・エアストーン） ----------------
  const TCOL = { line: '#1d4d4a', gold: '#ffd23a', goldD: '#c9961a', pink: '#ff9fb8', pinkD: '#d86a88', gray: '#9aa3a0', grayD: '#6d7774', orange: '#ff8a3c', white: '#ffffff' };
  function px(x, y, c, w, h) { ctx.fillStyle = c; ctx.fillRect(x, y, w || 1, h || 1); }
  function drawTreasure(kind, x, y) {
    const C = TCOL;
    if (kind === 'pebble') { px(x - 3, y - 3, C.line, 7, 4); px(x - 2, y - 2, C.gray, 5, 2); px(x - 1, y - 2, '#c4ccc9', 2, 1); }
    else if (kind === 'coin') { px(x - 3, y - 3, C.line, 6, 6); px(x - 2, y - 2, C.gold, 4, 4); px(x - 1, y - 2, C.white, 1, 2); px(x + 1, y, C.goldD, 1, 1); if (((T * 2) | 0) % 3 === 0) px(x + 2, y - 4, C.white); }
    else if (kind === 'shell') { px(x - 4, y - 4, C.line, 9, 5); px(x - 3, y - 3, C.pink, 7, 3); px(x - 2, y - 3, C.pinkD, 1, 3); px(x, y - 3, C.pinkD, 1, 3); px(x + 2, y - 3, C.pinkD, 1, 3); px(x - 1, y + 1, C.line, 3, 1); }
    else if (kind === 'crown') { px(x - 4, y - 5, C.line, 9, 6); px(x - 3, y - 2, C.gold, 7, 2); px(x - 3, y - 4, C.gold, 1, 2); px(x, y - 4, C.gold, 1, 2); px(x + 3, y - 4, C.gold, 1, 2); px(x, y - 2, '#ff5a6a'); if (((T * 2) | 0) % 3 === 0) px(x - 3, y - 6, C.white); }
    else if (kind === 'star') { px(x - 1, y - 4, C.orange, 3, 7); px(x - 4, y - 1, C.orange, 9, 2); px(x - 2, y + 1, C.orange, 1, 2); px(x + 2, y + 1, C.orange, 1, 2); px(x, y - 1, '#ffd0a0'); }
  }
  function drawAirStone() {
    const x = AIR_X, y = SAND_Y + 1;
    px(x - 5, y - 3, TCOL.line, 11, 5); px(x - 4, y - 2, '#5a6e78', 9, 3); px(x - 3, y - 2, '#8fa2ab', 3, 1);
    px(x + 5, y, TCOL.line, 14, 1);   // チューブ
  }

  // ---------------- おなか・ストレス・よごれ（画面下の帯） ----------------
  function drawStatus() {
    const s = g.s, y = 230;
    // いま欲しいものに対応するゲージの上に▼
    const mk = { feed: 32, touch: 85, clean: 139 }[s.want];
    if (mk != null && mode === 'play') {
      const yy = y - 11 + Math.round(Math.sin(T * 6));
      ctx.fillStyle = '#1d4d4a'; ctx.fillRect(mk - 4, yy - 1, 9, 1); ctx.fillRect(mk - 4, yy, 1, 1); ctx.fillRect(mk + 4, yy, 1, 1);
      ctx.fillStyle = Math.sin(T * 6) > 0 ? '#ff8a1c' : '#ffcf3a';
      ctx.fillRect(mk - 3, yy, 7, 1); ctx.fillRect(mk - 2, yy + 1, 5, 1); ctx.fillRect(mk - 1, yy + 2, 3, 1); ctx.fillRect(mk, yy + 3, 1, 1);
    }
    ctx.fillStyle = 'rgba(255,248,224,0.62)'; ctx.fillRect(2, y - 3, 156, 11);
    ctx.fillStyle = '#1d4d4a'; ctx.fillRect(2, y - 4, 156, 1); ctx.fillRect(2, y + 8, 156, 1);
    const blinkOn = ((T * 3) | 0) % 2 === 0;
    const bar = (x, w, v, col, warn) => {
      ctx.fillStyle = '#1d4d4a'; ctx.fillRect(x - 1, y, w + 2, 6);
      ctx.fillStyle = '#d9cfb6'; ctx.fillRect(x, y + 1, w, 4);
      ctx.fillStyle = warn && blinkOn ? '#e0453a' : col; ctx.fillRect(x, y + 1, Math.round(w * clamp(v, 0, 1)), 4);
    };
    // v19：おなか＝満タンで色がつき、おなかが減るほど減っていく（少なくなると赤く点滅）
    ctx.fillStyle = '#1d4d4a'; ctx.fillRect(5, y, 6, 6); ctx.fillStyle = '#c98a3a'; ctx.fillRect(6, y + 1, 4, 4); ctx.fillStyle = '#f2c27a'; ctx.fillRect(6, y + 1, 2, 1);
    const full = s.satiety / L.SATIETY_MAX;
    bar(14, 36, full, full > 0.5 ? '#f0a030' : full > 0.2 ? '#f08a30' : '#e0453a', full <= 0.17);
    // v19：ストレス＝たまるほど右へのび、緑→黄→赤。顔も ふつう→むっ→怒り（赤でいっぱい＝怒っている）
    const sx = 56, st = s.stress / 100, lvS = st < 0.4 ? 0 : st < 0.75 ? 1 : 2;
    const face = ['#5bbf5a', '#e8b730', '#e0453a'][lvS];
    ctx.fillStyle = '#1d4d4a'; ctx.fillRect(sx, y - 1, 8, 8); ctx.fillStyle = face; ctx.fillRect(sx + 1, y, 6, 6);
    ctx.fillStyle = '#1d4d4a';
    if (lvS === 0) { ctx.fillRect(sx + 2, y + 2, 1, 1); ctx.fillRect(sx + 5, y + 2, 1, 1); ctx.fillRect(sx + 2, y + 4, 1, 1); ctx.fillRect(sx + 5, y + 4, 1, 1); ctx.fillRect(sx + 3, y + 5, 2, 1); }
    else if (lvS === 1) { ctx.fillRect(sx + 2, y + 2, 1, 1); ctx.fillRect(sx + 5, y + 2, 1, 1); ctx.fillRect(sx + 2, y + 4, 4, 1); }
    else { ctx.fillRect(sx + 2, y + 1, 1, 1); ctx.fillRect(sx + 3, y + 2, 1, 1); ctx.fillRect(sx + 5, y + 1, 1, 1); ctx.fillRect(sx + 4, y + 2, 1, 1); ctx.fillRect(sx + 2, y + 5, 4, 1); ctx.fillRect(sx + 2, y + 4, 1, 1); ctx.fillRect(sx + 5, y + 4, 1, 1);
      if (blinkOn) { ctx.fillStyle = '#e0453a'; ctx.fillRect(sx + 7, y - 3, 1, 2); ctx.fillRect(sx + 6, y - 2, 3, 1); } }
    bar(sx + 11, 34, st, ['#5bbf5a', '#e8b730', '#e0453a'][lvS], s.stress >= 85);
    // よごれ：4段のマス
    const dx = 112;
    ctx.fillStyle = '#1d4d4a'; ctx.fillRect(dx, y, 6, 6); ctx.fillStyle = '#7a9a3a'; ctx.fillRect(dx + 1, y + 1, 4, 4); ctx.fillStyle = '#4f6e22'; ctx.fillRect(dx + 3, y + 3, 2, 2);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#1d4d4a'; ctx.fillRect(dx + 9 + i * 9, y, 8, 6);
      ctx.fillStyle = i < s.dirt ? (s.dirt >= 3 && blinkOn ? '#e0453a' : '#7a8a3a') : '#d9cfb6'; ctx.fillRect(dx + 10 + i * 9, y + 1, 6, 4);
    }
  }

  function drawFishEnt() {
    if (!fish.vis) return;
    const gg = g.s.gauge / L.GAUGE_MAX, stage = gg < 0.36 ? 1 : gg < 0.72 ? 2 : 3;
    if (fish.inNet) {
      const o2 = Object.assign({ dir: fish.face, t: T, eyes: fish.eyes, mouth: 'o', stage, color: fish.color }, fish.opts, { scale: net && net.scale > 1 ? 1.6 : 0.8, rot: fish.face * 0.3 + (net ? net.tilt || 0 : 0) + Math.sin(T * 9) * 0.06 });
      // v23 P5：ユーザーの絵になった魚は、網の中でもその絵のまま（巨大化は大きな網に大きいまま）
      const na = fish.asset;
      if (na && S.drawAsset && na !== 'dragon') { S.drawAsset(ctx, na, Math.round(fish.x), Math.round(fish.y) - (na === 'giant' ? 14 : na === 'fishman' ? -14 : 4), { color: fish.color, dir: fish.face, scale: na === 'giant' ? 1.3 : 0.6, rot: o2.rot * 0.5 }); return; }
      if (!fish.opts.dragon) S.drawFish(ctx, Math.round(fish.x), Math.round(fish.y), o2);
      return;
    }
    const TQ = Math.floor(T * FPS) / FPS;   // 尾などの揺れもコマ単位で
    if (fish.die) {   // 死に際の手描きコマ（目・口・飾りはコマ側が決める）
      const od = { die: fish.die, color: fish.color, stage, dir: fish.face, t: TQ };
      if (fish.opts.scale) od.scale = fish.opts.scale;
      if (fish.legLen) od.legLen = fish.legLen;
      S.drawFish(ctx, Math.round(fish.x + fish.ox), Math.round(fish.y + fish.oy), od);
      return;
    }
    const o = Object.assign({ dir: fish.face, t: TQ, mouth: fish.mouth, eyes: fish.eyes, stage, color: fish.color }, fish.opts);
    // 手描きのコマ：泳ぎ8コマ・振り返り5コマ・もぐもぐ4コマ・まばたき3コマ・ぱくっ3コマ・びっくり3コマ・裏返り6コマ
    o.swimF8 = fish.opts.swimF == null ? Math.floor(fish.swimPh * 2) % 8 : fish.opts.swimF * 2;
    o.swimF = o.swimF8 >> 1;
    if (fish.turnP > 0) { o.turnF = Math.min(4, Math.round(fish.turnP * 4)); o.turn = o.turnF / 4; }
    if (T - fish.eatT < 0.25) o.eatF = Math.min(2, Math.floor((T - fish.eatT) / 0.25 * 3));
    if (T - fish.surpT < 0.3) o.surpF = Math.min(2, Math.floor((T - fish.surpT) / 0.3 * 3));
    if (fish.rollF != null) o.rollF = fish.rollF;
    if (!fish.opts.scale && !fish.rot && o.eatF == null && o.surpF == null) { o.sx = Math.round(fish.sx * 20) / 20; o.sy = Math.round(fish.sy * 20) / 20; }
    if (!fish.opts.variant && mode !== 'dead') {
      const ex = fish.ex;
      for (const k of ['eyes', 'mouth', 'brows', 'mark', 'front', 'wag', 'cheeks', 'blush', 'sweat']) if (ex[k] != null) o[k] = ex[k];
      if (T < fish.chewUntil) { o.cheeks = true; o.chewF = Math.floor(T * 8) % 4; o.chew = o.chewF / 4; o.mouth = 0; }
      if (o.eyes === 'normal' && T < fish.blinkUntil) { const bp = 1 - (fish.blinkUntil - T) / 0.2; o.blinkF = [1, 2, 2, 1][Math.min(3, Math.floor(bp * 4))]; }
    }
    if (fish.rot) o.rot = Math.round(fish.rot / (Math.PI / 16)) * (Math.PI / 16);   // 回転は32方向にスナップ（v17: 16→32）
    if (fish.legLen) o.legLen = fish.legLen;
    if (fish.look) o.look = fish.look;
    let x = Math.round(fish.x + fish.ox + (T < fish.shakeUntil ? Math.sin(T * 30) * 2 : 0)), y = Math.round(fish.y + fish.oy);
    if (fish.glitch) { // ドットだけずれる
      const j = ((T * 8) | 0) % 3;
      x += [0, 3, -2][j];
      ctx.save(); ctx.beginPath(); ctx.rect(0, y - 4, W, 5); ctx.clip();
      S.drawFish(ctx, x + 6, y, o); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, y - 4); ctx.rect(0, y + 1, W, H); ctx.clip();
      S.drawFish(ctx, x, y, o); ctx.restore();
      return;
    }
    if (fish.hermit && S.drawHermit) { S.drawHermit(ctx, x, SAND_Y + 2, T); return; }
    // v23: ユーザーの絵（最終の見た目）。色ちがいは金魚の色
    const an = fish.asset || (fish.opts.ghost && S.hasAsset && S.hasAsset('possessed_ghost') ? 'possessed_ghost' : null);
    if (an && fish.opts.variant !== 'giant') {
      const bob = fish.assetFrame != null ? 0 : Math.round(Math.sin(T * 3) * 1), sc = fish.assetScale || 1;
      const base = { color: fish.color, dir: o.dir, scale: sc, alpha: fish.opts.ghost ? 0.9 : 1 };
      if (an === 'fishman' && fish.assetFrame == null) { S.drawAsset(ctx, an, x, SAND_Y + 3, Object.assign(base, { ay: 1, sy: o.eyes === 'x' ? 1 : 1 + (bob > 0 ? 0.04 : 0) })); return; }
      let ay = y + (o.eyes === 'x' ? 0 : bob);
      const bx = S.assetBox && S.assetBox(an);
      if (bx) ay = Math.min(ay, SAND_Y + 3 - Math.round((bx.h * (1 - bx.ay)) * sc));   // 砂にめりこまない
      if (fish.opts.flip) base.rot = Math.PI;
      if (fish.assetFrame != null) {   // v23 P5c：変身のコマ。となりのコマへ少し重ねてなめらかに
        const f0 = Math.floor(fish.assetFrame), a = fish.assetFrame - f0;
        S.drawAsset(ctx, an, x, ay, Object.assign({}, base, { frame: f0 }));
        if (a > 0.01) S.drawAsset(ctx, an, x, ay, Object.assign({}, base, { frame: f0 + 1, alpha: a * base.alpha }));
        return;
      }
      S.drawAsset(ctx, an, x, ay, base);
      return;
    }
    S.drawFish(ctx, x, y, o);
  }

  function drawFx(f) {
    if (f.k === 'pop') { const q = Math.min(1, (T - f.t) / f.d); if (S.drawPop) S.drawPop(ctx, Math.round(f.x), Math.round(f.y), 3, q); return; }
    const a = (T - f.t) / f.d; if (a < 0) return;
    if (f.k === 'drop') { const tt = T - f.t; ctx.fillStyle = '#e8fff8'; ctx.fillRect(Math.round(f.x + f.vx * tt), Math.round(f.y + f.vy * tt + 60 * tt * tt), 1, 1); }
    if (f.k === 'star') { ctx.fillStyle = '#ffe14a'; const r = 3 + a * 6; for (let i = 0; i < 5; i++) { const an = i * 1.26 + a * 3; ctx.fillRect(Math.round(f.x + Math.cos(an) * r), Math.round(f.y + Math.sin(an) * r), 2, 2); } }
    if (f.k === 'text') {
      const rise = (T - f.t) * 14;
      ctx.font = (f.big ? 'bold 12px' : 'bold 9px') + ' sans-serif'; ctx.textAlign = 'center';
      ctx.globalAlpha = Math.max(0, 1 - a * a);
      ctx.fillStyle = '#1d4d4a';
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(f.s, Math.round(f.x + dx), Math.round(f.y - rise + dy));
      ctx.fillStyle = f.c; ctx.fillText(f.s, Math.round(f.x), Math.round(f.y - rise));
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
    if (f.k === 'omen') {   // 予感：上のほうにふわっと出るパネル
      const a2 = Math.min(1, (T - f.t) / 0.3, (f.t + f.d - T) / 0.5);
      ctx.globalAlpha = Math.max(0, a2);
      ctx.font = 'bold 9px sans-serif'; const w = Math.ceil(ctx.measureText(f.s).width) + 12, x0 = Math.round(80 - w / 2);
      if (f.y0 == null) f.y0 = fish.y < 125 ? 160 : 58;   // 魚・吹き出しと重ならない側
      const y0 = f.y0;
      ctx.fillStyle = '#1d4d4a'; ctx.fillRect(x0 - 1, y0 - 1, w + 2, 26);
      ctx.fillStyle = '#fff8e0'; ctx.fillRect(x0, y0, w, 24);
      ctx.fillStyle = '#9a6bff'; ctx.fillRect(x0, y0, w, 9);
      ctx.textAlign = 'center';
      ctx.font = 'bold 7px sans-serif'; ctx.fillStyle = '#ffffff'; ctx.fillText('よかん　このままだと…', 80, y0 + 7);
      ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#5a2ea0'; ctx.fillText(f.s, 80, y0 + 20);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
    if (f.k === 'rainbow') {
      const cols = ['#ff5a5a', '#ffa23c', '#ffe14a', '#5bd36a', '#4ab8ff', '#9a6bff'];
      ctx.globalAlpha = 0.28 * (1 - a);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(0, 24 + i * 32 + Math.round(Math.sin(T * 6 + i) * 4), W, 32); }
      ctx.globalAlpha = 1;
    }
    if (f.k === 'scrub') {
      const x = Math.round(f.x + (a - 0.5) * 9), y = Math.round(f.y - Math.sin(a * Math.PI) * 4);
      px(x - 2, y, '#e5fff9', 5, 1);
      px(x + 1, y + 3, '#ffffff', 5, 1);
    }
    if (f.k === 'sand') { const tt = T - f.t; ctx.globalAlpha = 1 - a; px(Math.round(f.x + f.vx * tt), Math.round(f.y + f.vy * tt + 50 * tt * tt), a < 0.5 ? '#e9b37a' : '#c98a50', 2, 2); ctx.globalAlpha = 1; }
    if (f.k === 'ring') {
      // 水面を上から斜めに見た波紋（横長の楕円の線）
      const rr = 3 + a * f.r, ry = Math.max(1, rr * 0.22);
      ctx.globalAlpha = 0.85 * (1 - a);
      ctx.fillStyle = '#f4fffb';
      for (let k = 0; k < 40; k++) { const an = k / 40 * Math.PI * 2; ctx.fillRect(Math.round(f.x + Math.cos(an) * rr), Math.round(WATER + 2 + Math.sin(an) * ry), 2, 1); }
      ctx.globalAlpha = 1;
    }
    if (f.k === 'spore') { const tt = T - f.t; if (tt >= 0) { ctx.globalAlpha = 1 - a; ctx.fillStyle = '#7cc24a'; ctx.fillRect(Math.round(f.x + Math.sin(tt * 5) * 2), Math.round(f.y - tt * 6), 2, 2); ctx.globalAlpha = 1; } }
    if (f.k === 'skull') { const tt = T - f.t; if (tt >= 0) { ctx.globalAlpha = 1 - a; const x = Math.round(f.x + Math.sin(tt * 5) * 3), y = Math.round(f.y - tt * 14); ctx.fillStyle = '#b06bd8'; ctx.fillRect(x - 2, y - 2, 5, 4); ctx.fillStyle = '#1d4d4a'; ctx.fillRect(x - 1, y - 1, 1, 1); ctx.fillRect(x + 1, y - 1, 1, 1); ctx.fillRect(x - 1, y + 2, 3, 1); ctx.globalAlpha = 1; } }
    if (f.k === 'frost') { ctx.globalAlpha = 1 - a; ctx.fillStyle = '#e8fbff'; const x = Math.round(f.x), y = Math.round(f.y); ctx.fillRect(x, y - 1, 1, 3); ctx.fillRect(x - 1, y, 3, 1); ctx.globalAlpha = 1; }
    if (f.k === 'petal') { const tt = T - f.t; if (tt >= 0) { ctx.globalAlpha = 1 - a; ctx.fillStyle = '#ff9fc4'; ctx.fillRect(Math.round(f.x + f.vx * tt + Math.sin(tt * 4) * 4), Math.round(f.y + tt * 10 - 8 * Math.sin(tt * 3)), 2, 2); ctx.globalAlpha = 1; } }
    if (f.k === 'steam') { const tt = T - f.t; if (tt >= 0) { ctx.globalAlpha = 0.8 * (1 - a); ctx.fillStyle = '#ffffff'; const r = 1 + tt * 4; ctx.fillRect(Math.round(f.x + Math.sin(tt * 6) * 2 - r / 2), Math.round(f.y - tt * 18), Math.round(r), Math.round(r)); ctx.globalAlpha = 1; } }
    if (f.k === 'note') {
      const tt = T - f.t; ctx.globalAlpha = 1 - a; const x = Math.round(f.x + f.vx * tt + Math.sin(tt * 6) * 2), y = Math.round(f.y - tt * 20);
      ctx.fillStyle = '#1d4d4a'; ctx.fillRect(x, y - 5, 1, 6); ctx.fillRect(x - 2, y, 3, 2); ctx.fillRect(x + 1, y - 5, 2, 1);
      ctx.globalAlpha = 1;
    }
    if (f.k === 'heart') {
      const tt = T - f.t; ctx.globalAlpha = 1 - a; ctx.fillStyle = '#ff5a86';
      const x = Math.round(f.x + f.vx * tt), y = Math.round(f.y - tt * 18);
      ctx.fillRect(x - 2, y, 2, 2); ctx.fillRect(x + 1, y, 2, 2); ctx.fillRect(x - 2, y + 1, 5, 2); ctx.fillRect(x - 1, y + 3, 3, 1); ctx.fillRect(x, y + 4, 1, 1);
      ctx.globalAlpha = 1;
    }
    if (f.k === 'badge') {
      const rise = Math.min(1, (T - f.t) * 4);
      ctx.globalAlpha = a > 0.8 ? (1 - a) * 5 : 1;
      if (S.drawBadge) S.drawBadge(ctx, 80, Math.round((f.y || 48) - (1 - rise) * 8), f.s);
      else { ctx.fillStyle = '#fff8e0'; ctx.fillRect(30, 40, 100, 14); ctx.fillStyle = '#1d4d4a'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(f.s, 80, 50); ctx.textAlign = 'left'; }
      ctx.globalAlpha = 1;
    }
    if (f.k === 'flash') { ctx.fillStyle = 'rgba(255,255,180,0.7)'; ctx.fillRect(0, 0, W, H); }
    if (f.k === 'fire') S.drawFlame(ctx, Math.round(f.x), Math.round(f.y), f.dir, T);
  }

  function drawSparkles() {
    ctx.fillStyle = '#fffbe8';
    for (let i = 0; i < 6; i++) {
      const x = (i * 53 + 20) % 140 + 10, y = (i * 37 + 40) % 180 + 30, on = ((T * 3 + i) | 0) % 3 === 0;
      if (!on) continue;
      ctx.fillRect(x, y - 2, 1, 5); ctx.fillRect(x - 2, y, 5, 1);
    }
  }

  function renderTitle() {
    S.drawTank(ctx, T, 0);
    if (mode === 'boot') {
      if (T - bootT > BOOT_T * 0.5 || bootT > 0.5) { /* 次の魚の前：まっさらな水槽 */ }
      // 泡が下から一気に湧いて画面を埋めつくし、はじけて晴れる
      const t = T - bootT, D = BOOT_T;
      const fill = t < D * 0.45 ? t / (D * 0.45) : Math.max(0, 1 - (t - D * 0.55) / (D * 0.45));
      ctx.fillStyle = 'rgba(236,255,250,' + (0.85 * Math.min(1, fill * 1.2)).toFixed(3) + ')';
      const top = Math.round(H - H * Math.min(1, (t / (D * 0.45)) * 1.1));
      ctx.fillRect(0, Math.max(0, top), W, H);
      for (const b of BOOT_BUBBLES) {
        const tt = t - b.d; if (tt < 0) continue;
        const y = H + 12 - tt * b.v; if (y < -12) continue;
        const x = b.x + Math.sin(tt * b.w + b.ph) * 3;
        S.drawBubble(ctx, Math.round(x), Math.round(y), b.r);
      }
      if (t > D * 0.6) for (let i = 0; i < 12; i++) { const a = ((t * 3 + i * 0.37) % 1); if (a < 0.2) { ctx.fillStyle = '#ffffff'; ctx.fillRect((i * 53) % 150 + 5, (i * 97) % 220 + 10, 2, 2); } }
      return;
    }
    ctx.fillStyle = 'rgba(255,248,224,0.92)'; ctx.fillRect(14, 70, 132, 70);
    ctx.strokeStyle = '#1d4d4a'; ctx.strokeRect(14.5, 70.5, 131, 69);
    ctx.fillStyle = '#1d4d4a'; ctx.textAlign = 'center';
    ctx.font = 'bold 15px sans-serif'; ctx.fillText('きんぎょの', 80, 96);
    ctx.fillText('さいご', 80, 116);
    ctx.font = '8px sans-serif';
    if (((T * 1.5) | 0) % 2 === 0) ctx.fillText('どれかボタンでスタート', 80, 132);
    ctx.textAlign = 'left';
    S.drawFish(ctx, 80 + Math.round(Math.sin(T) * 30), 180, { dir: Math.cos(T) > 0 ? 1 : -1, t: T, mouth: (T * 2 | 0) % 2, eyes: 'normal' });
  }

  treasures = initTreasures();
  // 起動時の泡（400個、大小・速さ・出るタイミングをばらす）
  const BOOT_T = 2.6;
  try { S.prewarmFriends && S.prewarmFriends(); } catch (e) {}
  const BOOT_BUBBLES = [];
  for (let i = 0; i < 400; i++) BOOT_BUBBLES.push({ x: Math.random() * W, r: Math.random() < 0.15 ? 6 + (Math.random() * 6 | 0) : 1 + (Math.random() * 4 | 0), v: 140 + Math.random() * 220, d: Math.random() * 1.1, w: 3 + Math.random() * 4, ph: Math.random() * 6 });

  // ---------------- ループ ----------------
  let last = performance.now(), alive = true, lastFno = -1;
  const FPS = 24;   // v17: 12→24コマ/秒（動きを細かく。手描きのコマは中割りつき）
  function frame(now) {
    if (!alive) return;
    let dt = Math.min(0.1, (now - last) / 1000) * SPEED; last = now;
    const n = Math.max(1, Math.ceil(dt / 0.05));
    for (let i = 0; i < n; i++) update(dt / n);
    if (director) stepDirector(dt);
    // コマ送り：画面は1秒24コマで描く
    const fno = Math.floor(T * FPS);
    if (fno !== lastFno || mode === 'title' || mode === 'zukan' || mode === 'card') { lastFno = fno; render(); }
    requestAnimationFrame(frame);
  }
  function fit() {
    const wrap = document.getElementById('screenwrap');
    const avail = Math.min(wrap.clientWidth / W, (window.innerHeight * 0.62) / H);
    const s = Math.max(1, Math.floor(avail));
    cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
  }

  // ---------------- 見本再生（死因ギャラリー用） ----------------
  let director = null;
  function stepDirector(dt) {
    const d = director;
    if (d.wait > 0) { d.wait -= dt; if (d.wait > 0) return; }
    if (d.cond) { if (!d.cond()) return; d.cond = null; }
    for (let k = 0; k < 20; k++) {
      const r = d.it.next(); if (r.done) { director = null; return; }
      if (typeof r.value === 'number') { d.wait = r.value; return; }
      if (typeof r.value === 'function' && !r.value()) { d.cond = r.value; return; }
    }
  }
  const TOUCH_OF = { cat: 'pet', bird: 'jump', dizzy: 'spin', bubblegone: 'bubble', floataway: 'puff', knotted: 'hoop', nowake: 'deadplay', star: 'rocket' };
  function demoGesture(name) { /*DEMO*/
    g.newFish = (orig => () => { orig(); g.s.phase = 'alive'; return { instantDeath: false }; })(g.newFish.bind(g));
    g.visitorAccident = () => null;
    director = { wait: 0, cond: null, it: (function* () {
      nextFish(); evAt = T + 999;
      if (name === 'decor') {   // v19：水槽のかざり 0→16段
        for (;;) { for (let lv = 0; lv <= (S.DECOR_MAX || 16); lv++) { demoDecor = lv; fx.push({ k: 'text', s: 'かざり Lv.' + lv, x: 80, y: 60, t: T, d: 1.1, c: '#ffd23a' }); gestAt = T + 999; visitAt = T + 999; yield 1.4; } yield 1.5; }
      }
      yield () => !busy; evAt = T + 999;
      for (;;) {
        gestAt = T + 999;
        if (name === 'feed') { runAction('feed'); yield () => !busy; g.s.satiety = 0; yield 1.5; continue; }
        if (name === 'swim') { yield 4; continue; }
        if (MINI_KEYS.includes(name) || name === 'leftover') {
          if (name === 'leftover') {   // 満腹で残った粒を、おなかがすいてから拾って食べる
            const sf = g.startFeed; g.startFeed = n => Object.assign(sf.call(g, n), { willEat: false, accident: null, gold: false });
            g.s.satiety = L.SATIETY_MAX; runAction('feed'); yield () => !busy; g.startFeed = sf; yield () => pellets.every(p => p.y > FLOOR - 4 || p.mine); yield 1.5;
            g.s.satiety = 8; leftAt = 0; yield () => !!gest; yield () => !gest; yield 2; continue;
          }
          g.s.gauge = 2; mgAt = T; mgInvite = null;
          visitAt = T + 999;
          demoInvite = name; yield () => !!mgInvite; demoInvite = false;
          yield 1; pressNow('touch'); yield () => !!mini;
          let k = 0;
          yield () => {   // お手本：だいたい当てて、ときどき外す・毒はよける
            if (!mini) return true;
            if (mini.phase !== 'play') return false;
            if (name === 'mini-puff') {
              if (!k && T - mini.lastPress >= 0.08) { miniPress(); if (mini.pressure >= 0.88) k = 1; }
              return false;
            }
            if (name === 'mini-net') {
              const sweep = mini.sweep;
              if (sweep && (80 - sweep.x) * sweep.dir / sweep.speed <= JUMP_TIME / 2 && (80 - sweep.x) * sweep.dir > 0) miniPress();
              return false;
            }
            const c = mini.cur;
            if (c && !c.done && !c.bad && Math.abs(c.y - mouthY()) <= (k % 4 === 3 ? 9 : 3)) { k++; miniPress(); }
            return false;
          };
          yield 2; continue;
        }
        if (name.startsWith('ev-')) {
          const kind = name.slice(3); evLoop = (evLoop || 0) + 1;
          g.s.gauge = Math.max(1, g.s.gauge); evAt = T; forceEvent = kind;
          yield () => !!ev; forceEvent = null; evAt = T + 999;
          const e = ev;
          yield () => !ev || (e.t0 && T - e.t0 > e.limit * 0.45);
          if (ev === e && evLoop % 2 === 1) pressNow(e.need);   // 奇数回は成功、偶数回は失敗のお手本
          yield () => !ev;
          if (mode === 'dead') { yield () => netReady; yield 1; collect(); yield () => mode === 'card'; yield 2; nextFish(); yield () => !busy; evAt = T + 999; }
          yield 1.5; continue;
        }
        if (name.startsWith('visit-')) { forceVisitor = name.slice(6); visitAt = T + 1; yield () => !!visitor; yield () => !visitor; yield 1; continue; }
        if (name.startsWith('t-')) {
          const kind = name.slice(2);
          g.startTouch = () => { g.s.satiety = 10; return kind === 'refuse' ? { hungry: false, refused: true, reaction: null, accident: null } : { hungry: false, reaction: kind, accident: null }; };
          yield 1.2; runAction('touch'); yield () => !busy; continue;
        }
        if (name === 'hungry') g.s.satiety = 1; if (name === 'sneeze') g.s.dirt = 2; if (name === 'nervous') g.s.stress = 70; else g.s.stress = 20;
        yield 1.2;
        playGesture(name);
        yield () => !gest;
      }
    })() };
  /*/DEMO*/
  }
  function demo(id, touch) { /*DEMO*/
    const c = cause(id), o = {};
    ['newFish', 'startFeed', 'startClean', 'startTouch', 'net', 'decideEnding'].forEach(k => { o[k] = g[k].bind(g); });
    g.newFish = () => { const r = o.newFish(); if (id === 'instant') { g.s.phase = 'dead'; return { instantDeath: true }; } g.s.phase = 'alive'; return { instantDeath: false }; };
    g.startFeed = n => Object.assign(o.startFeed(n), { willEat: true, accident: id });
    g.startClean = () => { g.s.dirt = Math.max(2, g.s.dirt); return Object.assign(o.startClean(), { effective: true, accident: id }); };
    g.startTouch = () => { g.s.satiety = 6; o.startTouch(); return { hungry: false, reaction: touch || TOUCH_OF[id], accident: id }; };
    g.net = () => ({ caught: true, smug: false });
    g.decideEnding = () => { o.decideEnding(); g.s.cause = id; g.s.phase = 'ending'; return id; };
    const ACT = { poison: 'feed', frozen: 'feed', flower: 'feed', burnt: 'feed', shock: 'feed', sucked: 'clean', overpolished: 'clean',
      cat: 'touch', bird: 'touch', dizzy: 'touch', bubblegone: 'touch', floataway: 'touch', netted: 'net', star: 'touch' };
    director = { wait: 0, cond: null, it: (function* () {
      for (;;) {
        nextFish(); gestAt = T + 999; evAt = T + 999;
        yield () => mode !== 'play' || !busy;
        if (id !== 'instant') {
          yield 1.2;
          if (c.kind === 'ending') {
            if (id === 'moss') g.s.dirt = 4;
            g.s.gauge = 25; startEnding();
          } else if (EVENT_OF_CAUSE[id]) { g.s.gauge = Math.max(1, g.s.gauge); forceEvent = EVENT_OF_CAUSE[id]; evAt = T; yield () => !!ev; forceEvent = null; evAt = T + 999; }
          else if (VISIT_OF_CAUSE[id]) { g.visitorAccident = () => id; gestAt = T + 999; forceVisitor = VISIT_OF_CAUSE[id]; visitAt = T; yield () => !!visitor || mode !== 'play'; forceVisitor = null; }
          else if (GDEATH_GEST[id]) { gestAt = T + 999; g.gestureAccident = () => id; if (id === 'nowake') g.s.stress = 20; playGesture(GDEATH_GEST[id]); }
          else runAction(ACT[id]);
        }
        yield () => (mode === 'dead' && netReady) || mode === 'card';
        if (mode === 'dead') { yield 1.6; collect(); yield () => mode === 'card'; }
        yield 2.4;
      }
    })() };
  /*/DEMO*/
  }

  if (cfg.main) { window.addEventListener('resize', fit); fit(); }
  // v23 P5c：ボタンの絵文字を、道具だけのドット絵に
  if (cfg.main && S.drawButtonIcon) document.querySelectorAll('.btn[data-btn]').forEach(b => {
    const ic = b.querySelector('.ic'); if (!ic) return;
    const c = document.createElement('canvas'); c.width = 32; c.height = 28; c.className = 'pic';
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; S.drawButtonIcon(x, b.dataset.btn);
    ic.replaceWith(c);
  });
  if (cfg.manual) alive = false;   // 書き出し用：外から step() でコマを進める
  if (cfg.demo) { mode = 'play'; if (cfg.demo.startsWith('g:')) demoGesture(cfg.demo.slice(2)); else demo(cfg.demo, cfg.touch); }
  requestAnimationFrame(frame);

  const api = { g, press, get gest() { return !!gest; }, get fish() { return fish; }, get pellets() { return pellets; }, get queued() { return queued; }, get mode() { return mode; }, get busy() { return busy; }, get ev() { return !!ev; }, get mini() { return !!mini; }, get cause() { return causeId; }, get evNeed() { return ev && !ev.result ? ev.need : null; }, get visitor() { return visitor ? visitor.kind : null; }, get resting() { return restUntil > T; }, get T() { return T; },
    step: dt => { update(dt); if (director) stepDirector(dt); render(); }, stop: () => { alive = false; },
    pause: () => { alive = false; }, resume: () => { if (alive) return; alive = true; last = performance.now(); requestAnimationFrame(frame); } };   // v20: 見本で画面外の水槽を止める
  if (cfg.main) window.__gf = api;
  return api;
 }
 return { mount };
})();
if (typeof window !== 'undefined' && !window.GF_NO_AUTOMOUNT && document.getElementById('screen')) GoldfishGame.mount(document.getElementById('screen'), { main: true });
