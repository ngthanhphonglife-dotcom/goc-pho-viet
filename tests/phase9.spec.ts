import { expect, test, type Page } from "@playwright/test";
import { boot, type Safe } from "./helpers";

// PHASE 9 — Tạp hoá Cô Ba (+ âm thanh hiệu ứng và hình khách riêng của bản 0.8.2).

const G = (page: Page, fn: string) => page.evaluate(`(() => { const g = window.__gpv, b = g.boot, w = g.world, biz = b.biz, s = g.state.value; return ${fn}; })()`) as Promise<any>;
const shot = (info: any, n: string) => `docs/screens/${n}_${info.project.name.replace(/[^\w]+/g, "_")}.png`;
const BASE: Record<string, number> = { beans: 60000, condensed: 25000, milk: 28000, sugar: 20000, ice: 10000, tea: 30000, kumquat: 15000, cup: 25000 };

async function newGame(page: Page) {
  await page.locator('[data-menu="new"]').tap();
  await page.locator('[data-panel="start"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(500);
}

test("Phase 9: mua nguyên liệu, giá theo ngày, giờ mở cửa", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe);
  await newGame(page);
  const shop = page.locator('[data-name="Shop"]');

  // --- ngày 1: đúng giá gốc ---
  await page.locator('[data-action="shop"]').tap();
  await expect(shop).toBeVisible();
  await expect(shop.locator(".shop-row")).toHaveCount(8);
  await expect(shop.locator('[data-pack="beans"]')).toContainText("60.000đ");
  await expect(shop.locator('[data-pack="beans"]')).toContainText("Gói 500 g · còn 500 g");
  await expect(shop.locator('[data-pack="milk"] .shop-have')).toContainText("hết");
  await expect(shop.locator(".shop-price.up, .shop-price.down")).toHaveCount(0);
  await expect(shop.locator(".shop-money")).toContainText("1.000.000đ");
  const buy = shop.locator('[data-panel="buy"]');
  await expect(buy).toBeDisabled(); // giỏ trống
  const vp = page.viewportSize()!;
  const card = (await shop.locator(".card").boundingBox())!;
  expect(card.y).toBeGreaterThanOrEqual(0);
  expect(card.y + card.height, "Bảng mua hàng tràn màn hình").toBeLessThanOrEqual(vp.height + 0.5);
  for (const q of ["plus", "minus"]) {
    const bb = (await shop.locator(`[data-pack="ice"] [data-qty="${q}"]`).boundingBox())!;
    expect(Math.min(bb.width, bb.height), "Nút +/− quá nhỏ").toBeGreaterThanOrEqual(30);
  }

  // --- nút + / − và tổng tiền ---
  const plus = (id: string) => shop.locator(`[data-pack="${id}"] [data-qty="plus"]`);
  await plus("milk").tap();
  await plus("ice").tap();
  await plus("ice").tap();
  await plus("ice").tap();
  await shop.locator('[data-pack="ice"] [data-qty="minus"]').tap();
  await shop.locator('[data-pack="tea"] [data-qty="minus"]').tap(); // không xuống dưới 0
  await expect(shop.locator('[data-pack="ice"] [data-qty="value"]')).toHaveText("2");
  await expect(shop.locator('[data-pack="tea"] [data-qty="value"]')).toHaveText("0");
  await expect(shop.locator(".shop-total")).toContainText("48.000đ");
  await expect(buy).toBeEnabled();
  await page.screenshot({ path: shot(info, "shop") });

  // --- mua: trừ tiền, cộng kho, ghi chi phí, giỏ về 0 ---
  await buy.tap();
  expect(await G(page, "[s.money, s.stock.milk, s.stock.ice, s.today.cost]")).toEqual([952_000, 1000, 160, 48_000]);
  await expect(page.locator('[data-name="MoneyPanel"]')).toContainText("952.000đ");
  await expect(page.locator(".toast")).toContainText("48.000đ");
  await expect(shop.locator('[data-pack="ice"] [data-qty="value"]')).toHaveText("0");
  await expect(shop.locator('[data-pack="milk"]')).toContainText("còn 1000 ml");
  await expect(buy).toBeDisabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("gpv.save")!).state.money)).toBe(952_000);

  // --- không đủ tiền → khoá ---
  await G(page, "g.state.update((d) => { d.money = 50_000; })");
  await plus("beans").tap();
  await expect(shop.locator(".shop-total")).toContainText("60.000đ");
  await expect(buy).toBeDisabled();
  await expect(buy).toContainText("Không đủ tiền");
  expect(await G(page, "biz.buy({ beans: 1 })"), "Thiếu tiền vẫn mua được").toBe(0);
  expect(await G(page, "s.money")).toBe(50_000);
  await shop.locator(".x").tap();
  await expect(shop).toBeHidden();

  // --- giá các ngày sau: cố định theo ngày, trong ±15%, bội số 500, có ngày tăng có ngày giảm ---
  const prices = await page.evaluate(() => { const m = (window as any).__gpv; return [2, 3, 4, 5, 6, 7, 8, 9].map((d) => { m.state.update((s: any) => { s.day = d; s.money = 5_000_000; }); return Object.fromEntries(["beans", "condensed", "milk", "sugar", "ice", "tea", "kumquat", "cup"].map((id) => [id, m.boot.biz.cartTotal({ [id]: 1 })])); }); });
  let up = 0, down = 0;
  for (const day of prices) for (const [id, p] of Object.entries(day) as [string, number][]) {
    expect(p % 500).toBe(0);
    expect(p).toBeGreaterThanOrEqual(BASE[id] * 0.85 - 250);
    expect(p).toBeLessThanOrEqual(BASE[id] * 1.15 + 250);
    if (p > BASE[id]) up++; else if (p < BASE[id]) down++;
  }
  expect(up).toBeGreaterThan(5);
  expect(down).toBeGreaterThan(5);
  await G(page, "g.state.update((d) => { d.day = 5; })");
  const again = await G(page, "biz.cartTotal({ beans: 1, tea: 2 })");
  expect(again).toBe(prices[3].beans + 2 * prices[3].tea);
  await page.locator('[data-action="addMoney"]').tap(); // nút "+" cạnh tiền cũng mở tạp hoá
  await expect(shop).toBeVisible();
  expect(await shop.locator(".shop-price.up, .shop-price.down").count()).toBeGreaterThan(0);
  await shop.locator(".x").tap();
  await expect(shop).toBeHidden();

  // --- đóng cửa sau 21:00 ---
  await G(page, "g.time.set(5, 21 * 60 + 10)");
  await page.locator('[data-action="shop"]').tap();
  await expect(page.locator(".toast")).toContainText("đóng cửa");
  await page.waitForTimeout(300);
  await expect(shop).toBeHidden();
  await G(page, "g.time.set(5, 9 * 60)");

  // --- lưu → mở lại giữ kho ---
  expect(await G(page, "b.saveNow()")).toBe(true);
  await page.evaluate(() => sessionStorage.setItem("gpv.test.keep", "1"));
  await page.reload();
  await page.waitForFunction(() => (window as any).__gpv?.ready === true, null, { timeout: 60_000 });
  errors.length = 0;
  await page.evaluate(() => { const w = (window as any).__gpv.world; w.lifeEnabled = false; w.customers.autoSpawn = false; });
  await page.locator('[data-menu="continue"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  expect(await G(page, "[s.stock.milk, s.stock.ice]")).toEqual([1000, 160]);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("Phase 9: đi tới tiệm rồi mới mở; âm thanh hiệu ứng; hình khách riêng", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe, { life: true });
  await newGame(page);
  const shop = page.locator('[data-name="Shop"]');

  // --- đang ở quầy bấm Cửa hàng → đi tới tiệm Cô Ba rồi bảng mới mở ---
  await page.locator('[data-action="shop"]').tap();
  await page.waitForTimeout(200);
  await expect(shop).toBeHidden();
  expect(await G(page, "(w.step(0.4), w.player.moving)")).toBe(true);
  await G(page, "w.step(15)");
  await expect(shop).toBeVisible();
  const d = await G(page, "(() => { const h = w.hotspots.find((h) => h.id === 'coba'); return Math.hypot(h.stand[0] - w.player.pos.x, h.stand[1] - w.player.pos.y); })()");
  expect(d, "Chưa tới tiệm mà bảng đã mở").toBeLessThan(110); // Cô Ba đứng ngay chỗ đó nên chủ quầy đứng cạnh
  await shop.locator(".x").tap();
  // đã đứng ở tiệm → mở ngay
  await page.locator('[data-action="shop"]').tap();
  await expect(shop).toBeVisible();
  await shop.locator(".x").tap();
  await expect(shop).toBeHidden();
  // nói chuyện với Cô Ba → "Con muốn mua ít nguyên liệu" → mở bảng
  await G(page, `(() => { w.interact({ kind: "char", c: w.life.get("coba"), name: "" }); for (let i = 0; i < 60 && !g.dialogue.state.open; i++) w.step(0.5); g.dialogue.advance(); g.dialogue.choose(2); })()`);
  await expect(shop).toBeVisible();

  // --- âm thanh: mua hàng, bấm nút, mở/đóng bảng ---
  const log = () => G(page, "g.sfx.log.slice()") as Promise<string[]>;
  await shop.locator('[data-pack="ice"] [data-qty="plus"]').tap();
  await shop.locator('[data-panel="buy"]').tap();
  let l = await log();
  expect(l).toContain("tap");
  expect(l).toContain("open");
  expect(l).toContain("buy");
  await shop.locator(".x").tap();
  expect(await log()).toContain("close");

  // --- khách: hình riêng theo loại, không trùng hàng xóm có tên ---
  const looks = await G(page, `(() => { const out = {}; for (const t of ["office", "student", "shipper", "casual"]) { out[t] = []; for (let i = 0; i < 14; i++) { const c = w.customers.spawn(t, "den", true); out[t].push(c.look); w.customers.clear(); } } return out; })()`);
  for (const [t, prefix] of [["office", "kh_vp"], ["student", "kh_hs"], ["shipper", "kh_ship"], ["casual", "kh_dl"]]) {
    expect(looks[t].every((x: string) => x.startsWith(prefix)), `${t}: ${looks[t]}`).toBe(true);
    expect(new Set(looks[t]).size, `${t} chỉ có một kiểu hình`).toBeGreaterThanOrEqual(2);
  }
  expect(await G(page, "w.stats.textures.filter((t) => t.name.startsWith('char:kh_')).length")).toBe(9);

  // --- âm thanh bán hàng: khách tới (chuông), pha chế, tiền ---
  await G(page, `(() => { const c = w.customers.spawn("office", "sua", false); for (let i = 0; i < 200 && c.state !== "waiting"; i++) w.step(0.25); })()`);
  await page.screenshot({ path: shot(info, "customer_new") });
  await page.locator('[data-action="sell"]').tap();
  await G(page, "w.step(15)");
  const orders = page.locator('[data-name="Orders"]');
  await expect(orders).toBeVisible();
  await orders.locator('[data-serve="brew"]').tap();
  const brew = page.locator('[data-name="Brew"]');
  await expect(brew).toBeVisible();
  for (const pos of [0.5, 0.3, 0.02, 0.5]) { await G(page, `(b.brewPanel.debugPos = ${pos})`); await brew.locator('[data-panel="hit"]').tap(); }
  await G(page, "(b.brewPanel.debugPos = null)");
  await expect(brew).toBeHidden();
  l = await log();
  for (const n of ["arrive", "perfect", "good", "miss", "done", "coin"]) expect(l, `Thiếu âm "${n}"`).toContain(n);

  // --- tắt âm lượng Hiệu ứng → không phát ---
  await G(page, "(b.settings.set({ sfx: 0 }), g.sfx.log.length = 0)");
  await page.locator('[data-action="map"]').tap();
  await page.waitForTimeout(250);
  l = await log();
  expect(l.length).toBeGreaterThan(0);
  expect(l.every((x) => x.startsWith("muted:")), "Âm lượng 0 mà vẫn phát").toBe(true);
  expect(errors, errors.join("\n")).toEqual([]);
});
