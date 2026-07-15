import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getDb, tables } from "@/db";
import { apiHandler, jsonError, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/auth/guard";
import {
  checkLock,
  clearFailures,
  hashPassword,
  recordFailure,
  verifyPassword,
} from "@/lib/auth/password";
import { checkPasswordRules } from "@/lib/auth/password-rules";

const bodySchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(1).max(200),
});

/**
 * POST /api/v1/me/password (§7 v4): authenticated password change. The user
 * re-enters the current password, then sets a new one under the same rules
 * as first-time setup. Wrong current passwords count toward the lockout.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(400, "Enter your current password and a new one.");
  }

  const db = await getDb();
  const [row] = await db
    .select()
    .from(tables.users)
    .where(eq(tables.users.id, user.id))
    .limit(1);
  if (!row?.email || !row.passwordHash) {
    return jsonError(
      409,
      "No password is set for this account yet. Use the sign-in screen's first-time setup.",
    );
  }

  const lock = await checkLock(row.email);
  if (lock.locked) {
    return jsonError(429, "Too many failed attempts. Try again in a few minutes.");
  }

  const currentOk = await verifyPassword(
    row.passwordHash,
    parsed.data.currentPassword,
  );
  if (!currentOk) {
    await recordFailure(row.email);
    return jsonError(401, "The current password is not correct.");
  }

  const rules = checkPasswordRules(parsed.data.newPassword, row.email);
  if (!rules.valid) {
    return jsonError(422, "The new password does not meet the rules yet.");
  }

  await db
    .update(tables.users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword) })
    .where(eq(tables.users.id, user.id));
  await clearFailures(row.email);

  return jsonOk({ changed: true });
});
