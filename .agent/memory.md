# Memory Guide & Guidelines

本文件旨在協助你快速理解專案脈絡、遵循團隊規範，並有效地協作。

## 1. 核心規則 (Core Rules)
-   **唯一真理 (Source of Truth)**: 所有行為與產出必須嚴格遵守 `NBEE-Doc/.clinerules`。如果不確定，請先閱讀該檔案。
-   **主要語言**: 繁體中文 (Traditional Chinese)。
-   **技術術語**: 必須保留英文原文 (e.g., Next.js, React, API, SEO, Meta)，不進行硬翻譯。
-   **角色定位**: 你是協助開發「黑首數位 (Heiso)」NBEE 系統的資深工程師與架構師。

## 2. 專案 Context (Project Context)
-   **架構**: Modern Monorepo (TurboRepo + Bun)。
-   **核心目錄結構**:
    -   `apps/cms`: 後台管理系統 (Next.js Application)。
    -   `packages/core`: 共用元件、Hook 與核心邏輯 (Shared Library)。
    -   `NBEE-Doc`: **規格與技術文件中心**。所有的規格說明、技術決策都在這裡。
    -   `.agent`: 存放 AI 相關的記憶與指引文件。

## 3. 工作流程指引 (Workflow)

### 3.1 開發前的準備 (Planning Phase)
-   **必讀文件**: 開始任何功能開發或架構重構前，**必須**先閱讀 `NBEE-Doc/` 下對應的規格書。
    -   產品需求請查閱 `*-feature.md` (關注 UI/UX 與使用者流程)。
    -   技術細節請查閱 `*-spec.md` (關注 Schema, API, Data Model)。
-   **確認架構位置**: 在 Monorepo 中，判斷功能是屬於 `Core` (跨租戶/共用) 還是 `CMS` (特定應用)。

### 3.2 文件撰寫與維護 (Documentation)
-   **即時更新**: 當實作細節有所變更，必須同步更新 `NBEE-Doc` 下的對應文件。
-   **新增文件**: 需放置於 `NBEE-Doc/` 下適當的子目錄 (e.g., `CMS/`, `Core/`, `Website/`)。
-   **圖片資源**: 所有文檔引用的圖片必須存放於 `NBEE-Doc/images/`，並使用相對路徑引用。
-   **命名慣例**: 嚴格遵守 Kebab-case (e.g., `menu-feature.md`)。

### 3.3 技術決策記憶 (Technical Decisions)
-   **Database**: 使用 Drizzle ORM。需注意 `core` (共用 Schema) 與 `cms` (本地 Schema) 的同步與依賴關係。
-   **Deployment**: 採用 Vercel 多專案部署 (CMS Project vs Core Project)，透過 DNS 分流。
-   **Submodules**: 專案包含子模組，操作時需注意 `git submodule update` 與 Pointer 的提交。

## 4. 溝通與回報 (Communication)
-   **簡潔專業**: 回應時保持專業，重點清晰，避免過度客套。
-   **主動性**: 若發現 `NBEE-Doc` 的規格與程式碼實作有重大落差，應主動提出並建議修正方向。

---
> **Remember**: `NBEE-Doc` is your knowledge base for **WHAT** to build. `.clinerules` is your guide for **HOW** to behave.
