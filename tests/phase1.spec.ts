import { expect, test, type Page } from "@playwright/test";
import { boot, screen, type Safe } from "./helpers";

// PHASE 1 — Mở game: Splash → Loading → Menu → Chơi mới/Tiếp tục → Lưu game → Cài đặt.

const shotName = (name: string) => name.replace(/[^\w]+/g, "_");

/** Giữ localStorage qua lần tải lại tiếp theo (helper mặc định xoá để mỗi test sạch). */
async function reloadKeep(page: Page) {
  await page.evaluate(() => sessionStorage.setItem("gpv.test.keep", "1"));
  await page.reload();
  await page.waitForFunction(() => (window as any).__gpv?.ready === true, null, { timeout: 60_000 });
  await page.waitForTimeout(400);
}

async function hitOk(page: Page, sel: string) {
  return page.evaluate((sel) => {
    const b = document.querySelector<HTMLElement>(sel)!;
    const r = b.getBoundingClientRect();
    const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { ok: !!e && b.contains(e), w: r.width, h: r.height, at: e?.className ?? "null" };
  }, sel);
}

test("Phase 1: splash, loading thật, menu đúng bố cục", async ({ page }, info) => {
  const safe = info.project.metadata?.safe as Safe;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.clear());
  if (safe) await page.addInitScript(([t, b]) => {
    document.addEventListener("DOMContentLoaded", () => {
      document.documentElement.style.setProperty("--safe-t", t + "px");
      document.documentElement.style.setProperty("--safe-b", b + "px");
    });
  }, [safe.top, safe.bottom]);
  await page.goto("./");
  // Splash xuất hiện trước với logo
  await expect(page.locator('[data-screen="splash"] .logo')).toBeVisible();
  await page.waitForFunction(() => (window as any).__gpv?.ready === true, null, { timeout: 60_000 });

  // Tiến độ chỉ tăng, kết thúc 100%
  const hist: number[] = await page.evaluate(() => (window as any).__gpv.loadingHistory);
  expect(hist.length).toBeGreaterThan(3);
  for (let i = 1; i < hist.length; i++) expect(hist[i], "Thanh tải bị lùi").toBeGreaterThanOrEqual(hist[i - 1]);
  expect(hist[hist.length - 1]).toBe(100);
  expect(await screen(page)).toBe("menu");
  await expect(page.locator('[data-screen="splash"]')).toHaveCount(0);
  await expect(page.locator('[data-screen="loading"]')).toHaveCount(0);
  await expect(page.locator("#ui")).toBeHidden();

  // Menu: 3 nút, chưa có save → Tiếp tục bị khoá
  const cont = page.locator('[data-menu="continue"]');
  await expect(cont).toBeDisabled();
  await expect(cont).toContainText("Chưa có ván chơi");
  const vp = page.viewportSize()!;
  const top = safe?.top ?? 0, bottom = vp.height - (safe?.bottom ?? 0);
  const rects = await page.evaluate(() => ["new", "continue", "settings"].map((n) => document.querySelector(`[data-menu="${n}"]`)!.getBoundingClientRect().toJSON())
    .concat([document.querySelector(".menu .logo")!.getBoundingClientRect().toJSON()]));
  for (const r of rects) {
    expect(r.left).toBeGreaterThanOrEqual(0);
    expect(r.right).toBeLessThanOrEqual(vp.width);
    expect(r.top, "Ra ngoài vùng an toàn trên").toBeGreaterThanOrEqual(top - 1);
    expect(r.bottom, "Ra ngoài vùng an toàn dưới").toBeLessThanOrEqual(bottom + 1);
  }
  for (let i = 1; i < rects.length; i++) expect(rects[i].top >= rects[i - 1].bottom || rects[i].bottom <= rects[0].top, "Nút menu đè nhau").toBe(true);
  for (const n of ["new", "settings"]) {
    const h = await hitOk(page, `[data-menu="${n}"]`);
    expect(h.ok, `Nút ${n} bị che bởi ${h.at}`).toBe(true);
    expect(h.h, `Nút ${n} thấp hơn 44px`).toBeGreaterThanOrEqual(44);
  }
  const cut = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("#screens .btn")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
  expect(cut, "Chữ nút bị cắt").toEqual([]);
  await page.screenshot({ path: `docs/screens/menu_${shotName(info.project.name)}.png` });
  expect(errors).toEqual([]);
});

test("Phase 1: chơi mới → lưu → tải lại → tiếp tục", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe);
  await page.locator('[data-menu="new"]').tap();
  const panel = page.locator('[data-name="NewGamePanel"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator(".warn")).toBeHidden();
  for (const s of ["Ngày 1", "06:00", "1.000.000đ"]) await expect(panel).toContainText(s);
  await page.screenshot({ path: `docs/screens/newgame_${shotName(info.project.name)}.png` });
  await panel.locator('[data-panel="start"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(500);
  await expect(page.locator("#ui")).toBeVisible();
  const ui = await page.locator("#ui").innerText();
  for (const s of ["Ngày 1", "Thứ Hai", "06:00", "1.000.000đ", "0/20"]) expect(ui, `Thiếu "${s}"`).toContain(s);
  // lưu ngay khi bắt đầu
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("gpv.save")!));
  expect(saved.version).toBe(1);
  expect(saved.state.day).toBe(1);

  // thay đổi tiến độ rồi rời trang (pagehide) → tự lưu
  await page.evaluate(() => { (window as any).__gpv.state.update({ money: 1_234_000, day: 2 }); window.dispatchEvent(new Event("pagehide")); });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("gpv.save")!).state.money)).toBe(1_234_000);

  await reloadKeep(page);
  const cont = page.locator('[data-menu="continue"]');
  await expect(cont).toBeEnabled();
  await expect(cont).toContainText("Ngày 2 · 1.234.000đ");
  await cont.tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(400);
  const ui2 = await page.locator("#ui").innerText();
  expect(ui2).toContain("Ngày 2");
  expect(ui2).toContain("1.234.000đ");

  // Chơi mới khi đã có save → cảnh báo ghi đè
  await page.locator('[data-action="settings"]').tap();
  await page.locator('[data-name="SettingsPanel"] [data-panel="to-menu"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "menu");
  await page.waitForTimeout(400);
  await page.locator('[data-menu="new"]').tap();
  await expect(page.locator('[data-name="NewGamePanel"] .warn')).toBeVisible();
  await expect(page.locator('[data-name="NewGamePanel"] [data-panel="start"]')).toContainText("Bắt đầu lại");
  await page.locator('[data-name="NewGamePanel"] [data-panel="cancel"]').tap();
  await expect(page.locator('[data-name="NewGamePanel"]')).toBeHidden();
  expect(await screen(page)).toBe("menu");
  expect(errors, errors.join("\n")).toEqual([]);
});

test("Phase 1: cài đặt lưu lại, về menu từ game", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe);
  await page.locator('[data-menu="settings"]').tap();
  const panel = page.locator('[data-name="SettingsPanel"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-panel="to-menu"]')).toBeHidden(); // đang ở menu thì không có nút về menu
  await panel.locator('[data-setting="music"]').fill("40");
  await panel.locator('[data-setting="sfx"]').fill("65");
  await panel.locator('[data-setting="vibration"]').tap();
  await expect(panel).toContainText("40%");
  await page.screenshot({ path: `docs/screens/settings_${shotName(info.project.name)}.png` });
  await panel.locator('[data-panel="close"]').tap();
  await expect(panel).toBeHidden();

  await reloadKeep(page);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("gpv.settings")!))).toEqual({ music: 40, sfx: 65, vibration: false });
  await page.locator('[data-menu="settings"]').tap();
  await expect(panel.locator('[data-setting="music"]')).toHaveValue("40");
  await expect(panel.locator('[data-setting="vibration"]')).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();

  // từ game: ⚙ → Về Menu (có lưu)
  await page.locator('[data-menu="new"]').tap();
  await page.locator('[data-panel="start"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.evaluate(() => (window as any).__gpv.state.update({ money: 999_000 }));
  await page.locator('[data-action="settings"]').tap();
  await expect(panel.locator('[data-panel="to-menu"]')).toBeVisible();
  await panel.locator('[data-panel="to-menu"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "menu");
  await page.waitForTimeout(400);
  await expect(page.locator("#ui")).toBeHidden();
  await expect(page.locator('[data-menu="continue"]')).toContainText("999.000đ");
  expect(errors, errors.join("\n")).toEqual([]);
});

test("Phase 1: save hỏng → khôi phục bản dự phòng hoặc báo lỗi", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe);
  // tạo 2 lần lưu để có bản dự phòng
  await page.evaluate(() => {
    const g = (window as any).__gpv;
    g.state.update({ day: 5 });
    g.boot.saveNow();
    g.state.update({ day: 6 });
    g.boot.saveNow();
    localStorage.setItem("gpv.save", "{hỏng");
  });
  await reloadKeep(page);
  await expect(page.locator('[data-menu="continue"]')).toContainText("Ngày 5");
  await page.locator('[data-menu="continue"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await expect(page.locator(".toast")).toContainText("dự phòng");

  // cả hai bản đều hỏng → Tiếp tục khoá, có thông báo
  // (đang trong game: pagehide sẽ tự lưu → làm hỏng dữ liệu ngay khi trang mới bắt đầu, trước khi app đọc)
  await page.addInitScript(() => {
    if (sessionStorage.getItem("gpv.test.corrupt")) return;
    sessionStorage.setItem("gpv.test.corrupt", "1");
    localStorage.setItem("gpv.save", "x");
    localStorage.setItem("gpv.save.bak", "{\"version\":99}");
  });
  await page.reload();
  await page.waitForFunction(() => (window as any).__gpv?.ready === true, null, { timeout: 60_000 });
  await expect(page.locator('[data-menu="continue"]')).toBeDisabled();
  await expect(page.locator(".menu .notice")).toBeVisible();
  // vẫn chơi mới được, không cảnh báo ghi đè vì không còn ván hợp lệ
  await page.locator('[data-menu="new"]').tap();
  await expect(page.locator('[data-name="NewGamePanel"] .warn')).toBeHidden();
  await page.locator('[data-panel="start"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  expect(errors, errors.join("\n")).toEqual([]);
});

test.describe("không service worker", () => {
  // SW phục vụ ảnh từ cache nên page.route không chặn được → tắt SW cho test này
  test.use({ serviceWorkers: "block" });
  test("Phase 1: lỗi mạng khi tải → Thử lại", async ({ page }) => {
  let fail = true;
  await page.route("**/art/world/main.svg", (r) => (fail ? r.abort() : r.continue()));
  await page.addInitScript(() => localStorage.clear());
  await page.goto("./");
  const err = page.locator(".load-error");
  await expect(err).toBeVisible({ timeout: 30_000 });
  await expect(err).toContainText("thử lại");
  fail = false;
  await err.locator(".btn").tap();
  await page.waitForFunction(() => (window as any).__gpv?.ready === true, null, { timeout: 60_000 });
  expect(await screen(page)).toBe("menu");
});
});
