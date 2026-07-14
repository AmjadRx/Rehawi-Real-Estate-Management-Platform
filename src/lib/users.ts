import { eq } from "drizzle-orm";
import { getDb, tables } from "@/db";

/**
 * Guarantee a users row exists for a session's uid. Sessions can outlive
 * user rows (database restore, dev reseed); FK'd writes (documents,
 * audit_log) must not fail because of that. The placeholder row is
 * re-filled with identifier/role on the user's next OTP login.
 */
export async function ensureUserRow(userId: string): Promise<void> {
  const db = await getDb();
  const [existing] = await db
    .select({ id: tables.users.id })
    .from(tables.users)
    .where(eq(tables.users.id, userId))
    .limit(1);
  if (existing) return;
  await db
    .insert(tables.users)
    .values({ id: userId })
    .onConflictDoNothing();
}
