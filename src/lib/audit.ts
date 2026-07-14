import { getDb, tables } from "@/db";
import { ensureUserRow } from "@/lib/users";

/**
 * §3.3: every create/update/delete is recorded with user, entity,
 * timestamp and a JSON diff. Never throws — an audit failure must not
 * roll back the user's mutation, but it is loudly logged.
 */
export async function writeAudit(params: {
  userId: string;
  action: "create" | "update" | "delete";
  entityType: string;
  entityId?: string | null;
  diff?: unknown;
}): Promise<void> {
  try {
    await ensureUserRow(params.userId);
    const db = await getDb();
    await db.insert(tables.auditLog).values({
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      diff: params.diff ?? null,
    });
  } catch (error) {
    console.error("[audit] failed to record entry", params, error);
  }
}
