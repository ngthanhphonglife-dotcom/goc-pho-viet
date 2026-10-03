import { expect, test, type Page } from "@playwright/test";
import { boot, type Safe } from "./helpers";

// PHASE 7 — Kho nguyên liệu, thực đơn, minigame pha chế.

const G = (page: Page, fn: string) => page.evaluate(`(() => { const g = window.__gpv, b = g.boot, biz = b.biz, brew = b.brewPanel, s = g.state.value; return ${fn}; })()`) as Promise<any>;
const shot = (info: any, n: string) => `docs/screens/${n}_${info.project.name.replace(/[^\w]+/g, "_")}.png`;

async function newGame(page: Page) {
  await page.locator('[data-menu="new"]').tap();
  await page.locator('[data-panel="start"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(500);
}

/** Pha một món với kim cố định ở các vị trí `positions` (mỗi bước một vị trí). */
async function brewWith(page: Page, recipe: string, positions: number[]) {
  const stall = page.locator('[data-name="Stall"]');
  if (!(await stall.isVisible())) await page.locator('[data-action="stall"]').tap();
  await expect(stall).toBeVisible();
  await stall.locator(`[data-brew="${recipe}"]`).tap();
  const panel = page.locator('[data-name="Brew"]');
  await expect(panel).toBeVisible();
  for (const pos of positions) {
    await G(page, `(brew.debugPos = ${pos})`);
    await panel.locator('[data-panel="hit"]').tap();
  }
  await G(page, "(brew.debugPos = null)");
  await expect(panel).toBeHidden();
  await expect(stall).toBeVisible(); // pha xong quay lại thực đơn
}

test("Phase 7: kho, thực đơn, pha chế, khay pha sẵn", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe);
  await newGame(page);

  // --- kho khởi đầu ---
  expect(await G(page, "s.stock")).toEqual({ beans: 500, condensed: 400, milk: 0, sugar: 500, ice: 80, tea: 200, kumquat: 30, cup: 50 });
  await page.locator('[data-action="ingredients"]').tap();
  const inv = page.locator('[data-name="Ingredients"]');
  await expect(inv).toBeVisible();
  await expect(inv.locator(".inv-cell")).toHaveCount(8);
  await expect(inv.locator('[data-item="beans"]')).toContainText("500 g");
  await expect(inv.locator('[data-item="milk"]')).toContainText("Hết");
  await expect(inv.locator(".inv-tag")).toHaveCount(1);
  // ô không tràn khỏi bảng, chữ không bị cắt
  const cut = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-name="Ingredients"] .inv-cell')].filter((e) => e.scrollWidth > e.clientWidth + 1).length);
  expect(cut).toBe(0);
  await page.screenshot({ path: shot(info, "ingredients") });
  await inv.locator(".x").tap();
  await expect(inv).toBeHidden();

  // --- thực đơn ---
  await page.locator('[data-action="stall"]').tap();
  const stall = page.locator('[data-name="Stall"]');
  await expect(stall).toBeVisible();
  await expect(stall.locator(".menu-card")).toHaveCount(5);
  await expect(stall.locator('[data-recipe="den"]')).toContainText("25.000đ");
  await expect(stall.locator('[data-recipe="tratac"]')).toContainText("20.000đ");
  await expect(stall.locator('[data-recipe="den"]')).toContainText("Còn pha được 20 ly"); // đá 80 / 4
  await expect(stall.locator('[data-recipe="tratac"]')).toContainText("Còn pha được 10 ly"); // tắc 30 / 3
  await expect(stall.locator(".menu-card.locked")).toHaveCount(2);
  await expect(stall.locator('[data-brew="bacxiu"]')).toHaveCount(0);
  await expect(stall.locator('[data-name="ReadyTray"]')).toContainText("0/6");
  const vp = page.viewportSize()!;
  const card = (await stall.locator(".card").boundingBox())!;
  expect(card.y).toBeGreaterThanOrEqual(0);
  expect(card.y + card.height, "Bảng thực đơn tràn màn hình").toBeLessThanOrEqual(vp.height + 0.5);
  await page.screenshot({ path: shot(info, "stall") });

  // --- pha cà phê sữa: 4 bước đều trúng vùng xanh → Tuyệt hảo ---
  await stall.locator('[data-brew="sua"]').tap();
  const panel = page.locator('[data-name="Brew"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator(".brew-steps li")).toHaveCount(4);
  await expect(panel.locator(".brew-steps li.now")).toHaveText("Cho sữa đặc vào ly");
  // kim thật sự chạy
  const p1 = await G(page, "brew.pos");
  await page.waitForTimeout(350);
  expect(await G(page, "brew.pos")).not.toBe(p1);
  // đang pha thì đồng hồ dừng
  await page.screenshot({ path: shot(info, "brew") });
  await G(page, "(brew.debugPos = 0.5)");
  for (let i = 0; i < 4; i++) {
    expect((await G(page, "brew.state")).step).toBe(i);
    await panel.locator('[data-panel="hit"]').tap();
  }
  await G(page, "(brew.debugPos = null)");
  await expect(panel).toBeHidden();
  expect(await G(page, "s.ready")).toEqual([{ recipe: "sua", quality: 3 }]);
  expect(await G(page, "[s.stock.beans, s.stock.condensed, s.stock.ice, s.stock.cup, s.stock.sugar]")).toEqual([480, 370, 76, 49, 500]);
  await expect(page.locator(".toast")).toContainText("Tuyệt hảo");
  await expect(stall.locator('[data-name="ReadyTray"]')).toContainText("1/6");
  await expect(stall.locator(".tray-chip.q3")).toHaveCount(1);

  // --- lệch tay → chất lượng thấp hơn ---
  await brewWith(page, "den", [0.5, 0.3, 0.02, 0.98]); // 2 + 1 + 0 + 0 = 3/8 → Tạm được
  await brewWith(page, "tratac", [0.5, 0.5, 0.3, 0.3]); // 6/8 → Tuyệt hảo
  await brewWith(page, "den", [0.3, 0.3, 0.3, 0.5]); // 5/8 → Ngon
  expect((await G(page, "s.ready")).map((c: any) => c.quality)).toEqual([3, 1, 3, 2]);
  expect(await G(page, "[s.stock.tea, s.stock.kumquat, s.stock.sugar]")).toEqual([192, 27, 500 - 15 - 20]);

  // --- huỷ giữa chừng: không mất nguyên liệu, không thêm ly ---
  const before = await G(page, "JSON.stringify([s.stock, s.ready])");
  await stall.locator('[data-brew="sua"]').tap();
  await G(page, "(brew.debugPos = 0.5)");
  await panel.locator('[data-panel="hit"]').tap();
  await panel.locator('[data-panel="cancel"]').tap();
  await G(page, "(brew.debugPos = null)");
  await expect(panel).toBeHidden();
  expect(await G(page, "JSON.stringify([s.stock, s.ready])")).toBe(before);
  await expect(stall).toBeVisible();

  // --- khay đầy → khoá nút pha ---
  await brewWith(page, "sua", [0.5, 0.5, 0.5, 0.5]);
  await brewWith(page, "sua", [0.5, 0.5, 0.5, 0.5]);
  expect((await G(page, "s.ready")).length).toBe(6);
  await expect(stall.locator('[data-name="ReadyTray"]')).toContainText("6/6");
  await expect(stall.locator('[data-brew="sua"]')).toBeDisabled();
  await expect(stall.locator('[data-brew="den"]')).toBeDisabled();
  expect(await G(page, "biz.finishBrew(biz.recipe('den'), 3)"), "Khay đầy vẫn pha thêm được").toBe(false);

  // --- hết nguyên liệu → "Thiếu nguyên liệu", nút khoá; "Sắp hết" hiện đúng ---
  await stall.locator(".x").tap();
  await G(page, "(g.state.update((d) => { d.ready = []; d.stock.kumquat = 2; d.stock.beans = 90; }))");
  await page.locator('[data-action="stall"]').tap();
  await expect(stall.locator('[data-recipe="tratac"]')).toContainText("Thiếu nguyên liệu");
  await expect(stall.locator('[data-brew="tratac"]')).toBeDisabled();
  await expect(stall.locator('[data-brew="den"]')).toBeEnabled();
  await expect(stall.locator('[data-recipe="den"]')).toContainText("Còn pha được 4 ly");
  await stall.locator(".x").tap();
  await page.locator('[data-action="ingredients"]').tap();
  await expect(inv.locator('[data-item="beans"] .inv-tag')).toHaveText("Sắp hết");
  await expect(inv.locator('[data-item="kumquat"] .inv-tag')).toHaveText("Sắp hết");
  // nút đi mua → bảng Cửa hàng (Phase 9)
  await inv.locator('[data-panel="shop"]').tap();
  await expect(inv).toBeHidden();
  await expect(page.locator('[data-name="Shop"]')).toBeVisible(); // Phase 9: bảng mua hàng thật
  await page.locator('[data-name="Shop"] .x').tap();
  await expect(page.locator('[data-name="Shop"]')).toBeHidden();

  // --- lưu → mở lại ---
  await G(page, "biz.finishBrew(biz.recipe('den'), 2)");
  expect(await G(page, "b.saveNow()")).toBe(true);
  await page.evaluate(() => sessionStorage.setItem("gpv.test.keep", "1"));
  await page.reload();
  await page.waitForFunction(() => (window as any).__gpv?.ready === true, null, { timeout: 60_000 });
  errors.length = 0;
  await page.evaluate(() => { (window as any).__gpv.world.lifeEnabled = false; });
  await page.locator('[data-menu="continue"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(400);
  expect(await G(page, "[s.stock.beans, s.stock.kumquat, s.ready]")).toEqual([70, 2, [{ recipe: "den", quality: 2 }]]);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("Phase 7: save cũ chưa có kho, chạm xe cà phê, về menu khi đang pha", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe);
  // save kiểu Phase 6 (không có stock/ready) → vào game tự có kho khởi đầu
  await page.evaluate(() => {
    const old = { version: 1, savedAt: new Date().toISOString(), state: { day: 4, minuteOfDay: 500, weather: { label: "Nắng nhẹ", temperatureC: 28, icon: "sun" }, money: 900000, reputation: 7, quests: [] } };
    localStorage.setItem("gpv.save", JSON.stringify(old));
    sessionStorage.setItem("gpv.test.keep", "1");
  });
  await page.reload();
  await page.waitForFunction(() => (window as any).__gpv?.ready === true, null, { timeout: 60_000 });
  errors.length = 0;
  await page.evaluate(() => { (window as any).__gpv.world.lifeEnabled = false; });
  await page.locator('[data-menu="continue"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(400);
  expect(await G(page, "[s.stock.beans, s.ready.length, s.money]")).toEqual([500, 0, 900000]);

  // chạm xe cà phê trên phố → mở Quầy hàng
  await page.evaluate(() => { const w = (window as any).__gpv.world; w.interact({ kind: "hotspot", h: w.hotspots.find((h: any) => h.id === "cart"), name: "" }); });
  const stall = page.locator('[data-name="Stall"]');
  await expect(stall).toBeVisible();

  // đang pha mà về menu → không trừ nguyên liệu, không mở lại bảng
  await stall.locator('[data-brew="den"]').tap();
  await expect(page.locator('[data-name="Brew"]')).toBeVisible();
  await page.evaluate(() => void (window as any).__gpv.boot.backToMenu());
  await page.waitForFunction(() => (window as any).__gpv.screen === "menu");
  await page.waitForTimeout(500);
  await expect(page.locator('[data-name="Brew"]')).toBeHidden();
  await expect(stall).toBeHidden();
  expect(await G(page, "[s.stock.beans, s.ready.length]")).toEqual([500, 0]);
  expect(errors, errors.join("\n")).toEqual([]);
});
