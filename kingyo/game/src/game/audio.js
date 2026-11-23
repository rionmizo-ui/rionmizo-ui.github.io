// audio.js — 音（WebAudio 合成の効果音と BGM）
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import { rnd } from './util.js';

export default function install(G) {
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
  }; Object.assign(G, { A });
  const sfx = n => A.play(n); Object.assign(G, { sfx });
}
