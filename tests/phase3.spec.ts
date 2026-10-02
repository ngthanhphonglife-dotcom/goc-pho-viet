import { expect, test, type Page } from "@playwright/test";
import { boot, enterDemo, type Safe } from "./helpers";

// PHASE 3 — Nhân vật có khớp, chuyển động, đời sống phố, chạm nhân vật.

const snap = (page: Page) => page.evaluate(() => (window as any).__gpv.world.life.snapshot()) as Promise<any[]>;
const by = (list: any[], id: string) => list.find((c) => c.id === id);

test("Phase 3: nhân vật sống trên phố, chuyển động, chạm để chào", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe, { life: true });
  await enterDemo(page);

  // đủ 8 nhân vật, đủ bộ phận, nằm trong lớp đạo cụ
  const a = await snap(page);
  expect(a.map((c) => c.id).sort()).toEqual(["chutu", "coba", "hoang", "lan", "mai", "minh", "nam", "player"]);
  for (const c of a) {
    expect(c.parts, `${c.id} thiếu bộ phận`).toBeGreaterThanOrEqual(5);
    expect(c.inLayer).toBe(true);
    expect(c.face.length, `${c.id} chưa có mặt`).toBeGreaterThan(0);
  }
  const tex = await page.evaluate(() => (window as any).__gpv.world.stats.textures);
  expect(tex.filter((t: any) => t.name.startsWith("char:")).length).toBe(9);
  for (const t of tex) expect(Math.max(t.width, t.height)).toBeLessThanOrEqual(4096);

  // sau một lúc: người đi bộ đã di chuyển đúng hướng, người đứng không trôi, khớp đổi góc
  const poses: number[] = [];
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(200); poses.push(by(await snap(page), "hoang").pose.thighF); }
  const b = await snap(page);
  for (const id of ["hoang", "lan", "nam", "minh"]) {
    const c0 = by(a, id), c1 = by(b, id);
    expect(c1.anim).toBe("walk");
    expect((c1.x - c0.x) * c0.dir, `${id} không đi đúng hướng`).toBeGreaterThan(3);
    expect(c1.y).toBe(c0.y);
  }
  for (const id of ["player", "chutu", "coba", "mai"]) {
    expect(by(b, id).x).toBe(by(a, id).x);
    expect(by(b, id).stationed).toBe(true);
  }
  expect(Math.max(...poses) - Math.min(...poses), "Chân người đi bộ không chuyển động").toBeGreaterThan(0.05);
  expect(["fix", "sit"]).toContain(by(b, "chutu").anim);
  expect(by(b, "chutu").pose.drop).toBeGreaterThan(0);

  // thứ tự trước/sau: chủ quầy sau xe cà phê; người đi bộ trước ghế, trước cột
  const z = await page.evaluate(() => {
    const w = (window as any).__gpv.world;
    const kids = w.life.agents[0].c.parent.children as any[];
    const of = (label: string) => kids.find((k) => k.label === label).zIndex;
    return { cart: of("cart"), stool: of("stool_b"), pole: of("pole_1"), fruit: of("fruit_cart") };
  });
  expect(by(b, "player").z).toBeLessThan(z.cart);
  expect(by(b, "hoang").z).toBeGreaterThan(z.stool);
  expect(by(b, "hoang").z).toBeGreaterThan(z.pole);
  expect(by(b, "hoang").z).toBeLessThan(z.fruit);

  await page.screenshot({ path: `docs/screens/life_${info.project.name.replace(/[^\w]+/g, "_")}.png` });

  // chạm Cô Ba → tên + vai, vui, vẫy tay; hết phản ứng thì trở lại bình thường
  const p = await page.evaluate(() => {
    const w = (window as any).__gpv.world;
    const c = w.life.get("coba");
    w.centerOn(c.wx, false);
    const r = document.querySelector("#world canvas")!.getBoundingClientRect();
    for (const dy of [150, 110, 190, 60, 230]) {
      const q = w.toScreen(c.wx, c.wy - dy);
      const s = { x: q.x + r.left, y: q.y + r.top };
      if (document.elementFromPoint(s.x, s.y)?.tagName === "CANVAS" && w.life.characterAt(c.wx, c.wy - dy)?.info.id === "coba") return s;
    }
    return null;
  });
  expect(p, "Không chạm được Cô Ba").not.toBeNull();
  await page.mouse.click(p!.x, p!.y);
  await expect(page.locator(".toast")).toContainText("Cô Ba — Chủ tạp hoá");
  await page.waitForTimeout(150);
  let coba = by(await snap(page), "coba");
  expect(coba.reacting).toBe(true);
  expect(coba.face).toBe("happy");
  expect(coba.pose.armF).toBeLessThan(-2);
  expect(await page.evaluate(() => (window as any).__gpv.ui.placeholderOpen), "Chạm nhân vật không được mở bảng của tiệm").toBe(false);
  // (máy test vẽ chậm nên thời gian trong game trôi chậm hơn đồng hồ → chờ theo trạng thái)
  await expect.poll(async () => by(await snap(page), "coba").reacting, { timeout: 60_000 }).toBe(false);

  // chủ quầy đứng sau xe: chạm vào vẫn mở Quầy hàng
  const q = await page.evaluate(() => {
    const w = (window as any).__gpv.world;
    const c = w.life.get("player");
    w.centerOn(c.wx, false);
    const r = document.querySelector("#world canvas")!.getBoundingClientRect();
    const s = w.toScreen(c.wx, c.wy - 230);
    return { x: s.x + r.left, y: s.y + r.top, covered: document.elementFromPoint(s.x + r.left, s.y + r.top)?.tagName !== "CANVAS" };
  });
  if (!q.covered) {
    await page.mouse.click(q.x, q.y);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).__gpv.ui.placeholderTitle)).toBe("Quầy hàng");
    await page.locator("#ui .card .x").tap();
  }

  // tắt chuyển động → mọi thứ đứng yên (dùng cho chế độ tiết kiệm sau này)
  await page.evaluate(() => { (window as any).__gpv.world.lifeEnabled = false; });
  await page.waitForTimeout(200);
  const s1 = by(await snap(page), "minh").x;
  await page.waitForTimeout(400);
  expect(by(await snap(page), "minh").x).toBe(s1);
  expect(errors, errors.join("\n")).toEqual([]);
});
