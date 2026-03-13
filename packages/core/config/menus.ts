export type DashboardMenu = {
  group: string;
  name: string;
  path: string;
  icon: string;
  title: string;
  order: number;
};

export const DASHBOARD_DEFAULT_MENUS: Record<string, DashboardMenu> = {
  // role 和 team 已移至 /account/ 路徑下
};
