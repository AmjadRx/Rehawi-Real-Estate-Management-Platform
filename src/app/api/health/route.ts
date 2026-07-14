import { NextResponse } from "next/server";
import { getDb, tables } from "@/db";

export async function GET() {
  try {
    const db = await getDb();
    const [row] = await db.select().from(tables.settings).limit(1);
    return NextResponse.json({
      ok: true,
      driver: process.env.DATABASE_URL ? "neon" : "pglite-dev",
      baseCurrency:
        (row?.key === "base_currency" ? (row.value as string) : null) ?? "EUR",
      time: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
