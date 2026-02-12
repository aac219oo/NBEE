# NBEE 應用結構分析與優化建議（基於框架設計）

## 1. 設計意圖理解

### 1.1 核心架構定位

```
packages/core/          # 框架核心（公開 GitHub）
  ├── app/
  │   ├── (auth)/       # 登入系統
  │   ├── dev-center/   # 開發者中心
  │   └── account/      # 帳號設定
  ├── modules/          # 核心模組
  ├── components/       # 基礎 UI 元件
  └── lib/              # 工具函式庫

apps/*/                 # 客製化應用（私有 GitHub）
  └── src/app/          # 客製化功能
      ├── dashboard/    # 客戶專屬儀表板
      ├── crm/          # 客戶專屬 CRM
      └── ...           # 其他客製化功能
```

**設計理念：**
*   `@heiso/core` = **可重用的框架**（登入、權限、Dev Center）
*   `apps/*` = **客製化專案**（每個客戶的私有 repo，引用 `@heiso/core`）

這是一個 **正確且優雅** 的設計！

## 2. 當前問題診斷

### 2.1 核心問題：邊界不清晰

雖然設計理念正確，但實際執行中可能遇到的問題：

1.  **`packages/core/app` 包含了太多東西**
    *   目前 `core/app` 有 `dashboard/`、`(www)/` 等
    *   這些應該屬於「範例應用」還是「框架核心」？

2.  **`apps/test` 的定位模糊**
    *   名稱叫 `test`，但實際上是「範例應用」或「開發環境」
    *   新進開發者不清楚這是「測試用」還是「模板」

3.  **客製化應用如何覆寫 (Override) 核心功能？**
    *   如果客戶想自訂登入頁面樣式，該如何做？
    *   如果客戶想隱藏 Dev Center，該如何做？

## 3. 優化建議（保持原設計）

### 方案 A：明確定義 Core 的邊界

**目標：** 讓 `packages/core` 成為「純框架」，不包含業務邏輯

#### 3.1 重新劃分 `core/app` 的內容

**保留在 Core（框架必需）：**
```
packages/core/app/
  ├── (auth)/           # ✅ 登入系統（框架核心）
  ├── dev-center/       # ✅ 開發者中心（框架核心）
  ├── account/          # ✅ 帳號設定（框架核心）
  └── api/              # ✅ 核心 API（框架核心）
```

**移出 Core（應用層）：**
```
packages/core/app/
  ├── dashboard/        # ❌ 移到 apps/starter-template
  └── (www)/            # ❌ 移到 apps/starter-template
```

#### 3.2 建立 Starter Template

```
apps/
  ├── starter-template/     # 官方範例應用（取代 apps/test）
  │   └── src/app/
  │       ├── dashboard/    # 從 core 移過來
  │       └── (www)/        # 從 core 移過來
  │
  └── customer-a/           # 客戶 A 的客製化應用
      └── src/app/
          ├── crm/          # 客戶專屬功能
          └── dashboard/    # 覆寫預設 dashboard
```

**好處：**
*   `apps/starter-template` 可以作為新專案的起點
*   客戶可以 fork `starter-template` 開始開發
*   `packages/core` 保持純淨

### 方案 B：引入 Override 機制

**目標：** 讓客製化應用可以優雅地覆寫核心功能

#### 3.3 使用 Next.js Middleware 實現路由覆寫

```typescript
// apps/customer-a/src/middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request: Request) {
  const url = new URL(request.url);
  
  // 如果客製化應用有自己的 /login，優先使用
  if (url.pathname === '/login') {
    // 檢查是否存在客製化登入頁面
    // 如果存在，使用客製化版本
    // 否則，fallback 到 @heiso/core 的登入頁面
  }
}
```

#### 3.4 使用 Component Slots

```typescript
// packages/core/app/layout.tsx
import { Slot } from '@heiso/core/components/slot';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Slot name="header" fallback={<DefaultHeader />} />
        {children}
        <Slot name="footer" fallback={<DefaultFooter />} />
      </body>
    </html>
  );
}

// apps/customer-a/src/app/layout.tsx
import { SlotProvider } from '@heiso/core/components/slot';
import CustomHeader from './components/CustomHeader';

export default function CustomLayout({ children }) {
  return (
    <SlotProvider slots={{ header: <CustomHeader /> }}>
      {children}
    </SlotProvider>
  );
}
```

### 方案 C：建立 Plugin 系統

**目標：** 讓客製化功能以「插件」形式存在

#### 3.5 定義 Plugin Interface

```typescript
// packages/core/types/plugin.ts
export interface NBEEPlugin {
  name: string;
  routes?: RouteConfig[];      // 新增路由
  components?: ComponentMap;   // 覆寫元件
  middleware?: Middleware[];   // 自訂中間件
}

// apps/customer-a/plugins/crm.plugin.ts
export const crmPlugin: NBEEPlugin = {
  name: 'crm',
  routes: [
    { path: '/crm', component: () => import('./pages/crm') }
  ]
};
```

#### 3.6 在應用中註冊 Plugin

```typescript
// apps/customer-a/src/app/layout.tsx
import { NBEEApp } from '@heiso/core';
import { crmPlugin } from '../plugins/crm.plugin';

export default NBEEApp.create({
  plugins: [crmPlugin],
  theme: customTheme,
});
```

## 4. 具體優化步驟

### 立即可做（低風險）：

1.  **重新命名 `apps/test`**
    ```bash
    mv apps/test apps/starter-template
    ```
    *   在 `README.md` 中說明這是「官方範例應用」
    *   提供清楚的「如何開始新專案」指南

2.  **建立清晰的文檔**
    *   `packages/core/README.md` → 說明這是框架核心
    *   `apps/starter-template/README.md` → 說明這是範例應用
    *   建立 `docs/customization-guide.md` → 說明如何客製化

3.  **定義 Core 的 API 邊界**
    *   明確列出哪些是「公開 API」（可以被客製化應用使用）
    *   哪些是「內部實作」（可能會變動）

### 中期規劃（需評估）：

4.  **重構 `core/app` 的內容**
    *   將「範例性質」的頁面移到 `starter-template`
    *   只保留「框架必需」的頁面在 `core`

5.  **建立 Override 機制**
    *   實作 Component Slots 或類似機制
    *   讓客製化應用可以優雅地覆寫核心元件

### 長期目標：

6.  **建立 Plugin 系統**
    *   定義標準的 Plugin Interface
    *   提供 Plugin 開發指南

7.  **建立 Marketplace（可選）**
    *   如果有多個客戶，可以建立內部的 Plugin Marketplace
    *   讓常見的客製化功能可以重用

## 5. 目錄結構建議

### 建議的最終結構：

```
NBEE/
├── packages/
│   ├── core/                    # 框架核心（公開）
│   │   ├── app/
│   │   │   ├── (auth)/          # 登入系統
│   │   │   ├── dev-center/      # 開發者中心
│   │   │   └── account/         # 帳號設定
│   │   ├── components/          # 基礎 UI 元件
│   │   ├── lib/                 # 工具函式
│   │   └── README.md            # "這是框架核心"
│   │
│   └── plugins/                 # 官方插件（可選）
│       ├── analytics/
│       └── notifications/
│
└── apps/
    ├── starter-template/        # 官方範例（取代 test）
    │   ├── README.md            # "如何開始新專案"
    │   └── src/app/
    │       ├── dashboard/       # 範例儀表板
    │       └── (www)/           # 範例首頁
    │
    ├── customer-a/              # 客戶 A（私有 repo）
    │   └── src/app/
    │       └── crm/             # 客製化 CRM
    │
    └── customer-b/              # 客戶 B（私有 repo）
        └── src/app/
            └── inventory/       # 客製化庫存系統
```

## 6. 總結

**您的設計理念是正確的！** 這是一個優秀的「框架 + 客製化」架構。

**需要優化的地方：**
1.  **命名與文檔** - 讓新進開發者快速理解架構
2.  **邊界定義** - 明確區分「框架核心」與「應用層」
3.  **覆寫機制** - 提供優雅的客製化方式

**不需要改變的地方：**
*   ✅ Monorepo 結構
*   ✅ `packages/core` 作為共用框架
*   ✅ `apps/*` 作為客製化應用

這個架構非常適合 **B2B SaaS with Custom Deployments** 的場景！
