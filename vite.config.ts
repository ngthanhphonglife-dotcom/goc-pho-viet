import { defineConfig } from "vite";

// GitHub Pages phục vụ tại /goc-pho-viet/. Khi đóng gói app (Capacitor) dùng base "./".
export default defineConfig(({ mode }) => ({
  base: mode === "app" ? "./" : "/goc-pho-viet/",
  build: { target: "es2020", assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
  server: { host: true },
}));
