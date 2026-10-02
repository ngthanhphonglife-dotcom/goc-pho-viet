import { expect, test, type Page } from "@playwright/test";
import { boot, enterDemo, type Safe } from "./helpers";

// PHASE 4 — Điều khiển người chơi: joystick, chạm để đi, tìm đường, tương tác, lưu vị trí.

const W = (page: Page, fn: string) => page.evaluate(`(() => { const w = window.__gpv.world; return ${fn}; })()`) as Promise<any>;
const me = (page: Page) => W(page, "({ ...w.player.pos, moving: w.player.moving, anim: w.player.c.anim, dir: w.player.c.dir, home: w.player.atHome })");
const step = (page: Page, s: number) => W(page, `w.step(${s})`);
const HOME = { x: 1742, y: 1475 };

/** Toạ độ trang của một điểm trên phố (đã đưa vào giữa màn hình, kiểm tra không bị UI che). */
async function screenOf(page: Page, wx: number, wy: number, center = true) {
  const p = await page.evaluate(([wx, wy, center]) => {
    const w = (window as any).__gpv.world;
    if (center) w.centerOn(wx, false);
    const r = document.querySelector("#world canvas")!.getBoundingClientRect();
    const q = w.toScreen(wx, wy);
    const s = { x: q.x + r.left, y: q.y + r.top };
    return { ...s, ok: document.elementFromPoint(s.x, s.y)?.tagName === "CANVAS" };
  }, [wx, wy, center] as const);
  return p;
}

/** Giữ joystick theo hướng (dx, dy) rồi tua mô phỏng `seconds` giây; trả về sau khi thả tay. */
async function stick(page: Page, dx: number, dy: number, seconds: number) {
  await page.evaluate(([dx, dy, seconds]) => {
    const j = document.querySelector<HTMLElement>('[data-name="Joystick"]')!;
    const r = j.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const ev = (t: string, x: number, y: number) => j.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: x, clientY: y, bubbles: true, pointerType: "touch" }));
    ev("pointerdown", cx, cy);
    ev("pointermove", cx + dx * r.width, cy + dy * r.width);
    (window as any).__gpv.world.step(seconds);
    ev("pointerup", cx, cy);
    (window as any).__gpv.world.step(0.1);
  }, [dx, dy, seconds]);
}

test("Phase 4: chạm để đi, tìm đường, tương tác khi tới nơi", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe, { life: true });
  // ở menu: không có nút điều khiển
  await expect(page.locator('[data-name="Joystick"]')).toBeHidden();
  await enterDemo(page);
  await expect(page.locator('[data-name="Joystick"]')).toBeVisible();
  await expect(page.locator('[data-name="InteractButton"]')).toBeHidden();
  let m = await me(page);
  expect(m.home).toBe(true);
  expect([m.x, m.y]).toEqual([HOME.x, HOME.y]);

  // joystick không đè Master UI
  const boxes = await page.evaluate(() => ["Joystick", "BottomNavigation", "QuestPanel", "RightActionMenu"].map((n) => document.querySelector(`[data-name="${n}"]`)!.getBoundingClientRect().toJSON()));
  for (const b of boxes.slice(1)) {
    const j = boxes[0];
    const overlap = Math.min(j.right, b.right) - Math.max(j.left, b.left) > 0.5 && Math.min(j.bottom, b.bottom) - Math.max(j.top, b.top) > 0.5;
    expect(overlap, "Joystick đè Master UI").toBe(false);
  }

  // chạm một chỗ trống trên vỉa hè → đi tới, camera theo
  const target = { x: 2320, y: 1700 };
  expect(await W(page, `w.nav.blocked(${target.x}, ${target.y})`)).toBe(false);
  const s = await screenOf(page, target.x, target.y);
  expect(s.ok, "Điểm chạm bị UI che").toBe(true);
  expect(await W(page, `!w.life.characterAt(${target.x}, ${target.y}) && !w.hotspotAt(${target.x}, ${target.y})`)).toBe(true);
  await page.mouse.click(s.x, s.y);
  await step(page, 0.4);
  m = await me(page);
  expect(m.moving).toBe(true);
  expect(m.anim).toBe("walk");
  expect(m.home).toBe(false);
  await step(page, 8);
  m = await me(page);
  expect(Math.hypot(m.x - target.x, m.y - target.y), "Chưa tới nơi").toBeLessThan(40);
  expect(m.moving).toBe(false);
  expect(m.anim).toBe("idle");
  const cam = await W(page, "w.camera");
  expect(Math.abs(cam.center - m.x), "Camera không theo nhân vật").toBeLessThan(60);
  // suốt đường đi không xuyên vật cản
  expect(await W(page, `w.nav.blocked(${m.x}, ${m.y})`)).toBe(false);

  // chạm Cô Ba từ xa → đi tới gần rồi mới chào
  const coba = await W(page, "({ x: w.life.get('coba').wx, y: w.life.get('coba').wy })");
  const sc = await screenOf(page, coba.x, coba.y - 150);
  expect(sc.ok).toBe(true);
  await page.mouse.click(sc.x, sc.y);
  await step(page, 0.3);
  expect(await W(page, "w.life.get('coba').reacting > 0"), "Chưa tới gần mà đã chào").toBe(false);
  for (let i = 0; i < 40 && !(await W(page, "w.life.get('coba').reacting > 0")); i++) await step(page, 0.5);
  expect(await page.evaluate(() => (window as any).__gpv.dialogue.state.speaker)).toBe("Cô Ba");
  await page.evaluate(() => (window as any).__gpv.dialogue.close());
  m = await me(page);
  expect(Math.hypot(m.x - coba.x, m.y - coba.y)).toBeLessThan(170);
  expect(m.dir, "Chủ quầy phải quay mặt về Cô Ba").toBe(coba.x > m.x ? 1 : -1);
  // đứng gần → nút tương tác ghi tên Cô Ba, bấm được
  const btn = page.locator('[data-name="InteractButton"]');
  await expect(btn).toBeVisible();
  await expect(btn).toContainText("Cô Ba");
  await step(page, 3);
  await btn.tap();
  await step(page, 0.2);
  expect(await W(page, "w.life.get('coba').reacting > 0")).toBe(true);
  await page.evaluate(() => (window as any).__gpv.dialogue.close());

  // chạm xe cà phê → vòng ra sau quầy rồi mới mở Quầy hàng
  const cart = await screenOf(page, 1700, 1420);
  expect(cart.ok).toBe(true);
  await page.mouse.click(cart.x, cart.y);
  await step(page, 0.3);
  expect(await page.evaluate(() => (window as any).__gpv.ui.placeholderOpen)).toBe(false);
  await step(page, 12);
  await page.waitForTimeout(300);
  m = await me(page);
  expect(m.home, "Chưa về sau quầy").toBe(true);
  expect(await page.evaluate(() => (window as any).__gpv.ui.placeholderTitle)).toBe("Quầy hàng");
  await page.locator("#ui .card .x").tap();
  // rảnh sau quầy → tự pha chế/mời khách như Phase 3
  await step(page, 6);
  expect(["idle", "brew", "serve"]).toContain((await me(page)).anim);
  await expect(btn).toBeHidden();

  await page.screenshot({ path: `docs/screens/control_${info.project.name.replace(/[^\w]+/g, "_")}.png` });
  expect(errors, errors.join("\n")).toEqual([]);
});

test("Phase 4: joystick, bàn phím, vật cản, biên phố, lưu vị trí", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe, { life: true });
  await enterDemo(page);

  // joystick sang phải → đi sang phải, quay mặt phải; thả ra → dừng
  await W(page, "w.player.setPos(2300, 1700)");
  let a = await me(page);
  await stick(page, 0.4, 0, 1);
  let b = await me(page);
  expect(b.x - a.x).toBeGreaterThan(150);
  expect(b.dir).toBe(1);
  expect(b.moving).toBe(false);
  await step(page, 1);
  expect((await me(page)).x).toBe(b.x);
  // sang trái → quay mặt trái
  await stick(page, -0.4, 0, 0.5);
  expect((await me(page)).dir).toBe(-1);

  // không xuyên xe cà phê: đứng trước xe, đẩy lên
  await W(page, "w.player.setPos(1742, 1600)");
  await stick(page, 0, -0.4, 3);
  b = await me(page);
  expect(b.y, "Đi xuyên xe cà phê").toBeGreaterThan(1535);
  // không xuống lòng đường, không ra khỏi phố
  await stick(page, 0, 0.4, 3);
  expect((await me(page)).y).toBeLessThanOrEqual(1772);
  await W(page, "w.player.setPos(120, 1740)");
  await stick(page, -0.4, 0, 3);
  expect((await me(page)).x).toBeGreaterThanOrEqual(40);
  await W(page, "w.player.setPos(3100, 1740)");
  await stick(page, 0.4, 0, 3);
  expect((await me(page)).x).toBeLessThanOrEqual(3200);

  // bàn phím
  await W(page, "w.player.setPos(2300, 1700)");
  a = await me(page);
  await page.keyboard.down("d");
  await step(page, 0.6);
  await page.keyboard.up("d");
  await step(page, 0.1);
  b = await me(page);
  expect(b.x - a.x).toBeGreaterThan(100);
  await page.keyboard.down("ArrowUp");
  await step(page, 0.4);
  await page.keyboard.up("ArrowUp");
  expect((await me(page)).y).toBeLessThan(b.y - 40);

  // tìm đường: từ trước xe cà phê ra sau quầy phải đi vòng, không điểm nào nằm trong vật cản
  const path = await W(page, "w.nav.findPath({ x: 1742, y: 1620 }, { x: 1742, y: 1475 })");
  expect(path.length).toBeGreaterThan(1);
  for (const p of path) expect(await W(page, `w.nav.blocked(${p.x}, ${p.y})`)).toBe(false);

  // đứng gần Chú Tư → nút tương tác ghi "Chú Tư"
  await W(page, "w.player.setPos(1400, 1450)");
  await step(page, 0.2);
  await expect(page.locator('[data-name="InteractButton"]')).toContainText("Chú Tư");

  // lưu vị trí → mở lại đứng đúng chỗ, camera nhìn nhân vật
  await W(page, "w.player.setPos(2600, 1700)");
  const pos = await me(page);
  expect(await page.evaluate(() => (window as any).__gpv.boot.saveNow())).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("gpv.save")!).state.player)).toEqual({ x: Math.round(pos.x), y: Math.round(pos.y) });
  await page.evaluate(() => sessionStorage.setItem("gpv.test.keep", "1"));
  await page.reload();
  await page.waitForFunction(() => (window as any).__gpv?.ready === true, null, { timeout: 60_000 });
  errors.length = 0; // tải lại trang làm huỷ vài yêu cầu ảnh đang dở — không phải lỗi
  await page.locator('[data-menu="continue"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(500);
  const back = await me(page);
  expect(Math.hypot(back.x - pos.x, back.y - pos.y)).toBeLessThan(35);
  const cam = await W(page, "w.camera");
  expect(Math.abs(cam.center - back.x)).toBeLessThan(60);
  // về menu → nút điều khiển ẩn
  await page.locator('[data-action="settings"]').tap();
  await page.locator('[data-panel="to-menu"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "menu");
  await expect(page.locator('[data-name="Joystick"]')).toBeHidden();
  expect(errors, errors.join("\n")).toEqual([]);
});
