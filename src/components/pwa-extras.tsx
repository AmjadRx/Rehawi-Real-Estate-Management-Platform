"use client";

import { Share, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * PWA niceties (§9): offline queued-toast (no offline writes in v1) and a
 * one-time "install the app" hint on mobile browsers outside standalone.
 */
export function PwaExtras() {
  const [showInstallHint, setShowInstallHint] = useState(false);

  useEffect(() => {
    const goneOffline = () =>
      toast.warning("You're offline", {
        description:
          "You can keep reading cached pages; changes can't be saved until you're back online.",
        duration: 6000,
      });
    const backOnline = () => toast.success("Back online.");
    window.addEventListener("offline", goneOffline);
    window.addEventListener("online", backOnline);
    return () => {
      window.removeEventListener("offline", goneOffline);
      window.removeEventListener("online", backOnline);
    };
  }, []);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      ("standalone" in navigator &&
        (navigator as { standalone?: boolean }).standalone === true);
    const isMobile = /iphone|ipad|android/i.test(navigator.userAgent);
    const dismissed = localStorage.getItem("rehawi-install-hint") === "done";
    if (isMobile && !isStandalone && !dismissed) {
      const timer = setTimeout(() => setShowInstallHint(true), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  function dismiss() {
    localStorage.setItem("rehawi-install-hint", "done");
    setShowInstallHint(false);
  }

  return (
    <AnimatePresence>
      {showInstallHint && (
        <motion.div
          initial={{ opacity: 0, transform: "translateY(24px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          exit={{ opacity: 0, transform: "translateY(24px)" }}
          transition={{ type: "spring", bounce: 0, visualDuration: 0.4 }}
          className="fixed inset-x-4 bottom-20 z-50 rounded-2xl border bg-card p-4 shadow-lg md:left-auto md:right-6 md:w-96"
          role="dialog"
          aria-label="Install the app"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Share className="size-4" aria-hidden />
            </div>
            <div className="text-sm">
              <p className="font-semibold">Install Rehawi Estates</p>
              <p className="mt-0.5 text-muted-foreground">
                Add it to your home screen: open the browser menu and choose{" "}
                <strong>Add to Home Screen</strong>. It works like a native app.
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
