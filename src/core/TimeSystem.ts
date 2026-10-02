import type { GameState } from "./GameState";
import { forecast, slotOf, weatherAt, type WeatherKind } from "./weather";

/** Đồng hồ trong game (Phase 5): 1 phút game = 0,8 giây thật. Ngày chạy 06:00 → 24:00 rồi sang ngày mới. */
export const SECONDS_PER_MINUTE = 0.8;
export const DAY_START = 6 * 60;
export const DAY_END = 24 * 60;

export class TimeSystem {
  private acc = 0;
  private newDayHandlers: ((day: number) => void)[] = [];
  /** Ép thời tiết (test / sự kiện); null = theo dự báo. */
  forced: WeatherKind | null = null;

  constructor(private state: GameState) {}

  onNewDay(fn: (day: number) => void): void {
    this.newDayHandlers.push(fn);
  }

  get kind(): WeatherKind {
    const s = this.state.value;
    return this.forced ?? forecast(s.day)[slotOf(s.minuteOfDay)];
  }

  /** Trôi dt giây thật. */
  update(dt: number): void {
    this.acc += dt;
    if (this.acc < SECONDS_PER_MINUTE) return;
    const mins = Math.floor(this.acc / SECONDS_PER_MINUTE);
    this.acc -= mins * SECONDS_PER_MINUTE;
    this.advance(mins);
  }

  /** Trôi thêm `minutes` phút game. */
  advance(minutes: number): void {
    const s = this.state.value;
    let day = s.day, m = s.minuteOfDay + minutes, rolled = false;
    while (m >= DAY_END) { m = DAY_START + (m - DAY_END); day++; rolled = true; }
    if (rolled) this.forced = null;
    this.set(day, m);
    if (rolled) for (const fn of this.newDayHandlers) fn(day);
  }

  /** Đặt ngày giờ và cập nhật thời tiết theo dự báo. */
  set(day: number, minuteOfDay: number): void {
    this.state.patchQuiet({ day, minuteOfDay });
    this.sync();
  }

  /** Tính lại thời tiết hiển thị theo giờ hiện tại rồi báo cho UI. */
  sync(): void {
    const s = this.state.value;
    this.state.update({ weather: weatherAt(s.minuteOfDay, this.kind) });
  }
}
