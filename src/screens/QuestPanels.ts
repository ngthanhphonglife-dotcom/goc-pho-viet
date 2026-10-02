import { formatMoney } from "../core/GameState";
import type { QuestDef, QuestSystem } from "../core/QuestSystem";
import { ICONS, button, el, img } from "./dom";
import { Modal } from "./screens";

const CHARS = import.meta.env.BASE_URL + "art/chars/";

function rewards(parent: HTMLElement, d: QuestDef): void {
  const row = el("div", "q-rewards", parent);
  el("span", "q-rlabel", row, "Phần thưởng:");
  const m = el("span", "q-reward", row);
  img(ICONS + "icon_money.svg", "icon", m);
  el("strong", "", m, "+" + formatMoney(d.reward.money));
  const r = el("span", "q-reward", row);
  img(ICONS + "icon_star.svg", "icon", r);
  el("strong", "", r, "+" + d.reward.reputation + " uy tín");
}

function steps(parent: HTMLElement, d: QuestDef, flags: string[], current = 0): void {
  const ul = el("ul", "q-steps", parent);
  if (d.count) { el("li", "", ul, `${d.title}: ${current}/${d.count.target}`); return; }
  for (const s of d.steps) {
    const li = el("li", flags.includes(s.kind + ":" + s.id) ? "ok" : "", ul);
    el("span", "tick", li, flags.includes(s.kind + ":" + s.id) ? "✓" : "");
    el("span", "", li, s.label);
  }
}

/** Bảng nhận nhiệm vụ: Nhận / Để sau. */
export class QuestOfferPanel extends Modal {
  constructor(host: HTMLElement) { super(host, "Nhiệm vụ mới", "QuestOffer"); }

  show(d: QuestDef): Promise<boolean> {
    this.body.replaceChildren();
    const head = el("div", "q-head", this.body);
    img(CHARS + "portrait_" + d.giver + ".svg", "q-portrait", head);
    const t = el("div", "", head);
    el("strong", "q-title", t, d.title);
    el("span", "q-giver", t, d.giverName + " nhờ bạn");
    el("p", "intro", this.body, d.desc);
    steps(this.body, d, []);
    rewards(this.body, d);
    return new Promise((resolve) => {
      let answered = false;
      const done = (v: boolean) => { if (answered) return; answered = true; this.onClose = null; this.close(); resolve(v); };
      const row = el("div", "modal-actions", this.body);
      button("", row, "Để sau", () => done(false)).dataset.panel = "later";
      button("primary", row, "Nhận nhiệm vụ", () => done(true)).dataset.panel = "accept";
      this.onClose = () => done(false);
      this.open();
    });
  }
}

/** Bảng hoàn thành nhiệm vụ: bấm nhận thưởng. */
export class QuestDonePanel extends Modal {
  constructor(host: HTMLElement) { super(host, "Hoàn thành nhiệm vụ!", "QuestDone"); }

  show(d: QuestDef): Promise<void> {
    this.body.replaceChildren();
    el("strong", "q-title center", this.body, d.title);
    rewards(this.body, d);
    return new Promise((resolve) => {
      let answered = false;
      const done = () => { if (answered) return; answered = true; this.onClose = null; this.close(); resolve(); };
      const row = el("div", "modal-actions", this.body);
      button("primary", row, "Nhận thưởng", done).dataset.panel = "claim";
      this.onClose = done;
      this.open();
    });
  }
}

/** Sổ nhiệm vụ: đang làm + đã xong. */
export class QuestLogPanel extends Modal {
  constructor(host: HTMLElement, private quests: QuestSystem, private currentOf: (id: string) => number) { super(host, "Sổ nhiệm vụ", "QuestLog"); }

  show(): void {
    this.body.replaceChildren();
    const list = el("div", "q-list", this.body);
    el("h3", "q-section", list, "Đang làm");
    const active = this.quests.active;
    if (!active.length) el("p", "note", list, "Chưa có nhiệm vụ nào. Hãy trò chuyện với hàng xóm!");
    for (const d of active) {
      const c = el("div", "q-card", list);
      c.dataset.quest = d.id;
      el("strong", "q-title", c, d.title);
      el("span", "q-giver", c, d.giverName);
      steps(c, d, this.quests.flags(d.id), this.currentOf(d.id));
      rewards(c, d);
    }
    const done = this.quests.completed;
    if (done.length) {
      el("h3", "q-section", list, `Đã xong (${done.length})`);
      for (const d of done) {
        const c = el("div", "q-card done", list);
        c.dataset.quest = d.id;
        el("strong", "q-title", c, "✓ " + d.title);
      }
    }
    const row = el("div", "modal-actions", this.body);
    button("primary", row, "Đóng", () => this.close()).dataset.panel = "close";
    this.open();
  }
}
