import { GameState, newGameState, type GameStateData } from "../core/GameState";
import { AssetLoader, loadImage, type LoadTask } from "../core/preload";
import { SaveService } from "../core/save";
import { SettingsService } from "../core/settings";
import { ICONS, UI_ART } from "../screens/dom";
import { Fader, LoadingScreen, MainMenu, NewGamePanel, SettingsPanel, SplashScreen } from "../screens/screens";
import { MasterUI, fitTexts } from "../ui/MasterUI";
import { Controls } from "../ui/Controls";
import { TimeSystem } from "../core/TimeSystem";
import { weekdayOf } from "../core/GameState";
import { WeatherPanel } from "../screens/WeatherPanel";
import { QuestSystem, type QuestDef } from "../core/QuestSystem";
import { Dialogue } from "../ui/Dialogue";
import { dialogueFor } from "../data/dialogues";
import { QuestDonePanel, QuestLogPanel, QuestOfferPanel } from "../screens/QuestPanels";
import type { Character } from "../world/Character";
import type { Hotspot } from "../world/World";
import { Business } from "../core/Business";
import { BrewPanel, IngredientsPanel, StallPanel } from "../screens/StallPanels";
import { QUALITY, type Recipe } from "../data/items";
import { OrdersPanel } from "../screens/OrdersPanel";
import { ShopPanel } from "../screens/ShopPanel";
import { SHOP_CLOSE, SHOP_OPEN } from "../data/items";
import { sfx } from "../core/Sfx";
import { music } from "../core/Music";
import { voice, VOICE_ENABLED } from "../core/Voice";
import { isNight } from "../core/weather";
import { HISTORY_MAX, ensureToday, summarize } from "../core/DayStats";
import { DAY_END } from "../core/TimeSystem";
import { DaySummaryPanel } from "../screens/DaySummaryPanel";
import { LOST_REPUTATION, customerRate, settle } from "../core/Sales";
import { formatMoney } from "../core/GameState";
import type { CustomerType } from "../world/Customers";
import { TYPES } from "../world/Customers";
import { World } from "../world/World";
import type { ActionId } from "../core/actions";
import { VERSION } from "../version";
import { Daily } from "../core/Daily";
import { customerTypes, levelOf, tipBonus } from "../core/Reputation";
import { LevelUpPanel, ReputationPanel } from "../screens/ReputationPanels";

const ICON_NAMES = ["icon_bag", "icon_calendar", "icon_check", "icon_decor", "icon_ingredients", "icon_map", "icon_money", "icon_quest",
  "icon_quest_scroll", "icon_sell", "icon_settings", "icon_shop", "icon_stall", "icon_star", "icon_upgrade", "icon_weather_rain", "icon_weather_sun", "icon_weather_cloud", "icon_weather_moon"];

const AUTOSAVE_MS = 30_000;

export type ScreenName = "splash" | "loading" | "menu" | "game";

/**
 * Phase 1 — điều phối luồng mở game:
 * Splash → Loading (tiến độ thật) → Main Menu → Chơi mới / Tiếp tục → Game (Master UI Phase 0).
 */
export class Boot {
  readonly state = new GameState(newGameState());
  readonly saves = new SaveService();
  readonly settings = new SettingsService();
  readonly world = new World();
  readonly time = new TimeSystem(this.state);
  weatherPanel!: WeatherPanel;
  readonly quests = new QuestSystem(this.state);
  dialogue!: Dialogue;
  questOffer!: QuestOfferPanel;
  questDone!: QuestDonePanel;
  questLog!: QuestLogPanel;
  readonly biz = new Business(this.state);
  readonly daily = new Daily(this.state);
  reputationPanel!: ReputationPanel;
  levelUpPanel!: LevelUpPanel;
  private progressing = false;
  ingredientsPanel!: IngredientsPanel;
  stallPanel!: StallPanel;
  brewPanel!: BrewPanel;
  ordersPanel!: OrdersPanel;
  shopPanel!: ShopPanel;
  summaryPanel!: DaySummaryPanel;
  private summarizing = false;
  private badge!: HTMLElement;
  private talking = false;
  private abortTalk = false;
  ui!: MasterUI;
  controls!: Controls;
  menu!: MainMenu;
  loading!: LoadingScreen;
  newGamePanel!: NewGamePanel;
  settingsPanel!: SettingsPanel;
  screen: ScreenName = "splash";
  private fader!: Fader;
  private autosaveTimer = 0;
  private corruptSave = false;

  constructor(private hosts: { world: HTMLElement; ui: HTMLElement; screens: HTMLElement; app: HTMLElement; controls: HTMLElement }) {}

  async start(): Promise<void> {
    const { screens, ui, app } = this.hosts;
    ui.classList.add("hidden");
    this.fader = new Fader(app);
    this.loading = new LoadingScreen(screens);
    const splash = new SplashScreen(screens);
    const splashDone = splash.play().then(() => { this.screen = "loading"; });

    // rung nhẹ khi bấm bất kỳ nút nào (nếu bật trong Cài đặt)
    sfx.volume = () => this.settings.value.sfx / 100;
    music.volume = () => this.settings.value.music / 100;
    voice.volume = () => this.settings.value.sfx / 100;
    // chọn "Tiếng Việt" mà máy không có giọng đọc tiếng Việt → tự dùng giọng líu lo
    voice.mode = () => (VOICE_ENABLED ? this.settings.value.voice : "off"); // "Tiếng Việt" luôn là tiếng nói thật (giọng máy hoặc file có sẵn), không tự rơi về líu lo
    const unlock = () => { sfx.unlock(); music.start(); voice.prime(); };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest?.(".btn, .dlg-choice, .interact")) { this.settings.haptic(); sfx.play("tap"); } }, true);

    await this.world.init(this.hosts.world);
    await this.loadWithRetry();
    await splashDone;
    await this.loading.finish();

    this.buildUi();
    await this.fader.run(() => {
      this.loading.el.remove();
      this.showMenu();
    });
  }

  // ---------------------------------------------------------------- tải

  private async tasks(): Promise<LoadTask[]> {
    const fonts: LoadTask[] = ["700", "500"].map((w) => ({
      name: "font/" + w,
      run: () => document.fonts.load(`${w} 32px "Be Vietnam Pro"`, "Góc Phố Việt ỹữự").then((f) => {
        if (!f.length) throw new Error("Không tải được font " + w);
      }),
    }));
    const art: LoadTask[] = [
      { name: "ui/logo", run: () => loadImage(UI_ART + "logo.svg") },
      ...ICON_NAMES.map((n) => ({ name: "icon/" + n, run: () => loadImage(ICONS + n + ".svg") })),
    ];
    const worldTasks = await this.world.loadTasks();
    const build: LoadTask = { name: "world/build", weight: 3, run: async () => this.world.build() };
    // dựng khu phố phải chạy sau khi tải xong các lớp → tách 2 đợt
    return [...fonts, ...art, ...worldTasks, build];
  }

  private async loadWithRetry(): Promise<void> {
    for (;;) {
      try {
        const loader = new AssetLoader((p) => this.loading.set(p * 0.999));
        const all = await this.tasks();
        const build = all.pop()!;
        const total = all.reduce((s, t) => s + (t.weight ?? 1), 0) + (build.weight ?? 1);
        await loader.run(all);
        // đợt 2: dựng khu phố (tính tiếp vào cùng thanh tiến độ)
        await build.run();
        this.loading.set(total / total);
        return;
      } catch (e) {
        console.warn("[Boot] Lỗi tải:", e);
        await new Promise<void>((resolve) => this.loading.showError(resolve));
      }
    }
  }

  // ---------------------------------------------------------------- UI

  private buildUi(): void {
    const { ui, screens } = this.hosts;
    this.ui = new MasterUI(ui, this.state);
    window.addEventListener("resize", () => fitTexts(this.ui.root));
    this.ui.onAction((id) => {
      if (id === "settings") {
        this.settingsPanel.show(() => void this.backToMenu());
        return true;
      }
      if (id === "shop" || id === "addMoney") {
        this.openShop();
        return true;
      }
      if (id === "sell") {
        this.openOrders();
        return true;
      }
      if (id === "ingredients") {
        this.ingredientsPanel.show();
        return true;
      }
      if (id === "stall") {
        this.stallPanel.show();
        return true;
      }
      if (id === "quests") {
        this.questLog.show();
        return true;
      }
      if (id === "weather") {
        this.weatherPanel.show(this.state.value, this.time.kind);
        return true;
      }
      return false;
    });

    // Phase 2: chạm điểm tương tác trên phố
    this.world.onHotspot((h) => void this.visit(h));

    // Phase 9: tạp hoá Cô Ba
    this.shopPanel = new ShopPanel(this.hosts.app, this.state, this.biz, (total) => {
      sfx.play("buy");
      this.ui.toast(`Đã mua hàng: −${formatMoney(total)}`);
      this.saveNow();
    });

    // Phase 8: khách hàng + đơn hàng
    const cs = this.world.customers;
    this.ordersPanel = new OrdersPanel(this.hosts.app, cs, this.biz, {
      ready: (uid) => this.serveReady(uid),
      brew: (uid) => void this.brewFor(uid),
      dismiss: (uid) => { if (cs.dismiss(uid)) this.ui.toast("Đã báo khách hết món."); this.ordersPanel.render(); },
    });
    this.world.isPaused = () => this.fader.busy || !!document.querySelector(".overlay.open, .dialogue.open");
    cs.rate = () => customerRate(this.state.value.minuteOfDay, this.time.kind, this.state.value.reputation);
    cs.pick = (type) => this.pickRecipe(type);
    cs.types = () => customerTypes(this.biz.level);
    cs.onLost = () => {
      this.state.update((s) => { this.today(s).lost++; s.reputation = Math.max(0, s.reputation - LOST_REPUTATION); }); // ghi số liệu trước để nhớ uy tín đầu ngày
      this.ui.toast("Một khách bỏ đi vì chờ lâu…");
      sfx.play("lost");
    };
    const sell = this.hosts.ui.querySelector<HTMLElement>('[data-action="sell"]')!;
    this.badge = document.createElement("span");
    this.badge.className = "sell-badge";
    this.badge.hidden = true;
    sell.appendChild(this.badge);
    let lastFront = 0;
    cs.onChange = () => {
      const n = cs.queue.length;
      const f = cs.front?.uid ?? 0;
      if (f && f !== lastFront) {
        // khách mới tới trước quầy: chuông + gọi món bằng giọng của mình
        sfx.play("arrive");
        const c = cs.front!;
        voice.say(c.look, `Cho ${c.type === "student" ? "em" : "tôi"} một ly ${this.biz.recipe(c.recipe).name} nha!`);
      }
      lastFront = f;
      this.badge.hidden = n === 0;
      this.badge.textContent = String(n);
      if (this.ordersPanel.isOpen) this.ordersPanel.render();
    };
    this.world.onCustomer((c) => {
      if (c.state === "leaving") return;
      if (cs.front === c) this.openOrders();
      else this.ui.toast(`${TYPES[c.type].name} đang chờ tới lượt`);
    });
    this.summaryPanel = new DaySummaryPanel(this.hosts.app);
    this.time.onDayEnd(() => void this.daySummary(false));

    // Phase 7: kho, thực đơn, pha chế
    this.ingredientsPanel = new IngredientsPanel(this.hosts.app, this.biz, () => this.ui.invoke("shop"));
    this.stallPanel = new StallPanel(this.hosts.app, this.biz, (r) => void this.brew(r), () => void this.daySummary(true));
    this.brewPanel = new BrewPanel(this.hosts.app);

    // Phase 6: hội thoại + nhiệm vụ
    this.dialogue = new Dialogue(this.hosts.app, import.meta.env.BASE_URL + "art/chars/");
    this.questOffer = new QuestOfferPanel(this.hosts.app);
    this.questDone = new QuestDonePanel(this.hosts.app);
    this.questLog = new QuestLogPanel(this.hosts.app, this.quests, (id) => this.state.value.quests.find((q) => q.id === id)?.current ?? 0,
      this.daily, () => this.state.value.day, (id) => this.claimDaily(id));

    // Phase 11: cấp uy tín — chạm ô ngôi sao trên HUD để xem
    this.reputationPanel = new ReputationPanel(this.hosts.app);
    this.levelUpPanel = new LevelUpPanel(this.hosts.app);
    const repPill = this.hosts.ui.querySelector<HTMLElement>('[data-name="ReputationPanel"]')!;
    repPill.style.cursor = "pointer";
    repPill.style.pointerEvents = "auto"; // các ô HUD mặc định không nhận chạm
    repPill.addEventListener("click", () => { if (this.screen === "game") { sfx.play("tap"); this.reputationPanel.show(this.state.value); } });

    // Phase 5: đồng hồ chạy khi đang trong game và không mở bảng nào; ánh sáng + thời tiết theo trạng thái
    this.weatherPanel = new WeatherPanel(this.hosts.app);
    this.world.onTick((dt) => {
      sfx.setRain(this.screen === "game" ? this.world.atmo.rain : 0);
      // không khí nhạc theo buổi và thời tiết
      const m = this.state.value.minuteOfDay;
      music.mood = this.screen !== "game" ? "day" : this.world.atmo.rain > 0.3 ? "rain" : isNight(m) ? "night" : m >= 17 * 60 ? "evening" : "day";
      if (this.screen !== "game" || !this.world.lifeEnabled || this.fader.busy || document.querySelector(".overlay.open, .dialogue.open")) return;
      this.time.update(dt);
    });
    this.state.subscribe((s) => { if (this.screen === "game") this.world.atmo.set(s.minuteOfDay, this.time.kind); });
    this.time.onNewDay((day) => {
      sfx.play("newday");
      this.world.placePlayer();
      this.saveNow();
      void this.fader.run(() => {}).then(() => this.ui.toast(`Ngày ${day} · ${weekdayOf(day)} — chào buổi sáng!`));
    });

    // Phase 4: joystick + nút tương tác
    this.controls = new Controls(this.hosts.controls);
    this.controls.onVector((x, y) => { this.world.player.stick = { x, y }; });
    this.controls.onInteract(() => this.world.interactNearby());
    this.world.onNearby((n) => this.controls.setInteract(n ? n.name : null));

    // Phase 3: chạm nhân vật → chào
    this.world.onCharacter((c) => void this.talk(c));

    this.menu = new MainMenu(screens, {
      newGame: () => this.newGamePanel.show(this.saves.hasSave() && !this.corruptSave, () => void this.startNewGame()),
      continueGame: () => void this.continueGame(),
      settings: () => this.settingsPanel.show(null),
    }, VERSION);
    this.menu.el.hidden = true;
    this.newGamePanel = new NewGamePanel(this.hosts.app);
    this.settingsPanel = new SettingsPanel(this.hosts.app, this.settings);

    const save = () => { if (this.screen === "game") this.saveNow(); };
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") save(); });
    window.addEventListener("pagehide", save);
  }

  private refreshMenu(): void {
    const r = this.saves.load();
    this.corruptSave = r.status === "corrupt";
    this.menu.setSave(r.status === "ok" ? r.file.state : null, this.corruptSave);
  }

  private showMenu(): void {
    this.refreshMenu();
    this.menu.el.hidden = false;
    this.hosts.ui.classList.add("hidden");
    this.screen = "menu";
    this.world.interactive = false;
    this.hosts.controls.classList.add("hidden");
    this.controls.reset();
    this.world.atmo.set(9 * 60, "sunny", true); // menu luôn là buổi sáng đẹp trời
    this.world.placePlayer();
  }

  // ---------------------------------------------------------------- game

  private enterGame(data: GameStateData): Promise<void> {
    return this.fader.run(() => {
      this.state.replace(data);
      this.menu.el.hidden = true;
      this.hosts.ui.classList.remove("hidden");
      fitTexts(this.ui.root);
      this.screen = "game";
      this.biz.ensure();
      // save cũ chưa có cấp uy tín → lấy theo điểm hiện có, không hiện bảng lên cấp dồn
      if (this.state.value.repLevel === undefined) this.state.patchQuiet({ repLevel: levelOf(this.state.value.reputation) });
      this.quests.setCount("rep", this.state.value.reputation);
      this.abortTalk = false;
      this.time.ended = false;
      this.summarizing = false;
      this.time.forced = null;
      this.world.atmo.set(data.minuteOfDay, data.weather.kind ?? "sunny", true);
      this.world.placePlayer(data.player);
      this.world.interactive = true;
      this.hosts.controls.classList.remove("hidden");
      window.clearInterval(this.autosaveTimer);
      this.autosaveTimer = window.setInterval(() => this.saveNow(), AUTOSAVE_MS);
    }).then(() => {
      // save dừng ở 23:59 (thoát khi đang xem tổng kết) → hiện lại bảng tổng kết
      if (this.screen === "game" && this.state.value.minuteOfDay >= DAY_END - 1) this.time.endDay();
    });
  }

  async startNewGame(): Promise<void> {
    const data = newGameState();
    this.saves.save(data); // lưu ngay khi bắt đầu ván
    this.corruptSave = false;
    await this.enterGame(data);
    this.ui.toast("Chạm vỉa hè hoặc dùng cần điều khiển để đi dạo phố Hoa Sữa");
  }

  async continueGame(): Promise<void> {
    const r = this.saves.load();
    if (r.status !== "ok") {
      this.refreshMenu();
      return;
    }
    await this.enterGame(r.file.state);
    if (r.fromBackup) this.ui.toast("Đã khôi phục từ bản lưu dự phòng");
  }

  // ---------------------------------------------------------------- bán hàng (Phase 8)

  private today(s: GameStateData) {
    return ensureToday(s);
  }

  // ---------------------------------------------------------------- kết thúc ngày (Phase 10)

  /**
   * Hiện bảng Tổng kết ngày. early = người chơi tự kết thúc sớm (có nút "Bán tiếp").
   * "Sang ngày mới": ghi lịch sử, xoá số liệu ngày, dọn khách, chuyển ngày.
   */
  async daySummary(early: boolean): Promise<void> {
    if (this.summarizing || this.screen !== "game") return;
    this.summarizing = true;
    this.controls.reset();
    for (const p of [this.ordersPanel, this.stallPanel, this.ingredientsPanel, this.shopPanel, this.weatherPanel, this.questLog, this.reputationPanel]) p.close();
    this.ui.closePlaceholder();
    this.saveNow();
    const choice = await this.summaryPanel.show(this.state.value, early);
    this.summarizing = false;
    if (this.abortTalk || this.screen !== "game") return; // về menu khi bảng đang mở → vào lại sẽ hiện lại
    if (choice === "stay") { if (!early) this.time.endDay(); return; }
    const rec = summarize(this.state.value);
    this.state.patchQuiet({
      history: [...(this.state.value.history ?? []), { day: rec.day, revenue: rec.revenue, tips: rec.tips, cost: rec.cost, profit: rec.profit, cups: rec.cups }].slice(-HISTORY_MAX),
      today: undefined,
    });
    this.world.customers.clear();
    this.time.ended = false;
    this.time.startNewDay();
  }

  /** Khách chọn món: sở thích loại khách × thời tiết, chỉ trong các món đã mở. */
  pickRecipe(type: CustomerType): string {
    const kind = this.time.kind;
    const hot = kind === "sunny" && this.state.value.weather.temperatureC >= 31;
    const rain = kind === "lightRain" || kind === "heavyRain";
    const open = this.biz.openRecipes;
    const w = open.map((r) => (TYPES[type].likes[r.id] ?? 1) * (rain && r.id !== "tratac" ? 1.5 : 1) * (hot && r.id === "tratac" ? 1.6 : 1));
    let x = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < open.length; i++) { x -= w[i]; if (x <= 0) return open[i].id; }
    return open[0].id;
  }

  /** Tiệm Cô Ba mở 06:00–21:00. */
  get shopIsOpen(): boolean {
    const m = this.state.value.minuteOfDay;
    return m >= SHOP_OPEN && m < SHOP_CLOSE;
  }

  /** Mở bảng mua hàng ngay (chủ quầy đang đứng ở tiệm). */
  showShop(): void {
    if (this.screen !== "game") return;
    if (!this.shopIsOpen) { sfx.play("error"); this.ui.toast("Tạp hoá Cô Ba đóng cửa rồi (mở 06:00–21:00)."); return; }
    this.shopPanel.show();
  }

  /** Đi tới tiệm Cô Ba rồi mở bảng mua hàng. */
  openShop(): void {
    if (this.screen !== "game") return;
    if (!this.shopIsOpen) { this.showShop(); return; }
    this.world.walkToHotspot("coba", () => this.showShop());
  }

  /** Mở bảng Đơn hàng (đang ở xa thì đi về quầy trước). */
  openOrders(): void {
    if (this.screen !== "game") return;
    if (!this.world.player.atHome && this.world.lifeEnabled) this.ui.toast("Về quầy để bán hàng…");
    this.world.goHome(() => { if (this.screen === "game") this.ordersPanel.show(); });
  }

  /** Giao ly cho khách uid với chất lượng q: nhận tiền, tip, uy tín, tính nhiệm vụ. */
  private async finishSale(uid: number, r: Recipe, q: number): Promise<void> {
    const cs = this.world.customers;
    const front = cs.front;
    if (!front || front.uid !== uid) {
      // khách đã bỏ đi trong lúc pha → để ly lên khay
      this.ui.toast(this.biz.addReady(r.id, q) ? "Khách đi mất rồi — ly để lên khay." : "Khách đi mất rồi, khay cũng đầy…");
      return;
    }
    const sale = settle(r, q, front.patience / front.max, tipBonus(this.biz.level));
    cs.serve(uid, sale.mood);
    this.state.update((s) => {
      const t = this.today(s); // tạo số liệu ngày trước khi cộng uy tín (để nhớ uy tín đầu ngày)
      s.money += sale.price + sale.tip;
      s.reputation += sale.reputation;
      t.cups++; t.revenue += sale.price; t.tips += sale.tip;
      (t.byRecipe ??= {})[r.id] = (t.byRecipe[r.id] ?? 0) + 1;
      const hour = Math.min(17, Math.max(0, Math.floor(s.minuteOfDay / 60) - 6));
      (t.byHour ??= [])[hour] = (t.byHour[hour] ?? 0) + 1;
      if (sale.mood === "happy") t.happy++; else t.okay++;
    });
    this.settings.haptic(20);
    sfx.play("coin");
    this.ui.toast(`+${formatMoney(sale.price)}${sale.tip ? ` (tip +${formatMoney(sale.tip)})` : ""} · ${QUALITY[q]}`);
    this.saveNow();
    // nhiệm vụ: chính/phụ đếm theo món, khách hài lòng; hằng ngày đếm thêm tổng ly và doanh thu
    if (r.id === "den" || r.id === "sua") this.quests.count("sell-coffee");
    this.quests.count("sell:" + r.id);
    if (sale.mood === "happy") this.quests.count("happy");
    const daily = [...this.daily.count("sell-any"), ...this.daily.count("sell:" + r.id), ...this.daily.count("revenue", sale.price), ...(sale.mood === "happy" ? this.daily.count("happy") : [])];
    for (const d of daily) this.ui.toast(`Xong việc hằng ngày: ${d.title} — mở Nhiệm vụ để nhận thưởng`);
    if (this.hasProgress) { this.ordersPanel.close(); await this.progress(); }
  }

  // ---------------------------------------------------------------- uy tín & tiến trình (Phase 11)

  /** Có bảng lên cấp / nhận thưởng đang chờ hiện không. */
  get hasProgress(): boolean {
    const s = this.state.value;
    this.quests.setCount("rep", s.reputation);
    return levelOf(s.reputation) > (s.repLevel ?? 1) || this.quests.ready.length > 0;
  }

  /** Hiện lần lượt: bảng lên cấp uy tín, rồi thưởng các nhiệm vụ đếm số đã đủ (nhiệm vụ kế tiếp trong chuỗi tự nhận). */
  async progress(): Promise<void> {
    if (this.progressing || this.screen !== "game") return;
    this.progressing = true;
    try {
      for (let guard = 0; guard < 20 && this.screen === "game" && !this.abortTalk; guard++) {
        const s = this.state.value;
        const lv = levelOf(s.reputation);
        if (lv > (s.repLevel ?? 1)) {
          const next = (s.repLevel ?? 1) + 1;
          this.state.update({ repLevel: next });
          sfx.play("quest");
          await this.levelUpPanel.show(next);
          this.saveNow();
          continue;
        }
        this.quests.setCount("rep", s.reputation);
        const ready = this.quests.ready;
        if (!ready.length) break;
        await this.reward(ready);
      }
    } finally { this.progressing = false; }
  }

  /** Nhận thưởng một nhiệm vụ hằng ngày. */
  claimDaily(id: string): void {
    const q = this.daily.claim(id);
    if (!q) return;
    sfx.play("coin");
    this.ui.toast(`+${formatMoney(q.money)} · +${q.reputation} uy tín`);
    this.saveNow();
    if (this.hasProgress) { this.questLog.close(); void this.progress(); }
  }

  serveReady(uid: number): void {
    const front = this.world.customers.front;
    if (!front || front.uid !== uid) return;
    const q = this.biz.takeReady(front.recipe);
    if (q === null) return;
    void this.finishSale(uid, this.biz.recipe(front.recipe), q).then(() => this.ordersPanel.render());
  }

  async brewFor(uid: number): Promise<void> {
    const front = this.world.customers.front;
    if (!front || front.uid !== uid) return;
    const r = this.biz.recipe(front.recipe);
    if (this.biz.canMake(r) < 1) return;
    this.ordersPanel.close();
    const me = this.world.player.c;
    me.play("brew");
    const q = await this.brewPanel.show(r);
    me.play("idle");
    if (this.abortTalk || this.screen !== "game") return;
    if (q !== null && this.biz.consume(r)) {
      me.play("serve");
      await this.finishSale(uid, r, q);
    }
    if (this.screen === "game" && !document.querySelector(".overlay.open") && this.world.customers.queue.length) this.ordersPanel.show();
  }

  /** Pha một ly (minigame). Xong thì trừ nguyên liệu, đặt ly lên khay rồi quay lại thực đơn. */
  async brew(r: Recipe): Promise<void> {
    const me = this.world.player.c;
    if (this.world.player.atHome) me.play("brew");
    const q = await this.brewPanel.show(r);
    if (this.world.player.atHome) me.play("idle");
    if (this.abortTalk || this.screen !== "game") return;
    if (q !== null && this.biz.finishBrew(r, q)) {
      this.ui.toast(`${r.name} — ${QUALITY[q]}! Đã đặt lên khay.`);
      this.saveNow();
    }
    this.stallPanel.show();
  }

  // ---------------------------------------------------------------- hội thoại & nhiệm vụ (Phase 6)

  /** Trao thưởng lần lượt cho các nhiệm vụ vừa hoàn thành. */
  private async reward(ready: QuestDef[]): Promise<void> {
    for (const d of ready) {
      if (!this.quests.isActive(d.id)) continue;
      sfx.play("quest");
      await this.questDone.show(d);
      this.quests.claim(d.id);
      this.saveNow();
    }
  }

  /** Nói chuyện với nhân vật c (chủ quầy đã đứng gần). */
  async talk(c: Character): Promise<void> {
    if (this.talking || this.screen !== "game") return;
    this.talking = true;
    this.abortTalk = false;
    this.controls.reset();
    c.react(1.2);
    c.talkMode = "listen";
    this.dialogue.onSpeaking = (sp) => { c.talkMode = sp ? "speak" : "listen"; };
    const s = this.state.value;
    const effects = await this.dialogue.run({ id: c.info.id, name: c.info.name }, dialogueFor(c.info.id, this.quests, s.day * 31 + s.minuteOfDay));
    c.talkMode = null;
    if (this.abortTalk || this.screen !== "game") { this.talking = false; return; } // rời game giữa chừng → không tính
    const ready = this.quests.event("talk", c.info.id);
    for (const e of effects) if (e.type === "complete" && this.quests.isActive(e.quest) && !ready.some((d) => d.id === e.quest)) ready.push(this.quests.def(e.quest));
    await this.reward(ready);
    await this.progress();
    for (const e of effects) {
      if (e.type === "offer" && this.quests.isNew(e.quest)) {
        if (await this.questOffer.show(this.quests.def(e.quest))) {
          this.quests.accept(e.quest);
          this.ui.toast("Đã nhận nhiệm vụ: " + this.quests.def(e.quest).title);
          this.saveNow();
        }
      } else if (e.type === "action" && e.id === "shop") this.showShop();
      else if (e.type === "action") this.ui.invoke(e.id as ActionId);
    }
    this.talking = false;
  }

  /** Tới một điểm trên phố. */
  async visit(h: Hotspot): Promise<void> {
    if (this.screen !== "game") return;
    await this.reward(this.quests.event("visit", h.id));
    await this.progress();
    if (h.action === "shop") this.showShop(); // đã đứng ở tiệm
    else if (h.action) this.ui.invoke(h.action as ActionId);
    else this.ui.toast(h.name);
  }

  saveNow(): boolean {
    if (this.screen === "game") {
      const p = this.world.player;
      this.state.patchQuiet({ player: p.atHome ? undefined : { x: Math.round(p.pos.x), y: Math.round(p.pos.y) } });
    }
    return this.saves.save(this.state.value);
  }

  async backToMenu(): Promise<void> {
    this.abortTalk = true;
    this.dialogue.close();
    this.brewPanel.close();
    this.ordersPanel.close();
    this.shopPanel.close();
    this.summaryPanel.close();
    this.levelUpPanel.close();
    this.questDone.close();
    this.world.customers.clear();
    this.saveNow();
    window.clearInterval(this.autosaveTimer);
    await this.fader.run(() => this.showMenu());
  }
}
