import { Container, Graphics, Sprite, Texture } from "pixi.js";
import type { WeatherKind } from "../core/weather";

/**
 * Bầu không khí (Phase 5): ánh sáng theo giờ, đèn buổi tối, mây, mưa, mặt đường ướt.
 * Tất cả làm bằng mã (tô màu lớp, quầng sáng cộng màu, hạt mưa vẽ mỗi khung hình) — không dùng ảnh.
 */

export interface Light { t: "glow" | "rect"; x: number; y: number; r?: number; ry?: number; w?: number; h?: number; a: number }
type RGB = [number, number, number];

// giờ → [màu nhân lên cảnh, màu phủ trời, độ phủ trời, đèn, sao]
const KEYS: [number, RGB, RGB, number, number, number][] = [
  [0, [0.45, 0.49, 0.74], [0.07, 0.09, 0.24], 0.85, 1, 1],
  [5, [0.5, 0.54, 0.78], [0.1, 0.13, 0.3], 0.8, 1, 1],
  [6, [1, 0.9, 0.82], [1, 0.8, 0.62], 0.3, 0.15, 0],
  [8, [1, 1, 1], [1, 1, 1], 0, 0, 0],
  [15, [1, 1, 1], [1, 1, 1], 0, 0, 0],
  [16.5, [1, 0.93, 0.8], [1, 0.75, 0.45], 0.3, 0, 0],
  [17.75, [1, 0.78, 0.62], [1, 0.52, 0.3], 0.55, 0.25, 0],
  [18.75, [0.72, 0.62, 0.8], [0.42, 0.3, 0.55], 0.65, 0.8, 0.3],
  [20, [0.5, 0.54, 0.78], [0.1, 0.13, 0.3], 0.8, 1, 1],
  [24, [0.45, 0.49, 0.74], [0.07, 0.09, 0.24], 0.85, 1, 1],
];
const TARGET: Record<WeatherKind, { cloud: number; rain: number }> = {
  sunny: { cloud: 0, rain: 0 }, cloudy: { cloud: 0.7, rain: 0 }, lightRain: { cloud: 0.85, rain: 0.4 }, heavyRain: { cloud: 1, rain: 1 },
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hex = (c: RGB) => (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255);

interface Drop { x: number; y: number; v: number; l: number }

export class Atmosphere {
  minute = 9 * 60;
  kind: WeatherKind = "sunny";
  cloud = 0;
  rain = 0;
  wet = 0;
  /** Giá trị đang hiển thị — cho test. */
  shown = { tint: [1, 1, 1] as RGB, light: 0, stars: 0, drops: 0 };

  private skyFx = new Graphics();
  private stars = new Graphics();
  private cloudFx = new Graphics();
  private wetFx = new Graphics();
  readonly lights = new Container();
  readonly rainFx = new Graphics();
  private drops: Drop[] = [];
  private glowTex: Texture | null = null;
  private first = true;

  constructor(private layers: Map<string, Container>, private actors: Container, private worldW: number, private worldH: number, private lightDefs: Light[]) {
    const sky = layers.get("sky")!;
    sky.addChild(this.skyFx, this.stars, this.cloudFx);
    layers.get("main")!.addChild(this.wetFx);
    this.lights.blendMode = "add";
  }

  /** Dựng lại hình theo tỉ lệ raster mới (gọi sau mỗi lần raster). */
  rebuild(rs: number): void {
    const W = 1080, H = 1300;
    this.layers.get("sky")!.addChild(this.skyFx, this.stars, this.cloudFx); // đưa lại lên trên ảnh trời vừa raster
    for (const g of [this.skyFx, this.cloudFx]) { g.clear().rect(0, 0, W * rs, H * rs).fill(0xffffff); }
    this.stars.clear();
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) this.stars.circle(rnd() * W * rs, rnd() * 900 * rs, (1.5 + rnd() * 2.5) * rs).fill({ color: 0xfff6d8, alpha: 0.5 + rnd() * 0.5 });
    this.stars.circle(820 * rs, 300 * rs, 46 * rs).fill(0xfff3c4).circle(838 * rs, 288 * rs, 40 * rs).fill({ color: 0x1b2350, alpha: 0.55 });   // trăng khuyết

    // mặt đường ướt: lớp phủ sẫm + vệt bóng + vũng nước (đặt lại lên trên cùng lớp mặt phố sau khi raster)
    const main = this.layers.get("main")!;
    main.addChild(this.wetFx);
    const g = this.wetFx.clear();
    g.rect(0, 1270 * rs, this.worldW * rs, (this.worldH - 1270) * rs).fill({ color: 0x24324d, alpha: 0.3 });
    for (let i = 0; i < 46; i++) {
      const x = rnd() * this.worldW, y = 1300 + rnd() * 900, w = 80 + rnd() * 260;
      g.roundRect(x * rs, y * rs, w * rs, 5 * rs, 3 * rs).fill({ color: 0xe6f1fa, alpha: 0.28 });
    }
    for (let i = 0; i < 16; i++) {
      const x = rnd() * this.worldW, y = (i % 2 ? 1840 + rnd() * 380 : 1330 + rnd() * 420);
      g.ellipse(x * rs, y * rs, (70 + rnd() * 90) * rs, (12 + rnd() * 10) * rs).fill({ color: 0xbcd6ea, alpha: 0.4 });
    }

    // đèn
    if (!this.glowTex) {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const ctx = c.getContext("2d")!;
      const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, "rgba(255,214,140,1)");
      gr.addColorStop(0.35, "rgba(255,190,110,0.55)");
      gr.addColorStop(1, "rgba(255,170,90,0)");
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 128, 128);
      this.glowTex = Texture.from(c);
    }
    for (const ch of this.lights.removeChildren()) ch.destroy();
    const rects = new Graphics();
    this.lights.addChild(rects);
    for (const l of this.lightDefs) {
      if (l.t === "rect") rects.rect(l.x * rs, l.y * rs, l.w! * rs, l.h! * rs).fill({ color: 0xffc670, alpha: l.a });
      else {
        const s = new Sprite(this.glowTex);
        s.anchor.set(0.5);
        s.position.set(l.x * rs, l.y * rs);
        s.width = l.r! * 2 * rs;
        s.height = (l.ry ?? l.r!) * 2 * rs;
        s.alpha = l.a;
        this.lights.addChild(s);
      }
    }
    this.first = true;
  }

  set(minute: number, kind: WeatherKind, instant = false): void {
    this.minute = minute;
    this.kind = kind;
    if (instant) {
      this.cloud = TARGET[kind].cloud;
      this.rain = TARGET[kind].rain;
      this.wet = this.rain > 0 ? 1 : 0;
      this.first = true;
    }
  }

  private sample(h: number) {
    let i = 0;
    while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = Math.min(1, Math.max(0, (h - a[0]) / (b[0] - a[0])));
    const mix = (x: RGB, y: RGB): RGB => [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)];
    return { tint: mix(a[1], b[1]), sky: mix(a[2], b[2]), skyA: lerp(a[3], b[3], t), light: lerp(a[4], b[4], t), stars: lerp(a[5], b[5], t) };
  }

  /** Cập nhật mỗi khung hình. Trả về true nếu cần vẽ lại. screen = kích thước khung nhìn (px raster của stage gốc). */
  update(dt: number, viewW: number, viewH: number): boolean {
    const tg = TARGET[this.kind];
    const before = this.cloud + this.rain * 3 + this.wet * 7 + this.minute;
    const move = (v: number, to: number, sp: number) => (v < to ? Math.min(to, v + sp * dt) : Math.max(to, v - sp * dt));
    this.cloud = move(this.cloud, tg.cloud, 0.4);
    this.rain = move(this.rain, tg.rain, 0.4);
    this.wet = this.rain > 0.05 ? Math.min(1, this.wet + this.rain * 0.3 * dt) : Math.max(0, this.wet - 0.02 * dt);
    const changed = this.first || before !== this.cloud + this.rain * 3 + this.wet * 7 + this.minute + 0 || this.lastMinute !== this.minute;
    this.lastMinute = this.minute;

    if (changed) {
      this.first = false;
      const k = this.sample(this.minute / 60);
      const grey: RGB = [0.8, 0.84, 0.9];
      const tint: RGB = [k.tint[0] * lerp(1, grey[0], this.cloud), k.tint[1] * lerp(1, grey[1], this.cloud), k.tint[2] * lerp(1, grey[2], this.cloud)];
      const light = Math.max(k.light, this.rain > 0.7 ? 0.3 * this.rain : 0);
      const t = hex(tint);
      for (const [name, c] of this.layers) if (name !== "sky") c.tint = t;
      this.actors.tint = t;
      this.skyFx.tint = hex(k.sky);
      this.skyFx.alpha = k.skyA;
      this.stars.alpha = k.stars * (1 - this.cloud);
      this.cloudFx.tint = hex([0.6 * tint[0], 0.65 * tint[1], 0.7 * tint[2]]);
      this.cloudFx.alpha = this.cloud * 0.75;
      this.wetFx.alpha = this.wet;
      this.lights.alpha = light * 0.55; // cộng màu chồng nhiều lớp dễ cháy sáng → giảm tổng thể
      this.lights.visible = light > 0.01;
      this.shown = { tint, light, stars: this.stars.alpha, drops: this.drops.length };
    }

    // hạt mưa (toạ độ màn hình)
    const want = Math.round(this.rain * 170);
    while (this.drops.length < want) this.drops.push({ x: Math.random() * (viewW + 200), y: Math.random() * viewH, v: 0.9 + Math.random() * 0.5, l: 0.6 + Math.random() * 0.7 });
    if (this.drops.length > want) this.drops.length = want;
    this.shown.drops = this.drops.length;
    const g = this.rainFx.clear();
    if (!this.drops.length) return changed;
    const speed = viewH * 1.5, len = viewH * 0.035;
    for (const d of this.drops) {
      d.y += speed * d.v * dt;
      d.x -= speed * d.v * dt * 0.18;
      if (d.y > viewH) { d.y = -len; d.x = Math.random() * (viewW + 200); }
      g.moveTo(d.x, d.y).lineTo(d.x - len * d.l * 0.18, d.y + len * d.l);
    }
    g.stroke({ width: Math.max(1, viewH / 700), color: 0xd6e8f7, alpha: 0.6 });
    return true;
  }

  private lastMinute = -1;
}
