import { createHash, randomInt } from "node:crypto";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { getDb, tables } from "@/db";
import type { Identifier } from "./allowlist";

/** §3.2: 10-minute expiry, ≤5 verify attempts, 60s resend cooldown, ≤5 req/hour. */
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 5;

export function hashCode(code: string): string {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper) throw new Error("OTP_PEPPER must be set");
  return createHash("sha256").update(code + pepper).digest("hex");
}

export function generateCode(): string {
  // crypto-random 5-digit code, 10000–99999 (never leading-zero ambiguity)
  return String(randomInt(10000, 100000));
}

export type RequestOtpResult =
  | { ok: true; code: string }
  | { ok: false; reason: "cooldown" | "rate_limited" };

/**
 * Create and store an OTP for an allowlisted identifier. Rate limits are
 * DB-backed (§3.3): serverless instances share no memory, so the otp_codes
 * table itself is the counter.
 */
export async function createOtp(id: Identifier): Promise<RequestOtpResult> {
  const db = await getDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recent = await db
    .select({
      count: sql<number>`count(*)`,
      latest: sql<string | null>`max(${tables.otpCodes.createdAt})`,
    })
    .from(tables.otpCodes)
    .where(
      and(
        eq(tables.otpCodes.identifier, id.value),
        gt(tables.otpCodes.createdAt, oneHourAgo),
      ),
    );

  const count = Number(recent[0]?.count ?? 0);
  const latest = recent[0]?.latest ? new Date(recent[0].latest) : null;

  if (latest && Date.now() - latest.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, reason: "cooldown" };
  }
  if (count >= MAX_REQUESTS_PER_HOUR) {
    return { ok: false, reason: "rate_limited" };
  }

  const code = generateCode();
  await db.insert(tables.otpCodes).values({
    identifier: id.value,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  return { ok: true, code };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" };

export async function verifyOtp(
  id: Identifier,
  code: string,
): Promise<VerifyOtpResult> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(tables.otpCodes)
    .where(eq(tables.otpCodes.identifier, id.value))
    .orderBy(desc(tables.otpCodes.createdAt))
    .limit(1);

  if (!row) return { ok: false, reason: "invalid" };
  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (row.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  if (row.codeHash !== hashCode(code.trim())) {
    await db
      .update(tables.otpCodes)
      .set({ attempts: row.attempts + 1 })
      .where(eq(tables.otpCodes.id, row.id));
    return { ok: false, reason: "invalid" };
  }

  // success: single-use — delete every outstanding code for this identifier
  await db
    .delete(tables.otpCodes)
    .where(eq(tables.otpCodes.identifier, id.value));
  return { ok: true };
}
