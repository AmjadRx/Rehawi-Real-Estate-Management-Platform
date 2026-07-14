"use client";

import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CircleAlert,
  History,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion-primitives";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  paybackDate,
  paybackParts,
  type PropertyFinancials,
} from "@/lib/finance";
import { formatDate, formatMoney, formatMonthYear } from "@/lib/format";
import type { MonthlyFlow } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

export interface Alert {
  severity: "critical" | "warning" | "info";
  message: string;
  href?: string;
  date: string;
}

const SEVERITY_STYLE: Record<Alert["severity"], string> = {
  critical:
    "border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  info: "border-border bg-card text-foreground",
};

export function DashboardView({
  totals,
  baseCurrency,
  propertyCount,
  statusCounts,
  flows,
  alerts,
  activity,
}: {
  totals: PropertyFinancials;
  baseCurrency: string;
  propertyCount: number;
  statusCounts: { planned: number; under_construction: number; completed: number };
  flows: MonthlyFlow[];
  alerts: Alert[];
  activity: Array<{ id: string; action: string; entityType: string; at: string }>;
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const locale = useLocale();
  const money = (n: number) => formatMoney(n, baseCurrency, { compact: true });

  // Uncapped payback (§6.2 v2): "X years, Y months" plus a projected
  // "Month YYYY" date, localized for EN and AR.
  const parts = paybackParts(totals.paybackMonths);
  const paybackLabel =
    parts.kind === "none"
      ? tc("notYetGenerating")
      : parts.kind === "done"
        ? tc("fullyReturned")
        : parts.years === 0
          ? tc("paybackMonths", { months: parts.months })
          : parts.months === 0
            ? tc("paybackYears", { years: parts.years })
            : tc("paybackBoth", { years: parts.years, months: parts.months });
  const projected = paybackDate(totals.paybackMonths);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <FadeIn>
        <h1 className="text-2xl md:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("propertiesSummary", {
            count: propertyCount,
            completed: statusCounts.completed,
            underConstruction: statusCounts.under_construction,
            planned: statusCounts.planned,
          })}
        </p>
      </FadeIn>

      {/* Headline figures (§6.2) */}
      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StaggerItem>
          <StatCard
            label={t("totalInvested")}
            value={totals.invested}
            format={money}
            emphasis
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t("totalReturned")}
            value={totals.totalReturned}
            format={money}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t("outstanding")}
            value={totals.outstanding}
            format={money}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t("monthlyIncome")}
            value={totals.monthlyRunRate}
            format={(n) => formatMoney(n, baseCurrency)}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t("yearlyIncome")}
            value={totals.annualRunRate}
            format={(n) => formatMoney(n, baseCurrency)}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t("fullReturn")}
            value={paybackLabel}
            caption={
              projected
                ? t("projectedDate", {
                    date: formatMonthYear(projected, locale),
                  })
                : undefined
            }
          />
        </StaggerItem>
      </Stagger>

      {/* Alerts strip (§6.2) */}
      {alerts.length > 0 && (
        <FadeIn delay={0.1} className="space-y-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <BellRing className="size-4" aria-hidden />
            {t("needsAttention")}
          </h2>
          <ul className="space-y-2">
            {alerts.slice(0, 5).map((alert, i) => {
              const Icon =
                alert.severity === "critical" ? CircleAlert : AlertTriangle;
              const inner = (
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="text-sm font-medium">{alert.message}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs opacity-80">
                    {formatDate(alert.date)}
                    {alert.href && <ArrowRight className="size-3.5" aria-hidden />}
                  </span>
                </span>
              );
              return (
                <li key={i}>
                  {alert.href ? (
                    <Link
                      href={alert.href}
                      className={cn(
                        "block rounded-xl border px-4 py-3 transition-colors hover:opacity-90",
                        SEVERITY_STYLE[alert.severity],
                      )}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div
                      className={cn(
                        "rounded-xl border px-4 py-3",
                        SEVERITY_STYLE[alert.severity],
                      )}
                    >
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </FadeIn>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Income vs expenses — grouped bars, one axis, hover tooltip */}
        <FadeIn
          delay={0.15}
          className="rounded-2xl border bg-card p-4 shadow-sm md:p-5 lg:col-span-3"
        >
          <h2 className="text-base font-semibold">{t("incomeVsExpenses")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("chartCaption", { currency: baseCurrency })}
          </p>
          <div className="h-64" role="img" aria-label="Bar chart of monthly income and expenses for the last 12 months">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flows} barGap={2} margin={{ left: 4, right: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  tickFormatter={(v: number) =>
                    Intl.NumberFormat("en-GB", { notation: "compact" }).format(v)
                  }
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    color: "var(--popover-foreground)",
                    fontSize: 13,
                  }}
                  formatter={(value, name) => [
                    formatMoney(Number(value ?? 0), baseCurrency),
                    String(name) === "income" ? t("income") : t("expenses"),
                  ]}
                />
                <Legend
                  formatter={(value: string) =>
                    value === "income" ? t("income") : t("expenses")
                  }
                  iconType="circle"
                  iconSize={9}
                  wrapperStyle={{ fontSize: 13 }}
                />
                <Bar
                  dataKey="income"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
                <Bar
                  dataKey="expenses"
                  fill="var(--chart-2)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FadeIn>

        {/* Recent activity (§6.2) */}
        <FadeIn
          delay={0.2}
          className="rounded-2xl border bg-card p-4 shadow-sm md:p-5 lg:col-span-2"
        >
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <History className="size-4" aria-hidden />
            {t("recentActivity")}
          </h2>
          {activity.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              {t("activityEmpty")}
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {activity.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 border-b pb-2.5 text-sm last:border-0"
                >
                  <span className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="capitalize"
                    >
                      {a.action}
                    </Badge>
                    <span className="capitalize text-muted-foreground">
                      {a.entityType.replace(/_/g, " ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(a.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </FadeIn>
      </div>
    </div>
  );
}
