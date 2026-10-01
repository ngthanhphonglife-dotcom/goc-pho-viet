#!/usr/bin/env python3
"""Icon app/PWA: nền đỏ đô, đĩa kem, ly cà phê vector (icon_sell). Nội dung nằm trong vùng an toàn 80% (maskable)."""
import io, os
import cairosvg
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "public", "icons")
os.makedirs(OUT, exist_ok=True)

def make(size, rounded):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill="#AE1C3F")
    else:
        d.rectangle([0, 0, size, size], fill="#AE1C3F")
    r = int(size * 0.34)
    c = size // 2
    d.ellipse([c - r, c - r, c + r, c + r], fill="#F5EDE0", outline="#4B2E2E", width=max(2, size // 64))
    cup = cairosvg.svg2png(url=os.path.join(HERE, "icons_svg", "icon_sell.svg"), output_width=int(size * 0.56), output_height=int(size * 0.56))
    cup = Image.open(io.BytesIO(cup))
    img.alpha_composite(cup, (c - cup.width // 2, c - cup.height // 2 + size // 40))
    return img

make(512, True).save(os.path.join(OUT, "icon-512.png"))
make(192, True).save(os.path.join(OUT, "icon-192.png"))
make(512, False).save(os.path.join(OUT, "icon-maskable-512.png"))
make(180, False).convert("RGB").save(os.path.join(OUT, "apple-touch-icon.png"))
make(64, True).save(os.path.join(OUT, "favicon-64.png"))
print(os.listdir(OUT))
