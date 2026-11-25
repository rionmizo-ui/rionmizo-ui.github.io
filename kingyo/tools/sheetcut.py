# ユーザーの絵（4列×3段のコマ表）を、ゲームのドットの大きさのコマ列（横1列のPNG）にする
# python3 tools/sheetcut.py 入力.png 出力.png 目標幅(1コマ目の幅) [列 段] [--pick 0,1,2...] [--colors 16]
import sys
from PIL import Image

OUT_LINE = (42, 20, 8)   # こげ茶の輪郭（ゲームの FK）


def load(path):
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    px = im.load()
    # 白い背景は、外側からつながっている白だけを透明にする（白目は残す）
    corner = px[3, 3]
    if corner[3] > 0:
        from collections import deque
        seen = bytearray(W * H)
        q = deque()
        for x in range(W):
            q.append((x, 0)); q.append((x, H - 1))
        for y in range(H):
            q.append((0, y)); q.append((W - 1, y))
        while q:
            x, y = q.popleft()
            i = y * W + x
            if seen[i]:
                continue
            seen[i] = 1
            r, g, b, a = px[x, y]
            if a == 0 or (r > 228 and g > 228 and b > 228):
                px[x, y] = (0, 0, 0, 0)
                if x > 0: q.append((x - 1, y))
                if x < W - 1: q.append((x + 1, y))
                if y > 0: q.append((x, y - 1))
                if y < H - 1: q.append((x, y + 1))
    return im


def splits(counts, n, lo, hi):
    # 何もない列（行）のつながりのうち、広いもの n-1 個で区切る
    gaps = []; i = lo
    while i < hi:
        if counts[i] == 0:
            j = i
            while j < hi and counts[j] == 0: j += 1
            if i > lo and j < hi: gaps.append((j - i, (i + j) // 2))
            i = j
        else: i += 1
    gaps.sort(reverse=True)
    cut = sorted(g[1] for g in gaps[:n - 1])
    return [lo] + cut + [hi]


def cells(im, cols, rows):
    W, H = im.size
    if cols == 1 and rows == 1: return [im]
    a = im.split()[3].point(lambda v: 1 if v > 128 else 0)
    ap = a.load()
    rc = [sum(ap[x, y] for x in range(0, W, 2)) for y in range(H)]
    ys = splits(rc, rows, 0, H)
    out = []
    for r in range(rows):
        y0, y1 = ys[r], ys[r + 1]
        cc = [sum(ap[x, y] for y in range(y0, y1, 2)) for x in range(W)]
        xs = splits(cc, cols, 0, W)
        for c in range(cols):
            # すき間で区切った絵を、マス目の位置を基準にした同じ大きさの窓に置く（コマどうしの位置がずれない）
            gx, gy = round(c * W / cols), round(r * H / rows)
            pad = round(W / cols * 0.4)
            win = Image.new('RGBA', (round(W / cols) + 2 * pad, round(H / rows) + 2 * pad), (0, 0, 0, 0))
            win.paste(im.crop((xs[c], y0, xs[c + 1], y1)), (xs[c] - gx + pad, y0 - gy + pad))
            out.append(win)
    return out


def bbox(im):
    a = im.split()[3].point(lambda v: 255 if v > 128 else 0)
    return a.getbbox()


DARK = 200


def shrink(cell, box, k, dark_frac=0.26):
    x0, y0, x1, y1 = box
    tw, th = max(1, round((x1 - x0) * k)), max(1, round((y1 - y0) * k))
    src = cell.load()
    out = Image.new('RGBA', (tw, th), (0, 0, 0, 0))
    o = out.load()
    for ty in range(th):
        sy0 = y0 + int(ty / k); sy1 = max(sy0 + 1, y0 + int((ty + 1) / k))
        for tx in range(tw):
            sx0 = x0 + int(tx / k); sx1 = max(sx0 + 1, x0 + int((tx + 1) / k))
            n = op = dk = 0; rs = gs = bs = 0
            for sy in range(sy0, min(sy1, cell.size[1])):
                for sx in range(sx0, min(sx1, cell.size[0])):
                    n += 1
                    r, g, b, a = src[sx, sy]
                    if a <= 128:
                        continue
                    op += 1
                    if r + g + b < DARK:
                        dk += 1
                    else:
                        rs += r; gs += g; bs += b
            if n == 0 or op * 2 < n:
                continue
            if dk >= dark_frac * op or op == dk:
                o[tx, ty] = OUT_LINE + (255,)
            else:
                m = op - dk
                o[tx, ty] = (rs // m, gs // m, bs // m, 255)
    return out


def main():
    a = sys.argv[1:]
    src, dst, tw = a[0], a[1], float(a[2])
    cols, rows = 4, 3
    pick = None; ncol = 16; first = 0; boxmode = 'union'
    i = 3
    while i < len(a):
        if a[i] == '--grid': cols, rows = int(a[i + 1]), int(a[i + 2]); i += 3
        elif a[i] == '--pick': pick = [int(v) for v in a[i + 1].split(',')]; i += 2
        elif a[i] == '--colors': ncol = int(a[i + 1]); i += 2
        elif a[i] == '--ref': first = int(a[i + 1]); i += 2
        elif a[i] == '--dark':
            global DARK; DARK = int(a[i + 1]); i += 2
        else: i += 1
    im = load(src)
    cs = cells(im, cols, rows)
    if pick: cs = [cs[p] for p in pick]
    bbs = [bbox(c) for c in cs]
    ux0 = min(b[0] for b in bbs if b); uy0 = min(b[1] for b in bbs if b)
    ux1 = max(b[2] for b in bbs if b); uy1 = max(b[3] for b in bbs if b)
    ref = bbs[first]
    k = tw / (ref[2] - ref[0])
    frames = [shrink(c, (ux0, uy0, ux1, uy1), k) for c in cs]
    fw, fh = frames[0].size
    sheet = Image.new('RGBA', (fw * len(frames), fh), (0, 0, 0, 0))
    for j, f in enumerate(frames):
        sheet.paste(f, (j * fw, 0))
    # 色数を減らす（透明は別にとっておく）
    alpha = sheet.split()[3]
    rgb = Image.new('RGB', sheet.size, (0, 0, 0)); rgb.paste(sheet, mask=alpha)
    q = rgb.quantize(colors=ncol - 1, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = q.getpalette()[:3 * (ncol - 1)]
    qi = q.load(); al = alpha.load()
    out = Image.new('P', sheet.size, ncol - 1)
    op = out.load()
    for y in range(sheet.size[1]):
        for x in range(sheet.size[0]):
            if al[x, y] > 128: op[x, y] = qi[x, y]
    out.putpalette(pal + [0, 0, 0] + [0] * (768 - 3 * ncol))
    out.info['transparency'] = ncol - 1
    out.save(dst, optimize=True, transparency=ncol - 1)
    # 基準点：1コマ目の外形の中心（コマ左上からの位置）
    cx = ((ref[0] + ref[2]) / 2 - ux0) * k; cy = ((ref[1] + ref[3]) / 2 - uy0) * k
    import os
    print(dst, 'frame', fw, 'x', fh, 'n', len(frames), 'k', round(k, 4), 'ref', round(cx, 1), round(cy, 1), 'bytes', os.path.getsize(dst))


main()
