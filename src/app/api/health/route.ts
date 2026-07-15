import { NextResponse } from "next/server";
import { getDb, tables } from "@/db";
import pkg from "../../../../package.json";

/** GET /api/health (§7 v4): { ok, version, db } with a real database ping. */
export async function GET() {
  try {
    const db = await getDb();
    const [row] = await db.select().from(tables.settings).limit(1);
    return NextResponse.json({
      ok: true,
      version: pkg.version,
      db: "up",
      driver: process.env.DATABASE_URL ? "neon" : "pglite-dev",
      baseCurrency:
        (row?.key === "base_currency" ? (row.value as string) : null) ?? "EUR",
      time: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        version: pkg.version,
        db: "down",
        error: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
