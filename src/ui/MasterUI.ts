import { ACTIONS, type ActionId } from "../core/actions";
import { formatClock, formatMoney, weekdayOf, type GameState, type GameStateData } from "../core/GameState";

const ICON_BASE = import.meta.env.BASE_URL + "art/icons/";

type Handler = (id: ActionId) => boolean | void;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, parent?: HTMLElement, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

function icon(name: string, parent: HTMLElement, alt = ""): HTMLImageElement {
  const img = el("img", "icon", parent);
  img.src = ICON_BASE + name + ".svg";
  img.alt = alt;
  img.draggable = false;
  img.decoding = "async";
  return img;
}

/**
 * Master UI (Phase 0): TopHUD, QuestPanel, RightActionMenu, BottomNavigation, popup placeholder, toast.
 * DOM + CSS + SVG → luôn sắc nét. Dữ liệu lấy từ GameState; nút phát sự kiện qua onAction().
 */
export class MasterUI {
  readonly root: HTMLElement;
  readonly buttons = new Map<ActionId, HTMLButtonElement>();
  private handlers: Handler[] = [];
  private refs!: {
    day: HTMLElement; weekday: HTMLElement; clock: HTMLElement;
    weatherIcon: HTMLImageElement; weatherLabel: HTMLElement; weatherTemp: HTMLElement;
    money: HTMLElement; reputation: HTMLElement; quests: HTMLElement;
  };
  private overlay!: HTMLElement;
  private popup!: { title: HTMLElement; icon: HTMLImageElement; tag: HTMLElement; body: HTMLElement; close: HTMLButtonElement; x: HTMLButtonElement };
  private toastEl!: HTMLElement;
  private toastTimer = 0;
  private lastFocus: HTMLElement | null = null;
  openAction: ActionId | null = null;

  constructor(host: HTMLElement, readonly state: GameState) {
    this.root = el("div", "safe-area", host);
    this.root.dataset.name = "SafeArea";
    this.buildTopHud();
    this.buildQuestPanel();
    this.buildRightMenu();
    this.buildBottomNav();
    this.buildPopup(host);
    this.toastEl = el("div", "toast", this.root);
    this.toastEl.setAttribute("role", "status");
    state.subscribe((s) => this.render(s));
  }

  /** Phase sau đăng ký xử lý nút. Trả về true = đã xử lý, không mở popup placeholder. */
  onAction(fn: Handler): void {
    this.handlers.push(fn);
  }

  invoke(id: ActionId): void {
    for (const h of this.handlers) if (h(id) === true) return;
    this.showPlaceholder(id);
  }

  // ------------------------------------------------------------------ build

  private button(id: ActionId, cls: string, parent: HTMLElement): HTMLButtonElement {
    const b = el("button", "btn " + cls, parent);
    b.type = "button";
    b.dataset.action = id;
    b.setAttribute("aria-label", ACTIONS[id].label);
    b.addEventListener("click", () => this.invoke(id));
    // hiệu ứng nhấn cho cảm ứng (iOS không luôn bật :active)
    b.addEventListener("pointerdown", () => b.classList.add("pressed"));
    for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, () => b.classList.remove("pressed"));
    this.buttons.set(id, b);
    return b;
  }

  private buildTopHud(): void {
    const top = el("div", "top-hud", this.root);
    top.dataset.name = "TopHUD";

    const cal = el("div", "panel calendar", top);
    cal.dataset.name = "CalendarPanel";
    for (const left of ["27%", "73%"]) {
      const r = el("i", "ring", cal);
      r.style.left = `calc(${left} - 9 * var(--u))`;
    }
    const head = el("div", "head fit", cal);
    const day = el("span", "", head);
    const weekday = el("div", "weekday fit", cal);
    const clock = el("div", "clock fit", cal);

    const weather = this.button("weather", "panel weather", top);
    weather.dataset.name = "WeatherPanel";
    const wIcon = icon("icon_weather_sun", weather);
    const wt = el("div", "txt", weather);
    const wLabel = el("div", "label fit", wt);
    const wTemp = el("div", "temp fit", wt);

    const money = el("div", "panel pill money", top);
    money.dataset.name = "MoneyPanel";
    icon("icon_money", money);
    const mVal = el("div", "value fit", money);
    const add = this.button("addMoney", "add-money", money);
    add.textContent = "+";

    const rep = el("div", "panel pill reputation", top);
    rep.dataset.name = "ReputationPanel";
    icon("icon_star", rep, "Uy tín");
    const rVal = el("div", "value fit", rep);

    const set = this.button("settings", "settings-btn", top);
    set.dataset.name = "SettingsButton";
    icon("icon_settings", set);

    const quest = el("div", "panel quest", this.root);
    quest.dataset.name = "QuestPanel";
    const ring = el("i", "ring", quest);
    ring.style.left = "calc(36 * var(--u))";
    const qt = el("div", "title", quest);
    icon("icon_quest_scroll", qt);
    el("span", "fit", qt, "Nhiệm vụ chính");
    const rows = el("div", "", quest);

    this.refs = { day, weekday, clock, weatherIcon: wIcon, weatherLabel: wLabel, weatherTemp: wTemp, money: mVal, reputation: rVal, quests: rows };
  }

  private buildQuestPanel(): void {
    /* nội dung dòng nhiệm vụ dựng trong render() theo GameState */
  }

  private buildRightMenu(): void {
    const menu = el("nav", "right-menu", this.root);
    menu.dataset.name = "RightActionMenu";
    menu.setAttribute("aria-label", "Menu phải");
    (["map", "quests", "inventory", "shop"] as ActionId[]).forEach((id, i) => {
      const b = this.button(id, "rbtn", menu);
      b.style.top = `calc(${8 + i * 176} * var(--u))`;
      icon(ACTIONS[id].icon, b);
      el("span", "lbl fit", b, ACTIONS[id].label);
    });
  }

  private buildBottomNav(): void {
    const nav = el("nav", "panel bottom-nav", this.root);
    nav.dataset.name = "BottomNavigation";
    nav.setAttribute("aria-label", "Thanh điều hướng");
    for (const x of [18.5, 81.5]) {
      const d = el("i", "divider", nav);
      d.style.left = x + "%";
    }
    const slots: [ActionId, number, number][] = [["stall", 1, 18], ["ingredients", 19, 36], ["upgrade", 64, 81], ["decorate", 82, 99]];
    for (const [id, x0, x1] of slots) {
      const b = this.button(id, "nbtn", nav);
      b.style.left = x0 + "%";
      b.style.width = x1 - x0 + "%";
      icon(ACTIONS[id].icon, b);
      el("span", "lbl fit", b, ACTIONS[id].label);
    }
    const sell = this.button("sell", "sell-btn", nav);
    sell.dataset.name = "SellButton";
    icon("icon_sell", sell);
    el("span", "lbl fit", sell, "Bán hàng");
  }

  private buildPopup(host: HTMLElement): void {
    const ov = el("div", "overlay", host);
    ov.hidden = true;
    ov.dataset.name = "PlaceholderPanel";
    ov.addEventListener("click", (e) => { if (e.target === ov) this.closePlaceholder(); });
    const card = el("div", "card", ov);
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    const head = el("div", "head", card);
    const title = el("span", "fit", head);
    title.id = "popup-title";
    card.setAttribute("aria-labelledby", "popup-title");
    const x = el("button", "btn x", head, "X");
    x.type = "button";
    x.setAttribute("aria-label", "Đóng");
    x.addEventListener("click", () => this.closePlaceholder());
    const big = el("div", "big", card);
    const ic = icon("icon_map", big);
    const tag = el("div", "tag", card);
    const body = el("div", "body", card);
    el("div", "note", card, "Tính năng đang được xây dựng");
    const close = el("button", "btn close", card, "Đóng");
    close.type = "button";
    close.addEventListener("click", () => this.closePlaceholder());
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !ov.hidden) this.closePlaceholder(); });
    this.overlay = ov;
    this.popup = { title, icon: ic, tag, body, close, x };
  }

  // ------------------------------------------------------------------ popup / toast

  showPlaceholder(id: ActionId): void {
    const a = ACTIONS[id];
    this.openAction = id;
    this.popup.title.textContent = a.title;
    this.popup.icon.src = ICON_BASE + a.icon + ".svg";
    this.popup.tag.textContent = "Sẽ có ở " + a.phase;
    this.popup.body.textContent = a.description;
    this.lastFocus = document.activeElement as HTMLElement | null;
    this.overlay.hidden = false;
    requestAnimationFrame(() => this.overlay.classList.add("open"));
    this.popup.close.focus({ preventScroll: true });
  }

  closePlaceholder(): void {
    if (this.overlay.hidden) return;
    this.openAction = null;
    this.overlay.classList.remove("open");
    window.setTimeout(() => { if (!this.overlay.classList.contains("open")) this.overlay.hidden = true; }, 180);
    this.lastFocus?.focus?.({ preventScroll: true });
  }

  get placeholderOpen(): boolean {
    return !this.overlay.hidden && this.openAction !== null;
  }

  get placeholderTitle(): string {
    return this.popup.title.textContent ?? "";
  }

  toast(message: string, ms = 1800): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.add("show");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove("show"), ms);
  }

  // ------------------------------------------------------------------ render

  private render(s: Readonly<GameStateData>): void {
    const r = this.refs;
    r.day.textContent = "Ngày " + s.day;
    r.weekday.textContent = weekdayOf(s.day);
    r.clock.textContent = formatClock(s.minuteOfDay);
    r.weatherIcon.src = ICON_BASE + (s.weather.icon === "rain" ? "icon_weather_rain" : "icon_weather_sun") + ".svg";
    r.weatherIcon.alt = s.weather.label;
    r.weatherLabel.textContent = s.weather.label;
    r.weatherTemp.textContent = s.weather.temperatureC + "°C";
    r.money.textContent = formatMoney(s.money);
    r.reputation.textContent = String(s.reputation);

    r.quests.replaceChildren();
    s.quests.slice(0, 2).forEach((q, i) => {
      const counted = q.target > 0;
      const checked = q.done || q.tracked || (counted && q.current >= q.target);
      const row = el("div", "qrow" + (counted ? "" : " no-count") + (checked ? " done" : ""), r.quests);
      row.style.top = `calc(${i === 0 ? 72 : 146} * var(--u))`;
      row.dataset.quest = q.id;
      const box = el("span", "box", row);
      icon("icon_check", box);
      el("span", "qtitle fit", row, q.title);
      if (counted) {
        el("span", "qprog", row, `${Math.min(q.current, q.target)}/${q.target}`);
        const bar = el("span", "bar", row);
        const fill = el("i", "", bar);
        fill.style.width = (100 * Math.min(1, q.current / q.target)).toFixed(1) + "%";
      }
    });
    fitTexts(this.root);
  }
}

/** Co cỡ chữ để vừa khung một dòng (giống Auto Size của TextMeshPro), tối thiểu 60%. */
export function fitTexts(scope: HTMLElement): void {
  scope.querySelectorAll<HTMLElement>(".fit").forEach((e) => {
    e.style.fontSize = "";
    const base = parseFloat(getComputedStyle(e).fontSize);
    let size = base;
    let guard = 0;
    while (e.scrollWidth > e.clientWidth + 0.5 && size > base * 0.6 && guard++ < 30) {
      size *= 0.95;
      e.style.fontSize = size + "px";
    }
  });
}
