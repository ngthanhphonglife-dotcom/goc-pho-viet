import { RECIPES } from "../data/items";
import type { GameState, GameStateData } from "./GameState";
import { currentLevel } from "./Reputation";

/** Nhiệm vụ hằng ngày (Phase 11): mỗi ngày 3 việc, cố định theo số ngày + cấp uy tín lúc tạo. */
export interface DailyQuest { id: string; title: string; key: string; target: number; current: number; money: number; reputation: number; claimed: boolean }
export interface DailyState { day: number; items: DailyQuest[] }

function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), t | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}

/** Bộ 3 nhiệm vụ của một ngày. */
export function makeDaily(day: number, level: number): DailyQuest[] {
  const r = rng(day * 7919 + 13);
  const open = RECIPES.filter((x) => (x.level ?? 1) <= level);
  const rec = open[Math.floor(r() * open.length)];
  const pool: DailyQuest[] = [
    { id: "d-cups", title: `Bán ${6 + level * 2} ly nước`, key: "sell-any", target: 6 + level * 2, current: 0, money: 20_000, reputation: 1, claimed: false },
    { id: "d-happy", title: `Làm hài lòng ${4 + level * 2} khách`, key: "happy", target: 4 + level * 2, current: 0, money: 25_000, reputation: 2, claimed: false },
    { id: "d-revenue", title: `Thu ${150 * level}.000đ tiền bán hàng`, key: "revenue", target: 150_000 * level, current: 0, money: 30_000, reputation: 1, claimed: false },
    { id: "d-" + rec.id, title: `Bán ${3 + level} ly ${rec.name}`, key: "sell:" + rec.id, target: 3 + level, current: 0, money: 20_000, reputation: 1, claimed: false },
  ];
  pool.splice(Math.floor(r() * pool.length), 1); // bỏ ngẫu nhiên một việc → còn 3
  return pool;
}

export class Daily {
  constructor(private state: GameState) {}

  /** Bộ nhiệm vụ của hôm nay (tạo mới khi sang ngày). */
  get items(): DailyQuest[] {
    const s = this.state.value;
    if (!s.daily || s.daily.day !== s.day) this.state.patchQuiet({ daily: { day: s.day, items: makeDaily(s.day, currentLevel(s)) } });
    return this.state.value.daily!.items;
  }

  /** Cộng tiến độ. Trả về các nhiệm vụ vừa đủ. */
  count(key: string, n = 1): DailyQuest[] {
    const done: DailyQuest[] = [];
    const items = this.items;
    this.state.update(() => {
      for (const q of items) {
        if (q.key !== key || q.current >= q.target) continue;
        q.current = Math.min(q.target, q.current + n);
        if (q.current >= q.target) done.push(q);
      }
    });
    return done;
  }

  /** Số nhiệm vụ đã đủ nhưng chưa nhận thưởng. */
  get claimable(): number { return this.items.filter((q) => q.current >= q.target && !q.claimed).length; }

  /** Nhận thưởng một nhiệm vụ (chỉ một lần). */
  claim(id: string): DailyQuest | null {
    const q = this.items.find((x) => x.id === id);
    if (!q || q.claimed || q.current < q.target) return null;
    this.state.update((s: GameStateData) => { q.claimed = true; s.money += q.money; s.reputation += q.reputation; });
    return q;
  }
}
