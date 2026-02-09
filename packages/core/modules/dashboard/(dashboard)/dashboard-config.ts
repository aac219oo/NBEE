import type { Navigation } from "@heiso/core/types/client";
import { DASHBOARD_DEFAULT_MENUS } from "@heiso/core/config/menus";

export type DashboardMenuKey = keyof typeof DASHBOARD_DEFAULT_MENUS;

/**
 * Transforms static menu config into Navigation structure.
 * Groups items by their 'group' property and filters by allowed menu IDs.
 *
 * @param allowedMenuIds - Array of menu keys the user has permission to access.
 *                         If null/undefined, all menus are allowed (fullAccess).
 * @param translateFn - Optional function to translate menu titles.
 * @param menus - Optional custom menu configuration. Defaults to DASHBOARD_DEFAULT_MENUS.
 */
export function buildDashboardNavigation(
  allowedMenuIds: string[] | null,
  translateFn?: (key: string) => string,
  menus: typeof DASHBOARD_DEFAULT_MENUS = DASHBOARD_DEFAULT_MENUS
): Navigation {
  const menuEntries = Object.entries(menus);

  // Filter by allowed IDs if not fullAccess
  const filteredMenus = allowedMenuIds
    ? menuEntries.filter(([key]) => allowedMenuIds.includes(key))
    : menuEntries;

  // Group by 'group' property
  const groupedMenus: Record<string, typeof filteredMenus> = {};

  for (const entry of filteredMenus) {
    const [, menu] = entry;
    const groupName = menu.group;
    if (!groupedMenus[groupName]) {
      groupedMenus[groupName] = [];
    }
    groupedMenus[groupName].push(entry);
  }

  // Sort each group by order and convert to NavItem format
  const items: Navigation["items"] = [];

  // Define group order
  const groupOrder = ["functions", "membership"];

  for (const groupName of groupOrder) {
    const groupMenus = groupedMenus[groupName];
    if (!groupMenus || groupMenus.length === 0) continue;

    // Sort by order
    const sortedMenus = [...groupMenus].sort(
      (a, b) => a[1].order - b[1].order
    );

    // Convert to NavItem array (grouped)
    const navItems = sortedMenus.map(([key, menu]) => ({
      id: key,
      title: translateFn ? translateFn(menu.title) : menu.title,
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
