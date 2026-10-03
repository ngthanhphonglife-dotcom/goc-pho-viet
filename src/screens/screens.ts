import { formatClock, formatMoney, weekdayOf, newGameState, type GameStateData } from "../core/GameState";
import type { SettingsService } from "../core/settings";
import { ICONS, UI_ART, button, el, img, nextFrame, wait } from "./dom";
import { sfx } from "../core/Sfx";
import { voice } from "../core/Voice";

export const TAGLINE = "Những câu chuyện nhỏ từ góc phố thân quen…";

export const TIPS = [
  "Mẹo nhỏ: khách quen thích ghé quầy vào buổi sáng sớm.",
  "Mẹo nhỏ: trời nắng nóng, trà tắc bán chạy hơn cà phê nóng.",
  "Mẹo nhỏ: nhớ ghé tạp hoá Cô Ba nhập đá và sữa trước giờ đông khách.",
  "Mẹo nhỏ: chú Tư sửa xe hay kể chuyện cũ của khu phố Hoa Sữa.",
  "Mẹo nhỏ: uy tín càng cao, càng mở khoá được nhiều khu phố mới.",
  "Mẹo nhỏ: trang trí quầy đẹp giúp khách ở lại lâu hơn.",
];

/** Lớp phủ chuyển cảnh: mờ dần qua màu kem, khoá thao tác trong lúc chuyển. */
export class Fader {
  readonly el: HTMLElement;
  busy = false;
  constructor(host: HTMLElement) {
    this.el = el("div", "fader", host);
  }
  async run(between: () => void | Promise<void>, ms = 350): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.el.classList.add("on");
    await wait(ms);
    await between();
    await nextFrame();
    this.el.classList.remove("on");
    await wait(ms);
    this.busy = false;
  }
}

// ---------------------------------------------------------------- Splash

export class SplashScreen {
  readonly el: HTMLElement;
  constructor(host: HTMLElement) {
    this.el = el("section", "screen splash", host);
    this.el.dataset.screen = "splash";
    img(UI_ART + "logo.svg", "logo", this.el, "Góc Phố Việt");
    el("p", "tagline", this.el, TAGLINE);
  }

  /** Hiện 0.6s → giữ 1.2s → ẩn 0.5s; chạm để bỏ qua. */
  async play(): Promise<void> {
    let skip: () => void = () => {};
    const skipped = new Promise<void>((r) => { skip = r; });
    this.el.addEventListener("pointerdown", () => skip(), { once: true });
    await nextFrame();
    this.el.classList.add("in");
    await Promise.race([wait(600 + 1200), skipped]);
    this.el.classList.remove("in");
    this.el.classList.add("out");
    await wait(500);
    this.el.remove();
  }
}

// ---------------------------------------------------------------- Loading

export class LoadingScreen {
  readonly el: HTMLElement;
  private fill: HTMLElement;
  private cart: HTMLElement;
  private pct: HTMLElement;
  private tip: HTMLElement;
  private errorBox: HTMLElement;
  private shown = 0;
  private target = 0;
  private raf = 0;
  /** Các giá trị % đã hiển thị (test kiểm tra chỉ tăng). */
  readonly history: number[] = [];

  constructor(host: HTMLElement) {
    this.el = el("section", "screen loading", host);
    this.el.dataset.screen = "loading";
    img(UI_ART + "logo.svg", "logo small", this.el, "Góc Phố Việt");
    const box = el("div", "progress", this.el);
    box.setAttribute("role", "progressbar");
    box.setAttribute("aria-valuemin", "0");
    box.setAttribute("aria-valuemax", "100");
    const track = el("div", "track", box);
    this.fill = el("i", "", track);
    this.cart = el("span", "cart", box);
    img(ICONS + "icon_stall.svg", "", this.cart);
    this.pct = el("div", "pct", this.el, "0%");
    this.tip = el("p", "tip", this.el, TIPS[Math.floor(Math.random() * TIPS.length)]);
    this.errorBox = el("div", "load-error", this.el);
    this.errorBox.hidden = true;
    let i = TIPS.indexOf(this.tip.textContent!);
    this.tipTimer = window.setInterval(() => { i = (i + 1) % TIPS.length; this.tip.textContent = TIPS[i]; }, 3500);
  }
  private tipTimer = 0;

  /** Đặt tiến độ thật (0–1). Thanh chạy mượt tới giá trị này, không bao giờ lùi. */
  set(p: number): void {
    this.target = Math.max(this.target, Math.min(1, p));
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  private tick = () => {
    this.raf = 0;
    const diff = this.target - this.shown;
    this.shown = diff < 0.002 ? this.target : this.shown + Math.max(0.004, diff * 0.18);
    this.shown = Math.min(this.shown, this.target);
    const v = Math.round(this.shown * 100);
    this.fill.style.width = this.shown * 100 + "%";
    this.cart.style.left = this.shown * 100 + "%";
    this.pct.textContent = v + "%";
    this.el.querySelector(".progress")!.setAttribute("aria-valuenow", String(v));
    if (this.history[this.history.length - 1] !== v) this.history.push(v);
    if (this.shown < this.target) this.raf = requestAnimationFrame(this.tick);
  };

  /** Chờ thanh hiển thị chạy tới 100%. */
  async finish(): Promise<void> {
    this.set(1);
    while (this.shown < 1) await nextFrame();
    window.clearInterval(this.tipTimer);
    await wait(200);
  }

  showError(retry: () => void): void {
    this.errorBox.hidden = false;
    this.errorBox.replaceChildren();
    el("p", "", this.errorBox, "Không tải được dữ liệu, kiểm tra mạng rồi thử lại.");
    button("primary", this.errorBox, "Thử lại", () => { this.errorBox.hidden = true; retry(); });
  }
}

// ---------------------------------------------------------------- Main menu

export interface MenuActions {
  newGame(): void;
  continueGame(): void;
  settings(): void;
}

export class MainMenu {
  readonly el: HTMLElement;
  readonly newBtn: HTMLButtonElement;
  readonly continueBtn: HTMLButtonElement;
  readonly settingsBtn: HTMLButtonElement;
  private info: HTMLElement;
  private notice: HTMLElement;

  constructor(host: HTMLElement, actions: MenuActions, version: string) {
    this.el = el("section", "screen menu", host);
    this.el.dataset.screen = "menu";
    img(UI_ART + "logo.svg", "logo", this.el, "Góc Phố Việt");
    el("p", "tagline", this.el, TAGLINE);
    const col = el("div", "menu-buttons", this.el);
    this.newBtn = button("primary big", col, "Chơi mới", actions.newGame);
    this.newBtn.dataset.menu = "new";
    this.continueBtn = button("big", col, "Tiếp tục", actions.continueGame);
    this.continueBtn.dataset.menu = "continue";
    this.info = el("span", "sub", this.continueBtn);
    this.settingsBtn = button("big", col, "Cài đặt", actions.settings);
    this.settingsBtn.dataset.menu = "settings";
    this.notice = el("p", "notice", this.el);
    this.notice.hidden = true;
    el("p", "version", this.el, "Phiên bản " + version);
  }

  /** Cập nhật nút Tiếp tục theo save hiện có. */
  setSave(save: GameStateData | null, corrupt = false): void {
    this.continueBtn.disabled = !save;
    this.continueBtn.setAttribute("aria-disabled", String(!save));
    this.info.textContent = save ? `Ngày ${save.day} · ${formatMoney(save.money)}` : "Chưa có ván chơi";
    this.notice.hidden = !corrupt;
    this.notice.textContent = corrupt ? "Dữ liệu lưu bị lỗi và không khôi phục được. Hãy bắt đầu ván mới." : "";
  }
}

// ---------------------------------------------------------------- Modal panels

export abstract class Modal {
  readonly el: HTMLElement;
  protected card: HTMLElement;
  protected body: HTMLElement;
  private keyHandler = (e: KeyboardEvent) => { if (e.key === "Escape") this.close(); };

  constructor(host: HTMLElement, title: string, name: string) {
    this.el = el("div", "overlay modal", host);
    this.el.dataset.name = name;
    this.el.hidden = true;
    this.el.addEventListener("click", (e) => { if (e.target === this.el) this.close(); });
    this.card = el("div", "card", this.el);
    this.card.setAttribute("role", "dialog");
    this.card.setAttribute("aria-modal", "true");
    const head = el("div", "head", this.card);
    el("span", "", head, title);
    const x = el("button", "btn x", head, "X");
    x.type = "button";
    x.setAttribute("aria-label", "Đóng");
    x.addEventListener("click", () => this.close());
    this.body = el("div", "modal-body", this.card);
  }

  get isOpen(): boolean {
    return !this.el.hidden;
  }

  open(): void {
    if (this.el.hidden) sfx.play("open");
    this.el.hidden = false;
    document.addEventListener("keydown", this.keyHandler);
    requestAnimationFrame(() => this.el.classList.add("open"));
  }

  /** Gọi khi bảng bị đóng bằng nút X / Esc / chạm nền. */
  protected onClose: (() => void) | null = null;

  close(): void {
    if (this.el.hidden) return;
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
    if (this.el.hidden) return;
    document.removeEventListener("keydown", this.keyHandler);
    if (this.el.classList.contains("open")) sfx.play("close");
    this.el.classList.remove("open");
    setTimeout(() => { if (!this.el.classList.contains("open")) this.el.hidden = true; }, 180);
  }
}

export class NewGamePanel extends Modal {
  private warn: HTMLElement;
  private startBtn: HTMLButtonElement;
  private onStart: () => void = () => {};

  constructor(host: HTMLElement) {
    super(host, "Chơi mới", "NewGamePanel");
    const s = newGameState();
    const rows: [string, string, string][] = [
      ["icon_calendar", "Ngày", `Ngày ${s.day} · ${weekdayOf(s.day)}`],
      ["icon_weather_sun", "Giờ mở quầy", formatClock(s.minuteOfDay)],
      ["icon_money", "Vốn ban đầu", formatMoney(s.money)],
      ["icon_star", "Uy tín", String(s.reputation)],
    ];
    const list = el("div", "start-values", this.body);
    for (const [ic, label, value] of rows) {
      const r = el("div", "sv-row", list);
      img(ICONS + ic + ".svg", "icon", r);
      el("span", "sv-label", r, label);
      el("strong", "sv-value", r, value);
    }
    el("p", "intro", this.body, "Bạn nhận lại chiếc xe cà phê nhỏ ở góc phố Hoa Sữa. Bán thật ngon, làm quen hàng xóm và dựng quán của riêng mình!");
    this.warn = el("p", "warn", this.body, "Ván đang chơi sẽ bị thay thế bằng ván mới.");
    const row = el("div", "modal-actions", this.body);
    button("", row, "Huỷ", () => this.close()).dataset.panel = "cancel";
    this.startBtn = button("primary", row, "Bắt đầu", () => { this.close(); this.onStart(); });
    this.startBtn.dataset.panel = "start";
  }

  show(hasSave: boolean, onStart: () => void): void {
    this.onStart = onStart;
    this.warn.hidden = !hasSave;
    this.startBtn.querySelector(".t")!.textContent = hasSave ? "Bắt đầu lại" : "Bắt đầu";
    this.open();
  }
}

export class SettingsPanel extends Modal {
  private toMenu: HTMLButtonElement;
  private voiceNote!: HTMLElement;
  private repaintVoice: () => void = () => {};
  private onMenu: (() => void) | null = null;

  constructor(host: HTMLElement, settings: SettingsService) {
    super(host, "Cài đặt", "SettingsPanel");
    const slider = (label: string, key: "music" | "sfx") => {
      const r = el("label", "set-row", this.body);
      el("span", "set-label", r, label);
      const input = el("input", "range", r);
      input.type = "range";
      input.min = "0";
      input.max = "100";
      input.step = "5";
      input.dataset.setting = key;
      const out = el("output", "set-value", r);
      settings.subscribe((s) => { input.value = String(s[key]); out.textContent = s[key] + "%"; input.style.setProperty("--v", s[key] + "%"); });
      input.addEventListener("input", () => settings.set({ [key]: Number(input.value) }));
    };
    slider("Âm nhạc", "music");
    slider("Hiệu ứng", "sfx");
    const r = el("label", "set-row", this.body);
    el("span", "set-label", r, "Rung");
    const sw = el("input", "switch", r);
    sw.type = "checkbox";
    sw.setAttribute("role", "switch");
    sw.dataset.setting = "vibration";
    settings.subscribe((s) => { sw.checked = s.vibration; });
    sw.addEventListener("change", () => { settings.set({ vibration: sw.checked }); settings.haptic(30); });
    // giọng nhân vật
    const vr = el("div", "set-row", this.body);
    el("span", "set-label", vr, "Giọng nói");
    const seg = el("div", "seg", vr);
    const opts: ["babble" | "tts" | "off", string][] = [["tts", "Tiếng Việt"], ["babble", "Líu lo"], ["off", "Tắt"]];
    const NOTE_OK = "\"Tiếng Việt\": nhân vật nói lời thoại bằng tiếng Việt, mỗi người một giọng (dùng giọng đọc tiếng Việt của máy). \"Líu lo\": tiếng ê a vui tai do game tự tạo.";
    const NOTE_NO = "\"Tiếng Việt\": nhân vật nói lời thoại bằng tiếng Việt, mỗi người một giọng (giọng có sẵn trong game). Máy cài thêm giọng đọc tiếng Việt thì giọng sẽ tự nhiên hơn.";
    const btns = opts.map(([v, label]) => {
      const b = el("button", "seg-btn", seg, label);
      b.type = "button";
      b.dataset.voice = v;
      b.addEventListener("click", () => {
        settings.set({ voice: v });
        if (v !== "off") voice.say("coba", "Chào con, hôm nay bán đắt nghen!");
      });
      return b;
    });
    const paint = () => {
      const eff = voice.mode();
      btns.forEach((b) => b.classList.toggle("on", b.dataset.voice === eff));
      this.voiceNote.textContent = settings.value.voice === "tts" && !voice.ttsAvailable ? NOTE_NO : NOTE_OK;
    };
    this.voiceNote = el("p", "note", this.body, NOTE_OK);
    settings.subscribe(paint);
    this.repaintVoice = paint;
    const actions = el("div", "modal-actions", this.body);
    this.toMenu = button("", actions, "Về Menu", () => { this.close(); this.onMenu?.(); });
    this.toMenu.dataset.panel = "to-menu";
    button("primary", actions, "Đóng", () => this.close()).dataset.panel = "close";
  }

  /** onMenu = null: đang ở Menu (ẩn nút Về Menu). */
  show(onMenu: (() => void) | null): void {
    this.onMenu = onMenu;
    this.toMenu.hidden = !onMenu;
    this.repaintVoice(); // danh sách giọng của máy nạp chậm → kiểm tra lại mỗi lần mở
    this.open();
  }
}
