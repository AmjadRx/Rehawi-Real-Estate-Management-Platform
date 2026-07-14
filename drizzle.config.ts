import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/rehawi_dev",
  },
  // Data safety (§10): migrations are additive-only. Never generate or run
  // destructive statements against production without an explicit backup.
  strict: true,
  verbose: true,
});
