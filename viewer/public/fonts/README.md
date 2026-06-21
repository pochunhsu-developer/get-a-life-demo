# 字型（選用，自備）

UI 的襯線字走 `CustomSerif` → 系統襯線字的退路。**repo 不附任何字型檔**，
你不放也能跑：[src/layouts/Layout.astro](../../src/layouts/Layout.astro) 的 `--font-serif`
會自動退到 `Songti TC` / `Noto Serif CJK` / `Georgia` 等系統字。

想換成自己偏好的明體，把**你自己擁有授權**的字型檔放這裡，檔名固定為：

```
serif-regular.otf     # 一般字重（400）
serif-semibold.otf    # 半粗（600）——建議用真 semibold，別讓瀏覽器把 regular 假性加粗
```

> ⚠️ 請只放你有合法授權散布／使用的字型。許多漂亮的中文明體是**付費商用字型**，
> 不能連同公開 repo 一起散布——所以這裡刻意留空、由使用者自備。

放進來的 `.otf` 已被 [.gitignore](../../../.gitignore) 忽略，不會被 commit。
