# 單租戶身份模型簡化方案 (Simplified Identity Schema)

本方案適用於 **完全獨立運作** 的單租戶應用（例如：為每個客戶部署一套獨立 ERP，且不需要跨系統的統一登入），旨在簡化開發複雜度。

## 1. 核心概念

在標準 SaaS 架構中，我們通常將 `User` (全域帳號) 與 `Member` (租戶成員) 分開，以支援一個 User 加入多個 Tenant。

但在 **單租戶 (Single-Tenant)** 專案中，因為資料庫本身就是隔離的，且用戶通常只隸屬於該企業，我們可以將兩者合併，回歸最單純的設計。

## 2. 資料庫設計 (Schema)

**合併 Users 與 Members**：
去除 `members` 表，將角色與狀態直接記錄在 `users` 表中。

```sql
-- [App DB] users (合併了原本的 users + members)
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,      -- 密碼直接存在本地
  name VARCHAR,
  role VARCHAR NOT NULL,          -- "admin", "staff" (直接定義角色)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- [App DB] orders (業務資料，直接關聯 users)
CREATE TABLE orders (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  amount DECIMAL
);
```

## 3. 架構比較

| 特性 | 標準 SaaS 架構 (User + Member) | 簡化架構 (Unified User) |
| :--- | :--- | :--- |
| **適用場景** | **SaaS 平台** (一個 User 可加入多個組織) | **獨立專案 / 傳統 ERP** (User 只屬於這家公司) |
| **跨租戶登入** | 支援 (一套帳號密碼走天下) | 不支援 (在 A 公司與 B 公司需分別註冊) |
| **資料表結構** | 較複雜 (`users`, `members`, `tenants`) | 最簡單 (只有 `users`) |
| **開發複雜度** | 高 (需處理多租戶邏輯) | 低 (當作單機軟體開發即可) |

## 4. 實作建議

如果您的目標是 **「先做單租戶，未來保留擴展性」**，建議採取混合策略：

1.  **App DB (Data Plane)**：使用 **簡化架構**。
    - 在應用程式層面 (`App Server`)，完全不感知 `tenant_id` 或 `members` 表。
    - 登入驗證直接查 `users` 表。

2.  **Global DB (Control Plane)**：保留 `tenants` 表。
    - 僅用於紀錄「誰買了什麼服務」(Subscription/Billing)。
    - 不介入 App 的日常登入流程。
    - 未來若要轉型 SaaS，可透過 Global DB 的路由層來實現多租戶 (Routing)，但 App 內部邏輯維持不變。
