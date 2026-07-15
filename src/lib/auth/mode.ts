/**
 * AUTH_MODE (§3.2.4 v3). `env_password` is the active default and needs ZERO
 * external services: credentials live in AUTH_USERS env vars. `otp` enables
 * the code-delivery flows (Resend email, Twilio SMS) once keys exist.
 *
 * Edge-safe: env + string parsing only, no node APIs (imported by middleware
 * via allowlist.ts).
 */

export type AuthMode = "env_password" | "otp";

export function authMode(): AuthMode {
  return process.env.AUTH_MODE === "otp" ? "otp" : "env_password";
}

export function smsConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );
}

export function emailOtpConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/** Dev servers may deliver codes to the console (§ delivery.ts). */
function devDelivery(): boolean {
  return process.env.NODE_ENV !== "production";
}

/**
 * Parse AUTH_USERS="email1:password1,email2:password2".
 * Split on the FIRST colon so passwords may contain colons; commas are the
 * only reserved character.
 */
export function envUsers(): Map<string, string> {
  const users = new Map<string, string>();
  for (const entry of (process.env.AUTH_USERS ?? "").split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0 || colon === trimmed.length - 1) continue;
    // Same normalization as allowlist.normalizeEmail (kept local to avoid a
    // circular import: allowlist.ts consumes envUserEmails()).
    users.set(
      trimmed.slice(0, colon).trim().toLowerCase(),
      trimmed.slice(colon + 1),
    );
  }
  return users;
}

export function envUserEmails(): string[] {
  return [...envUsers().keys()];
}

/** What the login screen may offer, given mode + configured providers. */
export function authCapabilities() {
  const mode = authMode();
  if (mode === "env_password") {
    return {
      mode,
      emailPassword: true,
      emailOtp: false,
      phoneOtp: false,
    } as const;
  }
  return {
    mode,
    emailPassword: true,
    emailOtp: emailOtpConfigured() || devDelivery(),
    phoneOtp: smsConfigured() || devDelivery(),
  } as const;
}
