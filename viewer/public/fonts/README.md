# 字型（選用）

UI 的襯線字預設用 **蘭陽明體（jf-lanyangming）**，justfont 免費釋出的開源台灣明體：
<https://justfont.com/lanyang/>

repo 刻意**不打包** `.otf`（單檔 7MB+，也尊重字型授權）。沒有字型也能跑——
[src/layouts/Layout.astro](../../src/layouts/Layout.astro) 的 `@font-face` 會自動退到 `Georgia` / 系統襯線字。

想還原原始視覺，下載後把兩個檔放這裡（檔名需一致）：

```
jf-lanyangming-2.0-book.otf
jf-lanyangming-2.0-semibold.otf
```

放進來的字型檔已被 [.gitignore](../../../.gitignore) 忽略，不會被 commit。
