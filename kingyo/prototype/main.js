// main.js — 統合（演出・魚の動き・入力キュー・音）
var GoldfishGame = (function () {
 const L = GoldfishLogic, S = GoldfishSprites;
 const W = 160, H = 240, WATER = 22, FLOOR = 212, MID = 105;
 // cfg: { main: true } 本体（入力・音・保存あり） / { demo: '死因ID' } 見本再生（無音・保存なし）
 function mount(cv, cfg) {
  cfg = cfg || {};
  const params = new URLSearchParams(location.search);
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
  const AIR_X = 98;   // エアストーンの位置
  let treasures = [], carry = null;
  function initTreasures() { return [{ kind: 'pebble', x: 62, y: FLOOR + 5 }, { kind: 'pebble', x: 116, y: FLOOR + 6 }]; }
  let hoop = null, ball = null, visitor = null, visitAt = 40, forceVisitor = null;
  let crack = null, soul = null, bigFace = null, smear = null, spot = null, scales = [];
  let finger = null, brush = null, nozzle = null, net = null, paw = null, duck = null, feather = null, eyeball = null, bigBubble = null;
  let songCheckAt = 0;
  let wanderAt = 0, hintAt = 4, puText = 0, bootT = -1, feeding = false, gest = null, gestAt = 12, lastGest = null;
  Object.assign(fish, { face: 1, turnP: 0, sq: 0, sx: 1, sy: 1, chewUntil: 0, blinkAt: 2, blinkUntil: 0, ex: {} });

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
  function press(btn) {
    A.init();
    try { g.press(btn, T); } catch (e) {}
    flashButton(btn);
    if (mode === 'title') { if (bootT < 0) boot(); return; }
    if (mode === 'boot') return;
    if (mode === 'card') {
      if (T - cardT < 4) return;
      if (btn === 'net') { mode = 'zukan'; sfx('blink'); } else { bubbleWipe(); }
      return;
    }
    if (mode === 'zukan') { mode = 'card'; sfx('blink'); return; }
    if (mode === 'dead') { if (btn === 'net') { if (netReady) collect(); else netQueued = true; } return; }
    if (mode !== 'play') return; // ending中は入力停止
    if (btn === 'net') { if (!busy) runAction('net'); return; }
    if (btn === 'feed' && feeding) { if (g.canFeed(pellets.length)) dropBatch(); else sfx('nope'); return; }
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
    finger = brush = nozzle = net = paw = duck = feather = eyeball = bigBubble = null;
    crack = soul = bigFace = smear = spot = null; scales = []; fish.hermit = false; hoop = ball = null; visitor = null; visitAt = T + rnd(25, 45);
    Object.assign(fish, { x: 80, y: -30, dir: 1, eyes: 'normal', vis: false, opts: {}, rot: 0, ox: 0, oy: 0, free: true, glitch: false, split: 0, smugUntil: 0, vx: 0, vy: 0, legLen: 0, cruise: false, turn: 3, look: null, wps: [], shakeUntil: 0, splitHead: 0, face: 1, turnP: 0, sq: 0, sx: 1, sy: 1, chewUntil: 0, blinkAt: 2, blinkUntil: 0, ex: {} });
    gest = null;
  }

  function nextFish() {
    resetScene(); mode = 'play'; busy = true; A.setSong(null);
    const r = g.newFish();
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
      fx.push({ k: 'badge', s: g.s.fishNo + '匹目' + (pe ? '　せいかく：' + pe.name : ''), t: T + 0.3, d: 2.8 });
      yield 2.5;           // ぽちゃんの後の静けさ
      A.setSong('main');
      busy = false; afterAction();
    });
  }

  function resumeFish() {
    resetScene(); mode = 'play'; fish.vis = true; fish.x = 80; fish.y = 110; fish.tx = 80; fish.ty = 110;
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
      try { g.save && g.save(); } catch (e) {}
      afterAction();
    });
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
  const mouthX = () => fish.x + fish.dir * 20;

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
      pellets.push({ x: clamp(baseX + rnd(-16, 16), 28, 132), y: WATER - 6 - i * 8, vy: rnd(16, 20), ph: rnd(0, 6),
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
      const ready = rem.filter(p => p.y >= MID);
      const dist = p => Math.hypot(p.x - fish.x, p.y - fish.y);
      const p = ready.length ? ready.sort((a, b) => dist(a) - dist(b))[0] : rem.sort((a, b) => b.y - a.y)[0];
      fish.free = true; fish.speed = 42; fish.turn = 6;
      yield () => {
        if (!pellets.includes(p)) return true;
        const d = p.x > fish.x ? 1 : -1;
        if (Math.abs(p.x - fish.x) > 6) fish.dir = d;
        if (p.y < MID) {
          if (pellets.some(q => q.mine && q !== p && q.y >= MID)) return true;   // 別の粒が先に来たら乗り換え
          fish.eyes = 'normal'; fish.look = 'up'; fish.speed = 34;
          fish.tx = clamp(p.x - d * 22, 25, 135); fish.ty = MID + 14 + Math.sin(T * 5) * 3;
          fish.mouth = (Math.sin(T * 8) > 0) ? 1 : 0;
          return false;
        }
        fish.eyes = 'normal'; fish.look = null; fish.speed = 60; fish.turn = 9;
        if (!p.t0) p.t0 = T;
        // 壁ぎわの粒には反対側から回り込む
        const side = p.x - 20 < 26 ? -1 : p.x + 20 > 134 ? 1 : d;
        if (Math.abs(fish.x - (p.x - side * 20)) < 10) fish.dir = side;
        const lead = p.y < FLOOR + 4 ? p.vy * 0.35 : 0;   // 落ちる先を狙う
        fish.tx = clamp(p.x - side * 20, 25, 135); fish.ty = clamp(p.y + lead, 35, FLOOR + 2);
        const tol = T - p.t0 > 4 ? 12 : 7;
        if (T < fish.chewUntil) return false;
        if (T - p.t0 > 6) { p.x += (mouthX() - p.x) * 0.3; p.y += (fish.y - p.y) * 0.3; }   // 届かなければ吸い寄せる
        return Math.abs(mouthX() - p.x) < tol && Math.abs(fish.y - p.y) < tol;
      };
      if (!pellets.includes(p) || p.y < MID) continue;
      pellets.splice(pellets.indexOf(p), 1); fish.turn = 3; fish.look = null;
      // ぱくっ → ほっぺをふくらませて、もぐもぐ（噛みながら次の粒へ向かえる）
      fish.mouth = 'o'; sfx('eat'); fish.sq = 1;
      const e = g.eatPellet();
      p.batch.eaten++;
      yield 0.08; fish.mouth = 0;
      fish.chewUntil = T + 0.75; setTimeoutT(() => sfx('mogu'), 0.05); setTimeoutT(() => { sfx('gulp'); fish.sq = 0.7; }, 0.75);
      if (p.bad) { feeding = false; yield 0.4; return yield* suddenDeath(p.batch.r.accident); }
      if (p.gold) {
        g.bonus(2); sfx('fanfare'); fish.sq = 1.2;
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
      // 先に吸い込み音、後からノズル
      sfx('suck'); fish.eyes = 'dizzy';
      yield 0.9;
      nozzle = { x: fish.x, y: -40 };
      yield* tween(0.8, p => { nozzle.x = fish.x; nozzle.y = -40 + ease(p) * (fish.y - 30 + 40); });
      fish.free = false;
      yield* tween(0.5, p => { fish.y -= (fish.y - (nozzle.y + 14)) * p; fish.opts = { scale: 1 - p * 0.7 }; });
      fish.vis = false; sfx('pop');
      wipeDirt = Math.max(0, dirt0 - 1); wipes = [{ x: 80, y: 120, r: 200 }];
      yield* tween(0.7, p => { nozzle.y = (fish.y - 30) * (1 - p) - 40 * p; });
      nozzle = null;
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
        for (let k = 0; k < 6; k++) { sfx('brush'); fish.eyes = 'dizzy'; yield* tween(0.18, p => { brush.a = Math.sin(p * Math.PI * 2) * 6; fish.ox = Math.round(brush.a / 2); }); }
        fish.opts = { white: true, shine: true, sparkle: true }; fish.ox = 0;
        sfx('death');
        yield* tween(0.6, p => { brush.x = fx0 + p * 100; brush.y = fy0 - p * 100; });
        brush = null; wipes = null;
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
    const r = g.startTouch();
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
          // 指だと思ったら…猫の手だった
          fish.look = 'up'; fish.ex = { eyes: 'sparkle', mouth: 'smile' };
          paw = { x: 80, y: -40 }; yield 0.4;
          yield* tween(0.35, p => { paw.y = -40 + p * 106; });
          sfx('meow'); fish.free = false; fish.vis = false; paw.fish = true; fish.look = null; fish.ex = {};
          yield 0.4;
          yield* tween(0.6, p => { paw.y = 66 - p * 120; });
          fish.vis = false; paw = null;
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
          yield* tween(0.7, p => { fish.y = 58 - p * 110; fish.rot = -fish.dir * 0.5; });
          fish.vis = false; fish.rot = 0; sfx('tweet'); fish.ex = {};
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
          fish.eyes = 'dizzy';
          yield* tween(2.6, p => { const a = p * p * Math.PI * 12; finger.x = cx0 + Math.cos(a) * R; finger.y = cy0 - 4 + Math.sin(a) * R * 0.5; fish.rot = fish.dir * a; });
          yield* fingerOut(0.3);
          fish.rot = 0; fish.opts = { variant: 'dizzy', flip: true }; sfx('death');
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
          bigBubble = { x: fish.x, y: fish.y, r: 4 }; fish.free = false; sfx('bubble');
          yield* tween(0.8, p => { bigBubble.r = 4 + p * 26; bigBubble.x = fish.x; bigBubble.y = fish.y; });
          yield* tween(1.2, p => { fish.y -= 0.3; bigBubble.y = fish.y; });
          sfx('pop'); fish.vis = false; bigBubble = null;
          eyeball = { x: fish.x + fish.dir * 8, y: fish.y - 2 };
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
        sfx('fanfare'); fish.opts = {}; fish.eyes = 'normal'; fish.sq = 1.4; fish.ex = { eyes: 'sparkle', mouth: 'tongue', mark: '!' };
        yield* tween(0.3, p => { fish.oy = -Math.round(Math.sin(p * Math.PI) * 8); });
        fish.oy = 0; yield* fingerOut(0.4); yield 0.3; fish.ex = {}; fish.free = true; break;
      }
      case 'handstand': {    // 逆立ちして尾をふりふり
        yield* swimTo(clamp(fish.x, 40, 120), FLOOR - 22, 50);
        fish.free = false; sfx('spin');
        yield* tween(0.4, p => { fish.rot = fish.face * (Math.PI / 2) * ease(p); });
        fish.ex = { eyes: 'closed', mouth: 'grin', wag: 3 };
        yield* fingerTo(fish.x + 22, FLOOR - 40, 0.5);
        for (let k = 0; k < 4; k++) { sfx('pet'); yield* tween(0.2, p => { finger.x += Math.sin(p * Math.PI * 2) * 1.5; }); }   // 指で拍手
        yield* tween(0.4, p => { fish.rot = fish.face * (Math.PI / 2) * (1 - ease(p)); });
        fish.rot = 0; yield* fingerOut(0.4); fish.ex = {}; fish.free = true; break;
      }
      case 'highfive': {     // 跳び上がって尾でハイタッチ
        const fx0 = clamp(fish.x, 40, 120);
        yield* swimTo(fx0, 80, 55);
        yield* fingerTo(fx0 + fish.face * 6, 44, 0.5);
        fish.free = false; fish.ex = { eyes: 'sparkle', mouth: 'grin' };
        sfx('jump'); const y0 = fish.y;
        yield* tween(0.35, p => { fish.y = y0 - 30 * Math.sin(p * Math.PI / 2); fish.rot = -fish.face * p * Math.PI; });
        sfx('blink'); sfx('pet'); fx.push({ k: 'star', x: finger.x, y: finger.y + 2, t: T, d: 0.6 });
        fx.push({ k: 'text', s: 'パチッ', x: finger.x, y: finger.y - 4, t: T, d: 0.9, c: '#ffffff' });
        yield* fingerPoke(0, -3);
        yield* tween(0.4, p => { fish.y = y0 - 30 * (1 - p); fish.rot = -fish.face * Math.PI * (1 + p); });
        fish.rot = 0; yield* fingerOut(0.4); fish.ex = {}; fish.free = true; fish.tx = fish.x; fish.ty = fish.y; break;
      }
      case 'ball': {         // 指が落としたボールを、鼻でリフティング
        const bx = clamp(fish.x, 40, 120);
        yield* fingerTo(bx, 6, 0.5);
        ball = { x: bx, y: 8, vy: 0 };
        yield* fingerOut(0.3);
        yield* tween(0.35, p => { ball.y = 8 + (WATER - 8) * p * p; });
        splashAt(bx, 10); sfx('chapon');
        yield* swimTo(bx - fish.face * 0, WATER + 14, 60);
        fish.free = false; fish.dir = fish.face;
        for (let k = 0; k < 4; k++) {
          sfx('boing'); fish.sq = 1; fish.ex = { eyes: 'closed', mouth: 'o' };
          const h = 22 + k * 4;
          yield* tween(0.55, p => { ball.y = WATER - 2 - Math.sin(p * Math.PI) * h; ball.x = bx + Math.sin(k) * 3 * p; });
          splashAt(ball.x, 6);
        }
        sfx('fanfare'); fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: 'note' };
        yield* fingerTo(ball.x, WATER - 4, 0.4); ball = null; yield* fingerOut(0.4);
        fish.ex = {}; fish.free = true; break;
      }
      case 'kiss': {         // 指先にちゅっ
        yield* swimTo(clamp(fish.x, 40, 120), clamp(fish.y, 70, 170), 45);
        fish.free = false;
        yield* fingerTo(fish.x + fish.face * 26, fish.y - 2, 0.6);
        fish.ex = { eyes: 'closed', mouth: 'o', blush: true };
        const x0 = fish.x; yield* tween(0.3, p => { fish.x = x0 + fish.face * 5 * p; });
        sfx('pet'); sfx('blink'); fish.ex = { eyes: 'closed', mouth: 'o', blush: true, mark: 'heart' };
        for (let i = 0; i < 6; i++) fx.push({ k: 'heart', x: finger.x, y: finger.y, t: T + i * 0.12, d: 1.0, vx: rnd(-10, 10) });
        yield* fingerPoke(0, -2); yield 0.5;
        yield* tween(0.3, p => { fish.x = x0 + fish.face * 5 * (1 - p); });
        yield* fingerOut(0.5); fish.ex = {}; fish.free = true; break;
      }
      case 'puff': {
        // お腹をつんっ → ぷくっ
        fish.free = false; fish.tx = fish.x; fish.ty = fish.y;
        yield* fingerTo(clamp(fish.x - fish.dir * 2, 28, 132), clamp(fish.y - 16, 26, 200), 0.6);
        yield* fingerPoke(0, 6); fish.sq = 1; fish.ex = { eyes: 'surprised', mouth: 'o' };
        sfx('puff'); fish.opts = { puff: true };
        if (acc === 'floataway') {
          yield* fingerTo(finger.x - 18, finger.y - 10, 0.3);
          yield 0.6; fish.ex = {}; fish.eyes = 'dizzy'; fish.opts = { variant: 'floataway', puff: true, balloon: true };
          yield* fingerOut(0.4);
          yield* tween(3.0, p => { fish.y = fish.y - 0.5 - p; fish.ox = Math.round(Math.sin(p * 20)); });
          fish.vis = false; fish.ox = 0;
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
    net = { x: tx + 34, y: -34, tilt: -0.35, sag: 0.3, wet: false, drip: false };
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
      if (caught) { target.x = net.x + 2 + Math.sin(T * 18) * 1.2; target.y = net.y + (target === fish ? 14 : 10); net.sag = 1; }
    });
    if (!target) sfx('nope');
    if (opts.struggle && target) { for (let k = 0; k < 4; k++) { yield* tween(0.18, p => { target.x = net.x + Math.sin(p * Math.PI * 2) * 3; net.tilt = Math.sin(p * Math.PI * 2) * 0.08; }); } }
    yield 0.25;
    // 3) 持ち上げて水から出す（しずく）
    const y0 = net.y;
    yield* tween(1.0, p => {
      const e = p * p; net.y = y0 + (-60 - y0) * e; net.tilt = 0.25 * e;
      if (net.y < WATER) net.drip = true;
      if (target && target.inNet) { target.x = net.x + 2 + Math.sin(T * 10) * 1; target.y = net.y + (target === fish ? 14 : 10); }
    });
    if (target) target.inNet = false;
    net = null;
  }

  function* actNet() {
    const r = g.net();
    if (r.caught) {
      fish.free = false; fish.eyes = 'dizzy';
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
    add(gBonk, 2); add(gNibblePlant, 2); add(gDance, s.stress <= 30 ? 3 : 1); add(gPeek, 2); add(gShowOff, 2); add(gTongue, 1);
    add(gNap, s.satiety >= 12 ? 3 : 1);
    add(gDig, 4); add(gPebble, 2); add(gBubbleRide, 3); add(gSandHide, 2); add(gRoll, 2);   // 画面下でやること
    if (s.dirt >= 2) add(gSneeze, 4);
    if (s.satiety <= 4) add(gHungry, 5);
    if (s.stress >= 60) add(gNervous, 5);
    const pe = s.persona;
    if (pe === 'glutton') add(gHungry, 3);
    if (pe === 'lazy') add(gNap, 4);
    if (pe === 'showoff') { add(gShowOff, 3); add(gDance, 3); add(gLookAtYou, 2); }
    if (pe === 'timid') add(gNervous, 3);
    if (pe === 'clingy') { add(gLookAtYou, 3); add(gPeek, 2); }
    if (pe === 'neat' && s.dirt >= 1) add(gSneeze, 3);
    let fn = pool[Math.random() * pool.length | 0];
    for (let k = 0; k < 5 && fn === lastGest; k++) fn = pool[Math.random() * pool.length | 0];   // 同じしぐさを続けない
    lastGest = fn;
    fish.cruise = false; fish.wps = [];
    gest = { it: fn(), wait: 0, cond: null };
  }
  // ---------------- お客さん（巻貝・カニ・エビ） ----------------
  function updateVisitor(dt, idle) {
    if (mode !== 'play') { if (visitor && mode !== 'dead') visitor = null; return; }
    if (!visitor) {
      if (idle && !gest && T > visitAt) {
        const kind = forceVisitor || ['snail', 'crab', 'shrimp'][Math.random() * 3 | 0];
        const from = Math.random() < 0.5 ? -1 : 1;
        visitor = kind === 'snail' ? { kind, x: rnd(30, 130), y: WATER + 4, vx: rnd(-3, 3), vy: 7, t0: T }
          : kind === 'crab' ? { kind, x: from < 0 ? -12 : W + 12, y: FLOOR + 2, vx: -from * 16, vy: 0, t0: T }
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
  }
  function drawVisitorFront() {  // ガラスに張りつくもの（魚より手前）
    const v = visitor; if (!v) return;
    if (v.kind === 'snail' && S.drawSnail) S.drawSnail(ctx, Math.round(v.x), Math.round(v.y), T, { rot: Math.atan2(v.vy, v.vx), surprised: v.hideUntil > T });
  }
  // 魚がお客さんに反応する
  function* gVisitor(v) {
    yield 0.6;
    if (v.kind === 'snail') {
      fish.ex = { eyes: 'surprised', mark: '?' };
      for (let k = 0; k < 3; k++) { yield go(v.x - fish.face * 24, v.y + 4, 40); fish.dir = v.x > fish.x ? 1 : -1; fish.ex = { eyes: 'sparkle', mouth: 'o' }; yield 0.6; }
      v.hideUntil = T + 2.2; sfx('pop'); fish.ex = { eyes: 'surprised', mouth: 'o', mark: '!' }; fish.sq = 1; yield 0.8;
      fish.ex = { eyes: 'side', mouth: 'wavy' }; yield 0.8;
    } else if (v.kind === 'crab') {
      fish.ex = { eyes: 'sparkle', mark: '?' };
      yield go(v.x - fish.face * 26, FLOOR - 14, 45);
      yield () => { fish.tx = clamp(v.x - fish.face * 24, 24, 136); fish.ty = FLOOR - 14; fish.dir = v.x > fish.x ? 1 : -1; return Math.abs(fish.x - fish.tx) < 4 || v.x < -10 || v.x > W + 10; };
      if (visitor !== v) return;
      // チョキン！
      v.pinch = true; v.angry = true; v.pauseUntil = T + 1.2; sfx('bonk'); fish.sq = 1.3;
      fish.ex = { eyes: 'teary', mouth: 'o', mark: 'anger', sweat: true };
      fx.push({ k: 'text', s: 'チョキン', x: v.x, y: v.y - 14, t: T, d: 0.9, c: '#ff5a5a' });
      yield go(fish.x - fish.face * 50, FLOOR - 70, 95);
      v.pinch = false;
      fish.ex = { eyes: 'teary', brows: 'worried', mouth: 'wavy' }; yield 1.0;
    } else {
      fish.ex = { eyes: 'sparkle', mouth: 'grin', mark: '!' };
      for (let k = 0; k < 6 && visitor === v; k++) { fish.ex = { eyes: 'sparkle', mouth: k % 2 ? 'o' : 'grin' }; yield go(v.x - Math.sign(v.vx) * 26, v.y, 75); }
      fish.ex = { eyes: 'side', mouth: 'pout', mark: '?' }; yield 0.9;
    }
  }

  // ---------------- しぐさ中の突然死 ----------------
  function gestDeath(id, side) {
    gest = null; fish.ex = {}; fish.rot = 0; fish.oy = 0; fish.ox = 0;
    busy = true; queued = null; fish.cruise = false; fish.free = false;
    startTask(function* () { yield* GDEATH[id](side); });
  }
  const GDEATH = {
    *stuck(side) {          // 勢いあまってガラスに刺さる
      side = side || (fish.x < 80 ? -1 : 1);
      sfx('bonk'); sfx('zap'); fish.dir = fish.face = side; fish.turnP = 0;
      crack = { x: side < 0 ? 17 : 143, y: Math.round(fish.y), size: 16 };
      fish.x = side < 0 ? 30 : 130;
      fish.opts = { variant: 'stuck', stuck: true }; fish.eyes = 'x';
      fx.push({ k: 'star', x: crack.x, y: crack.y, t: T, d: 0.8 });
      yield 0.8;
      return yield* deathSettle('stuck', true);
    },
    *hiccupfly() {          // 最後のしゃっくりで昇天
      sfx('hic'); sfx('boing'); fish.sq = 1.4; fish.eyes = 'closed';
      yield* tween(0.3, p => { fish.oy = -Math.round(Math.sin(p * Math.PI) * 10); });
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
      fish.opts = { variant: 'knotted', knot: true }; fish.eyes = 'x';
      yield 0.8;
      return yield* deathSettle('knotted');
    },
    *flat() {               // くしゃみの反動でガラスにぺたん
      const side = -fish.face, wx = side < 0 ? 26 : 134, x0 = fish.x;
      yield* tween(0.22, p => { fish.x = x0 + (wx - x0) * p * p; });
      sfx('bonk'); sfx('splash'); fish.sq = 0;
      fish.opts = { variant: 'flat', flat: true }; fish.eyes = 'x';
      yield 0.6;
      const y0 = fish.y; yield* tween(3, p => { fish.y = y0 + 40 * p; });   // ずるずる滑り落ちる
      return yield* deathSettle('flat', true);
    },
    *nowake() {             // うたた寝のまま、魂が抜ける
      fish.eyes = 'closed'; fish.opts = { variant: 'nowake', soul: false };
      yield 0.6; sfx('yawn');
      soul = { x: fish.x, y: fish.y - 6 };
      const x0 = soul.x, y0 = soul.y;
      yield* tween(3.5, p => { soul.y = y0 + (-30 - y0) * p; soul.x = x0 + Math.sin(p * 8) * 6; });
      soul = null;
      return yield* deathSettle('nowake', true);
    },
    *overhere() {           // のぞきこみすぎて、ガラスのこっち側へ
      sfx('grow');
      yield* tween(0.8, p => { fish.opts = { scale: Math.round((1.5 + 0.8 * p) * 20) / 20 }; });
      fish.vis = false; fish.opts = {};
      bigFace = { p: 0 };
      yield* tween(1.2, p => { bigFace.p = ease(p); });
      sfx('gulp'); sfx('splash'); fx.push({ k: 'flash', t: T, d: 0.15 });
      yield 0.4; bigFace = null;
      smear = { x: 80, y: 120, size: 70 };
      yield 1;
      return yield* deathSettle('overhere');
    },
  };
  const GDEATH_GEST = { stuck: 'bonk', hiccupfly: 'hiccup', knotted: 'tail', flat: 'sneeze', nowake: 'nap', overhere: 'peek' };

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
  function* gRoll() {            // 砂の上でごろごろ
    yield go(rnd(40, 120), FLOOR - 8, 45);
    fish.free = false; fish.ex = { eyes: 'closed', mouth: 'smile', blush: true };
    const x0 = fish.x;
    yield* tween(2.0, p => { const a = Math.sin(p * Math.PI * 3); fish.rot = a * 1.4; fish.x = x0 + a * 8; if (Math.abs(a) > 0.95) sandPuff(fish.x, FLOOR + 2, 1); });
    fish.rot = 0; fish.ex = { eyes: 'closed', mouth: 'grin', mark: 'heart' }; yield 0.6; fish.free = true;
  }

  const GESTURES = { look: gLookAtYou, yawn: gYawn, hiccup: gHiccup, sneeze: gSneeze, bubbles: gBlowBubbles, tail: gTailChase, bonk: gBonk,
    nibble: gNibblePlant, nap: gNap, dance: gDance, peek: gPeek, showoff: gShowOff, tongue: gTongue, hungry: gHungry, nervous: gNervous,
    dig: gDig, pebble: gPebble, bubbleride: gBubbleRide, sandhide: gSandHide, roll: gRoll };
  function playGesture(name) { fish.cruise = false; fish.wps = []; gest = { it: GESTURES[name](), wait: 0, cond: null }; }
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
  function* gTongue() {          // あっかんべー
    hold(); fish.ex = { front: true }; yield 0.3;
    fish.ex = { front: true, eyes: 'closed', mouth: 'tongue' }; yield 0.9;
    fish.ex = {}; yield 0.2;
  }
  function* gHungry() {          // おなかすいた…
    yield go(fish.x, 40, 40);
    hold(); fish.dir = fish.face;
    for (let k = 0; k < 4; k++) { fish.ex = { eyes: 'teary', brows: 'worried', mouth: 'o' }; yield 0.22; fish.ex = { eyes: 'teary', brows: 'worried', mouth: 0 }; yield 0.22; }
    thought = { icon: 'food', until: T + 2 }; fish.ex = { eyes: 'teary', mouth: 'pout', brows: 'worried' }; yield 0.8;
  }
  function* gNervous() {         // そわそわ
    for (let k = 0; k < 4; k++) {
      fish.ex = { eyes: 'side', brows: 'worried', mouth: 'wavy', sweat: true };
      yield go(fish.x + rnd(-30, 30), fish.y + rnd(-20, 20), 90);
      fish.dir = -fish.dir; yield 0.25;
    }
    fish.ex = { eyes: 'annoyed', brows: 'angry', mark: 'anger' }; hold(); yield 0.7;
  }

  // ---------------- 途中死 ----------------
  const DEATH_LOOK = {
    instant: { flip: true }, poison: { flip: true, palette: 'poison' }, frozen: { frozen: true }, flower: { flower: true },
    burnt: { burnt: true }, shock: { flip: true, spark: true }, overpolished: { white: true, flip: true }, dizzy: { flip: true },
  };
  function* suddenDeath(id, already) {
    mode = 'dead'; A.setSong(null); queued = null;
    fish.free = false; fish.eyes = 'x';
    if (id === 'shock') { sfx('zap'); for (let i = 0; i < 6; i++) { fx.push({ k: 'flash', t: T + i * 0.08, d: 0.05 }); } yield* shake(0.6); }
    else if (id === 'burnt') { sfx('zap'); fx.push({ k: 'fire', x: mouthX(), y: fish.y, t: T, d: 1.0, dir: fish.dir }); yield 0.9; }
    else if (id === 'frozen') { sfx('blink'); }
    else if (id === 'flower') { sfx('pet'); }
    else if (!already) sfx('death');
    const look = DEATH_LOOK[id] || { flip: true };
    if (id === 'flower') {   // 芽→双葉→つぼみ→開花
      for (let k = 0; k <= 3; k++) { fish.opts = { flower: true, flowerStage: k }; sfx('blink'); yield 0.45; }
    }
    fish.opts = Object.assign({ variant: id }, look);
    return yield* deathSettle(id);
  }

  // 浮く／沈むまで漂い、網を待つ
  function* deathSettle(id, stay) {
    feeding = false; mode = 'dead'; A.setSong(null); queued = null; causeId = id;
    if (id !== 'netted') { try { g.die(id); } catch (e) {} }
    const c = cause(id);
    if (fish.vis && stay) {
      yield 0.8;
    } else if (fish.vis) {
      if (id !== 'dizzy' && id !== 'overpolished' && !fish.opts.frozen && !fish.opts.burnt) fish.eyes = 'x';
      const ty = c.float === 'sink' ? FLOOR - 6 : WATER + 10;
      const y0 = fish.y, x0 = fish.x;
      yield* tween(2.5, p => { fish.y = y0 + (ty - y0) * ease(p); fish.x = x0 + Math.sin(p * 4) * 3; });
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
      else if (fish.vis) target = fish;
      else if (eyeball) target = eyeball;
      else if (feather) target = feather;
      else if (duck) target = duck;
      if (target && target.y < WATER + 4) target.y = WATER + 6;   // 浮いているものも水面ですくう
      yield* scoop(target, { x: 80, y: 130 });
      fish.vis = false; eyeball = feather = duck = null; net = null;
      yield 0.3;
      showCard(causeId);
    });
  }

  function showCard(id) {
    mode = 'card'; cardT = T;
    const z = g.s.zukan; const has = z && (z.has ? z.has(id) : z.includes(id));
    cardNew = !has;
    try { g.record(id); } catch (e) {}
    try { g.save && g.save(); } catch (e) {}
    sfx('card'); A.setSong('card');
  }

  // ---------------- 満タン時の結末 ----------------
  // 変身後の完成形（交互表示でもこの姿を見せる）
  const END_LOOK = {
    bug: {}, duck: {}, moss: { moss: true }, stone: { stone: true }, split: { split: false }, skeleton: { skeleton: true },
    overeat: { belly: true }, cramped: { scale: 3.3 }, fishman: { legs: true }, oldage: { wrinkles: true },
    dragon: { dragon: true }, golden: { palette: 'gold', shine: true }, bald: { bald: true }, hermit: {}, idol: { idol: true }, round: { round: true },
  };
  const SPLIT_AT = 0.8;   // 二つ目の頭がここまで育って止まる
  function startEnding() {
    mode = 'ending'; busy = true; queued = null; thought = null;
    const id = g.decideEnding();
    try { g.save && g.save(); } catch (e) {}
    playEnding(id);
  }
  function resumeEnding(id) {
    resetScene(); fish.vis = true; fish.x = 80; fish.y = 110; mode = 'ending'; busy = true;
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
      if (id !== 'duck') {
        const beats = [0.55, 0.5, 0.42, 0.36, 0.3, 0.24, 0.19, 0.15, 0.12, 0.1, 0.09, 0.08];
        for (let k = 0; k < beats.length; k++) {
          const after = k % 2 === 1;
          applyLook(id, after, look);
          fx.push({ k: 'flash', t: T, d: 0.05 });
          sfx(after ? 'pet' : 'blink');
          yield beats[k];
        }
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
  function applyLook(id, on, look) {
    fish.opts = on ? Object.assign({ variant: id }, look) : {};
    fish.splitHead = on && id === 'split' ? SPLIT_AT : 0;
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
      // もう一つの頭が生えかけて…止まる
      fish.eyes = 'wide';
      for (let k = 0; k < 3; k++) {
        sfx('puff');
        yield* tween(0.45, p => { fish.splitHead = SPLIT_AT + Math.sin(p * Math.PI) * 0.12; fish.ox = Math.round(Math.sin(p * 40)); });
        yield 0.25;
      }
      fish.ox = 0; fish.splitHead = SPLIT_AT;
      fish.eyes = 'dizzy'; yield 0.7;
      fish.eyes = 'x'; sfx('death'); yield 0.6;
      yield* settleY(WATER + 12, 2);
    },
    *skeleton() { fish.eyes = 'x'; sfx('death'); yield* settleY(WATER + 10, 2.5); },
    *overeat() {
      for (let k = 0; k < 4; k++) { fish.ox = (k % 2) * 2; yield 0.4; }
      fish.ox = 0; fish.eyes = 'x'; sfx('death'); yield* settleY(FLOOR - 10, 2.5);
    },
    *cramped() {
      sfx('grow');
      for (let k = 0; k < 4; k++) { fish.ox = (k % 2) * 2 - 1; sfx('koton'); yield 0.35; }   // ガラスにつかえてもがく
      fish.ox = 0; fish.eyes = 'dizzy'; yield 1; fish.eyes = 'x'; sfx('death'); yield 1;
    },
    *fishman() {
      // 脚がぐんぐん伸びて底に立つ → 水の中で溺れる
      fish.eyes = 'wide'; fish.opts = { variant: 'fishman', legs: true, drown: true };
      for (let k = 0; k < 6; k++) { fish.oy = (k % 2) * -2; sfx('splash'); bubbles.push({ x: fish.x + fish.dir * 20, y: fish.y - 4, r: 2, vy: -14 }); yield 0.35; }
      fish.oy = 0; fish.eyes = 'x'; sfx('death'); yield 1.5;
    },
    *oldage() {
      fish.eyes = 'sleepy'; yield 1.5; fish.eyes = 'x'; sfx('death');
      fish.opts = Object.assign({}, fish.opts, { flip: true });
      yield* settleY(WATER + 10, 3);
    },
  };
  Object.assign(ENDINGS, {
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
    *bald() {               // ストレスで、うろこがはらはら
      fish.eyes = 'teary';
      for (let i = 0; i < 12; i++) scales.push({ x: fish.x + rnd(-14, 14), y: fish.y + rnd(-8, 8), vy: rnd(8, 16), vx: rnd(-6, 6), rot: rnd(0, 6), t: T + i * 0.15 });
      yield 2.4; fish.eyes = 'x'; sfx('death');
      yield* settleY(WATER + 10, 2.5);
    },
    *hermit() {             // 人間不信で砂の中へ
      sfx('splash'); fish.x = 80;
      yield 3.5;
    },
    *idol() {               // アイドルとして燃え尽きる
      spot = { x: fish.x, y: fish.y };
      fish.eyes = 'sparkle'; sfx('dance');
      yield* tween(2.2, p => { fish.oy = -Math.round(Math.abs(Math.sin(p * Math.PI * 6)) * 5); if ((p * 12 | 0) % 3 === 0) fish.sq = 0.5; });
      sfx('dance'); yield 0.8;
      fish.oy = 0; fish.eyes = 'x'; sfx('death');
      yield* settleY(WATER + 10, 2.5);
    },
    *round() {              // まんまるになって、ころころ
      const x0 = fish.x;
      yield* tween(1.8, p => { fish.x = x0 + Math.sin(p * Math.PI * 2) * 30; fish.rot = Math.sin(p * Math.PI * 2) * 30 / 14; fish.oy = -Math.round(Math.abs(Math.sin(p * Math.PI * 4)) * 3); });
      fish.rot = 0; fish.oy = 0; fish.x = x0; fish.eyes = 'closed'; yield 1; fish.eyes = 'x'; sfx('death');
      yield* settleY(WATER + 12, 2.5);
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
    T += dt;
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
    if (T > fish.blinkAt) { fish.blinkUntil = T + 0.12; fish.blinkAt = T + rnd(1.8, 4.5) + (Math.random() < 0.2 ? -1.6 : 0); }
    for (let i = timers.length - 1; i >= 0; i--) if (T >= timers[i][0]) { const f = timers[i][1]; timers.splice(i, 1); f(); }

    const idle = mode === 'play' && !busy && fish.vis;
    if (!idle && gest) endGesture();
    if (!idle) gestAt = Math.max(gestAt, T + rnd(8, 14));   // 世話のあとはしばらく泳ぐ
    if (idle && !gest && T > gestAt && !(fish.wps && fish.wps.length)) {
      gestAt = T + rnd(14, 26);
      if (Math.random() < 0.65) startGesture();
    }
    if (idle && gest) stepGesture(dt);
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
      if (T > hintAt) {
        hintAt = T + rnd(5, 8);
        let icon = WANT_ICON[s.want] || null;
        if (s.satiety <= 3) icon = 'food';
        else if (s.dirt >= 3) icon = 'dirty';
        else if (s.stress >= 75) icon = 'angry';
        if (icon && !(thought && thought.until > T)) thought = { icon, until: T + 2.5 };
      }
    }
    try { g.tick(dt, idle); } catch (e) {}
    if (mode === 'play' && A.song && A.song !== 'card') {   // 状態で曲を切りかえる（数秒ごとに判定）
      if (!(T < songCheckAt)) {
        songCheckAt = T + 3;
        const st = g.s, pinch = st.satiety <= 2 || st.dirt >= 4 || st.stress >= 85;
        const good = !pinch && st.stress <= 15 && st.satiety >= 8 && st.dirt <= 1;
        A.setSong(pinch ? 'tense' : good ? 'happy' : 'main');
      }
    }
    stepWaves(dt); watchSurface();
    updateVisitor(dt, idle);

    // 餌
    for (let i = pellets.length - 1; i >= 0; i--) {
      const p = pellets[i];
      if (p.y < FLOOR + 4) { const py0 = p.y; p.y += p.vy * dt; if (py0 < WATER && p.y >= WATER) { splashAt(p.x, 5); if (Math.random() < 0.5) sfx('chapon'); } p.ph += dt * 3; p.x += Math.sin(p.ph) * 4 * dt; if (p.y >= FLOOR + 4) p.y = FLOOR + 4; }
      else if (!p.mine) { p.rot += dt; if (p.rot >= 5) { pellets.splice(i, 1); try { g.pelletRotted(); } catch (e) {} } }
    }
    for (const q of poops) { if (q.y < FLOOR + 5) q.y = Math.min(FLOOR + 5, q.y + q.vy * dt); }
    for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; b.y += b.vy * dt; b.x += Math.sin(T * 3 + i) * 3 * dt; if (b.y < WATER) bubbles.splice(i, 1); }
    // エアストーンからの泡の柱
    if ((mode === 'play' || mode === 'dead' || mode === 'ending') && Math.random() < dt * 7) bubbles.push({ x: AIR_X + rnd(-2, 2), y: FLOOR + 1, r: Math.random() < 0.3 ? 2 : 1, vy: rnd(-34, -24), amb: true, air: true });
    // 環境の泡
    if (Math.random() < dt * 0.6 && mode !== 'card' && mode !== 'zukan') bubbles.push({ x: rnd(20, 150), y: FLOOR, r: Math.random() < 0.5 ? 1 : 2, vy: rnd(-12, -6), amb: true });
    fx = fx.filter(f => T - f.t < f.d + 0.01 || T < f.t);
    if (mode === 'dead' && causeId === 'bug' && fish.vis && Math.random() < dt * 2) { sfx('pu'); puText = T + 0.4; }
  }

  // ---------------- 描画 ----------------
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    if (mode === 'title' || mode === 'boot') { renderTitle(); return; }
    const dirt = g.s.dirt | 0;
    S.drawTank(ctx, T, dirt);
    if (wipes && wipes.length) {
      ctx.save(); ctx.beginPath();
      for (const w of wipes) { ctx.moveTo(w.x + w.r, w.y); ctx.arc(w.x, w.y, Math.max(0.1, w.r), 0, Math.PI * 2); }
      ctx.clip(); S.drawTank(ctx, T, wipeDirt); ctx.restore();
    }
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
    if (hoop && S.drawFingerHoop) S.drawFingerHoop(ctx, Math.round(hoop.x), Math.round(hoop.y), T);
    if (net && S.drawNetBack) S.drawNetBack(ctx, Math.round(net.x), Math.round(net.y), { t: T, tilt: net.tilt || 0, sag: net.sag || 0, wet: net.wet, drip: net.drip });
    if (eyeball) S.drawEyeball(ctx, Math.round(eyeball.x), Math.round(eyeball.y));
    drawFishEnt();
    if (bigBubble) S.drawBubble(ctx, Math.round(bigBubble.x), Math.round(bigBubble.y), Math.round(bigBubble.r));
    if (duck) S.drawDuck(ctx, Math.round(duck.x), Math.round(duck.y + Math.sin(T * 2) * 1), T);
    if (feather) S.drawFeather(ctx, Math.round(feather.x), Math.round(feather.y), feather.rot);
    if (spot && S.drawSpotlight) S.drawSpotlight(ctx, Math.round(spot.x), Math.round(spot.y), T);
    if (crack && S.drawCrack) S.drawCrack(ctx, crack.x, crack.y, crack.size);
    if (smear && S.drawSmear) S.drawSmear(ctx, smear.x, smear.y, smear.size);
    for (const sc of scales) if (T >= sc.t && S.drawScale) { const tt = T - sc.t; S.drawScale(ctx, Math.round(sc.x + sc.vx * tt + Math.sin(tt * 4) * 3), Math.round(Math.min(FLOOR + 6, sc.y + sc.vy * tt)), sc.rot + tt * 3); }
    if (soul && S.drawSoul) S.drawSoul(ctx, Math.round(soul.x), Math.round(soul.y), T);
    if (carry) drawTreasure(carry, Math.round(mouthX() + fish.face * 2), Math.round(fish.y + 3));
    drawVisitorFront();
    if (finger) drawFinger(Math.round(finger.x), Math.round(finger.y));
    if (ball && S.drawBall) S.drawBall(ctx, Math.round(ball.x), Math.round(ball.y), T);
    if (paw) S.drawCatPaw(ctx, Math.round(paw.x), Math.round(paw.y), { fish: !!paw.fish, t: T });
    if (nozzle) S.drawNozzle(ctx, Math.round(nozzle.x), Math.round(nozzle.y), { suck: true, tail: !fish.vis, t: T });
    if (brush) { ctx.save(); ctx.translate(Math.round(brush.a), 0); S.drawBrush(ctx, Math.round(brush.x), Math.round(brush.y), T); ctx.restore(); }
    if (net) {
      if (S.drawNetFront) S.drawNetFront(ctx, Math.round(net.x), Math.round(net.y), { t: T, tilt: net.tilt || 0, sag: net.sag || 0, wet: net.wet, drip: net.drip });
      else S.drawNet(ctx, Math.round(net.x), Math.round(net.y), (net.sag || 0) > 0.5);
    }
    for (const f of fx) drawFx(f);
    if (bigFace && S.drawBigFace) S.drawBigFace(ctx, bigFace.p, T);
    if (puText > T && fish.vis) { ctx.fillStyle = '#1d4d4a'; ctx.font = '10px sans-serif'; ctx.fillText('ぷ', Math.round(fish.x + rnd(14, 22)), Math.round(fish.y - 16)); }
    if (thought && thought.until > T && fish.vis && (mode === 'play')) {
      const tx = clamp(fish.x + fish.dir * 18, 30, 130), ty = clamp(fish.y - 30, 32, 200);
      S.drawThought(ctx, Math.round(tx), Math.round(ty), thought.icon);
    }
    S.drawGauge(ctx, g.s.gauge, 25);
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
        S.drawCard(ctx, cause(causeId), cardNew);
        const pe = g.persona && g.persona();
        ctx.fillStyle = '#fff8e0'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(g.s.fishNo + '匹目' + (pe ? '　' + pe.name + 'な金魚でした' : ''), 80, 34); ctx.textAlign = 'left';
        if (T - cardT >= 4 && ((T * 1.5) | 0) % 2 === 0) {
          ctx.fillStyle = '#fff8e0'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('網:図鑑  ほか:つぎの魚', 80, 200); ctx.textAlign = 'left';
        }
      } else {
        const z = g.s.zukan; const ids = z ? (z.has ? [...z] : z) : [];
        S.drawZukan(ctx, ids, L.CAUSES, L.CAUSES.findIndex(c => c.id === causeId));
      }
    }
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
    const x = AIR_X, y = FLOOR + 5;
    px(x - 5, y - 3, TCOL.line, 11, 5); px(x - 4, y - 2, '#5a6e78', 9, 3); px(x - 3, y - 2, '#8fa2ab', 3, 1);
    px(x + 5, y, TCOL.line, 14, 1);   // チューブ
  }

  // ---------------- おなか・ストレス・よごれ（画面下の帯） ----------------
  function drawStatus() {
    const s = g.s, y = 228;
    ctx.fillStyle = 'rgba(255,248,224,0.88)'; ctx.fillRect(2, y - 4, 156, 14);
    ctx.fillStyle = '#1d4d4a'; ctx.fillRect(2, y - 5, 156, 1); ctx.fillRect(2, y + 10, 156, 1);
    const blinkOn = ((T * 3) | 0) % 2 === 0;
    const bar = (x, w, v, col, warn) => {
      ctx.fillStyle = '#1d4d4a'; ctx.fillRect(x - 1, y, w + 2, 6);
      ctx.fillStyle = '#d9cfb6'; ctx.fillRect(x, y + 1, w, 4);
      ctx.fillStyle = warn && blinkOn ? '#e0453a' : col; ctx.fillRect(x, y + 1, Math.round(w * clamp(v, 0, 1)), 4);
    };
    // おなか：粒アイコン＋バー
    ctx.fillStyle = '#1d4d4a'; ctx.fillRect(5, y, 6, 6); ctx.fillStyle = '#c98a3a'; ctx.fillRect(6, y + 1, 4, 4); ctx.fillStyle = '#f2c27a'; ctx.fillRect(6, y + 1, 2, 1);
    const hunger = 1 - s.satiety / L.SATIETY_MAX;   // 空腹：食べたら0に戻る
    bar(14, 36, hunger, hunger < 0.5 ? '#f0b030' : hunger < 0.8 ? '#f08a30' : '#e0453a', hunger >= 0.83);
    // ストレス：怒りマーク＋バー（緑→黄→赤）
    const sx = 58;
    ctx.fillStyle = '#e0453a'; ctx.fillRect(sx, y, 2, 2); ctx.fillRect(sx + 4, y, 2, 2); ctx.fillRect(sx, y + 4, 2, 2); ctx.fillRect(sx + 4, y + 4, 2, 2); ctx.fillRect(sx + 2, y + 2, 2, 2);
    const st = s.stress / 100;
    bar(sx + 9, 36, st, st < 0.4 ? '#5bbf5a' : st < 0.75 ? '#e8b730' : '#e0453a', s.stress >= 75);
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
    const gg = g.s.gauge, stage = gg < 9 ? 1 : gg < 18 ? 2 : 3;
    if (fish.inNet) {
      const o2 = Object.assign({ dir: fish.face, t: T, eyes: fish.eyes, mouth: 'o', stage }, fish.opts, { scale: 0.8, rot: fish.face * 0.3 + (net ? net.tilt || 0 : 0) + Math.sin(T * 9) * 0.06 });
      if (!fish.opts.dragon) S.drawFish(ctx, Math.round(fish.x), Math.round(fish.y), o2);
      return;
    }
    const o = Object.assign({ dir: fish.face, t: T, mouth: fish.mouth, eyes: fish.eyes, stage }, fish.opts);
    if (fish.turnP > 0) o.turn = fish.turnP;
    if (!fish.opts.scale && !fish.rot && !fish.splitHead) { o.sx = Math.round(fish.sx * 20) / 20; o.sy = Math.round(fish.sy * 20) / 20; }
    if (!fish.opts.variant && mode !== 'dead') {
      const ex = fish.ex;
      for (const k of ['eyes', 'mouth', 'brows', 'mark', 'front', 'wag', 'cheeks', 'blush', 'sweat']) if (ex[k] != null) o[k] = ex[k];
      if (T < fish.chewUntil) { o.cheeks = true; o.chew = ((fish.chewUntil - T) * 3.2) % 1; o.mouth = 0; }
      if (o.eyes === 'normal' && T < fish.blinkUntil) o.eyes = 'blink';
    }
    if (fish.rot) o.rot = fish.rot;
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
    if (fish.hermit && S.drawHermit) { S.drawHermit(ctx, x, FLOOR + 6, T); return; }
    if (fish.splitHead > 0) {
      // 体のうしろから、逆向きの頭がもう一つ生えてくる
      S.drawFish(ctx, x, y, o);
      const sc = Math.round((0.35 + 0.65 * fish.splitHead) * 20) / 20;
      ctx.save(); ctx.beginPath();
      if (o.dir > 0) ctx.rect(0, 0, x + 1, H); else ctx.rect(x, 0, W - x, H);
      ctx.clip();
      S.drawFish(ctx, x, y, Object.assign({}, o, { dir: -o.dir, scale: sc, turn: 0, sx: 1, sy: 1 }));
      ctx.restore();
      return;
    }
    S.drawFish(ctx, x, y, o);
  }

  function drawFx(f) {
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
    if (f.k === 'rainbow') {
      const cols = ['#ff5a5a', '#ffa23c', '#ffe14a', '#5bd36a', '#4ab8ff', '#9a6bff'];
      ctx.globalAlpha = 0.28 * (1 - a);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(0, 24 + i * 32 + Math.round(Math.sin(T * 6 + i) * 4), W, 32); }
      ctx.globalAlpha = 1;
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
    if (f.k === 'heart') {
      const tt = T - f.t; ctx.globalAlpha = 1 - a; ctx.fillStyle = '#ff5a86';
      const x = Math.round(f.x + f.vx * tt), y = Math.round(f.y - tt * 18);
      ctx.fillRect(x - 2, y, 2, 2); ctx.fillRect(x + 1, y, 2, 2); ctx.fillRect(x - 2, y + 1, 5, 2); ctx.fillRect(x - 1, y + 3, 3, 1); ctx.fillRect(x, y + 4, 1, 1);
      ctx.globalAlpha = 1;
    }
    if (f.k === 'badge') {
      const rise = Math.min(1, (T - f.t) * 4);
      ctx.globalAlpha = a > 0.8 ? (1 - a) * 5 : 1;
      if (S.drawBadge) S.drawBadge(ctx, 80, Math.round(48 - (1 - rise) * 8), f.s);
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
  let last = performance.now(), alive = true;
  function frame(now) {
    if (!alive) return;
    let dt = Math.min(0.1, (now - last) / 1000) * SPEED; last = now;
    const n = Math.max(1, Math.ceil(dt / 0.05));
    for (let i = 0; i < n; i++) update(dt / n);
    if (director) stepDirector(dt);
    render();
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
  const TOUCH_OF = { cat: 'pet', bird: 'jump', dizzy: 'spin', bubblegone: 'bubble', floataway: 'puff' };
  function demoGesture(name) {
    g.newFish = (orig => () => { orig(); g.s.phase = 'alive'; return { instantDeath: false }; })(g.newFish.bind(g));
    director = { wait: 0, cond: null, it: (function* () {
      nextFish();
      yield () => !busy;
      for (;;) {
        gestAt = T + 999;
        if (name === 'feed') { runAction('feed'); yield () => !busy; g.s.satiety = 0; yield 1.5; continue; }
        if (name === 'swim') { yield 4; continue; }
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
  }
  function demo(id) {
    const c = cause(id), o = {};
    ['newFish', 'startFeed', 'startClean', 'startTouch', 'net', 'decideEnding'].forEach(k => { o[k] = g[k].bind(g); });
    g.newFish = () => { const r = o.newFish(); if (id === 'instant') { g.s.phase = 'dead'; return { instantDeath: true }; } g.s.phase = 'alive'; return { instantDeath: false }; };
    g.startFeed = n => Object.assign(o.startFeed(n), { willEat: true, accident: id });
    g.startClean = () => { g.s.dirt = Math.max(2, g.s.dirt); return Object.assign(o.startClean(), { effective: true, accident: id }); };
    g.startTouch = () => { g.s.satiety = 6; o.startTouch(); return { hungry: false, reaction: TOUCH_OF[id], accident: id }; };
    g.net = () => ({ caught: true, smug: false });
    g.decideEnding = () => { o.decideEnding(); g.s.cause = id; g.s.phase = 'ending'; return id; };
    const ACT = { poison: 'feed', frozen: 'feed', flower: 'feed', burnt: 'feed', shock: 'feed', sucked: 'clean', overpolished: 'clean',
      cat: 'touch', bird: 'touch', dizzy: 'touch', bubblegone: 'touch', floataway: 'touch', netted: 'net' };
    director = { wait: 0, cond: null, it: (function* () {
      for (;;) {
        nextFish(); gestAt = T + 999;
        yield () => mode !== 'play' || !busy;
        if (id !== 'instant') {
          yield 1.2;
          if (c.kind === 'ending') {
            if (id === 'moss') g.s.dirt = 4;
            g.s.gauge = 25; startEnding();
          } else if (GDEATH_GEST[id]) { gestAt = T + 999; g.gestureAccident = () => id; if (id === 'nowake' || id === 'overhere') g.s.stress = 20; playGesture(GDEATH_GEST[id]); }
          else runAction(ACT[id]);
        }
        yield () => (mode === 'dead' && netReady) || mode === 'card';
        if (mode === 'dead') { yield 1.6; collect(); yield () => mode === 'card'; }
        yield 2.4;
      }
    })() };
  }

  if (cfg.main) { window.addEventListener('resize', fit); fit(); }
  if (cfg.demo) { mode = 'play'; if (cfg.demo.startsWith('g:')) demoGesture(cfg.demo.slice(2)); else demo(cfg.demo); }
  requestAnimationFrame(frame);

  const api = { g, press, get gest() { return !!gest; }, get fish() { return fish; }, get pellets() { return pellets; }, get queued() { return queued; }, get mode() { return mode; }, get busy() { return busy; }, get cause() { return causeId; },
    step: dt => { update(dt); if (director) stepDirector(dt); render(); }, stop: () => { alive = false; } };
  if (cfg.main) window.__gf = api;
  return api;
 }
 return { mount };
})();
if (typeof window !== 'undefined' && !window.GF_NO_AUTOMOUNT && document.getElementById('screen')) GoldfishGame.mount(document.getElementById('screen'), { main: true });
