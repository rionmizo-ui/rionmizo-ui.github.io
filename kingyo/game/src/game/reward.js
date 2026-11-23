// reward.js — 気分ボーナス・コンボの表示と左上のランプ
// （prototype/main.js の mount() から分けたもの。共有する状態と関数は G に載せる）
import S from '../art/sprites.js';

export default function install(G) {
  Object.assign(G, { reward, drawLamps });
  const { ctx, fish, g, sfx } = G;

  // ---------------- 気分ボーナスとコンボ ----------------
  G.celebrate = false;
  function reward(out) {
    if (!out) return;
    if (out.wantMet) {
      sfx('card'); fish.sq = 1;
      G.fx.push({ k: 'text', s: 'きぶん +1', x: fish.x, y: fish.y - 22, t: G.T, d: 1.2, c: '#ff9a3c' });
      G.thought = { icon: 'heart', until: G.T + 1.2 };
    }
    if (out.combo) {
      sfx('fanfare'); G.celebrate = true; G.thought = null;
      G.fx.push({ k: 'text', s: 'コンボ！ +1', x: 80, y: 60, t: G.T + 0.2, d: 1.6, c: '#ff5aa0', big: true });
      G.fx.push({ k: 'rainbow', t: G.T, d: 1.0 });
      lampFlash = G.T + 1.2;
    }
  }
  let lampFlash = 0;
  const WANT_ICON = { feed: 'food', clean: 'dirty', touch: 'heart' }; Object.assign(G, { WANT_ICON });
  // 左上の3つのランプ：点灯＝コンボの進み具合、オレンジの枠＝魚がいま欲しい世話
  function drawLamps() {
    const s = g.s, kinds = ['feed', 'clean', 'touch'], icons = { feed: 'food', clean: 'clean', touch: 'touch' };
    for (let i = 0; i < 3; i++) {
      const k = kinds[i], x = 16 + i * 15, y = 3;
      const lit = (s.combo || []).includes(k) || G.T < lampFlash;
      const want = s.want === k;
      ctx.fillStyle = '#1d4d4a'; ctx.fillRect(x - 1, y - 1, 15, 15);
      ctx.fillStyle = lit ? (G.T < lampFlash && ((G.T * 8) | 0) % 2 ? '#ffd6ea' : '#fff3c4') : '#9fc9bf'; ctx.fillRect(x, y, 13, 13);
      ctx.globalAlpha = lit ? 1 : 0.45;
      if (S.drawIcon) S.drawIcon(ctx, x + 6, y + 6, icons[k]);
      ctx.globalAlpha = 1;
      if (want && G.mode === 'play') {
        { ctx.fillStyle = Math.sin(G.T * 6) > 0 ? '#ff8a1c' : '#ffcf3a'; ctx.fillRect(x - 2, y - 2, 17, 2); ctx.fillRect(x - 2, y + 13, 17, 2); ctx.fillRect(x - 2, y, 2, 13); ctx.fillRect(x + 13, y, 2, 13); }
      }
    }
  }
}
