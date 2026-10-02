import type { Weather } from "./GameState";

/** Thời tiết (Phase 5): mỗi ngày 3 buổi, dự báo cố định theo số ngày (cùng ngày luôn cùng thời tiết). */
export type WeatherKind = "sunny" | "cloudy" | "lightRain" | "heavyRain";

export const SLOTS = [
  { name: "Sáng", from: 6 * 60, to: 12 * 60 },
  { name: "Chiều", from: 12 * 60, to: 17 * 60 },
  { name: "Tối", from: 17 * 60, to: 24 * 60 },
] as const;

export const KIND_LABEL: Record<WeatherKind, string> = { sunny: "Nắng nhẹ", cloudy: "Nhiều mây", lightRain: "Mưa nhẹ", heavyRain: "Mưa lớn" };
export const KIND_NOTE: Record<WeatherKind, string> = {
  sunny: "Trời đẹp, khách ra đường nhiều.",
  cloudy: "Trời mát, dễ chịu.",
  lightRain: "Mưa lâm râm, khách thích đồ nóng.",
  heavyRain: "Mưa to, ít khách ngoài đường.",
};

function rng(seed: number): number {
  // mulberry32: số ngẫu nhiên cố định theo seed
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Dự báo 3 buổi của một ngày. Ngày 1 nắng suốt để người mới làm quen. */
export function forecast(day: number): [WeatherKind, WeatherKind, WeatherKind] {
  if (day <= 1) return ["sunny", "sunny", "sunny"];
  const out: WeatherKind[] = [];
  for (let s = 0; s < 3; s++) {
    const r = rng(day * 7919 + s * 104729);
    // buổi sáng luôn nắng hoặc mây (mưa hay rơi vào chiều/tối)
    if (s === 0) out.push(r < 0.72 ? "sunny" : "cloudy");
    else out.push(r < 0.5 ? "sunny" : r < 0.75 ? "cloudy" : r < 0.9 ? "lightRain" : "heavyRain");
  }
  return out as [WeatherKind, WeatherKind, WeatherKind];
}

export function slotOf(minute: number): number {
  return minute < SLOTS[1].from ? 0 : minute < SLOTS[2].from ? 1 : 2;
}

export function isNight(minute: number): boolean {
  return minute >= 18 * 60 + 30 || minute < 5 * 60 + 30;
}

/** Nhiệt độ theo giờ (26° sáng sớm → 33° đầu chiều → 27° đêm), trừ khi mây/mưa. */
export function temperature(minute: number, kind: WeatherKind): number {
  const h = minute / 60;
  const base = h <= 13.5 ? 26 + ((h - 6) / 7.5) * 7 : 33 - ((h - 13.5) / 10.5) * 7;
  const off = { sunny: 0, cloudy: -2, lightRain: -4, heavyRain: -6 }[kind];
  return Math.round(base + off);
}

export function iconOf(kind: WeatherKind, minute: number): Weather["icon"] {
  if (kind === "lightRain" || kind === "heavyRain") return "rain";
  if (kind === "cloudy") return "cloud";
  return isNight(minute) ? "moon" : "sun";
}

/** Thời tiết hiển thị trên HUD tại một thời điểm. */
export function weatherAt(minute: number, kind: WeatherKind): Weather {
  const label = kind === "sunny" && isNight(minute) ? "Đêm trong" : KIND_LABEL[kind];
  return { label, temperatureC: temperature(minute, kind), icon: iconOf(kind, minute), kind };
}
