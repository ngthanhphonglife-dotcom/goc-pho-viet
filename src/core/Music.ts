import { sfx } from "./Sfx";

/**
 * Nhạc nền chill (lo-fi) — soạn và phát trực tiếp bằng Web Audio, không dùng file nhạc nào (không vướng bản quyền).
 * Vòng hợp âm jazz nhẹ + đàn phím ấm + bass + trống nhẹ + giai điệu ngũ cung ngẫu hứng + tiếng lách tách đĩa than.
 * Đổi không khí theo buổi: sáng tươi hơn, tối chậm và trầm hơn, mưa bớt trống.
 */
export type Mood = "day" | "evening" | "night" | "rain";

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
// 8 ô nhịp: Dm9 | G13 | Cmaj9 | Am9 | Fmaj7 | Em7 | Dm7 | G7sus
const CHORDS: { root: number; notes: number[] }[] = [
  { root: 38, notes: [53, 57, 60, 64] }, { root: 43, notes: [53, 59, 62, 64] }, { root: 36, notes: [52, 55, 59, 62] }, { root: 45, notes: [52, 55, 60, 64] },
  { root: 41, notes: [53, 57, 60, 64] }, { root: 40, notes: [52, 55, 59, 62] }, { root: 38, notes: [53, 57, 60, 65] }, { root: 43, notes: [53, 57, 60, 62] },
];
const PENTA = [72, 74, 76, 79, 81, 84]; // Đô ngũ cung, quãng cao
const MOODS: Record<Mood, { bpm: number; cutoff: number; drums: number; melody: number }> = {
  day: { bpm: 76, cutoff: 1900, drums: 1, melody: 0.4 },
  evening: { bpm: 70, cutoff: 1500, drums: 0.8, melody: 0.32 },
  night: { bpm: 62, cutoff: 1000, drums: 0.35, melody: 0.2 },
  rain: { bpm: 66, cutoff: 1200, drums: 0.3, melody: 0.28 },
};

export class Music {
  /** Âm lượng 0–1 (Boot gắn với Cài đặt › Âm nhạc). */
  volume: () => number = () => 0.8;
  mood: Mood = "day";
  private wanted = false;
  private gain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer = 0;
  private nextTime = 0;
  private step = 0;        // nốt móc đơn thứ mấy (8 nốt mỗi ô)
  private seed = 20261003;
  private lastNote = 2;
  /** Số nốt đã lên lịch — cho test. */
  scheduled = 0;

  get state() {
    return { wanted: this.wanted, running: !!this.gain && sfx.context?.state === "running", mood: this.mood, bar: Math.floor(this.step / 8), scheduled: this.scheduled };
  }

  private rnd(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  /** Bật nhạc (thật sự phát khi trình duyệt đã cho phép âm thanh). */
  start(): void {
    this.wanted = true;
    if (!this.timer) this.timer = window.setInterval(() => this.pump(), 120);
  }

  stop(): void {
    this.wanted = false;
    window.clearInterval(this.timer);
    this.timer = 0;
    if (this.gain && sfx.context) this.gain.gain.setTargetAtTime(0, sfx.context.currentTime, 0.2);
  }

  private setup(ctx: AudioContext): void {
    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.filter.connect(this.gain).connect(ctx.destination);
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.nextTime = ctx.currentTime + 0.1;
  }

  /** Lên lịch trước ~0,4 giây nhạc mỗi lần gọi. */
  private pump(): void {
    const ctx = sfx.context;
    if (!ctx || ctx.state !== "running" || document.hidden) return;
    if (!this.gain) this.setup(ctx);
    const m = MOODS[this.mood];
    const vol = this.wanted ? this.volume() * 0.55 : 0;
    this.gain!.gain.setTargetAtTime(vol, ctx.currentTime, 0.4);
    this.filter!.frequency.setTargetAtTime(m.cutoff, ctx.currentTime, 1.5);
    if (vol <= 0) { this.nextTime = Math.max(this.nextTime, ctx.currentTime + 0.1); return; }
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05;
    const eighth = 60 / m.bpm / 2;
    while (this.nextTime < ctx.currentTime + 1.2) { // lên lịch trước 1,2 giây để máy giật nhẹ cũng không hụt nhạc
      this.playStep(ctx, this.nextTime, eighth, m);
      // swing nhẹ: nốt lẻ dài hơn nốt chẵn
      this.nextTime += eighth * (this.step % 2 === 0 ? 1.12 : 0.88);
      this.step++;
    }
  }

  private tone(ctx: AudioContext, t: number, freq: number, dur: number, vol: number, type: OscillatorType, detune = 0): void {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.filter!);
    o.start(t);
    o.stop(t + dur + 0.05);
    this.scheduled++;
  }

  private hit(ctx: AudioContext, t: number, dur: number, vol: number, type: BiquadFilterType, freq: number): void {
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.gain!); // trống không qua bộ lọc trầm
    s.start(t, this.rnd() * 0.5, dur + 0.02);
    this.scheduled++;
  }

  private playStep(ctx: AudioContext, t: number, eighth: number, m: (typeof MOODS)[Mood]): void {
    const pos = this.step % 8;
    const chord = CHORDS[Math.floor(this.step / 8) % CHORDS.length];
    if (pos === 0) {
      // rải hợp âm: đàn phím ấm (tam giác + sin), hơi lệch tông kiểu băng cũ
      chord.notes.forEach((n, i) => {
        const wob = (this.rnd() - 0.5) * 14;
        this.tone(ctx, t + i * 0.03, midi(n), eighth * 7.5, 0.085, "triangle", wob);
        this.tone(ctx, t + i * 0.03, midi(n + 12), eighth * 5, 0.022, "sine", wob);
      });
    }
    if (pos === 0 || pos === 5) this.tone(ctx, t, midi(chord.root), eighth * (pos === 0 ? 4 : 2.5), 0.2, "sine");
    // trống
    if (m.drums > 0.05) {
      if (pos === 0 || pos === 4 || (pos === 7 && this.rnd() < 0.3)) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.setValueAtTime(120, t);
        o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
        g.gain.setValueAtTime(0.32 * m.drums, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g).connect(this.gain!);
        o.start(t);
        o.stop(t + 0.22);
        this.scheduled++;
      }
      if (pos === 2 || pos === 6) this.hit(ctx, t, 0.09, 0.1 * m.drums, "bandpass", 1700);
      if (m.drums > 0.5) this.hit(ctx, t, 0.03, (pos % 2 ? 0.02 : 0.035) * m.drums, "highpass", 7000);
    }
    // giai điệu ngũ cung: bước gần nốt trước, thỉnh thoảng nghỉ
    if (pos !== 0 && this.rnd() < m.melody) {
      this.lastNote = Math.max(0, Math.min(PENTA.length - 1, this.lastNote + Math.round((this.rnd() - 0.5) * 3)));
      this.tone(ctx, t, midi(PENTA[this.lastNote]), eighth * (1.5 + this.rnd() * 2), 0.05, "sine", (this.rnd() - 0.5) * 10);
    }
    // lách tách đĩa than
    if (this.rnd() < 0.22) this.hit(ctx, t + this.rnd() * eighth, 0.012, 0.012 + this.rnd() * 0.012, "highpass", 3000);
  }
}

export const music = new Music();
