"use client";

import { ActionButton } from "@heiso/core/components/primitives/action-button";
import { LanguageSwitcher } from "@heiso/core/components/primitives/language-switcher";
import { Card } from "@heiso/core/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@heiso/core/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@heiso/core/components/ui/select";
import type { Locale } from "@heiso/core/i18n/config";
import { defaultLocale, getLanguageInfo } from "@heiso/core/i18n/config";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import {
  getGeneralSettings,
  saveDefaultLanguage,
  saveGeneralSetting,
} from "../../_server/general.service";

export const SystemOauth = {
  none: {
    name: "None",
    value: "none",
  },
  google: {
    name: "Google SSO",
    value: "google",
  },
  microsoft: {
    name: "Azure SSO",
    value: "microsoft",
  },
};

export type SiteSetting = {
  basic: {
    name?: string;
    title?: string;
    base_url?: string;
    domain?: string;
  };
  branding: {
    slogan?: string;
    organization?: string;
    description?: string;
    copyright?: string;
  };
  assets: {
    favicon?: string;
    logo?: string;
    ogImage?: string;
  };
  system_oauth?: string;
};

const settingsSchema = z.object({
  system_oauth: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function Setting() {
  const t = useTranslations("devCenter.settings");
  const [isLoading, startTransition] = useTransition();
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [currentLocale, setCurrentLocale] = useState<Locale | undefined>();

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getGeneralSettings();
      setSystemSettings(data);
    } catch (error) {
      console.error("Failed to fetch general settings", error);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const locale = (systemSettings as any)?.language?.default as
      | Locale
      | undefined;
    setCurrentLocale(locale ?? defaultLocale);
  }, [systemSettings]);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      system_oauth: systemSettings?.system_oauth ?? "none",
    },
  });

  useEffect(() => {
    if (!systemSettings) return;
    form.reset({
      system_oauth: systemSettings?.system_oauth ?? "none",
    });
  }, [systemSettings, form]);

  async function onSubmit(data: SettingsFormValues) {
    startTransition(async () => {
      await saveGeneralSetting(data);
      await fetchSettings();
      toast.success("General settings updated");
    });
  }

  return (
    <div className="container mx-auto max-w-5xl justify-start py-10 space-y-6 mb-15 px-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="bg-card/50 p-6">
            <div className="flex flex-col gap-6">
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="system_oauth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("system_oauth.label")}</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {Object.values(SystemOauth).map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <ActionButton
              type="submit"
              loading={isLoading}
              disabled={isLoading}
            >
              {t("actions.save.button")}
            </ActionButton>
          </div>
        </form>
      </Form>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">{t("language.title")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("language.description")}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">
                {t("language.default")}
              </span>
              <p className="text-xs text-muted-foreground">
                {t("language.default_description")}
              </p>
            </div>
            <div className="">
              <LanguageSwitcher
                className="border rounded-md w-48 h-12"
                lang={currentLocale}
                onChange={(value) => {
                  setCurrentLocale(value);
                  startTransition(async () => {
                    await saveDefaultLanguage(value);
                    await fetchSettings();
                    toast("Language settings saved");
                  });
                }}
              >
                {getLanguageInfo(currentLocale ?? defaultLocale)?.nativeName}
              </LanguageSwitcher>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
