#!/usr/bin/env python3
"""
Nhân vật Góc Phố Việt — vẽ vector gốc, dạng chibi, tách bộ phận để chuyển động bằng xương.

Mỗi nhân vật xuất 1 tấm SVG (atlas) chứa các bộ phận; characters.json ghi vị trí từng bộ phận và điểm khớp (pivot).
Nhân vật nhìn về bên phải (3/4); game lật ngang khi quay trái.
"""
import io
import json
import math
import os

from svgkit import O, circle, ellipse, group, line, outlined, path, poly, rect, stroke

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "public", "art", "chars")
PAD = 8

EYES = [(-8, -58), (34, -58)]


def j(*a):
    return "\n".join(x if isinstance(x, str) else "\n".join(x) for x in a)


# ---------------------------------------------------------------- mặt (dùng chung)

def eye(x, y, r=1.0):
    return j(ellipse(x, y, 6.5 * r, 9 * r, "#3B2A28"), circle(x + 2, y - 3.5, 2.4 * r, "#FFFFFF"))


def blush():
    return j(ellipse(-22, -38, 10, 6, "#F29A8C", 'opacity="0.55"'), ellipse(46, -38, 9, 6, "#F29A8C", 'opacity="0.55"'))


FACES = {
    "normal": lambda: j(blush(), eye(*EYES[0]), eye(*EYES[1]), stroke("M4,-34 Q14,-27 24,-34", O, 3)),
    "happy": lambda: j(blush(), stroke("M-16,-56 Q-8,-66 0,-56", O, 3.5), stroke("M26,-56 Q34,-66 42,-56", O, 3.5),
                       path("M2,-36 Q14,-18 26,-36 Z", "#8A2F2A", 'stroke="%s" stroke-width="3" stroke-linejoin="round"' % O)),
    "surprised": lambda: j(blush(), eye(EYES[0][0], EYES[0][1], 1.25), eye(EYES[1][0], EYES[1][1], 1.25),
                           ellipse(14, -30, 6, 8, "#8A2F2A", 'stroke="%s" stroke-width="3"' % O)),
    "blink": lambda: j(blush(), stroke("M-15,-57 L-1,-57", O, 3.5), stroke("M27,-57 L41,-57", O, 3.5), stroke("M4,-34 Q14,-27 24,-34", O, 3)),
    "talk": lambda: j(blush(), eye(*EYES[0]), eye(*EYES[1]), ellipse(14, -31, 9, 7, "#8A2F2A", 'stroke="%s" stroke-width="3"' % O)),
}


# ---------------------------------------------------------------- đầu

def head_base(skin):
    return j(outlined([circle(-52, -54, 13, skin), ellipse(4, -62, 58, 57, skin)], 3), stroke("M-55,-58 q5,4 1,10", "#D99A72", 3))


def dome(col, back=-58, front=-86, top=-126, fringe=0):
    """Mảng tóc/mũ phủ đỉnh đầu, có mái lượn."""
    d = "M-56,%d Q-64,%d 4,%d Q68,%d 63,%d Q%d,%d %d,%d Q-40,%d -45,%d Z" % (
        back, top, top, top, front, 34, front - 16 + fringe, -18, front + 2 + fringe, front + 4, back)
    return path(d, col)


def cap(col, band, brim_col=None):
    return j(outlined([path("M-57,-72 Q-60,-130 4,-130 Q64,-130 63,-80 L63,-74 Z", col),
                       path("M36,-90 L98,-80 Q108,-72 98,-68 L40,-72 Z", brim_col or col)], 3),
             stroke("M-55,-76 L62,-80", band, 5), circle(4, -128, 5, band))


def head_player(c):
    return j(outlined([path("M-56,-70 Q-60,-40 -44,-26 L-38,-66 Z", c["hair"])], 3), head_base(c["skin"]), cap("#2E2B2B", "#4A4545"))


def head_chutu(c):
    wr = j(stroke("M-22,-70 q6,-3 12,0", "#C98F68", 2.5), stroke("M28,-70 q6,-3 12,0", "#C98F68", 2.5), stroke("M50,-52 q4,3 2,8", "#C98F68", 2.5))
    mus = outlined([path("M-4,-42 Q14,-52 32,-42 Q14,-36 -4,-42 Z", "#D8D4CC")], 2)
    return j(outlined([path("M-56,-72 Q-62,-36 -42,-22 L-34,-64 Z", "#BDB8B0")], 3), head_base(c["skin"]), wr, mus, cap("#A08A72", "#8A745E"))


def head_coba(c):
    h = c["hair"]
    back = [circle(-40, -44, 30, h), circle(-52, -78, 26, h)]
    top = []
    for k in range(8):
        a = math.radians(205 - k * 28)
        top.append(circle(4 + 54 * math.cos(a), -70 + 50 * math.sin(a) * -1 if False else -64 - 52 * math.sin(math.radians(25 + k * 19)), 21, h))
    return j(outlined(back, 3), head_base(c["skin"]), outlined(top + [circle(-30, -104, 22, h), circle(8, -112, 22, h), circle(40, -100, 20, h)], 3),
             circle(-52, -40, 5, "#F2C14E", 'stroke="%s" stroke-width="2"' % O))


def head_minh(c):
    g, gd = c.get("gear", "#2FA35A"), c.get("gear_d", "#23804A")
    helm = outlined([path("M-60,-64 Q-66,-134 4,-134 Q70,-134 67,-82 L67,-76 L-60,-64 Z", g), path("M40,-92 L86,-84 Q92,-76 84,-74 L44,-78 Z", "#2E2B2B")], 3)
    return j(outlined([path("M-54,-66 Q-56,-40 -44,-28 L-40,-62 Z", c["hair"])], 3), head_base(c["skin"]), helm, stroke("M-58,-70 L66,-82", gd, 5),
             outlined([circle(-6, -104, 15, "#FFFFFF")], 2), circle(-6, -104, 7, g), stroke("M-34,-66 Q-30,-20 2,-10", "#2E2B2B", 4))


def head_boy(c):
    return j(head_base(c["skin"]), outlined([dome(c["hair"], -56, -84, -126)], 3))


def head_girl(c):
    h = c["hair"]
    tail = outlined([ellipse(-74, -44, 17, 36, h, 'transform="rotate(18 -74 -44)"')], 3)
    return j(tail, outlined([path("M-56,-70 Q-62,-30 -46,-16 L-36,-60 Z", h)], 3), head_base(c["skin"]), outlined([dome(h, -54, -82, -126, 4)], 3),
             outlined([circle(-58, -76, 9, "#D9463B")], 2))


def head_woman(c):
    h = c["hair"]
    back = outlined([path("M-58,-80 Q-78,-30 -58,6 Q-40,16 -30,2 L-30,-60 Z", h), path("M40,-80 Q72,-50 58,-2 Q50,8 42,0 Z", h)], 3)
    return j(back, head_base(c["skin"]), outlined([dome(h, -50, -80, -128, 8)], 3), stroke("M-40,-110 Q-10,-122 20,-112", "#9A6B4A", 3))


def head_man(c):
    return j(head_base(c["skin"]), outlined([dome(c["hair"], -60, -90, -126, -4)], 3))


# ----- kiểu đầu riêng cho khách (Phase 8.2) -----

def head_part(c):
    """Nam tóc rẽ ngôi."""
    h = c["hair"]
    return j(head_base(c["skin"]), outlined([path("M-57,-62 Q-64,-128 6,-128 Q64,-126 63,-84 Q40,-104 6,-100 Q-24,-98 -40,-78 Q-46,-70 -45,-58 Z", h)], 3), stroke("M-6,-124 Q-2,-108 8,-100", "#55504E", 3))


def head_bob(c):
    """Nữ tóc bob ngang cằm."""
    h = c["hair"]
    back = outlined([path("M-60,-84 Q-70,-30 -52,-14 L-28,-14 L-30,-62 Z", h), path("M44,-84 Q70,-50 58,-16 L44,-18 Z", h)], 3)
    return j(back, head_base(c["skin"]), outlined([dome(h, -46, -84, -128, 10)], 3), outlined([rect(20, -116, 26, 9, "#F2C14E", 4)], 2))


def head_spiky(c):
    h = c["hair"]
    spikes = "M-56,-62 L-62,-104 L-40,-96 L-34,-134 L-12,-108 L4,-140 L22,-108 L44,-130 L46,-98 L66,-100 L62,-78 Q30,-94 -10,-88 Q-40,-84 -45,-60 Z"
    return j(head_base(c["skin"]), outlined([path(spikes, h)], 3))


def head_pigtails(c):
    h = c["hair"]
    tails = outlined([circle(-66, -84, 22, h), circle(66, -92, 19, h)], 3)
    return j(tails, head_base(c["skin"]), outlined([dome(h, -54, -84, -126, 6)], 3), outlined([circle(-50, -96, 8, "#F2C14E"), circle(52, -100, 7, "#F2C14E")], 2))


def head_hat(c):
    """Khách du lịch đội nón rộng vành."""
    h = c["hair"]
    back = outlined([path("M-58,-76 Q-74,-24 -50,0 Q-36,6 -30,-8 L-30,-60 Z", h)], 3)
    hat = outlined([ellipse(4, -92, 96, 20, "#E9CF8F"), path("M-44,-94 Q-46,-140 4,-140 Q54,-140 52,-94 Z", "#F2DDA6")], 3)
    return j(back, head_base(c["skin"]), hat, stroke("M-44,-100 Q4,-90 52,-100", "#C8362E", 7))


def head_grey(c):
    """Chú lớn tuổi tóc hoa râm, không mũ."""
    wr = j(stroke("M-22,-72 q6,-3 12,0", "#C98F68", 2.5), stroke("M28,-72 q6,-3 12,0", "#C98F68", 2.5))
    return j(head_base(c["skin"]), wr, outlined([path("M-57,-58 Q-66,-124 4,-124 Q66,-124 63,-86 Q50,-100 30,-100 Q0,-104 -24,-94 Q-44,-84 -45,-56 Z", c["hair"])], 3))


def head_bun(c):
    """Cô lớn tuổi búi tóc."""
    h = c["hair"]
    return j(outlined([circle(-30, -128, 24, h)], 3), outlined([path("M-56,-70 Q-60,-36 -44,-24 L-38,-62 Z", h)], 3), head_base(c["skin"]), outlined([dome(h, -52, -88, -124, 0)], 3),
             circle(-52, -40, 5, "#F2C14E", 'stroke="%s" stroke-width="2"' % O))


def t_blazer(c):
    return j(poly([(-14, -98), (0, -66), (14, -98)], "#FFFFFF", 'stroke="%s" stroke-width="2.5" stroke-linejoin="round"' % O), line(0, -66, 0, 0, "#1E2A44", 3),
             circle(6, -46, 3.5, "#D9B45A"), circle(6, -24, 3.5, "#D9B45A"))


def t_polo(c):
    return j(collar("#FFFFFF"), line(0, -80, 0, -52, "#2C5E3A", 3), rect(-34, -40, 68, 8, "#FFFFFF", 'opacity="0.55"'))


def t_tourist(c):
    return j(stroke("M-30,-96 L22,-30", "#3B2A28", 6), stroke("M-14,-98 Q0,-84 14,-98", "#1F7F78", 3), outlined([rect(4, -44, 34, 26, "#3B3A40", 6)], 2.5), circle(21, -31, 8, "#9CC3CF", 'stroke="%s" stroke-width="2.5"' % O))


def camera(c):
    return j(outlined([rect(-22, 4, 44, 32, "#3B3A40", 6), rect(-8, -4, 18, 10, "#3B3A40", 3)], 2.5), circle(0, 20, 10, "#9CC3CF", 'stroke="%s" stroke-width="2.5"' % O))


def basket(c):
    return j(stroke("M-18,14 Q0,-14 18,14", "#9A6234", 5), outlined([path("M-26,12 L26,12 L20,50 L-20,50 Z", "#D9A860")], 3), stroke("M-24,26 L24,26 M-22,38 L22,38", "#9A6234", 2.5),
             circle(-8, 10, 8, "#6FA35A"), circle(8, 8, 8, "#E25B45"))


def glasses():
    s = []
    for (x, y) in EYES:
        s.append(circle(x, y, 14, "#FFFFFF", 'fill-opacity="0.25" stroke="%s" stroke-width="3.5"' % O))
    s.append(stroke("M6,-58 L20,-58", O, 3.5))
    s.append(stroke("M-22,-60 L-50,-62", O, 3))
    return j(s)


# ---------------------------------------------------------------- thân, tay, chân

TORSO = "M-34,2 L-38,-80 Q-38,-98 -20,-98 L20,-98 Q38,-98 38,-80 L34,2 Z"


def torso(c):
    s = [outlined([rect(-11, -110, 22, 22, c["skin"], 6)], 3)]
    body = [path(TORSO, c["top"])]
    if c.get("skirt"):
        body.append(path("M-36,-16 L36,-16 L48,36 L-48,36 Z", c["skirt"]))
    s.append(outlined(body, 3))
    s.append(c["torso"](c) if c.get("torso") else "")
    return j(s)


def collar(col="#FFFFFF"):
    return j(poly([(-16, -98), (0, -80), (-2, -98)], col, 'stroke="%s" stroke-width="2.5" stroke-linejoin="round"' % O),
             poly([(16, -98), (0, -80), (2, -98)], col, 'stroke="%s" stroke-width="2.5" stroke-linejoin="round"' % O))


def t_player(c):
    return j(collar(c["top"]), outlined([path("M-26,-66 L28,-66 L30,4 L-28,4 Z", "#2E2B2B")], 2.5), stroke("M-22,-66 L-14,-98 M24,-66 L14,-98", "#2E2B2B", 6),
             rect(-12, -34, 26, 20, "none", 4, 'stroke="#55504E" stroke-width="3"'))


def t_chutu(c):
    return j(collar("#557AAB"), line(0, -80, 0, 0, "#2E476B", 3), outlined([rect(8, -70, 20, 18, "#557AAB", 3)], 2),
             circle(0, -60, 2.5, "#DDE5F0"), circle(0, -38, 2.5, "#DDE5F0"), circle(0, -16, 2.5, "#DDE5F0"))


def t_coba(c):
    dots = [circle(x, y, 4.5, col) for (x, y, col) in [(-24, -84, "#F2C14E"), (-6, -70, "#FFFDF4"), (20, -84, "#FFFDF4"), (26, -62, "#F2C14E"), (-28, -58, "#FFFDF4")]]
    return j(dots, outlined([path("M-30,-48 L30,-48 L32,4 L-32,4 Z", "#F3E6CC")], 2.5), stroke("M-30,-48 Q0,-40 30,-48", "#D9C7A0", 3),
             rect(-12, -28, 24, 18, "none", 4, 'stroke="#D9C7A0" stroke-width="3"'))


def t_minh(c):
    return j(line(4, -98, 4, 2, "#FFFFFF", 4), rect(-36, -44, 72, 9, "#FFFFFF", 'opacity="0.9"'), outlined([circle(-18, -68, 9, "#FFFFFF")], 2), circle(-18, -68, 4, c.get("gear", "#2FA35A")))


def t_tie(col):
    def f(c):
        return j(collar(), outlined([path("M-5,-84 L5,-84 L8,-40 L0,-30 L-8,-40 Z", col)], 2), rect(8, -70, 18, 16, "none", 3, 'stroke="#C9CED6" stroke-width="2.5"'))
    return f


def t_girl(c):
    return j(collar(), outlined([path("M-18,-92 L18,-92 L6,-64 L14,-44 L0,-56 L-14,-44 L-6,-64 Z", "#D9463B")], 2), stroke("M-44,10 L44,10", "#22304F", 3))


def t_woman(c):
    return j(stroke("M-14,-98 Q0,-82 14,-98", "#C9777F", 3), circle(0, -70, 3, "#FFFFFF"), circle(0, -52, 3, "#FFFFFF"), stroke("M-34,-4 L34,-4", "#C9777F", 3))


def arm(c):
    sl = c["sleeve"]
    shapes = [rect(-12, -8, 24, 70, c["skin"], 12), circle(0, 64, 13, c["skin"])]
    s = [outlined(shapes, 3)]
    if sl == "long":
        s.append(outlined([rect(-13, -9, 26, 62, c["top"], 12)], 3))
    else:
        s.append(outlined([rect(-14, -10, 28, 34, c["top"], 12)], 3))
    return j(s)


def thigh(c):
    col = c["skin"] if c.get("skirt") else c["pants"]
    return outlined([rect(-15, -8, 30, 56, col, 14)], 3)


def shin(c):
    s = []
    if c.get("skirt"):
        s.append(outlined([rect(-12, -6, 24, 44, c["skin"], 11)], 3))
        s.append(outlined([rect(-12, 14, 24, 24, "#FFFFFF", 6)], 2.5))
    else:
        s.append(outlined([rect(-14, -6, 28, 46, c["pants"], 12)], 3))
    s.append(outlined([path("M-15,32 L14,32 Q30,34 30,44 Q30,48 24,48 L-15,48 Z", c["shoes"])], 3))
    s.append(stroke("M-13,45 L27,45", "#FFFFFF", 2.5, 'opacity="0.7"'))
    return j(s)


def backpack(col, dark):
    def f(c):
        return j(outlined([rect(-70, -96, 44, 80, col, 14)], 3), outlined([rect(-70, -96, 44, 26, dark, 12)], 2.5), rect(-62, -52, 24, 22, "none", 5, 'stroke="%s" stroke-width="3"' % dark))
    return f


def delivery_box(c):
    g, gd = c.get("gear", "#2FA35A"), c.get("gear_d", "#23804A")
    return j(outlined([rect(-104, -112, 76, 96, g, 10)], 3), outlined([rect(-104, -112, 76, 20, gd, 8)], 2.5),
             outlined([circle(-66, -56, 17, "#FFFFFF")], 2), circle(-66, -56, 8, g))


def tote(c):
    return j(stroke("M-12,14 Q-14,-10 0,-2 Q14,-10 12,14", "#B98652", 5), outlined([path("M-24,10 L24,10 L28,58 L-28,58 Z", "#F3E6CC")], 3),
             circle(0, 34, 8, "#E99AA0"))


def briefcase(c):
    return j(stroke("M-10,8 L-10,-2 L10,-2 L10,8", O, 5), outlined([rect(-30, 6, 60, 42, "#5B4636", 6)], 3), rect(-30, 22, 60, 5, "#3F2F24"), rect(-5, 18, 10, 12, "#D9B45A", 2))


def wrench(c):
    return j(outlined([rect(-4, -6, 8, 40, "#B8BDC2", 3), circle(0, 38, 9, "#B8BDC2")], 2.5), circle(0, 41, 4, O))


# ---------------------------------------------------------------- dàn nhân vật

SKIN = "#F6C9A0"
CHARS = [
    dict(id="player", name="Bạn", role="Chủ quầy cà phê", skin=SKIN, hair="#2E2B2B", top="#F3E3C0", sleeve="short", pants="#3B3A40", shoes="#2E2B2B", head=head_player, torso=t_player),
    dict(id="chutu", name="Chú Tư", role="Thợ sửa xe", skin="#EBB98F", hair="#BDB8B0", top="#3F5F8A", sleeve="short", pants="#4A4F5C", shoes="#3B2A28", head=head_chutu, torso=t_chutu, hand=wrench),
    dict(id="coba", name="Cô Ba", role="Chủ tạp hoá", skin=SKIN, hair="#6B4A36", top="#B5473F", sleeve="short", pants="#3B3A40", shoes="#7A4B2E", head=head_coba, torso=t_coba),
    dict(id="minh", name="Shipper Minh", role="Giao hàng", skin=SKIN, hair="#2E2B2B", top="#2FA35A", sleeve="long", pants="#2E3440", shoes="#2E2B2B", head=head_minh, torso=t_minh, back=delivery_box),
    dict(id="lan", name="Lan", role="Học sinh", skin=SKIN, hair="#2E2B2B", top="#FFFFFF", sleeve="short", pants="#22304F", skirt="#2B3A5E", shoes="#2E2B2B", head=head_girl, torso=t_girl,
         back=backpack("#E57B8A", "#C95A6B"), scale=0.9),
    dict(id="nam", name="Nam", role="Học sinh", skin=SKIN, hair="#2E2B2B", top="#FFFFFF", sleeve="short", pants="#2B3A5E", shoes="#2E2B2B", head=head_boy, torso=t_tie("#2B3A5E"),
         back=backpack("#2F65A7", "#22497A"), glasses=True, scale=0.9),
    dict(id="mai", name="Mai", role="Khách ghé quán", skin=SKIN, hair="#7A5238", top="#E99AA0", sleeve="short", pants="#55607A", shoes="#F6F1E6", head=head_woman, torso=t_woman, hand=tote),
    dict(id="hoang", name="Anh Hoàng", role="Nhân viên văn phòng", skin=SKIN, hair="#2E2B2B", top="#FFFFFF", sleeve="long", pants="#3B3F4A", shoes="#2E2B2B", head=head_man, torso=t_tie("#3F7DB5"),
         glasses=True, hand=briefcase),
]

# Khách hàng: hình riêng cho từng loại (không trùng với hàng xóm có tên)
CHARS += [
    dict(id="kh_vp1", name="Khách văn phòng", role="Khách", skin=SKIN, hair="#2E2B2B", top="#BFD9EE", sleeve="long", pants="#3B3F4A", shoes="#2E2B2B", head=head_part, torso=t_tie("#C8362E"), hand=briefcase),
    dict(id="kh_vp2", name="Khách văn phòng", role="Khách", skin=SKIN, hair="#4A3328", top="#2B3A5E", sleeve="long", pants="#55607A", skirt="#55607A", shoes="#2E2B2B", head=head_bob, torso=t_blazer, hand=tote),
    dict(id="kh_hs1", name="Học sinh", role="Khách", skin=SKIN, hair="#2E2B2B", top="#FFFFFF", sleeve="short", pants="#2B3A5E", shoes="#F6F1E6", head=head_spiky, torso=t_tie("#2B3A5E"),
         back=backpack("#4F9D5B", "#3C7A47"), scale=0.9),
    dict(id="kh_hs2", name="Học sinh", role="Khách", skin=SKIN, hair="#3B2A28", top="#FFFFFF", sleeve="short", pants="#22304F", skirt="#2B3A5E", shoes="#2E2B2B", head=head_pigtails, torso=t_girl,
         back=backpack("#F2C14E", "#D9A441"), scale=0.9),
    dict(id="kh_ship1", name="Shipper", role="Khách", skin="#EBB98F", hair="#2E2B2B", top="#F08A2E", sleeve="long", pants="#2E3440", shoes="#2E2B2B", head=head_minh, torso=t_minh, back=delivery_box,
         gear="#F08A2E", gear_d="#C96B1A"),
    dict(id="kh_ship2", name="Shipper", role="Khách", skin=SKIN, hair="#2E2B2B", top="#3F7DB5", sleeve="long", pants="#2E3440", shoes="#2E2B2B", head=head_minh, torso=t_minh, back=delivery_box,
         gear="#3F7DB5", gear_d="#2C5E8C"),
    dict(id="kh_dl1", name="Khách du lịch", role="Khách", skin=SKIN, hair="#7A5238", top="#2FA39A", sleeve="short", pants="#C9B48A", shoes="#F6F1E6", head=head_hat, torso=t_tourist, hand=camera),
    dict(id="kh_dl2", name="Chú hàng xóm", role="Khách", skin="#EBB98F", hair="#9A9690", top="#4F9D5B", sleeve="short", pants="#6B5A4A", shoes="#7A4B2E", head=head_grey, torso=t_polo, glasses=True),
    dict(id="kh_dl3", name="Cô hàng xóm", role="Khách", skin=SKIN, hair="#3B2A28", top="#8E6CC0", sleeve="short", pants="#3B3A40", shoes="#7A4B2E", head=head_bun, torso=t_woman, hand=basket),
]

# Vị trí khớp (đơn vị thiết kế, gốc = điểm chân trên mặt đất, y hướng xuống)
RIG = {"hipX": 13, "hipY": -88, "knee": 44, "torsoY": -86, "shoulderX": 35, "shoulderY": -172, "headY": -184, "hand": 64, "height": 314}


def parts_of(c):
    p = {"head": c["head"](c), "torso": torso(c), "arm": arm(c), "thigh": thigh(c), "shin": shin(c)}
    if c.get("glasses"):
        p["glasses"] = glasses()
    if c.get("back"):
        p["back"] = c["back"](c)
    if c.get("hand"):
        p["hand"] = c["hand"](c)
    return p


def bbox_of(body, size=520):
    import cairosvg
    from PIL import Image
    data = '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="%d %d %d %d">%s</svg>' % (size, size, -size // 2, -size // 2, size, size, body)
    im = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=data.encode("utf-8")))).convert("RGBA")
    b = im.split()[3].getbbox()
    return [b[0] - size // 2 - 2, b[1] - size // 2 - 2, b[2] - size // 2 + 2, b[3] - size // 2 + 2]


def pack(parts):
    """Xếp các bộ phận thành atlas theo hàng. Trả về (svg, {name: {x,y,w,h,px,py}})."""
    cells, x, y, rowh, maxw = {}, PAD, PAD, 0, 560
    body = []
    for name, svgbody in parts.items():
        b = bbox_of(svgbody)
        w, h = b[2] - b[0], b[3] - b[1]
        if x + w + PAD > maxw:
            x, y, rowh = PAD, y + rowh + PAD, 0
        cells[name] = {"x": x, "y": y, "w": w, "h": h, "px": -b[0], "py": -b[1]}
        body.append(group(svgbody, 'transform="translate(%d,%d)"' % (x - b[0], y - b[1])))
        x += w + PAD
        rowh = max(rowh, h)
    W, H = maxw, y + rowh + PAD
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">\n<title>Góc Phố Việt — nhân vật (original vector art)</title>\n%s\n</svg>\n'
            % (W, H, W, H, "\n".join(body))), cells, W, H


def standing(c, parts, face="normal", ox=0, oy=0):
    """Ghép dáng đứng (để xem trước)."""
    r = RIG
    def at(name, x, y, rot=0):
        return group(parts[name], 'transform="translate(%d,%d) rotate(%d)"' % (ox + x, oy + y, rot)) if name in parts else ""
    leg = lambda x: j(at("thigh", x, r["hipY"]), at("shin", x, r["hipY"] + r["knee"]))
    front_arm = group(j(parts["arm"], group(parts["hand"], 'transform="translate(0,%d)"' % r["hand"]) if "hand" in parts else ""),
                      'transform="translate(%d,%d) rotate(-6)"' % (ox + r["shoulderX"], oy + r["shoulderY"]))
    return j(ellipse(ox, oy, 62, 12, "#000000", 'opacity="0.16"'), at("back", 0, r["torsoY"]), at("arm", -r["shoulderX"], r["shoulderY"], 6), leg(-r["hipX"]), leg(r["hipX"]),
             at("torso", 0, r["torsoY"]), at("head", 0, r["headY"]), group(FACES[face](), 'transform="translate(%d,%d)"' % (ox, oy + r["headY"])),
             at("glasses", 0, r["headY"]), front_arm)


def main():
    import cairosvg
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))
    meta = {"rig": RIG, "chars": []}
    svg, cells, W, H = pack({k: f() for k, f in FACES.items()})
    with open(os.path.join(OUT, "faces.svg"), "w", encoding="utf-8") as f:
        f.write(svg)
    meta["faces"] = {"file": "faces.svg", "w": W, "h": H, "parts": cells}
    sheet = []
    for i, c in enumerate(CHARS):
        parts = parts_of(c)
        svg, cells, W, H = pack(parts)
        with open(os.path.join(OUT, c["id"] + ".svg"), "w", encoding="utf-8") as f:
            f.write(svg)
        meta["chars"].append({"id": c["id"], "name": c["name"], "role": c["role"], "file": c["id"] + ".svg", "w": W, "h": H, "scale": c.get("scale", 1), "parts": cells})
        # chân dung cho khung hội thoại (đầu + vai)
        port = ('<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="-140 -335 280 280">\n<title>%s — Góc Phố Việt (original vector art)</title>\n'
                '<circle cx="0" cy="-195" r="134" fill="#FFF3DF"/>\n%s\n</svg>\n') % (c["name"], standing(c, parts, "normal").split("\n", 1)[1])
        with open(os.path.join(OUT, "portrait_" + c["id"] + ".svg"), "w", encoding="utf-8") as f:
            f.write(port)
        face = ["normal", "happy", "talk", "surprised"][i % 4]
        sheet.append(standing(c, parts, face, 130 + (i % 9) * 230, 360 + (i // 9) * 380))
        print("ok", c["id"], W, H, list(cells))
    with open(os.path.join(OUT, "characters.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    w = 230 * 9 + 40
    data = '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="780" viewBox="0 0 %d 780"><rect width="%d" height="780" fill="#F5EDE0"/>%s</svg>' % (w, w, w, "\n".join(sheet))
    cairosvg.svg2png(bytestring=data.encode("utf-8"), write_to=os.path.join(HERE, "..", "..", "docs", "art", "characters_preview.png"))


if __name__ == "__main__":
    main()
