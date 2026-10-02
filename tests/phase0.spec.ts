import { expect, test, type Page } from "@playwright/test";
import { boot, enterDemo, type Safe } from "./helpers";

// PHASE 0 — Master UI + khu phố Hoa Sữa (web). Chạy trên 5 màn hình trong playwright.config.ts.

const ACTIONS = ["map", "quests", "inventory", "shop", "settings", "addMoney", "weather", "stall", "ingredients", "sell", "upgrade", "decorate"];
const BLOCKS = ["CalendarPanel", "WeatherPanel", "MoneyPanel", "ReputationPanel", "SettingsButton", "QuestPanel", "RightActionMenu", "BottomNavigation"];

async function open(page: Page, safe?: Safe) {
  const errors = await boot(page, safe);
  await enterDemo(page);
  return errors;
}

function overlap(a: DOMRect, b: DOMRect) {
  const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return x > 0.5 && y > 0.5;
}

test("Phase 0: Master UI sắc nét, không đè, bấm được, không lỗi", async ({ page }, info) => {
  const safe = info.project.metadata?.safe as { top: number; bottom: number } | undefined;
  const errors = await open(page, safe);

  // 1) Font tiếng Việt
  const fontOk = await page.evaluate(() => document.fonts.check('700 30px "Be Vietnam Pro"', "Nhiệm vụ chính Ngày Thứ Tư Nắng nhẹ ỹữựờẫặ")
    && document.fonts.check('500 30px "Be Vietnam Pro"', "Nói chuyện với chú Tư sửa xe"));
  expect(fontOk, "Font Be Vietnam Pro chưa nạp").toBe(true);

  // 2) Bố cục: không đè nhau, nằm trong safe area
  const rects = await page.evaluate((names) => {
    const out: Record<string, DOMRect> = {};
    for (const n of names) out[n] = document.querySelector(`[data-name="${n}"]`)!.getBoundingClientRect().toJSON();
    out.SafeArea = document.querySelector('[data-name="SafeArea"]')!.getBoundingClientRect().toJSON();
    return out;
  }, BLOCKS);
  const sa = rects.SafeArea;
  for (const n of BLOCKS) {
    const r = rects[n];
    expect(r.left >= sa.left - 1 && r.right <= sa.right + 1 && r.top >= sa.top - 1 && r.bottom <= sa.bottom + 1, `${n} ra ngoài Safe Area`).toBe(true);
  }
  for (let i = 0; i < BLOCKS.length; i++)
    for (let j = i + 1; j < BLOCKS.length; j++)
      expect(overlap(rects[BLOCKS[i]] as DOMRect, rects[BLOCKS[j]] as DOMRect), `${BLOCKS[i]} đè ${BLOCKS[j]}`).toBe(false);

  // 3) Chữ không bị cắt
  const cut = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("#ui .fit")]
    .filter((e) => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
  expect(cut, "Chữ bị cắt").toEqual([]);

  // 4) World không mờ: backing store = CSS × DPR, texture raster đúng độ phân giải hiển thị
  const w = await page.evaluate(() => {
    const s = (window as any).__gpv.world.stats;
    return { ...s, dpr: window.devicePixelRatio };
  });
  expect(w.backingWidth).toBe(Math.round(w.cssWidth * w.dpr));
  expect(w.backingHeight).toBe(Math.round(w.cssHeight * w.dpr));
  const needed = w.scale * Math.min(w.dpr, 3);
  expect(w.rasterScale, "World raster thấp hơn độ phân giải màn hình").toBeGreaterThanOrEqual(Math.min(needed, 4096 / 2340) * 0.99);

  await page.screenshot({ path: `docs/screens/${info.project.name.replace(/[^\w]+/g, "_")}.png` });

  // 5) 12 nút: điểm giữa thực sự trúng nút, bấm mở đúng popup rồi đóng
  for (const id of ACTIONS) {
    const hit = await page.evaluate((id) => {
      const b = document.querySelector<HTMLElement>(`[data-action="${id}"]`)!;
      const r = b.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const e = document.elementFromPoint(cx, cy);
      // vùng chạm thực tế: quét ngang/dọc qua tâm xem elementFromPoint còn trúng nút bao xa
      const span = (dx: number, dy: number) => {
        let n = 0;
        for (let k = 1; k < 200; k++) {
          const t = document.elementFromPoint(cx + dx * k, cy + dy * k);
          if (!t || !b.contains(t)) break;
          n = k;
        }
        return n;
      };
      return { ok: !!e && b.contains(e), at: e ? e.className : "null", w: span(1, 0) + span(-1, 0), h: span(0, 1) + span(0, -1) };
    }, id);
    expect(hit.ok, `Nút ${id} bị che bởi ${hit.at}`).toBe(true);
    expect(Math.min(hit.w, hit.h), `Nút ${id} quá nhỏ để chạm`).toBeGreaterThanOrEqual(24);
    await page.locator(`[data-action="${id}"]`).tap();
    await page.waitForTimeout(250);
    if (id === "stall" || id === "ingredients") {
      // từ Phase 7: Quầy hàng và Nguyên liệu là bảng thật
      const panel = page.locator(`[data-name="${id === "stall" ? "Stall" : "Ingredients"}"]`);
      await expect(panel).toBeVisible();
      await panel.locator(".x").tap();
      await expect(panel).toBeHidden();
      continue;
    }
    if (id === "quests") {
      // từ Phase 6 nút Nhiệm vụ mở Sổ nhiệm vụ
      const panel = page.locator('[data-name="QuestLog"]');
      await expect(panel).toBeVisible();
      await panel.locator(".x").tap();
      await expect(panel).toBeHidden();
      continue;
    }
    if (id === "weather") {
      // từ Phase 5 ô thời tiết mở bảng Dự báo hôm nay
      const panel = page.locator('[data-name="WeatherForecast"]');
      await expect(panel).toBeVisible();
      await panel.locator(".x").tap();
      await expect(panel).toBeHidden();
      continue;
    }
    if (id === "settings") {
      // từ Phase 1 nút ⚙ mở bảng Cài đặt thật
      const panel = page.locator('[data-name="SettingsPanel"]');
      await expect(panel).toBeVisible();
      await panel.locator(".x").tap();
      await expect(panel).toBeHidden();
      continue;
    }
    const p = await page.evaluate(() => ({ open: (window as any).__gpv.ui.placeholderOpen, title: (window as any).__gpv.ui.placeholderTitle }));
    expect(p.open, `Bấm ${id} không mở popup`).toBe(true);
    expect(p.title.length).toBeGreaterThan(0);
    await page.locator("#ui .card .x").tap();
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => (window as any).__gpv.ui.placeholderOpen)).toBe(false);
  }

  // 6) Dữ liệu mẫu đúng ảnh Master
  const text = await page.locator("#ui").innerText();
  for (const s of ["Ngày 3", "Thứ Tư", "06:45", "Nắng nhẹ", "28°C", "1.250.000đ", "35", "Nhiệm vụ chính", "Bán 20 ly cà phê", "8/20",
    "Nói chuyện với chú Tư sửa xe", "Bản đồ", "Nhiệm vụ", "Túi đồ", "Cửa hàng", "Quầy hàng", "Nguyên liệu", "Bán hàng", "Nâng cấp", "Trang trí"])
    expect(text, `Thiếu "${s}"`).toContain(s);

  expect(errors, errors.join("\n")).toEqual([]);
});

test("PWA: manifest + service worker", async ({ page }) => {
  await open(page);
  const m = await page.evaluate(async () => {
    const href = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.href;
    return (await fetch(href)).json();
  });
  expect(m.display).toBe("standalone");
  expect(m.orientation).toBe("portrait");
  expect(m.icons.some((i: any) => i.sizes === "512x512" && i.purpose === "maskable")).toBe(true);
  const sw = await page.evaluate(async () => {
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 8000))]);
    return !!reg;
  });
  expect(sw, "Service worker chưa sẵn sàng").toBe(true);
});
