"use client";

import { Loader2, Percent, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney, formatNumber } from "@/lib/format";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/labels";
import type { PropertyDetail } from "@/lib/property-detail";

const SEGMENT_COLORS = [
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-1)",
];

/**
 * Cost bar (completed properties only): standing costs of running the
 * property. Fixed costs are monthly or yearly; percentage costs take a
 * share of the rent, inclusive (rent 100 at 5%: tenant pays 95, fee 4.75)
 * or exclusive (tenant pays 100, fee 5).
 */
export function CostsPanel({
  detail,
  canEdit,
}: {
  detail: PropertyDetail;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { costBreakdown: cb, baseCurrency, property } = detail;
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"fixed" | "percentage">("fixed");
  const [form, setForm] = useState({
    category: "management_fee",
    amount: "",
    frequency: "monthly",
    percentValue: "",
    percentBase: "exclusive",
  });

  const totalCosts = cb.entries.reduce((sum, e) => sum + e.monthlyCost, 0);
  const collected = cb.tenantPays;
  const net = Math.max(0, collected - totalCosts);
  const overrun = totalCosts > collected && collected > 0;

  async function addCost() {
    if (mode === "fixed" && !form.amount) return;
    if (mode === "percentage" && !form.percentValue) return;
    setBusy(true);
    try {
      const body =
        mode === "fixed"
          ? {
              category: form.category,
              amount: form.amount,
              currency: property.currency,
              spentOn: new Date().toISOString().slice(0, 10),
              frequency: form.frequency,
            }
          : {
              category: form.category,
              currency: property.currency,
              spentOn: new Date().toISOString().slice(0, 10),
              isPercentage: true,
              percentValue: Number(form.percentValue),
              percentBase: form.percentBase,
            };
      const res = await fetch(`/api/v1/properties/${property.id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Could not add the cost.");
        return;
      }
      toast.success("Cost added.");
      setForm((f) => ({ ...f, amount: "", percentValue: "" }));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeCost(id: string) {
    const res = await fetch(
      `/api/v1/properties/${property.id}/expenses/${id}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      toast.success("Cost removed.");
      router.refresh();
    } else {
      toast.error("Could not remove the cost.");
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Running costs</h3>
        <p className="text-sm text-muted-foreground">
          {formatMoney(totalCosts, baseCurrency)} monthly
        </p>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Standing costs of managing this property. Percentage costs follow the
        rent
        {cb.nominalRent > cb.tenantPays
          ? `; inclusive shares reduce the tenant's payment to ${formatMoney(cb.tenantPays, baseCurrency)} from ${formatMoney(cb.nominalRent, baseCurrency)}`
          : ""}
        .
      </p>

      {/* The cost bar: collected rent split into cost segments + net. */}
      {collected > 0 && (
        <div className="mb-4">
          <div
            className="flex h-4 w-full overflow-hidden rounded-full border"
            role="img"
            aria-label={`Of ${formatMoney(collected, baseCurrency)} collected monthly, ${formatMoney(totalCosts, baseCurrency)} goes to costs and ${formatMoney(net, baseCurrency)} remains`}
          >
            {cb.entries.map((e, i) => (
              <div
                key={e.id}
                style={{
                  width: `${Math.min((e.monthlyCost / collected) * 100, 100)}%`,
                  background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                }}
                title={`${EXPENSE_CATEGORY_LABEL[e.category]}: ${formatMoney(e.monthlyCost, baseCurrency)}/mo`}
              />
            ))}
            <div className="flex-1 bg-emerald-500/80" title="Net income" />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
            <span>
              Costs: {formatMoney(totalCosts, baseCurrency)}
              {overrun ? " (more than the rent collected)" : ""}
            </span>
            <span>Net: {formatMoney(net, baseCurrency)} monthly</span>
          </div>
        </div>
      )}

      {cb.entries.length === 0 ? (
        <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
          No running costs recorded yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {cb.entries.map((e, i) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
                  aria-hidden
                />
                <span className="font-medium">
                  {EXPENSE_CATEGORY_LABEL[e.category]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {e.isPercentage
                    ? `${formatNumber(parseFloat(e.percentValue ?? "0"), 2)}% of rent, ${e.percentBase === "inclusive" ? "inclusive" : "exclusive"}`
                    : e.frequency === "yearly"
                      ? `${formatMoney(e.amount, e.currency)} yearly`
                      : `${formatMoney(e.amount, e.currency)} monthly`}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-medium tabular-numbers">
                  {formatMoney(e.monthlyCost, baseCurrency)}/mo
                </span>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Remove ${EXPENSE_CATEGORY_LABEL[e.category]}`}
                    onClick={() => removeCost(e.id)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="mt-4 space-y-3 border-t pt-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-40 space-y-1">
              <Label className="text-xs">Cost type</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger className="w-44" aria-label="Cost type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {Object.entries(EXPENSE_CATEGORY_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Charged as</Label>
              <Select
                value={mode}
                onValueChange={(v) => setMode(v as "fixed" | "percentage")}
              >
                <SelectTrigger className="w-40" aria-label="Charged as">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                  <SelectItem value="percentage">Percent of rent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === "fixed" ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">
                    Amount ({property.currency})
                  </Label>
                  <Input
                    className="w-28"
                    inputMode="decimal"
                    enterKeyHint="done"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, amount: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Every</Label>
                  <Select
                    value={form.frequency}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, frequency: v }))
                    }
                  >
                    <SelectTrigger className="w-28" aria-label="Frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Month</SelectItem>
                      <SelectItem value="yearly">Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Percent</Label>
                  <div className="relative">
                    <Input
                      className="w-24 pe-7"
                      inputMode="decimal"
                      enterKeyHint="done"
                      value={form.percentValue}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, percentValue: e.target.value }))
                      }
                    />
                    <Percent
                      className="absolute end-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Basis</Label>
                  <Select
                    value={form.percentBase}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, percentBase: v }))
                    }
                  >
                    <SelectTrigger className="w-32" aria-label="Percent basis">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclusive">Exclusive</SelectItem>
                      <SelectItem value="inclusive">Inclusive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <Button
              className="gap-1.5"
              disabled={
                busy ||
                (mode === "fixed" ? !form.amount : !form.percentValue)
              }
              onClick={addCost}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              Add cost
            </Button>
          </div>
          {mode === "percentage" && (
            <p className="text-xs text-muted-foreground">
              Exclusive: the tenant pays the full rent and you pay the fee on
              top (rent 100 at 5%: you pay 5). Inclusive: the fee is taken
              inside a reduced rent (rent 100 at 5%: tenant pays 95, the fee
              is 4.75 of it).
            </p>
          )}
        </div>
      )}
    </section>
  );
}
