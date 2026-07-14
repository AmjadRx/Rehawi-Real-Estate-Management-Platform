import { and, desc, eq, ilike, isNull, type SQL } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { ensureUserRow } from "@/lib/users";
import { propertyCreate } from "@/lib/validation";

export const GET = apiHandler(async (request: NextRequest) => {
  await requireUser();
  const db = await getDb();
  const params = request.nextUrl.searchParams;

  const filters: SQL[] = [isNull(tables.properties.deletedAt)];
  const type = params.get("type");
  const status = params.get("status");
  const country = params.get("country");
  const occ = params.get("occupancy");
  const q = params.get("q");
  if (type) filters.push(eq(tables.properties.type, type as never));
  if (status) filters.push(eq(tables.properties.status, status as never));
  if (country) filters.push(eq(tables.properties.country, country));
  if (occ) filters.push(eq(tables.properties.occupancy, occ as never));
  if (q) filters.push(ilike(tables.properties.name, `%${q}%`));

  const rows = await db
    .select()
    .from(tables.properties)
    .where(and(...filters))
    .orderBy(desc(tables.properties.createdAt));

  return jsonOk({ properties: rows });
});

export const POST = apiHandler(async (request: NextRequest) => {
  // §7 v2: property creation is open to all signed-in users.
  const user = await requireUser();
  const data = await parseBody(request, propertyCreate);
  await ensureUserRow(user.id);
  const db = await getDb();
  const [row] = await db
    .insert(tables.properties)
    .values({
      ...data,
      createdBy: user.id,
      lat: data.lat != null ? String(data.lat) : null,
      lng: data.lng != null ? String(data.lng) : null,
      sizeSqm: data.sizeSqm != null ? String(data.sizeSqm) : null,
    })
    .returning();
  await writeAudit({
    userId: user.id,
    action: "create",
    entityType: "property",
    entityId: row.id,
    diff: { created: data },
  });
  return jsonOk({ property: row }, { status: 201 });
});
