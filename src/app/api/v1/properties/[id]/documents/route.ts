import { and, eq, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { linkDocumentCreate } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/v1/properties/:id/documents — non-deleted documents (§7). */
export const GET = apiHandler(async (_request: NextRequest, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  const db = await getDb();
  const rows = await db
    .select()
    .from(tables.documents)
    .where(
      and(
        eq(tables.documents.propertyId, id),
        isNull(tables.documents.deletedAt),
      ),
    );
  return jsonOk({ documents: rows });
});

/**
 * POST /api/v1/properties/:id/documents (§4 v4): create a LINK document, a
 * pasted URL with a display name rendered as a hyperlink. File uploads go
 * through /api/v1/uploads instead.
 */
export const POST = apiHandler(async (request: NextRequest, { params }: Ctx) => {
  const user = await requireAdmin();
  const { id } = await params;
  const data = await parseBody(request, linkDocumentCreate);
  const db = await getDb();
  const [row] = await db
    .insert(tables.documents)
    .values({
      propertyId: id,
      category: data.category,
      kind: "link",
      externalUrl: data.externalUrl,
      filename: data.filename,
      uploadedBy: user.id,
    })
    .returning();
  await writeAudit({
    userId: user.id,
    action: "create",
    entityType: "document",
    entityId: row.id,
    diff: { link: data.externalUrl, filename: data.filename },
  });
  return jsonOk({ document: row }, { status: 201 });
});
