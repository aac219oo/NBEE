"use client";

import { Button } from "@heiso/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@heiso/core/components/ui/dialog";
import { useTranslations } from "next-intl";
import { ActionButton } from "@heiso/core/components/primitives/action-button";

type Props = {
  title: string;
  content?: React.ReactNode;
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const ConfirmRemove = ({
  title,
  content,
  open,
  pending = false,
  onClose,
  onConfirm,
}: Props) => {
  const t = useTranslations("components.posts.list.confirm-remove");
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title || t("areYouSure")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">{content}</div>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <ActionButton
              variant="destructive"
              onClick={async () => {
                await onConfirm();
                onClose();
              }}
              loading={pending}
              disabled={pending}
            >
              {t("remove")}
            </ActionButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
