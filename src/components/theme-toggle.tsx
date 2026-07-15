"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Light/dark flip. The choice persists in localStorage("theme") and wins
 * over the OS setting; the first-paint script in layout.tsx reads the same
 * key so there is no flash on reload. Icons are CSS-driven (Moon in light
 * mode, Sun in dark), so server and client render identically.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("nav");

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Private browsing without storage: the flip still applies this visit.
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={t("toggleTheme")}
      className={cn("text-muted-foreground", className)}
    >
      <Moon className="size-4 dark:hidden" aria-hidden />
      <Sun className="hidden size-4 dark:block" aria-hidden />
    </Button>
  );
}
