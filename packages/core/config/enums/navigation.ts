export const LinkTypeEnum = {
  None: "none",
  Link: "link",
  Page: "page",
  Article: "article",
} as const;

export type LinkType = (typeof LinkTypeEnum)[keyof typeof LinkTypeEnum];
