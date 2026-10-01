import "./ui/style.css";
import "./screens/screens.css";
import { Boot } from "./app/Boot";
import { DEMO_STATE } from "./core/GameState";

const $ = (id: string) => document.getElementById(id)!;
const boot = new Boot({ app: $("app"), world: $("world"), ui: $("ui"), screens: $("screens") });

// cổng kiểm tra cho test tự động (không ảnh hưởng người chơi)
const hook = {
  boot,
  get state() { return boot.state; },
  get ui() { return boot.ui; },
  get world() { return boot.world; },
  get screen() { return boot.screen; },
  get loadingHistory() { return boot.loading?.history ?? []; },
  ready: false,
  /** test: vào thẳng game với dữ liệu demo của Phase 0 */
  async demo() {
    boot.saves.save(DEMO_STATE);
    await boot.continueGame();
  },
};
(window as unknown as { __gpv: typeof hook }).__gpv = hook;

boot.start().then(() => { hook.ready = true; }).catch((e) => console.error(e));

// PWA: service worker (chỉ bản build, tránh cache khi đang phát triển)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").catch((e) => console.warn("SW:", e));
  });
}
