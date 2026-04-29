import type { Navigation } from "@heiso/core/types/client";
import { generatedMenus, type GeneratedMenu } from "@heiso/core/config/generated/menus";

/**
 * Transforms generated menu config into Navigation structure.
 * Groups items by their 'group' property and filters by allowed menu IDs.
 *
 * @param allowedMenuIds - Array of menu names the user has permission to access.
 *                         If null/undefined, all menus are allowed (fullAccess).
 * @param translateFn - Optional function to translate menu titles.
 * @param menus - Optional custom menu list. Defaults to generatedMenus.
 */
export function buildDashboardNavigation(
  allowedMenuIds: string[] | null,
  translateFn?: (key: string) => string,
  menus: readonly GeneratedMenu[] = generatedMenus
): Navigation {
  // Filter by allowed IDs if not fullAccess
  const filteredMenus = allowedMenuIds
    ? menus.filter((menu) => allowedMenuIds.includes(menu.name))
    : [...menus];

  // Group by 'group' property
  const groupedMenus: Record<string, GeneratedMenu[]> = {};

  for (const menu of filteredMenus) {
    if (!groupedMenus[menu.group]) {
      groupedMenus[menu.group] = [];
    }
    groupedMenus[menu.group].push(menu);
  }

  // Sort each group by sortOrder and convert to NavItem format
  const items: Navigation["items"] = [];

  // Define group order
  const groupOrder = ["functions", "membership"];

  for (const groupName of groupOrder) {
    const groupMenus = groupedMenus[groupName];
    if (!groupMenus || groupMenus.length === 0) continue;

    // Sort by sortOrder
    const sortedMenus = [...groupMenus].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );

    // Convert to NavItem array (grouped)
    const navItems = sortedMenus.map((menu) => ({
      id: menu.name,
      title: translateFn ? translateFn(menu.name) : menu.name,
      path: menu.path,
      icon: menu.icon,
    }));

    // If only one item in group, add as single item; otherwise as array
    if (navItems.length === 1) {
      items.push(navItems[0]);
    } else {
      items.push(navItems);
    }
  }

  return {
    rootPath: "/dashboard",
    items,
  };
}
