import { expect, test, type Page } from "@playwright/test";
import { boot, type Safe } from "./helpers";

// PHASE 8 — Khách hàng + đơn hàng.

const G = (page: Page, fn: string) => page.evaluate(`(() => { const g = window.__gpv, b = g.boot, w = g.world, cs = w.customers, biz = b.biz, brew = b.brewPanel, s = g.state.value; return ${fn}; })()`) as Promise<any>;
const shot = (info: any, n: string) => `docs/screens/${n}_${info.project.name.replace(/[^\w]+/g, "_")}.png`;

async function newGame(page: Page) {
  await page.locator('[data-menu="new"]').tap();
  await page.locator('[data-panel="start"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(500);
}

/** Thêm khách rồi tua tới khi người đó đứng chờ. Trả về uid. */
async function arrive(page: Page, type: string, recipe: string) {
  const uid = await G(page, `(() => { const c = cs.spawn("${type}", "${recipe}", false); if (!c) return 0; for (let i = 0; i < 200 && c.state !== "waiting"; i++) w.step(0.25); return c.state === "waiting" ? c.uid : -1; })()`);
  expect(uid, "Khách không tới được hàng chờ").toBeGreaterThan(0);
  return uid as number;
}

async function hitAll(page: Page, pos: number) {
  const panel = page.locator('[data-name="Brew"]');
  await expect(panel).toBeVisible();
  await G(page, `(brew.debugPos = ${pos})`);
  for (let i = 0; i < 4; i++) await panel.locator('[data-panel="hit"]').tap();
  await G(page, "(brew.debugPos = null)");
  await expect(panel).toBeHidden();
}

test("Phase 8: khách tới, gọi món, pha ngay / giao ly sẵn, tiền + uy tín + nhiệm vụ", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe, { life: true });
  await newGame(page);
  const orders = page.locator('[data-name="Orders"]');
  const badge = page.locator(".sell-badge");
  await expect(badge).toBeHidden();

  // --- khách đi tới đầu hàng, có bong bóng món ---
  const uid = await arrive(page, "office", "sua");
  const c0 = (await G(page, "cs.snapshot()"))[0];
  expect([c0.state, c0.slot, c0.bubble, c0.recipe]).toEqual(["waiting", 0, true, "sua"]);
  expect(Math.hypot(c0.x - 1720, c0.y - 1592)).toBeLessThan(8);
  await expect(badge).toHaveText("1");
  await page.screenshot({ path: shot(info, "customer") });

  // --- bảng Đơn hàng ---
  await page.locator('[data-action="sell"]').tap();
  await expect(orders).toBeVisible();
  const row = orders.locator(`[data-order="${uid}"]`);
  await expect(row).toContainText("Khách văn phòng");
  await expect(row).toContainText("Cà phê sữa");
  await expect(row).toContainText("25.000đ");
  await expect(row.locator('[data-serve="ready"]')).toBeDisabled(); // khay trống
  await expect(row.locator('[data-serve="brew"]')).toBeEnabled();
  const vp = page.viewportSize()!;
  const card = (await orders.locator(".card").boundingBox())!;
  expect(card.y + card.height).toBeLessThanOrEqual(vp.height + 0.5);
  for (const sel of ['[data-serve="ready"]', '[data-serve="brew"]', '[data-serve="dismiss"]']) expect((await row.locator(sel).boundingBox())!.height).toBeGreaterThanOrEqual(33);
  // mở bảng thì kiên nhẫn dừng
  const p0 = await G(page, "cs.front.patience");
  await G(page, "w.step(5)");
  expect(await G(page, "cs.front.patience")).toBe(p0);
  await page.screenshot({ path: shot(info, "orders") });

  // --- pha ngay, 4 bước chuẩn → Tuyệt hảo: tiền + tip, uy tín +2, trừ nguyên liệu, nhiệm vụ 1/20 ---
  await row.locator('[data-serve="brew"]').tap();
  await hitAll(page, 0.5);
  expect(await G(page, "[s.money, s.reputation]")).toEqual([1_000_000 + 25_000 + 3_000 + 1_000, 2]);
  expect(await G(page, "[s.stock.beans, s.stock.condensed, s.stock.cup, s.ready.length]")).toEqual([480, 370, 49, 0]);
  expect(await G(page, "s.today")).toMatchObject({ cups: 1, revenue: 25_000, tips: 4_000, happy: 1, okay: 0, lost: 0 });
  await expect(page.locator('[data-name="QuestPanel"]')).toContainText("1/20");
  await expect(page.locator('[data-name="MoneyPanel"]')).toContainText("1.029.000đ");
  const gone = (await G(page, "cs.snapshot()"))[0];
  expect([gone.state, gone.mood]).toEqual(["leaving", "happy"]);
  await expect(badge).toBeHidden();
  await expect(orders).toBeHidden(); // hết khách thì không mở lại bảng
  // khách đi khỏi phố rồi biến mất
  await G(page, "w.step(40)");
  expect((await G(page, "cs.snapshot()")).length).toBe(0);

  // --- giao ly pha sẵn: lấy ly ngon nhất, không trừ nguyên liệu ---
  await G(page, "(biz.addReady('tratac', 1), biz.addReady('tratac', 2), biz.addReady('den', 3))");
  const u2 = await arrive(page, "student", "tratac");
  const stock = await G(page, "JSON.stringify(s.stock)");
  await page.locator('[data-action="sell"]').tap();
  await orders.locator(`[data-order="${u2}"] [data-serve="ready"]`).tap();
  expect(await G(page, "JSON.stringify(s.stock)")).toBe(stock);
  expect(await G(page, "s.ready")).toEqual([{ recipe: "tratac", quality: 1 }, { recipe: "den", quality: 3 }]);
  expect(await G(page, "s.today.cups")).toBe(2);
  expect(await G(page, "s.money")).toBe(1_029_000 + 20_000 + 1_000); // ly "Ngon", phục vụ nhanh: tip 1.000
  await expect(page.locator('[data-name="QuestPanel"]')).toContainText("1/20"); // trà tắc không tính vào nhiệm vụ cà phê
  await orders.locator('[data-panel="close"]').tap();

  // --- pha lệch tay → Tạm được: không tip ---
  const u3 = await arrive(page, "shipper", "den");
  const m3 = await G(page, "[s.money, s.reputation]");
  await G(page, `(cs.front.patience = cs.front.max * 0.2)`);
  await page.locator('[data-action="sell"]').tap();
  await G(page, "(biz.takeReady('den'))"); // bỏ ly sẵn để buộc pha
  await orders.locator(`[data-order="${u3}"] [data-serve="brew"]`).tap();
  await hitAll(page, 0.02);
  expect(await G(page, "[s.money, s.reputation]")).toEqual([m3[0] + 25_000, m3[1]]);
  expect((await G(page, "cs.snapshot()")).find((c: any) => c.uid === u3).mood).toBe("meh");
  await expect(page.locator('[data-name="QuestPanel"]')).toContainText("2/20");

  // --- ly thứ 20 → hoàn thành nhiệm vụ ---
  await G(page, "w.step(40)");
  await G(page, "g.state.update((d) => { d.quests.find((q) => q.id === 'sell-20-coffee').current = 19; })");
  const u4 = await arrive(page, "casual", "sua");
  await page.locator('[data-action="sell"]').tap();
  await orders.locator(`[data-order="${u4}"] [data-serve="brew"]`).tap();
  const before = await G(page, "[s.money, s.reputation]");
  await hitAll(page, 0.5);
  const done = page.locator('[data-name="QuestDone"]');
  await expect(done).toBeVisible();
  await expect(done).toContainText("Bán 20 ly cà phê");
  await done.locator('[data-panel="claim"]').tap();
  expect(await G(page, "[s.money, s.reputation]")).toEqual([before[0] + 29_000 + 100_000, before[1] + 2 + 10]);
  expect(await G(page, "g.quests.isDone('sell-20-coffee')")).toBe(true);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("Phase 8: hàng chờ, hết kiên nhẫn, hết món, về quầy, tần suất khách", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe, { life: true });
  await newGame(page);
  const orders = page.locator('[data-name="Orders"]');

  // --- hàng tối đa 6, mỗi người một chỗ ---
  const n = await G(page, "(() => { let n = 0; for (let i = 0; i < 8; i++) { const c = cs.spawn(['office', 'student', 'shipper', 'casual'][i % 4], 'den', i % 2 === 0); if (c) { n++; c.patience = c.max = 999; } } w.step(60); return n; })()");
  expect(n).toBe(6);
  let snap = await G(page, "cs.snapshot()");
  expect(snap.every((c: any) => c.state === "waiting")).toBe(true);
  expect(snap.map((c: any) => c.slot).sort()).toEqual([0, 1, 2, 3, 4, 5]);
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) expect(Math.hypot(snap[i].x - snap[j].x, snap[i].y - snap[j].y), "Hai khách đứng chồng lên nhau").toBeGreaterThan(60);
  await expect(page.locator(".sell-badge")).toHaveText("6");
  await page.screenshot({ path: shot(info, "queue") });

  // --- hết món: khách đầu đi, người sau dồn lên, không mất uy tín ---
  await page.locator('[data-action="sell"]').tap();
  await expect(orders.locator(".ord-row")).toHaveCount(6);
  await expect(orders.locator(".ord-row.front")).toHaveCount(1);
  const first = snap.find((c: any) => c.slot === 0).uid, second = snap.find((c: any) => c.slot === 1).uid;
  await orders.locator(`[data-order="${first}"] [data-serve="dismiss"]`).tap();
  await expect(orders.locator(".ord-row")).toHaveCount(5);
  expect(await G(page, "s.reputation")).toBe(0);
  await orders.locator('[data-panel="close"]').tap();
  await G(page, "w.step(6)");
  expect(await G(page, "cs.front.uid")).toBe(second);

  // --- hết kiên nhẫn: bỏ đi, −2 uy tín (không âm), ghi vào số liệu ngày ---
  await G(page, "g.state.update((d) => { d.reputation = 3; })");
  await G(page, "(cs.front.patience = 0.5, w.step(2))");
  expect(await G(page, "s.reputation")).toBe(1);
  expect(await G(page, "s.today.lost")).toBe(1);
  await expect(page.locator(".toast")).toContainText("bỏ đi");
  await G(page, "(w.step(8), cs.front.patience = 0.5, w.step(2))");
  expect(await G(page, "s.reputation")).toBe(0);

  // --- thiếu nguyên liệu: nút Pha ngay bị khoá ---
  await G(page, "(w.step(8), g.state.update((d) => { d.stock.beans = 5; }))");
  await page.locator('[data-action="sell"]').tap();
  const front = orders.locator(".ord-row.front");
  await expect(front.locator('[data-serve="brew"]')).toBeDisabled();
  await expect(front.locator('[data-serve="brew"]')).toContainText("Thiếu nguyên liệu");
  await orders.locator(".x").tap();
  await G(page, "g.state.update((d) => { d.stock.beans = 500; })");

  // --- đang ở xa bấm Bán hàng → về quầy rồi mới mở bảng ---
  await G(page, "(w.player.setPos(2600, 1700), w.step(0.2))");
  await page.locator('[data-action="sell"]').tap();
  await page.waitForTimeout(200);
  await expect(orders).toBeHidden();
  await G(page, "w.step(15)");
  expect(await G(page, "w.player.atHome")).toBe(true);
  await expect(orders).toBeVisible();
  await orders.locator(".x").tap();

  // --- chạm khách đầu hàng trên phố → mở bảng ---
  const p = await page.evaluate(() => {
    const w = (window as any).__gpv.world, f = w.customers.front.c;
    w.centerOn(f.wx, false);
    const r = document.querySelector("#world canvas")!.getBoundingClientRect();
    const q = w.toScreen(f.wx, f.wy - 150);
    return { x: q.x + r.left, y: q.y + r.top, ok: document.elementFromPoint(q.x + r.left, q.y + r.top)?.tagName === "CANVAS" };
  });
  if (p.ok) {
    await page.mouse.click(p.x, p.y);
    await expect(orders).toBeVisible();
    await orders.locator(".x").tap();
  }

  // --- tần suất: cao điểm > thấp điểm, mưa < nắng, đêm khuya không có khách; tự sinh khách khi bật ---
  const rate = (m: number, k: string, rep = 0) => G(page, `(g.time.forced = "${k}", g.time.set(s.day, ${m}), g.state.update((d) => { d.reputation = ${rep}; }), cs.rate())`);
  const peak = await rate(7 * 60, "sunny"), off = await rate(15 * 60, "sunny"), rain = await rate(7 * 60, "heavyRain"), late = await rate(22 * 60 + 30, "sunny"), famous = await rate(7 * 60, "sunny", 100);
  expect(peak).toBeGreaterThan(off);
  expect(rain).toBeLessThan(peak * 0.5);
  expect(late).toBe(0);
  expect(famous).toBeGreaterThan(peak);
  await G(page, "(cs.clear(), g.time.forced = 'sunny', g.time.set(s.day, 7 * 60), cs.autoSpawn = true, w.step(60))");
  const auto = (await G(page, "cs.snapshot()")).length;
  expect(auto, "Bật tự sinh mà 60 giây cao điểm không có khách").toBeGreaterThanOrEqual(1);
  expect(auto).toBeLessThanOrEqual(6);
  const picks: string[] = await G(page, "Array.from({ length: 60 }, () => b.pickRecipe('student'))");
  expect(picks.every((r) => ["den", "sua", "tratac"].includes(r)), "Khách gọi món chưa mở").toBe(true);
  expect(picks.filter((r) => r === "tratac").length).toBeGreaterThan(picks.filter((r) => r === "den").length);

  // --- sang ngày mới: dọn hàng khách, số liệu ngày về 0 ---
  await G(page, "(cs.autoSpawn = false, g.time.set(s.day, 23 * 60 + 58), w.step(3))");
  await expect(page.locator('[data-name="DaySummary"]')).toBeVisible(); // Phase 10: hết ngày hiện bảng tổng kết trước
  await page.locator('[data-name="DaySummary"] [data-panel="next"]').tap();
  expect((await G(page, "cs.snapshot()")).length).toBe(0);
  expect(await G(page, "s.today")).toBeUndefined();
  await page.waitForTimeout(1200);
  expect(errors, errors.join("\n")).toEqual([]);
});
