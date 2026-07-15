/**
 * AUTH_MODE (§3.2.4 v4). `db_password` is the active default: allowlisted
 * users create their own password once with the family SETUP_CODE, the
 * argon2id hash lives in Neon, and the same email + password works on the
 * website and the app. `otp` enables the code-delivery flows (Resend email,
 * Twilio SMS) once keys exist. The former env_password / AUTH_USERS mode is
 * deprecated and removed.
 *
 * Edge-safe: env + string parsing only, no node APIs (imported by
 * middleware via allowlist.ts consumers).
 */

export type AuthMode = "db_password" | "otp";

export function authMode(): AuthMode {
  return process.env.AUTH_MODE === "otp" ? "otp" : "db_password";
}

export function setupCodeConfigured(): boolean {
  return !!process.env.SETUP_CODE;
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

/** What the login screen may offer, given mode + configured providers. */
export function authCapabilities() {
  const mode = authMode();
  if (mode === "db_password") {
    return {
      mode,
      emailPassword: true,
      /** First-time password creation with the family SETUP_CODE. */
      firstTimeSetup: setupCodeConfigured(),
      emailOtp: false,
      phoneOtp: false,
    } as const;
  }
  return {
    mode,
    emailPassword: true,
    firstTimeSetup: false,
    emailOtp: emailOtpConfigured() || devDelivery(),
    phoneOtp: smsConfigured() || devDelivery(),
  } as const;
}
