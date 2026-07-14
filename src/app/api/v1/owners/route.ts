import { asc } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { ownerCreate } from "@/lib/validation";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const db = await getDb();
  const rows = await db
    .select()
    .from(tables.owners)
    .orderBy(asc(tables.owners.name));
  // Bank details are admin-only (§4 v2): stripped, never sent to viewers.
  const owners =
    user.role === "admin"
      ? rows
      : rows.map(({ bankDetails: _bankDetails, ...rest }) => rest);
  return jsonOk({ owners });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireAdmin();
  const data = await parseBody(request, ownerCreate);
  const db = await getDb();
  const [row] = await db.insert(tables.owners).values(data).returning();
  await writeAudit({
    userId: user.id,
    action: "create",
    entityType: "owner",
    entityId: row.id,
    diff: { created: data },
  });
  return jsonOk({ owner: row }, { status: 201 });
});
