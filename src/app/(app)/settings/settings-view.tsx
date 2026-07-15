"use client";

import { Camera, Languages, Loader2, LockKeyhole, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FadeIn } from "@/components/motion-primitives";
import { PasswordStrength } from "@/components/password-strength";
import { checkPasswordRules } from "@/lib/auth/password-rules";
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

export function SettingsView({
  identifier,
  role,
  profile,
  isEmailUser,
  authMode,
  passwordSet,
}: {
  identifier: string;
  role: string;
  profile: {
    name: string;
    email: string;
    phone: string;
    avatarDocumentId: string | null;
  };
  isEmailUser: boolean;
  authMode: "db_password" | "otp";
  passwordSet: boolean;
}) {
  const t = useTranslations("settings");
  // The active locale may be a regional tag (ar-EG); the toggle stores "ar".
  const language = useLocale().startsWith("ar") ? "ar" : "en";
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(profile);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const rules = checkPasswordRules(newPassword, identifier);
  const changeReady =
    currentPassword.length > 0 && rules.valid && newPassword === repeatPassword;

  async function saveProfile() {
    setBusyKey("profile");
    try {
      const res = await fetch("/api/v1/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || null,
          email: form.email || null,
          phone: form.phone || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message ?? "Could not save.");
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  }

  async function uploadAvatar(file: File) {
    setBusyKey("avatar");
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("category", "photo");
      const res = await fetch("/api/v1/uploads", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Upload failed.");
        return;
      }
      const patch = await fetch("/api/v1/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarDocumentId: data.document.id }),
      });
      if (patch.ok) {
        setForm((f) => ({ ...f, avatarDocumentId: data.document.id }));
        toast.success(t("saved"));
        router.refresh();
      }
    } finally {
      setBusyKey(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function setLanguage(next: string) {
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }

  async function savePassword() {
    setBusyKey("password");
    try {
      // §3.2 v4: changing a password re-checks the current one server-side.
      const res =
        authMode === "db_password"
          ? await fetch("/api/v1/me/password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ currentPassword, newPassword }),
            })
          : await fetch("/api/auth/set-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: newPassword }),
            });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Could not save the password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      toast.success(t("passwordSaved"));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <FadeIn>
        <h1 className="text-2xl md:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </FadeIn>

      <FadeIn delay={0.05} className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <UserRound className="size-4" aria-hidden />
          {t("profile")}
        </h2>

        <div className="mb-4 flex items-center gap-4">
          <div className="relative size-16 overflow-hidden rounded-full border bg-muted">
            {form.avatarDocumentId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/v1/files/${form.avatarDocumentId}`}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <UserRound
                className="absolute inset-0 m-auto size-7 text-muted-foreground"
                aria-hidden
              />
            )}
          </div>
          <div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={busyKey === "avatar"}
              onClick={() => fileRef.current?.click()}
            >
              {busyKey === "avatar" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Camera className="size-4" aria-hidden />
              )}
              {t("changePhoto")}
            </Button>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t("signedInAs", { identifier, role })}
            </p>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="st-name">{t("name")}</Label>
            <Input
              id="st-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-email">{t("email")}</Label>
            <Input
              id="st-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-phone">{t("phone")}</Label>
            <Input
              id="st-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
        </div>
        <Button
          className="mt-4 gap-2"
          onClick={saveProfile}
          disabled={busyKey === "profile"}
        >
          {busyKey === "profile" && (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          )}
          {t("save")}
        </Button>
      </FadeIn>

      <FadeIn delay={0.1} className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
          <Languages className="size-4" aria-hidden />
          {t("language")}
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">{t("languageHint")}</p>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-56" aria-label={t("language")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{t("english")}</SelectItem>
            <SelectItem value="ar">{t("arabic")}</SelectItem>
          </SelectContent>
        </Select>
      </FadeIn>

      {isEmailUser && (
        <FadeIn delay={0.15} className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
            <LockKeyhole className="size-4" aria-hidden />
            {t("password")}
          </h2>
          {authMode === "db_password" && !passwordSet ? (
            <p className="text-sm text-muted-foreground">
              No password is set yet. Sign out and use the first-time setup on
              the sign-in screen with the family setup code.
            </p>
          ) : authMode === "db_password" ? (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {t("passwordHint")}
              </p>
              <div className="max-w-sm space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="st-current-password">
                    {t("currentPassword")}
                  </Label>
                  <Input
                    id="st-current-password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="st-password">{t("newPassword")}</Label>
                  <Input
                    id="st-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="st-repeat-password">
                    {t("repeatPassword")}
                  </Label>
                  <Input
                    id="st-repeat-password"
                    type="password"
                    autoComplete="new-password"
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                  />
                  {repeatPassword.length > 0 &&
                    repeatPassword !== newPassword && (
                      <p className="text-xs font-medium text-destructive">
                        The passwords do not match yet.
                      </p>
                    )}
                </div>
                {newPassword.length > 0 && (
                  <PasswordStrength password={newPassword} email={identifier} />
                )}
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={busyKey === "password" || !changeReady}
                  onClick={savePassword}
                >
                  {busyKey === "password" ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {t("savePassword")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {t("passwordHint")}
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-56 space-y-1.5">
                  <Label htmlFor="st-password">{t("newPassword")}</Label>
                  <Input
                    id="st-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={busyKey === "password" || newPassword.length < 10}
                  onClick={savePassword}
                >
                  {busyKey === "password" ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {t("savePassword")}
                </Button>
              </div>
            </>
          )}
        </FadeIn>
      )}

    </div>
  );
}
