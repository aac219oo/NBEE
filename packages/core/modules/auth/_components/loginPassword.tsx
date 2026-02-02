"use client";

import { ActionButton } from "@heiso/core/components/primitives/action-button";
import { PasswordInput } from "@heiso/core/components/primitives/password-input";
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
import { login, verifyPasswordOnly } from "@heiso/core/server/services/auth";
// import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import AuthRedirectHint from "./authRedirectHint";
import Header from "./header";
import { type LoginStep, LoginStepEnum } from "./loginForm";

interface LoginPasswordProps {
  email?: string | null;
  loginMethod?: string | null;
  setStep: (step: LoginStep) => void;
  handleLoginSuccess: () => void;
  twoStep: boolean;
}

export default function LoginPassword({
  email,
  loginMethod,
  setStep,
  handleLoginSuccess,
  twoStep,
}: LoginPasswordProps) {
  const t = useTranslations("auth.login");
  const [error, setError] = useState("");
  const { update } = useSession();
  const router = useRouter();

  const formSchema = z.object({
    email: z.email({ message: t("email.error") }),
    password: z.string().min(6, { message: t("password.error") }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: email ?? "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError("");
    const { email, password } = values;

    // 若屬於兩步驟登入，先只驗證密碼，成功後導向 2steps 並寄送 OTP
    if (twoStep) {
      const ok = await verifyPasswordOnly(email, password);
      if (!ok) {
        setError(t("error.errorPassword"));
        return;
      }
      router.push(`/login/2steps?email=${encodeURIComponent(email)}`);
      return;
    }

    // 一般密碼登入：建立 Session 並導向 Dashboard
    const result = await login(email, password);
    if (!result) {
      setError(t("error.errorPassword"));
      return;
    }
    await update();
    handleLoginSuccess();
  };

  return (
    <>
      <Header title={t("titlePassword")} />
      <Form {...form}>
        <form className="mt-8 space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">
                    {t("email.label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="email-address"
                      type="email"
                      autoComplete="email"
                      placeholder={t("email.placeholder")}
                      className="h-12 bg-background/50 border-white/20 focus:border-primary/50 transition-all rounded-xl"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">
                    {t("password.label")}
                    <a
                      className="ml-auto inline-block text-[10px] text-primary hover:text-primary/80 transition-colors uppercase tracking-widest"
                      href={`/auth/forgot-password?email=${encodeURIComponent(email || form.watch("email") || "")}`}
                      tabIndex={-1}
                    >
                      {t("password.forgot")}
                    </a>
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      id="password"
                      autoComplete="current-password"
                      placeholder={t("password.placeholder")}
                      className="h-12 bg-background/50 border-white/20 focus:border-primary/50 transition-all rounded-xl"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  {error && (
                    <p className="w-full text-destructive text-sm font-medium mt-1">
                      {error}
                    </p>
                  )}
                </FormItem>
              )}
            />
          </div>
          <div className="pt-2">
            <ActionButton
              type="submit"
              className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl shadow-[0_4px_12px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_6px_20px_rgba(var(--primary-rgb),0.4)] transition-all duration-300 transform hover:-translate-y-0.5"
              loading={form.formState.isSubmitting}
            >
              <span className="text-lg">{t("submit")}</span>
            </ActionButton>
          </div>
          <AuthRedirectHint>
            <div className="flex justify-center">
              {t.rich("backToLogin", {
                Link: (chunks) => (
                  <Button
                    variant="link"
                    className="text-muted-foreground hover:text-primary font-medium p-0 h-auto text-sm transition-colors"
                    onClick={() => setStep(LoginStepEnum.Email)}
                    type="button"
                  >
                    {chunks}
                  </Button>
                ),
              })}
            </div>
          </AuthRedirectHint>
        </form>
      </Form>
    </>
  );
}
