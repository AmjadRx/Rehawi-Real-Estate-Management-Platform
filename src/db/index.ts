import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

export type Database =
  | NeonHttpDatabase<typeof schema>
  | PgliteDatabase<typeof schema>;

/**
 * Production: Neon Postgres over the serverless HTTP driver (DATABASE_URL).
 * Development fallback: when DATABASE_URL is not set (e.g. a fresh checkout
 * without .env.local), an embedded PGlite database under .data/pg so the app
 * is fully runnable offline. Never used when DATABASE_URL exists.
 */
const globalForDb = globalThis as unknown as {
  __rehawiDb?: Promise<Database>;
};

async function createDb(): Promise<Database> {
  const url = process.env.DATABASE_URL;
  if (url) {
    return drizzleNeon(neon(url), { schema });
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be set in production");
  }
  const [{ PGlite }, { drizzle: drizzlePglite }, { migrate }, path, fs] =
    await Promise.all([
      import("@electric-sql/pglite"),
      import("drizzle-orm/pglite"),
      import("drizzle-orm/pglite/migrator"),
      import("node:path"),
      import("node:fs"),
    ]);
  const dataDir = path.join(process.cwd(), ".data", "pg");
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await maybeSeedDev(db);
  return db;
}

/** Seeds run ONLY in development (§10.3) and only into an empty database. */
async function maybeSeedDev(db: Database) {
  if (process.env.NODE_ENV !== "development") return;
  const existing = await db.select().from(schema.properties).limit(1);
  if (existing.length > 0) return;
  const { seed } = await import("./seed-data");
  await seed(db);
  console.log("[db] development seed applied (3-asset scenario)");
}

export function getDb(): Promise<Database> {
  if (!globalForDb.__rehawiDb) {
    globalForDb.__rehawiDb = createDb().catch((error) => {
      // Don't cache a failed startup — let the next request retry.
      globalForDb.__rehawiDb = undefined;
      throw error;
    });
  }
  return globalForDb.__rehawiDb;
}

export * as tables from "./schema";
