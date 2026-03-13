export interface NavigationItem {
  id: string;
  title: string;
  slug: string;
  subTitle: string | null;
  icon?: string | null;
  linkType: string;
  style?: string;
  link: string;
  targetBlank?: boolean;
  group?: string | null;
  sortOrder: number | null;
  parentId?: string | null;
  children?: NavigationItem[];
  enabled?: boolean;
  resolvedCategoryId?: string;
}

export interface UpdateInstruction {
  id: string;
  parentId: string | null | undefined;
  sortOrder: number;
}

export * from "./navigation-form";
export * from "./navigation-tree";
