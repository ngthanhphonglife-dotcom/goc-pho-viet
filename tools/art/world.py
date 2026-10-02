#!/usr/bin/env python3
"""
Khu phố Hoa Sữa — vẽ vector gốc, theo lớp (xa → gần). Mỗi lớp là 1 file SVG cùng khung 1080×2340
(thiết kế cho màn 9:19.5; màn 9:16 cắt bớt trời). Xuất ra public/art/world/*.svg + ảnh xem trước.

Bám bố cục ảnh Master Reference nhưng mọi nét đều vẽ mới.
"""
import math
import os
import random

from svgkit import (O, blob, circle, ellipse, flower, group, line, outlined, path, poly, rect, stroke, svg, text)

W, H = 1080, 2340
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "public", "art", "world")

# Bảng màu
CREAM = "#FFF8EC"
WALL_A = "#EBD49B"
WALL_A_D = "#D9BD7E"
WALL_B = "#E6C998"
WALL_B_D = "#CFAE79"
RED = "#C8362E"
RED_D = "#A62A24"
GREEN = "#6FA35A"
GREEN_D = "#4F8443"
GREEN_DD = "#3C6B36"
GREEN_L = "#93C36F"
WOOD = "#C98E55"
WOOD_D = "#9A6234"
WOOD_L = "#E3B575"
GLASS = "#9CC3CF"
GLASS_D = "#6F97A6"
STEEL = "#3E3A3A"
GREY = "#9B9A9A"


# ================================================================ sky

def layer_sky():
    defs = ('<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="#8FCBEA"/><stop offset="0.55" stop-color="#C9E7F4"/><stop offset="1" stop-color="#F3E9D2"/></linearGradient>')
    b = [rect(0, 0, W, 1300, "url(#sky)")]
    for (cx, cy, s) in [(150, 330, 1.0), (360, 470, 0.7), (60, 640, 0.8)]:
        b.append(group([ellipse(cx, cy, 90 * s, 34 * s, "#FFFFFF"), ellipse(cx - 55 * s, cy + 8 * s, 55 * s, 26 * s, "#FFFFFF"),
                        ellipse(cx + 60 * s, cy + 10 * s, 60 * s, 24 * s, "#FFFFFF")], 'opacity="0.9"'))
    return svg(W, H, "\n".join(b), "Bầu trời", defs)


# ================================================================ back buildings

def window(x, y, w, h, frame=WOOD_D, glass=GLASS, bars=True):
    s = [outlined([rect(x, y, w, h, frame, 6)], 3),
         rect(x + 8, y + 8, w - 16, h - 16, glass, 3)]
    if bars:
        s.append(line(x + w / 2, y + 8, x + w / 2, y + h - 8, frame, 6))
        s.append(line(x + 8, y + h * 0.45, x + w - 8, y + h * 0.45, frame, 5))
    s.append(poly([(x + 12, y + 12), (x + w * 0.42, y + 12), (x + 12, y + h * 0.4)], "#FFFFFF", 'opacity="0.35"'))
    return "\n".join(s)


def layer_back_buildings():
    b = []
    # nhà hồng phía sau cây (trái)
    b.append(outlined([rect(170, 430, 300, 900, "#E8B9A2")], 3))
    b.append(outlined([poly([(150, 450), (330, 330), (500, 450)], "#C9674E")], 3))
    for i in range(3):
        for j in range(2):
            b.append(window(200 + j * 130, 520 + i * 200, 90, 130, "#B9806A", "#B8D6DE", True))
    # dây phơi đồ ở ban công nhà sau
    b.append(stroke("M330,690 Q380,705 430,690", STEEL, 3))
    for k, c in enumerate(["#E67D6B", "#7CA4C9", "#F2D27A", "#9BC48A"]):
        x = 340 + k * 22
        b.append(rect(x, 695, 16, 36, c, 3))
    return "\n".join(b)


# ================================================================ main building

def balcony(x, y, w, plants=True, rnd=None):
    s = []
    s.append(outlined([rect(x - 10, y + 120, w + 20, 22, "#D3C3A4", 4)], 3))     # sàn ban công
    # lan can sắt
    s.append(line(x, y, x + w, y, STEEL, 6))
    for k in range(int(w // 22) + 1):
        xx = x + k * 22
        s.append(line(xx, y, xx, y + 120, STEEL, 4))
    s.append(line(x, y + 60, x + w, y + 60, STEEL, 3))
    if plants and rnd:
        for k in range(int(w // 70)):
            px = x + 30 + k * 70
            s.append(outlined([poly([(px - 20, y - 30), (px + 20, y - 30), (px + 15, y), (px - 15, y)], "#C46A3E")], 3))
            for _ in range(5):
                s.append(circle(px + rnd.uniform(-22, 22), y - 40 - rnd.uniform(0, 28), rnd.uniform(10, 16),
                                rnd.choice([GREEN, GREEN_D, GREEN_L])))
    return "\n".join(s)


def flag(x, y, w, h):
    # cờ đỏ sao vàng treo lan can, có nếp gợn nhẹ
    d = "M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f L%.1f,%.1f Q%.1f,%.1f %.1f,%.1f Z" % (
        x, y, x + w / 2, y + 10, x + w, y, x + w, y + h, x + w / 2, y + h + 10, x, y + h)
    cx, cy, r = x + w / 2, y + h / 2 + 4, h * 0.26
    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * 0.4
        a = math.radians(-90 + i * 36)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return "\n".join([outlined([path(d, "#D7342B")], 3), poly(pts, "#F7D23A"),
                      path("M%.1f,%.1f L%.1f,%.1f" % (x + w * 0.62, y + 8, x + w * 0.7, y + h), "none",
                           'stroke="#B32620" stroke-width="5" opacity="0.5"')])


def ac_unit(x, y):
    s = [outlined([rect(x, y, 170, 105, "#ECECE8", 8)], 3)]
    s.append(circle(x + 55, y + 52, 38, "#C9CACA"))
    for k in range(6):
        a = math.radians(k * 60)
        s.append(line(x + 55, y + 52, x + 55 + 34 * math.cos(a), y + 52 + 34 * math.sin(a), "#8E8F90", 4))
    for k in range(5):
        s.append(line(x + 110, y + 22 + k * 15, x + 155, y + 22 + k * 15, "#A9AAAA", 4))
    s.append(stroke("M%d,%d Q%d,%d %d,%d" % (x + 150, y + 105, x + 170, y + 160, x + 210, y + 175), "#6C6C6C", 4))
    return "\n".join(s)


def vines(rnd, x0, x1, y0, y1, n):
    s = []
    for _ in range(n):
        x = rnd.uniform(x0, x1)
        length = rnd.uniform(80, y1 - y0)
        d = "M%.1f,%.1f C%.1f,%.1f %.1f,%.1f %.1f,%.1f" % (x, y0, x + 18, y0 + length * 0.3, x - 18, y0 + length * 0.7, x + 4, y0 + length)
        s.append(stroke(d, GREEN_DD, 3))
        for t in range(int(length // 26)):
            yy = y0 + t * 26 + rnd.uniform(0, 10)
            xx = x + math.sin(t) * 10
            s.append(ellipse(xx + rnd.choice([-9, 9]), yy, 10, 6, rnd.choice([GREEN, GREEN_D, GREEN_L]),
                             'transform="rotate(%d %.1f %.1f)"' % (rnd.uniform(-40, 40), xx, yy)))
    return "\n".join(s)


def layer_main_building():
    rnd = random.Random(7)
    b = []
    # Nhà A (giữa) và nhà B (phải)
    b.append(outlined([rect(430, -20, 340, 1000, WALL_A)], 3))
    b.append(rect(430, -20, 26, 1000, WALL_A_D))
    b.append(outlined([rect(770, -20, 330, 1000, WALL_B)], 3))
    b.append(rect(770, -20, 22, 1000, WALL_B_D))
    # mảng tường cũ (vệt ố nhẹ)
    for (x, y, w, h) in [(520, 120, 80, 40), (690, 560, 60, 90), (860, 260, 70, 50), (960, 640, 90, 60)]:
        b.append(ellipse(x, y, w, h, "#C9A86E", 'opacity="0.18"'))
    # tầng trên: cửa sổ
    b.append(window(475, 40, 110, 190))
    b.append(window(625, 40, 110, 190))
    b.append(window(820, 40, 100, 170))
    b.append(window(950, 40, 100, 170))
    # gờ tầng
    for y in (270, 560):
        b.append(outlined([rect(420, y, 680, 26, "#D9C5A0", 4)], 3))
    # ban công nhà A + cửa ra ban công
    b.append(outlined([rect(500, 330, 210, 210, WOOD_D, 6)], 3))
    b.append(rect(512, 342, 88, 186, "#5E6D62", 3))
    b.append(rect(610, 342, 88, 186, "#5E6D62", 3))
    b.append(balcony(470, 420, 270, True, rnd))
    b.append(flag(525, 395, 120, 82))
    # ban công nhà B
    b.append(window(830, 320, 200, 170, WOOD_D, GLASS, True))
    b.append(balcony(800, 440, 260, True, rnd))
    # máy lạnh
    b.append(ac_unit(560, 640))
    # ống thoát nước
    b.append(outlined([rect(752, 0, 16, 780, "#B6A68A")], 2))
    # dây leo rủ từ mái nhà B + mép trái nhà A
    b.append(vines(rnd, 790, 1080, -10, 520, 9))
    b.append(vines(rnd, 440, 520, 200, 560, 3))
    # tán lá trên đỉnh phải
    for _ in range(14):
        b.append(blob(rnd.uniform(800, 1100), rnd.uniform(-40, 90), rnd.uniform(50, 80), rnd.uniform(36, 55), 9, rnd,
                      rnd.choice([GREEN, GREEN_D, GREEN_L])))
    for _ in range(18):
        b.append(flower(rnd.uniform(800, 1080), rnd.uniform(-10, 120), rnd.uniform(9, 13), rot=rnd.uniform(0, 60)))
    # mái hiên bê tông trên 2 tiệm
    b.append(outlined([rect(410, 760, 700, 40, "#CDBB98", 4)], 3))
    b.append(rect(410, 795, 700, 10, "#000000", 'opacity="0.12"'))
    return "\n".join(b)


# ================================================================ shops

def tire_stack(x, y, n):
    s = []
    for k in range(n):
        yy = y - k * 34
        s.append(outlined([ellipse(x, yy, 62, 24, "#2E2B2B")], 3))
        s.append(ellipse(x, yy - 3, 30, 10, "#4A4545"))
    return "\n".join(s)


def layer_shops():
    rnd = random.Random(11)
    b = []
    # ---------- SỬA XE Chú Tư ----------
    b.append(outlined([rect(440, 805, 330, 470, "#7A6A5C")], 3))                 # khung tiệm
    b.append(rect(460, 950, 290, 325, "#5B4E45"))                                # lòng tiệm tối
    # cửa cuốn kéo lên một phần
    b.append(rect(460, 940, 290, 46, "#A8A49E"))
    for k in range(4):
        b.append(line(462, 950 + k * 10, 748, 950 + k * 10, "#8B8781", 3))
    # đồ nghề bên trong
    b.append(rect(480, 1010, 120, 14, WOOD_D))
    b.append(rect(480, 1080, 120, 14, WOOD_D))
    for k in range(5):
        b.append(rect(488 + k * 22, 990, 14, 20, rnd.choice(["#D9534A", "#E8B04A", "#5D8FBF", "#CFCFCF"]), 2))
        b.append(circle(495 + k * 22, 1068, 9, rnd.choice(["#B0B0B0", "#7D7D7D"])))
    b.append(outlined([rect(630, 1000, 100, 150, "#6F8A99", 4)], 3))          # tủ đồ
    b.append(rect(642, 1012, 76, 56, "#8FB1C2", 3))
    # biển hiệu trắng chữ đỏ
    b.append(outlined([rect(460, 815, 290, 140, "#F6F1E6", 10)], 4))
    b.append(text("SỬA XE", 605, 875, 60, RED, "Bold"))
    b.append(text("Chú Tư", 605, 920, 40, "#3B2A28", "Bold"))
    b.append(text("THAY NHỚT · VÁ XE · BƠM HƠI", 605, 945, 17, "#3B2A28", "Medium", max_width=270))
    # chồng lốp trước tiệm
    b.append(tire_stack(420, 1260, 6))
    b.append(tire_stack(520, 1275, 3))

    # ---------- TẠP HOÁ Cô Ba ----------
    b.append(outlined([rect(790, 805, 320, 470, "#8C7A66")], 3))
    # biển vàng
    b.append(outlined([rect(800, 815, 300, 140, "#F2C14E", 8)], 4))
    b.append(text("TẠP HOÁ", 935, 875, 60, RED, "Bold"))
    b.append(text("Cô Ba", 935, 918, 40, RED_D, "Bold"))
    b.append(text("BÁNH KẸO · NƯỚC NGỌT · ĐỒ GIA DỤNG", 935, 945, 16, "#3B2A28", "Medium", max_width=250))
    # mái che xanh
    aw = [poly([(790, 960), (1110, 960), (1110, 1010), (790, 1010)], "#3F7DB5")]
    b.append(outlined(aw, 3))
    for k in range(8):
        b.append(rect(790 + k * 40, 960, 20, 50, "#6CA0CF"))
    # kệ hàng nhiều màu
    b.append(rect(800, 1015, 310, 260, "#E9DCC3"))
    colors = ["#E25B45", "#F2C14E", "#4E9ACF", "#6FBF73", "#F08AB0", "#F7F2E8", "#E9893A", "#8E6CC0"]
    for row in range(5):
        y = 1030 + row * 50
        b.append(rect(805, y + 38, 300, 8, WOOD_D))
        x = 810
        while x < 1100:
            w = rnd.uniform(14, 30)
            h = rnd.uniform(22, 38)
            b.append(rect(x, y + 38 - h, w, h, rnd.choice(colors), 2, 'stroke="%s" stroke-width="1.5"' % O))
            x += w + 3
    # quầy trước tiệm
    b.append(outlined([rect(860, 1180, 200, 95, "#D9D2C6", 6)], 3))
    for k in range(6):
        b.append(rect(872 + k * 30, 1195, 22, 30, rnd.choice(colors), 3))
    return "\n".join(b)


# ================================================================ tree

def layer_tree():
    rnd = random.Random(3)
    b = []
    # thân + cành
    trunk = "M30,1340 C40,1100 20,900 70,760 C100,680 140,620 210,560 L235,585 C175,640 140,700 118,780 C95,880 110,1100 100,1340 Z"
    b.append(outlined([path(trunk, "#7B5235")], 4))
    b.append(stroke("M80,760 C40,690 0,660 -20,640", "#6A4428", 16))
    b.append(stroke("M100,700 C170,640 250,560 330,520", "#6A4428", 14))
    # tán lá nhiều lớp: tối phía sau → sáng phía trước
    for layer, col in [(0, GREEN_DD), (1, GREEN_D), (2, GREEN), (3, GREEN_L)]:
        for _ in range(9):
            cx = rnd.uniform(-60, 380 - layer * 25)
            cy = rnd.uniform(160 + layer * 40, 930 - layer * 50)
            b.append(blob(cx, cy, rnd.uniform(70, 120), rnd.uniform(50, 80), 10, rnd, col,
                          'stroke="%s" stroke-width="3"' % GREEN_DD if layer == 0 else ""))
    # chùm hoa sữa
    for _ in range(70):
        cx = rnd.uniform(-30, 380)
        cy = rnd.uniform(170, 920)
        r = rnd.uniform(11, 18)
        b.append(flower(cx, cy, r, rot=rnd.uniform(0, 60)))
    return "\n".join(b)


# ================================================================================================
# PHASE 2 — phố dài 3 màn hình (3240), lớp parallax, đạo cụ tách riêng
# ================================================================================================

WW = 3240          # bề rộng cả phố
CX = 1080          # phần giữa (Phase 0) bắt đầu từ đây
BLUE = "#3F7DB5"

PROPS = []         # (id, body, footY)
HOTSPOTS = []      # {id, name, rect, action?}


def shift(body, dx):
    return group(body if isinstance(body, str) else "\n".join(body), 'transform="translate(%d,0)"' % dx)


def prop(pid, body, foot, dx=0):
    body = body if isinstance(body, str) else "\n".join(body)
    PROPS.append((pid, shift(body, dx) if dx else body, foot))


def hotspot(hid, name, x0, y0, x1, y1, action=None):
    h = {"id": hid, "name": name, "rect": [x0, y0, x1, y1]}
    if action:
        h["action"] = action
    HOTSPOTS.append(h)


# ---------------------------------------------------------------- hình dùng chung

def shutter_window(x, y, w, h, frame, shut):
    s = [window(x, y, w, h, frame, GLASS, True)]
    sw = w * 0.42
    for sx in (x - sw - 4, x + w + 4):
        s.append(outlined([rect(sx, y, sw, h, shut, 4)], 3))
        for k in range(int(h // 18)):
            s.append(line(sx + 5, y + 10 + k * 18, sx + sw - 5, y + 10 + k * 18, O, 2, 'opacity="0.25"'))
    return "\n".join(s)


def flower_box(x, y, w, rnd):
    s = [outlined([rect(x, y, w, 22, "#B9603A", 4)], 3)]
    for _ in range(int(w // 14)):
        s.append(circle(x + rnd.uniform(6, w - 6), y - rnd.uniform(0, 16), rnd.uniform(8, 12), rnd.choice([GREEN, GREEN_D, GREEN_L])))
    for _ in range(int(w // 30)):
        s.append(circle(x + rnd.uniform(8, w - 8), y - rnd.uniform(4, 18), 6, rnd.choice(["#F08AB0", "#F2C14E", "#FFFFFF", "#E25B45"])))
    return "\n".join(s)


def pot(x, y, rnd, s=1.0, col="#B9603A"):
    """Chậu cây, (x, y) là chân chậu."""
    b = [ellipse(x, y, 40 * s, 8 * s, "#000000", 'opacity="0.15"'),
         outlined([poly([(x - 34 * s, y - 60 * s), (x + 34 * s, y - 60 * s), (x + 26 * s, y), (x - 26 * s, y)], col)], 3)]
    for _ in range(8):
        b.append(circle(x + rnd.uniform(-38, 38) * s, y - 60 * s - rnd.uniform(0, 60) * s, rnd.uniform(14, 20) * s, rnd.choice([GREEN, GREEN_D, GREEN_L])))
    return "\n".join(b)


def stool(x, y, s=1.0, col="#D93A30"):
    w, h = 80 * s, 70 * s
    shapes = [rect(x - w / 2, y - h, w, 16 * s, col, 6 * s),
              poly([(x - w / 2 + 4, y - h + 14), (x - w / 2 + 16 * s, y - h + 14), (x - w / 2 + 6 * s, y), (x - w / 2 - 4, y)], col),
              poly([(x + w / 2 - 16 * s, y - h + 14), (x + w / 2 - 4, y - h + 14), (x + w / 2 + 4, y), (x + w / 2 - 6 * s, y)], col)]
    return "\n".join([outlined(shapes, 3), rect(x - w / 2 + 8, y - h + 3, w - 16, 5 * s, "#F07A6E", 2)])


def pole(dx):
    b = [outlined([poly([(108, 560), (142, 560), (150, 1720), (100, 1720)], "#A7A39B")], 3),
         poly([(108, 560), (118, 560), (112, 1720), (100, 1720)], "#8E8A82"),
         outlined([rect(135, 760, 50, 80, "#C9C6BE", 4)], 3),
         outlined([rect(96, 1000, 44, 70, "#C9C6BE", 4)], 3),
         outlined([rect(70, 600, 110, 18, "#7A766F", 3)], 3)]
    return shift(b, dx)


POLES = [330, CX, 2090]


def wires():
    b = []
    xs = [-30] + [p + 125 for p in POLES] + [WW + 30]
    for i in range(len(xs) - 1):
        x0, x1 = xs[i], xs[i + 1]
        span = x1 - x0
        for k, (sag, dy) in enumerate([(70, 0), (60, 8), (90, 16), (50, 4), (110, 12), (80, 20)]):
            y = 602 + dy
            s = (sag + 30) * span / 1010 * 1.33
            b.append(stroke("M%d,%d C%.0f,%.0f %.0f,%.0f %d,%d" % (x0, y, x0 + span * 0.3, y + s, x0 + span * 0.7, y + s, x1, y), "#2D2A2A", 4))
    return "\n".join(b)


def motorbike(x, y, col, flip=1, seat="#3B2A28"):
    """Xe máy nhìn ngang; (x, y) là điểm giữa hai bánh trên mặt đất."""
    def P(*pts):
        return [(x + px * flip, y + py) for px, py in pts]
    s = [ellipse(x, y, 125, 12, "#000000", 'opacity="0.16"')]
    s.append(line(x - 20 * flip, y - 40, x - 40 * flip, y - 4, STEEL, 6))                       # chân chống
    s.append(outlined([circle(x - 80 * flip, y - 34, 34, "#2E2B2B"), circle(x + 82 * flip, y - 34, 34, "#2E2B2B")], 3))
    for wx in (-80, 82):
        s.append(circle(x + wx * flip, y - 34, 15, "#BDB8B0"))
        s.append(circle(x + wx * flip, y - 34, 5, STEEL))
    s.append(outlined([poly(P((-45, -62), (10, -62), (10, -36), (-45, -36)), "#8E8F90")], 3))      # máy
    body = poly(P((-122, -84), (-100, -100), (0, -94), (40, -70), (52, -124), (74, -122), (92, -44), (30, -40), (-12, -58), (-66, -50), (-116, -62)), col)
    s.append(outlined([body], 3))
    s.append(outlined([poly(P((-108, -112), (-10, -108), (4, -94), (-100, -96)), seat)], 3))        # yên
    s.append(poly(P((-104, -88), (-70, -90), (-70, -72), (-110, -70)), "#FFFFFF", 'opacity="0.25"'))
    s.append(line(x + 62 * flip, y - 122, x + 52 * flip, y - 158, STEEL, 7))                     # cổ lái
    s.append(line(x + 34 * flip, y - 160, x + 70 * flip, y - 156, STEEL, 7))
    s.append(outlined([circle(x + 36 * flip, y - 176, 9, "#C9CACA")], 2))                         # gương
    s.append(line(x + 40 * flip, y - 160, x + 37 * flip, y - 170, STEEL, 3))
    s.append(outlined([circle(x + 80 * flip, y - 112, 11, "#FFF2B0")], 2))                        # đèn
    s.append(outlined([rect(x - 130 * flip - (0 if flip > 0 else 14), y - 80, 14, 10, "#D9463B", 3)], 2))  # đèn hậu
    return "\n".join(s)


def bicycle(x, y, col):
    s = [ellipse(x, y, 110, 10, "#000000", 'opacity="0.14"')]
    for wx in (-70, 70):
        s.append(circle(x + wx, y - 44, 44, "none", 'stroke="%s" stroke-width="7"' % STEEL))
        s.append(circle(x + wx, y - 44, 37, "none", 'stroke="#BDB8B0" stroke-width="2"'))
        s.append(circle(x + wx, y - 44, 5, STEEL))
    fr = "M%d,%d L%d,%d L%d,%d L%d,%d Z M%d,%d L%d,%d" % (x - 70, y - 44, x - 30, y - 110, x + 40, y - 110, x - 5, y - 44, x + 40, y - 110, x + 70, y - 44)
    s.append(stroke(fr, col, 8))
    s.append(line(x - 30, y - 110, x - 36, y - 128, STEEL, 6))
    s.append(outlined([rect(x - 58, y - 138, 44, 12, "#3B2A28", 5)], 2))
    s.append(line(x + 40, y - 110, x + 34, y - 142, STEEL, 6))
    s.append(line(x + 20, y - 144, x + 50, y - 140, STEEL, 6))
    s.append(outlined([rect(x + 44, y - 132, 46, 34, WOOD_L, 4)], 3))        # giỏ
    for k in range(3):
        s.append(line(x + 54 + k * 12, y - 130, x + 54 + k * 12, y - 100, WOOD_D, 2))
    return "\n".join(s)


def parasol(x, y, c1="#E8756A", c2="#FFF3E0"):
    s = [ellipse(x, y, 46, 10, "#000000", 'opacity="0.16"'),
         outlined([rect(x - 26, y - 16, 52, 16, "#8E8A82", 5)], 3),
         outlined([rect(x - 6, y - 360, 12, 348, WOOD_D)], 3)]
    top, rim, half = y - 440, y - 330, 200
    s.append(outlined([path("M%d,%d Q%d,%d %d,%d Q%d,%d %d,%d Z" % (x - half, rim, x - half * 0.55, top, x, top - 14, x + half * 0.55, top, x + half, rim), c1)], 4))
    for k in (-1, 1):
        s.append(path("M%d,%d Q%d,%d %d,%d L%d,%d Z" % (x, top - 14, x + k * half * 0.3, top + 10, x + k * half * 0.5, rim, x + k * half * 0.16, rim), c2))
    sc = []
    for k in range(8):
        sc.append(circle(x - half + (k + 0.5) * half / 4, rim + 2, half / 8, c1 if k % 2 == 0 else c2))
    s.append(outlined(sc, 3))
    s.append(line(x - half, rim, x + half, rim, O, 4))
    s.append(outlined([circle(x, top - 18, 9, WOOD_D)], 3))
    return "\n".join(s)


def low_table(x, y, col=BLUE):
    return "\n".join([
        outlined([rect(x - 50, y - 66, 100, 16, col, 5),
                  poly([(x - 40, y - 52), (x - 30, y - 52), (x - 34, y), (x - 44, y)], col),
                  poly([(x + 30, y - 52), (x + 40, y - 52), (x + 44, y), (x + 34, y)], col)], 3),
        outlined([rect(x - 24, y - 86, 14, 20, "#FFFFFF", 3), rect(x + 4, y - 88, 14, 22, "#C98A4B", 3)], 2)])


def bench(x, y, w=220):
    s = [ellipse(x, y, w / 2, 9, "#000000", 'opacity="0.14"')]
    legs = [rect(x - w / 2 + 14, y - 62, 12, 62, STEEL), rect(x + w / 2 - 26, y - 62, 12, 62, STEEL)]
    back = [rect(x - w / 2, y - 132, w, 18, WOOD, 5), rect(x - w / 2, y - 106, w, 18, WOOD, 5),
            rect(x - w / 2 + 14, y - 132, 10, 76, STEEL), rect(x + w / 2 - 24, y - 132, 10, 76, STEEL)]
    seat = [rect(x - w / 2 - 6, y - 72, w + 12, 20, WOOD_L, 6)]
    s.append(outlined(legs + back + seat, 3))
    s.append(line(x - w / 2 + 6, y - 62, x + w / 2 - 6, y - 62, WOOD_D, 3))
    return "\n".join(s)


def dog(x, y):
    """Chó nhỏ lông vàng ngồi."""
    c, w = "#D99A5B", "#FFF6E6"
    s = [ellipse(x, y, 58, 10, "#000000", 'opacity="0.15"')]
    s.append(stroke("M%d,%d C%d,%d %d,%d %d,%d" % (x - 34, y - 20, x - 74, y - 24, x - 78, y - 62, x - 60, y - 76), O, 20))
    s.append(stroke("M%d,%d C%d,%d %d,%d %d,%d" % (x - 34, y - 20, x - 74, y - 24, x - 78, y - 62, x - 60, y - 76), c, 13))
    body = [ellipse(x - 4, y - 44, 42, 46, c), circle(x + 20, y - 108, 36, c),
            poly([(x - 8, y - 128), (x - 2, y - 168), (x + 20, y - 138)], c), poly([(x + 28, y - 138), (x + 50, y - 168), (x + 54, y - 124)], c),
            rect(x - 22, y - 16, 22, 16, w, 7), rect(x + 8, y - 16, 22, 16, w, 7)]
    s.append(outlined(body, 3))
    s += [ellipse(x + 6, y - 38, 22, 32, w), ellipse(x + 30, y - 94, 20, 15, w), ellipse(x + 38, y - 100, 6, 5, O),
          circle(x + 10, y - 114, 4.5, O), circle(x + 34, y - 116, 4.5, O),
          stroke("M%d,%d Q%d,%d %d,%d" % (x + 28, y - 90, x + 36, y - 82, x + 44, y - 90), O, 2.5),
          outlined([rect(x - 6, y - 76, 44, 9, "#D9463B", 4)], 2)]
    return "\n".join(s)


def cat(x, y):
    """Mèo cam nằm ngủ cuộn tròn."""
    c = "#F0A254"
    s = [ellipse(x, y, 56, 8, "#000000", 'opacity="0.14"')]
    s.append(outlined([ellipse(x, y - 22, 50, 24, c), circle(x + 36, y - 24, 19, c),
                       poly([(x + 22, y - 36), (x + 26, y - 56), (x + 38, y - 42)], c), poly([(x + 40, y - 42), (x + 52, y - 56), (x + 54, y - 34)], c)], 3))
    s.append(stroke("M%d,%d C%d,%d %d,%d %d,%d" % (x - 46, y - 18, x - 66, y - 4, x - 20, y + 2, x + 6, y - 6), O, 13))
    s.append(stroke("M%d,%d C%d,%d %d,%d %d,%d" % (x - 46, y - 18, x - 66, y - 4, x - 20, y + 2, x + 6, y - 6), c, 8))
    for k in range(3):
        s.append(stroke("M%d,%d q4,8 0,16" % (x - 20 + k * 16, y - 42), "#D67F32", 4))
    s.append(stroke("M%d,%d q4,4 8,0 M%d,%d q4,4 8,0" % (x + 28, y - 24, x + 40, y - 24), O, 2.5))
    return "\n".join(s)


def sign_post(x, y, h=420):
    return outlined([rect(x - 6, y - h, 12, h, "#8E8A82", 3)], 3) + "\n" + ellipse(x, y, 22, 6, "#000000", 'opacity="0.15"')


# ---------------------------------------------------------------- lớp xa

def layer_far():
    """Dãy nhà rất xa (parallax 0.25), màu nhạt."""
    LW = 1620
    rnd = random.Random(31)
    b = []
    x = -30
    cols = ["#CBD9E0", "#D9D5C8", "#C3D0D8", "#DCD2C3", "#CFDCD6"]
    while x < LW + 30:
        w = rnd.uniform(90, 190)
        h = rnd.uniform(260, 640)
        c = rnd.choice(cols)
        b.append(rect(x, 1320 - h, w, h, c))
        if rnd.random() < 0.35:
            b.append(poly([(x - 6, 1320 - h), (x + w / 2, 1320 - h - 50), (x + w + 6, 1320 - h)], "#D7B5A4"))
        elif rnd.random() < 0.4:
            b.append(rect(x + w * 0.3, 1320 - h - 34, 30, 34, "#B9C6CD", 4))
            b.append(line(x + w * 0.7, 1320 - h, x + w * 0.7, 1320 - h - 70, "#AEBBC2", 3))
        for r in range(int(h // 70)):
            for k in range(int(w // 40)):
                b.append(rect(x + 14 + k * 40, 1320 - h + 24 + r * 70, 16, 26, "#FFFFFF", 2, 'opacity="0.55"'))
        x += w + rnd.uniform(-10, 24)
    for _ in range(26):
        b.append(blob(rnd.uniform(-20, LW + 20), rnd.uniform(1200, 1320), rnd.uniform(60, 110), rnd.uniform(40, 60), 9, rnd, rnd.choice(["#A9C9A2", "#B8D3AC"])))
    return LW, "\n".join(b)


def layer_back():
    """Nhà phía sau (parallax 0.5). Nhà hồng của Phase 0 nằm đúng vị trí cũ khi camera ở giữa."""
    LW = 2160
    rnd = random.Random(41)
    b = []
    for (x, w, top, wall, roof) in [(20, 270, 520, "#DCCBA4", "#B5583F"), (330, 310, 400, "#C9D9C4", None), (1090, 280, 500, "#E5D2A9", "#B5583F"),
                                    (1410, 330, 360, "#C9D0DE", None), (1780, 320, 470, "#E8C5B1", "#A9573F")]:
        fr = "#9C8A6E"
        b.append(outlined([rect(x, top, w, 1340 - top, wall)], 3))
        if roof:
            b.append(outlined([poly([(x - 20, top + 16), (x + w * 0.5, top - 100), (x + w + 20, top + 16)], roof)], 3))
        else:
            b.append(outlined([rect(x - 10, top - 14, w + 20, 26, "#B9B2A2", 4)], 3))
            b.append(outlined([rect(x + w * 0.6, top - 84, 70, 60, "#9FB3BF", 8)], 3))        # bồn nước
            b.append(line(x + w * 0.6 + 10, top - 24, x + w * 0.6 + 10, top - 12, STEEL, 4))
            b.append(line(x + w * 0.6 + 60, top - 24, x + w * 0.6 + 60, top - 12, STEEL, 4))
        n = max(2, int(w // 130))
        for i in range(int((1340 - top - 80) // 200)):
            for j in range(n):
                b.append(window(x + 30 + j * (w - 60 - 80) / max(1, n - 1), top + 70 + i * 200, 80, 120, fr, "#B8D6DE", True))
    b.append(shift(layer_back_buildings(), 540))
    for _ in range(18):
        b.append(blob(rnd.uniform(-20, LW + 20), rnd.uniform(1180, 1330), rnd.uniform(70, 120), rnd.uniform(50, 70), 9, rnd, rnd.choice([GREEN_D, GREEN, "#7FB06A"])))
    return LW, "\n".join(b)


# ---------------------------------------------------------------- mặt phố: nhà trái / phải

def house_shell(x, w, wall, shade, top=-20, ledges=(270, 560)):
    b = [outlined([rect(x, top, w, 1290 - top, wall)], 3), rect(x, top, 22, 1290 - top, shade)]
    for y in ledges:
        if y > top:
            b.append(outlined([rect(x - 10, y, w + 20, 26, shade, 4)], 3))
    return b


def left_houses():
    rnd = random.Random(51)
    b = []
    # ---------- Nhà của bạn: mái ngói đỏ, tường xanh bạc hà ----------
    x, w, top = 30, 370, 400
    b += house_shell(x, w, "#BFD8C9", "#A5C4B3", top, ledges=(700,))
    b.append(outlined([poly([(x - 34, top + 14), (x + 40, top - 120), (x + w - 40, top - 120), (x + w + 34, top + 14)], "#C9674E")], 4))
    for k in range(1, 5):
        t = k / 5.0
        b.append(line(x + 40 - 74 * t + 8, top - 120 + 134 * t, x + w - 40 + 74 * t - 8, top - 120 + 134 * t, "#A84F3A", 4))
    for k in range(9):
        xx = x + 30 + k * (w - 60) / 8
        b.append(line(xx, top - 116, xx + (k - 4) * 9, top + 8, "#A84F3A", 2, 'opacity="0.6"'))
    b.append(shutter_window(x + 60, 480, 70, 150, "#F6F1E6", "#5E8F6B"))
    b.append(shutter_window(x + 240, 480, 70, 150, "#F6F1E6", "#5E8F6B"))
    b.append(flower_box(x + 50, 636, 90, rnd))
    b.append(flower_box(x + 230, 636, 90, rnd))
    # cửa gỗ + mái hiên nhỏ + bậc thềm
    b.append(outlined([rect(x + 55, 1262, 190, 24, "#CFC6B4", 4)], 3))
    b.append(outlined([path("M%d,1270 L%d,930 Q%d,880 %d,930 L%d,1270 Z" % (x + 70, x + 70, x + 150, x + 230, x + 230), WOOD)], 4))
    b.append(line(x + 150, 905, x + 150, 1268, WOOD_D, 4))
    for (px, py) in [(x + 84, 960), (x + 162, 960), (x + 84, 1110), (x + 162, 1110)]:
        b.append(rect(px, py, 54, 120, "none", 6, 'stroke="%s" stroke-width="4"' % WOOD_D))
    b.append(circle(x + 138, 1100, 7, "#F2C14E", 'stroke="%s" stroke-width="2"' % O))
    b.append(outlined([poly([(x + 40, 880), (x + 260, 880), (x + 280, 912), (x + 20, 912)], "#C9674E")], 3))
    b.append(outlined([rect(x + 262, 800, 60, 40, "#2F65A7", 6)], 3))
    b.append(text("12", x + 292, 830, 28, "#FFFFFF", "Bold"))
    b.append(window(x + 262, 960, 86, 150, "#F6F1E6", GLASS, True))
    b.append(flower_box(x + 254, 1116, 102, rnd))
    b.append(outlined([rect(x + 20, 1040, 38, 56, "#D9463B", 6)], 3))                      # hộp thư
    b.append(line(x + 28, 1058, x + 50, 1058, "#7A1F1A", 4))
    hotspot("home", "Nhà của bạn", x + 40, 880, x + 250, 1290)

    # ---------- Hẻm 12 (khe giữa hai nhà) ----------
    b.append(stroke("M400,700 Q460,730 520,700", STEEL, 3))
    for k, c in enumerate(["#F2D27A", "#7CA4C9", "#E67D6B", "#FFFFFF"]):
        b.append(outlined([rect(412 + k * 26, 708 + (6 if k in (1, 2) else 0), 20, 44, c, 3)], 2))

    # ---------- Nhà xanh: cửa sắt xếp + Bảng tin khu phố ----------
    x, w = 520, 440
    b += house_shell(x, w, "#B9D3DD", "#9DBCC8")
    b.append(shutter_window(x + 70, 50, 80, 170, "#F6F1E6", "#5E8F6B"))
    b.append(shutter_window(x + 290, 50, 80, 170, "#F6F1E6", "#5E8F6B"))
    b.append(outlined([rect(x + 110, 330, 220, 210, WOOD_D, 6)], 3))
    b.append(rect(x + 122, 342, 92, 186, "#5E6D62", 3))
    b.append(rect(x + 226, 342, 92, 186, "#5E6D62", 3))
    b.append(balcony(x + 50, 420, 340, True, rnd))
    b.append(stroke("M%d,455 Q%d,480 %d,455" % (x + 60, x + 220, x + 380), STEEL, 3))
    for k, c in enumerate(["#FFFFFF", "#F08AB0", "#7CA4C9", "#F2D27A", "#9BC48A"]):
        b.append(outlined([rect(x + 120 + k * 44, 468, 30, 50 + (k % 2) * 10, c, 4)], 2))
    b.append(ac_unit(x + 60, 630))
    b.append(vines(rnd, x + 300, x + 430, -10, 500, 5))
    b.append(outlined([rect(x - 15, 760, w + 30, 40, "#AFC6CE", 4)], 3))
    b.append(rect(x - 15, 795, w + 30, 10, "#000000", 'opacity="0.12"'))
    b.append(rect(x + 22, 805, w - 22, 470, "#A9C5CF"))
    b.append(outlined([rect(x + 40, 850, 110, 54, "#2F65A7", 6)], 3))
    b.append(text("HẺM 12", x + 95, 886, 24, "#FFFFFF", "Bold"))
    # cửa sắt xếp mở một nửa
    gx = x + 200
    b.append(outlined([rect(gx, 880, 220, 395, "#4F4A45")], 3))
    b.append(rect(gx + 20, 1120, 60, 155, "#6B625A"))                                         # đồ đạc trong nhà
    b.append(outlined([rect(gx + 110, 880, 110, 395, "#8A9AA0")], 3))
    for k in range(7):
        b.append(line(gx + 118 + k * 16, 884, gx + 118 + k * 16, 1272, "#5F6E74", 3))
    for k in range(6):
        b.append(stroke("M%d,%d l96,60 M%d,%d l96,-60" % (gx + 116, 900 + k * 62, gx + 116, 960 + k * 62), "#5F6E74", 2))
    # bảng tin
    bx = x + 40
    b.append(outlined([rect(bx, 950, 150, 215, WOOD, 8)], 4))
    b.append(rect(bx + 10, 990, 130, 165, "#DDBE8E", 4))
    b.append(text("BẢNG TIN", bx + 75, 980, 20, "#FFF8EC", "Bold"))
    for (px, py, pw, ph, c, r) in [(14, 1000, 54, 66, "#FFFDF4", -4), (76, 996, 56, 50, "#F7E08A", 5), (18, 1076, 50, 66, "#BFE0F2", 3), (76, 1056, 58, 86, "#FFFDF4", -3)]:
        b.append(group([rect(bx + px, py, pw, ph, c, 2, 'stroke="%s" stroke-width="1.5"' % O),
                        line(bx + px + 8, py + 16, bx + px + pw - 8, py + 16, "#9A8F80", 3), line(bx + px + 8, py + 28, bx + px + pw - 14, py + 28, "#9A8F80", 3),
                        circle(bx + px + pw / 2, py + 5, 4.5, "#D9463B")], 'transform="rotate(%d %d %d)"' % (r, bx + px + pw / 2, py + ph / 2)))
    hotspot("board", "Bảng tin khu phố", bx - 10, 940, bx + 160, 1180, "quests")
    return "\n".join(b)


def right_houses():
    rnd = random.Random(61)
    b = []
    # ---------- Nhà mái tôn ----------
    x, w, top = 2240, 410, 220
    b += house_shell(x, w, "#E9B7A0", "#D49C84", top, ledges=(520,))
    b.append(outlined([poly([(x - 20, top + 14), (x + 14, top - 76), (x + w - 14, top - 76), (x + w + 20, top + 14)], "#8AA1AE")], 4))
    for k in range(1, 16):
        xx = x + k * w / 16
        b.append(line(xx, top - 72, xx + (k - 8) * 2.4, top + 10, "#6F8792", 3))
    for j in range(2):
        b.append(window(x + 60 + j * 190, 300, 110, 170, "#F6F1E6", GLASS, True))
        for k in range(4):
            b.append(line(x + 70 + j * 190 + k * 30, 306, x + 70 + j * 190 + k * 30, 464, STEEL, 2))
        b.append(window(x + 70 + j * 190, 580, 90, 130, "#F6F1E6", GLASS, True))
    b.append(flower_box(x + 50, 476, 130, rnd))
    b.append(outlined([rect(x - 15, 760, w + 30, 40, "#D9A68E", 4)], 3))
    b.append(rect(x - 15, 795, w + 30, 10, "#000000", 'opacity="0.12"'))
    b.append(rect(x + 22, 805, w - 22, 470, "#DDA890"))
    for k in range(4):                                                                        # cửa gỗ xanh 4 cánh
        dx = x + 60 + k * 74
        if k == 2:
            b.append(outlined([rect(dx, 870, 70, 405, "#4A4039")], 3))
            continue
        b.append(outlined([rect(dx, 870, 70, 405, "#4F8A6B")], 3))
        b.append(rect(dx + 10, 884, 50, 150, "#9CC3CF", 4, 'stroke="%s" stroke-width="2"' % O))
        b.append(rect(dx + 10, 1050, 50, 210, "none", 4, 'stroke="#3C6B52" stroke-width="4"'))
    b.append(outlined([rect(x + 50, 1266, 320, 20, "#CFC6B4", 4)], 3))

    # ---------- Nhà kem: mặt bằng cho thuê ----------
    x, w = 2760, 400
    b += house_shell(x, w, "#EFE3C8", "#DCCBA6")
    b.append(window(x + 50, 40, 110, 190))
    b.append(window(x + 240, 40, 110, 190))
    b.append(window(x + 100, 320, 200, 170, WOOD_D, GLASS, True))
    b.append(balcony(x + 40, 440, 320, True, rnd))
    b.append(ac_unit(x + 190, 630))
    b.append(vines(rnd, x + 20, x + 120, 290, 740, 3))
    b.append(outlined([rect(x - 15, 760, w + 30, 40, "#CDBB98", 4)], 3))
    b.append(rect(x - 15, 795, w + 30, 10, "#000000", 'opacity="0.12"'))
    b.append(rect(x + 22, 805, w - 22, 470, "#E4D6B6"))
    b.append(outlined([rect(x + 50, 860, 300, 415, "#BDB9B1")], 3))
    for k in range(28):
        b.append(line(x + 54, 874 + k * 14, x + 346, 874 + k * 14, "#9E9A92", 3))
    b.append(outlined([rect(x + 90, 950, 220, 120, "#F6F1E6", 8)], 4))
    b.append(text("MẶT BẰNG", x + 200, 992, 26, "#3B2A28", "Bold"))
    b.append(text("CHO THUÊ", x + 200, 1044, 44, RED, "Bold", max_width=196))
    hotspot("forrent", "Mặt bằng cho thuê — mở rộng quán sau này", x + 50, 860, x + 350, 1280)
    return "\n".join(b)


def small_tree(tx, rnd):
    b = [outlined([poly([(tx - 20, 1345), (tx + 22, 1345), (tx + 12, 880), (tx - 8, 880)], "#7B5235")], 4),
         stroke("M%d,1000 C%d,940 %d,900 %d,860" % (tx, tx - 30, tx - 70, tx - 90), "#6A4428", 12),
         stroke("M%d,960 C%d,900 %d,880 %d,830" % (tx + 4, tx + 40, tx + 70, tx + 80), "#6A4428", 11)]
    for layer, col in [(0, GREEN_DD), (1, GREEN_D), (2, GREEN), (3, GREEN_L)]:
        for _ in range(6):
            b.append(blob(tx + rnd.uniform(-150, 150 - layer * 10), rnd.uniform(560 + layer * 30, 900 - layer * 30), rnd.uniform(60, 95), rnd.uniform(44, 64), 10, rnd, col,
                          'stroke="%s" stroke-width="3"' % GREEN_DD if layer == 0 else ""))
    for _ in range(30):
        b.append(flower(tx + rnd.uniform(-170, 170), rnd.uniform(560, 900), rnd.uniform(10, 16), rot=rnd.uniform(0, 60)))
    return "\n".join(b)


# ---------------------------------------------------------------- mặt phố: nền

def sidewalk():
    b = [rect(0, 1270, WW, 540, "#D8C6A5")]
    for k in range(10):
        y = 1270 + k * 52
        b.append(line(0, y, WW, y, "#BFAA86", 3))
    for k in range(-6, WW // 70 + 8):
        x0 = k * 70 + CX % 70
        b.append(line(x0, 1270, x0 - 90, 1800, "#BFAA86", 3))
    b.append(rect(0, 1270, WW, 30, "#000000", 'opacity="0.10"'))
    b.append(outlined([rect(-10, 1780, WW + 20, 46, "#BDB3A2")], 3))
    for k in range(WW // 84 + 2):
        xx = k * 84 + CX % 84
        b.append(line(xx, 1782, xx, 1824, "#9C9282", 3))
    return "\n".join(b)


def road():
    b = [rect(0, 1820, WW, H - 1820, "url(#road)")]
    for k in range(7):                                                                        # vạch qua đường (giữa)
        y = 1880 + k * 62
        b.append(poly([(CX + 560 + k * 10, y), (CX + 900 + k * 10, y - 40), (CX + 920 + k * 10, y - 8), (CX + 580 + k * 10, y + 32)], "#F1F0EC", 'opacity="0.92"'))
    for k in range(4):
        b.append(rect(CX + 40 + k * 150, 1900 + k * 8, 90, 14, "#F1F0EC", 4, 'opacity="0.85"'))
    for x in list(range(60, 1000, 300)) + list(range(2280, WW, 300)):
        b.append(rect(x, 2070, 130, 16, "#F1F0EC", 4, 'opacity="0.8"'))
    b.append(ellipse(520, 1930, 60, 20, "#5F6168"))
    b.append(ellipse(520, 1930, 60, 20, "none", 'stroke="#4E5056" stroke-width="4"'))
    b.append(ellipse(2700, 1960, 60, 20, "#5F6168"))
    for x in (300, 1500, 2500, 3100):                                                          # miệng cống ở bó vỉa
        b.append(outlined([rect(x, 1822, 110, 18, "#4A4B50", 4)], 2))
    return "\n".join(b)


ROAD_DEFS = ('<linearGradient id="road" x1="0" y1="0" x2="0" y2="1">'
             '<stop offset="0" stop-color="#8A8C92"/><stop offset="1" stop-color="#6E7077"/></linearGradient>')


def layer_main():
    rnd = random.Random(71)
    b = [left_houses(), right_houses(), shift(layer_main_building(), CX), shift(layer_shops(), CX), sidewalk(), road(),
         shift(layer_tree(), CX), small_tree(2705, rnd), wires()]
    hotspot("chutu", "Tiệm sửa xe Chú Tư", CX + 440, 805, CX + 770, 1280)
    hotspot("coba", "Tạp hoá Cô Ba", CX + 790, 805, CX + 1110, 1280, "shop")
    return WW, "\n".join(b)


def layer_front():
    """Cụm hoa sữa tiền cảnh (parallax 1.25) — cụm giữa nằm đúng chỗ Phase 0 khi camera ở giữa."""
    LW = 3840
    b = []
    rnd = random.Random(21)
    for _ in range(6):
        b.append(blob(1350 + rnd.uniform(-40, 200), rnd.uniform(2180, 2380), rnd.uniform(70, 100), rnd.uniform(45, 60), 9, rnd, rnd.choice([GREEN_D, GREEN])))
    for _ in range(14):
        b.append(flower(1350 + rnd.uniform(-20, 230), rnd.uniform(2170, 2340), rnd.uniform(14, 20), rot=rnd.uniform(0, 60)))
    for cx in (260, 900, 2500, 3050, 3620):
        for _ in range(5):
            b.append(blob(cx + rnd.uniform(-110, 110), rnd.uniform(2200, 2380), rnd.uniform(70, 100), rnd.uniform(45, 60), 9, rnd, rnd.choice([GREEN_D, GREEN])))
        for _ in range(11):
            b.append(flower(cx + rnd.uniform(-120, 120), rnd.uniform(2190, 2340), rnd.uniform(14, 20), rot=rnd.uniform(0, 60)))
    return LW, "\n".join(b)


# ---------------------------------------------------------------- đạo cụ

def build_props():
    rnd = random.Random(5)
    # ===== xe cà phê (giữa) =====
    b = [ellipse(610, 1520, 220, 26, "#000000", 'opacity="0.18"'),
         outlined([rect(458, 1150, 12, 220, WOOD_D), rect(752, 1150, 12, 220, WOOD_D)], 3)]
    top = [(430, 1180), (790, 1180), (760, 1100), (460, 1100)]
    b.append(outlined([poly(top, "#F4E6CC")], 4))
    stripes = 8
    for k in range(stripes):
        if k % 2 == 0:
            t0, t1 = k / stripes, (k + 1) / stripes
            b.append(poly([(460 + 300 * t0, 1100), (460 + 300 * t1, 1100), (430 + 360 * t1, 1180), (430 + 360 * t0, 1180)], "#A3643E"))
    b.append(outlined([circle(430 + 360 * (k + 0.5) / stripes, 1182, 22.5, "#A3643E" if k % 2 == 0 else "#F4E6CC") for k in range(stripes)], 3))
    b.append(line(430, 1180, 790, 1180, O, 4))
    b.append(outlined([rect(450, 1330, 320, 26, WOOD_L, 6)], 3))
    b.append(outlined([rect(545, 1230, 52, 100, "#E9E7E2", 8), rect(555, 1205, 32, 30, "#5B5B5B", 4)], 3))
    for (x, h, c) in [(480, 70, "#7A4B2E"), (630, 60, "#E8DFC9"), (680, 55, "#C9A06A"), (725, 50, "#F2F0EA")]:
        b.append(outlined([rect(x, 1330 - h, 34, h, c, 6), rect(x - 2, 1330 - h - 10, 38, 12, "#B33A2E", 4)], 3))
    for k in range(3):
        b.append(outlined([poly([(610 + k * 28, 1300), (632 + k * 28, 1300), (628 + k * 28, 1330), (614 + k * 28, 1330)], "#FFFFFF")], 2))
    b.append(outlined([rect(455, 1356, 310, 130, "#E7B866", 10)], 4))
    b.append(rect(470, 1370, 280, 102, "none", 8, 'stroke="%s" stroke-width="5"' % WOOD_D))
    b.append(text("CÀ PHÊ", 625, 1430, 50, "#4A2E22", "Bold"))
    b.append(text("GÓC PHỐ", 625, 1462, 24, "#4A2E22", "Bold"))
    for k in range(4):
        b.append(ellipse(492, 1385 + k * 22, 13, 7, GREEN_D, 'transform="rotate(%d 492 %d)"' % (-30 if k % 2 else 30, 1385 + k * 22)))
    b.append(line(492, 1378, 492, 1460, GREEN_DD, 3))
    for x in (505, 720):
        b.append(outlined([circle(x, 1500, 34, "#3B3534")], 3))
        b.append(circle(x, 1500, 14, "#C9C3BA"))
    b.append(outlined([poly([(735, 1330), (775, 1330), (770, 1300), (740, 1300)], "#C46A3E")], 3))
    for _ in range(6):
        b.append(circle(755 + rnd.uniform(-22, 22), 1285 - rnd.uniform(0, 30), rnd.uniform(10, 15), rnd.choice([GREEN, GREEN_L])))
    prop("cart", b, 1534, CX)
    hotspot("cart", "Xe cà phê Góc Phố", CX + 430, 1100, CX + 790, 1535, "stall")

    b = [outlined([poly([(793, 1640), (815, 1400), (830, 1400), (810, 1640)], WOOD_D), poly([(925, 1640), (907, 1400), (922, 1400), (940, 1640)], WOOD_D),
                   rect(785, 1395, 155, 200, "#2F3A37", 8)], 4),
         rect(793, 1403, 139, 184, "none", 6, 'stroke="%s" stroke-width="6"' % WOOD_D),
         text("CÀ PHÊ  25K", 862, 1450, 22, "#F2F0E6", "Medium", max_width=125), text("TRÀ TẮC  20K", 862, 1500, 22, "#F2F0E6", "Medium", max_width=125),
         text("BÁNH MÌ  30K", 862, 1550, 22, "#F2F0E6", "Medium", max_width=125)]
    prop("chalkboard", b, 1640, CX)
    hotspot("menu", "Bảng menu: Cà phê 25K · Trà tắc 20K · Bánh mì 30K", CX + 785, 1395, CX + 940, 1640)

    prop("stool_a", stool(470, 1640), 1640, CX)
    prop("stool_b", stool(620, 1690), 1690, CX)
    prop("table_red", [outlined([rect(520, 1600, 80, 16, "#D93A30", 5), poly([(530, 1614), (540, 1614), (536, 1665), (526, 1665)], "#D93A30"),
                                 poly([(580, 1614), (590, 1614), (594, 1665), (584, 1665)], "#D93A30")], 3),
                       outlined([rect(540, 1585, 14, 18, "#FFFFFF", 3), rect(564, 1583, 14, 20, "#FFFFFF", 3)], 2)], 1665, CX)
    prop("stool_c", stool(990, 1600, 0.9), 1600, CX)
    prop("pot_cart_l", pot(400, 1500, rnd), 1500, CX)
    prop("pot_cart_r", pot(1010, 1480, rnd), 1480, CX)

    b = [outlined([rect(930, 1700, 200, 150, "#B98652", 8)], 4)]
    for _ in range(26):
        b.append(circle(rnd.uniform(945, 1100), rnd.uniform(1660, 1710), rnd.uniform(16, 22), rnd.choice(["#8CC152", "#A5D46A", "#6FA544"]), 'stroke="%s" stroke-width="2"' % GREEN_DD))
    b += [outlined([rect(950, 1730, 150, 90, "#F2C14E", 6)], 3), text("TRÁI CÂY", 1025, 1768, 26, RED, "Bold"), text("TƯƠI NGON", 1025, 1802, 24, RED, "Bold"),
          outlined([circle(980, 1880, 46, "#3B3534"), circle(1100, 1880, 46, "#3B3534")], 3), circle(980, 1880, 30, "#8E8A82"), circle(1100, 1880, 30, "#8E8A82"),
          circle(980, 1880, 8, STEEL), circle(1100, 1880, 8, STEEL)]
    prop("fruit_cart", b, 1926, CX)
    hotspot("fruit", "Xe trái cây tươi ngon", CX + 925, 1640, CX + 1150, 1930)

    # ===== cột, biển, thùng rác =====
    for i, dx in enumerate(POLES):
        prop("pole_%d" % i, pole(dx), 1640)   # xếp sau biển tên đường và thùng rác như Phase 0
    b = [outlined([rect(52, 820, 24, 860, "#F4F1EA", 6)], 3)]
    for k in range(10):
        b.append(rect(52, 830 + k * 86, 24, 42, "#D9463B"))
    b += [outlined([rect(70, 835, 170, 100, "#2F65A7", 10)], 4), rect(80, 845, 150, 80, "none", 6, 'stroke="#FFFFFF" stroke-width="3"'),
          text("ĐƯỜNG", 155, 875, 22, "#FFFFFF", "Bold"), text("HOA SỮA", 155, 912, 32, "#FFFFFF", "Bold")]
    prop("street_sign", b, 1680, CX)
    b = [outlined([poly([(85, 1470), (215, 1470), (205, 1650), (95, 1650)], "#3F8A4F"), rect(78, 1450, 144, 30, "#337443", 6)], 3),
         text("GIỮ", 150, 1530, 24, "#E7F2DC", "Bold"), text("PHỐ SẠCH", 150, 1562, 22, "#E7F2DC", "Bold"), text("ĐẸP", 150, 1594, 24, "#E7F2DC", "Bold"),
         outlined([circle(110, 1660, 16, "#2E2B2B"), circle(190, 1660, 16, "#2E2B2B")], 3)]
    prop("bin", b, 1676, CX)
    hotspot("bin", "Thùng rác — Giữ phố sạch đẹp", CX + 78, 1450, CX + 222, 1676)

    # ===== bên trái =====
    prop("parasol", parasol(250, 1590), 1590)
    prop("table_blue", low_table(250, 1660), 1660)
    prop("stool_blue_a", stool(130, 1650, 0.95, BLUE).replace("#F07A6E", "#7FB2DD"), 1650)
    prop("stool_blue_b", stool(370, 1690, 0.95, BLUE).replace("#F07A6E", "#7FB2DD"), 1690)
    hotspot("seat", "Góc ngồi nghỉ dưới dù", 60, 1150, 450, 1700)
    prop("cat", cat(860, 1570), 1641)
    prop("pot_alley", pot(545, 1345, rnd, 0.9), 1345)
    prop("bench_l", bench(840, 1640, 210), 1640)
    prop("bike_red", motorbike(810, 1440, "#D9463B"), 1440)
    prop("bike_blue", motorbike(980, 1520, "#3F7DB5", -1), 1520)
    prop("bike_fix", motorbike(CX + 290, 1420, "#9AA5AD", 1, "#5B4E45"), 1420)
    prop("toolbox", [outlined([rect(CX + 395, 1385, 70, 40, "#D9463B", 6), rect(CX + 415, 1370, 30, 18, "#8E8A82", 5)], 3)], 1426)

    # ===== bên phải =====
    prop("dog", dog(CX + 770, 1745), 1745)
    prop("pot_c1", pot(2290, 1350, rnd, 0.9, "#8FA8B5"), 1350)
    prop("pot_c2", pot(2610, 1350, rnd, 0.9), 1350)
    prop("bicycle", bicycle(2430, 1400, "#2F9C8F"), 1400)
    prop("bench_r", bench(2960, 1420, 230), 1420)
    b = [sign_post(2830, 1730, 470), outlined([circle(2830, 1220, 62, "#2F65A7")], 4), circle(2830, 1220, 50, "none", 'stroke="#FFFFFF" stroke-width="4"'),
         outlined([rect(2796, 1196, 68, 42, "#FFFFFF", 8)], 2), rect(2804, 1204, 22, 16, "#2F65A7", 3), rect(2832, 1204, 22, 16, "#2F65A7", 3),
         circle(2812, 1240, 7, O), circle(2848, 1240, 7, O),
         outlined([rect(2760, 1300, 140, 70, "#F6F1E6", 8)], 3), text("TRẠM XE BUÝT", 2830, 1330, 17, "#2F65A7", "Bold", max_width=124),
         text("Tuyến 08", 2830, 1356, 18, "#3B2A28", "Medium")]
    prop("bus_stop", b, 1730)
    hotspot("bus", "Trạm xe buýt — tuyến 08", 2750, 1150, 3080, 1740)
    b = [sign_post(3140, 1600, 400),
         outlined([poly([(3040, 1210), (3180, 1210), (3220, 1250), (3180, 1290), (3040, 1290)], "#2F65A7")], 4),
         text("BỜ SÔNG", 3112, 1262, 30, "#FFFFFF", "Bold", max_width=130),
         outlined([rect(3085, 1305, 110, 40, "#F6F1E6", 6)], 3), text("200 m", 3140, 1334, 22, "#3B2A28", "Medium")]
    prop("river_sign", b, 1600)
    hotspot("river", "Lối ra Bờ sông — sắp mở", 3030, 1200, 3230, 1610, "map")


# ---------------------------------------------------------------- xuất file

def render_bbox(body, lw, defs=""):
    import io
    import cairosvg
    from PIL import Image
    data = svg(lw, H, body, "bbox", defs)
    png = cairosvg.svg2png(bytestring=data.encode("utf-8"), output_width=lw // 2, output_height=H // 2)
    im = Image.open(io.BytesIO(png)).convert("RGBA")
    bb = im.split()[3].getbbox()
    return im, [max(0, bb[0] * 2 - 6), max(0, bb[1] * 2 - 6), min(lw, bb[2] * 2 + 6), min(H, bb[3] * 2 + 6)]


def main():
    import json
    from PIL import Image
    os.makedirs(os.path.join(OUT, "props"), exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith(".svg"):
            os.remove(os.path.join(OUT, f))
    for f in os.listdir(os.path.join(OUT, "props")):
        os.remove(os.path.join(OUT, "props", f))

    lw_far, far = layer_far()
    lw_back, back = layer_back()
    lw_main, main_body = layer_main()
    lw_front, front = layer_front()
    build_props()
    sky_svg = layer_sky()
    with open(os.path.join(OUT, "sky.svg"), "w", encoding="utf-8") as f:
        f.write(sky_svg)
    layers = [{"name": "sky", "width": W, "parallax": 0, "bbox": [0, 0, W, 1300]}]
    panorama = Image.new("RGBA", (WW // 2, H // 2), (207, 232, 243, 255))
    for name, lw, body, par, defs in [("far", lw_far, far, 0.25, ""), ("back", lw_back, back, 0.5, ""), ("main", lw_main, main_body, 1, ROAD_DEFS),
                                      ("front", lw_front, front, 1.25, "")]:
        with open(os.path.join(OUT, name + ".svg"), "w", encoding="utf-8") as f:
            f.write(svg(lw, H, body, name, defs))
        im, bb = render_bbox(body, lw, defs)
        layers.append({"name": name, "width": lw, "parallax": par, "bbox": bb})
        if name == "main":
            panorama.alpha_composite(im)
        print("ok", name, lw, bb)

    props = []
    for pid, body, foot in PROPS:
        im, bb = render_bbox(body, WW)
        bw, bh = bb[2] - bb[0], bb[3] - bb[1]
        data = ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="%d %d %d %d">\n<title>%s — Góc Phố Việt (original vector art)</title>\n%s\n</svg>\n'
                % (bw, bh, bb[0], bb[1], bw, bh, pid, body))
        with open(os.path.join(OUT, "props", pid + ".svg"), "w", encoding="utf-8") as f:
            f.write(data)
        props.append({"id": pid, "x": bb[0], "y": bb[1], "w": bw, "h": bh, "foot": foot, "im": im})
    for p in sorted(props, key=lambda p: p["foot"]):
        panorama.alpha_composite(p.pop("im"))
    panorama.save(os.path.join(HERE, "..", "..", "docs", "art", "street_panorama.png"))
    print("props", len(props), "hotspots", len(HOTSPOTS))
    with open(os.path.join(OUT, "layers.json"), "w", encoding="utf-8") as f:
        json.dump({"width": WW, "height": H, "focusY": 1380, "layers": layers, "props": props, "hotspots": HOTSPOTS}, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
