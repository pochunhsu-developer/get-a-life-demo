# Get a Life

> 一個「活網格」版的曼陀羅人生盤點：純 Markdown 資料 + 一個可拋棄的本機 viewer。
> 一面**照妖鏡**（讓荒廢顯眼）＋一條**時間軸**（讓焦點變遷看得見）——不是化妝品。

![全貌](docs/shots/01-hero.png)

## 這是什麼

- **八塊地**（工作 / 朋友 / 信仰 / 伴侶 / 家庭 / 嗜好 / 經濟 / 夢想），各自展開成 3×3，排成大谷翔平那種 9×9 曼陀羅（Mandal-Art）。
- 每個小格依「**最新註記日期**」連續枯萎：亮 = 最近照料、暗 = 久未來過、虛線「迷霧」= 還沒走過的地。
- 點一格 → 寫一行 → append 回對應的 `.md`。資料是純文字，工具無關、永久可讀。

| 記一筆 | 看一格 | 視覺語言 |
|---|---|---|
| ![記一筆](docs/shots/02-log.png) | ![看一格](docs/shots/03-detail.png) | ![特徵](docs/shots/04-features.png) |

## 這不是什麼（先講清楚，免得誤會）

- **不是要部署的網站**，是本機工具。寫回需 dev server，靜態托管無法記一筆（見下方 local-first 說明）。
- **不是即插即用產品**，是一份**參考實作**。schema 是中文欄位、八塊地是作者個人的人生分類，你要自己改。
- **不是決策器**。它是鏡子，不是天平——刻意不幫你排序輕重。
- 背後的設計取捨見 **[DESIGN-NOTES.md](DESIGN-NOTES.md)**；完整資料模型見 **[MECHANISM.md](MECHANISM.md)**。

## 跑起來

```bash
cd viewer
npm install
npm run dev          # http://localhost:4321
```

第一次跑會讀隨附的架空範例 `demo-mandala/`，零設定即可看到全貌。Docker 用法見 [viewer/README.md](viewer/README.md)。

## 用你自己的資料

資料目錄由 `MANDALA_DIR` 解析，優先序：環境變數 → `mandala/` → `demo-mandala/`。

```bash
cp -r demo-mandala mandala     # mandala/ 已被 gitignore，永遠不會進 repo
# 編輯 mandala/*.md 成你自己的八塊地，重跑 dev server 即生效
```

或不複製、直接指定：`MANDALA_DIR=/path/to/yours npm run dev`。

## 資料格式

每塊地一個檔（`N-名稱.md`）：frontmatter 是「格子登記簿」，body 是「dated 註記 log」。

```markdown
---
大格: 信仰
position: 2
last_tended: 2026-06-18
小格:
  - 詞: 團契
    born: 2026-06-14
    last_tended: 2026-06-18
    archived: false
---

## 團契
- 2026-06-18 — 今天小組嘗試了一個破冰，氣氛比上次好。
```

荒廢由「多久沒有新註記」連續推導——**不改詞是正常健康，不是訊號**。空格 = 誠實的迷霧，不是待辦、不必有罪惡感。完整規則見 [MECHANISM.md](MECHANISM.md)。

## local-first 設計（重要）

點小格寫回 `.md` 靠 dev server 的 on-demand API route，必須 `npm run dev`（或 Docker）在本機跑。
**純靜態 build／靜態托管無法寫回**——這是刻意的：你的資料留在你自己的機器上，工具只是一層皮。

## 字型（選用）

UI 的襯線字預設用 [蘭陽明體（jf-lanyangming）](https://justfont.com/lanyang/)——justfont 免費釋出的開源台灣明體。
repo **不打包**字型檔（14MB 太肥、且尊重各自授權）。沒安裝也沒關係，會自動退到 `Georgia` / 系統襯線字。
想要原始視覺，把 `.otf` 放進 [viewer/public/fonts/](viewer/public/fonts/)（檔名見該資料夾說明）即可。

## License

[MIT](LICENSE)。code 與設計筆記隨意取用；範例資料是架空的。
