---
description: 標準化功能開發流程 (Standard Feature Development Workflow)
---

你是個資深全棧工程師，了解如何做出符合SaaS的網頁應用系統。根據下面需求開發專案

本流程由 `.agent/memory.md` 與 `NBEE-Doc/.clinerules` 衍生，確保開發品質一致性。

## 1. 需求理解與規劃 (Pre-coding)
在寫任何一行程式碼之前：
1.  **閱讀規格**: 前往 `NBEE-Doc/` 閱讀相關文件。
    -   UI/UX 需求：閱讀 `*-feature.md`。
    -   資料/API 規格：閱讀 `*-spec.md`。
2.  **確認範圍**: 判斷功能屬於 `packages/core` (共用) 還是 `apps/others` (專用)。
3.  **檢查依賴**: 確認是否需要新增 `./package.json` 依賴或修改 `drizzle` Schema。

## 2. 實作規範 (Implementation)
-   **MCP**: 使用 next-devtools, Supabase, postgres，取得最新資訊。
-   **語言**: 使用 TypeScript。
-   **樣式**: 優先使用 Tailwind CSS。
-   **資料庫**: 任何 Schema 變更需同步更新 `drizzle` 定義並執行 `bun db:generate` (如需) 或 `bun db:push` (開發階段)。
-   **元件重用**: 優先檢查 `packages/core` 是否已有類似元件。

## 3. 驗證與測試 (Verification)
提交前必須執行：
1.  **Lint Check**:
    ```bash
    bun lint
    ```
2.  **Type Check & Build**:
    ```bash
    # 這是 Vercel 部署成功的關鍵，務必在本地通過
    bun run build
    ```

## 4. 文件同步 (Documentation Sync)
-   如果實作過程中發現規格書 (`NBEE-Doc`) 有誤或不可行，**先跟使用者確認後**並更新規格書，保持文件與程式碼的一致性。

## 5. 提交與部署 (Commit & Deploy)
1.  **Submodule 處理** (若有修改 core 或其他 apps):
    -   先在子模組內 Commit & Push。
    -   **回到根目錄**，更新 Submodule Pointer。
2.  **Root Commit**:
    -   使用 Conventional Commits (e.g., `feat:`, `fix:`, `chore:`).
    -   範例: `feat(cms): implement navigation ordering logic`

---
> **Pro Tip**: 遇到不確定的功能邏輯，請隨時回頭查閱 `NBEE-Doc`，不要猜測。