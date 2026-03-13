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
    -   `nbee/`: 專案根目錄。
    -   `apps/cms`: 後台內容管理系統 (Next.js Application)。
    -   `packages/core`: 共用元件、Hook 與核心邏輯 (Shared Library)。
    -   `packages/hive`: 多租戶管理系統的核心邏輯 (Shared Library)。
    -   `NBEE-Doc`: **規格與技術文件中心**。所有的規格說明、技術決策都在這裡。
    -   `.agent`: 存放 Antigravity AI Agent 相關的記憶與指引文件。
    -   `.claude`: 存放 Claude Code 相關的記憶與指引文件。

## 3. 工作流程指引 (Workflow)

### 3.1 開發前的準備 (Planning Phase)
-   **必讀文件**: 開始任何功能開發或架構重構前，**必須**先閱讀 `NBEE-Doc/` 下對應的規格書。
    -   技術細節請查閱 `*-spec.md`。
-   **確認架構位置**: 在 Monorepo 中，判斷功能是屬於 `Core` (跨租戶/共用) 還是 `CMS` (特定應用)。

### 3.2 文件撰寫與維護 (Documentation)
-   **即時更新**: 當實作細節有所變更，必須同步更新 `NBEE-Doc` 下的對應文件。
-   **新增文件**: 需放置於 `NBEE-Doc/` 下適當的子目錄 (e.g., `CMS/`, `Core/`, `Website/`)。
-   **圖片資源**: 所有文檔引用的圖片必須存放於 `NBEE-Doc/images/`，並使用相對路徑引用。

### 3.3 技術決策記憶 (Technical Decisions)
-   **Database**: 使用 Drizzle ORM。需注意 `core` (共用 Schema) 與 `cms` (本地 Schema) 的同步與依賴關係。
-   **Deployment**: 採用 Vercel 多專案部署 (CMS Project vs Core Project)，透過 DNS 分流。
-   **Submodules**: 專案包含子模組，操作時需注意 `git submodule update` 與 Pointer 的提交。
-   **Decoupling**: 需注意 `core` 與 `hive` 之間必須解耦不能互相調用相關組件或模組。

### 3.4 Schema 規範 (Database Schema Standards)

#### 架構分層
-   **Platform DB (hive)**: 存放 `accounts`, `platformRoles`, `tenants`, `apps`, `tenantApps`
-   **Tenant DB (core/cms)**: 每個租戶獨立的 DB，不使用 RLS 軟分割
-   **跨 DB 關聯**: 使用 Supabase FDW，透過 `foreignAccounts` 表查詢

#### 必要欄位
所有資料表必須包含以下 Timestamps：
```typescript
createdAt: timestamp('created_at').notNull().defaultNow(),
updatedAt: timestamp('updated_at').notNull().defaultNow(),
deletedAt: timestamp('deleted_at'),  // 軟刪除（如需要）
```

#### 欄位命名規範
| 用途 | 統一命名 | 說明 |
|------|----------|------|
| 排序 | `sortOrder` | 使用 `integer('sort_order').default(0)` |
| 帳號關聯 | `accountId` | 使用 `uuid('account_id')` 關聯 Platform.accounts |
| 狀態 | `status` | 使用 `varchar('status', { length: 20 })` |

#### 禁止事項
-   **不要使用** `tenantId` 欄位（已改為獨立 DB）
-   **不要使用** RLS policy（已移除）
-   **不要使用** `order` 作為排序欄位名（使用 `sortOrder`）
-   **不要使用** `userId` 關聯用戶（使用 `accountId`）

#### 租戶識別
每個 Tenant DB 的 `settings` 表中應有：
```typescript
{ name: 'tenantId', group: 'system', value: 'tenant_xxx' }
```

## 4. 溝通與回報 (Communication)
-   **簡潔專業**: 回應時保持專業，重點清晰，避免過度客套。
-   **主動性**: 若發現 `NBEE-Doc` 的規格與程式碼實作有重大落差，應主動提出並建議修正方向。

---
> **Remember**: `NBEE-Doc` is your knowledge base for **WHAT** to build. `.clinerules` is your guide for **HOW** to behave.
