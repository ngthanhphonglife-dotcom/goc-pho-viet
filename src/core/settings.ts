import type { SaveStore } from "./save";
import { LocalSaveStore } from "./save";

export interface Settings {
  /** 0–100 */
  music: number;
  /** 0–100 */
  sfx: number;
  vibration: boolean;
  /** Giọng nhân vật: nói tiếng Việt bằng giọng đọc của máy / líu lo theo dấu thanh / tắt. */
  voice: "babble" | "tts" | "off";
}

export const DEFAULT_SETTINGS: Settings = { music: 70, sfx: 80, vibration: true, voice: "tts" }; // mặc định nói tiếng Việt bằng giọng đọc của máy; máy không có thì tự dùng "líu lo"
const KEY = "gpv.settings";

function clamp(v: unknown, d: number): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : d;
}

/** Cài đặt người chơi; lưu ngay khi đổi. Phase âm thanh sau đọc music/sfx từ đây. */
export class SettingsService {
  private data: Settings;
  private listeners = new Set<(s: Settings) => void>();

  constructor(private store: SaveStore = new LocalSaveStore()) {
    let raw: Partial<Settings> = {};
    try { raw = JSON.parse(store.read(KEY) ?? "{}") ?? {}; } catch { raw = {}; }
    this.data = {
      music: clamp(raw.music, DEFAULT_SETTINGS.music),
      sfx: clamp(raw.sfx, DEFAULT_SETTINGS.sfx),
      vibration: typeof raw.vibration === "boolean" ? raw.vibration : DEFAULT_SETTINGS.vibration,
      voice: raw.voice === "tts" || raw.voice === "off" || raw.voice === "babble" ? raw.voice : DEFAULT_SETTINGS.voice,
    };
  }

  get value(): Readonly<Settings> {
    return this.data;
  }

  set(patch: Partial<Settings>): void {
    this.data = {
      music: clamp(patch.music ?? this.data.music, this.data.music),
      sfx: clamp(patch.sfx ?? this.data.sfx, this.data.sfx),
      vibration: patch.vibration ?? this.data.vibration,
      voice: patch.voice ?? this.data.voice,
    };
    try { this.store.write(KEY, JSON.stringify(this.data)); } catch (e) { console.warn("[Settings] Không lưu được", e); }
    for (const fn of this.listeners) fn(this.data);
  }

  subscribe(fn: (s: Settings) => void): () => void {
    this.listeners.add(fn);
    fn(this.data);
    return () => this.listeners.delete(fn);
  }

  /** Rung ngắn khi bấm (Android Chrome). iOS web không hỗ trợ — app sẽ dùng Haptics. */
  haptic(ms = 12): void {
    if (this.data.vibration && "vibrate" in navigator) {
      try { navigator.vibrate(ms); } catch { /* bỏ qua */ }
    }
  }
}
