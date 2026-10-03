import { defineConfig } from "@playwright/test";

const chromium = { executablePath: process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium", args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] };
const mobile = (width: number, height: number, deviceScaleFactor: number) =>
  ({ viewport: { width, height }, deviceScaleFactor, isMobile: true, hasTouch: true, launchOptions: chromium });

export default defineConfig({
  testDir: "tests",
  timeout: 900_000,
  expect: { timeout: 20_000 }, // máy test vẽ bằng GPU giả lập rất chậm → cho các phép chờ dư thời gian
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4173/goc-pho-viet/", launchOptions: chromium },
  webServer: { command: "npx vite preview --port 4173 --strictPort", url: "http://localhost:4173/goc-pho-viet/", reuseExistingServer: true },
  projects: [
    { name: "1080x1920 (360x640@3)", use: mobile(360, 640, 3) },
    { name: "iPhone 15 (390x844@3)", use: mobile(390, 844, 3) },
    { name: "iPhone 15 Pro Max (430x932@3, notch)", use: { ...mobile(430, 932, 3) }, metadata: { safe: { top: 59, bottom: 34 } } },
    { name: "Android (412x915@2.625)", use: mobile(412, 915, 2.625) },
    { name: "iPad (768x1024@2)", use: { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, hasTouch: true, launchOptions: chromium } },
  ],
});
