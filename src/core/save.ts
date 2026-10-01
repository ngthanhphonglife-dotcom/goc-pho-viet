import type { GameStateData } from "./GameState";

/**
 * Lưu game. Giao diện SaveStore để sau này (app Capacitor) thay localStorage bằng Preferences/Filesystem
 * mà không đổi phần còn lại.
 */
export interface SaveStore {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

export class LocalSaveStore implements SaveStore {
  read(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  write(key: string, value: string): void {
    localStorage.setItem(key, value); // lỗi (đầy bộ nhớ, chế độ riêng tư) ném ra để SaveService báo
  }
  remove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* bỏ qua */ }
  }
}

/** Bộ nhớ tạm cho test/khi trình duyệt chặn lưu. */
export class MemorySaveStore implements SaveStore {
  private m = new Map<string, string>();
  read(key: string) { return this.m.has(key) ? this.m.get(key)! : null; }
  write(key: string, value: string) { this.m.set(key, value); }
  remove(key: string) { this.m.delete(key); }
}

export const SAVE_VERSION = 1;
const KEY = "gpv.save";
const BACKUP = "gpv.save.bak";

export interface SaveFile {
  version: number;
  savedAt: string;
  state: GameStateData;
}

export type LoadResult =
  | { status: "none" }
  | { status: "ok"; file: SaveFile; fromBackup: boolean }
  | { status: "corrupt" };

function isNum(v: unknown, min = -Infinity, max = Infinity): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
}

/** Kiểm tra cấu trúc save (không tin dữ liệu trong bộ nhớ trình duyệt). */
export function validate(raw: unknown): SaveFile | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Partial<SaveFile>;
  if (!isNum(f.version, 1, SAVE_VERSION) || typeof f.savedAt !== "string" || !f.state || typeof f.state !== "object") return null;
  const s = f.state as Partial<GameStateData>;
  if (!isNum(s.day, 1, 100000) || !isNum(s.minuteOfDay, 0, 1439) || !isNum(s.money, -1e12, 1e12) || !isNum(s.reputation, -1e6, 1e6)) return null;
  if (!s.weather || typeof s.weather.label !== "string" || !isNum(s.weather.temperatureC, -20, 60)) return null;
  if (!Array.isArray(s.quests)) return null;
  for (const q of s.quests) {
    if (!q || typeof q.id !== "string" || typeof q.title !== "string" || !isNum(q.current, 0) || !isNum(q.target, 0)) return null;
  }
  return f as SaveFile;
}

export class SaveService {
  lastError: string | null = null;

  constructor(private store: SaveStore = new LocalSaveStore()) {}

  private parse(text: string | null): SaveFile | null {
    if (text === null) return null;
    try { return validate(JSON.parse(text)); } catch { return null; }
  }

  hasSave(): boolean {
    return this.store.read(KEY) !== null || this.store.read(BACKUP) !== null;
  }

  load(): LoadResult {
    const main = this.store.read(KEY);
    const bak = this.store.read(BACKUP);
    if (main === null && bak === null) return { status: "none" };
    const m = this.parse(main);
    if (m) return { status: "ok", file: m, fromBackup: false };
    const b = this.parse(bak);
    if (b) {
      console.warn("[Save] Bản lưu chính bị lỗi, dùng bản dự phòng.");
      return { status: "ok", file: b, fromBackup: true };
    }
    return { status: "corrupt" };
  }

  /** Ghi save; bản cũ (nếu hợp lệ) được giữ làm dự phòng. Trả về false nếu không ghi được. */
  save(state: GameStateData): boolean {
    const file: SaveFile = { version: SAVE_VERSION, savedAt: new Date().toISOString(), state: structuredClone(state) };
    try {
      const prev = this.store.read(KEY);
      if (prev !== null && this.parse(prev)) this.store.write(BACKUP, prev);
      this.store.write(KEY, JSON.stringify(file));
      this.lastError = null;
      return true;
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e);
      console.warn("[Save] Không lưu được:", this.lastError);
      return false;
    }
  }

  clear(): void {
    this.store.remove(KEY);
    this.store.remove(BACKUP);
  }
}
