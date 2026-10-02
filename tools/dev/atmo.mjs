import { chromium } from "@playwright/test";
const out = process.argv[2] || "/tmp/atmo";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const logs = [];
p.on("console", m => { if (!m.text().includes("GL Driver")) logs.push(m.type() + ": " + m.text()); });
p.on("pageerror", e => logs.push("pageerror: " + e.message));
await p.goto("http://localhost:4173/goc-pho-viet/");
await p.waitForFunction(() => window.__gpv?.ready, null, { timeout: 90000 });
await p.evaluate(() => window.__gpv.demo());
await p.waitForFunction(() => window.__gpv.screen === "game"); await p.waitForTimeout(500);
const shots = [["06h", 6*60+10, "sunny"], ["12h", 12*60, "sunny"], ["17h30", 17*60+30, "sunny"], ["18h45", 18*60+45, "sunny"], ["21h", 21*60, "sunny"], ["rain", 14*60, "heavyRain"], ["rainnight", 20*60, "lightRain"]];
for (const [n, m, k] of shots) {
  await p.evaluate(([m, k]) => { const g = window.__gpv; g.time.forced = k; g.time.set(g.state.value.day, m); g.world.atmo.set(m, k, true); g.world.step(0.5); }, [m, k]);
  await p.waitForTimeout(400); await p.screenshot({ path: `${out}-${n}.png` });
}
console.log(logs.join("\n"));
await b.close();
