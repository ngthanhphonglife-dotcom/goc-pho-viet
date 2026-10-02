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
import { World } from "../world/World";
import type { ActionId } from "../core/actions";
import { VERSION } from "../version";

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
    document.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest?.(".btn")) this.settings.haptic(); }, true);

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

    // Phase 6: hội thoại + nhiệm vụ
    this.dialogue = new Dialogue(this.hosts.app, import.meta.env.BASE_URL + "art/chars/");
    this.questOffer = new QuestOfferPanel(this.hosts.app);
    this.questDone = new QuestDonePanel(this.hosts.app);
    this.questLog = new QuestLogPanel(this.hosts.app, this.quests, (id) => this.state.value.quests.find((q) => q.id === id)?.current ?? 0);

    // Phase 5: đồng hồ chạy khi đang trong game và không mở bảng nào; ánh sáng + thời tiết theo trạng thái
    this.weatherPanel = new WeatherPanel(this.hosts.app);
    this.world.onTick((dt) => {
      if (this.screen !== "game" || !this.world.lifeEnabled || this.fader.busy || document.querySelector(".overlay.open, .dialogue.open")) return;
      this.time.update(dt);
    });
    this.state.subscribe((s) => { if (this.screen === "game") this.world.atmo.set(s.minuteOfDay, this.time.kind); });
    this.time.onNewDay((day) => {
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
      this.time.forced = null;
      this.world.atmo.set(data.minuteOfDay, data.weather.kind ?? "sunny", true);
      this.world.placePlayer(data.player);
      this.world.interactive = true;
      this.hosts.controls.classList.remove("hidden");
      window.clearInterval(this.autosaveTimer);
      this.autosaveTimer = window.setInterval(() => this.saveNow(), AUTOSAVE_MS);
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

  // ---------------------------------------------------------------- hội thoại & nhiệm vụ (Phase 6)

  /** Trao thưởng lần lượt cho các nhiệm vụ vừa hoàn thành. */
  private async reward(ready: QuestDef[]): Promise<void> {
    for (const d of ready) {
      if (!this.quests.isActive(d.id)) continue;
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
    for (const e of effects) {
      if (e.type === "offer" && this.quests.isNew(e.quest)) {
        if (await this.questOffer.show(this.quests.def(e.quest))) {
          this.quests.accept(e.quest);
          this.ui.toast("Đã nhận nhiệm vụ: " + this.quests.def(e.quest).title);
          this.saveNow();
        }
      } else if (e.type === "action") this.ui.invoke(e.id as ActionId);
    }
    this.talking = false;
  }

  /** Tới một điểm trên phố. */
  async visit(h: Hotspot): Promise<void> {
    if (this.screen !== "game") return;
    await this.reward(this.quests.event("visit", h.id));
    if (h.action) this.ui.invoke(h.action as ActionId);
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
    this.saveNow();
    window.clearInterval(this.autosaveTimer);
    await this.fader.run(() => this.showMenu());
  }
}
