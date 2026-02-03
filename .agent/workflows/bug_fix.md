---
description: 標準化 Bug 修復流程 (Standard Bug Fix Workflow)
---

# Bug Fix Workflow

本流程確保 Bug 能被精準定位、修復，並且防止回歸 (Regression)。

## 1. 錯誤分析與重現 (Analysis & Reproduction)
在修復之前，必須先確認問題：
1.  **重現步驟**: 確定如何觸發該 Bug。
2.  **規格確認**: 查閱 `NBEE-Doc` 規格書。
    -   確認這是 Bug 還是 Feature (預期行為)。
    -   如果是與規格不符 -> **Fix Code**。
    -   如果是規格本身有漏洞 -> **Update Spec defined in NBEE-Doc**.
3.  **定位範圍**: 確認 Bug 發生在 `packages/core` (影響全部) 還是 `apps/cms` (影響單一)。

## 2. 修復策略 (Plan Fix)
-   **最小影響原則**: 修復應針對 Root Cause，避免副作用 (Side Effects)。
-   **Core Fix 注意事項**: 若修改 `core`，需思考是否會影響其他潛在使用該元件的 App。

## 3. 實作與驗證 (Implement & Verify)
1.  **執行修復**。
2.  **本地驗證**:
    -   執行重現步驟，確認 Bug 已消失。
    -   檢查相關功能是否正常 (Regression Test)。
3.  **執行檢查**:
    ```bash
    bun lint
    bun run build  # 確保修復沒有破壞 Build
    ```

## 4. 文件更新 (Documentation)
-   若 Bug 修復涉及邏輯變更或特殊 Edge Case 處理，需在程式碼中加入註解。
-   若影響操作流程，需更新 `NBEE-Doc/` 下對應的文件。

## 5. 提交與部署 (Commit & Deploy)
1.  **Submodule 處理** (若修改子模組):
    -   `git commit` (in module).
    -   Root Directory 更新 Pointer。
2.  **Root Commit**:
    -   使用 `fix:` prefix。
    -   範例: `fix(core): resolve infinite loop in settings provider`
3.  **Push**:
    -   推送到儲存庫觸發部署。

---
> **Rule of Thumb**: "Fix the problem, not just the symptom." (解決問題根源，而非只是掩蓋症狀)
