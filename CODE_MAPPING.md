# NBEE Code to Documentation Mapping

本文件旨在協助 AI 代理人與開發者快速連結 `NBEE` 程式碼與 `NBEE-Doc` 文件庫。

> **注意**: 文件路徑皆為相對於本儲存庫根目錄的相對路徑 (假設 `NBEE` 與 `NBEE-Doc` 位於同一層級目錄)。

## 📂 目錄對應表 (Directory Mapping)

| 程式碼位置 (Codebase Location) | 文件位置 (Documentation Location) | 說明 (Description) |
| :--- | :--- | :--- |
| `packages/core` | `../NBEE-Doc/product-specs/nbee-core` | **NBEE-Core** 核心系統規格與功能說明 |
| `packages/core/modules` | `../NBEE-Doc/product-specs/nbee-core` | 業務模組詳細規格 |
| `packages/core/drizzle` | `../NBEE-Doc/architecture/core-concepts` | 資料庫 schema 設計與核心概念 |
| `packages/biome-config` | `../NBEE-Doc/dev-center/guides` | 程式碼風格與規範 (Linting/Formatting) |
| `packages/typescript-config` | `../NBEE-Doc/dev-center/guides` | TypeScript 共用設定 |
| `packages/core/config` | `../NBEE-Doc/architecture/core-concepts` | 系統設定與權限定義 |
| `packages/core/docs` | `../NBEE-Doc/dev-center` | 內部開發文件與 API 參考 |
| `apps/test` | (無) | **Heiso Live** 測試應用程式 |

## 🧩 關鍵概念對應 (Key Concepts Mapping)

| 概念 (Concept) | 相關程式碼 (Related Code) | 架構文件 (Architecture Doc) |
| :--- | :--- | :--- |
| **Authentication** | `packages/core/lib/auth` | `../NBEE-Doc/architecture/core-concepts` (Auth Section) |
| **Permissions (RBAC)** | `packages/core/config/permissions.ts` | `../NBEE-Doc/architecture/core-concepts` (Permission System) |
| **Database Schema** | `packages/core/drizzle/schema.ts` | `../NBEE-Doc/architecture/core-concepts` (Data Model) |
| **API Architecture** | `packages/core/app/api` | `../NBEE-Doc/dev-center/api-reference` |

## 💡 如何使用 (How to Use)

- **AI 代理人**: 當需要理解特定模組的業務邏輯或架構決策時，請優先參考上述對應的文件路徑。
- **開發者**: 修改程式碼後，請檢查對應的文件是否需要更新。
