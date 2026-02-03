# NBEE Monorepo

歡迎來到 **NBEE** 專案！這是一個使用 [TurboRepo](https://turbo.build/) 和 [Bun](https://bun.sh/) 管理的現代化單體倉庫 (Monorepo)，核心架構基於 Next.js 16。

[English Version](#nbee-monorepo-english)

---

## 🚀 核心技術棧

- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **ORM**: Drizzle ORM
- **Lint/Format**: Biome
- **Build System**: TurboRepo

## 📂 專案結構

```text
.
├── apps/
│   └── web/                # 主要的 Web 應用程式 (Next.js)
├── packages/
│   ├── core/               # 核心元件、業務邏輯與 API (Next.js 16)
│   ├── biome-config/       # 共用的 Biome 檢查規則
│   └── typescript-config/  # 基礎 TypeScript 設定
├── package.json            # 根目錄依賴與指令管理
└── turbo.json              # TurboRepo 建置流程設定
```

## 🚀 快速開始

### 前置需求

- 安裝 [Bun](https://bun.sh/) (建議版本 v1.3.5 以上)
- Git

### 安裝步驟

1. **複製專案**:
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

3.  **環境變數設定**:
    在開始開發前，請確保設定必要的環境變數。您可以參考 `packages/core/.env.example`：
    - 複製 `packages/core/.env.example` 並重新命名為 `.env.local`。
    - 依照您的環境需求修改檔案內容（例如 `DATABASE_URL`）。

### 💻 本地開發

啟動所有應用程式的開發伺服器:

```bash
bun dev
```

或進入特定目錄開發：
```bash
cd packages/core
bun dev
```

## 📦 資料庫管理 (Drizzle)

在根目錄執行以下指令來管理資料庫結構：

- **推送到資料庫**: `bun db:push`
- **生成遷移檔案**: `bun db:generate`
- **啟動 Studio**: `bun drizzle-kit studio` (需進入 core 目錄)

> 注意：請確保專案根目錄或套件目錄下的 `.env` 檔案已正確設定資料庫連線字串。

## 🛠️ MCP (Model Context Protocol) 設定

為了提升 AI 輔助開發的體驗，本專案支援 MCP。這讓 AI 代理人可以即時存取專案狀態與資料庫。

### 1. Next.js MCP
Next.js 16 原生支援 MCP。當您執行 `bun dev` 時，AI 可以透過 `/_next/mcp` 端點取得即時資訊。

### 2. Supabase MCP
建議設定 Supabase MCP 讓 AI 能夠直接查詢資料庫結構，輔助編寫 SQL 或 Drizzle Schema。
- **可參考**: [supabase-mcp](https://supabase.com/docs/guides/getting-started/mcp)

### 3. Postgres MCP
建議設定 Postgres MCP 讓 AI 能夠直接查詢資料庫結構，輔助編寫 SQL 或 Drizzle Schema。
- **可參考**: [postgres-mcp](https://github.com/crystaldba/postgres-mcp)

## 🤝 貢獻指南

1. 建立功能分支 (Feature Branch)。
2. 在 `packages/core` 或相關套件中進行修改。
3. 確保通過 Biome 檢查：`bun lint`。
4. 提交並 Push 以送出 Pull Request。

---

# NBEE Monorepo (English)

Welcome to **NBEE**! This is a modern monorepo managed with [TurboRepo](https://turbo.build/) and [Bun](https://bun.sh/), built on Next.js 16.

## 🚀 Core Technology Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **ORM**: Drizzle ORM
- **Lint/Format**: Biome
- **Build System**: TurboRepo

## 📂 Project Structure

```text
.
├── apps/
│   └── web/          # The main Web application (Next.js)
├── packages/
│   ├── core/               # Core components, business logic, and APIs (Next.js 16)
│   ├── biome-config/       # Shared Biome linting & formatting rules
│   └── typescript-config/  # Base TypeScript configurations
├── package.json            # Root configuration & scripts
└── turbo.json              # TurboRepo build pipeline
```

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.3.5 or higher recommended)
- Git

### Installation

1. **Clone the repository**:
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

3.  **Environment Variables**:
    Before starting development, ensure you set up the necessary environment variables. Refer to `packages/core/.env.example`:
    - Copy `packages/core/.env.example` to `.env.local`.
    - Update the variables (e.g., `DATABASE_URL`) according to your environment.

### 💻 Local Development

Start the development environment for all packages:
```bash
bun dev
```

Or target a specific package:
```bash
cd packages/core
bun dev
```

## 📦 Database Management (Drizzle)

Run these commands from the root to manage your schema:

- **Push to database**: `bun db:push`
- **Generate migrations**: `bun db:generate`
- **Start Studio**: `bun drizzle-kit studio` (within the core directory)

> Note: Ensure your `.env` file is properly configured with your database connection string.

## 🛠️ MCP (Model Context Protocol) Setup

This project supports MCP to enhance AI-assisted development, allowing AI agents to access real-time project state and your database.

### 1. Next.js MCP
Next.js 16 provides native MCP support. When running `bun dev`, AI agents can access runtime information via the `/_next/mcp` endpoint.

### 2. Supabase MCP
We recommend setting up a Supabase MCP server to allow AI agents to inspect your database schema and help with queries or Drizzle schema updates.
- **Reference**: [supabase-mcp](https://supabase.com/docs/guides/getting-started/mcp)

### 3. Postgres MCP
We recommend setting up a Postgres MCP server to allow AI agents to inspect your database schema and help with queries or Drizzle schema updates.
- **Reference**: [postgres-mcp](https://github.com/crystaldba/postgres-mcp)

## 🤝 Contribution

1. Create a feature branch.
2. Make changes in `packages/core` or relevant packages.
3. Ensure the project passes linting: `bun lint`.
4. Commit and push to create a Pull Request.

---
Powered by [NBEE Team](https://github.com/Heiso-admin)
