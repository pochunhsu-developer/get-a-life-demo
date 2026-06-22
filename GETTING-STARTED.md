# 如何上手

兩條路：先試用內建範例，或直接開始記自己的。

## 先試用（看它長怎樣）

```bash
cd viewer
npm install
npm run dev      # http://localhost:4321
```

還沒有自己的資料時，畫面會讀內建範例 `demo-mandala/`。可以先點點看：左鍵記一筆、右鍵設下一步，感受一下整體運作。

## 開始記自己的

1. 複製空白範本成你的資料夾（`mandala/` 已列入 gitignore，不會被上傳）：

   ```bash
   cp -r template-mandala mandala
   ```

2. 編輯 `mandala/` 裡的八個檔，把它變成你的：

   - 把每個檔 frontmatter 的 `大格` 改成你的領域名稱。範本附的八個領域只是建議，換成對你成立的（也可以改檔名）。
   - 把每個檔裡的八個「方向」改成你在這塊地想關注或努力的面向。
   - **改方向名稱時，frontmatter 的 `詞:` 和下面對應的 `## 方向X` 要一起改成一樣的字**，記錄才對得上。
   - 用不到八個方向沒關係，留著或刪掉都行。

3. 重啟 `npm run dev`。現在讀的就是你自己的 `mandala/` 了。

   > 資料目錄的解析順序是：環境變數 `MANDALA_DIR` → `mandala/` → `demo-mandala/`。所以只要 `mandala/` 存在，就會自動讀它。

4. 開始記錄：

   - **左鍵**點一格 → 寫一行你做了或想了什麼。那一格會更新日期、重新變亮。
   - **右鍵**點一格 → 設一個「下一步」（想清楚但還沒做的一件事）。
   - 還沒記錄的方向會以「迷霧」顯示，這是正常的，不用補滿。

## 在多裝置上使用（同步）

資料是純檔案，多裝置同步交給現成工具就行，這個專案本身不需要做任何事。把 `MANDALA_DIR` 指到一個會同步的資料夾即可：

```bash
# 例：指到 Obsidian vault 裡的一個子資料夾
MANDALA_DIR="/path/to/你的 Vault/mandala" npm run dev
```

也可以是 Google Drive、Dropbox、iCloud 等同步資料夾裡的目錄。

**建議的組合**：把那批 `.md` 放在 Obsidian vault 的一個子資料夾。

- **桌機**：跑 viewer（`npm run dev`）看九宮格、用左右鍵記錄。記錄只寫進內文，viewer 不會改 frontmatter。
- **手機／平板**：用 Obsidian 開同一批 `.md`，在對應的 `## 方向` 底下手動加一行 `- YYYY-MM-DD — 你做了什麼`。這是純 markdown 內文，安全。

幾個注意：

- **避免用 Obsidian 的「屬性（Properties）」介面去編這些檔的 frontmatter。** frontmatter 裡的 `小格` 是巢狀清單，Obsidian 的屬性 UI 沒有對應型別，從那裡編可能弄亂結構。需要改方向名稱、封存等動到 frontmatter 的事，直接用文字編輯器改純文字（建議在桌機上）。
- 只在內文加 `- 日期 — …` 一律安全。viewer 用標準 YAML 解析讀 frontmatter，就算同步工具把它重新排版（換成流式、加引號、重排 key）也讀得到（已實測）。
- 同步衝突產生的副本檔（檔名含 `conflicted copy` / `sync-conflict`）會被自動略過，dev server 會提醒你，請手動合併後刪掉。
- **隱私**：這份資料偏私密。建議用端對端加密的同步（例如 Obsidian Sync）。Google Drive、Dropbox 預設不是 E2E，內容會以可讀形式存在它們的伺服器上。

## 之後

- 每隔一段時間回來，把真正有動靜的方向記一筆就好。久沒記錄的格子會自己變暗，提醒你哪塊地最近被冷落了。
- 想了解亮暗、迷霧、封存這些規則，見 [MECHANISM.md](MECHANISM.md)。
- 想知道背後的設計取捨，見 [DESIGN-NOTES.md](DESIGN-NOTES.md)。
