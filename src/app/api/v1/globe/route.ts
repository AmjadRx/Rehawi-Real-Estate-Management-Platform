import { isNull } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { apiHandler, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/auth/guard";
import { pinColor } from "@/lib/globe";

export const GET = apiHandler(async () => {
  await requireUser();
  const db = await getDb();
  const rows = await db
    .select()
    .from(tables.properties)
    .where(isNull(tables.properties.deletedAt));

  const pins = rows
    .filter((p) => p.lat !== null && p.lng !== null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city,
      country: p.country,
      lat: parseFloat(p.lat as string),
      lng: parseFloat(p.lng as string),
      status: p.status,
      type: p.type,
      color: pinColor(p.status, p.type),
      thumb: p.coverPhotoId ? `/api/v1/files/${p.coverPhotoId}` : null,
    }));

  return jsonOk({ pins });
});
