import { expect, test, type Page } from "@playwright/test";
import { boot, type Safe } from "./helpers";

// PHASE 6 — Hội thoại & nhiệm vụ cơ bản.

const G = (page: Page, fn: string) => page.evaluate(`(() => { const g = window.__gpv, w = g.world, d = g.dialogue, q = g.quests, s = g.state.value; return ${fn}; })()`) as Promise<any>;
const dlg = (page: Page) => G(page, "d.state");

async function newGame(page: Page) {
  await page.locator('[data-menu="new"]').tap();
  await page.locator('[data-panel="start"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(500);
}

/** Đi tới nhân vật rồi nói chuyện (tua mô phỏng tới khi khung hội thoại mở). */
async function talkTo(page: Page, id: string) {
  // (gộp vào một lần gọi trong trang cho nhanh trên máy test)
  const open = await G(page, `(() => { w.interact({ kind: "char", c: w.life.get("${id}"), name: "" }); for (let i = 0; i < 60 && !d.state.open; i++) w.step(0.5); return d.state.open; })()`);
  expect(open, `Không mở được hội thoại với ${id}`).toBe(true);
}

async function visit(page: Page, id: string) {
  await G(page, `(w.interact({ kind: "hotspot", h: w.hotspots.find((h) => h.id === "${id}"), name: "" }), w.step(25))`);
  await page.waitForTimeout(250);
}

/** Bấm hết câu thoại; gặp lựa chọn thì chọn theo `picks` (mặc định 0). */
async function finish(page: Page, picks: number[] = []) {
  const ok = await G(page, `(() => { const picks = ${JSON.stringify(picks)}; let k = 0;
    for (let i = 0; i < 30; i++) { const st = d.state; if (!st.open) return true; if (st.typing) d.advance(); else if (st.choices.length) d.choose(picks[k++] ?? 0); else d.advance(); }
    return !d.state.open; })()`);
  expect(ok, "Hội thoại không kết thúc").toBe(true);
}

test("Phase 6: hội thoại, nhận và hoàn thành nhiệm vụ, sổ nhiệm vụ", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe, { life: true });
  await newGame(page);
  const hud = page.locator('[data-name="QuestPanel"]');
  await expect(hud).toContainText("Nói chuyện với chú Tư sửa xe");
  await expect(hud).toContainText("0/20");

  // --- Chú Tư: chữ chạy, chạm để hiện hết, có lựa chọn ---
  await talkTo(page, "chutu");
  let st = await dlg(page);
  expect(st.speaker).toBe("Chú Tư");
  expect(st.typing).toBe(true);
  expect(st.choices).toEqual([]);
  const box = page.locator('[data-name="DialogueBox"]');
  await expect(box).toBeVisible();
  await expect(page.locator(".dlg-portrait")).toHaveAttribute("src", /portrait_chutu\.svg/);
  // khung hội thoại nằm trong màn hình
  const vp = page.viewportSize()!;
  const r = (await box.boundingBox())!;
  expect(r.x).toBeGreaterThanOrEqual(0);
  expect(r.x + r.width).toBeLessThanOrEqual(vp.width + 0.5);
  expect(r.y + r.height).toBeLessThanOrEqual(vp.height + 0.5);
  await box.tap(); // chạm → hiện hết chữ
  st = await dlg(page);
  expect(st.typing).toBe(false);
  expect(st.choices.length).toBe(2);
  await expect(page.locator(".dlg-text")).toHaveText(st.text);
  // đang nói chuyện thì đồng hồ dừng, joystick không điều khiển được
  const m0 = await G(page, "s.minuteOfDay");
  await G(page, "w.step(4)");
  expect(await G(page, "s.minuteOfDay")).toBe(m0);
  await page.screenshot({ path: `docs/screens/dialogue_${info.project.name.replace(/[^\w]+/g, "_")}.png` });
  // chọn bằng cách chạm nút thật
  const c0 = page.locator('.dlg-choice[data-choice="0"]');
  const cb = (await c0.boundingBox())!;
  expect(cb.height, "Nút lựa chọn quá thấp").toBeGreaterThanOrEqual(40);
  await c0.tap();
  expect((await dlg(page)).speaker).toBe("Chú Tư");
  await finish(page);

  // --- thưởng nhiệm vụ đầu ---
  const done = page.locator('[data-name="QuestDone"]');
  await expect(done).toBeVisible();
  await expect(done).toContainText("Nói chuyện với chú Tư sửa xe");
  await expect(done).toContainText("+50.000đ");
  expect(await G(page, "s.money")).toBe(1_000_000);
  await done.locator('[data-panel="claim"]').tap();
  await expect(done).toBeHidden();
  expect(await G(page, "[s.money, s.reputation]")).toEqual([1_050_000, 5]);
  await expect(page.locator('[data-name="MoneyPanel"]')).toContainText("1.050.000đ");

  // --- nhận nhiệm vụ mới ---
  const offer = page.locator('[data-name="QuestOffer"]');
  await expect(offer).toBeVisible();
  await expect(offer).toContainText("Làm quen khu phố");
  await expect(offer.locator(".q-steps li")).toHaveCount(3);
  await page.screenshot({ path: `docs/screens/questoffer_${info.project.name.replace(/[^\w]+/g, "_")}.png` });
  await offer.locator('[data-panel="accept"]').tap();
  await expect(offer).toBeHidden();
  await expect(hud).toContainText("Làm quen khu phố");
  await expect(hud).toContainText("0/3");
  await expect(hud).not.toContainText("Nói chuyện với chú Tư");

  // --- làm 3 việc ---
  await talkTo(page, "coba");
  expect((await dlg(page)).speaker).toBe("Cô Ba");
  await finish(page);
  await expect(hud).toContainText("1/3");
  await talkTo(page, "mai");
  await finish(page);
  await expect(hud).toContainText("2/3");
  await talkTo(page, "coba"); // chào lại không được tính 2 lần
  await finish(page);
  await expect(hud).toContainText("2/3");
  await visit(page, "board");
  await expect(done).toBeVisible();
  await expect(done).toContainText("Làm quen khu phố");
  await done.locator('[data-panel="claim"]').tap();
  expect(await G(page, "[s.money, s.reputation]")).toEqual([1_080_000, 8]);
  // bảng tin mở Sổ nhiệm vụ
  const log = page.locator('[data-name="QuestLog"]');
  await expect(log).toBeVisible();
  await expect(log.locator(".q-card.done")).toHaveCount(2);
  await expect(log.locator('.q-card[data-quest="sell-20-coffee"]')).toContainText("0/20");
  await page.screenshot({ path: `docs/screens/questlog_${info.project.name.replace(/[^\w]+/g, "_")}.png` });
  await log.locator('[data-panel="close"]').tap();
  await expect(log).toBeHidden();

  // --- Cô Ba giao việc: từ chối rồi nhận lại ---
  await talkTo(page, "coba");
  await finish(page, [1]); // "Cô có cần con giúp gì không?"
  await expect(offer).toBeVisible();
  await expect(offer).toContainText("Dạo một vòng phố Hoa Sữa");
  await offer.locator('[data-panel="later"]').tap();
  await expect(offer).toBeHidden();
  expect(await G(page, "q.isNew('walk-street')")).toBe(true);
  await talkTo(page, "coba");
  await finish(page, [1]);
  await offer.locator('[data-panel="accept"]').tap();
  expect(await G(page, "q.isActive('walk-street')")).toBe(true);
  await visit(page, "home");
  await expect(hud).toContainText("1/3");

  // --- lưu → mở lại giữ tiến độ ---
  expect(await G(page, "g.boot.saveNow()")).toBe(true);
  await page.evaluate(() => sessionStorage.setItem("gpv.test.keep", "1"));
  await page.reload();
  await page.waitForFunction(() => (window as any).__gpv?.ready === true, null, { timeout: 60_000 });
  errors.length = 0;
  await page.locator('[data-menu="continue"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(400);
  await expect(hud).toContainText("Dạo một vòng phố Hoa Sữa");
  await expect(hud).toContainText("1/3");
  expect(await G(page, "[q.isDone('talk-chu-tu'), q.isDone('meet-neighbors'), q.flags('walk-street')]")).toEqual([true, true, ["visit:home"]]);
  await visit(page, "bus");
  await visit(page, "river");
  await expect(done).toBeVisible();
  await done.locator(".x").tap(); // đóng bằng X vẫn nhận thưởng
  await expect(done).toBeHidden();
  expect(await G(page, "[s.money, s.reputation]")).toEqual([1_120_000, 12]);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("Phase 6: người qua đường, nút Nhiệm vụ, về menu giữa chừng", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe, { life: true });
  await newGame(page);

  // người qua đường: một câu chào, không lựa chọn, dừng lại nghe
  await talkTo(page, "minh");
  let st = await dlg(page);
  expect(st.speaker).toBe("Shipper Minh");
  const x0 = await G(page, "w.life.get('minh').wx");
  await G(page, "w.step(2)");
  expect(await G(page, "w.life.get('minh').wx"), "Đang nói chuyện mà vẫn bỏ đi").toBe(x0);
  await G(page, "d.advance()");
  st = await dlg(page);
  expect(st.choices).toEqual([]);
  await G(page, "d.advance()");
  expect((await dlg(page)).open).toBe(false);
  await G(page, "w.step(2)");
  expect(await G(page, "w.life.get('minh').wx")).not.toBe(x0);
  expect(await G(page, "s.money")).toBe(1_000_000);

  // nút Nhiệm vụ trên Master UI mở Sổ nhiệm vụ
  await page.locator('[data-action="quests"]').tap();
  const log = page.locator('[data-name="QuestLog"]');
  await expect(log).toBeVisible();
  await expect(log.locator(".q-card")).toHaveCount(2);
  await log.locator(".x").tap();
  await expect(log).toBeHidden();

  // đang nói chuyện mà về menu → hội thoại đóng, không thưởng nhầm
  await talkTo(page, "chutu");
  await page.evaluate(() => void (window as any).__gpv.boot.backToMenu());
  await page.waitForFunction(() => (window as any).__gpv.screen === "menu");
  await page.waitForTimeout(500);
  expect((await dlg(page)).open).toBe(false);
  await expect(page.locator('[data-name="QuestDone"]')).toBeHidden();
  await expect(page.locator('[data-menu="continue"]')).toContainText("1.000.000đ");
  expect(errors, errors.join("\n")).toEqual([]);
});
