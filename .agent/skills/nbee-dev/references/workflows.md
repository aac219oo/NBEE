# Workflows & Best Practices

## Proactive MCP Usage
You are encouraged to use MCP tools proactively to gather context without user intervention.

### 1. Database Exploration (Postgres MCP)
- **When to use**: 
  - checking schema definitions vs implementation
  - verifying data migration results
  - debugging data issues
- **Tools**:
  - `postgres.list_tables`: Overview of available tables.
  - `postgres.get_object_details`: Inspect specific table columns/constraints.
  - `postgres.execute_sql`: Run queries to check data states (READ ONLY preferred).
  - **Example**: "Check if the `users` table has the `tenant_id` column."

### 2. Runtime Analysis (Next.js MCP)
- **When to use**:
  - Debugging API route errors.
  - checking available routes in the running dev server.
- **Tools**:
  - `next-devtools.nextjs_index`: List available endpoints.
  - `next-devtools.nextjs_call`: Invoke internal diagnostics.

## Development Lifecycle

### Step 1: Spec Review (`NBEE-Doc`)
- **Action**: Always search `NBEE-Doc` or specific feature specs (`*-feature.md`, `*-spec.md`) before coding.
- **Goal**: Understand the Data Model and Business Rules defined by the Architect.

### Step 2: Implementation
- **Core vs App**: Decide if the code belongs in `packages/core` (Shared) or `apps/cms` (Specific).
- **Patterns**:
  - Use **Drizzle** for all DB interactions.
  - Use **Zod** for validation.
  - Follow the **Repository Pattern** where applicable.

### Step 3: Verification
- **Test**: Use `curl` or `scripts/` to verify logic.
- **MCP Verification**: Use `postgres.execute_sql` to confirm DB state matches expectations.

## Tech Stack Quick Ref
- **Package Manager**: Bun (`bun install`, `bun run`)
- **Monorepo**: TurboRepo
- **API**: ElysiaJS
- **ORM**: Drizzle
- **Frontend**: Next.js 16 + React 19 + TailwindCSS v4
- **Multi-Tenancy**: `bun hive` (CLI for tenant mgmt)
