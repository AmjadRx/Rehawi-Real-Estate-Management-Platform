import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { apiHandler, jsonError, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { getSubresource } from "@/lib/subresources";

type Ctx = { params: Promise<{ id: string; resource: string }> };

export const GET = apiHandler(async (_request: NextRequest, { params }: Ctx) => {
  await requireUser();
  const { id, resource } = await params;
  const sub = getSubresource(resource);
  if (!sub) return jsonError(404, "Unknown resource.");
  const db = await getDb();
  const rows = await db
    .select()
    .from(sub.table)
    .where(eq(sub.table.propertyId, id));
  return jsonOk({ [resource]: rows });
});

export const POST = apiHandler(async (request: NextRequest, { params }: Ctx) => {
  const user = await requireAdmin();
  const { id, resource } = await params;
  const sub = getSubresource(resource);
  if (!sub) return jsonError(404, "Unknown resource.");
  const data = await parseBody(request, sub.create);
  const db = await getDb();
  // Value shape is enforced by the per-resource zod schema in the registry.
  const [row] = await db
    .insert(sub.table)
    .values({ ...(data as Record<string, unknown>), propertyId: id } as never)
    .returning();
  await writeAudit({
    userId: user.id,
    action: "create",
    entityType: sub.entityType,
    entityId: (row as { id?: string }).id,
    diff: { created: data },
  });
  return jsonOk({ item: row }, { status: 201 });
});
