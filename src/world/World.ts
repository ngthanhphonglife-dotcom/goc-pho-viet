import { Application, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import type { Character, CharInfo, CharTextures, PartCell, Rig } from "./Character";
import { StreetLife } from "./StreetLife";
import { loadImage, type LoadTask } from "../core/preload";

/**
 * World Area (tách khỏi UI): phố Hoa Sữa vẽ vector, dài 3 màn hình, nhiều lớp parallax.
 *
 * - Mỗi lớp/đạo cụ là SVG, được raster đúng độ phân giải màn hình thật (kích thước hiển thị × devicePixelRatio)
 *   nên không mờ; đổi kích thước màn hình thì raster lại. Lớp rộng được chia ô ≤ 1080 đơn vị để texture ≤ 4096.
 * - Camera trượt ngang: kéo/lướt có quán tính, chặn ở hai đầu phố.
 * - Đạo cụ (xe cà phê, ghế, cột…) là sprite riêng, xếp trước/sau theo vị trí chân (để nhân vật đi xen giữa ở phase sau).
 */

interface LayerInfo { name: string; width: number; parallax: number; bbox: [number, number, number, number] }
interface PropInfo { id: string; x: number; y: number; w: number; h: number; foot: number }
export interface Hotspot { id: string; name: string; rect: [number, number, number, number]; action?: string }
interface WorldMeta { width: number; height: number; focusY: number; layers: LayerInfo[]; props: PropInfo[]; hotspots: Hotspot[] }

interface CharMeta { rig: Rig; faces: { file: string; w: number; h: number; parts: Record<string, PartCell> }; chars: CharInfo[] }

const BASE = import.meta.env.BASE_URL + "art/world/";
const CHARS = import.meta.env.BASE_URL + "art/chars/";
const MAX_TEX = 4096;
const TILE = 1080;
/** Vị trí điểm nhìn (xe cà phê) trên màn hình, tính theo chiều cao. */
const FOCUS_SCREEN = 0.62;
/** Lớp đạo cụ nằm ngay sau lớp này. */
const ACTORS_AFTER = "main";

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
  private meta!: WorldMeta;
  private images = new Map<string, HTMLImageElement>();
  private stage = new Container();
  private layerBoxes = new Map<string, Container>();
  private actors = new Container();
  private propSprites: Sprite[] = [];
  private charMeta!: CharMeta;
  private charSubTextures: Texture[] = [];
  private charHandlers: ((c: Character) => void)[] = [];
  life!: StreetLife;
  /** Bật/tắt chuyển động nhân vật (tắt thì chỉ vẽ lại khi camera đổi). */
  lifeEnabled = true;
  private fx = new Graphics();
  private textures: Texture[] = [];
  private rasterScale = 0;
  private resizeTimer = 0;
  private scale = 1;
  private stageY = 0;
  private host!: HTMLElement;
  stats: WorldStats | null = null;

  // camera (đơn vị thiết kế; x = mép trái khung nhìn)
  private camX = NaN;
  private viewW = 1080;
  private vel = 0;
  private target: number | null = null;
  private drag: { id: number; startX: number; startY: number; lastX: number; lastT: number; t0: number; moved: boolean } | null = null;
  private ring: { x: number; y: number; t: number } | null = null;
  private hotspotHandlers: ((h: Hotspot) => void)[] = [];
  /** Chỉ cho kéo camera/chạm điểm tương tác khi đang trong game. */
  interactive = false;

  /** Tạo canvas PixiJS (chưa tải art). */
  async init(host: HTMLElement): Promise<void> {
    this.host = host;
    await this.app.init({
      resizeTo: host,
      backgroundColor: 0xcfe8f3,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 3),
      preference: "webgl",
      autoStart: false,
    });
    this.app.ticker.stop(); // tự vẽ khi có thay đổi (tiết kiệm pin) — xem loop()
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.stage);
  }

  /** Việc tải cho màn Loading: layers.json rồi từng lớp + đạo cụ SVG (mỗi file = 1 bước tiến độ). */
  async loadTasks(): Promise<LoadTask[]> {
    this.meta = await (await fetch(BASE + "layers.json")).json();
    this.charMeta = await (await fetch(CHARS + "characters.json")).json();
    const files = [...this.meta.layers.map((l) => [l.name, BASE + l.name + ".svg"]), ...this.meta.props.map((p) => ["prop:" + p.id, BASE + "props/" + p.id + ".svg"]),
      ["char:faces", CHARS + this.charMeta.faces.file], ...this.charMeta.chars.map((c) => ["char:" + c.id, CHARS + c.file])];
    return files.map(([key, url]) => ({
      name: "world/" + key,
      run: async () => { this.images.set(key, await loadImage(url)); },
    }));
  }

  /** Dựng khu phố (raster các lớp) — gọi sau khi tải xong. */
  build(): void {
    for (const l of this.meta.layers) {
      const c = new Container();
      c.label = l.name;
      this.layerBoxes.set(l.name, c);
      this.stage.addChild(c);
      if (l.name === ACTORS_AFTER) {
        this.actors.label = "actors";
        this.actors.sortableChildren = true;
        this.stage.addChild(this.actors);
        this.stage.addChild(this.fx);
      }
    }
    this.life = new StreetLife(this.charMeta.chars, this.charMeta.rig, this.actors, this.meta.width);
    this.layout(true);
    window.addEventListener("resize", () => this.scheduleLayout());
    window.visualViewport?.addEventListener("resize", () => this.scheduleLayout());
    this.bindInput();
    let last = performance.now();
    const loop = (now: number) => {
      const dirty = this.tick((now - last) / 1000);
      last = now;
      if (dirty || this.dirty) {
        this.dirty = false;
        this.app.renderer.render(this.app.stage);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** Cần vẽ lại ở khung hình tới. */
  private dirty = true;

  // ------------------------------------------------------------------ camera

  get camera() {
    return { x: this.camX, min: 0, max: this.camMax, viewWidth: this.viewW, center: this.camX + this.viewW / 2, worldWidth: this.meta.width };
  }

  private get camMax(): number {
    return Math.max(0, this.meta.width - this.viewW);
  }

  private clamp(x: number): number {
    return Math.min(this.camMax, Math.max(0, x));
  }

  /** Đặt camera ngay lập tức (x = mép trái khung nhìn). */
  setCamera(x: number): void {
    this.target = null;
    this.vel = 0;
    this.camX = this.clamp(x);
    this.applyCamera();
  }

  /** Đưa tâm khung nhìn tới toạ độ x của phố; animate = trượt mượt. */
  centerOn(worldX: number, animate = true): void {
    const x = this.clamp(worldX - this.viewW / 2);
    if (animate) { this.target = x; this.vel = 0; } else this.setCamera(x);
  }

  /** Về giữa phố (xe cà phê). */
  centerHome(animate = false): void {
    this.centerOn(this.meta.width / 2, animate);
  }

  private tick(dt: number): boolean {
    dt = Math.min(dt, 0.05);
    let moved = false;
    if (this.target !== null) {
      const d = this.target - this.camX;
      if (Math.abs(d) < 0.5) { this.camX = this.target; this.target = null; } else this.camX += d * Math.min(1, dt * 7);
      moved = true;
    } else if (!this.drag && Math.abs(this.vel) > 4) {
      this.camX = this.camX + this.vel * dt;
      this.vel *= Math.exp(-dt * 3.2);
      if (this.camX <= 0 || this.camX >= this.camMax) this.vel = 0;
      this.camX = this.clamp(this.camX);
      moved = true;
    }
    if (moved) this.applyCamera();
    if (this.ring) {
      this.ring.t += dt;
      const k = this.ring.t / 0.45;
      this.fx.clear();
      if (k >= 1) this.ring = null;
      else this.fx.circle(this.ring.x * this.rasterScale, this.ring.y * this.rasterScale, (30 + 70 * k) * this.rasterScale)
        .stroke({ width: 8 * this.rasterScale * (1 - k) + 1, color: 0xffffff, alpha: 0.9 * (1 - k) });
      moved = true;
    }
    if (this.lifeEnabled && !document.hidden) {
      this.life.update(dt);
      moved = true;
    }
    return moved;
  }

  /** Vị trí x (đơn vị thiết kế, trên màn hình) của gốc một lớp ở camera hiện tại. */
  private layerX(l: LayerInfo): number {
    const camC = this.camMax / 2;
    return this.viewW / 2 - l.width / 2 - (this.camX - camC) * l.parallax;
  }

  private applyCamera(): void {
    const rs = this.rasterScale;
    for (const l of this.meta.layers) this.layerBoxes.get(l.name)!.x = Math.round(this.layerX(l) * rs);
    const mainX = Math.round(-this.camX * rs);
    this.actors.x = mainX;
    this.fx.x = mainX;
    this.dirty = true;
  }

  /** Độ lệch từng lớp (đơn vị thiết kế) — cho test parallax. */
  layerOffsets(): Record<string, number> {
    const o: Record<string, number> = {};
    for (const l of this.meta.layers) o[l.name] = this.layerX(l);
    return o;
  }

  // ------------------------------------------------------------------ nhập liệu

  onCharacter(fn: (c: Character) => void): void {
    this.charHandlers.push(fn);
  }

  onHotspot(fn: (h: Hotspot) => void): void {
    this.hotspotHandlers.push(fn);
  }

  get hotspots(): Hotspot[] {
    return this.meta.hotspots;
  }

  /** Toạ độ màn hình (CSS px) → toạ độ phố. */
  toWorld(px: number, py: number): { x: number; y: number } {
    return { x: this.camX + px / this.scale, y: (py - this.stageY) / this.scale };
  }

  /** Toạ độ phố → màn hình (CSS px). */
  toScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: (wx - this.camX) * this.scale, y: wy * this.scale + this.stageY };
  }

  /** Điểm tương tác tại toạ độ phố (ưu tiên vùng nhỏ nhất). */
  hotspotAt(wx: number, wy: number): Hotspot | null {
    let best: Hotspot | null = null;
    let area = Infinity;
    for (const h of this.meta.hotspots) {
      const [x0, y0, x1, y1] = h.rect;
      if (wx < x0 || wx > x1 || wy < y0 || wy > y1) continue;
      const a = (x1 - x0) * (y1 - y0);
      if (a < area) { area = a; best = h; }
    }
    return best;
  }

  private bindInput(): void {
    const el = this.host;
    el.style.touchAction = "none";
    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    el.addEventListener("pointerdown", (e) => {
      if (!this.interactive || this.drag || (e.pointerType === "mouse" && e.button !== 0)) return;
      const p = local(e);
      this.drag = { id: e.pointerId, startX: p.x, startY: p.y, lastX: p.x, lastT: performance.now(), t0: performance.now(), moved: false };
      this.vel = 0;
      this.target = null;
      try { el.setPointerCapture(e.pointerId); } catch { /* bỏ qua */ }
    });
    el.addEventListener("pointermove", (e) => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      const p = local(e);
      if (!d.moved && Math.hypot(p.x - d.startX, p.y - d.startY) > 8) d.moved = true;
      if (d.moved) {
        const now = performance.now();
        const dx = (p.x - d.lastX) / this.scale;
        const dt = Math.max(1, now - d.lastT) / 1000;
        this.vel = this.vel * 0.4 + (-dx / dt) * 0.6;
        this.camX = this.clamp(this.camX - dx);
        this.applyCamera();
        d.lastT = now;
      }
      d.lastX = p.x;
    });
    const end = (e: PointerEvent, cancelled: boolean) => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      this.drag = null;
      const now = performance.now();
      if (now - d.lastT > 90) this.vel = 0;                      // dừng tay rồi mới thả → không trôi
      this.vel = Math.max(-6000, Math.min(6000, this.vel));
      if (cancelled || d.moved || !this.interactive || now - d.t0 > 450) return;
      this.vel = 0;
      const p = local(e);
      const w = this.toWorld(p.x, p.y);
      const c = this.life.characterAt(w.x, w.y);
      if (c) {
        this.ring = { x: w.x, y: w.y, t: 0 };
        for (const fn of this.charHandlers) fn(c);
        return;
      }
      const h = this.hotspotAt(w.x, w.y);
      if (!h) return;
      this.ring = { x: w.x, y: w.y, t: 0 };
      for (const fn of this.hotspotHandlers) fn(h);
    };
    el.addEventListener("pointerup", (e) => end(e, false));
    el.addEventListener("pointercancel", (e) => end(e, true));
    el.addEventListener("wheel", (e) => {
      if (!this.interactive) return;
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      this.setCamera(this.camX + d / this.scale);
    }, { passive: false });
    window.addEventListener("keydown", (e) => {
      if (!this.interactive || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, select")) return;
      const base = this.target ?? this.camX;
      this.target = this.clamp(base + (e.key === "ArrowLeft" ? -1 : 1) * this.viewW * 0.4);
      this.vel = 0;
    });
  }

  // ------------------------------------------------------------------ bố cục + raster

  private scheduleLayout(): void {
    window.clearTimeout(this.resizeTimer);
    // vị trí cập nhật ngay; raster lại (tốn hơn) sau khi người dùng ngừng đổi kích thước
    this.layout(false);
    this.resizeTimer = window.setTimeout(() => this.layout(true), 160);
  }

  private layout(rasterize: boolean): void {
    const r = this.app.renderer;
    r.resize(this.host.clientWidth, this.host.clientHeight);
    const cssW = r.screen.width;
    const cssH = r.screen.height;
    const { height: H, focusY } = this.meta;
    // khung nhìn rộng tối đa 1080 đơn vị (một "màn hình" phố), cao phủ kín
    const scale = Math.max(cssW / TILE, cssH / H);
    const center = Number.isNaN(this.camX) ? this.meta.width / 2 : this.camX + this.viewW / 2;
    this.scale = scale;
    this.viewW = cssW / scale;
    this.camX = this.clamp(center - this.viewW / 2);
    this.stageY = Math.min(0, Math.max(cssH - H * scale, cssH * FOCUS_SCREEN - focusY * scale));
    this.stage.position.set(0, this.stageY);

    const dpr = r.resolution;
    const rs = Math.min(scale * dpr, MAX_TEX / H); // giới hạn texture
    if (rasterize && Math.abs(rs - this.rasterScale) > 0.01) this.rasterize(rs);
    this.stage.scale.set(scale / this.rasterScale);
    this.applyCamera();

    this.stats = {
      cssWidth: cssW, cssHeight: cssH,
      backingWidth: r.canvas.width, backingHeight: r.canvas.height,
      scale, rasterScale: this.rasterScale,
      textures: this.textures.map((t) => ({ name: t.label ?? "", width: t.width, height: t.height })),
    };
  }

  private makeTexture(name: string, cw: number, ch: number, draw: (ctx: CanvasRenderingContext2D) => void): Texture {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, cw);
    canvas.height = Math.max(1, ch);
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    draw(ctx);
    const tex = Texture.from(canvas);
    tex.label = name;
    this.textures.push(tex);
    return tex;
  }

  /** Vẽ các lớp SVG ra canvas ở tỉ lệ rs (pixel thật / đơn vị thiết kế). */
  private rasterize(rs: number): void {
    for (const c of this.layerBoxes.values()) for (const ch of c.removeChildren()) ch.destroy();
    for (const sp of this.propSprites) { this.actors.removeChild(sp); sp.destroy(); }
    this.propSprites = [];
    for (const t of this.charSubTextures) t.destroy(false);
    this.charSubTextures = [];
    for (const t of this.textures) t.destroy(true);
    this.textures = [];
    this.rasterScale = rs;
    const H = this.meta.height;

    for (const l of this.meta.layers) {
      const box = this.layerBoxes.get(l.name)!;
      const img = this.images.get(l.name)!;
      const [x0, y0, x1, y1] = l.bbox;
      const tilePx = Math.round(TILE * rs);
      const py0 = Math.floor(y0 * rs);
      const ph = Math.ceil(y1 * rs) - py0;
      // ô theo pixel nguyên → các ô khít nhau, không hở đường nối
      for (let px = Math.floor(x0 * rs); px < Math.ceil(x1 * rs); px += tilePx) {
        const pw = Math.min(tilePx, Math.ceil(x1 * rs) - px);
        const tex = this.makeTexture(l.name, pw, ph, (ctx) => ctx.drawImage(img, -px, -py0, l.width * rs, H * rs));
        const sp = new Sprite(tex);
        sp.label = l.name;
        sp.position.set(px, py0);
        box.addChild(sp);
      }
    }
    for (const p of this.meta.props) {
      const img = this.images.get("prop:" + p.id)!;
      const pw = Math.ceil(p.w * rs), ph = Math.ceil(p.h * rs);
      const tex = this.makeTexture("prop:" + p.id, pw, ph, (ctx) => ctx.drawImage(img, 0, 0, pw, ph));
      const sp = new Sprite(tex);
      sp.label = p.id;
      sp.position.set(Math.round(p.x * rs), Math.round(p.y * rs));
      sp.zIndex = p.foot;
      this.actors.addChild(sp);
      this.propSprites.push(sp);
    }

    // nhân vật: mỗi người một atlas, cắt thành texture con theo từng bộ phận
    const cut = (key: string, w: number, h: number, cells: Record<string, PartCell>) => {
      const img = this.images.get(key)!;
      const base = this.makeTexture(key, Math.ceil(w * rs), Math.ceil(h * rs), (ctx) => ctx.drawImage(img, 0, 0, w * rs, h * rs));
      const out: Record<string, Texture> = {};
      for (const [name, c] of Object.entries(cells)) {
        const t = new Texture({ source: base.source, frame: new Rectangle(c.x * rs, c.y * rs, c.w * rs, c.h * rs) });
        this.charSubTextures.push(t);
        out[name] = t;
      }
      return out;
    };
    const f = this.charMeta.faces;
    const faces = cut("char:faces", f.w, f.h, f.parts);
    const tex = new Map<string, CharTextures>();
    for (const c of this.charMeta.chars) tex.set(c.id, { parts: cut("char:" + c.id, c.w, c.h, c.parts), faces, faceCells: f.parts, rs });
    this.life.setTextures(tex);
    this.dirty = true;
  }

  /** Màu điểm ảnh thật trên canvas tại (x, y) CSS px — cho test (kiểm tra không hở nền). */
  samplePixel(x: number, y: number): [number, number, number, number] {
    const r = this.app.renderer as unknown as { gl: WebGL2RenderingContext };
    this.app.renderer.render(this.app.stage);
    const gl = r.gl;
    const res = this.app.renderer.resolution;
    const out = new Uint8Array(4);
    gl.readPixels(Math.round(x * res), Math.round(this.app.canvas.height - y * res - 1), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
    return [out[0], out[1], out[2], out[3]];
  }
}
