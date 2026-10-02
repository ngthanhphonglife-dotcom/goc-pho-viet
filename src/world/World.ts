import { Application, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import type { Character, CharInfo, CharTextures, PartCell, Rig } from "./Character";
import { StreetLife } from "./StreetLife";
import { NavGrid, type Box } from "./Nav";
import { PlayerController } from "./Player";
import { Atmosphere, type Light } from "./Atmosphere";
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
interface PropInfo { id: string; x: number; y: number; w: number; h: number; foot: number; solid: [number, number] | null }
export interface Hotspot { id: string; name: string; rect: [number, number, number, number]; stand: [number, number]; action?: string }
export type Nearby = { kind: "char"; c: Character; name: string } | { kind: "hotspot"; h: Hotspot; name: string };
interface WorldMeta { width: number; height: number; focusY: number; layers: LayerInfo[]; props: PropInfo[]; hotspots: Hotspot[]; solids: [number, number, number, number][]; walk: [number, number, number, number]; lights: Light[] }

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
  nav!: NavGrid;
  atmo!: Atmosphere;
  private tickHandlers: ((dt: number) => void)[] = [];
  player!: PlayerController;
  /** Camera đang bám theo người chơi (tắt khi người chơi kéo phố để xem tự do). */
  private follow = false;
  private nearbyHandlers: ((n: Nearby | null) => void)[] = [];
  private nearbyKey = "";
  nearby: Nearby | null = null;
  private keysDown = new Set<string>();
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
    // Phase 5: ánh sáng, đèn, mưa
    this.atmo = new Atmosphere(this.layerBoxes, this.actors, this.meta.width, this.meta.height, this.meta.lights);
    this.stage.addChildAt(this.atmo.lights, this.stage.getChildIndex(this.fx));
    this.app.stage.addChild(this.atmo.rainFx);
    this.life = new StreetLife(this.charMeta.chars, this.charMeta.rig, this.actors, this.meta.width);
    // Phase 4: vỉa hè đi được + vật cản quanh chân đạo cụ, gốc cây, người đang đứng
    const boxes: Box[] = this.meta.solids.map(([x0, y0, x1, y1]) => ({ x0, y0, x1, y1 }));
    for (const p of this.meta.props) if (p.solid) boxes.push({ x0: p.solid[0], y0: p.foot - 30, x1: p.solid[1], y1: p.foot + 6 });
    for (const s of this.life.stationedSpots()) boxes.push({ x0: s.x - 40, y0: s.y - 22, x1: s.x + 40, y1: s.y + 8 });
    const [wx0, wy0, wx1, wy1] = this.meta.walk;
    this.nav = new NavGrid({ x0: wx0, y0: wy0, x1: wx1, y1: wy1 }, boxes);
    const me = this.life.agent("player")!;
    this.player = new PlayerController(me.c, this.nav, { x: me.c.wx, y: me.c.wy });
    me.hold = () => !this.player.idleAtHome;
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
    this.follow = false;
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

  /** Gọi mỗi khung hình (đồng hồ game…). */
  onTick(fn: (dt: number) => void): void {
    this.tickHandlers.push(fn);
  }

  private tick(dt: number): boolean {
    dt = Math.min(dt, 0.05);
    let moved = false;
    if (!document.hidden) for (const fn of this.tickHandlers) fn(dt);
    if (this.atmo.update(dt, this.app.renderer.screen.width, this.app.renderer.screen.height)) moved = true;
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
      if (this.interactive) {
        if (this.player.update(dt)) this.follow = true;
        if (this.follow && !this.drag && this.target === null) {
          const want = this.clamp(this.player.c.wx - this.viewW / 2);
          if (Math.abs(want - this.camX) > 0.5) { this.camX += (want - this.camX) * Math.min(1, dt * 5); this.vel = 0; this.applyCamera(); }
        }
        this.updateNearby();
      }
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
    this.atmo.lights.x = mainX;
    this.dirty = true;
  }

  /** Độ lệch từng lớp (đơn vị thiết kế) — cho test parallax. */
  layerOffsets(): Record<string, number> {
    const o: Record<string, number> = {};
    for (const l of this.meta.layers) o[l.name] = this.layerX(l);
    return o;
  }

  /** Chạy mô phỏng thêm `seconds` giây ngay lập tức (test / tua nhanh). */
  step(seconds: number): void {
    for (let t = 0; t < seconds; t += 1 / 30) this.tick(1 / 30);
    this.dirty = true;
  }

  // ------------------------------------------------------------------ người chơi & tương tác

  /** Đặt chủ quầy tại (x, y); không truyền = về sau quầy. Camera nhìn theo nếu ở xa giữa phố. */
  placePlayer(pos?: { x: number; y: number }): void {
    const p = pos ?? this.player.home;
    if (pos) this.player.setPos(p.x, p.y);
    else { this.player.c.wx = p.x; this.player.c.wy = p.y; this.player.stop(); this.player.c.place(); }
    this.follow = false;
    if (this.player.atHome) this.centerHome();
    else this.centerOn(this.player.c.wx, false);
    this.dirty = true;
  }

  onNearby(fn: (n: Nearby | null) => void): void {
    this.nearbyHandlers.push(fn);
  }

  private shortName(h: Hotspot): string {
    return h.name.split(/ — |:/)[0];
  }

  private updateNearby(): void {
    const p = this.player.pos;
    let best: Nearby | null = null;
    let bd = 150;
    for (const { c } of this.life.agents) {
      if (!c.tappable) continue;
      const d = Math.hypot(c.wx - p.x, (c.wy - p.y) * 1.6) * 0.6; // ưu tiên người hơn đồ vật
      if (d < bd) { bd = d; best = { kind: "char", c, name: c.info.name }; }
    }
    for (const h of this.meta.hotspots) {
      const d = Math.hypot(h.stand[0] - p.x, (h.stand[1] - p.y) * 1.6);
      if (d < bd && !(h.id === "cart" && this.player.atHome)) { bd = d; best = { kind: "hotspot", h, name: this.shortName(h) }; }
    }
    const key = best ? (best.kind === "char" ? "c:" + best.c.info.id : "h:" + best.h.id) : "";
    this.nearby = best;
    if (key !== this.nearbyKey) {
      this.nearbyKey = key;
      for (const fn of this.nearbyHandlers) fn(best);
    }
  }

  /** Thực hiện tương tác (đã đứng gần): quay mặt về phía đối tượng rồi báo cho game. */
  private fire(n: Nearby): void {
    if (n.kind === "char") {
      this.player.faceTo(n.c.wx);
      if (n.c.anim !== "walk" && n.c.anim !== "fix" && n.c.anim !== "sit") n.c.dir = this.player.c.wx > n.c.wx ? 1 : -1;
      for (const fn of this.charHandlers) fn(n.c);
    } else {
      if (n.h.id !== "cart") this.player.faceTo((n.h.rect[0] + n.h.rect[2]) / 2);
      else this.player.c.dir = 1;
      for (const fn of this.hotspotHandlers) fn(n.h);
    }
  }

  /** Người chơi muốn tương tác với n: đi tới gần rồi mới tương tác (không có chuyển động thì tương tác ngay). */
  interact(n: Nearby): void {
    if (!this.lifeEnabled) { this.fire(n); return; }
    let x: number, y: number;
    if (n.kind === "char") {
      const side = this.player.c.wx >= n.c.wx ? 1 : -1;
      const a = this.nav.free({ x: n.c.wx + side * 125, y: n.c.wy + 10 });
      const b = this.nav.free({ x: n.c.wx - side * 125, y: n.c.wy + 10 });
      const far = (q: { x: number; y: number }) => Math.hypot(q.x - n.c.wx, q.y - n.c.wy);
      ({ x, y } = far(a) <= far(b) + 40 ? a : b);
    } else [x, y] = n.h.stand;
    if (Math.hypot(x - this.player.c.wx, y - this.player.c.wy) < 14) { this.player.stop(); this.fire(n); return; }
    this.follow = true;
    this.player.goTo(x, y, () => this.fire(n));
  }

  /** Bấm nút tương tác: tương tác với đối tượng đang ở gần. */
  interactNearby(): void {
    if (this.nearby) this.interact(this.nearby);
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
        this.follow = false; // kéo phố = xem tự do
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
      const h = c ? null : this.hotspotAt(w.x, w.y);
      const [, wy0, , wy1] = this.meta.walk;
      if (c) this.interact({ kind: "char", c, name: c.info.name });
      else if (h) this.interact({ kind: "hotspot", h, name: this.shortName(h) });
      else if (this.lifeEnabled && w.y > wy0 - 60 && w.y < wy1 + 90) { this.follow = true; this.player.goTo(w.x, w.y); }   // chạm vỉa hè → đi tới
      else return;
      this.ring = { x: w.x, y: w.y, t: 0 };
    };
    el.addEventListener("pointerup", (e) => end(e, false));
    el.addEventListener("pointercancel", (e) => end(e, true));
    el.addEventListener("wheel", (e) => {
      if (!this.interactive) return;
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      this.follow = false;
      this.setCamera(this.camX + d / this.scale);
    }, { passive: false });
    // bàn phím: WASD / mũi tên điều khiển chủ quầy
    const KEYS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1] };
    const sync = () => {
      let x = 0, y = 0;
      for (const k of this.keysDown) { x += KEYS[k][0]; y += KEYS[k][1]; }
      this.player.keys = { x: Math.sign(x), y: Math.sign(y) };
    };
    window.addEventListener("keydown", (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!KEYS[k] || !this.interactive) return;
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, select") || document.querySelector(".overlay:not([hidden]), .dialogue:not([hidden])")) return;
      e.preventDefault();
      this.keysDown.add(k);
      sync();
    });
    window.addEventListener("keyup", (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (this.keysDown.delete(k)) sync();
    });
    window.addEventListener("blur", () => { this.keysDown.clear(); sync(); });
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
    for (const c of this.layerBoxes.values()) for (const ch of [...c.children]) if (ch instanceof Sprite) { c.removeChild(ch); ch.destroy(); }
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
    this.atmo.rebuild(rs);
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
