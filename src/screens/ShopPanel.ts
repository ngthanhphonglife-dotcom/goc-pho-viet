import type { Business } from "../core/Business";
import { formatMoney, type GameState } from "../core/GameState";
import { INGREDIENTS, PACKS, packPrice } from "../data/items";
import { button, el, img } from "./dom";
import { Modal } from "./screens";

const ITEMS = import.meta.env.BASE_URL + "art/items/";
const MAX_QTY = 20;

/** Bảng mua nguyên liệu ở Tạp hoá Cô Ba (Phase 9). */
export class ShopPanel extends Modal {
  private cart: Record<string, number> = {};
  private totalEl!: HTMLElement;
  private buyBtn!: HTMLButtonElement;
  private moneyEl!: HTMLElement;

  constructor(host: HTMLElement, private state: GameState, private biz: Business, private onBought: (total: number) => void) {
    super(host, "Tạp hoá Cô Ba", "Shop");
  }

  show(): void {
    this.cart = {};
    this.render();
    this.open();
  }

  private render(): void {
    const s = this.state.value;
    this.body.replaceChildren();
    this.moneyEl = el("p", "shop-money", this.body);
    const list = el("div", "shop-list", this.body);
    for (const p of PACKS) {
      const ing = INGREDIENTS.find((i) => i.id === p.id)!;
      const price = packPrice(p, s.day);
      const row = el("div", "shop-row", list);
      row.dataset.pack = p.id;
      img(ITEMS + ing.icon + ".svg", "shop-icon", row, ing.name);
      const info = el("div", "shop-info", row);
      el("strong", "", info, ing.name);
      const st = this.biz.status(p.id);
      el("span", "shop-have" + (st === "ok" ? "" : " low"), info, `${p.label} · còn ${this.biz.stock(p.id)} ${ing.unit}${st === "ok" ? "" : st === "out" ? " — hết" : " — sắp hết"}`);
      const pr = el("span", "shop-price" + (price > p.price ? " up" : price < p.price ? " down" : ""), info);
      pr.textContent = formatMoney(price) + (price > p.price ? " ▲" : price < p.price ? " ▼" : "");
      const qty = el("div", "shop-qty", row);
      const minus = button("", qty, "−", () => this.change(p.id, -1));
      minus.dataset.qty = "minus";
      minus.setAttribute("aria-label", "Bớt " + ing.name);
      el("output", "", qty, "0").dataset.qty = "value";
      const plus = button("", qty, "+", () => this.change(p.id, 1));
      plus.dataset.qty = "plus";
      plus.setAttribute("aria-label", "Thêm " + ing.name);
    }
    const foot = el("div", "shop-foot", this.body);
    this.totalEl = el("strong", "shop-total", foot);
    this.buyBtn = button("primary", foot, "Mua hàng", () => this.buy());
    this.buyBtn.dataset.panel = "buy";
    el("p", "note", this.body, "Giá đổi mỗi ngày (▲ tăng, ▼ giảm). Chỉ dùng tiền trong game.");
    this.refresh();
  }

  private change(id: string, d: number): void {
    this.cart[id] = Math.max(0, Math.min(MAX_QTY, (this.cart[id] ?? 0) + d));
    this.refresh();
  }

  private refresh(): void {
    const money = this.state.value.money;
    const total = this.biz.cartTotal(this.cart);
    for (const p of PACKS) {
      const out = this.body.querySelector<HTMLElement>(`[data-pack="${p.id}"] [data-qty="value"]`);
      if (out) out.textContent = String(this.cart[p.id] ?? 0);
    }
    this.moneyEl.textContent = "Tiền của bạn: " + formatMoney(money);
    this.totalEl.textContent = "Tổng: " + formatMoney(total);
    this.totalEl.classList.toggle("over", total > money);
    this.buyBtn.disabled = total <= 0 || total > money;
    this.buyBtn.querySelector(".t")!.textContent = total > money ? "Không đủ tiền" : "Mua hàng";
  }

  /** Giỏ hiện tại — cho test. */
  get state_() { return { cart: { ...this.cart }, total: this.biz.cartTotal(this.cart) }; }

  private buy(): void {
    const total = this.biz.buy(this.cart);
    if (!total) return;
    this.cart = {};
    this.onBought(total);
    this.render();
  }
}
