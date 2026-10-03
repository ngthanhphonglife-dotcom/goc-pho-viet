import { expect, test, type Page } from "@playwright/test";
import { boot, type Safe } from "./helpers";

// Nhạc nền chill + lồng tiếng nhân vật (bản 0.10.1).

const G = (page: Page, fn: string) => page.evaluate(`(() => { const g = window.__gpv, b = g.boot, w = g.world, s = g.state.value; return ${fn}; })()`) as Promise<any>;

async function newGame(page: Page) {
  await page.locator('[data-menu="new"]').tap();
  await page.locator('[data-panel="start"]').tap();
  await page.waitForFunction(() => (window as any).__gpv.screen === "game");
  await page.waitForTimeout(500);
}

test("Âm thanh: nhạc nền theo buổi, giọng nhân vật theo dấu thanh, cài đặt giọng nói", async ({ page }, info) => {
  const errors = await boot(page, info.project.metadata?.safe as Safe, { life: true });
  await newGame(page); // đã có thao tác chạm → âm thanh được mở khoá

  // --- nhạc nền: bật sau lần chạm đầu, lên lịch nốt liên tục, đổi không khí theo buổi/thời tiết ---
  let m = await G(page, "g.music.state");
  expect(m.wanted).toBe(true);
  const running = await G(page, "g.sfx.context && g.sfx.context.state === 'running'");
  if (running) {
    await expect.poll(async () => (await G(page, "g.music.state")).scheduled as number, { timeout: 40_000, message: "Nhạc không phát nốt nào" }).toBeGreaterThan(m.scheduled + 8);
    // âm lượng 0 → ngừng lên lịch nốt
    await G(page, "b.settings.set({ music: 0 })");
    await page.waitForTimeout(2500);
    const a = (await G(page, "g.music.state")).scheduled;
    await page.waitForTimeout(2500);
    expect((await G(page, "g.music.state")).scheduled).toBe(a);
    await G(page, "b.settings.set({ music: 70 })");
  }
  const mood = async (minute: number, kind: string) => { await G(page, `(g.time.forced = "${kind}", g.time.set(s.day, ${minute}), w.atmo.set(${minute}, "${kind}", true), w.step(0.3))`); return (await G(page, "g.music.state")).mood; };
  expect(await mood(9 * 60, "sunny")).toBe("day");
  expect(await mood(17 * 60 + 30, "sunny")).toBe("evening");
  expect(await mood(21 * 60, "sunny")).toBe("night");
  expect(await mood(14 * 60, "heavyRain")).toBe("rain");
  await mood(9 * 60, "sunny");

  // --- giọng: cao độ theo đúng dấu thanh của từng chữ, mỗi nhân vật một giọng ---
  await G(page, "(g.voice.log.length = 0, g.voice.say('chutu', 'ma má mà mả mã mạ'))");
  expect(await G(page, "g.voice.log.slice()")).toEqual(["ngang", "sac", "huyen", "hoi", "nga", "nang"].map((t) => "babble:chutu:" + t));
  const pv = await G(page, "[g.voice.profile('chutu'), g.voice.profile('coba'), g.voice.profile('lan'), g.voice.profile('kh_ship1')]");
  expect(pv[0].f0).toBeLessThan(pv[1].f0);   // Chú Tư trầm hơn Cô Ba
  expect(pv[1].f0).toBeLessThan(pv[2].f0);   // Cô Ba trầm hơn Lan
  expect(pv[3].speed).toBeGreaterThan(pv[0].speed); // shipper nói nhanh hơn Chú Tư
  expect(new Set(pv.map((p: any) => p.f0 + p.type)).size).toBe(4);

  // --- hội thoại: chữ chạy tới đâu, nhân vật "nói" tới đó ---
  await G(page, `(() => { g.voice.log.length = 0; w.interact({ kind: "char", c: w.life.get("mai"), name: "" }); for (let i = 0; i < 60 && !g.dialogue.state.open; i++) w.step(0.5); })()`);
  await expect.poll(async () => (await G(page, "g.voice.log.filter((x) => x.startsWith('babble:mai')).length")) as number, { timeout: 30_000 }).toBeGreaterThan(5);
  const words = (await G(page, "g.dialogue.state.text")).split(" ").length;
  await expect.poll(async () => (await G(page, "g.dialogue.state.typing")) as boolean, { timeout: 60_000 }).toBe(false);
  expect(await G(page, "g.voice.log.filter((x) => x.startsWith('babble:mai')).length")).toBe(words); // mỗi chữ một âm tiết
  await G(page, "g.dialogue.close()");

  // --- khách tới quầy gọi món bằng giọng của mình ---
  await G(page, `(() => { g.voice.log.length = 0; const c = w.customers.spawn("student", "tratac", false); c.patience = c.max = 999; for (let i = 0; i < 200 && c.state !== "waiting"; i++) w.step(0.25); })()`);
  const said: string[] = await G(page, "g.voice.log.slice()");
  expect(said.length).toBeGreaterThan(4);
  expect(said.every((x) => x.startsWith("babble:kh_hs")), said.join(",")).toBe(true);
  await G(page, "w.customers.clear()");

  // --- Cài đặt › Giọng nói ---
  await page.locator('[data-action="settings"]').tap();
  const panel = page.locator('[data-name="SettingsPanel"]');
  await expect(panel.locator(".seg-btn")).toHaveCount(3);
  const card = (await panel.locator(".card").boundingBox())!;
  expect(card.y + card.height, "Bảng cài đặt tràn màn hình").toBeLessThanOrEqual(page.viewportSize()!.height + 0.5);
  await page.screenshot({ path: `docs/screens/settings_voice_${info.project.name.replace(/[^\w]+/g, "_")}.png` });
  // mặc định là "Tiếng Việt" (giọng đọc của máy); máy không có giọng tiếng Việt thì tự dùng "Líu lo" và có ghi chú
  const tts = await G(page, "g.voice.ttsAvailable");
  expect(await G(page, "b.settings.value.voice")).toBe("tts");
  expect(await G(page, "g.voice.mode()")).toBe(tts ? "tts" : "babble");
  await expect(panel.locator(`.seg-btn[data-voice="${tts ? "tts" : "babble"}"]`)).toHaveClass(/on/);
  if (!tts) await expect(panel).toContainText("không có giọng đọc tiếng Việt");
  await panel.locator('.seg-btn[data-voice="babble"]').tap();
  expect(await G(page, "[b.settings.value.voice, g.voice.mode()]")).toEqual(["babble", "babble"]);
  // tắt giọng → không còn âm tiết, chữ chạy kêu "blip" như cũ
  await panel.locator('.seg-btn[data-voice="off"]').tap();
  await expect(panel.locator('.seg-btn[data-voice="off"]')).toHaveClass(/on/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("gpv.settings")!).voice)).toBe("off");
  await panel.locator('[data-panel="close"]').tap();
  await expect(panel).toBeHidden();
  await G(page, `(() => { g.voice.log.length = 0; g.sfx.log.length = 0; w.interact({ kind: "char", c: w.life.get("mai"), name: "" }); for (let i = 0; i < 60 && !g.dialogue.state.open; i++) w.step(0.5); })()`);
  await expect.poll(async () => (await G(page, "g.sfx.log.filter((x) => x === 'blip').length")) as number, { timeout: 30_000 }).toBeGreaterThan(2);
  expect(await G(page, "g.voice.log.length")).toBe(0);
  await G(page, "g.dialogue.close()");

  // --- chế độ Tiếng Việt (giả lập máy có giọng đọc): mỗi câu thoại được đọc nguyên câu, đúng nhân vật, đúng cao độ ---
  const spoken = await page.evaluate(async () => {
    const g = (window as any).__gpv, w = g.world, out: any[] = [];
    g.voice.viVoice = { lang: "vi-VN", name: "test" };
    const orig = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => { out.push({ text: u.text, pitch: u.pitch, rate: u.rate, lang: u.lang }); };
    g.boot.settings.set({ voice: "tts" });
    out.length = 0; g.voice.log.length = 0;
    w.interact({ kind: "char", c: w.life.get("chutu"), name: "" });
    for (let i = 0; i < 60 && !g.dialogue.state.open; i++) w.step(0.5);
    const line = g.dialogue.state.text;
    const c = w.customers.spawn("student", "tratac", false);
    for (let i = 0; i < 200 && c.state !== "waiting"; i++) w.step(0.25);
    window.speechSynthesis.speak = orig;
    return { out, line, log: g.voice.log.slice(), mode: g.voice.mode() };
  });
  expect(spoken.mode).toBe("tts");
  expect(spoken.out[0]).toMatchObject({ text: spoken.line, lang: "vi-VN" });
  expect(spoken.out[0].pitch, "Chú Tư phải giọng trầm").toBeLessThan(0.8);
  expect(spoken.out[1].text).toContain("Trà tắc"); // khách gọi món bằng tiếng Việt
  expect(spoken.out[1].pitch, "Học sinh phải giọng cao").toBeGreaterThan(1.3);
  expect(spoken.log.filter((x: string) => x.startsWith("babble")).length).toBe(0);
  expect(spoken.log[0]).toBe("tts:chutu");
  await G(page, "g.dialogue.close()");
  expect(errors, errors.join("\n")).toEqual([]);
});
