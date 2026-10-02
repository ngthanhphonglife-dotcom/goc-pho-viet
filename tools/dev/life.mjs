import { chromium } from "@playwright/test";
const out = process.argv[2] || "/tmp/life";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const logs = [];
p.on("console", m => { if (!m.text().includes("GL Driver")) logs.push(m.type() + ": " + m.text()); });
p.on("pageerror", e => logs.push("pageerror: " + e.message));
await p.goto("http://localhost:4173/goc-pho-viet/");
await p.waitForFunction(() => window.__gpv?.ready, null, { timeout: 90000 });
await p.evaluate(() => window.__gpv.demo());
await p.waitForFunction(() => window.__gpv.screen === "game"); await p.waitForTimeout(600);
for (let i = 0; i < 4; i++) { await p.waitForTimeout(1500); await p.screenshot({ path: `${out}-${i}.png` }); }
console.log(JSON.stringify(await p.evaluate(() => window.__gpv.world.life.snapshot().map(s => [s.id, Math.round(s.x), s.anim, s.face]))));
console.log(logs.join("\n"));
await b.close();
