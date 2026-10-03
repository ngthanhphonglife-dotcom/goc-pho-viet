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
  // --- mặc định "Tiếng Việt": máy không có giọng đọc → phát file giọng nói có sẵn, KHÔNG líu lo ---
  if (!(await G(page, "g.voice.ttsAvailable"))) {
    await G(page, `(() => { g.voice.log.length = 0; w.interact({ kind: "char", c: w.life.get("mai"), name: "" }); for (let i = 0; i < 60 && !g.dialogue.state.open; i++) w.step(0.5); })()`);
    await expect.poll(async () => (await G(page, "g.dialogue.state.typing")) as boolean, { timeout: 60_000 }).toBe(false);
    expect(await G(page, "g.voice.log.slice()")).toEqual(["clip:mai"]);
    await G(page, "g.dialogue.close()");
    await G(page, `(() => { g.voice.log.length = 0; const c = w.customers.spawn("student", "tratac", false); c.patience = c.max = 999; for (let i = 0; i < 200 && c.state !== "waiting"; i++) w.step(0.25); })()`);
    expect((await G(page, "g.voice.log.slice()")).join()).toMatch(/^clip:kh_hs[12]$/);
    await G(page, "w.customers.clear()");
    // file giọng nói tải được và giải mã được, dài đúng một câu nói
    const clip = await page.evaluate(async () => {
      const g = (window as any).__gpv;
      const r = await fetch(g.voice.base + g.clipKey("chutu", "Sao rồi con, chịu đi chào bà con trong phố chưa?") + ".mp3");
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const buf = await (g.sfx.context ?? new Ctx()).decodeAudioData(await r.arrayBuffer());
      return { ok: r.ok, dur: buf.duration };
    });
    expect(clip.ok).toBe(true);
    expect(clip.dur).toBeGreaterThan(1.5);
    expect(clip.dur).toBeLessThan(8);
  }
  // mọi câu thoại trong game đều có file giọng nói
  const missing = await page.evaluate(() => {
    const g = (window as any).__gpv, q = g.boot.quests, out: string[] = [];
    for (const id of ["chutu", "coba", "mai", "hoang", "lan", "nam", "minh"]) for (let seed = 0; seed < 6; seed++) {
      const sc = g.dialogueFor(id, q, seed);
      for (const n of Object.values(sc.nodes) as any[]) { const who = n.who === "me" ? "player" : id; if (!g.voice.hasClip(who, n.text)) out.push(who + "|" + n.text); }
    }
    return out;
  });
  expect(missing, missing.join("\n")).toEqual([]);

  const pv = await G(page, "[g.voice.profile('chutu'), g.voice.profile('coba'), g.voice.profile('lan'), g.voice.profile('kh_ship1')]");
  expect(pv[0].ttsPitch).toBeLessThan(pv[1].ttsPitch);   // Chú Tư trầm hơn Cô Ba
  expect(pv[1].ttsPitch).toBeLessThan(pv[2].ttsPitch);   // Cô Ba trầm hơn Lan
  expect(pv[3].ttsRate).toBeGreaterThan(pv[0].ttsRate);  // shipper nói nhanh hơn Chú Tư
  await G(page, "b.settings.set({ voice: 'tts' })");

  // --- Cài đặt › Giọng nói ---
  await page.locator('[data-action="settings"]').tap();
  const panel = page.locator('[data-name="SettingsPanel"]');
  await expect(panel.locator(".seg-btn")).toHaveCount(2);
  const card = (await panel.locator(".card").boundingBox())!;
  expect(card.y + card.height, "Bảng cài đặt tràn màn hình").toBeLessThanOrEqual(page.viewportSize()!.height + 0.5);
  await page.screenshot({ path: `docs/screens/settings_voice_${info.project.name.replace(/[^\w]+/g, "_")}.png` });
  // mặc định là "Tiếng Việt" (giọng đọc của máy); máy không có giọng tiếng Việt thì tự dùng "Líu lo" và có ghi chú
  const tts = await G(page, "g.voice.ttsAvailable");
  expect(await G(page, "b.settings.value.voice")).toBe("tts");
  expect(await G(page, "g.voice.mode()")).toBe("tts"); // không tự rơi về líu lo
  await expect(panel.locator('.seg-btn[data-voice="tts"]')).toHaveClass(/on/);
  if (!tts) await expect(panel).toContainText("giọng có sẵn trong game");
  await expect(panel.locator('.seg-btn[data-voice="babble"]')).toHaveCount(0); // đã bỏ líu lo
  await expect(panel).not.toContainText("Líu lo");
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
