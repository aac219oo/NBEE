// Note: CMS_DEFAULT_MENUS and CORE_DEFAULT_MENUS have been removed.
// Menu definitions are now in @heiso/core/config/menus.ts (static config for dashboard navigation).

export const DEFAULT_ROLES = [
  {
    name: "Admin",
    description: "Administrator with high privileges",
    fullAccess: true,
  },
  {
    name: "Editor",
    description: "",
    fullAccess: true,
  }
];
