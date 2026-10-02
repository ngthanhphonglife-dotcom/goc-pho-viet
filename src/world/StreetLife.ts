import type { Container } from "pixi.js";
import { Character, type Anim, type CharInfo, type CharTextures, type Rig } from "./Character";

/**
 * Đời sống trên phố (Phase 3): người đứng tại chỗ theo kịch bản lặp, người đi bộ qua lại trên vỉa hè.
 * Lịch trình thật và tìm đường sẽ có ở Phase 14.
 */

const CX = 1080; // phần giữa phố bắt đầu từ đây (xem tools/art/world.py)

interface Stationed { id: string; x: number; y: number; dir: 1 | -1; script: [Anim, number][]; tappable?: boolean }
interface Walker { id: string; x: number; y: number; dir: 1 | -1; speed: number }

const STATIONED: Stationed[] = [
  // chủ quầy đứng sau xe cà phê (chạm vào thì tính là chạm xe cà phê)
  { id: "player", x: CX + 662, y: 1475, dir: 1, tappable: false, script: [["idle", 4], ["brew", 3.2], ["idle", 2], ["serve", 1.6]] },
  { id: "chutu", x: CX + 185, y: 1432, dir: 1, script: [["fix", 6], ["sit", 2.2]] },
  { id: "coba", x: CX + 960, y: 1325, dir: -1, script: [["idle", 5], ["wave", 1.6], ["idle", 4], ["talk", 2.2]] },
  { id: "mai", x: CX + 470, y: 1641, dir: 1, script: [["sit", 6], ["talk", 2]] },
];

const WALKERS: Walker[] = [
  { id: "hoang", x: 1250, y: 1762, dir: 1, speed: 112 },
  { id: "lan", x: 2060, y: 1742, dir: -1, speed: 96 },
  { id: "nam", x: 2150, y: 1754, dir: -1, speed: 96 },
  { id: "minh", x: 320, y: 1772, dir: 1, speed: 150 },
];

export interface Agent {
  c: Character;
  script?: [Anim, number][];
  step: number;
  left: number;
  speed: number;
  /** nghỉ ở đầu phố trước khi quay lại */
  rest: number;
  /** true = tạm ngưng kịch bản (người chơi đang điều khiển) */
  hold?: () => boolean;
}

export class StreetLife {
  readonly agents: Agent[] = [];

  constructor(chars: CharInfo[], rig: Rig, private layer: Container, private worldWidth: number) {
    const byId = new Map(chars.map((c) => [c.id, c]));
    for (const s of STATIONED) {
      const c = new Character(byId.get(s.id)!, rig);
      c.wx = s.x; c.wy = s.y; c.dir = s.dir;
      c.tappable = s.tappable !== false;
      c.play(s.script[0][0]);
      this.agents.push({ c, script: s.script, step: 0, left: s.script[0][1], speed: 0, rest: 0 });
      layer.addChild(c);
    }
    for (const w of WALKERS) {
      const c = new Character(byId.get(w.id)!, rig);
      c.wx = w.x; c.wy = w.y; c.dir = w.dir;
      c.play("walk");
      this.agents.push({ c, step: 0, left: 0, speed: w.speed, rest: 0 });
      layer.addChild(c);
    }
  }

  setTextures(tex: Map<string, CharTextures>): void {
    for (const a of this.agents) a.c.setTextures(tex.get(a.c.info.id)!);
  }

  update(dt: number): void {
    const margin = 220;
    for (const a of this.agents) {
      const c = a.c;
      if (a.script && a.hold?.()) {
        // người chơi đang điều khiển nhân vật này
      } else if (a.script) {
        a.left -= dt;
        if (a.left <= 0) {
          a.step = (a.step + 1) % a.script.length;
          a.left = a.script[a.step][1];
          c.play(a.script[a.step][0]);
        }
      } else if (c.reacting > 0) {
        c.play("idle");                       // dừng lại chào khi được chạm
      } else if (a.rest > 0) {
        a.rest -= dt;
        if (a.rest <= 0) c.dir = c.dir === 1 ? -1 : 1;
      } else {
        c.play("walk");
        c.wx += c.dir * a.speed * c.info.scale * dt;
        if ((c.dir === 1 && c.wx > this.worldWidth + margin) || (c.dir === -1 && c.wx < -margin)) a.rest = 2 + Math.random() * 4;
      }
      c.update(dt);
    }
  }

  /** Nhân vật tại toạ độ phố (ưu tiên người đứng gần camera hơn). */
  characterAt(wx: number, wy: number): Character | null {
    let best: Character | null = null;
    for (const { c } of this.agents) {
      if (!c.tappable) continue;
      const s = c.info.scale;
      const top = c.wy - (c.anim === "sit" || c.anim === "fix" ? 270 : 315) * s;
      if (Math.abs(wx - c.wx) <= 62 * s && wy <= c.wy + 6 && wy >= top && (!best || c.wy > best.wy)) best = c;
    }
    return best;
  }

  agent(id: string): Agent | undefined {
    return this.agents.find((a) => a.c.info.id === id);
  }

  /** Người đứng tại chỗ (trừ chủ quầy) — là vật cản trên vỉa hè. */
  stationedSpots(): { x: number; y: number }[] {
    return this.agents.filter((a) => a.script && a.c.info.id !== "player").map((a) => ({ x: a.c.wx, y: a.c.wy }));
  }

  get(id: string): Character | undefined {
    return this.agents.find((a) => a.c.info.id === id)?.c;
  }

  /** Ảnh chụp trạng thái — cho test. */
  snapshot() {
    return this.agents.map(({ c, script }) => ({
      id: c.info.id, name: c.info.name, x: c.wx, y: c.wy, dir: c.dir, anim: c.anim, face: c.faceShown, z: c.zIndex,
      stationed: !!script, reacting: c.reacting > 0, pose: { ...c.pose }, parts: Object.keys(c.info.parts).length, inLayer: c.parent === this.layer,
    }));
  }
}
