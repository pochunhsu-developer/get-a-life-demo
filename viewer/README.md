# viewer — 可拋棄的工具層

活網格曼陀羅的本機 renderer。**它是工具，不是日記。** 真正的資料在資料目錄（純 Markdown），
這個資料夾爛掉、重寫、`rm -rf` 都不該動到那層一根寒毛。整體說明見 [../README.md](../README.md)。

## 跑起來

```bash
cd viewer
npm install
npm run dev      # http://localhost:4321
```

預設讀 repo 根的 `demo-mandala/`（架空範例）。要用你自己的資料，見 [../README.md](../README.md#用你自己的資料)。

### Docker

```bash
cd viewer
docker compose up --build   # 首次
docker compose up           # 之後
# → http://localhost:4321
```

Compose 預設把 `../demo-mandala` 掛進容器當資料層；改 [docker-compose.yml](docker-compose.yml) 的掛載成
`../mandala` 即指向你自己的真實日記，寫回會直接落到 host 的 `.md`。改 `src/` 會即時 reload。

## 它做什麼（v1，刻意極簡）

1. **全貌 render**：把八塊地排成 9×9 曼陀羅。每個小格依「最新註記日期」連續枯萎——
   亮 = 最近有照料，暗 = 久未來過，虛線「迷霧」= 還沒走過的地。大格外框越新鮮越透墨綠。
2. **左鍵記一筆**：點任一小格，寫一行 → append 到對應 `N-大格.md` 的 `## 詞` 區塊。
   寫回只動內文、不碰 frontmatter；新鮮度由內文記錄推導，不需要存日期。
3. **右鍵標下一步**：在小格上設一個「想清楚但還沒做的一步」（一格至多一個，寫成 `→ 下一步` 行）。
   刻意獨立於註記：**不刷新新鮮度、不算荒廢**——是提醒，不是照料的證據。

## 重要：這是 local-first 工具，不是要部署的網站

寫回靠 dev server 的 on-demand API route（[src/pages/api/annotate.ts](src/pages/api/annotate.ts)），
必須以 `npm run dev`（或 Docker）在本機跑。**純靜態 build／靜態托管無法寫回。**

## 刻意還沒做（擋範圍蔓延）

- 時間軸 pivot（單一領域的長期趨勢）。
- 封存 UI、槽位釋放門檻。
- render 的進階視覺語言（地形／雜草）。

## 技術

Astro 6 + js-yaml，無外部服務、無祕鑰。資料存取在 [src/lib/mandala.mjs](src/lib/mandala.mjs)，
寫回 API 在 [src/pages/api/](src/pages/api/)。資料目錄由 `MANDALA_DIR` 解析，預設 `demo-mandala/`。
