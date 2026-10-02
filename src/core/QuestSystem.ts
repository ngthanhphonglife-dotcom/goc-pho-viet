import type { GameState, Quest } from "./GameState";

/** Nhiệm vụ (Phase 6). Định nghĩa cố định ở đây; tiến độ nằm trong GameState (được lưu). */
export interface QuestStep { kind: "talk" | "visit"; id: string; label: string }
export interface QuestDef {
  id: string;
  title: string;
  giver: string;          // id nhân vật giao
  giverName: string;
  desc: string;
  /** Các việc cần làm (không tính thứ tự). Rỗng = nhiệm vụ đếm số (count). */
  steps: QuestStep[];
  /** Nhiệm vụ đếm: khoá sự kiện + số cần đạt. */
  count?: { key: string; target: number };
  reward: { money: number; reputation: number };
}

export const QUESTS: Record<string, QuestDef> = {
  "sell-20-coffee": {
    id: "sell-20-coffee", title: "Bán 20 ly cà phê", giver: "player", giverName: "Mục tiêu của quán",
    desc: "Bán đủ 20 ly cà phê cho bà con khu phố để quán có đà.", steps: [], count: { key: "sell-coffee", target: 20 },
    reward: { money: 100_000, reputation: 10 },
  },
  "talk-chu-tu": {
    id: "talk-chu-tu", title: "Nói chuyện với chú Tư sửa xe", giver: "chutu", giverName: "Chú Tư",
    desc: "Chú Tư sửa xe ngay cạnh quầy của bạn. Qua chào chú một tiếng.",
    steps: [{ kind: "talk", id: "chutu", label: "Nói chuyện với Chú Tư" }],
    reward: { money: 50_000, reputation: 5 },
  },
  "meet-neighbors": {
    id: "meet-neighbors", title: "Làm quen khu phố", giver: "chutu", giverName: "Chú Tư",
    desc: "Mới về phố thì đi chào bà con một vòng: cô Ba tạp hoá, bé Mai hay ngồi quán, rồi coi bảng tin đầu hẻm.",
    steps: [{ kind: "talk", id: "coba", label: "Chào Cô Ba" }, { kind: "talk", id: "mai", label: "Chào Mai" }, { kind: "visit", id: "board", label: "Xem Bảng tin khu phố" }],
    reward: { money: 30_000, reputation: 3 },
  },
  "walk-street": {
    id: "walk-street", title: "Dạo một vòng phố Hoa Sữa", giver: "coba", giverName: "Cô Ba",
    desc: "Cô Ba dặn đi cho biết phố: ghé nhà mình, ra trạm xe buýt, rồi coi lối ra bờ sông.",
    steps: [{ kind: "visit", id: "home", label: "Ghé Nhà của bạn" }, { kind: "visit", id: "bus", label: "Ra Trạm xe buýt" }, { kind: "visit", id: "river", label: "Xem biển Bờ sông" }],
    reward: { money: 40_000, reputation: 4 },
  },
};

export class QuestSystem {
  constructor(private state: GameState) {}

  def(id: string): QuestDef { return QUESTS[id]; }
  isActive(id: string): boolean { return this.state.value.quests.some((q) => q.id === id); }
  isDone(id: string): boolean { return (this.state.value.completed ?? []).includes(id); }
  /** Chưa nhận và chưa xong. */
  isNew(id: string): boolean { return !this.isActive(id) && !this.isDone(id); }
  flags(id: string): string[] { return this.state.value.questFlags?.[id] ?? []; }
  get active(): QuestDef[] { return this.state.value.quests.map((q) => QUESTS[q.id]).filter(Boolean); }
  get completed(): QuestDef[] { return (this.state.value.completed ?? []).map((id) => QUESTS[id]).filter(Boolean); }

  private row(d: QuestDef, current: number): Quest {
    const target = d.count ? d.count.target : d.steps.length > 1 ? d.steps.length : 0;
    return { id: d.id, title: d.title, current, target, done: false, tracked: !!d.count };
  }

  /** Nhận nhiệm vụ: đưa lên đầu danh sách để hiện trên HUD. */
  accept(id: string): void {
    if (!this.isNew(id)) return;
    this.state.update((s) => { s.quests = [this.row(QUESTS[id], 0), ...s.quests]; });
  }

  /**
   * Báo một sự kiện (nói chuyện / ghé thăm). Trả về các nhiệm vụ vừa đủ điều kiện hoàn thành
   * (chưa trao thưởng — gọi claim() sau khi người chơi bấm nhận).
   */
  event(kind: "talk" | "visit", id: string): QuestDef[] {
    const ready: QuestDef[] = [];
    this.state.update((s) => {
      for (const q of s.quests) {
        const d = QUESTS[q.id];
        if (!d) continue;
        const step = d.steps.find((st) => st.kind === kind && st.id === id);
        if (!step) continue;
        const key = kind + ":" + id;
        const flags = (s.questFlags ??= {});
        const list = (flags[q.id] ??= []);
        if (list.includes(key)) continue;
        list.push(key);
        q.current = d.steps.length > 1 ? list.length : 0;
        if (list.length >= d.steps.length) ready.push(d);
      }
    });
    return ready;
  }

  /** Cộng tiến độ cho nhiệm vụ đếm số (vd. bán cà phê). Trả về các nhiệm vụ vừa đủ. */
  count(key: string, n = 1): QuestDef[] {
    const ready: QuestDef[] = [];
    this.state.update((s) => {
      for (const q of s.quests) {
        const d = QUESTS[q.id];
        if (!d?.count || d.count.key !== key || q.current >= d.count.target) continue;
        q.current = Math.min(d.count.target, q.current + n);
        if (q.current >= d.count.target) ready.push(d);
      }
    });
    return ready;
  }

  /** Trao thưởng và chuyển nhiệm vụ sang "đã xong". */
  claim(id: string): void {
    const d = QUESTS[id];
    if (!d || !this.isActive(id)) return;
    this.state.update((s) => {
      s.quests = s.quests.filter((q) => q.id !== id);
      (s.completed ??= []).push(id);
      s.money += d.reward.money;
      s.reputation += d.reward.reputation;
    });
  }
}
