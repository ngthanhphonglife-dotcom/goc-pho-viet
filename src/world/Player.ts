import type { Character } from "./Character";
import type { NavGrid, Pt } from "./Nav";

/** Điều khiển chủ quầy (Phase 4): joystick/phím (đi tự do, trượt theo vật cản) và chạm để đi (theo đường A*). */
const SPEED = 270; // đơn vị thiết kế / giây

export class PlayerController {
  /** Hướng từ joystick (−1…1). */
  stick: Pt = { x: 0, y: 0 };
  /** Hướng từ bàn phím. */
  keys: Pt = { x: 0, y: 0 };
  private path: Pt[] = [];
  private arrive: (() => void) | null = null;
  moving = false;

  constructor(readonly c: Character, private nav: NavGrid, readonly home: Pt) {}

  get pos(): Pt {
    return { x: this.c.wx, y: this.c.wy };
  }

  /** Đang đứng đúng chỗ sau quầy. */
  get atHome(): boolean {
    return Math.hypot(this.c.wx - this.home.x, this.c.wy - this.home.y) < 12;
  }

  /** Rảnh (đứng sau quầy, không ai điều khiển) → để kịch bản pha chế chạy. */
  get idleAtHome(): boolean {
    return this.atHome && !this.moving;
  }

  setPos(x: number, y: number): void {
    const p = this.nav.free({ x, y });
    this.c.wx = p.x;
    this.c.wy = p.y;
    this.stop();
    this.c.place();
  }

  stop(): void {
    this.path = [];
    this.arrive = null;
    this.moving = false;
  }

  /** Đi tới (x, y) theo đường tránh vật cản; onArrive gọi khi tới nơi. */
  goTo(x: number, y: number, onArrive?: () => void): boolean {
    const path = this.nav.findPath(this.pos, { x, y });
    this.path = path;
    this.arrive = onArrive ?? null;
    if (!path.length) {
      // không có đường: nếu đã ở gần thì coi như tới
      const cb = this.arrive;
      this.arrive = null;
      if (cb && Math.hypot(x - this.c.wx, y - this.c.wy) < 200) cb();
      return false;
    }
    return true;
  }

  /** Quay mặt về phía toạ độ x. */
  faceTo(x: number): void {
    if (Math.abs(x - this.c.wx) > 4) this.c.dir = x > this.c.wx ? 1 : -1;
  }

  update(dt: number): boolean {
    const c = this.c;
    let vx = this.stick.x + this.keys.x, vy = this.stick.y + this.keys.y;
    const mag = Math.hypot(vx, vy);
    let moved = false;
    if (mag > 0.15) {
      // điều khiển trực tiếp → huỷ đường đang đi
      this.path = [];
      this.arrive = null;
      const k = Math.min(1, mag) / mag;
      vx *= k; vy *= k;
      const nx = c.wx + vx * SPEED * dt, ny = c.wy + vy * SPEED * 0.8 * dt;
      if (!this.nav.blocked(nx, c.wy)) { c.wx = nx; moved = true; }
      if (!this.nav.blocked(c.wx, ny)) { c.wy = ny; moved = true; }
      if (Math.abs(vx) > 0.1) c.dir = vx > 0 ? 1 : -1;
    } else if (this.path.length) {
      let left = SPEED * dt;
      while (left > 0 && this.path.length) {
        const t = this.path[0];
        const d = Math.hypot(t.x - c.wx, t.y - c.wy);
        if (d <= left) {
          c.wx = t.x; c.wy = t.y;
          left -= d;
          this.path.shift();
        } else {
          if (Math.abs(t.x - c.wx) > 2) c.dir = t.x > c.wx ? 1 : -1;
          c.wx += ((t.x - c.wx) / d) * left;
          c.wy += ((t.y - c.wy) / d) * left;
          left = 0;
        }
      }
      moved = true;
      if (!this.path.length) {
        const cb = this.arrive;
        this.arrive = null;
        if (cb) cb();
      }
    }
    const was = this.moving;
    this.moving = moved;
    if (moved) c.play("walk");
    else if (was) c.play("idle");
    return moved;
  }
}
