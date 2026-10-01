import "./ui/style.css";
import { DEMO_STATE, GameState } from "./core/GameState";
import { MasterUI, fitTexts } from "./ui/MasterUI";
import { World } from "./world/World";

const state = new GameState(DEMO_STATE);

async function start(): Promise<void> {
  // chờ font tiếng Việt nạp xong để đo chữ chính xác (tránh nhảy chữ)
  await Promise.all([document.fonts.load('700 32px "Be Vietnam Pro"'), document.fonts.load('500 32px "Be Vietnam Pro"')]);
  const ui = new MasterUI(document.getElementById("ui")!, state);
  window.addEventListener("resize", () => fitTexts(ui.root));

  const world = new World();
  await world.init(document.getElementById("world")!);

  // cổng kiểm tra cho test tự động
  (window as unknown as { __gpv: unknown }).__gpv = { state, ui, world, ready: true };
}

start().catch((e) => {
  console.error(e);
});

// PWA: service worker (chỉ bản build, tránh cache khi đang phát triển)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").catch((e) => console.warn("SW:", e));
  });
}
