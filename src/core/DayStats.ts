import type { GameStateData } from "./GameState";

/** Số liệu bán hàng trong ngày + lịch sử các ngày (Phase 10). */
export interface DayStats {
  cups: number; revenue: number; tips: number; happy: number; okay: number; lost: number;
  cost?: number;
  /** Số ly theo món: { den: 3, … } */
  byRecipe?: Record<string, number>;
  /** Số ly theo giờ: chỉ số 0 = 06:00–07:00 … 17 = 23:00–24:00 */
  byHour?: number[];
  /** Uy tín lúc bắt đầu ghi số liệu của ngày. */
  repStart?: number;
}
export interface DayRecord { day: number; revenue: number; tips: number; cost: number; profit: number; cups: number }
export const HISTORY_MAX = 7;
export const HOURS = 18;

/** Lấy (hoặc tạo) số liệu của ngày hôm nay. */
export function ensureToday(s: GameStateData): DayStats {
  const t = (s.today ??= { cups: 0, revenue: 0, tips: 0, happy: 0, okay: 0, lost: 0 });
  t.repStart ??= s.reputation;
  return t;
}

export interface Summary extends DayRecord {
  served: number; happy: number; okay: number; lost: number;
  /** % khách hài lòng trên tổng khách đã tới (0–100), null nếu chưa có khách. */
  satisfaction: number | null;
  repDelta: number;
  best: string | null;
  byHour: number[];
}

export function summarize(s: Readonly<GameStateData>): Summary {
  const t: DayStats = s.today ?? { cups: 0, revenue: 0, tips: 0, happy: 0, okay: 0, lost: 0 };
  const cost = t.cost ?? 0;
  const total = t.happy + t.okay + t.lost;
  let best: string | null = null;
  for (const [id, n] of Object.entries(t.byRecipe ?? {})) if (n > 0 && (!best || n > (t.byRecipe![best] ?? 0))) best = id;
  const byHour = Array.from({ length: HOURS }, (_, i) => t.byHour?.[i] ?? 0);
  return {
    day: s.day, revenue: t.revenue, tips: t.tips, cost, profit: t.revenue + t.tips - cost, cups: t.cups,
    served: t.happy + t.okay, happy: t.happy, okay: t.okay, lost: t.lost,
    satisfaction: total ? Math.round((t.happy / total) * 100) : null,
    repDelta: s.reputation - (t.repStart ?? s.reputation), best, byHour,
  };
}
