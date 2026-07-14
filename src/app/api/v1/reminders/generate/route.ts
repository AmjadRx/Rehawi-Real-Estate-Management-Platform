import { addDays } from "date-fns";
import { and, eq, gte, isNull, lte, ne } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, tables } from "@/db";
import { apiHandler, jsonError, jsonOk } from "@/lib/api";
import { currentUser } from "@/lib/auth/guard";

/**
 * Reminder generation (§13.9) — Vercel Cron daily (CRON_SECRET) or the
 * admin "generate now" button. Creates reminder rows for installments due
 * within 30 days and leases expiring within 60; skips anything that
 * already has an unresolved reminder of the same kind for the property.
 */
async function handle(request: NextRequest, cronOnly: boolean) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const isCron = !!cronSecret && auth === `Bearer ${cronSecret}`;
  if (!isCron) {
    if (cronOnly) return jsonError(401, "Cron secret required.");
    const user = await currentUser();
    if (!user || user.role !== "admin") {
      return jsonError(403, "Admin access required.");
    }
  }

  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const in30 = addDays(new Date(), 30).toISOString().slice(0, 10);
  const in60 = addDays(new Date(), 60).toISOString().slice(0, 10);

  const existing = await db
    .select()
    .from(tables.reminders)
    .where(eq(tables.reminders.resolved, false));
  const has = (propertyId: string | null, kind: string, dueDate: string) =>
    existing.some(
      (r) =>
        r.propertyId === propertyId && r.kind === kind && r.dueDate === dueDate,
    );

  let created = 0;

  const dueInstallments = await db
    .select({
      inst: tables.installments,
      propertyName: tables.properties.name,
    })
    .from(tables.installments)
    .innerJoin(
      tables.properties,
      eq(tables.installments.propertyId, tables.properties.id),
    )
    .where(
      and(
        ne(tables.installments.status, "paid"),
        gte(tables.installments.dueDate, today),
        lte(tables.installments.dueDate, in30),
        isNull(tables.properties.deletedAt),
      ),
    );
  for (const { inst, propertyName } of dueInstallments) {
    if (has(inst.propertyId, "installment_due", inst.dueDate)) continue;
    await db.insert(tables.reminders).values({
      propertyId: inst.propertyId,
      kind: "installment_due",
      dueDate: inst.dueDate,
      message: `Installment "${inst.label}" (${inst.currency} ${inst.amount}) due at ${propertyName}.`,
    });
    created++;
  }

  const expiringLeases = await db
    .select({ lease: tables.leases, propertyName: tables.properties.name })
    .from(tables.leases)
    .innerJoin(
      tables.properties,
      eq(tables.leases.propertyId, tables.properties.id),
    )
    .where(
      and(
        eq(tables.leases.status, "active"),
        isNull(tables.properties.deletedAt),
      ),
    );
  for (const { lease, propertyName } of expiringLeases) {
    if (!lease.endDate || lease.endDate < today || lease.endDate > in60) {
      continue;
    }
    if (has(lease.propertyId, "lease_expiry", lease.endDate)) continue;
    await db.insert(tables.reminders).values({
      propertyId: lease.propertyId,
      kind: "lease_expiry",
      dueDate: lease.endDate,
      message: `Lease with ${lease.tenantName} at ${propertyName} ends on ${lease.endDate}.`,
    });
    created++;
  }

  return jsonOk({ created });
}

/** Admin button (session) or cron (bearer secret). */
export const POST = apiHandler(async (request: NextRequest) =>
  handle(request, false),
);

/** Vercel Cron invokes with GET + Authorization: Bearer CRON_SECRET. */
export const GET = apiHandler(async (request: NextRequest) =>
  handle(request, true),
);
