# Next.js App Router 跨目錄路由整合方案

## 問題描述

在 NBEE 的架構中，我們有：
- `packages/core/app/` - 框架核心路由（登入、dev-center）
- `apps/*/src/app/` - 客製化應用路由（dashboard、crm）

**需求：** 讓 Next.js 能夠同時讀取這兩個目錄的路由

## 解決方案

### 方案 A：使用 Re-export（推薦 ⭐）

**原理：** 在 `apps/*/src/app` 中 re-export `@heiso/core` 的路由

#### 實作步驟

**1. 在 `apps/customer-a/src/app` 中建立對應的路由檔案**

```typescript
// apps/customer-a/src/app/(auth)/login/page.tsx
// 直接 re-export core 的登入頁面
export { default } from '@heiso/core/app/(auth)/login/page';
export { metadata } from '@heiso/core/app/(auth)/login/page';
```

```typescript
// apps/customer-a/src/app/dev-center/page.tsx
export { default } from '@heiso/core/app/dev-center/page';
```

**2. 如果需要覆寫，直接實作自己的版本**

```typescript
// apps/customer-a/src/app/(auth)/login/page.tsx
// 不 re-export，實作自己的登入頁面
export default function CustomLoginPage() {
  return <div>客製化登入頁面</div>;
}
```

**優點：**
- ✅ 簡單直觀
- ✅ 明確控制哪些路由來自 core
- ✅ 容易覆寫
- ✅ TypeScript 友好

**缺點：**
- ❌ 需要手動 re-export 每個路由
- ❌ 如果 core 新增路由，需要手動同步

---

### 方案 B：使用 Symlink（不推薦）

**原理：** 使用符號連結將 `core/app` 連結到 `apps/*/src/app`

```bash
# 在 apps/customer-a/src/app 中建立 symlink
ln -s ../../../../packages/core/app/(auth) ./(auth)
```

**優點：**
- ✅ 自動同步 core 的路由

**缺點：**
- ❌ Windows 支援不佳
- ❌ Git 處理複雜
- ❌ 難以覆寫
- ❌ 不推薦用於生產環境

---

### 方案 C：使用 Next.js Rewrites（適合特定場景）

**原理：** 使用 `next.config.ts` 的 rewrites 功能

```typescript
// apps/customer-a/next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/dev-center/:path*',
        destination: '/@heiso/core/app/dev-center/:path*',
      },
    ];
  },
};

export default config;
```

**優點：**
- ✅ 靈活的路由控制

**缺點：**
- ❌ 不適用於 App Router 的檔案系統路由
- ❌ 主要用於 API 路由或外部服務

---

### 方案 D：使用動態路由 + 模組載入（最靈活 ⭐⭐）

**原理：** 建立一個「路由註冊系統」，動態載入不同來源的頁面

#### 實作步驟

**1. 建立路由配置檔**

```typescript
// apps/customer-a/src/config/routes.ts
export const routeConfig = {
  // 從 core 繼承的路由
  inherited: [
    { path: '(auth)/login', source: '@heiso/core' },
    { path: '(auth)/signup', source: '@heiso/core' },
    { path: 'dev-center', source: '@heiso/core' },
    { path: 'account', source: '@heiso/core' },
  ],
  // 客製化路由
  custom: [
    { path: 'dashboard', source: 'local' },
    { path: 'crm', source: 'local' },
  ],
  // 覆寫的路由
  overrides: {
    '(auth)/login': 'local', // 使用本地的登入頁面
  },
};
```

**2. 建立自動生成腳本**

```typescript
// scripts/generate-routes.ts
import fs from 'fs';
import path from 'path';
import { routeConfig } from '../src/config/routes';

function generateRoutes() {
  routeConfig.inherited.forEach((route) => {
    const routePath = path.join('src/app', route.path);
    
    // 檢查是否被覆寫
    if (routeConfig.overrides[route.path]) {
      return; // 跳過，使用本地版本
    }
    
    // 建立目錄
    fs.mkdirSync(routePath, { recursive: true });
    
    // 生成 page.tsx
    const content = `
// Auto-generated: re-export from ${route.source}
export { default } from '${route.source}/app/${route.path}/page';
export * from '${route.source}/app/${route.path}/page';
`;
    
    fs.writeFileSync(
      path.join(routePath, 'page.tsx'),
      content.trim()
    );
  });
}

generateRoutes();
```

**3. 在 package.json 中加入腳本**

```json
{
  "scripts": {
    "generate:routes": "tsx scripts/generate-routes.ts",
    "dev": "npm run generate:routes && next dev",
    "build": "npm run generate:routes && next build"
  }
}
```

**優點：**
- ✅ 自動化管理路由
- ✅ 明確的配置檔
- ✅ 容易覆寫
- ✅ 可以在 CI/CD 中自動執行

**缺點：**
- ❌ 需要額外的建置步驟
- ❌ 增加複雜度

---

### 方案 E：使用 Parallel Routes（實驗性）

**原理：** 使用 Next.js 的 Parallel Routes 功能

```
apps/customer-a/src/app/
  ├── @core/              # Parallel route for core
  │   └── (auth)/
  │       └── login/
  │           └── page.tsx  # Re-export from core
  ├── @custom/            # Parallel route for custom
  │   └── dashboard/
  │       └── page.tsx
  └── layout.tsx          # 決定顯示哪個 slot
```

```typescript
// apps/customer-a/src/app/layout.tsx
export default function RootLayout({
  core,
  custom,
}: {
  core: React.ReactNode;
  custom: React.ReactNode;
}) {
  return (
    <html>
      <body>
        {core}
        {custom}
      </body>
    </html>
  );
}
```

**優點：**
- ✅ Next.js 原生功能

**缺點：**
- ❌ 複雜度高
- ❌ 不適合這個使用場景

---

## 推薦方案

### 短期（立即可用）：方案 A - Re-export

**實作範例：**

```typescript
// apps/customer-a/src/app/(auth)/login/page.tsx
export { default, metadata } from '@heiso/core/app/(auth)/login/page';

// apps/customer-a/src/app/dev-center/[...slug]/page.tsx
export { default } from '@heiso/core/app/dev-center/[...slug]/page';
```

**建立輔助腳本簡化流程：**

```bash
# scripts/inherit-route.sh
#!/bin/bash
ROUTE=$1
mkdir -p "src/app/$ROUTE"
cat > "src/app/$ROUTE/page.tsx" << EOF
export { default } from '@heiso/core/app/$ROUTE/page';
export * from '@heiso/core/app/$ROUTE/page';
EOF
```

使用方式：
```bash
./scripts/inherit-route.sh "(auth)/login"
./scripts/inherit-route.sh "dev-center"
```

### 長期（自動化）：方案 D - 動態路由生成

建立完整的路由管理系統，在每次 `dev` 或 `build` 時自動生成 re-export 檔案。

---

## 實際應用範例

### 場景 1：完全繼承 Core 的路由

```typescript
// apps/customer-a/src/config/routes.ts
export const routes = {
  inherit: ['(auth)/*', 'dev-center/*', 'account/*'],
  custom: ['dashboard', 'crm'],
};
```

### 場景 2：覆寫部分路由

```typescript
// apps/customer-a/src/app/(auth)/login/page.tsx
// 不 re-export，實作自己的版本
import { CustomLoginForm } from '@/components/CustomLoginForm';

export default function LoginPage() {
  return <CustomLoginForm />;
}
```

### 場景 3：擴展 Core 的路由

```typescript
// apps/customer-a/src/app/(auth)/login/page.tsx
import CoreLoginPage from '@heiso/core/app/(auth)/login/page';
import { AnalyticsTracker } from '@/lib/analytics';

export default function LoginPage() {
  return (
    <>
      <AnalyticsTracker event="login_page_view" />
      <CoreLoginPage />
    </>
  );
}
```

---

## 總結

**立即採用：** 方案 A（Re-export）
- 簡單、可靠、易於理解
- 使用輔助腳本減少手動工作

**未來優化：** 方案 D（動態生成）
- 當路由數量增加時
- 當需要更複雜的管理邏輯時

**不推薦：** 方案 B（Symlink）、方案 E（Parallel Routes）
- 複雜度高，收益低
