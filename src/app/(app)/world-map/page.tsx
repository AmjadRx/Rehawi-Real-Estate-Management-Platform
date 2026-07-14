import type { Metadata } from "next";
import { isNull } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { pinColor, type GlobePin } from "@/lib/globe";
import { WorldMapView } from "./world-map-view";

export const metadata: Metadata = { title: "World Map" };
export const dynamic = "force-dynamic";

export default async function WorldMapPage() {
  const db = await getDb();
  const rows = await db
    .select()
    .from(tables.properties)
    .where(isNull(tables.properties.deletedAt));

  const pins: GlobePin[] = rows
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

  return <WorldMapView pins={pins} />;
}
