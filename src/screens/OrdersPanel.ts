import type { Business } from "../core/Business";
import { formatMoney } from "../core/GameState";
import { TYPES, type Customers } from "../world/Customers";
import { button, el, img } from "./dom";
import { Modal } from "./screens";

const ITEMS = import.meta.env.BASE_URL + "art/items/";
const CHARS = import.meta.env.BASE_URL + "art/chars/";

export interface OrderActions { ready(uid: number): void; brew(uid: number): void; dismiss(uid: number): void }

/** Bảng Đơn hàng (Phase 8): khách đang chờ; khách đầu hàng có nút giao ly / pha ngay / hết món. */
export class OrdersPanel extends Modal {
  private timer = 0;
  private sig = "";

  constructor(host: HTMLElement, private customers: Customers, private biz: Business, private actions: OrderActions) {
    super(host, "Đơn hàng", "Orders");
  }

  show(): void {
    this.sig = "";
    this.render();
    window.clearInterval(this.timer);
    this.timer = window.setInterval(() => { if (this.isOpen) this.render(); else window.clearInterval(this.timer); }, 300);
    this.open();
  }

  /** Vẽ lại nếu danh sách đổi; nếu không chỉ cập nhật thanh kiên nhẫn. */
  render(): void {
    const q = this.customers.queue;
    const front = this.customers.front;
    const sig = q.map((c) => c.uid + c.state).join(",") + "|" + (front?.uid ?? 0) + "|" + this.biz.ready.length + "|" + (front ? this.biz.canMake(this.biz.recipe(front.recipe)) : 0);
    if (sig === this.sig) {
      for (const c of q) {
        const bar = this.body.querySelector<HTMLElement>(`[data-order="${c.uid}"] .ord-bar i`);
        if (bar) bar.style.width = Math.max(0, (c.patience / c.max) * 100).toFixed(0) + "%";
      }
      return;
    }
    this.sig = sig;
    this.body.replaceChildren();
    el("p", "ord-count", this.body, q.length ? `${q.length} khách đang ghé quán` : "Chưa có khách. Pha sẵn vài ly trong lúc chờ nhé!");
    const list = el("div", "ord-list", this.body);
    q.forEach((c, i) => {
      const r = this.biz.recipe(c.recipe);
      const isFront = front === c;
      const row = el("div", "ord-row" + (isFront ? " front" : "") + (c.state === "arriving" ? " coming" : ""), list);
      row.dataset.order = String(c.uid);
      img(CHARS + "portrait_" + c.look + ".svg", "ord-face", row);
      const info = el("div", "ord-info", row);
      const head = el("div", "ord-head", info);
      el("strong", "", head, `${i + 1}. ${TYPES[c.type].name}`);
      el("span", "ord-price", head, formatMoney(r.price));
      const drink = el("div", "ord-drink", info);
      img(ITEMS + r.icon + ".svg", "", drink);
      el("span", "", drink, r.name + (c.state === "arriving" ? " · đang tới…" : ""));
      const bar = el("div", "ord-bar", info);
      el("i", "", bar).style.width = Math.max(0, (c.patience / c.max) * 100).toFixed(0) + "%";
      if (isFront) {
        const acts = el("div", "ord-actions", row);
        const has = this.biz.ready.some((x) => x.recipe === c.recipe);
        const can = this.biz.canMake(r) > 0;
        const b1 = button("primary", acts, "Giao ly pha sẵn", () => this.actions.ready(c.uid));
        b1.dataset.serve = "ready";
        b1.disabled = !has;
        const b2 = button("primary", acts, can ? "Pha ngay" : "Thiếu nguyên liệu", () => this.actions.brew(c.uid));
        b2.dataset.serve = "brew";
        b2.disabled = !can;
        button("", acts, "Hết món", () => this.actions.dismiss(c.uid)).dataset.serve = "dismiss";
      }
    });
    const row = el("div", "modal-actions", this.body);
    button("", row, "Đóng", () => this.close()).dataset.panel = "close";
  }
}
