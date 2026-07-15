import { asc } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { apiHandler, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guard";

/**
 * GET /api/v1/users (admin only, §3.2 v4): account overview for the Admin
 * panel, including whether a password is set. Password hashes never leave
 * the server.
 */
export const GET = apiHandler(async () => {
  await requireAdmin();
  const db = await getDb();
  const rows = await db
    .select()
    .from(tables.users)
    .orderBy(asc(tables.users.email));
  return jsonOk({
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      name: u.name,
      role: u.role,
      passwordSet: !!u.passwordHash,
      lastLoginAt: u.lastLoginAt,
    })),
  });
});
