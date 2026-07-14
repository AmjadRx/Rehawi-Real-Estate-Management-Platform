import { and, eq, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonError, jsonOk } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { deleteStoredFile, readFileStream } from "@/lib/files";

type Ctx = { params: Promise<{ documentId: string }> };

/**
 * GET /api/v1/files/:documentId — the ONLY way files are served (§3.3).
 * Session verified by middleware + re-checked here; streams the private
 * file so the storage URL never reaches the client.
 */
export const GET = apiHandler(async (_request: NextRequest, { params }: Ctx) => {
  await requireUser();
  const { documentId } = await params;
  const db = await getDb();
  const [doc] = await db
    .select()
    .from(tables.documents)
    .where(
      and(
        eq(tables.documents.id, documentId),
        isNull(tables.documents.deletedAt),
      ),
    )
    .limit(1);
  if (!doc) return jsonError(404, "File not found.");

  const stream = await readFileStream(doc.blobUrl);
  if (!stream) return jsonError(404, "File data missing.");

  return new Response(stream.body as BodyInit, {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `inline; filename="${doc.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
});

/** Soft delete (§8/§10.5): nothing is hard-lost by one click. */
export const DELETE = apiHandler(
  async (request: NextRequest, { params }: Ctx) => {
    const user = await requireAdmin();
    const { documentId } = await params;
    const db = await getDb();
    const purge = request.nextUrl.searchParams.get("purge") === "true";

    if (purge) {
      const [doc] = await db
        .select()
        .from(tables.documents)
        .where(eq(tables.documents.id, documentId))
        .limit(1);
      if (!doc) return jsonError(404, "File not found.");
      await deleteStoredFile(doc.blobUrl);
      await db
        .delete(tables.documents)
        .where(eq(tables.documents.id, documentId));
      await writeAudit({
        userId: user.id,
        action: "delete",
        entityType: "document",
        entityId: documentId,
        diff: { purged: true, filename: doc.filename },
      });
      return jsonOk();
    }

    const [doc] = await db
      .update(tables.documents)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(tables.documents.id, documentId),
          isNull(tables.documents.deletedAt),
        ),
      )
      .returning();
    if (!doc) return jsonError(404, "File not found.");
    await writeAudit({
      userId: user.id,
      action: "delete",
      entityType: "document",
      entityId: documentId,
      diff: { softDeleted: true, filename: doc.filename },
    });
    return jsonOk();
  },
);
