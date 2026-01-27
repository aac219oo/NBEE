import { type LinkType, LinkTypeEnum } from "@heiso/core/config/enums/navigation";

export type NavigationFormConfig = {
  showSubtitle: boolean;
  showIcon: boolean;
  availableLinkTypes: Array<LinkType>;
};

export const NavigationFormConfig: NavigationFormConfig = {
  showSubtitle: false,
  showIcon: true,
  availableLinkTypes: [
    LinkTypeEnum.Page,
    // LinkTypeEnum.Article // Article 尚未開發
  ],
};
