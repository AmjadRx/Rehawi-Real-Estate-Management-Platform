/**
 * Allowlist access control (§3.1). Only identities listed in env vars can
 * ever receive a PIN. Admins are the subset in ADMIN_EMAILS / ADMIN_PHONES.
 * Runs in both node and edge runtimes — env only, no I/O.
 */

import { envUserEmails } from "./mode";

export type Role = "admin" | "viewer";

export type Identifier =
  | { kind: "email"; value: string }
  | { kind: "phone"; value: string };

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Normalize to E.164: strip spaces/dashes/parentheses, "00" prefix → "+". */
export function normalizePhone(raw: string): string {
  let v = raw.trim().replace(/[\s\-().]/g, "");
  if (v.startsWith("00")) v = `+${v.slice(2)}`;
  return v;
}

export function parseIdentifier(raw: string): Identifier | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("@")) {
    const email = normalizeEmail(trimmed);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return { kind: "email", value: email };
  }
  const phone = normalizePhone(trimmed);
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) return null;
  return { kind: "phone", value: phone };
}

function parseList(env: string | undefined, kind: Identifier["kind"]): string[] {
  return (env ?? "")
    .split(",")
    .map((s) => (kind === "email" ? normalizeEmail(s) : normalizePhone(s)))
    .filter(Boolean);
}

export function isAllowlisted(id: Identifier): boolean {
  const list =
    id.kind === "email"
      ? parseList(process.env.ALLOWED_EMAILS, "email")
      : parseList(process.env.ALLOWED_PHONES, "phone");
  const admins =
    id.kind === "email"
      ? parseList(process.env.ADMIN_EMAILS, "email")
      : parseList(process.env.ADMIN_PHONES, "phone");
  if (list.includes(id.value) || admins.includes(id.value)) return true;
  // AUTH_MODE=env_password (§3.2.4 v3): emails in AUTH_USERS are implicitly
  // allowlisted, so the middleware's per-request revalidation accepts their
  // sessions without duplicating them in ALLOWED_EMAILS.
  return id.kind === "email" && envUserEmails().includes(id.value);
}

export function roleFor(id: Identifier): Role {
  const admins =
    id.kind === "email"
      ? parseList(process.env.ADMIN_EMAILS, "email")
      : parseList(process.env.ADMIN_PHONES, "phone");
  return admins.includes(id.value) ? "admin" : "viewer";
}
