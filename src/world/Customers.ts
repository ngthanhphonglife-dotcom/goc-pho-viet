import { Container, Graphics, Sprite, type Texture } from "pixi.js";
import { Character, type CharInfo, type CharTextures, type Rig } from "./Character";
import type { NavGrid, Pt } from "./Nav";

/**
 * Khách hàng (Phase 8): đi tới xếp hàng trước xe cà phê, gọi món, chờ có giới hạn, nhận ly rồi rời đi.
 * Lớp này chỉ lo phần "trên phố"; tiền/uy tín do Boot xử lý qua serve()/onLost.
 */
export type CustomerType = "office" | "student" | "shipper" | "casual";
export const TYPES: Record<CustomerType, { name: string; looks: string[]; patience: number; speed: number; likes: Record<string, number> }> = {
  office: { name: "Khách văn phòng", looks: ["kh_vp1", "kh_vp2"], patience: 40, speed: 125, likes: { den: 3, sua: 3, tratac: 1 } },
  student: { name: "Học sinh", looks: ["kh_hs1", "kh_hs2"], patience: 55, speed: 105, likes: { den: 0.5, sua: 2, tratac: 4 } },
  shipper: { name: "Shipper", looks: ["kh_ship1", "kh_ship2"], patience: 30, speed: 150, likes: { den: 3, sua: 3, tratac: 1 } },
  casual: { name: "Khách ghé quán", looks: ["kh_dl1", "kh_dl2", "kh_dl3"], patience: 60, speed: 110, likes: { den: 2, sua: 2, tratac: 2 } },
};
export const QUEUE_MAX = 6;
const CX = 1080;
/** Chỗ đứng: 0 = trước quầy (đang gọi món), 1–5 = hàng chờ phía trước bảng menu. */
const SLOTS: Pt[] = [{ x: CX + 640, y: 1592 }, { x: CX + 720, y: 1736 }, { x: CX + 830, y: 1744 }, { x: CX + 940, y: 1736 }, { x: CX + 1050, y: 1744 }, { x: CX + 1160, y: 1736 }];

export interface Customer {
  uid: number;
  type: CustomerType;
  look: string;
  recipe: string;
  c: Character;
  state: "arriving" | "waiting" | "leaving";
  slot: number;
  path: Pt[];
  patience: number;
  max: number;
  mood: "happy" | "ok" | "meh" | "angry" | null;
  bubble: Container;
  moodT: number;
}

export class Customers {
  readonly list: Customer[] = [];
  /** Hàng chờ theo thứ tự (phần tử 0 = đầu hàng). */
  readonly queue: Customer[] = [];
  autoSpawn = true;
  /** Số khách mỗi phút (Boot cung cấp theo giờ/thời tiết/uy tín). */
  rate: () => number = () => 0;
  /** Chọn món cho loại khách (Boot cung cấp theo thực đơn đang mở + thời tiết). */
  pick: (type: CustomerType) => string = () => "sua";
  onLost: (c: Customer) => void = () => {};
  onChange: () => void = () => {};
  private uid = 0;
  private timer = 4;
  private tex: Map<string, CharTextures> | null = null;
  private items = new Map<string, Texture>();
  private rs = 1;

  constructor(private chars: CharInfo[], private rig: Rig, private layer: Container, private nav: NavGrid, private worldW: number) {}

  setTextures(tex: Map<string, CharTextures>, items: Map<string, Texture>, rs: number): void {
    this.tex = tex;
    this.items = items;
    this.rs = rs;
    for (const cu of this.list) { cu.c.setTextures(tex.get(cu.look)!); this.drawBubble(cu); }
  }

  /** Số khách đang đứng chờ (đã tới chỗ). */
  get waiting(): number { return this.queue.filter((c) => c.state === "waiting").length; }
  get front(): Customer | null { const f = this.queue[0]; return f && f.state === "waiting" && f.slot === 0 ? f : null; }

  /** Thêm một khách (test có thể chỉ định loại/món/hướng). Trả về null nếu hàng đã đủ 6. */
  spawn(type?: CustomerType, recipe?: string, fromLeft = Math.random() < 0.5): Customer | null {
    if (this.queue.length >= QUEUE_MAX || !this.tex) return null;
    const t = type ?? (["office", "student", "shipper", "casual"] as const)[Math.floor(Math.random() * 4)];
    const def = TYPES[t];
    const look = def.looks[Math.floor(Math.random() * def.looks.length)];
    const info = this.chars.find((c) => c.id === look)!;
    const c = new Character(info, this.rig);
    c.label = "customer";
    c.wx = fromLeft ? -140 : this.worldW + 140;
    c.wy = 1736;
    c.setTextures(this.tex.get(look)!);
    c.play("walk");
    this.layer.addChild(c);
    const bubble = new Container();
    bubble.zIndex = 9000;
    bubble.visible = false;
    this.layer.addChild(bubble);
    const cu: Customer = { uid: ++this.uid, type: t, look, recipe: recipe ?? this.pick(t), c, state: "arriving", slot: -1, path: [], patience: def.patience, max: def.patience, mood: null, bubble, moodT: 0 };
    this.list.push(cu);
    this.queue.push(cu);
    this.drawBubble(cu);
    this.onChange();
    return cu;
  }

  private go(cu: Customer, to: Pt): void {
    const from = { x: cu.c.wx, y: cu.c.wy };
    const p = this.nav.findPath(from, to);
    cu.path = p.length ? p : [to];
  }

  private leave(cu: Customer, mood: Customer["mood"]): void {
    const i = this.queue.indexOf(cu);
    if (i >= 0) this.queue.splice(i, 1);
    cu.state = "leaving";
    cu.mood = mood;
    cu.moodT = 2.2;
    cu.slot = -1;
    const exitLeft = cu.c.wx < this.worldW / 2 ? Math.random() < 0.7 : Math.random() < 0.3;
    const edge = { x: exitLeft ? 60 : this.worldW - 60, y: 1740 };
    this.go(cu, edge);
    cu.path.push({ x: exitLeft ? -160 : this.worldW + 160, y: 1740 });
    this.drawBubble(cu);
    this.onChange();
  }

  /** Giao ly cho khách đầu hàng. Trả về khách (đã rời hàng) hoặc null nếu khách không còn ở đầu hàng. */
  serve(uid: number, mood: "happy" | "ok" | "meh"): Customer | null {
    const cu = this.front;
    if (!cu || cu.uid !== uid) return null;
    this.leave(cu, mood);
    cu.c.react(1.2);
    return cu;
  }

  /** Mời khách đầu hàng đi (hết món) — không mất uy tín. */
  dismiss(uid: number): boolean {
    const cu = this.front;
    if (!cu || cu.uid !== uid) return false;
    this.leave(cu, "meh");
    return true;
  }

  /** Dọn hết khách (sang ngày mới, về menu). */
  clear(): void {
    for (const cu of this.list) { this.layer.removeChild(cu.c, cu.bubble); cu.c.destroy({ children: true }); cu.bubble.destroy({ children: true }); }
    this.list.length = 0;
    this.queue.length = 0;
    this.timer = 4;
    this.onChange();
  }

  /** Khách tại toạ độ phố (để chạm). */
  at(wx: number, wy: number): Customer | null {
    let best: Customer | null = null;
    for (const cu of this.list) {
      const s = cu.c.size;
      if (Math.abs(wx - cu.c.wx) <= 62 * s && wy <= cu.c.wy + 6 && wy >= cu.c.wy - 440 * s && (!best || cu.c.wy > best.c.wy)) best = cu;
    }
    return best;
  }

  /** paused = đang mở bảng/hội thoại: khách vẫn đi nhưng kiên nhẫn không giảm, không có khách mới. */
  update(dt: number, paused: boolean): void {
    if (this.autoSpawn && !paused) {
      const r = this.rate();
      if (r > 0) {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.spawn();
          this.timer = (60 / r) * (0.6 + Math.random() * 0.8);
        }
      }
    }
    let changed = false;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const cu = this.list[i];
      const c = cu.c;
      // dồn hàng
      if (cu.state !== "leaving") {
        const slot = this.queue.indexOf(cu);
        if (slot !== cu.slot) { cu.slot = slot; this.go(cu, SLOTS[slot]); cu.state = "arriving"; changed = true; }
      }
      // đi theo đường
      if (cu.path.length) {
        let left = TYPES[cu.type].speed * c.info.scale * dt * (cu.state === "leaving" ? 1.1 : 1);
        while (left > 0 && cu.path.length) {
          const t = cu.path[0];
          const d = Math.hypot(t.x - c.wx, t.y - c.wy);
          if (d <= left) { c.wx = t.x; c.wy = t.y; left -= d; cu.path.shift(); }
          else { if (Math.abs(t.x - c.wx) > 2) c.dir = t.x > c.wx ? 1 : -1; c.wx += ((t.x - c.wx) / d) * left; c.wy += ((t.y - c.wy) / d) * left; left = 0; }
        }
        c.play("walk");
        if (!cu.path.length) {
          if (cu.state === "leaving") { this.layer.removeChild(c, cu.bubble); c.destroy({ children: true }); cu.bubble.destroy({ children: true }); this.list.splice(i, 1); continue; }
          cu.state = "waiting";
          c.play("idle");
          c.dir = -1;
          changed = true;
        }
      } else if (cu.state === "waiting" && !paused) {
        cu.patience -= dt * (cu.slot === 0 ? 1 : 0.5);
        if (cu.patience <= 0) { this.onLost(cu); this.leave(cu, "angry"); changed = false; }
      }
      if (cu.moodT > 0) { cu.moodT -= dt; if (cu.moodT <= 0) cu.bubble.visible = false; }
      c.update(dt);
      this.placeBubble(cu);
    }
    if (changed) this.onChange();
  }

  // ------------------------------------------------------------------ bong bóng món + thanh kiên nhẫn

  private drawBubble(cu: Customer): void {
    const b = cu.bubble;
    for (const ch of b.removeChildren()) ch.destroy();
    const g = new Graphics();
    g.roundRect(-52, -104, 104, 96, 22).fill(0xfffaf1).stroke({ width: 5, color: 0x4b2e2e });
    g.poly([-12, -10, 12, -10, 0, 8]).fill(0xfffaf1).stroke({ width: 5, color: 0x4b2e2e });
    g.rect(-14, -14, 28, 7).fill(0xfffaf1);
    b.addChild(g);
    if (cu.mood) {
      const m = new Graphics();
      if (cu.mood === "happy") m.circle(-13, -66, 15).circle(13, -66, 15).fill(0xe2483d).poly([-27, -60, 27, -60, 0, -30]).fill(0xe2483d);
      else if (cu.mood === "angry") m.moveTo(-26, -40).lineTo(-12, -74).lineTo(0, -46).lineTo(12, -74).lineTo(26, -40).stroke({ width: 8, color: 0xae1c3f, join: "round", cap: "round" });
      else m.circle(-22, -56, 7).circle(0, -56, 7).circle(22, -56, 7).fill(cu.mood === "ok" ? 0x79a867 : 0x9b9a9a);
      b.addChild(m);
    } else {
      const t = this.items.get(cu.recipe);
      if (t) {
        const s = new Sprite(t);
        s.anchor.set(0.5);
        s.position.set(0, -64);
        s.width = s.height = 70;
        b.addChild(s);
      }
      const bar = new Graphics();
      bar.label = "bar";
      b.addChild(bar);
    }
    b.scale.set(this.rs * 0.95);
  }

  private placeBubble(cu: Customer): void {
    const b = cu.bubble;
    b.visible = cu.mood ? cu.moodT > 0 : cu.state === "waiting";
    if (!b.visible) return;
    b.position.set(cu.c.wx * this.rs, (cu.c.wy - 322 * cu.c.size) * this.rs);
    const bar = b.getChildByLabel("bar") as Graphics | null;
    if (bar) {
      const k = Math.max(0, cu.patience / cu.max);
      bar.clear().roundRect(-38, -26, 76, 10, 5).fill(0xd9d2c6).roundRect(-38, -26, 76 * k, 10, 5).fill(k > 0.5 ? 0x5aa84f : k > 0.25 ? 0xe9b93a : 0xd9463b);
    }
  }

  snapshot() {
    return this.list.map((cu) => ({ uid: cu.uid, type: cu.type, look: cu.look, recipe: cu.recipe, state: cu.state, slot: cu.slot, x: cu.c.wx, y: cu.c.wy, patience: cu.patience, max: cu.max, mood: cu.mood, bubble: cu.bubble.visible }));
  }
}
