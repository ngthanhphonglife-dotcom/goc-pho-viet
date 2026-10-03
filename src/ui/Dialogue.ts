import type { Choice, Effect, Script } from "../data/dialogues";
import { sfx } from "../core/Sfx";
import { voice } from "../core/Voice";

/**
 * Khung hội thoại (Phase 6): chân dung + tên, chữ chạy từng ký tự, lựa chọn trả lời.
 * Chạm khung: đang chạy chữ → hiện hết; hết chữ → sang câu tiếp / đóng.
 */
const CPS = 45; // ký tự mỗi giây

export class Dialogue {
  readonly el: HTMLElement;
  private portrait: HTMLImageElement;
  private nameEl: HTMLElement;
  private textEl: HTMLElement;
  private hint: HTMLElement;
  private choicesEl: HTMLElement;
  private script: Script | null = null;
  private nodeId = "";
  private shown = 0;
  private timer = 0;
  private effects: Effect[] = [];
  private done: ((e: Effect[]) => void) | null = null;
  private speaker = { id: "", name: "" };
  /** Gọi khi nhân vật bắt đầu / ngừng nói (để làm động tác nói). */
  onSpeaking: (speaking: boolean) => void = () => {};

  constructor(host: HTMLElement, private artBase: string) {
    const mk = (tag: string, cls: string, parent: HTMLElement) => { const e = document.createElement(tag); e.className = cls; parent.appendChild(e); return e; };
    this.el = mk("div", "dialogue", host);
    this.el.dataset.name = "Dialogue";
    this.el.hidden = true;
    this.choicesEl = mk("div", "dlg-choices", this.el);
    const box = mk("div", "dlg-box", this.el);
    box.dataset.name = "DialogueBox";
    this.portrait = mk("img", "dlg-portrait", box) as HTMLImageElement;
    this.portrait.alt = "";
    this.nameEl = mk("div", "dlg-name", box);
    this.textEl = mk("p", "dlg-text", box);
    this.hint = mk("span", "dlg-hint", box);
    this.hint.textContent = "▼";
    this.el.addEventListener("click", (e) => { if (!(e.target as HTMLElement).closest(".dlg-choice")) this.advance(); });
  }

  get open(): boolean { return !this.el.hidden; }
  private get node() { return this.script!.nodes[this.nodeId]; }
  private get typing(): boolean { return this.open && this.shown < this.node.text.length; }

  /** Trạng thái hiện tại — cho test. */
  get state() {
    return this.open
      ? { open: true, speaker: this.nameEl.textContent ?? "", text: this.node.text, typing: this.typing, choices: this.typing ? [] : (this.node.choices ?? []).map((c) => c.text) }
      : { open: false, speaker: "", text: "", typing: false, choices: [] as string[] };
  }

  /** Chạy kịch bản; kết quả là các hiệu ứng (hoàn thành / giao nhiệm vụ / mở bảng) theo thứ tự xuất hiện. */
  run(speaker: { id: string; name: string }, script: Script): Promise<Effect[]> {
    this.speaker = speaker;
    this.script = script;
    this.effects = [];
    this.el.hidden = false;
    requestAnimationFrame(() => this.el.classList.add("open"));
    return new Promise((resolve) => {
      this.done = resolve;
      this.show(script.start);
    });
  }

  private show(id: string): void {
    this.nodeId = id;
    const n = this.node;
    const me = n.who === "me";
    this.portrait.src = this.artBase + "portrait_" + (me ? "player" : this.speaker.id) + ".svg";
    this.nameEl.textContent = me ? "Bạn" : this.speaker.name;
    this.el.classList.toggle("me", me);
    this.choicesEl.replaceChildren();
    this.shown = 0;
    this.textEl.textContent = "";
    this.hint.hidden = true;
    if (n.effects) this.effects.push(...n.effects);
    this.onSpeaking(!me);
    voice.hush();
    voice.speak(me ? "player" : this.speaker.id, n.text); // chế độ giọng máy: đọc nguyên câu
    window.clearInterval(this.timer);
    // chữ chạy theo thời gian thật (máy chậm vẫn đúng tốc độ, không bị ì)
    const t0 = performance.now();
    this.timer = window.setInterval(() => {
      const target = Math.min(n.text.length, Math.max(this.shown + 1, Math.floor(((performance.now() - t0) / 1000) * CPS)));
      for (let i = this.shown; i < target; i++) {
        // lồng tiếng: tới đầu mỗi từ thì phát một âm tiết theo giọng người đang nói
        if (voice.mode() === "babble") {
          if (i === 0 || n.text[i - 1] === " ") voice.syllable(me ? "player" : this.speaker.id, n.text.slice(i).split(" ")[0]);
        } else if (voice.mode() === "off" && i % 3 === 0 && n.text[i] !== " ") sfx.play("blip");
      }
      this.shown = target;
      this.textEl.textContent = n.text.slice(0, this.shown);
      if (this.shown >= n.text.length) this.finishTyping();
    }, 1000 / CPS);
  }

  private finishTyping(): void {
    window.clearInterval(this.timer);
    const n = this.node;
    this.shown = n.text.length;
    this.textEl.textContent = n.text;
    this.onSpeaking(false);
    if (n.choices?.length) {
      n.choices.forEach((c, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn dlg-choice";
        b.dataset.choice = String(i);
        b.textContent = c.text;
        b.addEventListener("click", () => this.choose(i));
        this.choicesEl.appendChild(b);
      });
    } else this.hint.hidden = false;
  }

  /** Chạm khung: hiện hết chữ, hoặc sang câu tiếp (nếu câu này không có lựa chọn). */
  advance(): void {
    if (!this.open) return;
    if (this.typing) { this.finishTyping(); return; }
    const n = this.node;
    if (n.choices?.length) return;
    if (n.goto) this.show(n.goto);
    else this.close();
  }

  choose(i: number): void {
    if (!this.open || this.typing) return;
    const c: Choice | undefined = this.node.choices?.[i];
    if (!c) return;
    if (c.effects) this.effects.push(...c.effects);
    if (c.goto) this.show(c.goto);
    else this.close();
  }

  close(): void {
    if (!this.open) return;
    window.clearInterval(this.timer);
    voice.hush();
    this.onSpeaking(false);
    this.el.classList.remove("open");
    this.el.hidden = true;
    const cb = this.done;
    this.done = null;
    cb?.(this.effects);
  }
}
