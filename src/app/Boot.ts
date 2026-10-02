import { GameState, newGameState, type GameStateData } from "../core/GameState";
import { AssetLoader, loadImage, type LoadTask } from "../core/preload";
import { SaveService } from "../core/save";
import { SettingsService } from "../core/settings";
import { ICONS, UI_ART } from "../screens/dom";
import { Fader, LoadingScreen, MainMenu, NewGamePanel, SettingsPanel, SplashScreen } from "../screens/screens";
import { MasterUI, fitTexts } from "../ui/MasterUI";
import { World } from "../world/World";
import type { ActionId } from "../core/actions";
import { VERSION } from "../version";

const ICON_NAMES = ["icon_bag", "icon_calendar", "icon_check", "icon_decor", "icon_ingredients", "icon_map", "icon_money", "icon_quest",
  "icon_quest_scroll", "icon_sell", "icon_settings", "icon_shop", "icon_stall", "icon_star", "icon_upgrade", "icon_weather_rain", "icon_weather_sun"];

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
  ui!: MasterUI;
  menu!: MainMenu;
  loading!: LoadingScreen;
  newGamePanel!: NewGamePanel;
  settingsPanel!: SettingsPanel;
  screen: ScreenName = "splash";
  private fader!: Fader;
  private autosaveTimer = 0;
  private corruptSave = false;

  constructor(private hosts: { world: HTMLElement; ui: HTMLElement; screens: HTMLElement; app: HTMLElement }) {}

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
      return false;
    });

    // Phase 2: chạm điểm tương tác trên phố
    this.world.onHotspot((h) => {
      if (h.action) this.ui.invoke(h.action as ActionId);
      else this.ui.toast(h.name);
    });

    // Phase 3: chạm nhân vật → chào
    this.world.onCharacter((c) => {
      c.react();
      this.ui.toast(`${c.info.name} — ${c.info.role}`);
    });

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
    this.world.centerHome();
  }

  // ---------------------------------------------------------------- game

  private enterGame(data: GameStateData): Promise<void> {
    return this.fader.run(() => {
      this.state.replace(data);
      this.menu.el.hidden = true;
      this.hosts.ui.classList.remove("hidden");
      fitTexts(this.ui.root);
      this.screen = "game";
      this.world.centerHome();
      this.world.interactive = true;
      window.clearInterval(this.autosaveTimer);
      this.autosaveTimer = window.setInterval(() => this.saveNow(), AUTOSAVE_MS);
    });
  }

  async startNewGame(): Promise<void> {
    const data = newGameState();
    this.saves.save(data); // lưu ngay khi bắt đầu ván
    this.corruptSave = false;
    await this.enterGame(data);
    this.ui.toast("Kéo sang trái / phải để dạo phố Hoa Sữa");
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

  saveNow(): boolean {
    return this.saves.save(this.state.value);
  }

  async backToMenu(): Promise<void> {
    this.saveNow();
    window.clearInterval(this.autosaveTimer);
    await this.fader.run(() => this.showMenu());
  }
}
