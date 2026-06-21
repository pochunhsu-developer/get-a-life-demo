# Get a Life

一個以純 Markdown 為資料、搭配一個本機 viewer 的人生盤點工具。把生活分成八個領域，排成 9×9 的曼陀羅（Mandal-Art）格狀圖，讓你一眼看到哪些領域最近有在經營、哪些已經很久沒碰。

![全貌](docs/shots/01-hero.png)

## 這是什麼

把生活分成八塊領域，每塊再展開成 3×3，合起來是大谷翔平式的 9×9 曼陀羅。範例用的八塊是：經濟、信仰、健康、工作事業、人際、嗜好、夢想、家庭伴侶。這是作者自己的分類，使用時請換成你自己的。

每個小格的亮度由「最近一次記錄的日期」決定：最近有記錄就亮，越久沒記錄就越暗，從未記錄過的格子顯示為虛線「迷霧」。整張圖會隨著你的實際經營而明暗變化，久未照顧的領域會自己浮現出來。

兩種操作：

- **左鍵點一格**：寫一行記錄，append 到對應的 `.md`。這會更新該格的日期，讓它重新變亮。
- **右鍵點一格**：設一個「下一步」，也就是你已經想清楚、但還沒開始做的那一件事。一格最多一個。下一步不影響亮度，它是提醒，不代表你已經經營過這格。這個功能在總覽截圖裡看不到，要右鍵才會出現。

資料全部是純文字，不依賴這個工具也能讀寫。

| 記一筆 | 看一格 | 視覺語言 |
|---|---|---|
| ![記一筆](docs/shots/02-log.png) | ![看一格](docs/shots/03-detail.png) | ![特徵](docs/shots/04-features.png) |

## 這不是什麼

為避免誤會，先說明它不做的事：

- **不是要部署的網站**，而是本機工具。寫回記錄需要 dev server，靜態托管無法記錄（見下方 local-first 說明）。
- **不是即插即用的產品**，而是一份參考實作。frontmatter 的欄位是中文，八塊領域是作者個人的分類，使用前需要自行調整。
- **不幫你做決策**。它呈現現況，不會幫你排序各領域的輕重。

設計上的取捨見 [DESIGN-NOTES.md](DESIGN-NOTES.md)，完整資料模型見 [MECHANISM.md](MECHANISM.md)。

## 跑起來

```bash
cd viewer
npm install
npm run dev          # http://localhost:4321
```

第一次執行會讀取隨附的範例資料 `demo-mandala/`，不需任何設定就能看到完整畫面。Docker 用法見 [viewer/README.md](viewer/README.md)。

## 用你自己的資料

資料目錄由 `MANDALA_DIR` 決定，解析順序為：環境變數 → `mandala/` → `demo-mandala/`。

```bash
cp -r demo-mandala mandala     # mandala/ 已列入 gitignore，不會進 repo
# 編輯 mandala/*.md 換成你自己的八塊領域，重啟 dev server 生效
```

也可以不複製，直接指定路徑：`MANDALA_DIR=/path/to/yours npm run dev`。

## 資料格式

每塊領域一個檔案（`N-名稱.md`）。frontmatter 記錄這塊地有哪些格子與各自的日期，body 是每個格子底下的記錄。

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

一塊地的荒廢程度由「多久沒有新記錄」推算。沒有更動格子名稱屬於正常狀態，不代表荒廢；判斷依據只有記錄的新舊。沒有記錄的格子顯示為迷霧，這是中性的現況，不是待辦事項。完整規則見 [MECHANISM.md](MECHANISM.md)。

## local-first 設計

寫回 `.md` 依賴 dev server 的 on-demand API route，所以必須用 `npm run dev`（或 Docker）在本機執行，純靜態 build 無法寫回。這樣設計的結果是：你的資料一直留在自己的機器上，工具只是讀寫這些檔案的一層介面。

## 字型（選用，自備）

介面的襯線字會優先用自訂明體，找不到就退回系統襯線字。repo 不附任何字型檔，因為多數中文明體是付費商用字型，不適合連同公開 repo 一起散布。不放字型也能正常執行，會退回 `Songti TC`、`Noto Serif CJK`、`Georgia` 等系統字。想用自己偏好的明體，把你有授權的 `.otf` 放進 [viewer/public/fonts/](viewer/public/fonts/)，檔名見該資料夾說明。

## License

[MIT](LICENSE)。程式碼與設計筆記可自由取用，範例資料為虛構。字型需自備（見上）。
