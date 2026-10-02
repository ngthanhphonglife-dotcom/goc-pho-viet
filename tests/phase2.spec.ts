import { expect, test, type Page } from "@playwright/test";
import { boot, enterDemo, screen, type Safe } from "./helpers";

// PHASE 2 — Phố dài 3 màn hình, parallax, camera kéo ngang, điểm chạm.

const W = (page: Page, fn: string) => page.evaluate(`(() => { const w = window.__gpv.world; return ${fn}; })()`) as Promise<any>;
const cam = (page: Page) => W(page, "w.camera");
const BG = [207, 232, 243];

async function settle(page: Page) {
  let last = NaN;
  for (let i = 0; i < 40; i++) {
    const x = (await cam(page)).x;
    if (Math.abs(x - last) < 0.01) return;
    last = x;
    await page.waitForTimeout(120);
  }
}

async function drag(page: Page, x0: number, y0: number, dx: number) {
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(x0 + (dx * i) / 8, y0); await page.waitForTimeout(16); }
  await page.waitForTimeout(150); // dừng tay rồi thả → không quán tính
  await page.mouse.up();
}

/** Đưa điểm tương tác vào giữa màn hình rồi trả về toạ độ chạm (đã kiểm tra không bị UI che). */
async function aim(page: Page, id: string) {
  const find = () => page.evaluate((id) => {
    const w = (window as any).__gpv.world;
    const h = w.hotspots.find((h: any) => h.id === id);
    const cx = (h.rect[0] + h.rect[2]) / 2;
    w.centerOn(cx, false);
    // tìm một điểm trong vùng mà không bị UI che và đúng là điểm tương tác này
    for (let fy = 0.5; fy < 1; fy += 0.1) for (const fx of [0.5, 0.3, 0.7, 0.15, 0.85]) {
      const wx = h.rect[0] + (h.rect[2] - h.rect[0]) * fx, wy = h.rect[1] + (h.rect[3] - h.rect[1]) * (fy > 0.95 ? 0.2 : fy);
      const r = document.querySelector("#world canvas")!.getBoundingClientRect(); // iPad: khung game nằm giữa, có lề hai bên
      const q = w.toScreen(wx, wy);
      const s = { x: q.x + r.left, y: q.y + r.top };
      const e = document.elementFromPoint(s.x, s.y);
      if (e && e.tagName === "CANVAS" && w.hotspotAt(wx, wy)?.id === id && !w.life.characterAt(wx, wy)) return s;
    }
    return null;
  }, id);
  // popup vừa đóng còn mờ dần ~0.2s → thử lại trong 3 giây
  let p = await find();
  for (let i = 0; i < 15 && !p; i++) { await page.waitForTimeout(200); p = await find(); }
  expect(p, `Không chạm được điểm ${id}`).not.toBeNull();
  return p as { x: number; y: number };
}

test("Phase 2: phố dài, camera kéo ngang, parallax, không hở nền", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe);
  const vp = page.viewportSize()!;

  // Ở menu: camera giữa phố, không kéo được
  expect(await W(page, "w.interactive")).toBe(false);
  let c = await cam(page);
  expect(c.worldWidth).toBe(3240);
  expect(c.viewWidth).toBeLessThanOrEqual(1080.5);
  expect(Math.abs(c.center - 1620)).toBeLessThan(1);

  await enterDemo(page);
  expect(await W(page, "w.interactive")).toBe(true);
  c = await cam(page);
  expect(Math.abs(c.center - 1620), "Vào game phải nhìn xe cà phê").toBeLessThan(1);

  // Kéo sang trái → thấy phần bên phải
  const y = vp.height * 0.57;
  expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.tagName, [vp.width / 2, y])).toBe("CANVAS");
  const scale = await W(page, "w.stats.scale");
  await drag(page, vp.width / 2, y, -120);
  await settle(page);
  const c2 = await cam(page);
  expect(c2.x - c.x).toBeGreaterThan(100 / scale);
  expect(c2.x - c.x).toBeLessThan(140 / scale);
  // Lướt nhanh → có quán tính, trôi thêm
  // (sự kiện con trỏ phát ngay trong trang để thời gian giữa các bước đủ ngắn như tay người lướt)
  await page.evaluate(([x, y]) => {
    const el = document.getElementById("world")!;
    const ev = (type: string, cx: number) => el.dispatchEvent(new PointerEvent(type, { pointerId: 9, clientX: cx, clientY: y, bubbles: true, pointerType: "touch", button: 0 }));
    ev("pointerdown", x);
    for (let i = 1; i <= 5; i++) ev("pointermove", x + i * 14);
    ev("pointerup", x + 70);
  }, [vp.width / 2, y]);
  const c3a = (await cam(page)).x;
  await settle(page);
  expect((await cam(page)).x, "Lướt phải có quán tính").toBeLessThan(c3a - 5);

  // Chặn biên + không hở nền ở hai đầu + chụp ảnh
  const sy = await W(page, "w.toScreen(0, 1500).y");
  const cssW = await W(page, "w.stats.cssWidth");
  for (const [name, x] of [["left", -5000], ["right", 5000]] as const) {
    await W(page, `w.setCamera(${x})`);
    c = await cam(page);
    expect(c.x).toBe(name === "left" ? 0 : c.max);
    for (const px of [1, cssW - 2]) for (const py of [sy, Math.max(4, await W(page, "w.toScreen(0, 300).y"))]) {
      const rgb = await W(page, `w.samplePixel(${px}, ${py})`);
      expect(rgb.slice(0, 3), `Hở nền ở đầu ${name} (${px}, ${Math.round(py)})`).not.toEqual(BG);
      expect(rgb[3]).toBe(255);
    }
    await page.waitForTimeout(150);
    await page.screenshot({ path: `docs/screens/street_${name}_${info.project.name.replace(/[^\w]+/g, "_")}.png` });
  }

  // Parallax: lớp xa trôi chậm hơn
  await W(page, "w.setCamera(0)");
  const o0 = await W(page, "w.layerOffsets()");
  await W(page, "w.setCamera(99999)");
  const o1 = await W(page, "w.layerOffsets()");
  const d = (n: string) => Math.abs(o1[n] - o0[n]);
  expect(d("sky")).toBe(0);
  expect(d("far")).toBeGreaterThan(0);
  expect(d("far")).toBeLessThan(d("back"));
  expect(d("back")).toBeLessThan(d("main"));
  expect(d("main")).toBeLessThan(d("front"));
  expect(Math.abs(d("main") - c.max)).toBeLessThan(0.01);

  // Texture trong giới hạn, đủ đạo cụ
  const tex = await W(page, "w.stats.textures");
  for (const t of tex) expect(Math.max(t.width, t.height), `Texture ${t.name} quá lớn`).toBeLessThanOrEqual(4096);
  expect(tex.filter((t: any) => t.name.startsWith("prop:")).length).toBeGreaterThanOrEqual(30);

  // Về menu: camera về giữa, khoá kéo
  await page.locator('[data-action="settings"]').tap();
  await page.locator('[data-panel="to-menu"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "menu");
  await page.waitForTimeout(400);
  expect(await W(page, "w.interactive")).toBe(false);
  expect(Math.abs((await cam(page)).center - 1620)).toBeLessThan(1);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("Phase 2: chạm điểm tương tác, kéo không kích hoạt, UI không làm trôi phố", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe);
  await enterDemo(page);
  const open = () => page.evaluate(() => ({ open: (window as any).__gpv.ui.placeholderOpen, title: (window as any).__gpv.ui.placeholderTitle }));

  // chạm có hành động → mở đúng bảng
  for (const [id, title] of [["cart", "Quầy hàng"], ["board", "Nhiệm vụ"], ["river", "Bản đồ khu phố"]]) {
    const p = await aim(page, id);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(250);
    const o = await open();
    expect(o.open, `Chạm ${id} không mở bảng`).toBe(true);
    expect(o.title).toBe(title);
    await page.locator("#ui .card .x").tap();
    await page.waitForTimeout(250);
  }
  // chạm không có hành động → hiện tên
  for (const [id, text] of [["bin", "Thùng rác"], ["chutu", "Chú Tư"], ["bus", "Trạm xe buýt"]]) {
    const p = await aim(page, id);
    await page.mouse.click(p.x, p.y);
    await expect(page.locator(".toast")).toContainText(text);
    expect((await open()).open).toBe(false);
  }
  // kéo bắt đầu trên xe cà phê → chỉ trôi phố, không mở bảng
  const p = await aim(page, "cart");
  const x0 = (await cam(page)).x;
  await drag(page, p.x, p.y, -90);
  await page.waitForTimeout(250);
  expect((await open()).open, "Kéo không được kích hoạt điểm chạm").toBe(false);
  expect((await cam(page)).x).toBeGreaterThan(x0 + 50);

  // kéo bắt đầu trên nút UI → phố đứng yên
  await settle(page);
  const x1 = (await cam(page)).x;
  const b = (await page.locator('[data-action="ingredients"]').boundingBox())!;
  await drag(page, b.x + b.width / 2, b.y + b.height / 2, 0);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 - 80, b.y - 200);
  await page.mouse.up();
  await page.waitForTimeout(200);
  expect((await cam(page)).x, "Kéo trên UI làm trôi phố").toBe(x1);
  if ((await open()).open) await page.locator("#ui .card .x").tap();

  // popup đang mở thì không kéo/chạm được phố
  await page.locator('[data-action="map"]').tap();
  await page.waitForTimeout(250);
  const vp = page.viewportSize()!;
  await drag(page, vp.width / 2, vp.height * 0.57, -100);
  await page.waitForTimeout(200);
  expect((await cam(page)).x).toBe(x1);
  expect(await screen(page)).toBe("game");
  expect(errors, errors.join("\n")).toEqual([]);
});
