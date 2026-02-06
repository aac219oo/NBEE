# Architecture & Responsibilities

## Overview
NBEE is a modern Monorepo built with TurboRepo and Bun. It separates concerns between shared core logic and specific application implementations.

## Directory Structure & Responsibilities

### `apps/cms` (Content Management System)
- **Role**: The main application for content management.
- **Tech**: Next.js 16 (App Router), ElysiaJS (API Layer).
- **Responsibilities**:
  - **Routing**: `app/` directory for pages and API routes.
  - **API Implementation**: `lib/api/modules/` (Products, Orders, etc.).
  - **Feature Schemas**: `lib/db/schema/features/` (Schema specific to CMS, e.g., pages, products).
  - **Scripts**: Data migration and maintenance scripts (`scripts/`).

### `packages/core` (Shared Kernel)
- **Role**: The foundation for all applications in the monorepo.
- **Tech**: React, Drizzle ORM, Zod, Utils.
- **Responsibilities**:
  - **Design System**: Reusable UI components (shadcn/ui), Tailwind config.
  - **Core Schemas**: `lib/db/schema/` (Auth, System, Permissions - shared across apps).
  - **Utilities**: Shared hooks, helpers, and types.
  - **Database Connection**: Dynamic DB connection logic (`lib/db/dynamic.ts`).

### `packages/hive` (Control Plane)
- **Role**: The centralized registry for Tenant management.
- **Tech**: Postgres (nbee_hive), Hive CLI (`bun hive`).
- **Responsibilities**:
  - **Tenant Registry**: Manages `tenants` and `tenant_apps`.
  - **Routing/Resolution**: Determines database connection string for each tenant/tier.
  - **CLI Tools**: Unifies creating, editing, and deploying tenants (`bun hive create`).

## Key Architectural Patterns

### 1. Database & Schema
- **Separation**: 
  - `core` defines universal schemas (Users, Tenants, Roles).
  - `apps` define feature-specific schemas (Products, Blog Posts).
- **Tenant Isolation**: Row Level Security (RLS) is enforced via `tenant_id` on sensitive tables.

### 2. API Layer (Elysia)
- **Framework**: ElysiaJS is used for type-safe, high-performance APIs.
- **Integration**: Mounted inside Next.js Route Handlers (`app/api/[[...slugs]]/route.ts`).
- **Auth**: Custom plugins (`auth-plugin.ts`) handle API Key validation and Context injection.

### 3. Documentation (NBEE-Doc)
- **Constraint**: All specs in `NBEE-Doc` are the Single Source of Truth.
- **Workflow**: Code implementation **must** follow the documentation.

## Adding New Apps

To add a new application to the `apps/` directory:

1. **Spec First**: Ensure a corresponding spec folder exists in `NBEE-Doc/` (e.g., `Website/`, `AD/`)
2. **Create Directory**: Create the new project under `apps/` (e.g., `apps/website`)
3. **Inherit Core**: Import shared components, schemas, and hooks from `packages/core`
4. **Isolate Responsibilities**: App-specific schemas go in `apps/{name}/lib/db/schema/features/`

### Planned Apps (from NBEE-Doc)
| App | Spec Location | Status |
|-----|---------------|--------|
| CMS | `NBEE-Doc/CMS/` | ✅ Implemented |
| Website | `NBEE-Doc/Website/` | 🔲 Pending |
| AD | `NBEE-Doc/AD/` | 🔲 Pending |
