"use client";

import { Button } from "@heiso/core/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@heiso/core/components/ui/form";
import { Input } from "@heiso/core/components/ui/input";
import { Label } from "@heiso/core/components/ui/label";
import MultipleSelector from "@heiso/core/components/ui/multiselect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@heiso/core/components/ui/select";
import { Separator } from "@heiso/core/components/ui/separator";
import { Switch } from "@heiso/core/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@heiso/core/components/ui/tabs";
import { Textarea } from "@heiso/core/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChartLine,
  ChevronLeft,
  Copy,
  FileCog,
  FolderCode,
  ImagePlus,
  LaptopMinimal,
  Smartphone,
  SquarePen,
  Video,
  WandSparkles,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Value } from "platejs";
import { createSlateEditor } from "platejs";
import type { SyntheticEvent } from "react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BaseEditorKit } from "@heiso/core/components/editor/editor-base-kit";
import { ActionButton } from "@heiso/core/components/primitives/action-button";
import { BlockEditor, type BlockEditorRef } from "@heiso/core/components/primitives/editor";
import { serializeHtmlCompat } from "@heiso/core/components/primitives/editor/serialize-html-compat";
import { LoadingOverlay } from "@heiso/core/components/primitives/posts/edit/loading-overlay";
import {
  type PostStatus,
  PostStatusBadge,
} from "@heiso/core/components/primitives/posts/post-status";
import { EditorStatic } from "@heiso/core/components/ui/editor-static";
import type { TPageCategory } from "@heiso/core/lib/db/schema";

import { cn } from "@heiso/core/lib/utils";
import { PostView } from "../view/post-view";
import { CopyHtmlContent } from "./copy-post-dialog";
import { FeaturedImage } from "./featured-image";
import { FeaturedVideo } from "./featured-video";
import { LeaveConfirmDialog } from "./leave-dialog";
import PostTranslate from "./post-translate";

export interface PostEditMenu {
  id: string;
  link: string;
  title: string;
  [key: string]: any;
}

export interface PostEditData {
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
  categories: {
    category: { id: string; name?: string } | null;
  }[];
  isPublished: Date | null | boolean;
  savedTemplateId?: string | null;
  seoImage?: string;
  menus?: PostEditMenu[];
  [key: string]: any;
}

const formInfoItemClassName =
  "w-full grid grid-cols-[120px_1fr] items-center gap-x-4 gap-y-1 justify-start [&>*:nth-child(n+2)]:col-start-2";
const editorClassName =
  "bg-transparent dark:bg-input/30 h-full w-full max-w-none p-15";
const containerClassName =
  "w-full max-w-none h-full min-h-0 grid grid-rows-[max-content_1fr] !overflow-y-visible overflow-x-hidden";
const createSavePostSchema = (t: ReturnType<typeof useTranslations>) =>
  z.object({
    title: z.string().min(1, t("required")),
    slug: z.string().optional(),
    content: z.custom<Value>(),
    html: z.string().optional(),
    contentMobile: z.custom<Value>().optional(),
    htmlMobile: z.string().optional(),
    excerpt: z.string().optional(),
    featuredImage: z.string().optional(),
    featuredVideo: z.string().optional(),
    seoImage: z.string().optional(),
    categoryId: z
      .array(
        z.object({
          value: z.string(),
          label: z.string(),
        }),
      )
      .min(1, t("required")),
    published: z.boolean().optional(),
    menus: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
      }),
    ),
    savedTemplateId: z.string().optional(),
    seoTitle: z.string().optional(),
    seoSlug: z.string().optional(),
    seoDescription: z.string().optional(),
    seoKeywords: z.string().optional(),
    canonicalUrl: z.string().optional(),
    jsonId: z.string().optional(),
    twitterCard: z.string().optional(),
  });

type Schema = z.input<ReturnType<typeof createSavePostSchema>>;

// 提交動作常數：僅用於判斷本次提交是「儲存」或「發佈」，
// 不可作為表單欄位或依賴表單狀態使用。
export const SUBMIT_ACTION = {
  SAVE: "save",
  PUBLISH: "publish",
} as const;
export type SubmitAction = (typeof SUBMIT_ACTION)[keyof typeof SUBMIT_ACTION];

export interface SavePostConfig {
  labels?: {
    item?: string;
    items?: string;
    [key: string]: string | undefined;
  };
  header?: {
    aiTools?: boolean;
  };
  tabs?: {
    edit?: boolean;
    info?: boolean;
    seo?: boolean;
    jsonId?: boolean;
  };
  info?: {
    title?: boolean;
    slug?: boolean;
    excerpt?: boolean;
    categoriesMode?: "single" | "multiple" | false;
    menus?: boolean;
    featured?: boolean;
  };
  editor?: {
    showMobile?: boolean;
    showTemplateButtons?: boolean;
  };
  translate?: boolean;
}

export interface SavePostPayload {
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
}

export type SavePostFunction = (
  data: SavePostPayload,
  id?: string,
) => Promise<{ id: string } | undefined>;

export function PostEdit({
  id,
  data,
  categories,
  config,
  translationItem,
  savePost,
  baseLink,
}: {
  id?: string;
  data?: PostEditData | null;
  categories: TPageCategory[];
  config?: SavePostConfig;
  translationItem?: string;
  savePost: SavePostFunction;
  baseLink: string;
}) {
  const title = useTranslations("components.posts");
  const t = useTranslations("components.posts.edit");
  const itemLabel = translationItem || title("item");
  const schema = createSavePostSchema(t);
  const { categoryId } = useParams();
  const editorRef = useRef<BlockEditorRef>(null);
  const mobileEditorRef = useRef<BlockEditorRef>(null);
  // 明確標記本次提交動作（save/publish），避免僅依賴表單 published 值造成混淆
  const submitActionRef = useRef<SubmitAction | null>(null);

  const ui = {
    header: {
      aiTools: config?.header?.aiTools ?? true,
    },
    tabs: {
      edit: config?.tabs?.edit ?? true,
      info: config?.tabs?.info ?? true,
      seo: config?.tabs?.seo ?? true,
      jsonId: config?.tabs?.jsonId ?? true,
    },
    info: {
      title: config?.info?.title ?? true,
      slug: config?.info?.slug ?? true,
      excerpt: config?.info?.excerpt ?? true,
      categoriesMode: config?.info?.categoriesMode ?? false,
      menus: config?.info?.menus ?? true,
      featured: config?.info?.featured ?? false,
    },
    editor: {
      showMobile: config?.editor?.showMobile ?? true,
      showTemplateButtons: config?.editor?.showTemplateButtons ?? true,
    },
    translate: config?.translate ?? true,
  } as const;

  const [isSavePostPending, startSavePostTransition] = useTransition(); //發布按鈕 pending
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [activeSubmitterId, setActiveSubmitterId] = useState<string | null>(
    null,
  );
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [isMobileView, setIsMobileView] = useState<boolean>(
    ui.editor.showMobile ? !!data?.contentMobile : false,
  );
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState<boolean>(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("edit");
  const [disableEditor, setDisableEditor] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); //儲存按鈕 pending
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewMobileHtml, setPreviewMobileHtml] = useState<string>("");
  // 使用 useTransition 的 isSavePostPending 作為提交中的統一 loading 狀態
  // 僅用於新文章：第一次儲存後記住建立的 id，第二次儲存用它做暫存
  const [localId, setLocalId] = useState<string | null>(null);
  const formId = useId();
  const [redirectingAfterFirstSave, setRedirectingAfterFirstSave] =
    useState<boolean>(false);
  const [redirectingAfterPublish, setRedirectingAfterPublish] =
    useState<boolean>(false);
  // 載入時還原暫存的 post.id，避免刷新後再次走新增
  useEffect(() => {
    if (id) return;
    try {
      const key = `post-local-id-${formId}`;
      const stored = sessionStorage.getItem(key);
      if (stored && !localId) setLocalId(stored);
    } catch { }
  }, [id, formId, localId]);
  const saveButtonId = useId();
  const publishButtonId = useId();
  const defaultCategoryIdsFromData = (data?.categories ?? [])
    .map((item) => item.category?.id || "")
    .filter(Boolean);
  const categoryIds = defaultCategoryIdsFromData.length
    ? defaultCategoryIdsFromData
    : categoryId
      ? [String(categoryId)]
      : [];
  const router = useRouter();

  const isMultiCategory = ui.info.categoriesMode === "multiple";

  // 实时监听 sessionStorage 中的上传状态变化
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 初始读取
    const updateUploadingState = () => {
      const isUploadingValue = sessionStorage.getItem("upload-is-uploading");
      if (isUploadingValue) {
        setIsUploading(JSON.parse(isUploadingValue));
      }
    };

    // 初始化时读取一次
    updateUploadingState();

    // 监听 storage 事件（跨标签页变化）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "upload-is-uploading") {
        console.log("Storage event detected:", e.newValue);
        if (e.newValue) {
          setIsUploading(JSON.parse(e.newValue));
        }
      }
    };

    // 定时轮询检查（同一标签页内的变化）
    const pollInterval = setInterval(() => {
      updateUploadingState();
    }, 500); // 每500ms检查一次

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  // 優化 sessionStorage 偵測：攔截 setItem 以達到即時更新，不需等待輪詢
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalSetItem = sessionStorage.setItem;
    sessionStorage.setItem = function (key, value) {
      if (key === "upload-is-uploading") {
        setIsUploading(JSON.parse(value));
      }
      originalSetItem.apply(this, [key, value]);
    };

    return () => {
      sessionStorage.setItem = originalSetItem;
    };
  }, []);

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: data?.title || "",
      slug: id ? `/pages/${id}` : "",
      html: data?.html || "",
      content: (data?.content as Value) ?? undefined,
      contentMobile: (data?.contentMobile as Value) ?? undefined,
      htmlMobile: data?.htmlMobile || "",
      excerpt: data?.excerpt || "",
      featuredImage: data?.featuredImage || "",
      featuredVideo: data?.featuredVideo || "",
      seoImage: (data as any)?.seoImage || "",
      categoryId:
        ui.info.categoriesMode !== false
          ? categories
            .filter((c) => categoryIds.includes(c.id))
            .map((c) => ({ value: c.id, label: c.name }))
          : [],
      published: !!data?.isPublished || false,
      menus: data?.menus || [],
      savedTemplateId: data?.savedTemplateId || "",
      seoTitle: "",
      seoSlug: "",
      seoDescription: "",
      seoKeywords: "",
      canonicalUrl: "",
      jsonId: "",
      twitterCard: "card",
    },
  });

  const { isDirty, dirtyFields } = form.formState;

  // 判斷是否真的有欄位被修改：isDirty 為 true 且 dirtyFields 不為空
  const isTrulyDirty = isDirty && Object.keys(dirtyFields).length > 0;

  // AI Complete
  // const { execute: completeBlogPostExecute, status: isCompleting } = useAction(
  //   completeBlogPostAction,
  //   {
  //     onSuccess: (data) => {
  //       const tags =
  //         data.tags?.map((tag) => ({
  //           id: customAlphabet('abcdefghijklmnopqrstuvwxyz', 5)(),
  //           text: tag,
  //         })) || [];
  //       setTags([...tags]);

  //       form.setValue('title', data.title);
  //       form.setValue('content', data.content);
  //       form.setValue('excerpt', data.excerpt);
  //       form.setValue('slug', data.slug);
  //       form.setValue('tags', tags);

  //       editorRef.current?.commands.setContent(data.content);

  //       toast('Post completed successfully');
  //     },
  //   }
  // );

  const handleCopyToMobile = async () => {
    const regularContent =
      form.getValues("content") ?? editorRef.current?.getValue();
    let regularHtml = form.getValues("html");
    if (!regularHtml && editorRef.current) {
      regularHtml = await editorRef.current.getHtml();
    }

    if (regularContent) {
      form.setValue("contentMobile", regularContent);
      form.setValue("htmlMobile", regularHtml || "");

      if (mobileEditorRef.current) {
        mobileEditorRef.current.setValue(regularContent);
      }

      toast.success(t("copy.copySuccess"));
    }
  };

  async function buildPreviewHtml() {
    try {
      const webValue =
        form.getValues("content") ?? editorRef.current?.getValue();
      if (webValue) {
        const webEditor = createSlateEditor({
          plugins: BaseEditorKit,
          value: webValue,
        });
        const webHtml = await serializeHtmlCompat(webEditor, {
          editorComponent: EditorStatic,
        });
        setPreviewHtml(webHtml || "");
      } else {
        setPreviewHtml("");
      }

      if (isMobileView) {
        const mobileValue =
          form.getValues("contentMobile") ??
          mobileEditorRef.current?.getValue() ??
          webValue;
        if (mobileValue) {
          const mobileEditor = createSlateEditor({
            plugins: BaseEditorKit,
            value: mobileValue,
          });
          const mHtml = await serializeHtmlCompat(mobileEditor, {
            editorComponent: EditorStatic,
          });
          setPreviewMobileHtml(mHtml || "");
        } else {
          setPreviewMobileHtml("");
        }
      } else {
        setPreviewMobileHtml("");
      }
    } catch {
      // 若序列化失敗，退回現有 html 欄位，避免預覽空白
      setPreviewHtml(form.getValues("html") || "");
      setPreviewMobileHtml(
        isMobileView ? form.getValues("htmlMobile") || "" : "",
      );
    }
  }

  async function validateRequired() {
    const title = form.getValues("title")?.trim();
    const categoryIds = (form.getValues("categoryId") ?? []).map(
      (item) => item.value,
    );

    form.clearErrors(["title", "categoryId"]);

    let ok = true;
    if (!title) {
      ok = false;
      form.setError("title", { message: t("required") });
      setActiveTab("info");
    }
    if (ui.info.categoriesMode !== false) {
      if (categoryIds.length === 0) {
        ok = false;
        form.setError("categoryId", { message: t("required") });
        setActiveTab("info");
      }
    }

    if (!ok) toast.error(t("formValidationError"));
    return ok;
  }

  async function onSubmit(input: Schema) {
    const passed = await validateRequired();
    if (!passed) return;
    const effectiveId = id ?? localId ?? undefined;
    const isFirstSave = !effectiveId;
    const isPublishing = submitActionRef.current === SUBMIT_ACTION.PUBLISH; //判斷發佈動作

    // 構建基本 payload；HTML 僅在發布時才計算並附帶
    const payload: any = {
      title: input.title,
      slug: input.slug || "",
      content: input.content,
      contentMobile: isMobileView ? input.contentMobile : null,
      excerpt: input.excerpt || "",
      featuredImage: input.featuredImage || "",
      featuredVideo: input.featuredVideo || "",
      categoryIds:
        ui.info.categoriesMode !== false
          ? (input.categoryId ?? []).map((item) => item.value)
          : [],
      published: isPublishing,
    };

    if (isPublishing) {
      const webHtml = editorRef.current
        ? await editorRef.current.getHtml()
        : input.html || "";
      const mobileHtml = isMobileView
        ? mobileEditorRef.current
          ? await mobileEditorRef.current.getHtml()
          : (input.htmlMobile ?? null)
        : null;
      payload.html = webHtml;
      payload.htmlMobile = mobileHtml;
    }

    // 在 transition 中執行儲存 +（首存）跳轉，讓 isSavePostPending 覆蓋整個提交流程
    if (isPublishing) {
      // 發佈流程：在 transition 中執行，讓 isSavePostPending 控制 loading
      startSavePostTransition(async () => {
        const post = await savePost(payload, effectiveId);
        // 首次發佈也記住新建立的 id（雖然會跳列表，但保留穩健性）
        if (isFirstSave && post?.id) {
          setLocalId(post.id);
          try {
            sessionStorage.setItem(`post-local-id-${formId}`, post.id);
          } catch { }
        }
        toast.success(t("postPublished", { item: itemLabel }));

        const firstCategoryId = payload.categoryIds[0];
        const target = firstCategoryId
          ? `${baseLink}/${firstCategoryId}/post`
          : `${baseLink}/post`;
        router.replace(target);
        router.refresh();
      });
      // 重置當次動作標記
      submitActionRef.current = null;
      return;
    }

    // 儲存流程：直接 await 儲存（不使用 transition），用 isSubmitting 控制 loading
    const post = await savePost(payload, effectiveId);
    // 重置表單狀態為當前值，這會清除 isDirty 狀態
    form.reset(form.getValues());

    // 首次儲存：記住建立的 id，後續儲存走 update
    if (isFirstSave && post?.id) {
      setLocalId(post.id);
      try {
        sessionStorage.setItem(`post-local-id-${formId}`, post.id);
      } catch { }
    }
    toast.success(
      effectiveId
        ? t("postUpdated", { item: itemLabel })
        : t("postCreated", { item: itemLabel }),
    );

    const firstCategoryId = payload.categoryIds[0];
    if (isFirstSave && post?.id) {
      // 首次儲存：跳到該篇文章的編輯頁（跳轉本身可用 transition 包住）
      setRedirectingAfterFirstSave(true);
      startSavePostTransition(() => {
        const target = firstCategoryId
          ? `/dashboard/pages/${firstCategoryId}/post/${post.id}/edit`
          : `/dashboard/pages/post/${post.id}/edit`;
        router.replace(target);
        router.refresh();
      });
    }
    submitActionRef.current = null;
  }

  const submitFromButton = async (published: boolean) => {
    const isValid = await validateRequired();
    if (!isValid) {
      setIsPreview(false);
      return;
    }

    if (!published) {
      // 儲存：只更新 content/contentMobile，用 isSubmitting 控制 loading
      try {
        setIsSubmitting(true);
        setDisableEditor(true);
        setActiveSubmitterId(saveButtonId);
        submitActionRef.current = SUBMIT_ACTION.SAVE;
        const originalPublished = form.getValues("published");
        form.setValue("published", false);
        await form.handleSubmit(onSubmit)();
        form.setValue("published", originalPublished);
      } finally {
        // 若為首次儲存且正在跳轉，延後解除 loading 至 transition 完成
        if (!redirectingAfterFirstSave) {
          setIsSubmitting(false);
          setDisableEditor(false);
          setActiveSubmitterId(null);
        }
      }
      return;
    }

    // 發佈：更新 html/htmlMobile 並切狀態為 published，用 isSavePostPending 控制 loading
    try {
      setDisableEditor(true);
      setActiveSubmitterId(publishButtonId);
      submitActionRef.current = SUBMIT_ACTION.PUBLISH;
      const originalPublished = form.getValues("published");
      form.setValue("published", true);
      await form.handleSubmit(onSubmit)();
      // 標記發佈跳轉中，等 transition 結束再解除 loading
      setRedirectingAfterPublish(true);
      form.setValue("published", originalPublished);
    } finally {
      // 發佈的 loading/編輯鎖在 transition 結束後統一解除
    }
  };

  // 監聽 transition 狀態，跳轉完成後再解除 loading/編輯鎖
  useEffect(() => {
    if (!isSavePostPending) {
      if (redirectingAfterFirstSave || redirectingAfterPublish) {
        setIsSubmitting(false);
        setDisableEditor(false);
        setActiveSubmitterId(null);
        setRedirectingAfterFirstSave(false);
        setRedirectingAfterPublish(false);
      }
    }
  }, [isSavePostPending, redirectingAfterFirstSave, redirectingAfterPublish]);

  return (
    <div
      className={cn(
        "container w-full mx-auto pt-6 px-6 flex flex-col",
        !isPreview ? "-translate-x-6" : "overflow-y-auto",
      )}
    >
      <LoadingOverlay show={isUploading} />
      <Form {...form}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                if (!isTrulyDirty) {
                  router.back();
                  return;
                }
                setIsLeaveDialogOpen(true);
              }}
              aria-label="Back to previous"
              className="p-2 rounded-md hover:bg-accent"
            >
              <ChevronLeft className="size-5" />
            </button>
            <LeaveConfirmDialog
              open={isLeaveDialogOpen}
              onOpenChange={setIsLeaveDialogOpen}
              onConfirm={() => {
                setIsLeaveDialogOpen(false);
                router.back();
              }}
              onSave={() => {
                setIsLeaveDialogOpen(false);
                submitFromButton(false);
              }}
            />
            <h1 className="text-xl font-bold ml-2 mr-3 capitalize">
              {id
                ? t("editPost", { item: itemLabel })
                : t("newPost", { item: itemLabel })}
            </h1>
            {data?.status && PostStatusBadge(data?.status as PostStatus)}
          </div>

          <div className="flex items-center space-x-2 gap-1.5">
            {/* <Button
                variant="secondary"
                size="sm"
                // disabled={isCompleting === 'executing'}
                onClick={
                  () => {
                  completeBlogPostExecute({
                    data: {
                      title: form.getValues('title'),
                      content: form.getValues('content'),
                      excerpt: form.getValues('excerpt'),
                    },
                  })
                  }
                }
              >
                {isCompleting === 'executing' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                AI Complete
              </Button> */}

            {ui.header.aiTools && (
              <Button variant="secondary">
                <WandSparkles className="size-3.5" />
                {t("aiTools")}
              </Button>
            )}
            <Button
              variant="secondary"
              size="w_xl"
              className="m-0"
              onClick={async () => {
                await buildPreviewHtml();
                setIsPreview((prev) => !prev);
              }}
            >
              {isPreview ? t("edit") : t("preview")}
            </Button>
            <Separator orientation="vertical" className="mx-2" />
            <ActionButton
              id={saveButtonId}
              type="button"
              disabled={isUploading || isSubmitting}
              loading={
                activeSubmitterId === saveButtonId &&
                (isUploading || isSubmitting)
              }
              variant={isTrulyDirty ? "destructive" : "outline"}
              size="w_xl"
              className={isTrulyDirty ? "" : "bg-transparent border-gray-400"}
              onClick={() => submitFromButton(false)}
            >
              {isTrulyDirty ? t("leaveConfirm.save") : t("save")}
            </ActionButton>
            <ActionButton
              id={publishButtonId}
              type="button"
              disabled={isUploading || isSavePostPending}
              loading={
                activeSubmitterId === publishButtonId &&
                (isUploading || isSavePostPending)
              }
              size="w_xl"
              onClick={() => submitFromButton(true)}
            >
              {t("publish")}
            </ActionButton>
          </div>
        </div>
        {isPreview ? (
          <PostView
            title={form.watch("title")}
            html={previewHtml}
            mobileHtml={isMobileView ? previewMobileHtml : undefined}
          />
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-row min-h-0 gap-0 relative"
          >
            {ui.translate && (
              <PostTranslate
                className="absolute top-14 -right-12"
                noneSelectTitle={true}
                onChange={() => {
                  setDisableEditor(true);
                  setActiveTab("edit");
                }}
                onFinish={() => setDisableEditor(false)}
              />
            )}
            <div>
              <TabsList className="bg-transparent p-0 -mr-2 flex flex-col items-start">
                {ui.tabs.edit && (
                  <TabsTrigger
                    value="edit"
                    variant="tabs-column"
                    disabled={disableEditor}
                  >
                    <SquarePen className="size-4 mr-1" />
                    {t("tab.edit")}
                  </TabsTrigger>
                )}
                {ui.tabs.info && (
                  <TabsTrigger
                    value="info"
                    variant="tabs-column"
                    disabled={disableEditor}
                  >
                    <FileCog className="size-4 mr-1" />
                    {t("tab.info")}
                  </TabsTrigger>
                )}
                {ui.tabs.seo && (
                  <TabsTrigger
                    value="seo"
                    variant="tabs-column"
                    disabled={disableEditor}
                  >
                    <ChartLine className="size-4 mr-1" />
                    FB & Twitter
                  </TabsTrigger>
                )}
                {ui.tabs.jsonId && (
                  <TabsTrigger
                    value="jsonId"
                    variant="tabs-column"
                    disabled={disableEditor}
                  >
                    <FolderCode className="size-4 mr-1" />
                    JSON-LD
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <form
              id={formId}
              className="flex flex-col w-full"
              onSubmit={async (
                e: SyntheticEvent<HTMLFormElement, SubmitEvent>,
              ) => {
                e.preventDefault();
                return;
              }}
            >
              <TabsContent
                value="edit"
                variant="tabs"
                className={cn(
                  "flex-1 min-h-0",
                  disableEditor &&
                  "pointer-events-none select-none cursor-default",
                )}
              >
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("content")}</FormLabel>
                    {ui.editor.showMobile && (
                      <div className="flex items-center space-x-2 text-xs">
                        <Switch
                          id="mobile"
                          checked={isMobileView}
                          onCheckedChange={(checked) => {
                            setIsMobileView(checked);
                            if (checked) {
                              setIsCopyDialogOpen(true);
                            }
                          }}
                        />
                        <Label htmlFor="mobile" className="text-sm">
                          {t("copy.mobileView")}
                        </Label>
                      </div>
                    )}
                  </div>
                  {ui.editor.showMobile && (
                    <CopyHtmlContent
                      open={isCopyDialogOpen}
                      onOpenChange={setIsCopyDialogOpen}
                      onConfirm={handleCopyToMobile}
                    />
                  )}

                  {ui.editor.showMobile && isMobileView ? (
                    <Tabs
                      defaultValue="web"
                      className="h-full flex flex-col min-h-0 mt-4 relative"
                    >
                      <TabsList className="rounded-full px-1 bg-secondary absolute left-0 top-[-42px]">
                        <TabsTrigger value="web" variant="preview">
                          <LaptopMinimal className="size-4" />
                          {t("tab.web")}
                        </TabsTrigger>
                        <TabsTrigger value="mobile" variant="preview">
                          <Smartphone className="size-4" />
                          {t("tab.mobile")}
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="web" className="relative">
                        <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                "relative w-full border rounded-lg focus:outline-none h-[calc(100dvh-14.5rem)]",
                                form.formState.errors.content &&
                                "border-destructive",
                              )}
                            >
                              <FormControl className="h-full min-h-0">
                                <div className="rounded-lg overflow-y-auto overflow-x-hidden focus:outline-none">
                                  <BlockEditor
                                    ref={editorRef}
                                    disable={disableEditor}
                                    editorClassName={editorClassName}
                                    containerClassName={containerClassName}
                                    value={field.value}
                                    toolVisibility={{
                                      showTemplateListButton:
                                        ui.editor.showTemplateButtons,
                                      showSaveTemplateButton:
                                        ui.editor.showTemplateButtons,
                                    }}
                                    mobileEditor={form.getValues(
                                      "contentMobile",
                                    )}
                                    onChange={({ value, html }) => {
                                      const currentValue =
                                        form.getValues("content");
                                      // 使用 JSON.stringify 比對避免物件參考不同造成的誤判
                                      if (
                                        JSON.stringify(value) !==
                                        JSON.stringify(currentValue)
                                      ) {
                                        field.onChange(value);
                                        form.setValue("html", html, {
                                          shouldDirty: true,
                                        });
                                      }
                                    }}
                                    onTemplateSelect={(templateId) => {
                                      form.setValue(
                                        "savedTemplateId",
                                        templateId,
                                      );
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      <TabsContent value="mobile" className="relative">
                        <FormField
                          control={form.control}
                          name="contentMobile"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                "relative w-full border rounded-lg focus:outline-none h-[calc(100dvh-14.5rem)]",
                                form.formState.errors.content &&
                                "border-destructive",
                              )}
                            >
                              <FormControl>
                                <div className="rounded-lg overflow-y-auto overflow-x-hidden focus:outline-none">
                                  <BlockEditor
                                    ref={mobileEditorRef}
                                    disable={disableEditor}
                                    editorClassName={editorClassName}
                                    containerClassName={containerClassName}
                                    value={field.value}
                                    toolVisibility={{
                                      showTemplateListButton:
                                        ui.editor.showTemplateButtons,
                                      showSaveTemplateButton:
                                        ui.editor.showTemplateButtons,
                                    }}
                                    webEditor={form.getValues("content")}
                                    onChange={({ value, html }) => {
                                      const currentValue =
                                        form.getValues("contentMobile");
                                      if (
                                        JSON.stringify(value) !==
                                        JSON.stringify(currentValue)
                                      ) {
                                        field.onChange(value);
                                        form.setValue("htmlMobile", html, {
                                          shouldDirty: true,
                                        });
                                      }
                                    }}
                                    onTemplateSelect={(templateId) => {
                                      form.setValue(
                                        "savedTemplateId",
                                        templateId,
                                      );
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="mt-4 h-[calc(100dvh-14.5rem)]">
                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem
                            className={cn(
                              "relative w-full h-full border rounded-lg focus:outline-none",
                              form.formState.errors.content &&
                              "border-destructive",
                            )}
                          >
                            <FormControl>
                              <div className="rounded-lg overflow-y-auto overflow-x-hidden focus:outline-none">
                                <BlockEditor
                                  ref={editorRef}
                                  disable={disableEditor}
                                  editorClassName={editorClassName}
                                  containerClassName={containerClassName}
                                  value={field.value}
                                  toolVisibility={{
                                    showTemplateListButton:
                                      ui.editor.showTemplateButtons,
                                    showSaveTemplateButton:
                                      ui.editor.showTemplateButtons,
                                  }}
                                  mobileEditor={form.getValues("content")} //因為沒有 mobile ，所以手機版內容要跟 web 一樣
                                  onChange={({ value, html }) => {
                                    const currentValue =
                                      form.getValues("content");
                                    if (
                                      JSON.stringify(value) !==
                                      JSON.stringify(currentValue)
                                    ) {
                                      field.onChange(value);
                                      form.setValue("html", html, {
                                        shouldDirty: true,
                                      });
                                    }
                                  }}
                                  onTemplateSelect={(templateId) => {
                                    form.setValue(
                                      "savedTemplateId",
                                      templateId,
                                    );
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              {ui.tabs.info && (
                <TabsContent
                  value="info"
                  variant="tabs"
                  className="flex flex-col gap-7"
                >
                  {ui.info.title && (
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <div className={formInfoItemClassName}>
                            <FormLabel required>{t("title")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                }}
                                placeholder={t("enterPostTitle", {
                                  item: itemLabel,
                                })}
                                className={cn(
                                  form.formState.errors.title &&
                                  "border-error focus-visible:ring-error",
                                )}
                              />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  )}

                  {ui.info.excerpt && (
                    <FormField
                      control={form.control}
                      name="excerpt"
                      render={({ field }) => (
                        <FormItem>
                          <div className={formInfoItemClassName}>
                            <FormLabel>{t("excerpt")}</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={t("enterExcerpt", {
                                  item: itemLabel,
                                })}
                                maxLength={300}
                              />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  )}

                  {ui.info.slug && (
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <div className={formInfoItemClassName}>
                            <FormLabel>
                              URL
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon_sm"
                                className="ml-2"
                                aria-label="Copy slug"
                                onClick={async () => {
                                  const raw = form.getValues("slug") || "";
                                  const cleaned = raw
                                    .replace(/^\.\//, "/")
                                    .replace(/^\./, "");
                                  try {
                                    await navigator.clipboard.writeText(
                                      cleaned,
                                    );
                                    toast.success(t("copied"));
                                  } catch {
                                    toast.error(t("copyFailed"));
                                  }
                                }}
                              >
                                <Copy className="size-3" />
                              </Button>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={t("enterPostSlug")}
                                disabled
                              />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  )}

                  {ui.info.categoriesMode !== false && (
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <div className={formInfoItemClassName}>
                            <FormLabel className="capitalize">
                              {t("category", { item: itemLabel })}
                            </FormLabel>
                            <FormControl>
                              {isMultiCategory ? (
                                <MultipleSelector
                                  className={cn(
                                    form.formState.errors.categoryId &&
                                    "border-destructive",
                                  )}
                                  commandProps={{
                                    label: t("selectCategories", {
                                      item: itemLabel,
                                    }),
                                  }}
                                  disabled={categories.length === 0}
                                  defaultOptions={categories.map(
                                    (category) => ({
                                      label: category.name,
                                      value: category.id,
                                    }),
                                  )}
                                  placeholder={
                                    categories.length === 0
                                      ? t("noneCategory", { item: itemLabel })
                                      : t("selectCategories", {
                                        item: itemLabel,
                                      })
                                  }
                                  emptyIndicator={
                                    <p className="text-center text-sm">
                                      {t("noResultsFound")}
                                    </p>
                                  }
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              ) : (
                                <Select
                                  value={
                                    Array.isArray(field.value) &&
                                      field.value.length > 0
                                      ? field.value[0]?.value
                                      : undefined
                                  }
                                  onValueChange={(val) => {
                                    const found = categories.find(
                                      (c) => c.id === val,
                                    );
                                    field.onChange(
                                      val
                                        ? [
                                          {
                                            value: val,
                                            label: found?.name ?? val,
                                          },
                                        ]
                                        : [],
                                    );
                                  }}
                                >
                                  <SelectTrigger
                                    className={cn(
                                      "w-full",
                                      form.formState.errors.categoryId &&
                                      "border-destructive",
                                    )}
                                    disabled={categories.length === 0}
                                  >
                                    <SelectValue
                                      placeholder={
                                        categories.length === 0
                                          ? t("noneCategory", {
                                            item: itemLabel,
                                          })
                                          : t("selectCategories", {
                                            item: itemLabel,
                                          })
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.map((category) => (
                                      <SelectItem
                                        key={category.id}
                                        value={category.id}
                                      >
                                        {category.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  )}

                  {ui.info.menus && (
                    <FormField
                      control={form.control}
                      name="menus"
                      render={({ field }) => (
                        <FormItem>
                          <div className={formInfoItemClassName}>
                            <FormLabel>{t("menus")}</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                value={
                                  field.value
                                    .map((item) => item.title)
                                    .join(", ") || "-"
                                }
                                disabled
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
                  )}

                  {ui.info.featured && (
                    <div
                      className={`${formInfoItemClassName} grid-cols-[120px_auto_auto] [&>*:nth-child(n+2)]:col-start-auto `}
                    >
                      <FormLabel>{t("featured")}</FormLabel>
                      <FormField
                        control={form.control}
                        name="featuredImage"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <FeaturedImage
                                value={field.value}
                                onChange={field.onChange}
                                icon={
                                  <ImagePlus className="size-5 text-muted-foreground" />
                                }
                                buttonClassName="w-[200px] h-[112px]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="featuredVideo"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <FeaturedVideo
                                value={field.value}
                                onChange={field.onChange}
                                icon={
                                  <Video className="size-5 text-muted-foreground" />
                                }
                                buttonClassName="w-[200px] h-[112px]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <div className={formInfoItemClassName}>
                            <FormLabel>{t("tags")}</FormLabel>
                            <FormControl>
                              <TagInput
                                {...field}
                                placeholder={t("enterTag")}
                                tags={tags}
                                setTags={(tags) => {
                                  setTags(tags);
                                  field.onChange(tags as Tag[]);
                              }}
                              activeTagIndex={activeTagIndex}
                              setActiveTagIndex={setActiveTagIndex}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    /> */}
                </TabsContent>
              )}

              {ui.tabs.seo && (
                <TabsContent
                  variant="tabs"
                  value="seo"
                  className="flex flex-col gap-7"
                >
                  <FormField
                    control={form.control}
                    name="seoTitle"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <div className={formInfoItemClassName}>
                          <FormLabel>{t("seoTitle")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                              }}
                              placeholder={t("enterSeoTitle")}
                              disabled
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="seoDescription"
                    render={({ field }) => (
                      <FormItem>
                        <div className={formInfoItemClassName}>
                          <FormLabel>{t("seoDescription")}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder={t("enterSeoDescription")}
                              disabled
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="seoImage"
                    render={({ field }) => (
                      <FormItem>
                        <div className={formInfoItemClassName}>
                          <FormLabel>{t("seoImage")}</FormLabel>
                          <FormControl>
                            <FeaturedImage
                              value={field.value}
                              onChange={field.onChange}
                              icon={
                                <ImagePlus className="size-5 text-muted-foreground" />
                              }
                              buttonClassName="w-[200px] h-[112px]"
                              disabled
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="twitterCard"
                    render={({ field }) => (
                      <FormItem>
                        <div className={formInfoItemClassName}>
                          <FormLabel>{t("twitterCard")}</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled
                            >
                              <SelectTrigger className="w-[240px]">
                                <SelectValue placeholder="card" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="card">card</SelectItem>
                                <SelectItem value="文章">文章</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </TabsContent>
              )}

              {ui.tabs.jsonId && (
                <TabsContent
                  variant="tabs"
                  value="jsonId"
                  className="flex flex-col gap-7"
                >
                  <FormField
                    control={form.control}
                    name="jsonId"
                    render={({ field }) => (
                      <FormItem>
                        <div
                          className={formInfoItemClassName}
                          style={{ gridTemplateColumns: "1fr" }}
                        >
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder={t("enterJsonId")}
                              disabled
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </TabsContent>
              )}
            </form>
          </Tabs>
        )}
      </Form>
    </div>
  );
}
