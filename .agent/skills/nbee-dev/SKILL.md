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

## Workflows & Guidelines
1. **Development Flow**: Read specs first, identify component location (Core vs CMS), then implement.
   - See [references/workflows.md](references/workflows.md) for detailed steps.

2. **Architecture & Responsibilities**:
   - See [references/architecture.md](references/architecture.md) for detailed breakdown of `apps/cms` vs `packages/core`.

## Data & Tech Info (MCP Usage)
- **Database**: Use `postgres` MCP for live data queries.
- **Next.js Runtime**: Use `next-devtools` MCP for runtime analysis.
- **Docs/Specs**: Always verify against `NBEE-Doc` or use `search_by_name` if needed.
