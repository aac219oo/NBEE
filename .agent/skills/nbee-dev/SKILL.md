---
name: nbee-dev
description: The primary skill for working with the NBEE monorepo (apps/cms, packages/core, packages/hive), looking for architecture insights, checking responsibilities, or needing to query project-specific data via MCPs.
---

# NBEE Project Skill

This skill provides context and workflows for the NBEE Monorepo.

## Project Structure (Context)
- **Root**: `monorepo-root` (TurboRepo + Bun)
- **Apps**: Independent applications built from `NBEE-Doc/` specs
  - `apps/cms`: Content Management System (Next.js 16, Elysia API)
  - To add new apps, see [references/architecture.md](references/architecture.md#adding-new-apps)
- **Packages**:
  - `packages/core`: Shared logic, UI components, Drizzle schema, Hooks.
- **Docs**: `NBEE-Doc/` (Source of Truth for Specs)

## Unified Development Standards

### 1. Project Context & Structure
- **Architecture**: Modern Monorepo (TurboRepo + Bun + Next.js 16). See [references/architecture.md](references/architecture.md) for details.
- **Core Strategy**:
  - `apps/cms`: The primary output application (Next.js). Content-focused.
  - `packages/core`: The shared logic, UI library, and database schema source of truth.
  - `NBEE-Doc/`: The **SINGLE SOURCE OF TRUTH** for all features and specs.
  - `.agent/`: AI memory, skills, and workflows.

### 2. Specification & Documentation
- **Golden Rule**: Code must match `NBEE-Doc`. If they differ, the Doc is right, or the Doc needs updating FIRST.
- **Workflow**:
  1. **Read**: Start at `NBEE-Doc/product-specs`.
     - `*-feature.md`: UI/UX, User Stories.
     - `*-spec.md`: Data Model, API, Technical constraints.
  2. **Check**: Determine if logic belongs in `packages/core` (shared) or `apps/cms` (specific).
  3. **Sync**: If implementation hits a snag, update the Doc *before* finishing the code.

### 3. Technology Stack (The "How")
- **Language**: TypeScript (Strict).
- **Styling**: Tailwind CSS (Utility-first, avoid custom CSS unless necessary).
- **Database**:
  - **Drizzle ORM**: The only way to touch the DB.
  - **Migration**: Change schema in `packages/core` or `packages/hive`, then `bun db:generate` -> `bun db:push`.
- **State/API**:
  - **Elysia**: For backend API logic (in `apps/cms/app/api`).
  - **Postgres**: Live data access via MCP.

### 4. Verification & Quality
- **Pre-commit**:
  ```bash
  bun lint        # Standard linting (Biome)
  bun run build   # Type checking & Build (Vercel standard)
  ```
- **Pro Tip**: If it doesn't build locally, it won't deploy. Fix existing lint errors before adding new code.

### 5. New App Integration (Submodules)
- **Goal**: Ensure `.gitmodules` is correctly configured for new private apps/packages.
- **Process**: (See [references/architecture.md](references/architecture.md#submodules--private-packages) for full details)
  1. **Check for `github` MCP**:
     - **Available**: Use it to configure the private repo and `.gitmodules`.
     - **Missing**:
       - Request manual configuration of the private repo from the user.
       - **Ask**: "Would you like a tutorial on setting up the GitHub MCP to automate this?"


## Data & Tech Info (MCP Usage)
- **Database**: Use `postgres` MCP for live data queries.
- **Next.js Runtime**: Use `next-devtools` MCP for runtime analysis.
- **Docs/Specs**: Always verify against `NBEE-Doc` or use `search_by_name` if needed.
- **GitHub**: Use `github` MCP for repository management (submodules), if available.
