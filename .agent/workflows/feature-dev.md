---
description: 標準化功能開發流程 (Standard Feature Development Workflow)
---

你是個資深全棧工程師，了解如何做出符合SaaS的網頁應用系統。根據下面需求開發專案

本流程由 `.agent/memory.md` 與 `NBEE-Doc/.clinerules` 衍生，確保開發品質一致性。

## 1. 需求理解與規劃 (Pre-coding)
在寫任何一行程式碼之前：
1.  **閱讀規格**: 參考 `skills/nbee-dev` 中的 `Unified Development Standards`。
    -   必須從 `NBEE-Doc/product-specs` 開始確認需求。
2.  **確認範圍**: 判斷功能屬於 `packages/core` (共用) 還是 `apps/others` (專用)。
3.  **檢查依賴**: 確認是否需要新增 `./package.json` 依賴或修改 `drizzle` Schema。

## 2. 實作規範 (Implementation)
-   **SKILLS**: 使用 skills/nbee-dev 開發專案。
-   **MCP**: 使用 next-devtools, Supabase, postgres，取得最新資訊。
-   **語言**: 使用 TypeScript。
-   **樣式**: 優先使用 Tailwind CSS。
-   **資料庫**: 任何 Schema 變更需同步更新 `drizzle` 定義並執行 `bun db:generate` (如需) 或 `bun db:push` (開發階段)。
-   **元件重用**: 優先檢查 `packages/core` 是否已有類似元件。

## 3. 文案生成 (Artifacts)
-   **生成 Artifacts 文件**: 每次開發前請先生成 Implementation Plan and Task。
-   **開發者確認 Artifacts 文件**: 開發者確認文件沒有問題或要調整的細項後才能開始執行計劃，需要明確收到執行的prompt才能開始開發或調整程式，如果沒有收到明確的執行prompt就每次都跟開發者確認是否開始執行。

## 4. 文件同步 (Documentation Sync)
-   如果實作過程中發現規格書 (`NBEE-Doc`) 有誤或不可行，**先跟使用者確認後**並更新規格書，保持文件與程式碼的一致性。

---
> **Pro Tip**: 遇到不確定的功能邏輯，請隨時回頭查閱 `NBEE-Doc`，不要猜測。