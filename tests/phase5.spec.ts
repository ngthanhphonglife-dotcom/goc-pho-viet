import { expect, test, type Page } from "@playwright/test";
import { boot, enterDemo, type Safe } from "./helpers";

// PHASE 5 — Đồng hồ, ngày/đêm, thời tiết.

const G = (page: Page, fn: string) => page.evaluate(`(() => { const g = window.__gpv, w = g.world, t = g.time, s = g.state.value; return ${fn}; })()`) as Promise<any>;
const lum = (c: number[]) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

test("Phase 5: đồng hồ chạy, ánh sáng theo giờ, đèn đêm, sang ngày mới", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe, { life: true });
  await enterDemo(page);
  await expect(page.locator('[data-name="CalendarPanel"]')).toContainText("06:45");

  // 8 giây thật = 10 phút game; HUD đổi theo
  await G(page, "w.step(8)");
  expect(await G(page, "s.minuteOfDay")).toBeGreaterThanOrEqual(6 * 60 + 54);
  expect(await G(page, "s.minuteOfDay")).toBeLessThanOrEqual(6 * 60 + 56);
  await expect(page.locator('[data-name="CalendarPanel"]')).toContainText("06:55");

  // mở bảng → đồng hồ dừng
  await page.locator('[data-action="weather"]').tap();
  const panel = page.locator('[data-name="WeatherForecast"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator(".sv-row")).toHaveCount(3);
  await expect(panel.locator(".sv-row.now")).toHaveCount(1);
  await expect(panel.locator(".sv-row.now")).toContainText("Sáng");
  await page.waitForTimeout(300);
  const m0 = await G(page, "s.minuteOfDay");
  await G(page, "w.step(5)");
  expect(await G(page, "s.minuteOfDay"), "Đồng hồ phải dừng khi mở bảng").toBe(m0);
  await page.screenshot({ path: `docs/screens/forecast_${info.project.name.replace(/[^\w]+/g, "_")}.png` });
  await panel.locator(".x").tap();
  await expect(panel).toBeHidden();

  // trưa sáng, đêm tối + có đèn, có sao
  const at = async (minute: number) => {
    await G(page, `(t.forced = "sunny", t.set(s.day, ${minute}), w.atmo.set(${minute}, "sunny", true), w.step(0.2))`);
    return G(page, "({ ...w.atmo.shown })");
  };
  const noon = await at(12 * 60);
  expect(noon.tint.every((v: number) => v > 0.98)).toBe(true);
  expect(noon.light).toBe(0);
  await expect(page.locator('[data-name="WeatherPanel"]')).toContainText("Nắng nhẹ");
  const px = await G(page, "(w.setCamera(0), w.samplePixel(w.toScreen(600, 1500).x, w.toScreen(600, 1500).y))");
  const dusk = await at(17 * 60 + 45);
  expect(dusk.tint[0]).toBeGreaterThan(dusk.tint[2]); // hoàng hôn ngả cam
  const night = await at(21 * 60);
  expect(night.light).toBe(1);
  expect(night.stars).toBeGreaterThan(0.9);
  expect(night.tint[2]).toBeGreaterThan(night.tint[0]); // đêm ngả xanh
  const pxN = await G(page, "w.samplePixel(w.toScreen(600, 1500).x, w.toScreen(600, 1500).y)");
  expect(lum(pxN), "Đêm phải tối hơn trưa").toBeLessThan(lum(px) * 0.8);
  await expect(page.locator('[data-name="WeatherPanel"]')).toContainText("Đêm trong");
  expect(await G(page, "s.weather.icon")).toBe("moon");
  // quầng đèn đường sáng hơn chỗ không có đèn (cùng độ cao trên tường)
  const lamp = await G(page, "(w.setCamera(900), [w.samplePixel(w.toScreen(1314, 760).x, w.toScreen(1314, 760).y), w.samplePixel(w.toScreen(1700, 600).x, w.toScreen(1700, 600).y)])");
  expect(lum(lamp[0]), "Đèn đường chưa sáng").toBeGreaterThan(lum(lamp[1]) + 15);
  await G(page, "w.centerHome()");
  await page.waitForTimeout(200);
  await page.screenshot({ path: `docs/screens/night_${info.project.name.replace(/[^\w]+/g, "_")}.png` });

  // 24:00 → ngày mới 06:00, có lưu
  const day = await G(page, "s.day");
  await G(page, "(t.set(s.day, 23 * 60 + 57), w.step(4))");
  expect(await G(page, "s.day")).toBe(day + 1);
  expect(await G(page, "s.minuteOfDay")).toBeLessThan(6 * 60 + 5);
  await expect(page.locator('[data-name="CalendarPanel"]')).toContainText("Ngày " + (day + 1));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("gpv.save")!).state.day)).toBe(day + 1);
  expect(await G(page, "w.player.atHome")).toBe(true);
  await page.waitForTimeout(1200);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("Phase 5: mưa, đường ướt, dự báo cố định, lưu giờ", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe, { life: true });
  await enterDemo(page);

  // dự báo: cố định theo ngày, ngày 1 nắng suốt, buổi sáng không mưa
  const kinds = async (d: number) => G(page, `(t.forced = null, t.set(${d}, 400), [0, 1, 2].map((i) => (t.set(${d}, [400, 800, 1200][i]), t.kind)))`);
  expect(await kinds(1)).toEqual(["sunny", "sunny", "sunny"]);
  const seen = new Set<string>();
  for (let d = 2; d < 40; d++) {
    const a = await kinds(d);
    expect(await kinds(d)).toEqual(a);
    expect(["sunny", "cloudy"]).toContain(a[0]);
    a.forEach((k: string) => seen.add(k));
  }
  expect([...seen].sort(), "40 ngày phải có đủ 4 loại thời tiết").toEqual(["cloudy", "heavyRain", "lightRain", "sunny"]);

  // mưa lớn: hạt mưa, trời xám, đường ướt dần, HUD
  await G(page, `(t.forced = "sunny", t.set(3, 14 * 60), w.atmo.set(14 * 60, "sunny", true), w.step(0.2))`);
  const dry = await G(page, "({ rain: w.atmo.rain, wet: w.atmo.wet, drops: w.atmo.shown.drops, tint: w.atmo.shown.tint })");
  expect([dry.rain, dry.wet, dry.drops]).toEqual([0, 0, 0]);
  await G(page, `(t.forced = "heavyRain", t.sync(), w.step(6))`);
  const wet = await G(page, "({ rain: w.atmo.rain, wet: w.atmo.wet, drops: w.atmo.shown.drops, tint: w.atmo.shown.tint })");
  expect(wet.rain).toBe(1);
  expect(wet.drops).toBeGreaterThan(120);
  expect(wet.wet).toBeGreaterThan(0.5);
  expect(wet.tint[0]).toBeLessThan(dry.tint[0] - 0.1);
  await expect(page.locator('[data-name="WeatherPanel"]')).toContainText("Mưa lớn");
  expect(await G(page, "s.weather.icon")).toBe("rain");
  expect(await G(page, "s.weather.temperatureC")).toBeLessThan(31);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `docs/screens/rain_${info.project.name.replace(/[^\w]+/g, "_")}.png` });
  // bảng dự báo ghi đúng thời tiết hiện tại
  await page.locator('[data-action="weather"]').tap();
  await expect(page.locator('[data-name="WeatherForecast"] .sv-row.now')).toContainText("Mưa lớn");
  await page.locator('[data-name="WeatherForecast"] .x').tap();
  await expect(page.locator('[data-name="WeatherForecast"]')).toBeHidden();

  // tạnh: hết hạt mưa nhanh, đường khô chậm
  await G(page, `(t.forced = "cloudy", t.sync(), w.step(4))`);
  const after = await G(page, "({ rain: w.atmo.rain, wet: w.atmo.wet, drops: w.atmo.shown.drops })");
  expect(after.rain).toBe(0);
  expect(after.drops).toBe(0);
  expect(after.wet).toBeGreaterThan(0.5);
  await expect(page.locator('[data-name="WeatherPanel"]')).toContainText("Nhiều mây");
  expect(await G(page, "s.weather.icon")).toBe("cloud");

  // lưu giờ → mở lại đúng giờ
  await G(page, "(t.forced = null, t.set(7, 15 * 60 + 20))");
  expect(await page.evaluate(() => (window as any).__gpv.boot.saveNow())).toBe(true);
  await page.evaluate(() => sessionStorage.setItem("gpv.test.keep", "1"));
  await page.reload();
  await page.waitForFunction(() => (window as any).__gpv?.ready === true, null, { timeout: 60_000 });
  errors.length = 0;
  // menu: luôn sáng đẹp trời
  expect(await G(page, "w.atmo.shown.light")).toBe(0);
  await expect(page.locator('[data-menu="continue"]')).toContainText("Ngày 7");
  await page.locator('[data-menu="continue"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(500);
  expect(await G(page, "s.day")).toBe(7);
  expect(Math.abs((await G(page, "s.minuteOfDay")) - (15 * 60 + 20))).toBeLessThan(6);
  expect(errors, errors.join("\n")).toEqual([]);
});
