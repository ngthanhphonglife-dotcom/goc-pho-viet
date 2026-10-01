import { Application, Container, Sprite, Texture } from "pixi.js";
import { loadImage, type LoadTask } from "../core/preload";

/**
 * World Area (tách khỏi UI): khu phố Hoa Sữa vẽ vector (SVG nhiều lớp) trên canvas PixiJS.
 *
 * Mỗi lớp SVG được raster đúng độ phân giải màn hình thật (kích thước hiển thị × devicePixelRatio)
 * nên không bị mờ; khi đổi kích thước/xoay màn hình thì raster lại. Các lớp tĩnh gộp chung một
 * texture để tiết kiệm bộ nhớ GPU; xe cà phê là lớp riêng (sẽ đổi khi Nâng cấp ở phase sau).
 */

interface LayerMeta {
  width: number;
  height: number;
  focusY: number;
  layers: string[];
  bbox: Record<string, [number, number, number, number]>;
}

const BASE = import.meta.env.BASE_URL + "art/world/";
/** Lớp tách riêng (có thể thay/động ở phase sau); các lớp còn lại gộp làm nền. */
const SEPARATE = new Set(["60_cart"]);
/** Kích thước texture tối đa an toàn trên thiết bị di động. */
const MAX_TEX = 4096;
/** Vị trí điểm nhìn (xe cà phê) trên màn hình, tính theo chiều cao. */
const FOCUS_SCREEN = 0.62;

export interface WorldStats {
  cssWidth: number;
  cssHeight: number;
  backingWidth: number;
  backingHeight: number;
  scale: number;
  rasterScale: number;
  textures: { name: string; width: number; height: number }[];
}

export class World {
  readonly app = new Application();
  private meta!: LayerMeta;
  private images = new Map<string, HTMLImageElement>();
  private stage = new Container();
  private sprites: Sprite[] = [];
  private rasterScale = 0;
  private resizeTimer = 0;
  stats: WorldStats | null = null;

  /** Tạo canvas PixiJS (chưa tải art). */
  async init(host: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: host,
      backgroundColor: 0xcfe8f3,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 3),
      preference: "webgl",
    });
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.stage);
  }

  /** Việc tải cho màn Loading: layers.json rồi từng lớp SVG (mỗi lớp = 1 bước tiến độ). */
  async loadTasks(): Promise<LoadTask[]> {
    this.meta = await (await fetch(BASE + "layers.json")).json();
    return this.meta.layers.map((n) => ({
      name: "world/" + n,
      run: async () => { this.images.set(n, await loadImage(BASE + n + ".svg")); },
    }));
  }

  /** Dựng khu phố (raster các lớp) — gọi sau khi tải xong. */
  build(): void {
    this.layout(true);
    window.addEventListener("resize", () => this.scheduleLayout());
    window.visualViewport?.addEventListener("resize", () => this.scheduleLayout());
  }

  private scheduleLayout(): void {
    window.clearTimeout(this.resizeTimer);
    // vị trí cập nhật ngay; raster lại (tốn hơn) sau khi người dùng ngừng đổi kích thước
    this.layout(false);
    this.resizeTimer = window.setTimeout(() => this.layout(true), 160);
  }

  private layout(rasterize: boolean): void {
    const r = this.app.renderer;
    r.resize(r.canvas.parentElement!.clientWidth, r.canvas.parentElement!.clientHeight);
    const cssW = r.screen.width;
    const cssH = r.screen.height;
    const { width: W, height: H, focusY } = this.meta;
    // phủ kín khung (cover), giữ tỉ lệ
    const scale = Math.max(cssW / W, cssH / H);
    const x = (cssW - W * scale) / 2;
    const y = Math.min(0, Math.max(cssH - H * scale, cssH * FOCUS_SCREEN - focusY * scale));
    this.stage.position.set(x, y);

    const dpr = r.resolution;
    let rs = scale * dpr;
    rs = Math.min(rs, MAX_TEX / H); // giới hạn texture
    if (rasterize && Math.abs(rs - this.rasterScale) > 0.01) this.rasterize(rs);
    this.stage.scale.set(scale / this.rasterScale);

    this.stats = {
      cssWidth: cssW, cssHeight: cssH,
      backingWidth: r.canvas.width, backingHeight: r.canvas.height,
      scale, rasterScale: this.rasterScale,
      textures: this.sprites.map((s) => ({ name: s.label, width: s.texture.width, height: s.texture.height })),
    };
  }

  /** Vẽ các lớp SVG ra canvas ở tỉ lệ rs (pixel thật / đơn vị thiết kế). */
  private rasterize(rs: number): void {
    for (const s of this.sprites) {
      s.destroy({ texture: true, textureSource: true });
    }
    this.sprites = [];
    this.rasterScale = rs;

    const groups: { name: string; layers: string[] }[] = [];
    let back: string[] = [];
    for (const n of this.meta.layers) {
      if (SEPARATE.has(n)) {
        if (back.length) groups.push({ name: "backdrop", layers: back });
        back = [];
        groups.push({ name: n, layers: [n] });
      } else back.push(n);
    }
    if (back.length) groups.push({ name: groups.length ? "foreground" : "backdrop", layers: back });

    for (const g of groups) {
      // vùng bao của cả nhóm
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const n of g.layers) {
        const b = this.meta.bbox[n];
        x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]);
      }
      const cw = Math.ceil((x1 - x0) * rs);
      const ch = Math.ceil((y1 - y0) * rs);
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      for (const n of g.layers) {
        const img = this.images.get(n)!;
        // vẽ cả SVG ở tỉ lệ rs, dịch theo vùng bao → trình duyệt raster vector đúng độ phân giải
        ctx.drawImage(img, -x0 * rs, -y0 * rs, this.meta.width * rs, this.meta.height * rs);
      }
      const tex = Texture.from(canvas);
      const sp = new Sprite(tex);
      sp.label = g.name;
      sp.position.set(x0 * rs, y0 * rs);
      this.stage.addChild(sp);
      this.sprites.push(sp);
    }
  }
}
