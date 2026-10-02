import type { Business } from "../core/Business";
import { formatMoney } from "../core/GameState";
import { INGREDIENTS, QUALITY, READY_MAX, RECIPES, type Recipe } from "../data/items";
import { button, el, img } from "./dom";
import { Modal } from "./screens";

const ITEMS = import.meta.env.BASE_URL + "art/items/";
const ing = (id: string) => INGREDIENTS.find((i) => i.id === id)!;

/** Kho nguyên liệu. */
export class IngredientsPanel extends Modal {
  constructor(host: HTMLElement, private biz: Business, private goShop: () => void) { super(host, "Nguyên liệu", "Ingredients"); }

  show(): void {
    this.body.replaceChildren();
    const grid = el("div", "inv-grid", this.body);
    for (const i of INGREDIENTS) {
      const st = this.biz.status(i.id);
      const c = el("div", "inv-cell " + st, grid);
      c.dataset.item = i.id;
      img(ITEMS + i.icon + ".svg", "inv-icon", c, i.name);
      el("strong", "inv-name", c, i.name);
      el("span", "inv-qty", c, `${this.biz.stock(i.id)} ${i.unit}`);
      if (st !== "ok") el("span", "inv-tag", c, st === "out" ? "Hết" : "Sắp hết");
    }
    const row = el("div", "modal-actions", this.body);
    button("primary", row, "Mua ở Tạp hoá Cô Ba", () => { this.close(); this.goShop(); }).dataset.panel = "shop";
    this.open();
  }
}

/** Thực đơn + khay ly pha sẵn. */
export class StallPanel extends Modal {
  constructor(host: HTMLElement, private biz: Business, private brew: (r: Recipe) => void) { super(host, "Quầy hàng", "Stall"); }

  show(): void {
    this.body.replaceChildren();
    const list = el("div", "menu-list", this.body);
    for (const r of RECIPES) {
      const n = this.biz.canMake(r);
      const c = el("div", "menu-card" + (r.locked ? " locked" : ""), list);
      c.dataset.recipe = r.id;
      img(ITEMS + r.icon + ".svg", "menu-icon", c, r.name);
      const t = el("div", "menu-info", c);
      const h = el("div", "menu-head", t);
      el("strong", "", h, r.name);
      el("span", "menu-price", h, formatMoney(r.price));
      el("span", "menu-needs", t, Object.entries(r.needs).map(([id, q]) => `${ing(id).name} ${q}${ing(id).unit === "viên" || ing(id).unit === "quả" || ing(id).unit === "cái" ? " " + ing(id).unit : ing(id).unit}`).join(" · "));
      if (r.locked) { el("span", "menu-lock", t, "🔒 " + r.locked); continue; }
      el("span", "menu-can" + (n ? "" : " none"), t, n ? `Còn pha được ${n} ly` : "Thiếu nguyên liệu");
      const b = button("primary", c, "Pha chế", () => { this.close(); this.brew(r); });
      b.dataset.brew = r.id;
      b.disabled = n < 1 || this.biz.readyFull;
    }
    const tray = el("div", "tray", this.body);
    tray.dataset.name = "ReadyTray";
    el("strong", "", tray, `Khay pha sẵn: ${this.biz.ready.length}/${READY_MAX}`);
    const chips = el("div", "tray-chips", tray);
    for (const c of this.biz.ready) {
      const chip = el("span", "tray-chip q" + c.quality, chips);
      img(ITEMS + this.biz.recipe(c.recipe).icon + ".svg", "", chip, this.biz.recipe(c.recipe).name);
      chip.title = QUALITY[c.quality];
    }
    if (this.biz.readyFull) el("p", "note", this.body, "Khay đã đầy. Bán bớt rồi pha tiếp nhé (bán hàng có ở phase sau).");
    else if (!this.biz.ready.length) el("p", "note", this.body, "Pha sẵn vài ly để khách tới là có ngay.");
    this.open();
  }
}

/** Minigame pha chế: mỗi bước bấm "Pha chế" khi kim ở vùng xanh. */
export class BrewPanel extends Modal {
  private recipe!: Recipe;
  private step = 0;
  private score = 0;
  private t0 = 0;
  private raf = 0;
  private marker!: HTMLElement;
  private stepsEl!: HTMLElement;
  private fill!: HTMLElement;
  private verdict!: HTMLElement;
  private resolve: ((q: number | null) => void) | null = null;
  /** Vị trí kim 0–1. Đặt debugPos để cố định kim (test). */
  pos = 0;
  debugPos: number | null = null;

  constructor(host: HTMLElement) { super(host, "Pha chế", "Brew"); }

  get state() { return { open: this.isOpen && !!this.resolve, step: this.step, steps: this.recipe?.steps.length ?? 0, score: this.score, pos: this.pos }; }

  /** Trả về chất lượng 1–3, hoặc null nếu huỷ. */
  show(r: Recipe): Promise<number | null> {
    this.recipe = r;
    this.step = 0;
    this.score = 0;
    this.body.replaceChildren();
    el("strong", "q-title center", this.body, r.name);
    const top = el("div", "brew-top", this.body);
    const cup = el("div", "brew-cup", top);
    img(ITEMS + "ing_cup.svg", "", cup);
    this.fill = el("div", "brew-fill", cup);
    img(ITEMS + r.icon + ".svg", "", this.fill);
    this.stepsEl = el("ol", "brew-steps", top);
    r.steps.forEach((s) => el("li", "", this.stepsEl, s.label));
    const bar = el("div", "brew-bar", this.body);
    el("i", "zone good", bar);
    el("i", "zone perfect", bar);
    this.marker = el("i", "brew-marker", bar);
    this.verdict = el("p", "brew-verdict", this.body, "Bấm khi kim ở vùng xanh!");
    const row = el("div", "modal-actions", this.body);
    button("", row, "Huỷ", () => this.close()).dataset.panel = "cancel";
    const go = button("primary", row, "Pha chế", () => this.hit());
    go.dataset.panel = "hit";
    this.render();
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.onClose = () => this.finish(null);
      this.t0 = performance.now();
      const loop = (now: number) => {
        if (!this.resolve) return;
        const period = this.recipe.steps[Math.min(this.step, this.recipe.steps.length - 1)].period;
        const ph = (((now - this.t0) / 1000) % period) / period;
        this.pos = this.debugPos ?? (ph < 0.5 ? ph * 2 : 2 - ph * 2); // chạy qua lại
        this.marker.style.left = this.pos * 100 + "%";
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
      this.open();
    });
  }

  private render(): void {
    [...this.stepsEl.children].forEach((li, i) => { li.className = i < this.step ? "ok" : i === this.step ? "now" : ""; });
    this.fill.style.clipPath = `inset(${100 - (this.step / this.recipe.steps.length) * 100}% 0 0 0)`;
  }

  /** Bấm "Pha chế" ở bước hiện tại. */
  hit(): void {
    if (!this.resolve || this.step >= this.recipe.steps.length) return;
    if (this.debugPos !== null) this.pos = this.debugPos;
    const d = Math.abs(this.pos - 0.5);
    const pts = d <= 0.09 ? 2 : d <= 0.24 ? 1 : 0;
    this.score += pts;
    this.verdict.textContent = pts === 2 ? "Chuẩn luôn!" : pts === 1 ? "Được đó." : "Hơi lệch tay…";
    this.verdict.dataset.pts = String(pts);
    this.step++;
    this.t0 = performance.now();
    this.render();
    if (this.step >= this.recipe.steps.length) {
      const ratio = this.score / (this.recipe.steps.length * 2);
      const q = ratio >= 0.75 ? 3 : ratio >= 0.4 ? 2 : 1;
      this.verdict.textContent = `${this.recipe.name}: ${QUALITY[q]}!`;
      window.setTimeout(() => this.finish(q), this.debugPos !== null ? 0 : 650);
    }
  }

  private finish(q: number | null): void {
    const r = this.resolve;
    if (!r) return;
    this.resolve = null;
    cancelAnimationFrame(this.raf);
    this.onClose = null;
    this.close();
    r(q);
  }
}
