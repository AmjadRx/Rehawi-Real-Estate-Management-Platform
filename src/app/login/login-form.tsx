"use client";

import {
  Building2,
  KeyRound,
  Loader2,
  LockKeyhole,
  MailCheck,
  Smartphone,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COUNTRIES } from "@/lib/countries";

type Phase =
  | "credentials" // email+password or phone entry
  | "code" // 5-digit boxes (phone flow, or email first-time verification)
  | "create-password"; // one-time setup after email verification

const spring = { type: "spring", bounce: 0, visualDuration: 0.35 } as const;

export function LoginForm({
  mode,
  emailOtp,
  phoneOtp,
}: {
  mode: "env_password" | "otp";
  emailOtp: boolean;
  phoneOtp: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [method, setMethod] = useState<"email" | "phone">("email");
  const [phase, setPhase] = useState<Phase>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [dial, setDial] = useState("+971:AE");
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  // Select values are "dial:ISO" so same-dial countries (US/CA) stay unique.
  const dialCode = dial.split(":")[0];
  const identifier =
    method === "email"
      ? email
      : `${dialCode}${phone.replace(/\D/g, "").replace(/^0+/, "")}`;

  const enterApp = useCallback(() => {
    router.replace(params.get("next") ?? "/");
    router.refresh();
  }, [params, router]);

  const requestCode = useCallback(async () => {
    if (busy) return;
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
  }, [busy, identifier]);

  const loginWithPassword = useCallback(async () => {
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        enterApp();
        return;
      }
      if (data.needsSetup) {
        setBusy(false);
        setNotice("First sign-in: we are emailing you a verification code.");
        await requestCode();
        return;
      }
      setError(data.message ?? "Invalid email or password.");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [busy, email, password, enterApp, requestCode]);

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
        // Email flow: first-time users create their password now (§3.2 v2)
        if (method === "email" && !data.user?.passwordSet) {
          setPhase("create-password");
          return;
        }
        enterApp();
      } catch {
        setError("Network error. Check your connection and try again.");
      } finally {
        setBusy(false);
      }
    },
    [busy, identifier, method, enterApp],
  );

  const savePassword = useCallback(async () => {
    if (busy) return;
    if (newPassword.length < 10) {
      setError("Passwords need at least 10 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Could not save the password.");
        return;
      }
      enterApp();
    } finally {
      setBusy(false);
    }
  }, [busy, newPassword, enterApp]);

  const setDigit = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const next = [...digits];
    if (cleaned.length > 1) {
      for (let i = 0; i < 5 - index; i++) next[index + i] = cleaned[i] ?? "";
      setDigits(next);
      boxes.current[Math.min(index + cleaned.length, 4)]?.focus();
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
        {phase === "credentials" && phoneOtp && (
          <Tabs
            value={method}
            onValueChange={(v) => {
              setMethod(v as "email" | "phone");
              setError(null);
            }}
          >
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="email" className="gap-1.5">
                <MailCheck className="size-4" aria-hidden />
                Email
              </TabsTrigger>
              <TabsTrigger value="phone" className="gap-1.5">
                <Smartphone className="size-4" aria-hidden />
                Phone
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {phase === "credentials" && method === "email" && (
            <motion.form
              key="email"
              initial={{ opacity: 0, transform: "translateX(-16px)" }}
              animate={{ opacity: 1, transform: "translateX(0px)" }}
              exit={{ opacity: 0, transform: "translateX(-16px)" }}
              transition={spring}
              onSubmit={(e) => {
                e.preventDefault();
                loginWithPassword();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@family.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
              <Button
                type="submit"
                className="h-11 w-full text-base"
                disabled={busy || !email.trim() || !password}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <LockKeyhole className="size-4" aria-hidden />
                )}
                Sign in
              </Button>
              {emailOtp ? (
                <button
                  type="button"
                  onClick={requestCode}
                  disabled={busy || !email.trim()}
                  className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
                >
                  First time here, or forgot your password? Get a code.
                </button>
              ) : (
                mode === "env_password" && (
                  <p className="text-center text-xs text-muted-foreground">
                    Forgot your password? Ask the family admin to reset it.
                  </p>
                )
              )}
            </motion.form>
          )}

          {phase === "credentials" && method === "phone" && (
            <motion.form
              key="phone"
              initial={{ opacity: 0, transform: "translateX(16px)" }}
              animate={{ opacity: 1, transform: "translateX(0px)" }}
              exit={{ opacity: 0, transform: "translateX(16px)" }}
              transition={spring}
              onSubmit={(e) => {
                e.preventDefault();
                requestCode();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="login-phone">Phone number</Label>
                <div className="flex gap-2">
                  <Select value={dial} onValueChange={setDial}>
                    <SelectTrigger
                      className="h-11 w-[130px] shrink-0"
                      aria-label="Country code"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.dial + ":" + c.code}>
                          <span className="flex items-center gap-2">
                            <span aria-hidden>{c.flag}</span>
                            <span className="tabular-numbers">{c.dial}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="login-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="50 123 4567"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/[^\d\s]/g, ""))
                    }
                    className="h-11 text-base"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We will text a 5-digit code to {dialCode}{" "}
                  {phone || "your number"}.
                </p>
              </div>
              <Button
                type="submit"
                className="h-11 w-full text-base"
                disabled={busy || phone.replace(/\D/g, "").length < 6}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Smartphone className="size-4" aria-hidden />
                )}
                Send code
              </Button>
            </motion.form>
          )}

          {phase === "code" && (
            <motion.div
              key="code"
              initial={{ opacity: 0, transform: "translateX(16px)" }}
              animate={{ opacity: 1, transform: "translateX(0px)" }}
              exit={{ opacity: 0, transform: "translateX(-16px)" }}
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
                  Verifying
                </p>
              )}

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    setPhase("credentials");
                    setError(null);
                  }}
                >
                  Go back
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

          {phase === "create-password" && (
            <motion.form
              key="create-password"
              initial={{ opacity: 0, transform: "translateX(16px)" }}
              animate={{ opacity: 1, transform: "translateX(0px)" }}
              exit={{ opacity: 0 }}
              transition={spring}
              onSubmit={(e) => {
                e.preventDefault();
                savePassword();
              }}
              className="space-y-4"
            >
              <div className="space-y-1 text-center">
                <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <LockKeyhole className="size-5" aria-hidden />
                </div>
                <p className="text-sm font-medium">Create your password</p>
                <p className="text-xs text-muted-foreground">
                  Email verified. Choose a password of 10 or more characters
                  for future sign-ins.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                  className="h-11 text-base"
                />
              </div>
              <Button
                type="submit"
                className="h-11 w-full text-base"
                disabled={busy || newPassword.length < 10}
              >
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Save and continue
              </Button>
            </motion.form>
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
