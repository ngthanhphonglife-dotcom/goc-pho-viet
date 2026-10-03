/**
 * Âm thanh hiệu ứng — tổng hợp trực tiếp bằng Web Audio (không dùng file âm thanh nào, không vướng bản quyền).
 * Âm lượng lấy từ Cài đặt › Hiệu ứng. Nhạc nền và âm môi trường đầy đủ thuộc Phase 19.
 */
export type SfxName = "tap" | "open" | "close" | "coin" | "perfect" | "good" | "miss" | "done" | "arrive" | "lost" | "quest" | "blip" | "newday" | "buy" | "error";

type Note = [freq: number, start: number, dur: number, type?: OscillatorType, vol?: number, slideTo?: number];

const SOUNDS: Record<SfxName, Note[]> = {
  tap: [[700, 0, 0.05, "sine", 0.5, 900]],
  open: [[440, 0, 0.09, "triangle", 0.45, 660]],
  close: [[520, 0, 0.08, "triangle", 0.4, 360]],
  coin: [[988, 0, 0.09, "sine", 0.6], [1319, 0.08, 0.22, "sine", 0.6]],
  buy: [[660, 0, 0.07, "triangle", 0.5], [880, 0.07, 0.07, "triangle", 0.5], [1319, 0.14, 0.2, "sine", 0.5]],
  perfect: [[880, 0, 0.08, "sine", 0.55], [1320, 0.06, 0.16, "sine", 0.55]],
  good: [[660, 0, 0.12, "sine", 0.5]],
  miss: [[220, 0, 0.16, "sawtooth", 0.3, 150]],
  done: [[523, 0, 0.1, "triangle", 0.5], [659, 0.1, 0.1, "triangle", 0.5], [784, 0.2, 0.22, "triangle", 0.55]],
  arrive: [[1175, 0, 0.25, "sine", 0.35], [1568, 0.12, 0.35, "sine", 0.3]],
  lost: [[400, 0, 0.18, "triangle", 0.45, 300], [300, 0.18, 0.3, "triangle", 0.4, 200]],
  quest: [[523, 0, 0.12, "triangle", 0.55], [659, 0.12, 0.12, "triangle", 0.55], [784, 0.24, 0.12, "triangle", 0.55], [1047, 0.36, 0.4, "triangle", 0.6]],
  blip: [[520, 0, 0.025, "square", 0.12]],
  newday: [[392, 0, 0.25, "sine", 0.45], [523, 0.22, 0.25, "sine", 0.45], [659, 0.44, 0.5, "sine", 0.5]],
  error: [[260, 0, 0.1, "square", 0.25], [200, 0.1, 0.16, "square", 0.25]],
};

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private rainLevel = 0;
  /** Âm lượng 0–1 (Boot gắn với Cài đặt). */
  volume: () => number = () => 0.8;
  /** Nhật ký các âm đã phát — cho test. */
  readonly log: string[] = [];

  /** Trình duyệt chỉ cho phát âm sau thao tác đầu tiên của người chơi → gọi trong sự kiện chạm. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch { /* thiết bị không hỗ trợ âm thanh → bỏ qua */ }
  }

  play(name: SfxName): void {
    const v = this.volume();
    this.log.push(v > 0 ? name : "muted:" + name);
    if (this.log.length > 200) this.log.shift();
    const ctx = this.ctx;
    if (v <= 0 || !ctx || !this.master || ctx.state !== "running") return;
    const t0 = ctx.currentTime + 0.005;
    for (const [freq, start, dur, type = "sine", vol = 0.5, slide] of SOUNDS[name]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0 + start);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + start + dur);
      g.gain.setValueAtTime(0.0001, t0 + start);
      g.gain.exponentialRampToValueAtTime(vol * v * 0.5, t0 + start + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      o.connect(g).connect(this.master);
      o.start(t0 + start);
      o.stop(t0 + start + dur + 0.02);
    }
  }

  /** Tiếng mưa nền (nhiễu trắng lọc) theo cường độ mưa 0–1. */
  setRain(level: number): void {
    const v = this.volume();
    const want = level * v;
    if (Math.abs(want - this.rainLevel) < 0.01) return;
    this.rainLevel = want;
    const ctx = this.ctx;
    if (!ctx || !this.master || ctx.state !== "running") return;
    if (!this.rainGain) {
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 2400;
      f.Q.value = 0.5;
      this.rainGain = ctx.createGain();
      this.rainGain.gain.value = 0;
      src.connect(f).connect(this.rainGain).connect(this.master);
      src.start();
    }
    this.rainGain.gain.setTargetAtTime(want * 0.12, ctx.currentTime, 0.6);
  }
}

/** Dùng chung toàn game. */
export const sfx = new Sfx();
