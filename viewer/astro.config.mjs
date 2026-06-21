import { defineConfig } from 'astro/config';

// 可拋棄的工具層。資料永遠在資料目錄（見 src/lib/mandala.mjs 的 MANDALA_DIR），
// 本專案爛掉、重寫、rm -rf 都不該碰它一根寒毛。
// 以 `npm run dev` 在本機跑：點小格寫回 .md 需要 dev server（API route 在 dev 下即時執行）。
// 注意：純靜態 build 無法寫回——這是刻意的 local-first 工具，不是要部署的網站。
export default defineConfig({
  server: { port: 4321, host: true }, // host:true 讓 Docker 連得進來
  devToolbar: { enabled: false },
});
