"use client";

import { Check, X } from "lucide-react";
import { checkPasswordRules } from "@/lib/auth/password-rules";
import { cn } from "@/lib/utils";

/**
 * Live strength bar + rules checklist (§3.2 v4), shared by first-time
 * setup on the login screen and the password change form in Settings.
 */
export function PasswordStrength({
  password,
  email,
}: {
  password: string;
  email: string;
}) {
  const { rules, score } = checkPasswordRules(password, email);
  const tone =
    score >= 75 ? "bg-emerald-500" : score >= 45 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-2">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label="Password strength"
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", tone)}
          style={{ width: `${Math.max(score, password ? 6 : 0)}%` }}
        />
      </div>
      <ul className="space-y-1">
        {rules.map((rule) => (
          <li
            key={rule.key}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              rule.ok
                ? "text-emerald-600 dark:text-emerald-400"
                : rule.required
                  ? "text-muted-foreground"
                  : "text-muted-foreground/70",
            )}
          >
            {rule.ok ? (
              <Check className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <X className="size-3.5 shrink-0" aria-hidden />
            )}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
