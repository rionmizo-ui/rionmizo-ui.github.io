// engine.js — 金魚1匹ぶんのルールエンジン（描画・タイマーなし。乱数は create({rng, aux}) で注入）
import { CAUSE_BY_ID, ENDING_RULES, GESTURE_ACC, P, INITIAL, STORAGE_KEY, GAUGE_MAX, SATIETY_MAX, FIELD_MAX, DIRT_MAX, STRESS_MAX, FEED_ACC, CLEAN_ACC, TOUCH_ACC, REACTIONS, PERSONAS } from './data.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function freshFish() {
  return {
    gauge: 0, satiety: INITIAL.satiety, dirt: 0, dirtAcc: 0, poopToDirt: 0, rotToDirt: 0,
    stress: INITIAL.stress, feeds: 0, polishes: 0, touches: 0,
    swimTime: 0, starveTime: 0, netEscapes: 0, smugCount: 0, touchStreak: 0, maxStress: 20, netCount: 0, fullTime: 0, sinceTouch: 0, want: 'feed', wantLeft: 25, combo: [], wantsMet: 0, combos: 0,
    totalEaten: 0, poopCount: 0, pelletCount: 0,
    okawariLeft: 0, okawariUsed: false, okawariFed: 0,
    bugPoints: 0, phase: 'alive', cause: null,
  };
}
const FISH_KEYS = Object.keys(freshFish());

function create(opts) {
  opts = opts || {};
  const rng = opts.rng || Math.random;
  const aux = opts.aux || Math.random;   // 性格・金の粒など、企画書の確率に関わらない抽選
  const storage = opts.storage || null;

  const s = Object.assign(freshFish(), { lastEnding: null, zukan: new Set(), fishNo: 0 });   // fishNo: 何匹目か（ずっと数える）
  let pendFeed = null, pendClean = null, pendTouch = null;
  let pressLog = {};   // button → [tSec...]

  const alive = () => s.phase === 'alive';
  function addDirt(n) { const b = s.dirt; s.dirt = clamp(s.dirt + n, 0, DIRT_MAX); return s.dirt > b; }
  function gaugeUp() { const b = s.gauge; s.gauge = clamp(s.gauge + 1, 0, GAUGE_MAX); return s.gauge > b; }
  // 魚の「いま欲しい世話」を選ぶ（状態で重みづけ、直前と同じものは選ばない）
  function pickWant() {
    const w = { feed: 1 + (s.satiety <= 6 ? 3 : 0), clean: s.dirt >= 1 ? 1 + s.dirt : 0.3, touch: 1 + (s.stress >= 50 ? 2 : 0) };
    const fav = { glutton: 'feed', clingy: 'touch', neat: 'clean' }[s.persona];
    if (fav) w[fav] *= 2.5;
    delete w[s.want];
    const keys = Object.keys(w); let x = rng() * keys.reduce((a, k) => a + w[k], 0);
    for (const k of keys) { if ((x -= w[k]) < 0) { s.want = k; break; } }
    s.wantLeft = 25;
  }
  // 世話が成功したときのボーナス：①気分に応えたら+1 ②3種類を一巡したら+1
  function careDone(kind, out) {
    if (s.want === kind) { out.wantMet = true; s.wantsMet++; gaugeUp(); pickWant(); }
    if (s.combo.includes(kind)) s.combo = [kind]; else s.combo.push(kind);
    if (s.combo.length === 3) { out.combo = true; s.combos++; s.combo = []; gaugeUp(); }
    return out;
  }

  const g = {
    s,

    newFish() {
      Object.assign(s, freshFish());
      s.fishNo = (s.fishNo || 0) + 1;
      pendFeed = pendClean = pendTouch = null;
      pressLog = {};
      const instantDeath = rng() < P.instant;
      s.persona = PERSONAS[Math.floor(aux() * PERSONAS.length)].id;
      if (instantDeath) { s.phase = 'dead'; s.cause = 'instant'; }
      return { instantDeath };
    },

    tick(dt, swimming) {
      const out = { dirtUp: false };
      if (!alive() || !(dt > 0)) return out;
      if (s.okawariLeft > 0) s.okawariLeft = Math.max(0, s.okawariLeft - dt);
      if (s.stress > s.maxStress) s.maxStress = s.stress;
      s.sinceTouch += dt;
      s.wantLeft -= dt; if (s.wantLeft <= 0) { pickWant(); out.wantChanged = true; }
      if (s.persona === 'neat' && s.dirt >= 3) s.stress = clamp(s.stress + dt * 0.5, 0, STRESS_MAX);   // きれいずきは汚れでイライラ
      if (!swimming) return out;
      s.swimTime += dt;
      if (s.satiety >= SATIETY_MAX - 3) s.fullTime += dt;
      const drop = dt / 10 * (s.persona === 'glutton' ? 1.3 : s.persona === 'lazy' ? 0.7 : 1);
      if (s.satiety >= drop) s.satiety -= drop;
      else { s.starveTime += dt - s.satiety * 10; s.satiety = 0; }
      s.dirtAcc += dt;
      while (s.dirtAcc >= 90) { s.dirtAcc -= 90; if (addDirt(1)) out.dirtUp = true; }
      return out;
    },

    // 3粒ずつ追加でき、画面に同時に出せるのは FIELD_MAX 粒まで
    canFeed(pelletsOnField) { return alive() && (pelletsOnField || 0) + 3 <= FIELD_MAX; },

    // pendingEdible: すでに場にあって、まだ食べていない「食べる予定」の粒数
    startFeed(pendingEdible) {
      pendingEdible = pendingEdible || 0;
      s.netEscapes = 0; s.touchStreak = 0;
      if (s.okawariLeft > 0 && !s.okawariUsed) { s.okawariLeft = 0; s.okawariUsed = true; s.okawariFed = 0; }
      const okaRoom = s.okawariUsed && s.okawariFed + pendingEdible + 3 <= 9;
      const willEat = s.satiety + pendingEdible + 3 <= SATIETY_MAX || okaRoom;
      let accident = null;
      if (willEat) {
        const r = rng();
        if (r < P.feedEach * FEED_ACC.length) accident = FEED_ACC[Math.floor(r / P.feedEach)];
      }
      pendFeed = { willEat, okawari: s.okawariUsed };
      const gold = willEat && !accident && aux() < 0.04;   // まれに金の粒（食べるとゲージ+2）
      return { willEat, accident, gold, pellets: 3, okawari: !!(s.okawariUsed && willEat) };
    },

    eatPellet() {
      const out = { poop: false, dirtUp: false };
      if (s.okawariUsed) {
        if (s.okawariFed >= 9) return out;  // おかわりは追加9粒まで
        s.okawariFed++;
      }
      s.satiety = Math.min(SATIETY_MAX, s.satiety + 1);
      s.totalEaten++;
      s.pelletCount++;
      if (s.pelletCount % 9 === 0) {
        out.poop = true;
        s.poopCount++;
        if (++s.poopToDirt >= 2) { s.poopToDirt = 0; out.dirtUp = addDirt(1); }
      }
      return out;
    },

    pelletRotted() {
      const out = { dirtUp: false };
      if (++s.rotToDirt >= 9) { s.rotToDirt = 0; out.dirtUp = addDirt(1); }
      return out;
    },

    // morePending: まだ食べ終わっていない別の組が場にあるか
    finishFeed(ateAll3, morePending) {
      const out = { okawari: false, gaugeUp: false };
      const wasOkawari = s.okawariUsed;
      pendFeed = null;
      if (!morePending) s.okawariUsed = false;
      if (!alive()) return out;
      if (ateAll3) {
        out.gaugeUp = gaugeUp();
        s.feeds++;
        careDone('feed', out);
        if (!wasOkawari && !morePending && rng() < 0.25) { out.okawari = true; s.okawariLeft = 10; }
      }
      return out;
    },

    startClean() {
      s.netEscapes = 0; s.touchStreak = 0;
      s.polishes++;
      const effective = s.dirt >= 1;
      let accident = null;
      if (effective) {
        const r = rng();
        if (r < P.cleanEach * CLEAN_ACC.length) accident = CLEAN_ACC[Math.floor(r / P.cleanEach)];
      }
      pendClean = { effective };
      return { effective, accident };
    },

    finishClean() {
      const out = { gaugeUp: false };
      const eff = pendClean ? pendClean.effective : s.dirt >= 1;
      pendClean = null;
      if (!alive()) return out;
      if (eff) { addDirt(-1); s.stress = clamp(s.stress + (s.persona === 'timid' ? 22 : 15), 0, STRESS_MAX); }
      else { s.stress = clamp(s.stress + 5, 0, STRESS_MAX); return out; }   // きれいなガラスを磨いてもゲージは増えない
      out.gaugeUp = gaugeUp();
      return careDone('clean', out);
    },

    // ふれあいばかり続けると飽きる：2回続いた後から、そっぽを向く確率が上がり、芸も出にくくなる
    // 4回目から 30%→50%→70%（上限）。あまえんぼうは1回遅い
    refuseChance() { const k = s.touchStreak - (s.persona === 'clingy' ? 1 : 0); return k >= 3 ? Math.min(0.7, 0.3 + 0.2 * (k - 3)) : 0; },
    startTouch() {
      s.netEscapes = 0;
      if (s.sinceTouch > 20) s.touchStreak = 0;   // しばらくふれあわなければ飽きは治る
      s.sinceTouch = 0;
      if (s.satiety <= 0) { pendTouch = { hungry: true }; return { hungry: true, reaction: null, accident: null }; }
      if (g.refuseChance() > 0 && rng() < g.refuseChance()) { pendTouch = { refused: true }; return { hungry: false, refused: true, reaction: null, accident: null }; }
      // 反応: pet の重みは 1 + stress/25 + 連続回数×1.5、他は各1
      const wPet = (s.touchStreak === 0 ? 0.5 : 1 + s.stress / 25 + s.touchStreak * 0.5) + (s.persona === 'lazy' ? 2 : 0);
      const wTrick = s.persona === 'showoff' ? 2 : 1;
      let x = rng() * (wPet + (REACTIONS.length - 1) * wTrick);
      let reaction = 'pet';
      if (x >= wPet) reaction = REACTIONS[1 + Math.min(REACTIONS.length - 2, Math.floor((x - wPet) / wTrick))];
      // 反応が決まってから、その反応の事故だけを2.5%で抽選（仕様2章）。追加の芸に事故はない
      const ai = REACTIONS.indexOf(reaction);
      const accident = rng() < P.touch && ai < TOUCH_ACC.length ? TOUCH_ACC[ai] : null;
      pendTouch = { hungry: false };
      return { hungry: false, reaction, accident };
    },

    finishTouch() {
      const out = { gaugeUp: false };
      const hungry = pendTouch ? pendTouch.hungry : s.satiety <= 0;
      const refused = !!(pendTouch && pendTouch.refused);
      pendTouch = null;
      if (refused) { s.stress = clamp(s.stress + 5, 0, STRESS_MAX); return out; }
      if (!alive() || hungry) return out;
      s.touchStreak++;
      out.gaugeUp = gaugeUp();
      s.touches++;
      careDone('touch', out);
      s.stress = clamp(s.stress - 15, 0, STRESS_MAX);
      s.satiety = Math.max(0, s.satiety - 1);
      return out;
    },

    net() {
      if (!alive()) return { caught: false, smug: false, ignored: true };
      s.netCount++;
      if (rng() < P.net) { s.netEscapes = 0; return { caught: true, smug: false }; }
      s.netEscapes++;
      let smug = false;
      if (s.netEscapes >= 3) { smug = true; s.smugCount++; s.netEscapes = 0; }
      return { caught: false, smug };
    },

    press(button, tSec) {
      const log = pressLog[button] || (pressLog[button] = []);
      log.push(tSec);
      while (log.length && tSec - log[0] > 1) log.shift();
      if (log.length >= 4) { s.bugPoints++; log.length = 0; return { bugPoint: true }; }
      return { bugPoint: false };
    },

    bugChance() { return Math.min(0.05, 0.01 + 0.01 * s.bugPoints); },

    // ひまなときのしぐさの事故（しぐさ1回につき P.gesture）
    gestureAccident(name) {
      const id = GESTURE_ACC[name];
      if (!id || !alive()) return null;
      return rng() < P.gesture ? id : null;
    },

    // 金の粒などのボーナス
    bonus(n) { let up = 0; for (let i = 0; i < n; i++) if (gaugeUp()) up++; return up; },
    persona() { return PERSONAS.find(p => p.id === s.persona) || null; },

    isFull() { return s.gauge >= GAUGE_MAX; },

    decideEnding() {
      if (s.stress > s.maxStress) s.maxStress = s.stress;
      let id = null;
      if (rng() < g.bugChance()) id = 'bug';
      else {
        const tiers = [...new Set(ENDING_RULES.map(r => r.tier))].sort((a, b) => a - b);
        for (const t of tiers) {
          const c = ENDING_RULES.filter(r => r.tier === t && r.test && r.test(s)).map(r => r.id);
          if (!c.length) continue;
          if (c.length === 1) { id = c[0]; break; }
          const w = c.map(x => (x === s.lastEnding ? 0.5 : 1));
          let x = rng() * w.reduce((a, b) => a + b, 0);
          id = c[c.length - 1];
          for (let i = 0; i < c.length; i++) { if (x < w[i]) { id = c[i]; break; } x -= w[i]; }
          break;
        }
      }
      s.phase = 'ending';
      s.cause = id;
      return id;
    },

    die(causeId) {
      s.phase = 'dead';
      s.cause = causeId;
      pendFeed = pendClean = pendTouch = null;
    },

    record(id) {
      const isNew = !!CAUSE_BY_ID[id] && !s.zukan.has(id);
      if (CAUSE_BY_ID[id]) s.zukan.add(id);
      s.lastEnding = id;
      if (s.phase === 'ending') s.phase = 'done';   // 札まで見届けたら再生し直さない
      g.save();
      return { isNew };
    },

    thought() {
      if (!alive()) return null;
      if (s.satiety <= 0) return 'food';
      if (s.dirt >= 3) return 'dirty';
      if (s.stress >= 80) return 'angry';
      if (s.stress <= 10) return 'heart';
      return null;
    },

    save() {
      if (!storage) return false;
      try {
        const fish = {};
        FISH_KEYS.forEach(k => { fish[k] = s[k]; });
        storage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, zukan: [...s.zukan], lastEnding: s.lastEnding, fishNo: s.fishNo, fish }));
        return true;
      } catch (e) { return false; }
    },

    load() {
      if (!storage) return false;
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const d = JSON.parse(raw);
        s.zukan = new Set((d.zukan || []).filter(id => CAUSE_BY_ID[id]));
        s.lastEnding = d.lastEnding || null;
        s.fishNo = d.fishNo || 0;
        if (d.fish) FISH_KEYS.forEach(k => { if (k in d.fish) s[k] = d.fish[k]; });
        pendFeed = pendClean = pendTouch = null;
        return true;
      } catch (e) { return false; }
    },
  };
  return g;
}


export { create, freshFish };
