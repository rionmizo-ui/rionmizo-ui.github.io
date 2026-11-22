"""ヘッドレスで遊んでみて、エラーと画面を確認する"""
import sys, pathlib, json
from playwright.sync_api import sync_playwright

d = pathlib.Path(__file__).parent
out = d / 'shots'; out.mkdir(exist_ok=True)
url = (d / 'index.html').as_uri()
errors = []

def run(page, sec):
    # ゲーム内時間を sec 秒進める（描画込み）
    page.evaluate(f"(()=>{{for(let i=0;i<{int(sec*30)};i++) window.__gf.step(1/30);}})()")

def press(page, b): page.evaluate(f"window.__gf.press('{b}')")
def shot(page, name): page.screenshot(path=str(out / f'{name}.png'))
def st(page): return page.evaluate("({mode:__gf.mode,busy:__gf.busy,cause:__gf.cause,gauge:__gf.g.s.gauge,sat:__gf.g.s.satiety,dirt:__gf.g.s.dirt,stress:__gf.g.s.stress,phase:__gf.g.s.phase})")

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True)
    page = b.new_page(viewport={'width': 480, 'height': 860})
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    page.on('console', lambda m: m.type == 'error' and errors.append('console: ' + m.text))
    page.goto(url + '?fresh=1&speed=0')
    page.wait_for_timeout(300)
    shot(page, '00_title')
    # 事故なしで進めたいので乱数を固定気味に
    page.evaluate("Math.random = (()=>{let s=7;return ()=>{s=(s*16807)%2147483647;const r=s/2147483647;return r<0.06?r+0.06:r;};})()")
    press(page, 'feed'); run(page, 0.8); shot(page, '01_boot')
    run(page, 5); shot(page, '02_entered'); print('entered', st(page))
    press(page, 'feed'); run(page, 1.2); shot(page, '03_feeding')
    run(page, 6); print('after feed', st(page))
    press(page, 'clean'); run(page, 1.5); shot(page, '04_cleaning'); run(page, 4)
    press(page, 'touch'); run(page, 0.8); shot(page, '05_touch'); run(page, 4)
    press(page, 'net'); run(page, 0.4); shot(page, '06_net'); run(page, 3)
    print('after 4 actions', st(page))
    # 予約の確認
    press(page, 'touch'); run(page, 0.2); press(page, 'feed'); press(page, 'clean'); shot(page, '07_queued'); run(page, 12)
    # 満タンまで回す
    seq = ['feed', 'touch', 'clean', 'touch', 'feed', 'touch']
    i = 0
    for k in range(80):
        s = st(page)
        if s['mode'] != 'play': break
        if not s['busy']:
            press(page, seq[i % len(seq)]); i += 1
        run(page, 1.5)
    print('reached', st(page)); shot(page, '08_ending_start')
    run(page, 3); shot(page, '09_ending_mid')
    for k in range(20):
        if st(page)['mode'] == 'dead': break
        run(page, 1)
    run(page, 2); shot(page, '10_wait_net')
    press(page, 'net'); run(page, 0.7); shot(page, '11_collect'); run(page, 2)
    print('card', st(page)); shot(page, '12_card')
    run(page, 4.5); press(page, 'net'); run(page, 0.2); shot(page, '13_zukan')
    press(page, 'feed'); run(page, 0.2); press(page, 'feed'); run(page, 4); print('next fish', st(page))

    # 途中死の演出を一通り（乱数を0.001にして事故を起こす）
    for act, label in [('feed', 'acc_feed'), ('clean', 'acc_clean'), ('touch', 'acc_touch'), ('net', 'acc_net')]:
        for k in range(30):
            if st(page)['mode'] == 'play' and not st(page)['busy']: break
            if st(page)['mode'] in ('card', 'zukan', 'dead'):
                press(page, 'net'); run(page, 3); press(page, 'feed'); run(page, 5.5)
            run(page, 0.5)
        if act == 'clean':
            page.evaluate("__gf.g.s.dirt = 2")
        page.evaluate("window.__R = Math.random; Math.random = () => 0.001")
        press(page, act); run(page, 0.3)
        page.evaluate("Math.random = window.__R")
        run(page, 2.5); shot(page, label + '_a'); run(page, 3); shot(page, label + '_b')
        print(label, st(page))
        for k in range(10):
            if st(page)['mode'] == 'dead': break
            run(page, 1)
        press(page, 'net'); run(page, 3); shot(page, label + '_card'); print(' ->', st(page))
        run(page, 4.5); press(page, 'feed'); run(page, 6)

    # 乱打ストレステスト
    page.evaluate("""(()=>{const bs=['feed','clean','touch','net'];for(let i=0;i<6000;i++){ if(Math.random()<0.15) __gf.press(bs[Math.random()*4|0]); __gf.step(1/20);} })()""")
    print('fuzz done', st(page))
    shot(page, '99_fuzz')
    b.close()

print('ERRORS:', json.dumps(errors[:20], ensure_ascii=False) if errors else 'none')
