import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonError, jsonOk } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, storeFile } from "@/lib/files";

const CATEGORIES = new Set([
  "contract",
  "title_deed",
  "receipt",
  "insurance",
  "warranty",
  "inspection",
  "floor_plan",
  "permit",
  "photo",
  "id_document",
  "other",
]);

/** POST /api/v1/uploads — multipart form: file, category, propertyId? (§7/§8) */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();
  const form = await request.formData().catch(() => null);
  if (!form) return jsonError(400, "Expected multipart form data.");

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(400, "A file is required.");
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError(413, "Files are limited to 25 MB.");
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return jsonError(415, "Allowed: images (jpg/png/webp/heic), PDF, DOCX, XLSX.");
  }

  const categoryRaw = String(form.get("category") ?? "other");
  const category = CATEGORIES.has(categoryRaw) ? categoryRaw : "other";
  const propertyId = form.get("propertyId")
    ? String(form.get("propertyId"))
    : null;
  const contactId = form.get("contactId") ? String(form.get("contactId")) : null;
  const ownerId = form.get("ownerId") ? String(form.get("ownerId")) : null;
  const isCover = form.get("isCover") === "true";

  // §3.3 v4: viewers are strictly read-only. Their only allowed upload is
  // an unlinked image for their own profile photo.
  if (user.role !== "admin") {
    if (propertyId || contactId || ownerId || !mime.startsWith("image/")) {
      return jsonError(403, "This action requires an admin.");
    }
  }

  const stored = await storeFile(file.name, mime, await file.arrayBuffer());

  const { ensureUserRow } = await import("@/lib/users");
  await ensureUserRow(user.id);
  const db = await getDb();
  const [document] = await db
    .insert(tables.documents)
    .values({
      propertyId,
      contactId,
      ownerId,
      category: category as never,
      blobUrl: stored.url,
      filename: file.name,
      mime,
      sizeBytes: file.size,
      isCover,
      uploadedBy: user.id,
    })
    .returning();

  if (isCover && propertyId) {
    const { eq } = await import("drizzle-orm");
    await db
      .update(tables.properties)
      .set({ coverPhotoId: document.id })
      .where(eq(tables.properties.id, propertyId));
  }

  await writeAudit({
    userId: user.id,
    action: "create",
    entityType: "document",
    entityId: document.id,
    diff: { filename: file.name, category, propertyId },
  });

  return jsonOk({ document }, { status: 201 });
});
