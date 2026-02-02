"use client";

import { Logo } from "@heiso/core/components/primitives/logo";
import { ThemeSwitcher } from "@heiso/core/components/primitives/theme-switcher";
import { useSite } from "@heiso/core/providers/site";
import { useTranslations } from "next-intl";

export default function Layout({ children }: { children: React.ReactNode }) {
  const _t = useTranslations("auth.login");
  const { site } = useSite();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background relative font-lato overflow-hidden">
      {/* 背景裝飾 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,var(--primary)_0%,transparent_50%)] opacity-20" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <main className="w-full max-w-lg bg-card/60 dark:bg-card/40 backdrop-blur-xl py-12 px-8 md:px-12 rounded-3xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] relative z-10">
        <div className="flex flex-col items-center justify-center mb-8">
          <Logo
            hasTitle={false}
            classNames={{
              img: "h-20 w-auto transition-transform duration-300 hover:scale-105 object-contain",
            }}
          />
        </div>

        <div className="relative group">
          {children}
        </div>
      </main>

      <div className="absolute bottom-6 right-6 z-20">
        <ThemeSwitcher />
      </div>

      <footer className="mt-8 relative z-10 text-center">
        <div className="text-sm font-medium text-muted-foreground/60 tracking-wide uppercase">
          © {new Date().getFullYear()} {site?.branding?.organization || "Heiso INC"}
        </div>
      </footer>
    </div>
  );
}
