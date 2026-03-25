/**
 * Shared type interfaces for Core component props injection.
 * These types define the data contracts between Core components and
 * consuming apps (e.g., CMS). Core components depend on these shapes
 * for rendering, but do not know which database/schema provides the data.
 */
import type { Value } from "platejs";

// ---------------------------------------------------------------------------
// Post
// ---------------------------------------------------------------------------

export interface PostItem {
  id: string;
  title: string | null;
  slug: string;
  content: unknown;
  html: string | null;
  contentMobile: unknown;
  htmlMobile: string | null;
  excerpt: string | null;
  featuredImage: string | null;
  featuredVideo: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  categories: {
    category: { id: string; name: string } | null;
  }[];
  status: string;
  isPublished: Date | null;
  savedTemplateId?: string | null;
  updater?: string | null;
}

export interface PostListItem {
  id: string;
  title: string | null;
  slug: string;
  [key: string]: unknown;
}

export interface PostListResult {
  data: PostListItem[];
  total: number;
}

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export interface TemplateItem {
  id: string;
  userId: string;
  pageId: string | null;
  name: string;
  description?: string;
  thumbnail: string;
  htmlContent: Value;
  mobileContent: Value | undefined;
  category: string;
}

// ---------------------------------------------------------------------------
// Service action signatures (for props injection)
// ---------------------------------------------------------------------------

/** NavigationForm service actions */
export interface NavigationServiceActions {
  getCategoryList: () => Promise<CategoryItem[]>;
  getPostList: (params: {
    categoryId?: string;
    start?: number;
    limit?: number;
  }) => Promise<PostListResult>;
  getPost: (id: string) => Promise<PostItem | null>;
}

/** SaveTemplateDialog service actions */
export interface TemplateDialogServiceActions {
  getPost: (id: string) => Promise<PostItem | null>;
  savePost: (
    data: {
      title: string;
      slug: string;
      content: unknown;
      html?: string;
      htmlMobile?: string | null;
      contentMobile?: unknown | null;
      excerpt: string;
      featuredImage?: string;
      featuredVideo?: string;
      categoryIds?: string[];
      published: boolean;
    },
    id?: string,
  ) => Promise<unknown>;
  saveTemplate: (data: {
    name: string;
    description?: string;
    pageId?: string;
    htmlContent: unknown;
    mobileContent?: unknown;
  }) => Promise<{
    success: boolean;
    template?: { id: string; name: string; [key: string]: unknown };
  }>;
  updateTemplate: (
    templateId: string,
    data: {
      name?: string;
      description?: string;
      htmlContent?: unknown;
      mobileContent?: unknown;
    },
  ) => Promise<{
    success: boolean;
    template?: { [key: string]: unknown };
  }>;
  savePostTemplate: (postId: string, templateId: string) => Promise<void>;
}

/** BlockEditor service actions (template-related) */
export interface BlockEditorServiceActions {
  getPost: (id: string) => Promise<PostItem | null>;
  getTemplateById: (templateId: string) => Promise<TemplateItem | null>;
  getTemplatesList: () => Promise<TemplateItem[]>;
  deleteTemplate: (
    templateId: string,
  ) => Promise<{ success: boolean; message?: string }>;
}
