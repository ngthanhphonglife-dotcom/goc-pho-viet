import { sfx } from "./Sfx";
import { VOICE_CLIPS } from "../data/voiceClips";

/**
 * Lồng tiếng nhân vật (tổng hợp, không thu âm người thật):
 *  - "babble": mỗi chữ thành một âm tiết ngắn, cao độ lên xuống theo ĐÚNG DẤU THANH tiếng Việt của chữ đó,
 *    âm sắc theo nguyên âm chính; mỗi nhân vật có giọng (cao độ, độ dày, tốc độ) riêng.
 *  - "tts" (mặc định): NÓI TIẾNG VIỆT THẬT. Máy có giọng đọc tiếng Việt → dùng giọng máy (tự nhiên hơn),
 *    chỉnh cao độ/tốc độ theo nhân vật. Máy không có → phát file giọng nói đã tạo sẵn trong game
 *    (public/voice, sinh bởi tools/voice/gen.py) — nên máy nào cũng nghe được tiếng nói, không rơi về líu lo.
 *  - "off": tắt.
 */
export type VoiceMode = "babble" | "tts" | "off";
export interface VoiceProfile { f0: number; type: OscillatorType; speed: number; ttsPitch: number; ttsRate: number }

const P = (f0: number, type: OscillatorType, speed: number, ttsPitch: number, ttsRate: number): VoiceProfile => ({ f0, type, speed, ttsPitch, ttsRate });
export const VOICES: Record<string, VoiceProfile> = {
  player: P(175, "triangle", 1, 1, 1),
  chutu: P(112, "sawtooth", 0.82, 0.55, 0.85),   // trầm, chậm rãi
  coba: P(215, "triangle", 0.95, 1.15, 0.95),    // ấm, tròn
  mai: P(300, "sine", 1.1, 1.5, 1.05),           // trong, nhanh
  lan: P(350, "sine", 1.15, 1.7, 1.1),
  nam: P(320, "triangle", 1.15, 1.6, 1.1),
  minh: P(190, "square", 1.3, 1, 1.25),          // gọn, nhanh
  hoang: P(150, "triangle", 1, 0.8, 1),
  kh_vp1: P(145, "triangle", 1.05, 0.8, 1.05), kh_vp2: P(250, "sine", 1.05, 1.3, 1.05),
  kh_hs1: P(330, "triangle", 1.2, 1.6, 1.15), kh_hs2: P(375, "sine", 1.2, 1.8, 1.15),
  kh_ship1: P(180, "square", 1.3, 0.95, 1.25), kh_ship2: P(200, "square", 1.3, 1.05, 1.25),
  kh_dl1: P(270, "sine", 1, 1.35, 1), kh_dl2: P(125, "sawtooth", 0.85, 0.6, 0.9), kh_dl3: P(230, "triangle", 0.9, 1.2, 0.92),
};
const DEFAULT = P(200, "triangle", 1, 1, 1);

// đường cao độ theo dấu thanh: [thời điểm 0–1, hệ số nhân với cao độ gốc]
const TONES: Record<string, [number, number][]> = {
  ngang: [[0, 1], [1, 1]],
  sac: [[0, 1], [1, 1.38]],
  huyen: [[0, 0.95], [1, 0.74]],
  hoi: [[0, 0.95], [0.5, 0.74], [1, 1.1]],
  nga: [[0, 1], [0.45, 0.86], [1, 1.42]],
  nang: [[0, 0.9], [1, 0.64]],
};
const MARKS: Record<string, string> = { "́": "sac", "̀": "huyen", "̉": "hoi", "̃": "nga", "̣": "nang" };
// formant thứ nhất theo nguyên âm chính
const FORMANT: Record<string, number> = { a: 820, e: 540, i: 320, y: 320, o: 520, u: 360 };

/** Phân tích một chữ: dấu thanh + nguyên âm chính. Trả về null nếu không có chữ cái. */
export function analyze(word: string): { tone: string; formant: number } | null {
  const d = word.toLowerCase().normalize("NFD");
  let tone = "ngang", vowel = "";
  for (const ch of d) {
    if (MARKS[ch]) tone = MARKS[ch];
    else if (!vowel && FORMANT[ch]) vowel = ch;
    else if (FORMANT[ch] && (ch === "a" || ch === "o" || ch === "e")) vowel = ch; // ưu tiên nguyên âm mở trong vần ghép
  }
  if (!/[a-zđ]/.test(d)) return null;
  return { tone, formant: FORMANT[vowel] ?? 500 };
}

/** Mã file giọng nói của một câu (FNV-1a 32 bit trên "<id>|<câu>") — khớp tools/voice/gen.py. */
export function clipKey(id: string, text: string): string {
  const s = id + "|" + text;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

export class Voice {
  /** Thư mục chứa file giọng nói. */
  base = import.meta.env.BASE_URL + "voice/";
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private current: AudioBufferSourceNode | null = null;
  private token = 0;

  mode: () => VoiceMode = () => "babble";
  volume: () => number = () => 0.8;
  /** Nhật ký: "babble:chutu:sac", "tts:coba", … — cho test. */
  readonly log: string[] = [];
  private viVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    const load = () => { this.viVoice = (window.speechSynthesis?.getVoices() ?? []).find((v) => v.lang.toLowerCase().startsWith("vi")) ?? null; };
    try { load(); window.speechSynthesis?.addEventListener?.("voiceschanged", load); } catch { /* không hỗ trợ */ }
  }

  /** Máy có giọng đọc tiếng Việt không. */
  get ttsAvailable(): boolean { return !!this.viVoice; }

  profile(id: string): VoiceProfile { return VOICES[id] ?? DEFAULT; }

  /** Một âm tiết (gọi khi chữ chạy tới đầu mỗi từ). Chỉ dùng ở chế độ babble. */
  syllable(id: string, word: string, when = 0): void {
    if (this.mode() !== "babble") return;
    const a = analyze(word);
    if (!a) return;
    const p = this.profile(id);
    this.log.push(`babble:${id}:${a.tone}`);
    if (this.log.length > 300) this.log.shift();
    const ctx = sfx.context;
    const v = this.volume();
    if (!ctx || ctx.state !== "running" || v <= 0) return;
    const t0 = ctx.currentTime + 0.01 + when;
    const dur = (a.tone === "nang" ? 0.09 : 0.14) / p.speed;
    const o = ctx.createOscillator();
    o.type = p.type;
    for (const [k, mult] of TONES[a.tone]) {
      if (k === 0) o.frequency.setValueAtTime(p.f0 * mult, t0);
      else o.frequency.linearRampToValueAtTime(p.f0 * mult, t0 + dur * k);
    }
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = a.formant;
    f.Q.value = 2.2;
    const g = ctx.createGain();
    const peak = v * (p.type === "sine" ? 0.5 : p.type === "triangle" ? 0.42 : 0.2);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
    g.gain.setValueAtTime(peak, t0 + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(f).connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  /** Nói cả câu ngay (không gắn với chữ chạy) — dùng cho khách gọi món. */
  say(id: string, text: string): void {
    if (this.mode() === "tts") { this.speak(id, text); return; }
    const p = this.profile(id);
    text.split(/\s+/).slice(0, 12).forEach((w, i) => this.syllable(id, w, (i * 0.15) / p.speed));
  }

  /** Câu này có file giọng nói sẵn trong game không. */
  hasClip(id: string, text: string): boolean { return clipKey(id, text) in VOICE_CLIPS; }

  private load(key: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(key);
    if (!p) {
      p = fetch(this.base + key + ".mp3").then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((b) => sfx.context!.decodeAudioData(b)).catch(() => { this.buffers.delete(key); return null; });
      this.buffers.set(key, p);
    }
    return p;
  }

  /** Phát file giọng nói có sẵn. */
  private playClip(key: string): void {
    const ctx = sfx.context;
    if (!ctx) return;
    const my = ++this.token;
    void this.load(key).then((buf) => {
      if (!buf || my !== this.token || this.mode() !== "tts") return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = Math.min(1, this.volume() * 1.15);
      src.connect(g).connect(ctx.destination);
      src.start();
      this.current = src;
      src.onended = () => { if (this.current === src) this.current = null; };
    });
  }

  /** Nói nguyên câu bằng tiếng Việt (chế độ tts): giọng máy nếu có, không thì file có sẵn. Trả về false nếu không nói được. */
  speak(id: string, text: string): boolean {
    if (this.mode() !== "tts") return false;
    const v = this.volume();
    const push = (s: string) => { this.log.push(s); if (this.log.length > 300) this.log.shift(); };
    if (!this.viVoice || !window.speechSynthesis) {
      const key = clipKey(id, text);
      if (!(key in VOICE_CLIPS)) { push("none:" + id); return false; }
      push("clip:" + id);
      this.stopClip();
      if (v > 0) this.playClip(key);
      return true;
    }
    push("tts:" + id);
    if (v <= 0) return false;
    try {
      const p = this.profile(id);
      const u = new SpeechSynthesisUtterance(text);
      try { u.voice = this.viVoice; } catch { /* vài trình duyệt từ chối gán — vẫn đọc theo u.lang */ }
      u.lang = this.viVoice.lang;
      u.pitch = Math.max(0, Math.min(2, p.ttsPitch));
      u.rate = p.ttsRate;
      u.volume = v;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      return true;
    } catch { return false; }
  }

  /**
   * iPhone/iPad chỉ cho máy đọc sau khi người chơi chạm màn hình → gọi trong sự kiện chạm đầu tiên
   * để "mở khoá" (đọc một câu rỗng, không nghe thấy gì).
   */
  prime(): void {
    if (this.primed || !window.speechSynthesis) return;
    this.primed = true;
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch { /* bỏ qua */ }
  }
  private primed = false;

  /** Ngừng giọng đọc máy (khi sang câu khác / đóng hội thoại). */
  hush(): void {
    this.stopClip();
    try { window.speechSynthesis?.cancel(); } catch { /* bỏ qua */ }
  }

  private stopClip(): void {
    this.token++;
    try { this.current?.stop(); } catch { /* đã dừng */ }
    this.current = null;
  }
}

export const voice = new Voice();
