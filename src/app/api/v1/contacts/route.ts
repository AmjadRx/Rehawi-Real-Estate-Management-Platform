import { asc, ilike, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { contactCreate } from "@/lib/validation";

export const GET = apiHandler(async (request: NextRequest) => {
  await requireUser();
  const db = await getDb();
  const q = request.nextUrl.searchParams.get("q");
  const rows = await db
    .select()
    .from(tables.contacts)
    .where(
      q
        ? or(
            ilike(tables.contacts.name, `%${q}%`),
            ilike(tables.contacts.companyName, `%${q}%`),
          )
        : undefined,
    )
    .orderBy(asc(tables.contacts.name));
  return jsonOk({ contacts: rows });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireAdmin();
  const data = await parseBody(request, contactCreate);
  const db = await getDb();
  const [row] = await db.insert(tables.contacts).values(data).returning();
  await writeAudit({
    userId: user.id,
    action: "create",
    entityType: "contact",
    entityId: row.id,
    diff: { created: data },
  });
  return jsonOk({ contact: row }, { status: 201 });
});
