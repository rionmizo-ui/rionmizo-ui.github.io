# endlooks/ の画像から「金魚の結末の姿」ページ（ENDLOOKS.html）を作る
# python3 tools/endpage.py   （先に node tools/endlooks.js out/sample.full.html endlooks）
import json, base64, html, re
idx = json.load(open('endlooks/index.json'))
deaths = open('DEATHS.md').read()


def how(no):
    m = re.search(r"^%02d\. \*\*[^*]+\*\*（([^）]*)）\n    - (?:条件：)?([^\n]*)" % no, deaths, re.M)
    return (m.group(1), m.group(2)) if m else ('', '')


ART = {'overeat', 'split', 'dragon', 'fishman', 'giant', 'possessed', 'skeleton', 'catfish', 'squashed', 'cat', 'loach', 'overpolished', 'stone', 'oldage', 'sushi', 'pigeon', 'bird'}
uri = lambda f: 'data:image/png;base64,' + base64.b64encode(open('endlooks/' + f, 'rb').read()).decode()
items = []
for it in idx:
    tag, h = how(it['no'])
    fs = {k: [f for f in it['files'] if f.endswith('_' + k + '.png')] for k in ['zoom', 'screen', 'fish', 'card']}
    figs = ''.join('<figure><img src="%s" alt="%s"><figcaption>%s</figcaption></figure>' % (uri(fs[k][0]), html.escape(it['name'] + ' ' + lab), lab)
                   for k, lab in [('zoom', '最後の瞬間（拡大）'), ('fish', '金魚だけ（透明）'), ('card', '札'), ('screen', '画面')] if fs[k])
    done = '<span class="done">ユーザーの絵あり</span>' if it['id'] in ART else ''
    items.append('<li class="row %s" data-kind="%s"><div class="head"><p class="no">No.%02d・%s・%s %s</p><h2>%s <code>%s</code></h2><p class="how">%s</p></div><div class="figs">%s</div></li>' % (
        it['kind'], it['kind'], it['no'], 'しいん' if it['kind'] == 'sudden' else 'けつまつ', html.escape(tag), done, html.escape(it['name']), it['id'], html.escape(h), figs))
nS = sum(1 for i in idx if i['kind'] == 'sudden'); nE = len(idx) - nS
page = open('tools/endpage.template.html').read()
page = page.replace('{{N}}', str(len(idx))).replace('{{NS}}', str(nS)).replace('{{NE}}', str(nE)).replace('{{ITEMS}}', ''.join(items))
open('ENDLOOKS.html', 'w').write(page)
print(len(page))
