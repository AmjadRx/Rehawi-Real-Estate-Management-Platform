"use client";

import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";

/**
 * App-wide client providers.
 * MotionConfig reducedMotion="user" makes every animation respect the
 * OS-level prefers-reduced-motion setting.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // CSS Studio: development-only visual editor; never shipped to users.
    if (process.env.NODE_ENV === "development") {
      import("cssstudio").then(({ startStudio }) => startStudio());
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster position="top-center" richColors />
    </MotionConfig>
  );
}
