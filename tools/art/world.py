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
    return svg(W, H, "\n".join(b), "Nhà phía sau")


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
    return svg(W, H, "\n".join(b), "Nhà ống")


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
    return svg(W, H, "\n".join(b), "Tiệm sửa xe và tạp hoá")


# ================================================================ street furniture (cột điện, biển tên đường...)

def layer_street_furniture():
    b = []
    # cột sọc đỏ trắng
    b.append(outlined([rect(52, 820, 24, 860, "#F4F1EA", 6)], 3))
    for k in range(10):
        b.append(rect(52, 830 + k * 86, 24, 42, "#D9463B"))
    # cột điện bê tông
    b.append(outlined([poly([(108, 560), (142, 560), (150, 1720), (100, 1720)], "#A7A39B")], 3))
    b.append(poly([(108, 560), (118, 560), (112, 1720), (100, 1720)], "#8E8A82"))
    # hộp điện + chằng chịt dây
    b.append(outlined([rect(135, 760, 50, 80, "#C9C6BE", 4)], 3))
    b.append(outlined([rect(96, 1000, 44, 70, "#C9C6BE", 4)], 3))
    b.append(outlined([rect(70, 600, 110, 18, "#7A766F", 3)], 3))           # xà ngang
    for k, (y1, y2, sag) in enumerate([(600, 700, 70), (610, 730, 60), (620, 690, 90), (606, 760, 50), (615, 650, 110), (625, 720, 80)]):
        d = "M125,%d C400,%d 700,%d 1090,%d" % (y1, y1 + sag + 120, y2 + sag, y2)
        b.append(stroke(d, "#2D2A2A", 4))
    for k, (y1, y2) in enumerate([(612, 560), (620, 600)]):
        b.append(stroke("M125,%d C60,%d 20,%d -10,%d" % (y1, y1 + 40, y2 + 30, y2), "#2D2A2A", 4))
    # biển tên đường xanh
    b.append(outlined([rect(70, 835, 170, 100, "#2F65A7", 10)], 4))
    b.append(rect(80, 845, 150, 80, "none", 6, 'stroke="#FFFFFF" stroke-width="3"'))
    b.append(text("ĐƯỜNG", 155, 875, 22, "#FFFFFF", "Bold"))
    b.append(text("HOA SỮA", 155, 912, 32, "#FFFFFF", "Bold"))
    # thùng rác xanh
    b.append(outlined([poly([(85, 1470), (215, 1470), (205, 1650), (95, 1650)], "#3F8A4F"),
                       rect(78, 1450, 144, 30, "#337443", 6)], 3))
    b.append(text("GIỮ", 150, 1530, 24, "#E7F2DC", "Bold"))
    b.append(text("PHỐ SẠCH", 150, 1562, 22, "#E7F2DC", "Bold"))
    b.append(text("ĐẸP", 150, 1594, 24, "#E7F2DC", "Bold"))
    b.append(outlined([circle(110, 1660, 16, "#2E2B2B"), circle(190, 1660, 16, "#2E2B2B")], 3))
    return svg(W, H, "\n".join(b), "Cột điện, biển tên đường, thùng rác")


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
    return svg(W, H, "\n".join(b), "Cây hoa sữa")


# ================================================================ sidewalk

def layer_sidewalk():
    b = []
    b.append(rect(0, 1270, W, 540, "#D8C6A5"))
    # gạch lát: hàng ngang + đường xiên theo phối cảnh
    for k in range(10):
        y = 1270 + k * 52
        b.append(line(0, y, W, y, "#BFAA86", 3))
    for k in range(-6, 22):
        x0 = k * 70
        b.append(line(x0, 1270, x0 - 90, 1800, "#BFAA86", 3))
    b.append(rect(0, 1270, W, 30, "#000000", 'opacity="0.10"'))           # bóng mái hiên
    # bó vỉa
    b.append(outlined([rect(-10, 1780, W + 20, 46, "#BDB3A2")], 3))
    for k in range(14):
        b.append(line(k * 84, 1782, k * 84, 1824, "#9C9282", 3))
    return svg(W, H, "\n".join(b), "Vỉa hè")


# ================================================================ cart & props

def stool(x, y, s=1.0, col="#D93A30"):
    w, h = 80 * s, 70 * s
    shapes = [rect(x - w / 2, y - h, w, 16 * s, col, 6 * s),
              poly([(x - w / 2 + 4, y - h + 14), (x - w / 2 + 16 * s, y - h + 14), (x - w / 2 + 6 * s, y), (x - w / 2 - 4, y)], col),
              poly([(x + w / 2 - 16 * s, y - h + 14), (x + w / 2 - 4, y - h + 14), (x + w / 2 + 4, y), (x + w / 2 - 6 * s, y)], col)]
    return "\n".join([outlined(shapes, 3), rect(x - w / 2 + 8, y - h + 3, w - 16, 5 * s, "#F07A6E", 2)])


def layer_cart():
    rnd = random.Random(5)
    b = []
    # bóng đổ dưới xe
    b.append(ellipse(610, 1520, 220, 26, "#000000", 'opacity="0.18"'))
    # cột mái
    b.append(outlined([rect(458, 1150, 12, 220, WOOD_D), rect(752, 1150, 12, 220, WOOD_D)], 3))
    # mái sọc nâu–kem có mép vỏ sò
    top = [(430, 1180), (790, 1180), (760, 1100), (460, 1100)]
    b.append(outlined([poly(top, "#F4E6CC")], 4))
    stripes = 8
    for k in range(stripes):
        if k % 2 == 0:
            t0, t1 = k / stripes, (k + 1) / stripes
            p = [(460 + 300 * t0, 1100), (460 + 300 * t1, 1100), (430 + 360 * t1, 1180), (430 + 360 * t0, 1180)]
            b.append(poly(p, "#A3643E"))
    scallop = []
    for k in range(stripes):
        cx = 430 + 360 * (k + 0.5) / stripes
        scallop.append(circle(cx, 1182, 22.5, "#A3643E" if k % 2 == 0 else "#F4E6CC"))
    b.append(outlined(scallop, 3))
    b.append(line(430, 1180, 790, 1180, O, 4))
    # mặt quầy + đồ pha chế
    b.append(outlined([rect(450, 1330, 320, 26, WOOD_L, 6)], 3))
    b.append(outlined([rect(545, 1230, 52, 100, "#E9E7E2", 8), rect(555, 1205, 32, 30, "#5B5B5B", 4)], 3))   # máy xay
    for k, (x, h, c) in enumerate([(480, 70, "#7A4B2E"), (630, 60, "#E8DFC9"), (680, 55, "#C9A06A"), (725, 50, "#F2F0EA")]):
        b.append(outlined([rect(x, 1330 - h, 34, h, c, 6), rect(x - 2, 1330 - h - 10, 38, 12, "#B33A2E", 4)], 3))
    for k in range(3):
        b.append(outlined([poly([(610 + k * 28, 1300), (632 + k * 28, 1300), (628 + k * 28, 1330), (614 + k * 28, 1330)], "#FFFFFF")], 2))
    # thân xe gỗ
    b.append(outlined([rect(455, 1356, 310, 130, "#E7B866", 10)], 4))
    b.append(rect(470, 1370, 280, 102, "none", 8, 'stroke="%s" stroke-width="5"' % WOOD_D))
    b.append(text("CÀ PHÊ", 625, 1430, 50, "#4A2E22", "Bold"))
    b.append(text("GÓC PHỐ", 625, 1462, 24, "#4A2E22", "Bold"))
    # hoạ tiết lá bên trái thân xe
    for k in range(4):
        b.append(ellipse(492, 1385 + k * 22, 13, 7, GREEN_D, 'transform="rotate(%d 492 %d)"' % (-30 if k % 2 else 30, 1385 + k * 22)))
    b.append(line(492, 1378, 492, 1460, GREEN_DD, 3))
    # bánh xe
    for x in (505, 720):
        b.append(outlined([circle(x, 1500, 34, "#3B3534")], 3))
        b.append(circle(x, 1500, 14, "#C9C3BA"))
    # chậu cây trên xe
    b.append(outlined([poly([(735, 1330), (775, 1330), (770, 1300), (740, 1300)], "#C46A3E")], 3))
    for _ in range(6):
        b.append(circle(755 + rnd.uniform(-22, 22), 1285 - rnd.uniform(0, 30), rnd.uniform(10, 15), rnd.choice([GREEN, GREEN_L])))
    # bảng phấn
    b.append(outlined([poly([(793, 1640), (815, 1400), (830, 1400), (810, 1640)], WOOD_D),
                       poly([(925, 1640), (907, 1400), (922, 1400), (940, 1640)], WOOD_D),
                       rect(785, 1395, 155, 200, "#2F3A37", 8)], 4))
    b.append(rect(793, 1403, 139, 184, "none", 6, 'stroke="%s" stroke-width="6"' % WOOD_D))
    b.append(text("CÀ PHÊ  25K", 862, 1450, 22, "#F2F0E6", "Medium", max_width=125))
    b.append(text("TRÀ TẮC  20K", 862, 1500, 22, "#F2F0E6", "Medium", max_width=125))
    b.append(text("BÁNH MÌ  30K", 862, 1550, 22, "#F2F0E6", "Medium", max_width=125))
    # ghế nhựa đỏ + bàn nhỏ
    b.append(stool(470, 1640))
    b.append(stool(620, 1690))
    b.append(outlined([rect(520, 1600, 80, 16, "#D93A30", 5),
                       poly([(530, 1614), (540, 1614), (536, 1665), (526, 1665)], "#D93A30"),
                       poly([(580, 1614), (590, 1614), (594, 1665), (584, 1665)], "#D93A30")], 3))
    b.append(outlined([rect(540, 1585, 14, 18, "#FFFFFF", 3), rect(564, 1583, 14, 20, "#FFFFFF", 3)], 2))
    b.append(stool(990, 1600, 0.9))
    # chậu cây lớn cạnh xe
    for (x, y) in [(400, 1440), (1010, 1420)]:
        b.append(outlined([poly([(x - 34, y), (x + 34, y), (x + 26, y + 60), (x - 26, y + 60)], "#B9603A")], 3))
        for _ in range(8):
            b.append(circle(x + rnd.uniform(-38, 38), y - rnd.uniform(0, 60), rnd.uniform(14, 20), rnd.choice([GREEN, GREEN_D, GREEN_L])))
    # xe trái cây bên phải
    b.append(outlined([rect(930, 1700, 200, 150, "#B98652", 8)], 4))
    for _ in range(26):
        b.append(circle(rnd.uniform(945, 1100), rnd.uniform(1660, 1710), rnd.uniform(16, 22), rnd.choice(["#8CC152", "#A5D46A", "#6FA544"]),
                        'stroke="%s" stroke-width="2"' % GREEN_DD))
    b.append(outlined([rect(950, 1730, 150, 90, "#F2C14E", 6)], 3))
    b.append(text("TRÁI CÂY", 1025, 1768, 26, RED, "Bold"))
    b.append(text("TƯƠI NGON", 1025, 1802, 24, RED, "Bold"))
    b.append(outlined([circle(980, 1880, 46, "none")], 3))
    b.append(circle(980, 1880, 46, "none", 'stroke="%s" stroke-width="6"' % STEEL))
    return svg(W, H, "\n".join(b), "Xe cà phê Góc Phố và đồ quanh xe")


# ================================================================ road

def layer_road():
    b = []
    defs = ('<linearGradient id="road" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="#8A8C92"/><stop offset="1" stop-color="#6E7077"/></linearGradient>')
    b.append(rect(0, 1820, W, H - 1820, "url(#road)"))
    # vạch qua đường xiên
    for k in range(7):
        y = 1880 + k * 62
        b.append(poly([(560 + k * 10, y), (900 + k * 10, y - 40), (920 + k * 10, y - 8), (580 + k * 10, y + 32)], "#F1F0EC", 'opacity="0.92"'))
    for k in range(4):
        b.append(rect(40 + k * 150, 1900 + k * 8, 90, 14, "#F1F0EC", 4, 'opacity="0.85"'))
    # cụm hoa sữa sát mép dưới (tiền cảnh)
    rnd = random.Random(21)
    for _ in range(6):
        b.append(blob(rnd.uniform(-40, 200), rnd.uniform(2180, 2380), rnd.uniform(70, 100), rnd.uniform(45, 60), 9, rnd,
                      rnd.choice([GREEN_D, GREEN])))
    for _ in range(14):
        b.append(flower(rnd.uniform(-20, 230), rnd.uniform(2170, 2340), rnd.uniform(14, 20), rot=rnd.uniform(0, 60)))
    return svg(W, H, "\n".join(b), "Lòng đường", defs)


LAYERS = [
    ("00_sky", layer_sky),
    ("10_back_buildings", layer_back_buildings),
    ("20_main_building", layer_main_building),
    ("30_shops", layer_shops),
    ("40_sidewalk", layer_sidewalk),
    ("45_road", layer_road),
    ("48_tree", layer_tree),
    ("50_street_furniture", layer_street_furniture),
    ("60_cart", layer_cart),
]


def main():
    import io
    import cairosvg
    from PIL import Image
    os.makedirs(OUT, exist_ok=True)
    preview = Image.new("RGBA", (W // 2, H // 2), (0, 0, 0, 0))
    names = []
    for name, fn in LAYERS:
        data = fn()
        with open(os.path.join(OUT, name + ".svg"), "w", encoding="utf-8") as f:
            f.write(data)
        png = cairosvg.svg2png(bytestring=data.encode("utf-8"), output_width=W // 2, output_height=H // 2)
        preview.alpha_composite(Image.open(io.BytesIO(png)).convert("RGBA"))
        names.append(name)
        print("ok", name, len(data) // 1024, "KB")
    preview.save(os.path.join(HERE, "..", "..", "docs", "art", "world_preview.png"))
    # bbox từng lớp (đơn vị thiết kế) → game chỉ raster vùng có hình, tiết kiệm bộ nhớ GPU
    import json
    boxes = {}
    for name in names:
        png = cairosvg.svg2png(url=os.path.join(OUT, name + ".svg"), output_width=W // 2, output_height=H // 2)
        bb = Image.open(io.BytesIO(png)).split()[3].getbbox()
        boxes[name] = [max(0, bb[0] * 2 - 4), max(0, bb[1] * 2 - 4), min(W, bb[2] * 2 + 4), min(H, bb[3] * 2 + 4)]
    with open(os.path.join(OUT, "layers.json"), "w", encoding="utf-8") as f:
        json.dump({"width": W, "height": H, "focusY": 1380, "layers": names, "bbox": boxes}, f, indent=2)


if __name__ == "__main__":
    main()
