"use client";

import { Button } from "@heiso/core/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@heiso/core/components/ui/tooltip";
import { ChevronLeft, OctagonAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { HTMLAttributes } from "react";
import { PreviewPost, PreviewTitle } from "@heiso/core/components/ui/block-preview";
import { cn } from "@heiso/core/lib/utils";
import type { PostEditData } from "../edit/post-edit";

export const PostView = ({
  editLink,
  title,
  html,
  mobileHtml,
  excerpt,
  user,
  date,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  editLink?: string; // true found, false noFilled
  title: string | undefined;
  html: string | undefined;
  mobileHtml?: string;
  tags?: {
    tag: { id: string; name: string } | null;
  }[];
  excerpt?: string | null;
  user?: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  date?: Date | null;
}) => {
  return (
    <div
      className={cn(
        "py-8 px-5 flex flex-col bg-background rounded-sm",
        className,
      )}
      {...props}
    >
      <PreviewTitle
        className="relative"
        title={title}
        noFilled={!editLink && !title}
        found={!!editLink && !title}
      />
      <PreviewPost
        editLink={editLink}
        html={html || ""}
        mobileHtml={mobileHtml}
      />
    </div>
  );
};

export const PostPreview = ({
  post,
  editLink,
}: {
  post: PostEditData | null;
  editLink: string;
}) => {
  const t = useTranslations("components.posts.edit");
  const router = useRouter();
  return (
    <div className="container m-auto my-6">
      <Button className="float-right top-0" variant="ghost" asChild>
        <Link href={editLink}>{t("edit")}</Link>
      </Button>
      <div className="flex items-center mb-4">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back to previous"
          className="p-2 rounded-md hover:bg-accent"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-xl font-bold ml-2">{t("preview")}</h1>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm">
              <OctagonAlert className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{t("previewOnlyPublished")}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <PostView
        title={post?.title || undefined}
        html={post?.html || undefined}
        // mobileHtml={post?.mobileHtml || undefined}
        mobileHtml={undefined}
        excerpt={post?.excerpt}
        user={post?.user}
        date={post?.updatedAt}
      />
    </div>
  );
};
