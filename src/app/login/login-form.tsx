"use client";

import { Building2, KeyRound, Loader2, MailCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Phase = "identifier" | "code";

const spring = { type: "spring", bounce: 0, visualDuration: 0.35 } as const;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [phase, setPhase] = useState<Phase>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  const requestCode = useCallback(async () => {
    if (!identifier.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 || res.status === 502) {
        setError(data.message ?? "Something went wrong. Try again.");
        return;
      }
      setNotice(data.message ?? "If this contact is authorized, a code was sent.");
      setPhase("code");
      setDigits(["", "", "", "", ""]);
      setTimeout(() => boxes.current[0]?.focus(), 250);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [identifier, busy]);

  const verify = useCallback(
    async (code: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, code }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.message ?? "That code is not valid.");
          setDigits(["", "", "", "", ""]);
          boxes.current[0]?.focus();
          return;
        }
        router.replace(params.get("next") ?? "/");
        router.refresh();
      } catch {
        setError("Network error. Check your connection and try again.");
      } finally {
        setBusy(false);
      }
    },
    [busy, identifier, params, router],
  );

  const setDigit = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const next = [...digits];

    if (cleaned.length > 1) {
      // paste: distribute the digits
      for (let i = 0; i < 5 - index; i++) next[index + i] = cleaned[i] ?? "";
      setDigits(next);
      const last = Math.min(index + cleaned.length, 4);
      boxes.current[last]?.focus();
    } else {
      next[index] = cleaned;
      setDigits(next);
      if (cleaned && index < 4) boxes.current[index + 1]?.focus();
    }

    const code = next.join("");
    if (code.length === 5) verify(code);
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      boxes.current[index - 1]?.focus();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, transform: "translateY(12px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={spring}
      className="w-full max-w-sm"
    >
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Building2 className="size-7" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl">Rehawi Estates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Private family portfolio. Sign in to continue.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <AnimatePresence mode="wait" initial={false}>
          {phase === "identifier" ? (
            <motion.form
              key="identifier"
              initial={{ opacity: 0, transform: "translateX(-16px)" }}
              animate={{ opacity: 1, transform: "translateX(0px)" }}
              exit={{ opacity: 0, transform: "translateX(-16px)" }}
              transition={spring}
              onSubmit={(e) => {
                e.preventDefault();
                requestCode();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or phone number</Label>
                <Input
                  id="identifier"
                  name="identifier"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@family.com or +9715…"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoFocus
                  className="h-11 text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Phone numbers in international format, e.g. +49 or +971.
                </p>
              </div>
              <Button
                type="submit"
                className="h-11 w-full text-base"
                disabled={busy || !identifier.trim()}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <MailCheck className="size-4" aria-hidden />
                )}
                Send code
              </Button>
            </motion.form>
          ) : (
            <motion.div
              key="code"
              initial={{ opacity: 0, transform: "translateX(16px)" }}
              animate={{ opacity: 1, transform: "translateX(0px)" }}
              exit={{ opacity: 0, transform: "translateX(16px)" }}
              transition={spring}
              className="space-y-4"
            >
              <div className="space-y-1 text-center">
                <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <KeyRound className="size-5" aria-hidden />
                </div>
                <p className="text-sm font-medium">Enter the 5-digit code</p>
                <p className="text-xs text-muted-foreground">{notice}</p>
              </div>

              <div
                className="flex justify-center gap-2"
                role="group"
                aria-label="5-digit sign-in code"
              >
                {digits.map((digit, i) => (
                  <Input
                    key={i}
                    ref={(el) => {
                      boxes.current[i] = el;
                    }}
                    value={digit}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    aria-label={`Digit ${i + 1}`}
                    className="size-12 p-0 text-center text-xl font-semibold tabular-numbers"
                    disabled={busy}
                  />
                ))}
              </div>

              {busy && (
                <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Verifying…
                </p>
              )}

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    setPhase("identifier");
                    setError(null);
                  }}
                >
                  Use a different contact
                </button>
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
                  onClick={requestCode}
                  disabled={busy}
                >
                  Resend code
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden text-center text-sm font-medium text-destructive"
              role="alert"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Access is limited to family members on the allowlist.
      </p>
    </motion.div>
  );
}
