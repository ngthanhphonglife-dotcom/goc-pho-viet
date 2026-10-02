import type { Page } from "@playwright/test";

export type Safe = { top: number; bottom: number } | undefined;

/** Mở trang, gom mọi lỗi console/mạng, chờ boot xong (đang ở Menu chính). */
export async function boot(page: Page, safe?: Safe, opts: { clear?: boolean; life?: boolean; customers?: boolean } = {}) {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  // ERR_ABORTED = yêu cầu bị huỷ do trang tải lại/chuyển trang (không phải lỗi tải)
  page.on("requestfailed", (r) => { if (r.failure()?.errorText !== "net::ERR_ABORTED") errors.push("request failed: " + r.url() + " " + r.failure()?.errorText); });
  page.on("response", (r) => { if (r.status() >= 400) errors.push(r.status() + " " + r.url()); });
  if (safe) {
    // Chromium không giả lập được env(safe-area-inset-*): đặt thẳng biến CSS như máy có tai thỏ.
    await page.addInitScript(([t, b]) => {
      document.addEventListener("DOMContentLoaded", () => {
        document.documentElement.style.setProperty("--safe-t", t + "px");
        document.documentElement.style.setProperty("--safe-b", b + "px");
      });
    }, [safe.top, safe.bottom]);
  }
  if (opts.clear !== false) await page.addInitScript(() => { if (!sessionStorage.getItem("gpv.test.keep")) localStorage.clear(); });
  await page.goto("./");
  await page.waitForFunction(() => (window as any).__gpv?.ready === true, null, { timeout: 60_000 });
  // Phase 0–2 không cần nhân vật chuyển động (vẽ liên tục rất chậm trên GPU giả lập của máy test)
  // khách tự đến (Phase 8) làm các test cũ khó đoán → mặc định tắt, test nào cần thì tự gọi spawn()
  if (!opts.customers) await page.evaluate(() => { (window as any).__gpv.world.customers.autoSpawn = false; });
  if (!opts.life) await page.evaluate(() => { (window as any).__gpv.world.lifeEnabled = false; });
  await page.waitForTimeout(400);
  return errors;
}

/** Vào thẳng game với dữ liệu demo của ảnh Master (Phase 0). */
export async function enterDemo(page: Page) {
  await page.evaluate(() => (window as any).__gpv.demo());
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(300);
}

export const screen = (page: Page) => page.evaluate(() => (window as any).__gpv.screen as string);
