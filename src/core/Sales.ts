import type { Recipe } from "../data/items";
import type { WeatherKind } from "./weather";

/** Tính tiền + uy tín cho một lần bán (Phase 8) và tần suất khách. */
export type Mood = "happy" | "ok" | "meh";
export interface Sale { price: number; tip: number; reputation: number; mood: Mood }

/** quality 1–3; patience = phần kiên nhẫn còn lại 0–1. */
export function settle(r: Recipe, quality: number, patience: number): Sale {
  let tip = quality === 3 ? Math.max(2000, Math.round((r.price * 0.1) / 1000) * 1000) : 0;
  if (quality >= 2 && patience > 0.6) tip += 1000;
  const mood: Mood = quality === 3 || (quality === 2 && patience > 0.3) ? "happy" : quality === 2 || patience > 0.5 ? "ok" : "meh";
  return { price: r.price, tip, reputation: mood === "happy" ? 2 : mood === "ok" ? 1 : 0, mood };
}

export const LOST_REPUTATION = 2;

/** Số khách mỗi phút thật, theo giờ trong game, thời tiết và uy tín. */
export function customerRate(minute: number, kind: WeatherKind, reputation: number): number {
  const h = minute / 60;
  if (h >= 22 || h < 6) return 0;
  const base = h < 9 ? 3.2 : h < 11 ? 1.6 : h < 13 ? 3 : h < 17 ? 1.4 : h < 20 ? 3 : 1.6;
  const weather = { sunny: 1, cloudy: 0.9, lightRain: 0.6, heavyRain: 0.3 }[kind];
  return base * weather * (1 + Math.min(100, Math.max(0, reputation)) / 200);
}
