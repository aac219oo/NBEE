# 可移除/需處理檔案列表 (Candidates for Removal)

以下是在項目審查中發現的冗餘或可疑檔案列表。

## ⚠️ 建議刪除 (Redundant)

1.  **`packages/core/bunfig.toml`**
    - **位置**: `packages/core/bunfig.toml`
    - **原因**: 內容與根目錄的 `bunfig.toml` 重複。Monorepo 根目錄配置已足夠。

2.  **`packages/core/.gitignore`**
    - **位置**: `packages/core/.gitignore`
    - **原因**: 與根目錄 `.gitignore` 重複。Git 規則會自動繼承，子目錄無需保留副本。

3.  **`apps/cms/`** (目錄)
    - **位置**: `apps/cms/`
    - **原因**: 空目錄，無內容。

## ❓ 需要確認 (Review Required)

4.  **`packages/core/proxy.ts`**
    - **位置**: `packages/core/proxy.ts`
    - **原因**: 從代碼內容判斷，這應該是 Next.js 的 **Middleware**。
    - **行動**:
        - 如果這是 Middleware: 請重命名為 **`middleware.ts`** 才能生效。
        - 如果不再使用: 請 **刪除**。
