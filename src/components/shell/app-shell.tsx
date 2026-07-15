"use client";

import {
  Building2,
  Contact,
  Globe2,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", key: "dashboard", icon: LayoutDashboard },
  { href: "/properties", key: "properties", icon: Building2 },
  { href: "/world-map", key: "worldMap", icon: Globe2 },
  { href: "/owners", key: "owners", icon: Users },
  { href: "/directory", key: "directory", icon: Contact },
  { href: "/settings", key: "settings", icon: Settings },
  { href: "/admin", key: "admin", icon: ShieldCheck, adminOnly: true },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({
  role,
  identifier,
  children,
}: {
  role: "admin" | "viewer";
  identifier: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const tApp = useTranslations("app");
  const items = NAV.filter((n) => !("adminOnly" in n && n.adminOnly) || role === "admin");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-svh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-5" aria-hidden />
          </div>
          <div className="leading-tight">
            <p className="font-semibold">{tApp("name")}</p>
            <p className="text-xs text-muted-foreground">{tApp("tagline")}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Main">
          {items.map(({ href, key, icon: Icon }) => {
            const label = t(key);
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors",
                  active
                    ? "text-sidebar-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-sidebar-primary/10"
                    transition={{ type: "spring", bounce: 0.15, visualDuration: 0.35 }}
                  />
                )}
                <Icon className="relative size-5" aria-hidden />
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t px-3 py-3">
          <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{identifier}</p>
              <p className="text-xs capitalize text-muted-foreground">{role}</p>
            </div>
            <div className="flex shrink-0 items-center">
              <ThemeToggle />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    aria-label={t("signOut")}
                  >
                    <LogOut className="size-4" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("signOut")}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-4" aria-hidden />
            </div>
            <span className="font-semibold">{tApp("name")}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label={t("signOut")}
            >
              <LogOut className="size-4" aria-hidden />
            </Button>
          </div>
        </header>

        <main className="flex-1 pb-24 md:pb-8">{children}</main>

        {/* Mobile bottom tab bar (§6: PWA navigation) */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="grid auto-cols-fr grid-flow-col">
            {items.map(({ href, key, icon: Icon }) => {
              const label = t(key);
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="tabbar-active"
                      className="absolute inset-x-3 top-1 h-0.5 rounded-full bg-primary"
                      transition={{ type: "spring", bounce: 0.15, visualDuration: 0.35 }}
                    />
                  )}
                  <Icon className="size-5" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
