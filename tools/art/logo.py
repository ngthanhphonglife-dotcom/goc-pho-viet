#!/usr/bin/env python3
"""Logo GÓC PHỐ VIỆT — vector gốc: mái hiên sọc đỏ–kem, chữ Be Vietnam Pro viền nâu, ly cà phê, hoa sữa."""
import os, random
from svgkit import O, circle, flower, line, outlined, path, rect, svg, text

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "public", "art", "ui")
W, H = 900, 560
RED, CREAM, INK = "#C8362E", "#FFF8EC", "#4B2E2E"

def outlined_text(s, x, y, size, fill, sw):
    return "\n".join([
        text(s, x, y + 6, size, "#000000", "Bold", extra='opacity="0.18" stroke="#000000" stroke-width="%d" stroke-linejoin="round"' % sw),
        text(s, x, y, size, INK, "Bold", extra='stroke="%s" stroke-width="%d" stroke-linejoin="round"' % (INK, sw)),
        text(s, x, y, size, fill, "Bold"),
    ])

def main():
    b = []
    # mái hiên sọc với mép vỏ sò
    n = 9
    x0, x1, y0, y1 = 120, 780, 40, 130
    stripes = []
    for k in range(n):
        t0, t1 = k / n, (k + 1) / n
        top_l, top_r = 160 + (740 - 160) * t0, 160 + (740 - 160) * t1
        bot_l, bot_r = x0 + (x1 - x0) * t0, x0 + (x1 - x0) * t1
        stripes.append('<polygon points="%.1f,%d %.1f,%d %.1f,%d %.1f,%d" fill="%s"/>' % (top_l, y0, top_r, y0, bot_r, y1, bot_l, y1, RED if k % 2 == 0 else CREAM))
    for k in range(n):
        cx = x0 + (x1 - x0) * (k + 0.5) / n
        stripes.append(circle(cx, y1, (x1 - x0) / n / 2, RED if k % 2 == 0 else CREAM))
    b.append(outlined(stripes, 5))
    b.append(rect(150, 28, 600, 18, "#8C4B2C", 9, 'stroke="%s" stroke-width="5"' % INK))
    # chữ
    b.append(outlined_text("GÓC PHỐ", 450, 330, 150, CREAM, 26))
    b.append(outlined_text("VIỆT", 520, 490, 140, RED, 24))
    # ly cà phê bên trái chữ VIỆT
    cup = ['<path d="M190,395 L320,395 C320,470 295,505 255,505 C215,505 190,470 190,395 Z" fill="#FFFDF8"/>',
           '<path d="M318,410 C368,405 372,465 316,468 L318,450 C346,448 344,425 318,428 Z" fill="#FFFDF8"/>',
           '<ellipse cx="255" cy="512" rx="105" ry="22" fill="#FFFDF8"/>']
    b.append(outlined(cup, 5))
    b.append('<ellipse cx="255" cy="397" rx="62" ry="14" fill="#5B3A29"/>')
    for k, x in enumerate((230, 262)):
        b.append('<path d="M%d,375 C%d,350 %d,345 %d,320" fill="none" stroke="#B9A48A" stroke-width="8" stroke-linecap="round" opacity="0.8"/>' % (x, x - 14, x + 14, x))
    # hoa sữa
    rnd = random.Random(4)
    for (cx, cy, r) in [(110, 230, 26), (790, 230, 24), (840, 300, 18), (70, 300, 16), (800, 420, 20)]:
        b.append(flower(cx, cy, r, rot=rnd.uniform(0, 60), extra='stroke="%s" stroke-width="2"' % INK))
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "logo.svg"), "w", encoding="utf-8") as f:
        f.write(svg(W, H, "\n".join(b), "Logo Góc Phố Việt"))
    import cairosvg
    cairosvg.svg2png(url=os.path.join(OUT, "logo.svg"), write_to="/tmp/logo.png", output_width=900)
    print("ok")

if __name__ == "__main__":
    main()
