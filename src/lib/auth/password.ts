import { hash, verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { getDb, tables } from "@/db";

/** §3.2 v2: argon2id password hashing with DB-backed lockout. */

const LOCK_AFTER_FAILURES = 5;
const LOCK_MINUTES = 15;

// argon2id, OWASP-recommended parameters
const ARGON2_OPTIONS = {
  memoryCost: 19 * 1024, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export const MIN_PASSWORD_LENGTH = 10;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export type LockState =
  | { locked: false }
  | { locked: true; retryAfterSeconds: number };

export async function checkLock(identifier: string): Promise<LockState> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(tables.loginAttempts)
    .where(eq(tables.loginAttempts.identifier, identifier))
    .limit(1);
  if (!row?.lockedUntil) return { locked: false };
  const remaining = row.lockedUntil.getTime() - Date.now();
  if (remaining <= 0) return { locked: false };
  return { locked: true, retryAfterSeconds: Math.ceil(remaining / 1000) };
}

/** Record a failed login; lock for 15 minutes after the 5th failure. */
export async function recordFailure(identifier: string): Promise<void> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(tables.loginAttempts)
    .where(eq(tables.loginAttempts.identifier, identifier))
    .limit(1);

  const failedCount = (row && row.lockedUntil && row.lockedUntil.getTime() < Date.now()
    ? 0
    : (row?.failedCount ?? 0)) + 1;
  const lockedUntil =
    failedCount >= LOCK_AFTER_FAILURES
      ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
      : null;

  await db
    .insert(tables.loginAttempts)
    .values({ identifier, failedCount, lockedUntil, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: tables.loginAttempts.identifier,
      set: { failedCount, lockedUntil, updatedAt: new Date() },
    });
}

export async function clearFailures(identifier: string): Promise<void> {
  const db = await getDb();
  await db
    .delete(tables.loginAttempts)
    .where(eq(tables.loginAttempts.identifier, identifier));
}
