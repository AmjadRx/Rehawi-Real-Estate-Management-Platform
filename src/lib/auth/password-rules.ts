/**
 * Password rules (§3.2 v4), shared by the setup/change UIs (live checklist +
 * strength bar) and the server (authoritative validation). Pure functions,
 * safe in both client and server bundles.
 */

export const MIN_PASSWORD_LENGTH = 10;

export interface PasswordRule {
  key: string;
  label: string;
  ok: boolean;
  /** Required rules block saving; recommended ones only inform. */
  required: boolean;
}

export interface PasswordCheck {
  rules: PasswordRule[];
  valid: boolean;
  /** 0 to 100 for the live strength bar. */
  score: number;
}

/** The local part of an email ("amjad" from amjad@rehawi.com). */
function emailNamePart(email: string): string {
  return email.split("@")[0]?.trim().toLowerCase() ?? "";
}

export function checkPasswordRules(
  password: string,
  email: string,
): PasswordCheck {
  const lower = password.toLowerCase();
  const name = emailNamePart(email);

  const rules: PasswordRule[] = [
    {
      key: "length",
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      ok: password.length >= MIN_PASSWORD_LENGTH,
      required: true,
    },
    {
      key: "mix",
      label: "Letters and numbers",
      ok: /[a-z]/i.test(password) && /\d/.test(password),
      required: true,
    },
    {
      key: "symbol",
      label: "A symbol (recommended)",
      ok: /[^a-z0-9]/i.test(password),
      required: false,
    },
    {
      key: "name",
      label: "Does not contain your email name",
      ok: name.length < 3 || !lower.includes(name),
      required: true,
    },
    {
      key: "repeat",
      label: "No character repeated 4+ times in a row",
      ok: !/(.)\1{3,}/.test(password),
      required: true,
    },
  ];

  const valid = rules.every((r) => r.ok || !r.required);

  // Strength: length up to 60 points, character variety up to 40.
  const lengthScore = Math.min(password.length / 16, 1) * 60;
  const variety =
    (/[a-z]/.test(password) ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/\d/.test(password) ? 1 : 0) +
    (/[^a-zA-Z0-9]/.test(password) ? 1 : 0);
  const varietyScore = (variety / 4) * 40;
  const penalty = rules.some((r) => r.required && !r.ok) ? 0.5 : 1;
  const score = Math.round((lengthScore + varietyScore) * penalty);

  return { rules, valid, score };
}
