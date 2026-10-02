import { chromium } from "@playwright/test";
const out = process.argv[2] || "/tmp/walk";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const logs = [];
p.on("console", m => { if (!m.text().includes("GL Driver")) logs.push(m.type() + ": " + m.text()); });
p.on("pageerror", e => logs.push("pageerror: " + e.message));
await p.goto("http://localhost:4173/goc-pho-viet/");
await p.waitForFunction(() => window.__gpv?.ready, null, { timeout: 90000 });
await p.evaluate(() => window.__gpv.demo());
await p.waitForFunction(() => window.__gpv.screen === "game"); await p.waitForTimeout(500);
const st = () => p.evaluate(() => { const w = window.__gpv.world; return { ...w.player.pos, moving: w.player.moving, near: w.nearby?.name, cam: Math.round(w.camera.x) }; });
await p.screenshot({ path: `${out}-0.png` });
// đi tới Cô Ba
await p.evaluate(() => { const w = window.__gpv.world; w.interact({ kind: "char", c: w.life.get("coba"), name: "Cô Ba" }); w.step(1.2); });
await p.waitForTimeout(300); await p.screenshot({ path: `${out}-1.png` }); console.log(JSON.stringify(await st()));
await p.evaluate(() => window.__gpv.world.step(6)); await p.waitForTimeout(300); await p.screenshot({ path: `${out}-2.png` }); console.log(JSON.stringify(await st()));
// đi tới Chú Tư
await p.evaluate(() => { const w = window.__gpv.world; w.interact({ kind: "char", c: w.life.get("chutu"), name: "Chú Tư" }); w.step(8); });
await p.waitForTimeout(300); await p.screenshot({ path: `${out}-3.png` }); console.log(JSON.stringify(await st()));
// về quầy
await p.evaluate(() => { const w = window.__gpv.world; w.interact({ kind: "hotspot", h: w.hotspots.find(h => h.id === "cart"), name: "" }); w.step(10); });
await p.waitForTimeout(400); console.log(JSON.stringify(await st()), await p.evaluate(() => window.__gpv.ui.placeholderTitle));
console.log(logs.join("\n"));
await b.close();
