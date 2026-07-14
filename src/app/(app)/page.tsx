import { addDays, differenceInCalendarDays } from "date-fns";
import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { monthlyFlows, portfolioSummary } from "@/lib/portfolio";
import { DashboardView, type Alert } from "./dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summary, flows, db] = await Promise.all([
    portfolioSummary("family"),
    monthlyFlows("family", 12),
    getDb(),
  ]);

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const in60 = addDays(today, 60).toISOString().slice(0, 10);

  const [reminders, installments, leases, maintenance, audit] =
    await Promise.all([
      db
        .select()
        .from(tables.reminders)
        .where(eq(tables.reminders.resolved, false))
        .orderBy(asc(tables.reminders.dueDate)),
      db.select().from(tables.installments),
      db.select().from(tables.leases),
      db.select().from(tables.maintenance),
      db
        .select()
        .from(tables.auditLog)
        .orderBy(desc(tables.auditLog.at))
        .limit(8),
    ]);

  const nameById = new Map(
    summary.properties.map((s) => [s.property.id, s.property.name]),
  );

  const alerts: Alert[] = [];
  for (const inst of installments) {
    const overdue =
      inst.status === "overdue" ||
      (inst.status !== "paid" && inst.dueDate < todayIso);
    if (overdue && nameById.has(inst.propertyId)) {
      alerts.push({
        severity: "critical",
        message: `Installment "${inst.label}" overdue at ${nameById.get(inst.propertyId)}`,
        href: `/properties/${inst.propertyId}`,
        date: inst.dueDate,
      });
    }
  }
  for (const lease of leases) {
    if (
      lease.status === "active" &&
      lease.endDate &&
      lease.endDate >= todayIso &&
      lease.endDate <= in60 &&
      nameById.has(lease.propertyId)
    ) {
      alerts.push({
        severity: "warning",
        message: `Lease at ${nameById.get(lease.propertyId)} expires in ${differenceInCalendarDays(new Date(lease.endDate), today)} days`,
        href: `/properties/${lease.propertyId}`,
        date: lease.endDate,
      });
    }
  }
  for (const m of maintenance) {
    if (m.status !== "done" && m.priority === "urgent" && nameById.has(m.propertyId)) {
      alerts.push({
        severity: "critical",
        message: `Urgent maintenance open: ${m.title} (${nameById.get(m.propertyId)})`,
        href: `/properties/${m.propertyId}`,
        date: m.openedOn,
      });
    }
  }
  for (const r of reminders) {
    alerts.push({
      severity: r.dueDate < todayIso ? "critical" : "info",
      message: r.message,
      href: r.propertyId ? `/properties/${r.propertyId}` : undefined,
      date: r.dueDate,
    });
  }
  alerts.sort((a, b) => a.date.localeCompare(b.date));

  const statusCounts = { planned: 0, under_construction: 0, completed: 0 };
  for (const s of summary.properties) {
    statusCounts[s.property.status as keyof typeof statusCounts]++;
  }

  return (
    <DashboardView
      totals={summary.totals}
      baseCurrency={summary.baseCurrency}
      propertyCount={summary.properties.length}
      statusCounts={statusCounts}
      flows={flows}
      alerts={alerts}
      activity={audit.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        at: a.at.toISOString(),
      }))}
    />
  );
}
