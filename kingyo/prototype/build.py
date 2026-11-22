import pathlib
d = pathlib.Path(__file__).parent
src = {k: (d / f).read_text(encoding='utf-8').replace('</script>', '<\\/script>')
       for k, f in [('LOGIC', 'logic.js'), ('SPRITES', 'sprites.js'), ('MAIN', 'main.js')]}
for shell, out in [('shell.html', 'index.html'), ('gallery_shell.html', 'gallery.html')]:
    html = (d / shell).read_text(encoding='utf-8')
    for k, v in src.items():
        html = html.replace(f'/*{k}*/', v)
    (d / out).write_text(html, encoding='utf-8')
    print('built', out, len(html))
