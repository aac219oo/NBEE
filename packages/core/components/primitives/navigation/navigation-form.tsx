"use client";

import { Button } from "@heiso/core/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@heiso/core/components/ui/form";
import { Input } from "@heiso/core/components/ui/input";
import { Label } from "@heiso/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@heiso/core/components/ui/select";
import { Switch } from "@heiso/core/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@heiso/core/components/ui/tooltip";
import { useUploadFile } from "@heiso/core/hooks/use-upload-file";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import {
  getCategoryList,
  getPost,
  getPostList
} from "@heiso/core/server/navigation.service";
import { NavigationFormConfig } from "@heiso/core/config/forms/navigation"
import { ActionButton } from "@heiso/core/components/primitives/action-button";
import { CollapsibleSection } from "@heiso/core/components/ui/collapsible-section";
import { type LinkType, LinkTypeEnum } from "@heiso/core/config/enums/navigation";
import { IconUploader } from "@heiso/core/components/primitives/file-uploader";
import type { NavigationItem } from "@heiso/core/components/primitives/navigation";

const formSchema = z
  .object({
    title: z.string().min(1, "This is required"),
    slug: z.string(),
    subTitle: z.string(),
    parentItem: z.string().optional(),
    linkType: z.string(),
    style: z.string().optional(),
    link: z.string().optional(),
    linkCategory: z.string().optional(),
    linkItem: z.string().optional(),
    icon: z.any().optional(),
    targetBlank: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // 條件1：當 linkType 是 'link' 時，'link' 欄位為必填
    if (data.linkType === LinkTypeEnum.Link) {
      const value = data.linkItem?.trim() ?? "";
      if (value === "") {
        ctx.addIssue({
          code: "custom",
          path: ["linkItem"],
          message: "This is required",
        });
      }
      // 允許格式：#anchor、/path、http(s)://url
      const isValidFormat = value.startsWith("#")
        ? value.length > 1
        : value.startsWith("/") || /^https?:\/\//i.test(value);
      if (value !== "" && !isValidFormat) {
        ctx.addIssue({
          code: "custom",
          path: ["linkItem"],
          message: "Invalid link format",
        });
      }
    }

    // 條件2：當 linkType 是 'page' 時，'linkCategory' 和 'linkItem' 為必填
    if (data.linkType === LinkTypeEnum.Page) {
      if (!data.linkCategory) {
        ctx.addIssue({
          code: "custom",
          path: ["linkCategory"],
          message: "This is required",
        });
      }
      if (!data.linkItem) {
        ctx.addIssue({
          code: "custom",
          path: ["linkItem"],
          message: "This is required",
        });
      }
    }
    const hasCategorySelected = (data.linkCategory?.trim() ?? "") !== "";
    const hasLinkItemSelected = (data.linkItem?.trim() ?? "") !== "";
    if (hasCategorySelected && !hasLinkItemSelected) {
      ctx.addIssue({
        code: "custom",
        path: ["linkItem"],
        message: "This is required",
      });
    }
  });
interface NavigationFormProps {
  item?: NavigationItem | null;
  isPending?: boolean;
  onSave: (item: Partial<Omit<NavigationItem, "id">>) => void;
  onCancel: () => void;
  navigationItems: NavigationItem[];
}

export function NavigationForm({
  item,
  isPending = false,
  onSave,
  onCancel,
  navigationItems,
}: NavigationFormProps) {
  const t = useTranslations("dashboard.navigation.navigation-manager");
  const { uploadFile, isUploading } = useUploadFile();
  const typeLabelMap: Record<LinkType, string> = {
    [LinkTypeEnum.None]: t("typeNone"),
    [LinkTypeEnum.Link]: t("typeLink"),
    [LinkTypeEnum.Page]: t("typePage"),
    [LinkTypeEnum.Article]: t("typeArticle"),
  };
  const linkTypesToShow: LinkType[] = Array.from(
    new Set([
      LinkTypeEnum.None,
      LinkTypeEnum.Link,
      ...NavigationFormConfig.availableLinkTypes.filter(
        (t) => t !== LinkTypeEnum.None && t !== LinkTypeEnum.Link,
      ),
    ]),
  );
  const getDefaultValues = useCallback((nav?: NavigationItem | null) => {
    const base = {
      title: nav?.title ?? "",
      slug: nav?.slug ?? "",
      subTitle: nav?.subTitle ?? "",
      parentItem: nav?.parentId ?? "null",
      linkType: nav?.linkType ?? LinkTypeEnum.None,
      linkCategory: "",
      linkItem: "",
      icon: nav?.icon,
      targetBlank: nav?.targetBlank ?? false,
      style: nav?.style ?? "none",
    };
    if (!nav?.linkType || nav.linkType === LinkTypeEnum.None) return base;
    if (nav.linkType === LinkTypeEnum.Link) {
      return { ...base, linkItem: nav?.link ?? "" };
    }
    if (nav.linkType === LinkTypeEnum.Page) {
      const parts = (nav?.link ?? "").split("/");
      return {
        ...base,
        linkCategory: parts[0] ?? "",
        linkItem: parts[1] ?? "",
      };
    }
    return base;
  }, []);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(item),
  });

  const [pageCategories, setPageCategories] = useState<
    Array<{
      id: string;
      name: string;
      slug: string;
    }>
  >([]);
  const [pages, setPages] = useState<
    Array<{ id: string; title: string; slug: string }>
  >([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingCategories(true);
    getCategoryList()
      .then((list) => {
        if (cancelled) return;
        setPageCategories(list);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingCategories(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const linkType = useWatch({
    control: form.control,
    name: "linkType",
  });

  const linkCategory = useWatch({
    control: form.control,
    name: "linkCategory",
  });

  const hasSelectedCategory = !!linkCategory;
  const selected = pageCategories.find((c) => String(c.id) === linkCategory);
  const showCategoryLoading =
    linkType === LinkTypeEnum.Page &&
    (isLoadingCategories || (hasSelectedCategory && !selected));

  // 不再在切換時回填初始分類，初始分類由 defaultValues 控制
  useEffect(() => {
    if (linkType === LinkTypeEnum.Page) {
      const categoryId: string | undefined =
        selected?.id ?? (linkCategory ? String(linkCategory) : undefined);
      if (categoryId) {
        setIsLoadingPages(true);
        getPostList({ categoryId, start: 0, limit: 100 })
          .then((result) => {
            if (result?.data) {
              setPages(
                result.data.map((post) => ({
                  id: post.id,
                  title: post.title || "",
                  slug: post.slug,
                })),
              );
            }
          })
          .finally(() => setIsLoadingPages(false));
      } else {
        setPages([]);
        setIsLoadingPages(false);
      }
    }
  }, [linkType, linkCategory, selected?.id]);

  // 編輯既有 Page 連結時，僅存 page 的 id（存於 link），載入後以 id 反查目前分類並回填
  useEffect(() => {
    if (linkType !== LinkTypeEnum.Page) return;
    const itemId = form.getValues("linkItem");
    const categorySlug = form.getValues("linkCategory");
    if (!itemId || categorySlug) return;

    let cancelled = false;
    const hydrateCategoryById = async () => {
      setIsLoadingPages(true);
      try {
        const post = await getPost(String(itemId));
        if (cancelled) return;
        const categories = (post?.categories || [])
          .map((c) => c.category)
          .filter(Boolean) as { id: string; name: string }[];
        if (!categories || categories.length === 0) {
          setPages([]);
          return;
        }
        // 命中一個或多個分類時，先回填第一個，避免頁面空白
        const first = categories[0];
        form.setValue("linkCategory", String(first.id), { shouldDirty: false });
        const result = await getPostList({
          categoryId: String(first.id),
          start: 0,
          limit: 100,
        });
        if (cancelled) return;
        setPages(
          (result?.data || []).map((post) => ({
            id: post.id,
            title: post.title || "",
            slug: post.slug,
          })),
        );
      } finally {
        setIsLoadingPages(false);
      }
    };
    void hydrateCategoryById();
    return () => {
      cancelled = true;
    };
  }, [linkType, form.getValues, form.setValue]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    let finalLink = "";
    if (
      values.linkType === LinkTypeEnum.Page &&
      values.linkCategory &&
      values.linkItem
    ) {
      finalLink = `${values.linkCategory}/${values.linkItem}`;
    } else if (values.linkType === LinkTypeEnum.Link) {
      finalLink = values.linkItem || "";
    }

    const dataToSave: Partial<Omit<NavigationItem, "id">> = {
      title: values.title.trim(),
      slug: values.slug.trim(),
      subTitle: values.subTitle.trim() ?? "",
      parentId: values.parentItem === "null" ? null : values.parentItem,
      linkType: values.linkType,
      style: values.style,
      link: finalLink,
      icon: values.icon,
      targetBlank: !!values.targetBlank,
    };

    // 檢查 icon 欄位是否是一個新的 File 物件
    if (values.icon instanceof File) {
      try {
        toast.info("Uploading icon...");
        const uploadedFile = await uploadFile(values.icon);

        dataToSave.icon = uploadedFile.url;
        toast.success("Icon uploaded successfully!");
      } catch (error) {
        toast.error("Icon upload failed");
        console.error(error);
        return;
      }
    } else {
      dataToSave.icon = values.icon;
    }

    onSave(dataToSave);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("titleItem")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("enterTitle")}
                  className="w-full"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {
          <FormField
            control={form.control}
            name="parentItem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("parentItem.title")}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Icon
                          icon="lucide:circle-question-mark"
                          className="ml-1 size-3 text-gray-500"
                        />
                      </TooltipTrigger>
                      <TooltipContent className="whitespace-pre-line">
                        {item?.children && item.children.length > 0
                          ? t("parentItem.note.cannotMove")
                          : t("parentItem.note.canSelectParent")}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(`${value}`);
                    }}
                    //當我是父層選單時，還有子層不可選擇
                    disabled={item?.children && item.children.length > 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("parentItem.note.text")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">
                        {t("parentItem.note.none")}
                      </SelectItem>
                      {navigationItems?.map((nav) => (
                        <SelectItem
                          key={nav.id}
                          value={nav.id}
                          disabled={item?.id === nav.id}
                        >
                          {nav.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />
        }

        {
          <FormField
            control={form.control}
            name="linkType"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="m-0">{t("linkItem")}</FormLabel>
                  {linkType !== LinkTypeEnum.None && (
                    <FormField
                      control={form.control}
                      name="targetBlank"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Switch
                                id="target-blank"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="scale-80"
                              />
                              <Label
                                htmlFor="target-blank"
                                className="text-sm text-muted-foreground"
                              >
                                {t("openInNewTab")}
                              </Label>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      // 每次切換 linkType 時，清空 link 的值
                      form.setValue("linkCategory", "");
                      form.setValue("linkItem", "");
                      field.onChange(`${value}`);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select link type" />
                    </SelectTrigger>
                    <SelectContent>
                      {linkTypesToShow.map((lt) => (
                        <SelectItem key={lt} value={lt}>
                          {typeLabelMap[lt]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />
        }

        {linkType === LinkTypeEnum.Link && (
          <FormField
            control={form.control}
            name="linkItem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("typeLink")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("inputLink")}
                    className="w-full"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {/* Page 類型：先選分類，再選分頁 */}

        {linkType === LinkTypeEnum.Page && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="linkCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("typePageCategory")}</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={(value) => {
                      form.setValue("linkItem", "");
                      field.onChange(`${value}`);
                    }}
                    disabled={isLoadingCategories || showCategoryLoading}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full truncate">
                        {showCategoryLoading ? (
                          <span className="text-muted-foreground">
                            Loading...
                          </span>
                        ) : (
                          <SelectValue placeholder={t("inputPageCategory")} />
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pageCategories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={String(category.id)}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {form.watch("linkCategory") && !isLoadingCategories && (
              <FormField
                control={form.control}
                name="linkItem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("typePage")}</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={isLoadingPages}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full truncate">
                          <SelectValue
                            placeholder={
                              isLoadingPages ? "Loading..." : t("inputPage")
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pages.map((page) => (
                          <SelectItem key={page.id} value={page.id}>
                            {page.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        <CollapsibleSection
          title={t("advancedSettings")}
          open={showAdvancedSettings}
          onOpenChange={setShowAdvancedSettings}
        >
          {NavigationFormConfig.showSubtitle && (
            <FormField
              control={form.control}
              name="subTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subtitleItem")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("enterSubtitle")}
                      className="w-full"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {NavigationFormConfig.showIcon && (
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("iconItem")}</FormLabel>
                  <FormControl>
                    <IconUploader
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {linkType !== "none" && (
            <FormField
              control={form.control}
              name="style"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("styleItem")}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("styleNone")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("styleNone")}</SelectItem>
                        <SelectItem value="button">
                          {t("styleButton")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
          )}
        </CollapsibleSection>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <ActionButton
            disabled={isPending || isUploading}
            loading={isPending || isUploading}
            type="submit"
          >
            {t("save")}
          </ActionButton>
        </div>
      </form>
    </Form>
  );
}
