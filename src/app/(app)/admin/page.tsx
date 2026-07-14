import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { asc, desc } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { currentUser } from "@/lib/auth/guard";
import { getBaseCurrency } from "@/lib/portfolio";
import { AdminView } from "./admin-view";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

function maskList(env: string | undefined): string[] {
  return (env ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((v) => {
      if (v.includes("@")) {
        const [user, domain] = v.split("@");
        return `${user.slice(0, 2)}…@${domain}`;
      }
      return `${v.slice(0, 5)}…${v.slice(-2)}`;
    });
}

export default async function AdminPage() {
  const user = await currentUser();
  if (!user || user.role !== "admin") redirect("/");

  const db = await getDb();
  const [rates, audit, reminders, baseCurrency] = await Promise.all([
    db
      .select()
      .from(tables.exchangeRates)
      .orderBy(asc(tables.exchangeRates.currency)),
    db
      .select()
      .from(tables.auditLog)
      .orderBy(desc(tables.auditLog.at))
      .limit(100),
    db
      .select()
      .from(tables.reminders)
      .orderBy(asc(tables.reminders.dueDate)),
    getBaseCurrency(),
  ]);

  return (
    <AdminView
      baseCurrency={baseCurrency}
      allowlist={{
        emails: maskList(process.env.ALLOWED_EMAILS),
        phones: maskList(process.env.ALLOWED_PHONES),
        adminEmails: maskList(process.env.ADMIN_EMAILS),
        adminPhones: maskList(process.env.ADMIN_PHONES),
      }}
      rates={rates.map((r) => ({
        currency: r.currency,
        rateToEur: r.rateToEur,
        source: r.source,
        updatedAt: r.updatedAt.toISOString(),
      }))}
      audit={audit.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        at: a.at.toISOString(),
      }))}
      reminders={reminders.map((r) => ({
        id: r.id,
        kind: r.kind,
        dueDate: r.dueDate,
        message: r.message,
        resolved: r.resolved,
      }))}
    />
  );
}
