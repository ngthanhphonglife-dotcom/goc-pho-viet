import { expect, test, type Page } from "@playwright/test";
import { boot, type Safe } from "./helpers";

// PHASE 11 — Uy tín & Tiến trình.

const G = (page: Page, fn: string) => page.evaluate(`(() => { const g = window.__gpv, b = g.boot, w = g.world, cs = w.customers, biz = b.biz, t = g.time, st = g.state, s = g.state.value; return ${fn}; })()`) as Promise<any>;
const shot = (info: any, n: string) => `docs/screens/${n}_${info.project.name.replace(/[^\w]+/g, "_")}.png`;

async function newGame(page: Page) {
  await page.locator('[data-menu="new"]').tap();
  await page.locator('[data-panel="start"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(500);
}

/** Bán một ly pha sẵn chất lượng q cho khách mới. */
async function sell(page: Page, recipe: string, q = 3) {
  const ok = await G(page, `(() => { biz.addReady("${recipe}", ${q}); const c = cs.spawn("casual", "${recipe}", false); c.patience = c.max = 999;
    for (let i = 0; i < 200 && c.state !== "waiting"; i++) w.step(0.25); b.serveReady(c.uid); return c.state === "leaving"; })()`);
  expect(ok, "Không bán được ly " + recipe).toBe(true);
}

async function inView(page: Page, name: string) {
  const vp = page.viewportSize()!;
  const card = (await page.locator(`[data-name="${name}"] .card`).boundingBox())!;
  expect(card.y).toBeGreaterThanOrEqual(0);
  expect(card.y + card.height, `Bảng ${name} tràn màn hình`).toBeLessThanOrEqual(vp.height + 0.5);
}

test("Phase 11: cấp uy tín, mở khoá, chuỗi nhiệm vụ chính, nhiệm vụ hằng ngày", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe, { life: true });
  await newGame(page);
  const up = page.locator('[data-name="LevelUp"]');
  const done = page.locator('[data-name="QuestDone"]');
  const repPanel = page.locator('[data-name="Reputation"]');
  const stall = page.locator('[data-name="Stall"]');
  const log = page.locator('[data-name="QuestLog"]');

  // --- mốc cấp ---
  expect(await G(page, "[0, 29, 30, 79, 80, 159, 160, 279, 280, 9999].map(g.rep.levelOf)")).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  expect(await G(page, "[1, 2, 3, 5].map((l) => g.rep.customerTypes(l).length)")).toEqual([2, 3, 4, 4]);

  // --- Lv.1: Bạc xỉu, Trà đào còn khoá; khách không gọi món chưa mở; chỉ có khách ghé quán + học sinh ---
  expect(await G(page, "[biz.level, s.repLevel]")).toEqual([1, 1]);
  expect(await G(page, "cs.types().sort()")).toEqual(["casual", "student"]);
  expect(await G(page, "[...new Set(Array.from({ length: 300 }, () => b.pickRecipe('student')))].sort()")).toEqual(["den", "sua", "tratac"]);
  await page.locator('[data-action="stall"]').tap();
  await expect(stall.locator(".menu-card.locked")).toHaveCount(2);
  await expect(stall.locator('[data-recipe="bacxiu"]')).toContainText("Mở ở uy tín Lv.2");
  await expect(stall.locator('[data-recipe="tradao"]')).toContainText("Mở ở uy tín Lv.3");
  await stall.locator(".btn.x").tap();

  // --- bảng Uy tín (chạm ô ngôi sao trên HUD) ---
  await page.locator('[data-name="ReputationPanel"]').tap();
  await expect(repPanel).toBeVisible();
  await expect(repPanel).toContainText("Lv.1 — Quán mới");
  await expect(repPanel.locator('[data-rep="next"]')).toContainText("Còn 30 điểm nữa lên Lv.2");
  await expect(repPanel.locator(".rep-row")).toHaveCount(5);
  await expect(repPanel.locator(".rep-row.got")).toHaveCount(1);
  await inView(page, "Reputation");
  await repPanel.locator('[data-panel="close"]').tap();

  // --- vượt mốc 30 → bảng Lên cấp, mở Bạc xỉu + khách văn phòng ---
  await G(page, "st.update({ reputation: 29 })");
  await sell(page, "sua");
  await expect(up).toBeVisible();
  await expect(up).toContainText("Lv.2 — Được biết đến");
  await expect(up).toContainText("Bạc xỉu");
  await inView(page, "LevelUp");
  await page.screenshot({ path: shot(info, "levelup") });
  await up.locator('[data-panel="ok"]').tap();
  await expect(up).toBeHidden();
  expect(await G(page, "[biz.level, s.repLevel, s.reputation]")).toEqual([2, 2, 31]);
  expect(await G(page, "cs.types().sort()")).toEqual(["casual", "office", "student"]);
  expect(await G(page, "biz.openRecipes.map((r) => r.id)")).toEqual(["den", "sua", "tratac", "bacxiu"]);
  await G(page, "cs.clear()");
  await page.locator('[data-action="stall"]').tap();
  await expect(stall.locator(".menu-card.locked")).toHaveCount(1);
  await expect(stall.locator('[data-brew="bacxiu"]')).toBeDisabled(); // chưa có sữa tươi
  await stall.locator(".btn.x").tap();

  // --- mất điểm không tụt cấp ---
  await G(page, "st.update({ reputation: 10 })");
  expect(await G(page, "[biz.level, biz.isLocked(biz.recipe('bacxiu'))]")).toEqual([2, false]);

  // --- chuỗi nhiệm vụ chính: xong "Bán 20 ly" → tự nhận "Đạt 30 uy tín" → xong → tự nhận "Bán 10 ly Bạc xỉu" ---
  await G(page, "st.update((d) => { d.quests.find((q) => q.id === 'sell-20-coffee').current = 19; })");
  await sell(page, "sua"); // uy tín 10 + 2
  await expect(done).toBeVisible();
  await expect(done).toContainText("Bán 20 ly cà phê");
  await done.locator('[data-panel="claim"]').tap();
  await expect(done).toBeHidden();
  expect(await G(page, "[b.quests.isDone('sell-20-coffee'), b.quests.isActive('rep-30'), s.reputation, s.quests.find((q) => q.id === 'rep-30').current]")).toEqual([true, true, 22, 22]);
  await G(page, "(cs.clear(), st.update({ reputation: 28 }))");
  await sell(page, "sua"); // 28 + 2 = 30 → đủ
  await expect(done).toBeVisible();
  await expect(done).toContainText("Đạt 30 uy tín");
  await done.locator('[data-panel="claim"]').tap();
  await expect(done).toBeHidden();
  expect(await G(page, "[b.quests.isDone('rep-30'), b.quests.isActive('sell-bacxiu-10'), s.reputation]")).toEqual([true, true, 32]);
  await expect(up).toBeHidden(); // đã Lv.2 rồi, không hiện lại
  await G(page, "cs.clear()");

  // --- nhiệm vụ hằng ngày: 3 việc cố định theo ngày, đếm tiến độ, nhận thưởng một lần ---
  const daily = await G(page, "b.daily.items.map((q) => ({ ...q }))");
  expect(daily.length).toBe(3);
  expect(daily.map((q: any) => q.id)).toEqual(await G(page, "g.makeDaily(1, 2).map((q) => q.id)"));
  const cups = daily.find((q: any) => q.key === "sell-any");
  if (cups) expect(cups.current).toBe(3); // đã bán 3 ly
  const rev = daily.find((q: any) => q.key === "revenue");
  if (rev) expect(rev.current).toBe(75_000);
  const first = daily[0];
  await G(page, `st.update(() => { const q = b.daily.items[0]; q.current = q.target; })`);
  const money0 = await G(page, "s.money");
  await page.locator('[data-action="quests"]').tap();
  await expect(log).toBeVisible();
  await expect(log.locator(".daily-card")).toHaveCount(3);
  await expect(log.locator(".q-kind.main")).toHaveCount(1);
  await expect(log.locator(`[data-claim="${first.id}"]`)).toBeEnabled();
  await expect(log.locator(".daily-card .btn:disabled")).toHaveCount(2);
  await inView(page, "QuestLog");
  await page.screenshot({ path: shot(info, "daily") });
  await log.locator(`[data-claim="${first.id}"]`).tap();
  await expect(log.locator(`[data-daily="${first.id}"]`)).toContainText("Đã nhận");
  expect(await G(page, "s.money")).toBe(money0 + first.money);
  expect(await G(page, `b.daily.claim("${first.id}")`)).toBeNull(); // không nhận hai lần
  expect(await G(page, "s.money")).toBe(money0 + first.money);
  await log.locator('[data-panel="close"]').tap();

  // --- sang ngày mới: bộ nhiệm vụ khác, tiến độ về 0 ---
  await G(page, "t.set(2, 6 * 60)");
  const day2 = await G(page, "b.daily.items.map((q) => ({ ...q }))");
  expect(await G(page, "s.daily.day")).toBe(2);
  expect(day2.every((q: any) => q.current === 0 && !q.claimed)).toBe(true);
  expect(day2.map((q: any) => q.id)).toEqual(await G(page, "g.makeDaily(2, 2).map((q) => q.id)"));

  // --- nhảy nhiều cấp: hiện lần lượt Lv.3 rồi Lv.4; mở Trà đào + shipper; Lv.4 tip thêm 1.000đ ---
  await G(page, "(st.update({ reputation: 170 }), void b.progress())");
  await expect(up).toContainText("Lv.3 — Quen thuộc");
  await expect(up).toContainText("Trà đào");
  await up.locator('[data-panel="ok"]').tap();
  await expect(up).toContainText("Lv.4 — Đông khách");
  await up.locator('[data-panel="ok"]').tap();
  await expect(up).toBeHidden();
  expect(await G(page, "[biz.level, cs.types().length, biz.openRecipes.length]")).toEqual([4, 4, 5]);
  const m1 = await G(page, "s.money");
  await sell(page, "sua"); // 25.000 + tip 3.000 + 1.000 (giao nhanh) + 1.000 (Lv.4)
  expect(await G(page, "s.money")).toBe(m1 + 30_000);
  await G(page, "cs.clear()");
  await page.locator('[data-name="ReputationPanel"]').tap();
  await expect(repPanel).toContainText("Lv.4 — Đông khách");
  await expect(repPanel.locator(".rep-row.got")).toHaveCount(4);
  await inView(page, "Reputation");
  await page.screenshot({ path: shot(info, "reputation") });
  await repPanel.locator('[data-panel="close"]').tap();

  // --- lưu / tải lại: giữ cấp, nhiệm vụ, không hiện lại bảng lên cấp ---
  const before = await G(page, "(b.saveNow(), [s.repLevel, s.reputation, s.daily.day, s.quests.map((q) => q.id).join()])");
  await page.evaluate(() => sessionStorage.setItem("gpv.test.keep", "1"));
  await page.reload();
  await page.waitForFunction(() => (window as any).__gpv?.ready === true, null, { timeout: 60_000 });
  await page.evaluate(() => { (window as any).__gpv.world.customers.autoSpawn = false; });
  await page.locator('[data-menu="continue"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(800);
  expect(await G(page, "[s.repLevel, s.reputation, s.daily.day, s.quests.map((q) => q.id).join()]")).toEqual(before);
  await expect(up).toBeHidden();

  // --- save cũ (chưa có cấp) có 35 uy tín → vào game là Lv.2, không hiện bảng lên cấp ---
  await G(page, "g.demo()");
  await page.waitForTimeout(800);
  expect(await G(page, "[s.reputation, s.repLevel, biz.level]")).toEqual([35, 2, 2]);
  await expect(up).toBeHidden();
  expect(errors, errors.join("\n")).toEqual([]);
});
