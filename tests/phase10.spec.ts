import { expect, test, type Page } from "@playwright/test";
import { boot, type Safe } from "./helpers";

// PHASE 10 — Kết thúc ngày + thống kê.

const G = (page: Page, fn: string) => page.evaluate(`(() => { const g = window.__gpv, b = g.boot, w = g.world, cs = w.customers, biz = b.biz, t = g.time, s = g.state.value; return ${fn}; })()`) as Promise<any>;
const shot = (info: any, n: string) => `docs/screens/${n}_${info.project.name.replace(/[^\w]+/g, "_")}.png`;

async function newGame(page: Page) {
  await page.locator('[data-menu="new"]').tap();
  await page.locator('[data-panel="start"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(500);
}

/** Bán một ly cho khách mới (giao ly pha sẵn chất lượng q) vào lúc `minute`. */
async function sell(page: Page, recipe: string, q: number, minute: number) {
  const ok = await G(page, `(() => { t.set(s.day, ${minute}); biz.addReady("${recipe}", ${q}); const c = cs.spawn("casual", "${recipe}", false); c.patience = c.max = 999;
    for (let i = 0; i < 200 && c.state !== "waiting"; i++) w.step(0.25); t.set(s.day, ${minute}); b.serveReady(c.uid); return c.state === "leaving"; })()`);
  expect(ok, "Không bán được ly " + recipe).toBe(true);
}

test("Phase 10: tổng kết ngày, sang ngày mới, lịch sử, kết thúc sớm", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe, { life: true });
  await newGame(page);
  const sum = page.locator('[data-name="DaySummary"]');

  // --- một ngày buôn bán: 3 ly cà phê sữa, 1 trà tắc, 1 khách bỏ đi, mua 1 bịch đá ---
  await sell(page, "sua", 3, 7 * 60 + 10);   // 25.000 + tip 3.000 + 1.000
  await sell(page, "sua", 2, 7 * 60 + 40);   // 25.000 + tip 1.000
  await sell(page, "sua", 1, 12 * 60 + 5);   // 25.000
  await sell(page, "tratac", 3, 18 * 60 + 30); // 20.000 + 2.000 + 1.000
  await G(page, "(() => { const c = cs.spawn('shipper', 'den', false); for (let i = 0; i < 200 && c.state !== 'waiting'; i++) w.step(0.25); c.patience = 0.2; w.step(1); })()");
  expect(await G(page, "biz.buy({ ice: 1 })")).toBe(10_000);
  const today = await G(page, "s.today");
  expect([today.cups, today.revenue, today.tips, today.cost, today.lost, today.happy, today.okay]).toEqual([4, 95_000, 8_000, 10_000, 1, 3, 1]);
  expect(today.byRecipe).toEqual({ sua: 3, tratac: 1 });
  expect([today.byHour[1], today.byHour[6], today.byHour[12]]).toEqual([2, 1, 1]);
  expect(today.repStart).toBe(0);

  // --- 24:00: đồng hồ dừng ở 23:59, hiện tổng kết, CHƯA đổi ngày ---
  await G(page, "(cs.clear(), t.set(1, 23 * 60 + 57), w.step(4))");
  await expect(sum).toBeVisible();
  expect(await G(page, "[s.day, s.minuteOfDay, t.ended]")).toEqual([1, 23 * 60 + 59, true]);
  await G(page, "w.step(5)");
  expect(await G(page, "[s.day, s.minuteOfDay]")).toEqual([1, 23 * 60 + 59]);
  await expect(sum).toContainText("Ngày 1 · Thứ Hai");
  await expect(sum.locator('[data-sum="revenue"]')).toContainText("95.000đ");
  await expect(sum.locator('[data-sum="tips"]')).toContainText("8.000đ");
  await expect(sum.locator('[data-sum="cost"]')).toContainText("−10.000đ");
  await expect(sum.locator('[data-sum="profit"]')).toContainText("+93.000đ");
  await expect(sum.locator('[data-sum="cups"]')).toContainText("4");
  await expect(sum.locator('[data-sum="satisfaction"]')).toContainText("60%"); // 3 hài lòng / 5 khách
  await expect(sum.locator('[data-sum="lost"]')).toContainText("1");
  await expect(sum.locator('[data-sum="rep"]')).toContainText("+5"); // +2 +2 +1 +2 −2
  await expect(sum.locator('[data-sum="best"]')).toContainText("Cà phê sữa (3 ly)");
  await expect(sum.locator('[data-sum="hours"] .sum-bar')).toHaveCount(18);
  const bars = await sum.locator('[data-sum="hours"] .sum-bar i').evaluateAll((els) => els.map((e) => [Number((e as HTMLElement).dataset.v), (e as HTMLElement).getBoundingClientRect().height]));
  expect(bars.filter((b) => b[0] > 0).length).toBe(3);
  expect(bars[1][1], "Cột 7h (2 ly) phải cao hơn cột 12h (1 ly)").toBeGreaterThan(bars[6][1]);
  expect(bars[0][1]).toBe(0);
  await expect(sum.locator('[data-sum="history"]')).toHaveCount(0); // ngày đầu chưa có lịch sử
  await expect(sum.locator('[data-panel="stay"]')).toHaveCount(0);  // hết ngày thật thì không có "Bán tiếp"
  const vp = page.viewportSize()!;
  const card = (await sum.locator(".card").boundingBox())!;
  expect(card.y).toBeGreaterThanOrEqual(0);
  expect(card.y + card.height, "Bảng tổng kết tràn màn hình").toBeLessThanOrEqual(vp.height + 0.5);
  await page.screenshot({ path: shot(info, "summary") });

  // --- thoát game khi đang xem tổng kết → vào lại vẫn hiện, không mất ngày ---
  await page.evaluate(() => sessionStorage.setItem("gpv.test.keep", "1"));
  await page.reload();
  await page.waitForFunction(() => (window as any).__gpv?.ready === true, null, { timeout: 60_000 });
  errors.length = 0;
  await page.evaluate(() => { (window as any).__gpv.world.customers.autoSpawn = false; });
  await page.locator('[data-menu="continue"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await expect(sum).toBeVisible();
  await expect(sum.locator('[data-sum="profit"]')).toContainText("+93.000đ");
  expect(await G(page, "s.day")).toBe(1);

  // --- Sang ngày mới: ngày 2, 06:00, số liệu về 0, lịch sử +1, có lưu ---
  const money = await G(page, "s.money");
  await sum.locator('[data-panel="next"]').tap();
  await expect(sum).toBeHidden();
  expect(await G(page, "[s.day, t.ended, s.today, s.money]")).toEqual([2, false, undefined, money]);
  expect(await G(page, "s.minuteOfDay")).toBeLessThan(6 * 60 + 5);
  expect(await G(page, "s.history")).toEqual([{ day: 1, revenue: 95_000, tips: 8_000, cost: 10_000, profit: 93_000, cups: 4 }]);
  await expect(page.locator('[data-name="CalendarPanel"]')).toContainText("Ngày 2");
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("gpv.save")!).state.history.length)).toBe(1);
  // đồng hồ chạy lại
  await G(page, "w.step(4)");
  expect(await G(page, "s.minuteOfDay")).toBeGreaterThan(6 * 60 + 3);

  // --- kết thúc sớm từ bảng Quầy hàng: có "Bán tiếp" ---
  await page.locator('[data-action="stall"]').tap();
  const stall = page.locator('[data-name="Stall"]');
  await G(page, "w.step(15)");
  await expect(stall).toBeVisible();
  await stall.locator('[data-panel="end-day"]').tap();
  await expect(sum).toBeVisible();
  await expect(sum).toContainText("Ngày 2");
  await expect(sum.locator('[data-sum="cups"]')).toContainText("0");
  await expect(sum.locator('[data-sum="satisfaction"]')).toContainText("—");
  await expect(sum.locator('[data-sum="history"] .sum-bar')).toHaveCount(2); // ngày 1 + hôm nay
  await sum.locator('[data-panel="stay"]').tap();
  await expect(sum).toBeHidden();
  expect(await G(page, "[s.day, t.ended]")).toEqual([2, false]);
  // lỗ: mua nhiều hơn bán → lợi nhuận âm, cột đỏ
  const cost: number = await G(page, "biz.buy({ beans: 1 })"); // giá ngày 2 đã dao động so với giá gốc
  expect(cost).toBeGreaterThan(0);
  const vnd = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
  await G(page, "(void b.daySummary(true), 0)"); // không chờ lời hứa — nó chỉ xong khi người chơi bấm nút
  await expect(sum.locator('[data-sum="profit"]')).toContainText("−" + vnd(cost));
  await expect(sum.locator('[data-sum="history"] .sum-bar i.neg')).toHaveCount(1);
  await page.screenshot({ path: shot(info, "summary_loss") });
  await sum.locator('[data-panel="next"]').tap();
  expect(await G(page, "[s.day, s.history.length, s.history[1].profit]")).toEqual([3, 2, -cost]);

  // --- lịch sử tối đa 7 ngày ---
  for (let i = 0; i < 7; i++) {
    await G(page, "(void b.daySummary(true), 0)"); // không chờ lời hứa — nó chỉ xong khi người chơi bấm nút
    await expect(sum).toBeVisible();
    await sum.locator('[data-panel="next"]').tap();
    await expect(sum).toBeHidden();
  }
  const hist = await G(page, "s.history");
  expect(hist.length).toBe(7);
  expect(hist.map((h: any) => h.day)).toEqual([3, 4, 5, 6, 7, 8, 9]);
  expect(await G(page, "s.day")).toBe(10);
  expect(errors, errors.join("\n")).toEqual([]);
});
