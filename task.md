# Tasks

本檔案為工作筆記集合，每個章節是一個獨立任務。

---

## Task 1: 把 config 裡自動產生的檔案集中到 `.generated/`，並改成 build-time 產生

### 動機

`packages/core/config/permissions.ts` 是由 `scripts/fetchPermissionFromDb.ts` 動態產生的檔案，目前跟手寫的 config 檔（`menus.ts`, `settings.ts` 等）混在同一層，且**被 commit 到 repo**。

造成的問題：
1. **git status 髒掉**：每次本機 `bun dev` 都會根據個人 DB 重寫，commit history 一直被個人資料污染
2. **跨 tenant 型別不準**：在 per-tenant Vercel project 架構下，每個 tenant 有不同的訂閱模組 → 不同的 permissions 集合。Commit 一份固定版本給所有 project 用，**型別會跟實際 DB 內容不一致**
3. **檔案分類不清**：從位置看不出哪些是手寫、哪些是動態產物
4. **未來擴充無處放**：若有其他動態產物（menus 型別、theme token），沒有統一目錄

### 解法：搬到 `.generated/` + gitignore + build-time 產生

每個 Vercel project 在 build 時連自己的 tenant DB，產出**符合該 tenant 的 `permissions.ts`**，永遠不 commit。Vercel build container 是完整 Linux 環境，能執行任何腳本、寫任何檔案，且生成的檔案會被 Webpack/Turbopack inline 進 bundle，runtime 不需要原始檔。

這是業界標準的 **build-time codegen** 模式（Prisma、GraphQL Codegen、OpenAPI Generator 等都這樣做）。

### 目標結構

```
packages/core/config/
├── enums/
├── forms/
├── index.ts
├── initDefaults.ts
├── menus.ts
├── settings.ts
└── .generated/              ← 新增
    ├── README.md            ← 佔位 + 說明「請勿手改、也別 commit」
    └── permissions.ts       ← 從上層搬進來（被 gitignore，build time 產生）
```

### 實作步驟

#### Phase A：檔案搬遷與 import 修正

1. **搬檔**：`config/permissions.ts` → `config/.generated/permissions.ts`

2. **改產生腳本輸出路徑**：
   - [packages/core/scripts/fetchPermissionFromDb.ts:67](packages/core/scripts/fetchPermissionFromDb.ts#L67)
   - 從 `path.resolve(process.cwd(), "config", "permissions.ts")`
   - 改成 `path.resolve(process.cwd(), "config", ".generated", "permissions.ts")`

3. **更新 4 個 import 路徑**（`@heiso/core/config/permissions` → `@heiso/core/config/.generated/permissions`）：
   - `packages/core/modules/permission/role/_server/permission.service.ts`
   - `packages/core/components/permission/protected-button.tsx`
   - `packages/core/components/permission/protected-area.tsx`
   - `packages/core/modules/dev-center/permission/page.tsx`

4. **寫 `config/.generated/README.md`**：
   ```markdown
   # .generated/

   此目錄存放由 build / dev 腳本動態產生的檔案，請勿手動編輯。

   - `permissions.ts` — 由 `scripts/fetchPermissionFromDb.ts` 從 tenant DB 抓 `permissions` 表生成
     - 觸發時機：`bun dev` (prebuild)、`bun build` (prebuild)、Vercel build
     - 不 commit，每個環境根據自己的 DB 生成

   若新增其他自動產生檔，遵循同一規則：放這裡、不 commit、由腳本維護。
   ```

5. **更新 root `.gitignore`**：
   ```
   # 動態產生的檔案
   packages/core/config/.generated/*
   !packages/core/config/.generated/README.md
   ```

#### Phase B：Build-time 產生的腳本掛載

6. **改 `apps/cms/package.json`** 加 prebuild：
   ```json
   {
     "scripts": {
       "prebuild": "bun --filter @heiso/core run:permission",
       "build": "bun x next build",
       "dev": "bun --filter @heiso/core run:permission && bun x next dev"
     }
   }
   ```
   或同等寫法。`bun run build` 會自動觸發 prebuild。

7. **改 `fetchPermissionFromDb.ts` 加 fallback**：沒有 `DATABASE_URL` 時產生空檔，避免 type check job / CI 在無 DB 環境時失敗：
   ```ts
   if (!process.env.DATABASE_URL) {
     console.warn("[fetchPermissionFromDb] DATABASE_URL not set, writing empty fallback");
     await fs.writeFile(targetPath, EMPTY_PERMISSIONS_TEMPLATE, "utf8");
     process.exit(0);
   }
   ```
   `EMPTY_PERMISSIONS_TEMPLATE` 內容是型別合法的空 array，TypeScript 可過。

8. **加 root `package.json` 的 `postinstall`**（讓新 clone 後 `bun install` 自動產生一份）：
   ```json
   {
     "scripts": {
       "postinstall": "bun --filter @heiso/core run:permission || true"
     }
   }
   ```
   `|| true` 確保失敗（無 DB）也不阻擋 install。

#### Phase C：Vercel 設定

9. **建立 `apps/cms/vercel.json`**（讓所有 tenant project 設定一致）：
   ```json
   {
     "buildCommand": "cd ../.. && bun run --filter cms build",
     "installCommand": "cd ../.. && bun install --frozen-lockfile",
     "outputDirectory": ".next",
     "framework": "nextjs"
   }
   ```

10. **驗證 Vercel 能連 DB**：
    - 每個 tenant project 的 `DATABASE_URL` 必須是 **pooler 字串**（`aws-X-Y.pooler.supabase.com`），不是 direct connection（IPv6-only）
    - 這個本來就是 hive push env 時要設的（[vercel-sync-spec.md § 2.1](NBEE-Doc/hive/vercel-sync-spec.md)），確認沒走錯

#### Phase D：CI / Type-check 處理

11. **如果有 CI workflow** 跑 `tsc --noEmit`：先跑 `run:permission`（可能用 fallback）：
    ```yaml
    - name: Generate permissions (or fallback)
      run: bun --filter @heiso/core run:permission || true

    - name: Type check
      run: bun x tsc --noEmit
    ```

#### Phase E：驗證

12. **本機驗證**：
    - `bun --filter @heiso/core run:permission` → 確認產物落在 `.generated/`
    - `bun dev` → dev server 能起
    - `git status` → `permissions.ts` 不再出現在 modified 列表
    - 模擬 build：`rm -rf packages/core/config/.generated/ && bun install` → postinstall 自動產生空檔

13. **本機模擬 Vercel build**：
    ```
    rm -rf apps/cms/.next packages/core/config/.generated/
    bun install
    bun run --filter cms build
    ```
    成功的話：
    - `permissions.ts` 被產出
    - `.next/` 完整建好
    - 用 `grep -r "pe_某ID" apps/cms/.next/` 能找到內容已 inline 進 bundle

14. **Vercel 驗證**：
    - 在某個 dev tenant project deploy 一次
    - Build log 應該有 `[run:permission]` 的輸出
    - Deploy 後 CMS 能正常運作、權限檢查能用

### 風險與注意事項

- **`packages/core/package.json` 的 `exports`**：目前沒有明確處理 `./config/*`，實際解析靠 Bun workspace。搬到子目錄後如果 TypeScript 找不到 `@heiso/core/config/.generated/permissions`，可能需要補 `exports` 規則。
- **Dot-prefix 工具相容性**：`.generated/` 是 hidden directory，大多數工具（Next.js、Turbopack、TypeScript）能正確 resolve 明確 import path，但少數工具（glob、某些 linter、測試 runner）預設會跳過 dot-prefix 目錄。若實作後遇到「檔案找不到」或「被排除在 type check 外」，優先檢查工具的 `ignore` 設定，必要時改用 `_generated/` 或 `generated/`。
- **Vercel build 連不到 DB**：通常是 `DATABASE_URL` 沒設或用了 direct connection（IPv6）。改 pooler 即可。
- **Build 變慢**：多了 1-2 秒（DB query + 寫檔），可接受。
- **未來若要加入其他動態產物**（如 menus 型別、theme tokens），沿用 `.generated/` 即可。

### 何時觸發 redeploy（與 hive 端的協調）

| 變動 | 是否要 hive 觸發 redeploy |
|---|---|
| 修改 modules（hive 寫 L2 settings） | ❌ 不用，runtime 從 settings 讀 |
| 升級 app 版本含 schema migration（新 permissions 進 DB） | ✅ **要**，新 permissions 要進 type，build 才能拿到 |
| 暫停 / 改 tier | ❌ 不用 |
| Rotate AUTH_SECRET | ✅ 要（env 變） |

對應 [vercel-sync-spec.md § 3](NBEE-Doc/hive/vercel-sync-spec.md) 的觸發機制：hive 在 schema migration 後要記得 trigger redeploy。

### 估算時間

| Phase | 時間 |
|---|---|
| A. 檔案搬遷 + import 修正 | 30-45 min |
| B. Script + package.json 改動 | 30 min |
| C. Vercel 設定 | 30-45 min（要在 dev project 試一次） |
| D. CI workflow 改 | 15-30 min |
| E. 驗證 | 30 min |
| **總計** | **2-3 小時** |

### 相關檔案

- 產生腳本：[packages/core/scripts/fetchPermissionFromDb.ts](packages/core/scripts/fetchPermissionFromDb.ts)
- 目前檔案：[packages/core/config/permissions.ts](packages/core/config/permissions.ts)
- `dev` / `build` 腳本定義：[packages/core/package.json](packages/core/package.json), [apps/cms/package.json](apps/cms/package.json)
- 對齊文件：[NBEE-Doc/hive/vercel-sync-spec.md § 3](NBEE-Doc/hive/vercel-sync-spec.md)（hive 觸發 redeploy 時機）

---

## Task 2: 把 CMS BEE / Core 從「runtime 依賴 hive」refactor 到「只讀 env」

### 背景

目標架構已寫入 NBEE-Doc，分為三份文件：

- [NBEE-Doc/hive/index-spec.md](NBEE-Doc/hive/index-spec.md) — hive 自身（資料模型、CLI、Deprecated）
- [NBEE-Doc/hive/decoupling-principles.md](NBEE-Doc/hive/decoupling-principles.md) — 解耦原則、依賴矩陣、PR checklist、FAQ
- [NBEE-Doc/hive/vercel-sync-spec.md](NBEE-Doc/hive/vercel-sync-spec.md) — Hive → Vercel push 機制、env vars 契約、Legacy refactor 指引

> **核心原則**：Hive 是獨立部署的 control-plane 服務，與 NBEE (`apps/cms` + `packages/core`) 零 runtime 耦合。Hive 只透過 Vercel API push env vars 給每個 tenant 的獨立 Vercel project。CMS BEE runtime 只讀 env，不 import 任何 `@heiso/hive/*`。

現況：code 裡有多處 runtime 耦合尚未移除。本 task 是把現況 refactor 到目標架構。

### Refactor 步驟與時間估算

| # | 步驟 | 內容 | 估算 |
|---|---|---|---|
| 0 | **暖身** | 重讀 [decoupling-principles.md](NBEE-Doc/hive/decoupling-principles.md) 與 [vercel-sync-spec.md](NBEE-Doc/hive/vercel-sync-spec.md)，確認方向 | 15 min |
| 1 | **完整 Audit (grep)** | grep `@heiso/hive` / `HiveClient` / `x-tenant-db-url` 在 NBEE 內所有使用處，列成清單 | 20-30 min |
| 2 | **敲定 env vars 契約** | 對照 [vercel-sync-spec.md § 3](NBEE-Doc/hive/vercel-sync-spec.md)，列出 CMS 要讀的所有 tenant 相關 env + 格式 | 30-45 min |
| 3 | **改 `apps/cms/proxy.ts`** | 拔掉 HiveClient，改讀 env；訂閱模組檢查改 `JSON.parse(process.env.TENANT_MODULES)` | 1-1.5 hr |
| 4 | **改 `apps/cms/lib/bootstrap.ts`** | 移除 `registerTenantAdapter` / `registerAdminAuthAdapter` / `registerPlatformAccountAdapter` 的 DI；改用 env 或 static config | 1-1.5 hr |
| 5 | **改其他 HiveClient 引用處** | `apps/cms/modules/features/newsletter/_server/tenant-routing.ts`、`apps/cms/app/api/webhook/resend-inbound/route.ts` 等 | 1 hr |
| 6 | **改 `packages/core/lib/db/dynamic.ts`** | 退化成單一 `DATABASE_URL` 包裝（或完全刪除，改用 `lib/db/index.ts`），確認沒有地方還在讀 `x-tenant-db-url` header | 1-2 hr |
| 7 | **拔掉 `apps/cms/package.json` 的 `@heiso/hive` dep** | `bun install` 驗證能過、確認沒有殘留 import | 15-30 min |
| 8 | **寫 env vars 範本** | 建立 `apps/cms/.env.example`，列出所有必要 env + 說明（包含本機 dev 的單租戶模式範例） | 20 min |
| 9 | **本機驗證** | CMS dev server 能起、登入能過、dashboard 能切模組 | 1 hr |
| 10 | **Audit hive 端 Push 完整度** | 對照 [vercel-sync-spec.md § 7](NBEE-Doc/hive/vercel-sync-spec.md)，檢查 `vercel.ts` 與 `deploy.ts` 是否能完整 push 所有必要 env | 1 hr |
| 11 | **更新 `NBEE-Doc/apps/cms/CMS-BEE.md`** | 把「Single Codebase, Multiple Tenants」描述改成「Per-tenant Vercel Project」 | 30-45 min |
| 12 | **把 Decoupling Checklist 連到 GUIDELINES** | 在 `NBEE-Doc/GUIDELINES.md` 加連結到 [decoupling-principles.md § 4](NBEE-Doc/hive/decoupling-principles.md)，明定 PR review 必對照 | 15 min |

**總計估算**：**8-11 小時**（依 refactor 是否遇到 edge case）

### 可切割方式（建議分 PR）

| PR | 內容 | 估算 |
|---|---|---|
| **PR 1** | 步驟 0 + 1 + 2（暖身 + Audit + env contract）—— 只產出文件 / 清單，不動 code | 1-2 小時 |
| **PR 2** | 步驟 3 + 4 + 5（拔掉 HiveClient 所有引用） | 2-3 小時 |
| **PR 3** | 步驟 6 + 7（簡化 dynamic db + 移除 workspace dep） | 1-2 小時 |
| **PR 4** | 步驟 8 + 9（env.example + 本機驗證） | 1.5-2 小時 |
| **PR 5** | 步驟 10 + 11 + 12（hive audit + 文件同步） | 1.5-2 小時 |

每個 PR 完結都可以獨立上 main，風險分散；中間若需停下也不會留下半 refactor 的混亂狀態。

### 風險與注意事項

- ~~**Platform Staff 跨 tenant 登入**~~：**已解決**，NBEE 沒有「platform staff」概念，工程師 debug 客戶透過 `bun hive account add --slug=X --email=eng@heiso.io --role=developer --temp` 建臨時帳號登入即可。詳見 [decoupling-principles.md FAQ Q2](NBEE-Doc/hive/decoupling-principles.md)。
- **Dev 本機怎麼繞**：本機開發者沒跑 hive、也沒 Vercel env，需要一份「dev env.example」讓本機直接以 single-tenant 模式跑起來。步驟 8 處理。
- **現有 tenant 資料遷移**：如果 production 已有 tenant 跑在「舊模式」，要規劃 env push 的 bootstrap 流程，避免切換後缺 env。建議在步驟 10 audit 時順便確認 hive 端有 reconcile 工具（見 [vercel-sync-spec.md § 5.3](NBEE-Doc/hive/vercel-sync-spec.md)）。
- **`core` 的 `lib/db/dynamic.ts` 可能被多個地方用**：步驟 6 移除前要先 grep 確認沒有 runtime 依賴 `x-tenant-db-url` header。

### 決策題狀態

1. **實際部署模型** ✅ 已確認：**每個 tenant 一個獨立 Vercel project**（所有 tier 都是，無例外）
2. ~~**Platform Staff 跨 tenant 登入**~~ ✅ **不適用**：NBEE 無此概念，改用 hive CLI 加臨時 `developer` 帳號（見 `bun hive account add --temp`）
3. **Tenant config 更新機制** ✅ 已確認：
   - L1（identity / secrets）走 Vercel env + redeploy
   - L2（tier / modules / status）走 tenant DB `settings` 表，hive 直接寫入即時生效
   - 不使用 Vercel Edge Config（初期不需要）

### 相關檔案（Audit 起點清單）

**NBEE 這邊（要拔）**：
- [apps/cms/proxy.ts](apps/cms/proxy.ts) — `HiveClient.resolveTenant`
- [apps/cms/lib/bootstrap.ts](apps/cms/lib/bootstrap.ts) — `@heiso/hive/adapters` 注入
- [apps/cms/modules/features/newsletter/_server/tenant-routing.ts](apps/cms/modules/features/newsletter/_server/tenant-routing.ts)
- [apps/cms/app/api/webhook/resend-inbound/route.ts](apps/cms/app/api/webhook/resend-inbound/route.ts)
- [apps/cms/package.json](apps/cms/package.json) — 刪掉 `"@heiso/hive": "workspace:*"`
- [packages/core/lib/db/dynamic.ts](packages/core/lib/db/dynamic.ts) — 簡化或移除

**Hive 這邊（要確保 push 功能完整）**：
- `/Users/josh/code/hive/src/services/vercel.ts` — Vercel API 封裝
- `/Users/josh/code/hive/scripts/deploy.ts` — 部署 / 建立 tenant 流程
- `/Users/josh/code/hive/scripts/create-tenant.ts` / `edit-tenant.ts` — 確認更新後是否會觸發 env push

**文件**：
- [NBEE-Doc/hive/index-spec.md](NBEE-Doc/hive/index-spec.md) ✅ 已更新（2026-04 拆分，反映最終架構）
- [NBEE-Doc/hive/decoupling-principles.md](NBEE-Doc/hive/decoupling-principles.md) ✅ 新建並更新
- [NBEE-Doc/hive/vercel-sync-spec.md](NBEE-Doc/hive/vercel-sync-spec.md) ✅ 新建並更新（兩層分工）
- [NBEE-Doc/hive/security-spec.md](NBEE-Doc/hive/security-spec.md) ✅ 新建（六層防護）
- [NBEE-Doc/apps/cms/CMS-BEE.md](NBEE-Doc/apps/cms/CMS-BEE.md) ⚠️ 仍需同步更新「部署模型」段（步驟 11）

---

## Task 3: Hive App Version Registry 與跨 Tenant Schema 演化

### 動機

Hive 除了做 tenant 註冊、訂閱管理之外，還扮演 **平台 schema 演化的 orchestrator**：當 NBEE 某個 app（如 CMS）發佈新版本（含 schema migration），hive 負責跨所有訂閱該 app 的 tenant DB 套用 migration。

現有 hive 已有相關腳本（`migrate-all.ts`, `migrate-single.ts`, `migrate-status.ts`, `migrate-baseline.ts`），但**缺少清晰的版本追蹤機制**，無法回答：
- 哪些 tenant 的 CMS 還在舊版？
- 升級到 1.5.0 之後，失敗的 tenant 有哪些？
- 要做 canary rollout（先升 3 個 tenant 測），怎麼管？

### 設計議題（尚未決策）

**D1：App Version Registry 存法**

- 選項 A：在 `tenantApps` 加 `schemaVersion` 欄位
- 選項 B：獨立 `tenantSchemaVersions` 表（追蹤 current / target / status）

初步傾向 B，能追「升級中 / 失敗」狀態、適合 canary rollout。

**D2：Migration 檔的來源與分發**

- 選項 A：Hive repo 用 git submodule 包 NBEE migration（簡單但耦合高）
- 選項 B：NBEE build 時把 migration 打成 npm package（如 `@heiso/cms-migrations@1.5.0`），hive 安裝後讀取
- 選項 C：NBEE release 時上傳到 S3，hive 執行時下載

初步傾向 B。

**D3：Rollout 策略**

- 全量一次升（`bun hive upgrade --app=cms --to=1.5.0`）
- Canary（`--canary=3` 先升 3 個）
- 分批（先 BASIC、再 PREMIUM、再 ENTERPRISE）
- Rollback 支援（`bun hive rollback --slug=X --to=1.4.2`）

### 建議 CLI 擴充

```
bun hive upgrade --app=cms --to=1.5.0
bun hive upgrade --app=cms --to=1.5.0 --canary=3
bun hive upgrade --app=cms --to=1.5.0 --dry-run
bun hive rollback --slug=X --app=cms --to=1.4.2
bun hive version-status --app=cms   # 列出各 tenant 版本
```

### 相關檔案

- `/Users/josh/code/hive/scripts/migrate-all.ts`
- `/Users/josh/code/hive/scripts/migrate-single.ts`
- `/Users/josh/code/hive/scripts/migrate-status.ts`
- `/Users/josh/code/hive/scripts/migrate-baseline.ts`

### 估算時間

待 D1-D3 決策完才能估，粗估：
- **Schema registry 實作**：4-6 hr（含 migration 工具）
- **CLI 擴充**：3-4 hr
- **Migration 分發機制**：依選項變化大（A：1-2 hr、B：6-8 hr、C：4-6 hr）
- **文件**：2-3 hr（加一份 `hive/schema-evolution-spec.md`）

**總計 10-20 小時**，依 D2 決策差異顯著。

### 先決條件

建議 **Task 2 refactor 先完成**，讓 hive 變獨立服務後，再處理這個 Task 3。否則兩個大改同時進行會互相干擾。

---

## Task 4: Menu 排序設定統一（命名規範與來源釐清）

### 動機

NBEE 目前對「menu 的排序」有兩套，且**命名違反 CLAUDE.md 規範**：

| 位置 | 欄位名 | 是否符合規範 |
|---|---|---|
| DB Schema [packages/core/lib/db/schema/permissions/menu.ts:27](packages/core/lib/db/schema/permissions/menu.ts#L27) | `sortOrder` (`integer("sort_order")`) | ✅ |
| Static Config [packages/core/config/menus.ts:7](packages/core/config/menus.ts#L7) | `order: number` | ❌ CLAUDE.md 明確禁止用 `order` |

CLAUDE.md 規定：
> **不要使用** `order` 作為排序欄位名（使用 `sortOrder`）

### 需要釐清的設計問題

除了命名，還要回答「menu 排序到底以哪邊為準」：

1. **DB driven**：所有 menu 順序都從 DB `menus.sortOrder` 來，static config 只當 fallback / type 來源
2. **Config driven**：static `DASHBOARD_DEFAULT_MENUS` 是主導，DB 只存 user 自訂 override
3. **混合**：System menu（dashboard 主選單）走 config，feature menu（CMS 各模組裡的選單）走 DB

目前看起來 [config/menus.ts](packages/core/config/menus.ts) 的 `DASHBOARD_DEFAULT_MENUS` 是空的，實際 menu 應該都從 DB 來，但 type 與排序的職責還沒清楚分。

### 實作步驟

#### Phase A：命名統一

1. **改 [packages/core/config/menus.ts:7](packages/core/config/menus.ts#L7)** 把 `order: number` 改成 `sortOrder: number`
2. **Grep 所有用到 `DashboardMenu.order` 的地方**，跟著改：
   - [packages/core/modules/dashboard/(dashboard)/layout.tsx](packages/core/modules/dashboard/(dashboard)/layout.tsx)
   - [packages/core/modules/dashboard/(dashboard)/dashboard-config.ts](packages/core/modules/dashboard/(dashboard)/dashboard-config.ts)
   - 以及任何 `menus[xxx].order` 的存取
3. 確認 `DASHBOARD_DEFAULT_MENUS` 內若有實際資料（未來新增的話），也要用 `sortOrder`

#### Phase B：來源職責定義（要先決策）

決定 menu 排序的 source of truth，然後寫進 `NBEE-Doc/core/feature/` 或 `NBEE-Doc/apps/cms/` 的對應 spec：
- 如果 DB driven → 文件說明 static config 只是 type / fallback
- 如果 Config driven → 文件說明 DB 只存 override
- 如果混合 → 列出哪些走 config、哪些走 DB 的判斷規則

#### Phase C：驗證

- `bun run typecheck` 過
- Dashboard menu 顯示順序正確
- 若有 user 自訂排序功能（dnd-kit），確認還是運作

### 估算時間

| Phase | 時間 |
|---|---|
| A. 命名統一 | 30-45 min（含 grep 檢查） |
| B. 來源職責決策 + 寫文件 | 1 hr |
| C. 驗證 | 15 min |
| **總計** | **2 小時** |

### 相關檔案

- [packages/core/config/menus.ts](packages/core/config/menus.ts) — `DashboardMenu` type + `DASHBOARD_DEFAULT_MENUS`
- [packages/core/lib/db/schema/permissions/menu.ts](packages/core/lib/db/schema/permissions/menu.ts) — `menus` 表 schema
- [packages/core/modules/dashboard/(dashboard)/layout.tsx](packages/core/modules/dashboard/(dashboard)/layout.tsx) — 使用 menu 的 layout
- [packages/core/modules/dashboard/(dashboard)/dashboard-config.ts](packages/core/modules/dashboard/(dashboard)/dashboard-config.ts) — dashboard 配置
