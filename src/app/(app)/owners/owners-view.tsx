"use client";

import { Landmark, Loader2, Plus, UserRound, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion-primitives";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPayback } from "@/lib/finance";
import { formatMoney, formatPercent, countryFlag } from "@/lib/format";
import { STATUS_BADGE, STATUS_LABEL } from "@/lib/labels";
import type { MonthlyFlow, PortfolioSummary } from "@/lib/portfolio";

const spring = { type: "spring", bounce: 0, visualDuration: 0.3 } as const;

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  color: "var(--popover-foreground)",
  fontSize: 13,
} as const;

export function OwnersView({
  summary,
  flows,
  owners,
  scope,
  isAdmin,
}: {
  summary: PortfolioSummary;
  flows: MonthlyFlow[];
  owners: Array<{ id: string; name: string; kind: string; isFamily: boolean }>;
  scope: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [assetTab, setAssetTab] = useState(0);
  const [addOpen, setAddOpen] = useState(false);

  const { totals, baseCurrency, properties } = summary;
  const money = (n: number) => formatMoney(n, baseCurrency, { compact: true });
  const scopeName =
    summary.scope.kind === "family"
      ? "Family profile"
      : summary.scope.kind === "all"
        ? "Whole portfolio"
        : summary.scope.name;

  const byCountry = new Map<string, number>();
  for (const sp of properties) {
    const key = sp.property.country;
    byCountry.set(
      key,
      (byCountry.get(key) ?? 0) +
        (sp.financials.currentValue ?? sp.financials.invested),
    );
  }
  const countryData = [...byCountry.entries()].map(([country, value]) => ({
    country,
    value: Math.round(value),
  }));

  const investedVsReturned = properties.map((sp) => ({
    name:
      sp.property.name.length > 18
        ? `${sp.property.name.slice(0, 17)}…`
        : sp.property.name,
    invested: Math.round(sp.financials.invested),
    returned: Math.round(sp.financials.totalReturned),
  }));

  const active = properties[Math.min(assetTab, properties.length - 1)];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <FadeIn className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl">{scopeName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every figure below is scaled to this profile&apos;s ownership share.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={scope}
            onValueChange={(v) =>
              startTransition(() =>
                router.replace(`${pathname}?owner=${v}`, { scroll: false }),
              )
            }
          >
            <SelectTrigger className="w-56" aria-label="Owner profile">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="family">
                <span className="flex items-center gap-2">
                  <Users className="size-4" aria-hidden /> Family profile
                </span>
              </SelectItem>
              {owners.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  <span className="flex items-center gap-2">
                    {o.kind === "company" ? (
                      <Landmark className="size-4" aria-hidden />
                    ) : (
                      <UserRound className="size-4" aria-hidden />
                    )}
                    {o.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Owner
            </Button>
          )}
        </div>
      </FadeIn>

      {/* Headline cards (§6.6) */}
      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StaggerItem>
          <StatCard label="Total invested" value={totals.invested} format={money} emphasis />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Monthly generated"
            value={totals.monthlyRunRate}
            format={(n) => formatMoney(n, baseCurrency)}
            caption={`${formatMoney(totals.annualRunRate, baseCurrency)} annually`}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Total returned" value={totals.totalReturned} format={money} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Outstanding commitments" value={totals.outstanding} format={money} />
        </StaggerItem>
        <StaggerItem className="col-span-2">
          <StatCard
            label="Estimated time to full investment return"
            value={formatPayback(totals.paybackMonths)}
            caption="Deliberately honest math: (invested − returned) ÷ monthly run-rate"
          />
        </StaggerItem>
      </Stagger>

      {/* Per-asset tab strip (§6.6) */}
      {properties.length > 0 && active && (
        <FadeIn delay={0.1} className="rounded-2xl border bg-card shadow-sm">
          <div className="-mb-px flex overflow-x-auto border-b">
            {properties.map((sp, i) => (
              <button
                key={sp.property.id}
                type="button"
                onClick={() => setAssetTab(i)}
                aria-selected={i === assetTab}
                role="tab"
                className={`relative shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                  i === assetTab
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {sp.property.name}
                {i === assetTab && (
                  <motion.span
                    layoutId="owner-asset-tab"
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary"
                    transition={spring}
                  />
                )}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active.property.id}
              initial={{ opacity: 0, transform: "translateY(8px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              exit={{ opacity: 0 }}
              transition={spring}
              className="grid gap-4 p-4 md:grid-cols-4 md:p-5"
            >
              <div className="md:col-span-1">
                <Badge className={STATUS_BADGE[active.property.status]}>
                  {STATUS_LABEL[active.property.status]}
                </Badge>
                <p className="mt-2 font-medium">
                  {countryFlag(active.property.country)} {active.property.city}
                </p>
                <p className="text-sm text-muted-foreground">
                  Your share: {active.sharePct}%
                </p>
                <Link
                  href={`/properties/${active.property.id}`}
                  className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open property →
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3 md:col-span-3">
                {active.property.status === "completed" && active.activeLease ? (
                  <>
                    <MiniStat
                      label="Rent"
                      value={`${formatMoney(active.activeLease.rentAmount, active.activeLease.currency)}/${active.activeLease.frequency === "monthly" ? "mo" : active.activeLease.frequency}`}
                    />
                    <MiniStat
                      label="Income to date (share)"
                      value={formatMoney(active.financials.grossIncome, baseCurrency)}
                    />
                    <MiniStat
                      label="Payback"
                      value={formatPayback(active.financials.paybackMonths)}
                    />
                  </>
                ) : active.property.status === "under_construction" ? (
                  <>
                    <MiniStat
                      label="Built"
                      value={
                        active.latestConstructionPct !== null
                          ? `${active.latestConstructionPct}%`
                          : "—"
                      }
                    />
                    <MiniStat
                      label="Paid"
                      value={formatPercent(active.financials.completionPct)}
                    />
                    <MiniStat
                      label="Next installment"
                      value={
                        active.nextInstallment
                          ? formatMoney(
                              active.nextInstallment.amount,
                              active.nextInstallment.currency,
                            )
                          : "—"
                      }
                    />
                  </>
                ) : (
                  <>
                    <MiniStat
                      label="Paid (share)"
                      value={formatMoney(active.financials.invested, baseCurrency, { compact: true })}
                    />
                    <MiniStat
                      label="Remaining (share)"
                      value={formatMoney(active.financials.outstanding, baseCurrency, { compact: true })}
                    />
                    <MiniStat
                      label="Paid of price"
                      value={formatPercent(active.financials.completionPct)}
                    />
                  </>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </FadeIn>
      )}

      {/* Ownership table (§6.6) */}
      <FadeIn delay={0.15} className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
        <h2 className="mb-3 text-base font-semibold">Ownership breakdown</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead className="text-right">Share</TableHead>
              <TableHead className="text-right">Invested</TableHead>
              <TableHead className="text-right">Returned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((sp) => (
              <TableRow key={sp.property.id}>
                <TableCell>
                  <Link
                    href={`/properties/${sp.property.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {sp.property.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-numbers">
                  {sp.sharePct}%
                </TableCell>
                <TableCell className="text-right tabular-numbers">
                  {formatMoney(sp.financials.invested, baseCurrency)}
                </TableCell>
                <TableCell className="text-right tabular-numbers">
                  {formatMoney(sp.financials.totalReturned, baseCurrency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FadeIn>

      {/* Charts (§6.6) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <FadeIn delay={0.2} className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
          <h2 className="text-base font-semibold">Portfolio value by country</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Current value (or invested when unvalued), in {baseCurrency}
          </p>
          <div className="h-56" role="img" aria-label="Bar chart of portfolio value by country">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countryData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  tickFormatter={(v: number) =>
                    Intl.NumberFormat("en-GB", { notation: "compact" }).format(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="country"
                  width={130}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--foreground)", fontSize: 13 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                  contentStyle={tooltipStyle}
                  formatter={(value) => [
                    formatMoney(Number(value ?? 0), baseCurrency),
                    "Value",
                  ]}
                />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FadeIn>

        <FadeIn delay={0.25} className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
          <h2 className="text-base font-semibold">Income trend</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Monthly income, last 12 months, in {baseCurrency}
          </p>
          <div className="h-56" role="img" aria-label="Line chart of monthly income for the last 12 months">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={flows} margin={{ left: 4, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
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
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [
                    formatMoney(Number(value ?? 0), baseCurrency),
                    "Income",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={0.3} className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
        <h2 className="text-base font-semibold">Invested vs returned per property</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Share-scaled, in {baseCurrency}
        </p>
        <div className="h-64" role="img" aria-label="Bar chart comparing invested and returned amounts per property">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={investedVsReturned} barGap={2} margin={{ left: 4, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                tickFormatter={(v: number) =>
                  Intl.NumberFormat("en-GB", { notation: "compact" }).format(v)
                }
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                contentStyle={tooltipStyle}
                formatter={(value, name) => [
                  formatMoney(Number(value ?? 0), baseCurrency),
                  String(name) === "invested" ? "Invested" : "Returned",
                ]}
              />
              <Legend
                formatter={(v: string) => (v === "invested" ? "Invested" : "Returned")}
                iconType="circle"
                iconSize={9}
                wrapperStyle={{ fontSize: 13 }}
              />
              <Bar dataKey="invested" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="returned" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </FadeIn>

      {isAdmin && <AddOwnerDialog open={addOpen} onOpenChange={setAddOpen} />}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-base font-semibold tabular-numbers">
        {value}
      </p>
    </div>
  );
}

function AddOwnerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("person");
  const [isFamily, setIsFamily] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) {
      toast.error("A name is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/v1/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind, isFamily }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message ?? "Could not create the owner.");
        return;
      }
      toast.success("Owner created.");
      setName("");
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add owner</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="owner-name">Name *</Label>
            <Input
              id="owner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amjad Rehawi or Al Noor LLC"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Kind</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger aria-label="Owner kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="person">Person</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isFamily} onCheckedChange={setIsFamily} />
            Part of the family profile
          </label>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="gap-2">
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
