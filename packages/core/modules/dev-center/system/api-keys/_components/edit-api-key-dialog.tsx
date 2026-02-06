"use client";

import { Button } from "@heiso/core/components/ui/button";
import { Calendar } from "@heiso/core/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@heiso/core/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@heiso/core/components/ui/form";
import { Input } from "@heiso/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@heiso/core/components/ui/select";
import { Switch } from "@heiso/core/components/ui/switch";
import { cn } from "@heiso/core/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, addYears } from "date-fns";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { updateApiKey } from "../_server/api-keys.service";
import type { TApiKeyWithKeyPrefix } from "./api-keys-list";

const editApiKeySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  expiresAt: z.string().optional(),
  isActive: z.boolean(),
  rateLimitPlan: z.string(),
  rateLimit: z
    .object({
      requests: z.number().int().min(1, "Requests must be at least 1"),
      window: z.number().int().min(1, "Window must be at least 1"),
    })
    .optional(),
});

type EditApiKeyFormData = z.infer<typeof editApiKeySchema>;

interface EditApiKeyDialogProps {
  apiKey: TApiKeyWithKeyPrefix;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (apiKey: TApiKeyWithKeyPrefix) => void;
}

export function EditApiKeyDialog({
  apiKey,
  open,
  onOpenChange,
  onSuccess,
}: EditApiKeyDialogProps) {
  const t = useTranslations("apiKeys");
  const [isPending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(!!apiKey.rateLimit);

  const getInitialPlan = () => {
    if (apiKey.rateLimit && typeof apiKey.rateLimit === 'object') {
      const rl = apiKey.rateLimit as { requests?: number, window?: number };
      if (rl.requests === 500 && rl.window === 60) return "standard";
      if (rl.requests === 1000 && rl.window === 60) return "professional";
      if (rl.requests === 3000 && rl.window === 60) return "enterprise";
      return "standard"; // Fallback to standard if no match
    }
    return "standard";
  };

  console.log("apiKey.rateLimit: ", apiKey.rateLimit);
  const form = useForm<EditApiKeyFormData>({
    resolver: zodResolver(editApiKeySchema),
    defaultValues: {
      name: apiKey.name,
      expiresAt: "never", // Default to never for simplicity in edit mode
      isActive: apiKey.isActive,
      rateLimitPlan: getInitialPlan(),
      rateLimit: apiKey.rateLimit || { requests: 500, window: 60 },
    },
  });

  // useEffect(() => {
  //   form.setValues({
  //     rateLimit: apiKey.rateLimit || undefined,
  //   });
  // }, [apiKey.rateLimit]);

  const onSubmit: SubmitHandler<EditApiKeyFormData> = (data) => {
    startTransition(async () => {
      try {
        let expiresAtDate: Date | null = null;
        if (data.expiresAt === "1_year") {
          expiresAtDate = addYears(new Date(), 1);
        } else if (data.expiresAt === "1.5_years") {
          expiresAtDate = addMonths(new Date(), 18);
        } else if (data.expiresAt === "3_years") {
          expiresAtDate = addYears(new Date(), 3);
        }

        let rateLimit = { requests: 500, window: 60 };
        if (data.rateLimitPlan === "professional") {
          rateLimit = { requests: 1000, window: 60 };
        } else if (data.rateLimitPlan === "enterprise") {
          rateLimit = { requests: 3000, window: 60 };
        }

        const result = await updateApiKey(apiKey.id, {
          name: data.name,
          description: null,
          expiresAt: expiresAtDate,
          isActive: data.isActive,
          rateLimit,
        });

        if (result.success && result.data) {
          onSuccess({ ...result.data, keyPrefix: apiKey.keyPrefix });
          toast.success(t("update_success"));
        } else {
          toast.error(result.error || t("update_error"));
        }
      } catch (_error) {
        toast.error(t("update_error"));
      }
    });
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("edit_api_key")}</DialogTitle>
          <DialogDescription>{t("edit_api_key_description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("name_placeholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("expires_at")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1_year">
                        {t("expires_1_year")}
                      </SelectItem>
                      <SelectItem value="1.5_years">
                        {t("expires_1_5_years")}
                      </SelectItem>
                      <SelectItem value="3_years">
                        {t("expires_3_years")}
                      </SelectItem>
                      <SelectItem value="never">
                        {t("expires_never")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel>
                      {t("active_status")}
                    </FormLabel>
                    <FormDescription>{t("active_status_help")}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="pt-2 border-t mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {t("advanced_settings")}
                </span>
                <Switch
                  checked={showAdvanced}
                  onCheckedChange={setShowAdvanced}
                />
              </div>

              {showAdvanced && (
                <div className="space-y-4 pt-2">
                  <FormField
                    control={form.control}
                    name="rateLimitPlan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("rate_limit_plan")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t("rate_limit_plan")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="standard">
                              {t("plan_standard")}
                            </SelectItem>
                            <SelectItem value="professional">
                              {t("plan_professional")}
                            </SelectItem>
                            <SelectItem value="enterprise">
                              {t("plan_enterprise")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t("updating") : t("update")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
