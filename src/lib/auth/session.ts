import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./allowlist";

export const SESSION_COOKIE = "rehawi_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
/** Sliding renewal: re-issue when the token is older than this. */
export const SESSION_RENEW_AFTER_SECONDS = 24 * 60 * 60;

export interface SessionPayload {
  /** The allowlisted identifier (email or E.164 phone). */
  sub: string;
  kind: "email" | "phone";
  role: Role;
  uid: string;
  name?: string;
}

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set (32+ random bytes)");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(
  token: string,
): Promise<(SessionPayload & { iat: number }) | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return payload as unknown as SessionPayload & { iat: number };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
