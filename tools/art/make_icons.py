#!/usr/bin/env python3
"""
Góc Phố Việt — bộ icon Master UI (Phase 0), vẽ gốc bằng vector.

Nguồn sự thật là file SVG trong ../icons_svg (sinh bởi script này, có thể sửa tay bằng Inkscape/Figma).
Script render từng SVG ra PNG RGBA 512×512 vào Assets/Art/UI/MasterUI/Icons.

Phong cách (theo ảnh Master Reference, chỉ dùng làm định hướng mỹ thuật):
  - viền nâu đậm #4B2E2E bo tròn, mảng màu phẳng ấm, 1 lớp highlight nhẹ;
  - bảng màu: kem #F5EDE0, đỏ đô #AE1C3F/#D2453B, xanh lá #79A867, vàng #E6B325.

Cách dùng:
    pip install cairosvg pillow
    python ArtSource/UI/MasterUI/tools/make_icons.py            # sinh SVG + PNG
    python ArtSource/UI/MasterUI/tools/make_icons.py --png-only # chỉ render lại PNG từ SVG đã sửa tay
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SVG_DIR = os.path.join(HERE, "icons_svg")
PUBLIC_DIR = os.path.join(HERE, "..", "..", "public", "art", "icons")

SIZE = 512
O = "#4B2E2E"      # viền
W = 13             # nửa độ dày viền ngoài (viền ngoài = 2W vì vẽ dưới phần tô)
D = 9              # độ dày nét chi tiết bên trong

CREAM = "#FFF8EC"
RED = "#D2453B"
RED_D = "#B23A32"
GREEN = "#79A867"
GREEN_D = "#5E9150"
GREEN_L = "#A6CF8A"
GOLD = "#F2B632"
GOLD_D = "#D98A1C"
BROWN = "#B5733E"
BROWN_D = "#97592B"
BROWN_L = "#CC8C55"
TEAL = "#7FB7A6"
TEAL_D = "#5E8F82"
SKY = "#CFE8F0"


# ---------------------------------------------------------------- helpers

def poly(points, fill, extra=""):
    pts = " ".join("%.1f,%.1f" % p for p in points)
    return '<polygon points="%s" fill="%s" %s/>' % (pts, fill, extra)


def rect(x, y, w, h, r, fill, extra=""):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="%s" %s/>' % (x, y, w, h, r, fill, extra)


def circle(cx, cy, r, fill, extra=""):
    return '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" %s/>' % (cx, cy, r, fill, extra)


def ellipse(cx, cy, rx, ry, fill, extra=""):
    return '<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" %s/>' % (cx, cy, rx, ry, fill, extra)


def path(d, fill, extra=""):
    return '<path d="%s" fill="%s" %s/>' % (d, fill, extra)


def line(x1, y1, x2, y2, color=O, width=D, extra=""):
    return ('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f" '
            'stroke-linecap="round" %s/>') % (x1, y1, x2, y2, color, width, extra)


def stroke_path(d, color=O, width=D, extra=""):
    return ('<path d="%s" fill="none" stroke="%s" stroke-width="%.1f" stroke-linecap="round" '
            'stroke-linejoin="round" %s/>') % (d, color, width, extra)


def group(shapes, details=(), outline=True):
    """
    Một lớp hình: các hình nền được vẽ 2 lượt —
      1) lượt viền: cùng hình, tô + nét màu O dày 2W → viền ngoài liền mạch quanh cả khối (không có nét thừa bên trong);
      2) lượt tô: hình gốc không nét.
    Sau đó vẽ chi tiết (đường kẻ, highlight).
    """
    out = []
    if outline:
        out.append('<g fill="%s" stroke="%s" stroke-width="%d" stroke-linejoin="round" stroke-linecap="round">' % (O, O, 2 * W))
        for s in shapes:
            out.append(_force_fill(s, O))
        out.append("</g>")
    out.extend(shapes)
    out.extend(details)
    return "\n".join(out)


def _force_fill(shape, color):
    import re
    return re.sub(r'fill="[^"]*"', 'fill="%s"' % color, shape, count=1)


def svg(body, title):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">\n'
            '<title>%s — Góc Phố Việt (original art)</title>\n%s\n</svg>\n') % (SIZE, SIZE, SIZE, SIZE, title, body)


def star_points(cx, cy, r_out, r_in, n=5, rot=-90):
    pts = []
    for i in range(n * 2):
        r = r_out if i % 2 == 0 else r_in
        a = math.radians(rot + i * 180.0 / n)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def rounded_star_path(cx, cy, r_out, r_in, rounding=0.18):
    """Ngôi sao 5 cánh bo tròn đầu cánh bằng đường cong bậc 2."""
    pts = star_points(cx, cy, r_out, r_in)
    n = len(pts)
    d = []
    for i in range(n):
        p0 = pts[i - 1]
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        a = (p1[0] + (p0[0] - p1[0]) * rounding, p1[1] + (p0[1] - p1[1]) * rounding)
        b = (p1[0] + (p2[0] - p1[0]) * rounding, p1[1] + (p2[1] - p1[1]) * rounding)
        d.append(("M" if i == 0 else "L") + "%.1f,%.1f" % a)
        d.append("Q%.1f,%.1f %.1f,%.1f" % (p1[0], p1[1], b[0], b[1]))
    d.append("Z")
    return " ".join(d)


# ---------------------------------------------------------------- icons

def icon_map():
    p1 = [(62, 176), (190, 132), (190, 434), (62, 476)]
    p2 = [(190, 132), (322, 176), (322, 476), (190, 434)]
    p3 = [(322, 176), (450, 132), (450, 434), (322, 476)]
    road = stroke_path("M80,420 C130,380 150,330 200,320 S290,360 330,300 S410,250 440,210", CREAM, 16,
                       'stroke-dasharray="1,28"')
    river = stroke_path("M335,470 C360,420 345,380 380,340 S440,300 448,250", "#5DA9C9", 22)
    paper = group([poly(p1, "#8CC47F"), poly(p2, "#6FAE6A"), poly(p3, "#93CBDA")],
                  [river, road,
                   line(190, 140, 190, 428, O, 7), line(322, 182, 322, 468, O, 7),
                   poly([(70, 190), (182, 152), (182, 200), (70, 236)], "#FFFFFF", 'opacity="0.18"')])
    # ghim đỏ
    pin_d = "M330,292 C300,240 262,206 262,160 A68,68 0 1 1 398,160 C398,206 360,240 330,292 Z"
    pin = group([path(pin_d, RED)],
                [circle(330, 160, 26, CREAM),
                 path("M292,128 A44,44 0 0 1 344,104", "none", 'stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" opacity="0.55"')])
    return svg(paper + "\n" + pin, "Bản đồ")


def icon_quest():
    cover = rect(118, 132, 290, 322, 26, RED_D, 'transform="rotate(-7 263 293)"')
    pages = rect(98, 96, 290, 322, 20, CREAM, 'transform="rotate(-7 243 257)"')
    ribbon = poly([(330, 92), (366, 88), (372, 168), (352, 150), (336, 172)], RED)
    lines = []
    for i, (x2, y) in enumerate([(330, 170), (300, 222), (336, 274), (276, 326)]):
        lines.append(line(150, y + 6, x2, y - 14, "#C9B59A", 12))
    body = group([cover]) + "\n" + group([pages], lines + [
        path("M330,410 L388,348 L388,392 Q384,408 368,412 Z", "#EAD9BD")]) + "\n" + group([ribbon])
    pen_body = group([rect(-14, -120, 28, 210, 12, GOLD, 'transform="translate(400 300) rotate(32)"')],
                     [poly([(-14, 90), (14, 90), (0, 124)], "#F3D7A6", 'transform="translate(400 300) rotate(32)"')])
    return svg(body + "\n" + pen_body, "Nhiệm vụ")


def icon_bag():
    handle = stroke_path("M200,160 C200,62 312,62 312,160", O, 40) + stroke_path("M200,160 C200,70 312,70 312,160", BROWN_D, 16)
    strap = rect(370, 200, 40, 200, 20, BROWN_D)
    body = rect(118, 140, 276, 320, 72, BROWN)
    flap = path("M118,250 L118,212 C118,150 168,128 256,128 C344,128 394,150 394,212 L394,250 Q256,292 118,250 Z", BROWN_L)
    pocket = rect(166, 316, 180, 116, 30, BROWN_D)
    details = [
        pocket,
        line(176, 340, 336, 340, "#7E4A24", 8),
        rect(168, 238, 30, 82, 10, "#7E4A24"), rect(314, 238, 30, 82, 10, "#7E4A24"),
        rect(160, 280, 46, 34, 8, GOLD), rect(306, 280, 46, 34, 8, GOLD),
        path("M150,200 C170,160 220,148 256,148", "none", 'stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" opacity="0.35"'),
    ]
    return svg(handle + "\n" + group([strap]) + "\n" + group([body, flap], details), "Túi đồ")


def awning(x0, x1, y_top, y_bot, stripes, c1, c2):
    """Mái hiên sọc + mép vỏ sò."""
    w = (x1 - x0) / stripes
    shapes = [rect(x0, y_top, x1 - x0, y_bot - y_top, 14, c1)]
    det = []
    for i in range(stripes):
        cx = x0 + w * (i + 0.5)
        color = c1 if i % 2 == 0 else c2
        if i % 2 == 1:
            det.append(rect(x0 + w * i, y_top + 6, w, y_bot - y_top - 6, 0, c2))
        shapes.append(circle(cx, y_bot, w / 2, color))
    return shapes, det


def icon_shop():
    house = rect(110, 210, 292, 240, 14, TEAL)
    win = rect(146, 280, 116, 96, 10, SKY)
    door = rect(290, 278, 76, 172, 10, TEAL_D)
    base = rect(96, 432, 320, 30, 12, "#C9B59A")
    aw_shapes, aw_det = awning(86, 426, 118, 196, 7, RED, CREAM)
    body = group([house, base], [
        group([win], [line(204, 284, 204, 372, O, 7), line(150, 328, 258, 328, O, 7),
                      poly([(160, 292), (196, 292), (160, 340)], "#FFFFFF", 'opacity="0.6"')]),
        group([door], [circle(352, 370, 7, GOLD)]),
        rect(150, 380, 108, 18, 6, "#5E8F82"),
    ])
    roof = group(aw_shapes, aw_det + [rect(96, 126, 320, 14, 7, "#FFFFFF", 'opacity="0.25"')])
    return svg(body + "\n" + roof, "Cửa hàng")


def icon_stall():
    wall = rect(106, 236, 300, 196, 14, "#C08552")
    counter = rect(88, 330, 336, 34, 12, BROWN_D)
    win = rect(150, 252, 212, 76, 10, "#9DCB8E")
    planks = [line(120, 390, 392, 390, "#97592B", 7), line(120, 420, 392, 420, "#97592B", 7)]
    aw_shapes, aw_det = awning(80, 432, 120, 206, 6, RED, CREAM)
    posts = group([rect(104, 196, 24, 60, 8, BROWN_D), rect(384, 196, 24, 60, 8, BROWN_D)])
    body = posts + "\n" + group([wall], [group([win], [line(256, 256, 256, 324, O, 7)])] + planks) + "\n" + group([counter], [
        rect(100, 336, 312, 8, 4, "#FFFFFF", 'opacity="0.2"')])
    cups = group([rect(160, 296, 34, 36, 8, CREAM), rect(214, 290, 34, 42, 8, CREAM), rect(304, 300, 40, 32, 10, GOLD)])
    roof = group(aw_shapes, aw_det)
    legs = group([rect(118, 430, 30, 40, 8, BROWN_D), rect(364, 430, 30, 40, 8, BROWN_D)])
    return svg(legs + "\n" + body + "\n" + cups + "\n" + roof, "Quầy hàng")


def icon_ingredients():
    produce = group([
        circle(176, 236, 62, "#E8873A"),               # bí/cà rốt
        circle(260, 212, 54, GREEN_D),                 # rau
        circle(322, 196, 52, GREEN),
        circle(368, 236, 50, GREEN_D),
        circle(232, 262, 40, RED),                     # cà chua
    ], [
        stroke_path("M176,182 C178,166 186,156 200,150", GREEN_D, 12),
        path("M150,214 A30,30 0 0 1 182,196", "none", 'stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" opacity="0.45"'),
        stroke_path("M300,166 C320,190 322,220 318,250", "#4C7A40", 8),
        stroke_path("M344,206 C360,226 364,248 360,270", "#4C7A40", 8),
        circle(220, 250, 9, "#FFFFFF", 'opacity="0.5"'),
    ])
    basket = poly([(104, 286), (408, 286), (378, 450), (134, 450)], "#D9A35F")
    rim = rect(86, 264, 340, 48, 22, "#C48F4E")
    weave = []
    for x in range(150, 380, 44):
        weave.append(line(x, 322, x + (256 - x) * 0.08, 438, "#B7813F", 8))
    weave += [line(118, 368, 394, 368, "#B7813F", 8), line(126, 408, 386, 408, "#B7813F", 8)]
    return svg(produce + "\n" + group([basket, rim], weave + [rect(100, 272, 312, 10, 5, "#FFFFFF", 'opacity="0.25"')]), "Nguyên liệu")


def icon_sell():
    saucer = ellipse(256, 396, 182, 46, "#FFFDF8")
    handle = path("M350,232 C432,226 442,330 352,338 L352,306 C398,300 396,262 350,266 Z", "#FFFDF8")
    cup = path("M134,214 L378,214 C378,330 340,392 256,392 C172,392 134,330 134,214 Z", "#FFFDF8")
    return svg(group([saucer], [ellipse(256, 392, 120, 22, "#EDE3D3")]) + "\n" +
               group([handle, cup], [ellipse(256, 216, 114, 26, "#5B3A29"),
                                     ellipse(232, 210, 48, 8, "#8A5A3E"),
                                     path("M162,250 C166,316 192,356 226,372", "none",
                                          'stroke="#E8DCC8" stroke-width="16" stroke-linecap="round"')]),
               "Bán hàng")


def icon_upgrade():
    arrow = poly([(256, 62), (428, 238), (334, 238), (334, 452), (178, 452), (178, 238), (84, 238)], GREEN)
    det = [poly([(256, 92), (256, 238), (178, 238), (178, 452), (210, 452), (210, 210), (128, 210)], GREEN_L, 'opacity="0.55"'),
           rect(178, 300, 156, 22, 4, "#CFE6BE"), rect(178, 350, 156, 22, 4, "#CFE6BE"), rect(178, 400, 156, 22, 4, "#CFE6BE")]
    return svg(group([arrow], det), "Nâng cấp")


def leaf(cx, cy, length, width, angle, color, vein="#4C7A40"):
    a = math.radians(angle)
    tx, ty = cx + length * math.cos(a), cy + length * math.sin(a)
    nx, ny = -math.sin(a) * width, math.cos(a) * width
    mx, my = (cx + tx) / 2, (cy + ty) / 2
    d = "M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Q%.1f,%.1f %.1f,%.1f Z" % (cx, cy, mx + nx, my + ny, tx, ty, mx - nx, my - ny, cx, cy)
    return path(d, color), line(cx, cy, cx + (tx - cx) * 0.8, cy + (ty - cy) * 0.8, vein, 6)


def icon_decor():
    leaves, veins = [], []
    for (ang, ln, col) in [(-150, 170, GREEN_D), (-30, 170, GREEN_D), (-118, 190, GREEN), (-62, 190, GREEN), (-90, 200, GREEN_L)]:
        s, v = leaf(256, 300, ln, 52, ang, col)
        leaves.append(s)
        veins.append(v)
    pot = poly([(166, 330), (346, 330), (322, 456), (190, 456)], "#C8693E")
    rim = rect(146, 296, 220, 50, 16, "#D97B4C")
    plant = "\n".join(group([l], [v]) for l, v in zip(leaves, veins))
    return svg(plant + "\n" + group([pot, rim], [rect(160, 304, 192, 10, 5, "#FFFFFF", 'opacity="0.3"'),
                                                 path("M190,360 L200,440", "none", 'stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" opacity="0.25"')]),
               "Trang trí")


def icon_calendar():
    page = rect(86, 120, 340, 316, 40, CREAM)
    head = path("M86,212 L86,160 Q86,120 126,120 L386,120 Q426,120 426,160 L426,212 Z", RED)
    cells = []
    for r in range(2):
        for c in range(3):
            cells.append(rect(140 + c * 84, 250 + r * 76, 60, 52, 10, "#E9D8C0" if (r, c) != (1, 2) else GOLD))
    rings = group([rect(160, 74, 34, 92, 17, "#D8D2CA"), rect(318, 74, 34, 92, 17, "#D8D2CA")])
    return svg(group([page], [head] + cells) + "\n" + rings, "Lịch")


def icon_sun():
    rays = []
    for i in range(8):
        a = i * 45
        rays.append(rect(-20, -206, 40, 86, 20, GOLD, 'transform="translate(256 256) rotate(%d)"' % a))
    body = circle(256, 256, 112, "#FFD25A")
    return svg(group(rays) + "\n" + group([body], [circle(256, 256, 84, "#FFDF7E"),
                                                    path("M196,214 A72,72 0 0 1 250,176", "none",
                                                         'stroke="#FFFFFF" stroke-width="16" stroke-linecap="round" opacity="0.7"')]),
               "Nắng")


def icon_rain():
    cloud = group([circle(186, 236, 76, "#F2F5F7"), circle(270, 196, 96, "#F2F5F7"), circle(352, 248, 70, "#F2F5F7"),
                   rect(130, 230, 284, 88, 44, "#F2F5F7")],
                  [path("M150,292 L380,292", "none", 'stroke="#D5DEE4" stroke-width="16" stroke-linecap="round"')])
    drops = []
    for (x, y) in [(190, 392), (262, 424), (334, 392)]:
        d = "M%d,%d C%d,%d %d,%d %d,%d C%d,%d %d,%d %d,%d Z" % (
            x, y - 58, x + 34, y - 14, x + 30, y + 26, x, y + 26, x - 30, y + 26, x - 34, y - 14, x, y - 58)
        drops.append(group([path(d, "#5DA9C9")], [circle(x - 9, y + 2, 7, "#FFFFFF", 'opacity="0.6"')]))
    return svg(cloud + "\n" + "\n".join(drops), "Mưa")


def icon_money():
    notes = []
    for i, (dy, rot, col) in enumerate([(70, 6, "#4E8F4A"), (20, -3, "#5FA35A"), (-30, -9, "#6DB566")]):
        t = 'transform="rotate(%d 256 %d)"' % (rot, 256 + dy)
        n = rect(96, 186 + dy, 320, 150, 18, col, t)
        inner = rect(118, 204 + dy, 276, 114, 12, "none", t + ' stroke="#A9D89D" stroke-width="8"')
        emblem = circle(256, 261 + dy, 36, "#E9C45A", t)
        notes.append(group([n], [inner, emblem] if i == 2 else [inner]))
    band = group([rect(226, 150, 60, 230, 12, GOLD, 'transform="rotate(-9 256 226)"')],
                 [circle(256, 226, 30, "#F7D774", 'transform="rotate(-9 256 226)"')])
    return svg("\n".join(notes) + "\n" + band, "Tiền")


def icon_star():
    d = rounded_star_path(256, 270, 214, 98, 0.16)
    hi = rounded_star_path(256, 270, 150, 70, 0.2)
    return svg(group([path(d, "#FFC83D")], [path(hi, "#FFD970"),
                                              path("M190,214 L232,154", "none",
                                                   'stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" opacity="0.75"')]),
               "Uy tín")


def icon_gear():
    teeth = []
    for i in range(8):
        teeth.append(rect(-38, -212, 76, 100, 18, "#EDEAE5", 'transform="translate(256 256) rotate(%d)"' % (i * 45)))
    body = circle(256, 256, 150, "#EDEAE5")
    return svg(group(teeth + [body], [circle(256, 256, 120, "#F7F5F2"),
                                      group([circle(256, 256, 58, "#B9B0A6")], [circle(256, 256, 30, "#8E837A")]),
                                      path("M168,206 A100,100 0 0 1 222,152", "none",
                                           'stroke="#FFFFFF" stroke-width="16" stroke-linecap="round"')]),
               "Cài đặt")


def icon_check():
    return svg(stroke_path("M120,268 L214,360 L396,160", "#FFFFFF", 64), "Đã xong")


def icon_quest_scroll():
    scroll = rect(122, 120, 268, 300, 30, CREAM)
    top = rect(96, 96, 320, 64, 32, "#E3CFA9")
    bottom = rect(96, 384, 320, 64, 32, "#E3CFA9")
    lines = [line(170, 220, 342, 220, RED, 18), line(170, 280, 342, 280, RED, 18), line(170, 340, 290, 340, RED, 18)]
    return svg(group([scroll, top, bottom], lines), "Nhiệm vụ chính")


ICONS = {
    "icon_map": icon_map,
    "icon_quest": icon_quest,
    "icon_bag": icon_bag,
    "icon_shop": icon_shop,
    "icon_stall": icon_stall,
    "icon_ingredients": icon_ingredients,
    "icon_sell": icon_sell,
    "icon_upgrade": icon_upgrade,
    "icon_decor": icon_decor,
    "icon_calendar": icon_calendar,
    "icon_weather_sun": icon_sun,
    "icon_weather_rain": icon_rain,
    "icon_money": icon_money,
    "icon_star": icon_star,
    "icon_settings": icon_gear,
    "icon_check": icon_check,
    "icon_quest_scroll": icon_quest_scroll,
}


def main():
    """Sinh SVG nguồn (tools/art/icons_svg) và chép sang public/art/icons — game web dùng SVG trực tiếp (luôn nét)."""
    import shutil
    os.makedirs(SVG_DIR, exist_ok=True)
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    for name, fn in ICONS.items():
        svg_path = os.path.join(SVG_DIR, name + ".svg")
        if "--keep-svg" not in sys.argv:
            with open(svg_path, "w", encoding="utf-8") as f:
                f.write(fn())
        shutil.copy(svg_path, os.path.join(PUBLIC_DIR, name + ".svg"))
        print("ok", name)


if __name__ == "__main__":
    main()
