import { chromium } from "@playwright/test";
const out = process.argv[2] || "/tmp/street";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const logs = [];
p.on("console", m => { if (!m.text().includes("GL Driver")) logs.push(m.type() + ": " + m.text()); });
p.on("pageerror", e => logs.push("pageerror: " + e.message));
await p.goto("http://localhost:4173/goc-pho-viet/");
await p.waitForFunction(() => window.__gpv?.ready, null, { timeout: 90000 });
await p.evaluate(() => window.__gpv.demo());
await p.waitForFunction(() => window.__gpv.screen === "game"); await p.waitForTimeout(600);
for (const [n, x] of [["left", 0], ["midleft", 540], ["center", 1080], ["midright", 1620], ["right", 9999]]) {
  await p.evaluate((x) => window.__gpv.world.setCamera(x), x); await p.waitForTimeout(250);
  await p.screenshot({ path: `${out}-${n}.png` });
}
console.log(JSON.stringify(await p.evaluate(() => ({ cam: window.__gpv.world.camera, st: window.__gpv.world.stats.textures.length, rs: window.__gpv.world.stats.rasterScale }))));
console.log(logs.join("\n"));
await b.close();
