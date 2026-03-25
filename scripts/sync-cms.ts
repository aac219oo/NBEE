#!/usr/bin/env bun
/**
 * sync-cms CLI
 *
 * Scans Core modules route files (page.tsx, layout.tsx, loading.tsx)
 * and compares them against CMS app/ directory.
 * Detects missing routes and orphan re-exports, then interactively
 * generates re-export files for missing routes.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, relative, dirname, join } from "path";
import { Glob } from "bun";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dir, "..");
const CORE_MODULES_DIR = resolve(ROOT, "packages/core/modules");
const CMS_APP_DIR = resolve(ROOT, "apps/cms/app");

const ROUTE_FILES = ["page.tsx", "layout.tsx", "loading.tsx"];

// Module paths that are handled by CMS's own routing and should not
// be treated as missing even if they lack re-exports.
const IGNORED_CORE_PATHS = new Set([
  // auth is handled by CMS auth layout/pages directly
  "auth",
  // www is the public website, not CMS
  "www",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RouteFile {
  /** Relative path from core/modules, e.g. "account/me" */
  routePath: string;
  /** File type: "page.tsx" | "layout.tsx" | "loading.tsx" */
  fileType: string;
  /** Full absolute path in core/modules */
  coreAbsPath: string;
  /** Expected absolute path in cms/app */
  cmsAbsPath: string;
  /** Import path for re-export */
  importPath: string;
}

interface OrphanFile {
  /** Absolute path of the orphan file in CMS */
  cmsAbsPath: string;
  /** Relative path from cms/app */
  relativePath: string;
  /** The original re-export source path */
  sourcePath: string;
}

// ---------------------------------------------------------------------------
// 1. Scan Core modules for route files
// ---------------------------------------------------------------------------

function scanCoreRoutes(): RouteFile[] {
  const routes: RouteFile[] = [];

  for (const fileType of ROUTE_FILES) {
    const glob = new Glob(`**/${fileType}`);
    for (const match of glob.scanSync({ cwd: CORE_MODULES_DIR })) {
      const dir = dirname(match);
      const routePath = dir === "." ? "" : dir;

      // Skip ignored paths
      const topLevel = routePath.split("/")[0];
      if (IGNORED_CORE_PATHS.has(topLevel)) continue;

      // Build import path: strip fileType extension for the import
      const fileBase = fileType.replace(".tsx", "");
      const importPath = routePath
        ? `@heiso/core/modules/${routePath}/${fileBase}`
        : `@heiso/core/modules/${fileBase}`;

      const cmsAbsPath = resolve(CMS_APP_DIR, routePath, fileType);

      routes.push({
        routePath,
        fileType,
        coreAbsPath: resolve(CORE_MODULES_DIR, match),
        cmsAbsPath,
        importPath,
      });
    }
  }

  return routes;
}

// ---------------------------------------------------------------------------
// 2. Scan CMS app directory for existing route files
// ---------------------------------------------------------------------------

function scanCmsFiles(): Map<string, string> {
  /** Map of cms relative path -> file content */
  const files = new Map<string, string>();

  for (const fileType of ROUTE_FILES) {
    const glob = new Glob(`**/${fileType}`);
    for (const match of glob.scanSync({ cwd: CMS_APP_DIR })) {
      const absPath = resolve(CMS_APP_DIR, match);
      try {
        const content = readFileSync(absPath, "utf-8");
        files.set(match, content);
      } catch {
        // Skip unreadable files
      }
    }
  }

  return files;
}

// ---------------------------------------------------------------------------
// 3. Detect missing routes
// ---------------------------------------------------------------------------

function detectMissing(coreRoutes: RouteFile[], cmsFiles: Map<string, string>): RouteFile[] {
  return coreRoutes.filter((route) => {
    const cmsRelative = route.routePath
      ? `${route.routePath}/${route.fileType}`
      : route.fileType;
    return !cmsFiles.has(cmsRelative);
  });
}

// ---------------------------------------------------------------------------
// 4. Detect orphan re-exports
// ---------------------------------------------------------------------------

const RE_EXPORT_PATTERN = /^export\s*\{\s*default\s*\}\s*from\s*["'](@heiso\/core\/modules\/[^"']+)["']/m;

function detectOrphans(
  coreRoutes: RouteFile[],
  cmsFiles: Map<string, string>,
): OrphanFile[] {
  const coreImportPaths = new Set(coreRoutes.map((r) => r.importPath));
  const orphans: OrphanFile[] = [];

  for (const [relativePath, content] of cmsFiles) {
    const match = content.match(RE_EXPORT_PATTERN);
    if (!match) continue; // Not a re-export file, skip

    const sourcePath = match[1];
    if (!coreImportPaths.has(sourcePath)) {
      orphans.push({
        cmsAbsPath: resolve(CMS_APP_DIR, relativePath),
        relativePath,
        sourcePath,
      });
    }
  }

  return orphans;
}

// ---------------------------------------------------------------------------
// 5. Generate re-export file
// ---------------------------------------------------------------------------

function generateReExport(route: RouteFile): void {
  const dir = dirname(route.cmsAbsPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const content = `export { default } from "${route.importPath}";\n`;
  writeFileSync(route.cmsAbsPath, content, "utf-8");
}

// ---------------------------------------------------------------------------
// 6. Interactive prompt
// ---------------------------------------------------------------------------

async function promptAction(route: RouteFile): Promise<"y" | "n" | "a" | "q"> {
  const cmsRelative = route.routePath
    ? `${route.routePath}/${route.fileType}`
    : route.fileType;

  process.stdout.write(
    `\n  Missing: apps/cms/app/${cmsRelative}\n` +
    `  Source:  ${route.importPath}\n` +
    `  Generate re-export? [Y/n/a/q] `,
  );

  for await (const line of console) {
    const input = line.trim().toLowerCase();
    if (input === "" || input === "y") return "y";
    if (input === "n") return "n";
    if (input === "a") return "a";
    if (input === "q") return "q";
    process.stdout.write("  Invalid input. [Y/n/a/q] ");
  }

  return "q";
}

// ---------------------------------------------------------------------------
// 7. Diff report
// ---------------------------------------------------------------------------

function printDiffReport(missing: RouteFile[], orphans: OrphanFile[]): void {
  console.log("\n========================================");
  console.log("  sync-cms: Route Diff Report");
  console.log("========================================\n");

  if (missing.length === 0 && orphans.length === 0) {
    console.log("  All routes are in sync. No action needed.\n");
    return;
  }

  if (missing.length > 0) {
    console.log(`  Missing routes (${missing.length}):`);
    for (const route of missing) {
      const cmsRelative = route.routePath
        ? `${route.routePath}/${route.fileType}`
        : route.fileType;
      console.log(`    + apps/cms/app/${cmsRelative}`);
    }
    console.log();
  }

  if (orphans.length > 0) {
    console.log(`  Orphan re-exports (${orphans.length}):`);
    for (const orphan of orphans) {
      console.log(`    ! apps/cms/app/${orphan.relativePath}`);
      console.log(`      Source: ${orphan.sourcePath} (no longer in Registry)`);
    }
    console.log();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\nsync-cms: Scanning Core modules and CMS app directory...\n");

  // Scan
  const coreRoutes = scanCoreRoutes();
  const cmsFiles = scanCmsFiles();

  if (coreRoutes.length === 0) {
    console.log("  No registered routes found in Core modules.\n");
    return;
  }

  console.log(`  Found ${coreRoutes.length} route files in Core modules.`);
  console.log(`  Found ${cmsFiles.size} route files in CMS app.`);

  // Detect diffs
  const missing = detectMissing(coreRoutes, cmsFiles);
  const orphans = detectOrphans(coreRoutes, cmsFiles);

  // Print report
  printDiffReport(missing, orphans);

  // Interactive generation for missing routes
  if (missing.length > 0) {
    let generated = 0;
    let skipped = 0;
    let autoAll = false;

    for (const route of missing) {
      if (autoAll) {
        generateReExport(route);
        generated++;
        const cmsRelative = route.routePath
          ? `${route.routePath}/${route.fileType}`
          : route.fileType;
        console.log(`  Generated: apps/cms/app/${cmsRelative}`);
        continue;
      }

      const action = await promptAction(route);

      if (action === "q") {
        console.log("\n  Aborted. Files already generated are preserved.\n");
        break;
      }

      if (action === "n") {
        skipped++;
        continue;
      }

      if (action === "a") {
        autoAll = true;
      }

      // action is "y" or "a"
      generateReExport(route);
      generated++;
      const cmsRelative = route.routePath
        ? `${route.routePath}/${route.fileType}`
        : route.fileType;
      console.log(`  Generated: apps/cms/app/${cmsRelative}`);
    }

    console.log(`\n  Summary: ${generated} generated, ${skipped} skipped.\n`);
  }

  // Orphan warnings
  if (orphans.length > 0) {
    console.log("  Warning: Orphan re-export files detected above.");
    console.log("  These files reference Core module paths that no longer exist.");
    console.log("  Please review and remove them manually if appropriate.\n");
  }
}

main().catch((err) => {
  console.error("sync-cms failed:", err);
  process.exit(1);
});
