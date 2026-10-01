// Trạng thái game hiển thị trên Master UI. Phase 0 dùng dữ liệu mẫu đúng ảnh Master;
// các phase sau (lịch, thời tiết, kinh tế, nhiệm vụ) sẽ cập nhật qua update().

export interface Quest {
  id: string;
  title: string;
  current: number;
  /** 0 = nhiệm vụ không đếm (chỉ có ô tick). */
  target: number;
  done: boolean;
  /** Đang theo dõi (ô xanh có dấu tick như ảnh Master). */
  tracked: boolean;
}

export interface Weather {
  label: string;
  temperatureC: number;
  icon: "sun" | "rain";
}

export interface GameStateData {
  day: number;
  /** Phút trong ngày (06:45 = 405). */
  minuteOfDay: number;
  weather: Weather;
  money: number;
  reputation: number;
  quests: Quest[];
}

const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

/** Ngày 1 là Thứ Hai (theo thiết kế Phase 1 bản Unity). */
export function weekdayOf(day: number): string {
  return WEEKDAYS[day % 7];
}

export function formatClock(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60) % 24;
  const m = minuteOfDay % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

/** 1250000 → "1.250.000đ" (dấu chấm ngăn nghìn theo cách viết Việt Nam). */
export function formatMoney(vnd: number): string {
  const sign = vnd < 0 ? "-" : "";
  const s = Math.abs(Math.round(vnd)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return sign + s + "đ";
}

export const DEMO_STATE: GameStateData = {
  day: 3,
  minuteOfDay: 6 * 60 + 45,
  weather: { label: "Nắng nhẹ", temperatureC: 28, icon: "sun" },
  money: 1_250_000,
  reputation: 35,
  quests: [
    { id: "sell-20-coffee", title: "Bán 20 ly cà phê", current: 8, target: 20, done: false, tracked: true },
    { id: "talk-chu-tu", title: "Nói chuyện với chú Tư sửa xe", current: 0, target: 0, done: false, tracked: false },
  ],
};

/** Ván mới (Phase 1): Ngày 1 · Thứ Hai · 06:00 · 1.000.000đ · Uy tín 0. */
export function newGameState(): GameStateData {
  return {
    day: 1,
    minuteOfDay: 6 * 60,
    weather: { label: "Nắng nhẹ", temperatureC: 27, icon: "sun" },
    money: 1_000_000,
    reputation: 0,
    quests: [
      { id: "sell-20-coffee", title: "Bán 20 ly cà phê", current: 0, target: 20, done: false, tracked: true },
      { id: "talk-chu-tu", title: "Nói chuyện với chú Tư sửa xe", current: 0, target: 0, done: false, tracked: false },
    ],
  };
}

type Listener = (s: Readonly<GameStateData>) => void;

export class GameState {
  private data: GameStateData;
  private listeners = new Set<Listener>();

  constructor(initial: GameStateData) {
    this.data = structuredClone(initial);
  }

  get value(): Readonly<GameStateData> {
    return this.data;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.data);
    return () => this.listeners.delete(fn);
  }

  /** Thay toàn bộ trạng thái (Chơi mới / Tiếp tục). */
  replace(data: GameStateData): void {
    this.data = structuredClone(data);
    for (const fn of this.listeners) fn(this.data);
  }

  update(patch: Partial<GameStateData> | ((d: GameStateData) => void)): void {
    if (typeof patch === "function") patch(this.data);
    else Object.assign(this.data, patch);
    for (const fn of this.listeners) fn(this.data);
  }
}
