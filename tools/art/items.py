#!/usr/bin/env python3
"""Biểu tượng nguyên liệu và đồ uống (Phase 7) — vẽ vector gốc, 256×256, cùng phong cách viền nâu."""
import os

from svgkit import O, circle, ellipse, group, line, outlined, path, poly, rect, stroke, text

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "public", "art", "items")
W = 5


def j(*a):
    return "\n".join(x if isinstance(x, str) else "\n".join(x) for x in a)


def bean(x, y, rot, s=1.0):
    return group(j(outlined([ellipse(0, 0, 44 * s, 30 * s, "#6B3F22")], W), stroke("M%d,0 Q0,%d %d,0" % (-34 * s, 12 * s, 34 * s), "#3F2413", 5),
                   ellipse(-12 * s, -12 * s, 14 * s, 6 * s, "#9A6B45", 'opacity="0.7"')), 'transform="translate(%d,%d) rotate(%d)"' % (x, y, rot))


def i_beans():
    return j(bean(92, 150, -25), bean(168, 160, 30), bean(130, 92, 10))


def i_condensed():
    return j(outlined([rect(62, 70, 132, 140, "#F4F1EA", 14), ellipse(128, 70, 66, 18, "#D9D6CF")], W), rect(62, 104, 132, 70, "#C8362E"),
             ellipse(128, 139, 34, 24, "#FFFFFF"), text("SỮA", 128, 148, 26, "#C8362E", "Bold"), ellipse(128, 70, 46, 10, "#BDB8B0"))


def i_milk():
    return j(outlined([poly([(76, 96), (128, 44), (180, 96)], "#EAF3FA"), rect(76, 96, 104, 120, "#FFFFFF", 8)], W), rect(76, 130, 104, 46, "#4E9ACF"),
             text("SỮA TƯƠI", 128, 162, 18, "#FFFFFF", "Bold", max_width=92), line(128, 46, 128, 96, O, 4), poly([(110, 62), (146, 62), (128, 44)], "#4E9ACF"))


def i_sugar():
    return j(outlined([path("M70,84 Q128,60 186,84 L196,210 Q128,226 60,210 Z", "#FFFDF4")], W), stroke("M76,92 Q128,108 180,92", "#D9C7A0", 5),
             text("ĐƯỜNG", 128, 166, 30, "#B5473F", "Bold"), rect(108, 54, 40, 26, "#D9C7A0", 6, 'stroke="%s" stroke-width="5"' % O))


def i_ice():
    s = []
    for (x, y, r) in [(68, 118, -8), (128, 96, 6), (112, 156, 10)]:
        s.append(group(j(outlined([rect(0, 0, 74, 70, "#CFE9F7", 14)], W), poly([(10, 12), (40, 12), (10, 40)], "#FFFFFF", 'opacity="0.8"')), 'transform="translate(%d,%d) rotate(%d)"' % (x, y, r)))
    return j(s)


def i_tea():
    leaf = lambda x, y, r: group(j(outlined([path("M0,0 Q26,-30 52,0 Q26,30 0,0 Z", "#6FA35A")], 4), line(4, 0, 48, 0, "#3C6B36", 3)), 'transform="translate(%d,%d) rotate(%d)"' % (x, y, r))
    return j(outlined([path("M70,90 L186,90 L196,214 L60,214 Z", "#8FBF6F"), rect(64, 70, 128, 26, "#6FA35A", 8)], W), ellipse(128, 156, 40, 36, "#F4F1EA"), leaf(104, 160, -20), text("TRÀ", 128, 126, 22, "#FFFFFF", "Bold"))


def i_kumquat():
    k = lambda x, y, r: j(outlined([circle(x, y, r, "#F2A23A")], W), ellipse(x - r * 0.3, y - r * 0.35, r * 0.3, r * 0.18, "#FFD98A"), circle(x + r * 0.1, y - r * 0.92, 5, "#3C6B36"))
    return j(k(98, 150, 46), k(166, 142, 40), outlined([path("M118,96 Q150,56 186,74 Q160,104 118,96 Z", "#6FA35A")], 4), line(124, 94, 178, 76, "#3C6B36", 3))


GLASS = "M70,70 L186,70 L172,222 Q128,232 84,222 Z"


def glass(layers, garnish=""):
    """Ly thuỷ tinh; layers = [(màu, phần cao 0–1 từ đáy)] chồng lên nhau."""
    s = ['<clipPath id="g"><path d="%s"/></clipPath>' % GLASS, outlined([path(GLASS, "#F4FAFD")], W)]
    y = 226
    body = []
    for col, frac in layers:
        h = 150 * frac
        body.append(rect(60, y - h, 140, h + 1, col))
        y -= h
    for (x, yy, r) in [(98, 112, 10), (140, 104, -12), (120, 142, 6)]:
        body.append(group(rect(0, 0, 30, 28, "#FFFFFF", 7, 'opacity="0.45"'), 'transform="translate(%d,%d) rotate(%d)"' % (x, yy, r)))
    s.append(group(j(body), 'clip-path="url(#g)"'))
    s.append(stroke(GLASS, O, 6))
    s.append(poly([(84, 84), (98, 84), (104, 200), (94, 200)], "#FFFFFF", 'opacity="0.35"'))
    s.append(outlined([rect(146, 30, 12, 150, "#D93A30", 5)], 3))
    s.append(garnish)
    return j(s)


def i_cup():
    return j(outlined([path(GLASS, "#F4FAFD")], W), poly([(84, 84), (98, 84), (104, 200), (94, 200)], "#FFFFFF", 'opacity="0.7"'),
             stroke("M78,150 L178,150", "#D5E6EE", 4), stroke("M82,190 L174,190", "#D5E6EE", 4))


def slice_kumquat():
    return j(outlined([circle(182, 78, 26, "#F2A23A")], 4), circle(182, 78, 17, "#FFD98A"), line(165, 78, 199, 78, "#F2A23A", 3), line(182, 61, 182, 95, "#F2A23A", 3))


ICONS = {
    "ing_beans": i_beans, "ing_condensed": i_condensed, "ing_milk": i_milk, "ing_sugar": i_sugar, "ing_ice": i_ice, "ing_tea": i_tea, "ing_kumquat": i_kumquat, "ing_cup": i_cup,
    "drink_den": lambda: glass([("#3B2318", 0.9)]),
    "drink_sua": lambda: glass([("#F1DFC0", 0.25), ("#8A5632", 0.65)]),
    "drink_bacxiu": lambda: glass([("#F6EAD2", 0.6), ("#B98A5E", 0.3)]),
    "drink_tratac": lambda: glass([("#E9A23B", 0.9)], slice_kumquat()),
    "drink_tradao": lambda: glass([("#F0865A", 0.9)], outlined([path("M160,74 Q184,50 204,80 Q184,104 160,74 Z", "#F7B58A")], 4)),
}


def main():
    import cairosvg
    from PIL import Image
    import io
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.new("RGBA", (128 * len(ICONS), 128), (245, 237, 224, 255))
    for i, (name, fn) in enumerate(ICONS.items()):
        data = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">\n<title>%s — Góc Phố Việt (original vector art)</title>\n%s\n</svg>\n' % (name, fn())
        with open(os.path.join(OUT, name + ".svg"), "w", encoding="utf-8") as f:
            f.write(data)
        sheet.alpha_composite(Image.open(io.BytesIO(cairosvg.svg2png(bytestring=data.encode(), output_width=128, output_height=128))).convert("RGBA"), (i * 128, 0))
    sheet.save(os.path.join(HERE, "..", "..", "docs", "art", "items_preview.png"))
    print("ok", len(ICONS))


if __name__ == "__main__":
    main()
