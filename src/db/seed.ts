/**
 * Standalone dev seeder: `npm run db:seed`.
 * Refuses to run outside development (§10.3 — production is never overwritten).
 */
async function main() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    console.error("Seeds are development-only. Refusing to run.");
    process.exit(1);
  }
  process.env.NODE_ENV = process.env.NODE_ENV || "development";
  const { getDb } = await import("./index");
  const { seed } = await import("./seed-data");
  const db = await getDb();
  const { properties } = await import("./schema");
  const existing = await db.select().from(properties).limit(1);
  if (existing.length > 0) {
    console.log("Database already contains data — skipping seed.");
    return;
  }
  await seed(db);
  console.log("Seed complete (3-asset scenario).");
}

main().then(() => process.exit(0));
