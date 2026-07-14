import { eq } from "drizzle-orm";
import { getDb, tables } from "@/db";

/**
 * FX refresh (§2): open.er-api.com free feed (160+ currencies incl. AED).
 * Manual overrides (source = "manual", e.g. SYP) are never overwritten.
 */
export async function refreshRates(): Promise<{
  updated: number;
  skippedManual: number;
}> {
  const response = await fetch("https://open.er-api.com/v6/latest/EUR", {
    // Vercel Cron runs daily; don't let Next cache the upstream response.
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`FX feed returned ${response.status}`);
  }
  const data = (await response.json()) as {
    result: string;
    rates?: Record<string, number>;
  };
  if (data.result !== "success" || !data.rates) {
    throw new Error("FX feed returned an unexpected payload");
  }

  const db = await getDb();
  const existing = await db.select().from(tables.exchangeRates);
  const manual = new Set(
    existing.filter((r) => r.source === "manual").map((r) => r.currency),
  );

  // Track every currency already in the table plus the majors we roll up.
  const tracked = new Set<string>([
    ...existing.map((r) => r.currency),
    "EUR",
    "USD",
    "AED",
  ]);

  let updated = 0;
  let skippedManual = 0;
  for (const currency of tracked) {
    if (manual.has(currency)) {
      skippedManual++;
      continue;
    }
    // feed is EUR-based: rates[c] = units of c per 1 EUR → rate_to_eur = 1/rates[c]
    const perEur = data.rates[currency];
    if (!perEur || perEur <= 0) continue;
    const rateToEur = currency === "EUR" ? 1 : 1 / perEur;
    await db
      .insert(tables.exchangeRates)
      .values({
        currency,
        rateToEur: String(rateToEur),
        source: "api",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: tables.exchangeRates.currency,
        set: {
          rateToEur: String(rateToEur),
          source: "api",
          updatedAt: new Date(),
        },
      });
    updated++;
  }
  return { updated, skippedManual };
}

export async function upsertManualRate(currency: string, rateToEur: number) {
  const db = await getDb();
  await db
    .insert(tables.exchangeRates)
    .values({
      currency,
      rateToEur: String(rateToEur),
      source: "manual",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: tables.exchangeRates.currency,
      set: {
        rateToEur: String(rateToEur),
        source: "manual",
        updatedAt: new Date(),
      },
    });
  const [row] = await db
    .select()
    .from(tables.exchangeRates)
    .where(eq(tables.exchangeRates.currency, currency))
    .limit(1);
  return row;
}
