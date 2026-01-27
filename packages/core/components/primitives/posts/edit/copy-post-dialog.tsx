import { Button } from "@heiso/core/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@heiso/core/components/ui/dialog";
import { useTranslations } from "next-intl";

export const CopyHtmlContent = ({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
}) => {
  const t = useTranslations("components.posts.edit.copy");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("copyTitle")}</DialogTitle>
          <DialogDescription>{t("copyContent")}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline">{t("cancel")}</Button>
          </DialogClose>
          <DialogClose onClick={onConfirm} asChild>
            <Button variant="default">{t("confirm")}</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};
