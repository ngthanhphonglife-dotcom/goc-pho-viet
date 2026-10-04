/** Cấp uy tín (Phase 11): mốc điểm, tên cấp và những gì mở ra. */
export interface RepLevel { level: number; name: string; need: number; unlocks: string[] }

export const REP_LEVELS: RepLevel[] = [
  { level: 1, name: "Quán mới", need: 0, unlocks: ["Cà phê đen, Cà phê sữa, Trà tắc", "Khách ghé quán, học sinh"] },
  { level: 2, name: "Được biết đến", need: 30, unlocks: ["Món mới: Bạc xỉu", "Khách văn phòng bắt đầu ghé"] },
  { level: 3, name: "Quen thuộc", need: 80, unlocks: ["Món mới: Trà đào", "Shipper ghé mua mang đi"] },
  { level: 4, name: "Đông khách", need: 160, unlocks: ["Khách tip thêm 1.000đ mỗi ly Ngon trở lên"] },
  { level: 5, name: "Nổi tiếng khu phố", need: 280, unlocks: ["Khách tip thêm 2.000đ mỗi ly Ngon trở lên"] },
];
export const MAX_LEVEL = REP_LEVELS.length;

/** Cấp ứng với số điểm uy tín. */
export function levelOf(reputation: number): number {
  let lv = 1;
  for (const l of REP_LEVELS) if (reputation >= l.need) lv = l.level;
  return lv;
}

export const levelInfo = (level: number): RepLevel => REP_LEVELS[Math.min(MAX_LEVEL, Math.max(1, level)) - 1];

/** Cấp đang có = cấp cao nhất từng đạt (mất điểm không tụt cấp). */
export function currentLevel(s: { reputation: number; repLevel?: number }): number {
  return Math.max(s.repLevel ?? 1, levelOf(s.reputation));
}

/** Tiến độ tới cấp sau: 0–1, và số điểm còn thiếu (null nếu đã cấp cao nhất). */
export function progress(s: { reputation: number; repLevel?: number }): { ratio: number; missing: number | null; next: RepLevel | null } {
  const lv = currentLevel(s);
  if (lv >= MAX_LEVEL) return { ratio: 1, missing: null, next: null };
  const cur = levelInfo(lv), next = levelInfo(lv + 1);
  const ratio = Math.min(1, Math.max(0, (s.reputation - cur.need) / (next.need - cur.need)));
  return { ratio, missing: Math.max(0, next.need - s.reputation), next };
}

/** Tip thêm theo cấp cho ly Ngon trở lên. */
export const tipBonus = (level: number): number => (level >= 5 ? 2000 : level >= 4 ? 1000 : 0);

/** Loại khách ghé quán theo cấp. */
export function customerTypes(level: number): ("office" | "student" | "shipper" | "casual")[] {
  return level >= 3 ? ["casual", "student", "office", "shipper"] : level >= 2 ? ["casual", "student", "office"] : ["casual", "student"];
}
