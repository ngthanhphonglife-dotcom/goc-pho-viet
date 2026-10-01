"""
svgkit — bộ hàm vẽ vector dùng chung cho art Góc Phố Việt.

Phong cách: viền nâu đậm bo tròn, mảng màu phẳng ấm, 1 lớp sáng/tối nhẹ.
Chữ trên biển hiệu được đổi thành path (fontTools) để SVG hiển thị đúng font ở mọi nơi
(SVG nạp dưới dạng ảnh không dùng được web font).
"""
import math
import os
import re

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

O = "#4B2E2E"          # màu viền
HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, "..", "fonts")
_fonts = {}


def font(weight="Bold"):
    if weight not in _fonts:
        _fonts[weight] = TTFont(os.path.join(FONT_DIR, "BeVietnamPro-%s.ttf" % weight))
    return _fonts[weight]


def text_width(s, size, weight="Bold", tracking=0.0):
    f = font(weight)
    cmap = f.getBestCmap()
    hmtx = f["hmtx"]
    upm = f["head"].unitsPerEm
    w = 0
    for ch in s:
        g = cmap.get(ord(ch))
        if g is None:
            raise ValueError("Font thiếu glyph %r" % ch)
        w += hmtx[g][0] + tracking * upm
    return w * size / upm


def text(s, x, y, size, fill, weight="Bold", anchor="middle", tracking=0.0, extra="", max_width=None):
    """Chữ dạng path. (x, y) là điểm baseline; anchor: start | middle | end. Tự co nếu vượt max_width."""
    if max_width is not None:
        w = text_width(s, size, weight, tracking)
        if w > max_width:
            size *= max_width / w
    f = font(weight)
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    hmtx = f["hmtx"]
    upm = f["head"].unitsPerEm
    scale = size / upm
    total = text_width(s, size, weight, tracking)
    if anchor == "middle":
        x -= total / 2
    elif anchor == "end":
        x -= total
    parts = []
    cx = x
    for ch in s:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        tp = TransformPen(pen, (scale, 0, 0, -scale, cx, y))
        gs[g].draw(tp)
        d = pen.getCommands()
        if d:
            parts.append(d)
        cx += (hmtx[g][0] + tracking * upm) * scale
    return '<path d="%s" fill="%s" %s/>' % (" ".join(parts), fill, extra)


# ---------------------------------------------------------------- primitives

def _a(extra):
    return (" " + extra) if extra else ""


def rect(x, y, w, h, fill, r=0, extra=""):
    if isinstance(r, str):          # cho phép rect(..., fill, 'opacity=...')
        r, extra = 0, r
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="%s"%s/>' % (x, y, w, h, r, fill, _a(extra))


def circle(cx, cy, r, fill, extra=""):
    return '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"%s/>' % (cx, cy, r, fill, _a(extra))


def ellipse(cx, cy, rx, ry, fill, extra=""):
    return '<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s"%s/>' % (cx, cy, rx, ry, fill, _a(extra))


def poly(points, fill, extra=""):
    return '<polygon points="%s" fill="%s"%s/>' % (" ".join("%.1f,%.1f" % p for p in points), fill, _a(extra))


def path(d, fill, extra=""):
    return '<path d="%s" fill="%s"%s/>' % (d, fill, _a(extra))


def line(x1, y1, x2, y2, color=O, width=4, extra=""):
    return ('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f" stroke-linecap="round"%s/>'
            % (x1, y1, x2, y2, color, width, _a(extra)))


def stroke(d, color=O, width=4, extra=""):
    return ('<path d="%s" fill="none" stroke="%s" stroke-width="%.1f" stroke-linecap="round" stroke-linejoin="round"%s/>'
            % (d, color, width, _a(extra)))


def outlined(shapes, width=6, color=O):
    """Vẽ khối có viền ngoài liền mạch: lượt viền (tô + nét dày) rồi lượt tô."""
    out = ['<g fill="%s" stroke="%s" stroke-width="%.1f" stroke-linejoin="round" stroke-linecap="round">' % (color, color, width * 2)]
    for s in shapes:
        out.append(re.sub(r'fill="[^"]*"', 'fill="%s"' % color, s, count=1))
    out.append("</g>")
    out.extend(shapes)
    return "\n".join(out)


def group(content, extra=""):
    return "<g%s>\n%s\n</g>" % (_a(extra), content if isinstance(content, str) else "\n".join(content))


def svg(w, h, body, title, defs=""):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">\n'
            "<title>%s — Góc Phố Việt (original vector art)</title>\n<defs>%s</defs>\n%s\n</svg>\n") % (w, h, w, h, title, defs, body)


def flower(cx, cy, r, petals=6, color="#FFFDF4", center="#F3D36B", rot=0, extra=""):
    """Hoa sữa: chùm cánh trắng nhỏ."""
    out = []
    for i in range(petals):
        a = math.radians(rot + i * 360.0 / petals)
        px, py = cx + math.cos(a) * r * 0.55, cy + math.sin(a) * r * 0.55
        out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" transform="rotate(%.1f %.1f %.1f)"%s/>'
                   % (px, py, r * 0.55, r * 0.26, color, rot + i * 360.0 / petals, px, py, _a(extra)))
    out.append(circle(cx, cy, r * 0.22, center))
    return "\n".join(out)


def blob(cx, cy, rx, ry, n, rnd, fill, extra=""):
    """Tán lá dạng mây: nhiều cung tròn quanh một elip (rnd: random.Random)."""
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = 1 + rnd.uniform(-0.08, 0.12)
        pts.append((cx + math.cos(a) * rx * rr, cy + math.sin(a) * ry * rr))
    d = "M%.1f,%.1f " % pts[0]
    for i in range(n):
        p0, p1 = pts[i], pts[(i + 1) % n]
        mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
        # đẩy điểm điều khiển ra ngoài tâm để thành bướu tròn
        dx, dy = mx - cx, my - cy
        k = 1.28 + rnd.uniform(-0.05, 0.08)
        d += "Q%.1f,%.1f %.1f,%.1f " % (cx + dx * k, cy + dy * k, p1[0], p1[1])
    return path(d + "Z", fill, extra)
