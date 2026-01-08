# NBEE Monorepo

歡迎來到 **NBEE** 專案！這是一個使用 [TurboRepo](https://turbo.build/) 和 [Bun](https://bun.sh/) 管理的現代化單體倉庫 (Monorepo)，設計用於託管多個應用程式與共用套件。

[English Version](#nbee-monorepo-english)

---

## 📂 專案結構

```text
.
├── apps/
│   └── cms/          # 主要的 CMS 應用程式 (Next.js)
├── packages/
│   └── core/         # 共用核心元件與邏輯 (Next.js/Library)
├── package.json      # 根目錄設定檔
├── turbo.json        # TurboRepo 建置流程設定
└── .gitmodules       # Git 子模組設定
```

## 🚀 快速開始

### 前置需求

- [Bun](https://bun.sh/) (Runtime & Package Manager)
- Git

### 安裝步驟

1.  **複製專案** (包含子模組):
    ```bash
    git clone --recursive <REPO_URL>
    cd nbee
    ```

    *如果您複製時忘記加 recursive 參數:*
    ```bash
    git submodule update --init --recursive
    ```

2.  **安裝依賴**:
    ```bash
    bun install
    ```

### 💻 本地開發

啟動所有應用程式的開發伺服器:

```bash
bun run dev
```

或只啟動特定應用程式:

```bash
# 只啟動 CMS
cd apps/cms
bun run dev

# 只啟動 Core (若有的話)
cd packages/core
bun run dev
```

## 🛠️ 建置與部署 (Vercel)

本專案配置為使用同一個倉庫但在 Vercel 上建立分開的專案來部署多個應用程式。

### 1. 專案: CMS (主網站)
- **Root Directory (根目錄)**: `(空白)` (專案根目錄)
- **Install Command (安裝指令)**: `git submodule update --init --recursive && bun install`
- **Build Command (建置指令)**: `cd apps/cms && bun run build`
  - *可選用 Turbo: `turbo run build --filter=cms`*
- **Output Directory (輸出目錄)**: `apps/cms/.next`

### 2. 專案: Core (獨立展示)
- **Root Directory**: `(空白)` (專案根目錄)
- **Install Command**: `git submodule update --init --recursive && bun install`
- **Build Command**: `cd packages/core && bun run build`
  - *可選用 Turbo: `turbo run build --filter=@heiso/core`*
- **Output Directory**: `packages/core/.next`

## 📦 資料庫與結構

我們使用 **Drizzle ORM**。

- **推送到開發資料庫**: `bun db:push`
- **生成遷移檔案**: `bun db:generate`


> 注意：請確保您的 `.env` 檔案已正確設定資料庫連線。

## 🔄 更新子模組 (Submodules)

當 `apps/` 或 `packages/` 內的子模組有更新時，請依照以下步驟同步到主倉庫：

1.  進入子模組目錄並切換到最新版本 (Checkout)：
    ```bash
    cd apps/cms
    git pull origin main
    cd ../..
    ```
2.  **重要：在根目錄執行本地測試**：
    ```bash
    bun run build && bun lint
    # 確認 Build 成功後才執行下一步
    ```
3.  在根目錄提交變更：

    ```bash
    git add apps/cms
    git commit -m "chore(submodule): update cms to latest" # message參考就好，請依據情況調整
    git push
    ```

> **提示**：主專案 (Monorepo) 必須推送至 GitHub 後，Vercel 才會偵測到子模組指標 (Pointer) 的變更並開始部署。



## 🤝 貢獻指南

1.  建立功能分支 (Feature Branch)。
2.  在對應目錄 (`apps/` 或 `packages/`) 進行修改。
3.  Commit 並 Push 以送出 Pull Request。

---

# NBEE Monorepo (English)

Welcome to the **NBEE** project! This is a modern monorepo managed with [TurboRepo](https://turbo.build/) and [Bun](https://bun.sh/), designed to host multiple applications and shared packages.

## 📂 Project Structure

```text
.
├── apps/
│   └── cms/          # The main CMS application (Next.js)
├── packages/
│   └── core/         # Shared core components and logic (Next.js/Library)
├── package.json      # Root configuration
├── turbo.json        # TurboRepo build pipeline
└── .gitmodules       # Submodule configuration
```

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (Runtime & Package Manager)
- Git

### Installation

1.  **Clone the repository** (including submodules):
    ```bash
    git clone --recursive <REPO_URL>
    cd nbee
    ```

    *If you already cloned without submodules:*
    ```bash
    git submodule update --init --recursive
    ```

2.  **Install dependencies**:
    ```bash
    bun install
    ```

### 💻 Local Development

To start the development server for all apps:

```bash
bun run dev
```

Or just for a specific app:

```bash
# Start only the CMS
cd apps/cms
bun run dev

# Start only the Core (if applicable)
cd packages/core
bun run dev
```

## 🛠️ Build & Deployment (Vercel)

This project is configured to deploy multiple apps from the same repository using separate Vercel Projects.

### 1. Project: CMS (Main Site)
- **Root Directory**: `(empty)` (Project Root)
- **Install Command**: `git submodule update --init --recursive && bun install`
- **Build Command**: `cd apps/cms && bun run build`
  - *Optionally use Turbo: `turbo run build --filter=cms`*
- **Output Directory**: `apps/cms/.next`

### 2. Project: Core (Demo / Components)
- **Root Directory**: `(empty)` (Project Root)
- **Install Command**: `git submodule update --init --recursive && bun install`
- **Build Command**: `cd packages/core && bun run build`
  - *Optionally use Turbo: `turbo run build --filter=@heiso/core`*
- **Output Directory**: `packages/core/.next`

## 📦 Database & Schema

We use **Drizzle ORM**.

- **Push Schema (Dev)**: `bun db:push`
- **Generate Migrations**: `bun db:generate`


> Note: Ensure your `.env` is configured correctly for database connections.

## 🔄 Updating Submodules

When submodules in `apps/` or `packages/` have updates, follow these steps to sync them to the main repository:

1.  Enter the submodule directory and checkout the latest version:
    ```bash
    cd apps/cms
    git pull origin main
    cd ../..
    ```
2.  **Important: Run local tests in root directory**:
    ```bash
    bun run build && bun lint
    # Confirm Build success before proceeding
    ```
3.  Commit the changes in the root directory:

    ```bash
    git add apps/cms
    git commit -m "chore(submodule): update cms to latest" # message for reference only, adjust as needed
    git push
    ```

> **Tip**: Vercel will only trigger a deployment after you push the main monorepo changes to GitHub.



## 🤝 Contribution

1.  Create a feature branch.
2.  Make your changes in `apps/` or `packages/`.
3.  Commit and push to create a Pull Request.

---
Powered by [NBEE Team](https://github.com/Heiso-admin)
