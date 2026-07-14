import { eq, inArray, isNull } from "drizzle-orm";
import { getDb, tables } from "@/db";
import {
  aggregateFinancials,
  computePropertyFinancials,
  scaleByShare,
  type PropertyFinancials,
  type RateTable,
} from "@/lib/finance";

export async function getRates(): Promise<RateTable> {
  const db = await getDb();
  const rows = await db.select().from(tables.exchangeRates);
  const rates: RateTable = { EUR: 1 };
  for (const row of rows) {
    rates[row.currency.toUpperCase()] = parseFloat(row.rateToEur);
  }
  return rates;
}

export async function getBaseCurrency(): Promise<string> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(tables.settings)
    .where(eq(tables.settings.key, "base_currency"))
    .limit(1);
  return (
    (typeof row?.value === "string" ? row.value : null) ??
    process.env.BASE_CURRENCY ??
    "EUR"
  );
}

export type PropertyRow = typeof tables.properties.$inferSelect;

export interface ScopedProperty {
  property: PropertyRow;
  /** Share of this property attributed to the selected scope (0–100). */
  sharePct: number;
  financials: PropertyFinancials;
  /** Unscaled (100%) figures for the property itself. */
  propertyFinancials: PropertyFinancials;
  owners: Array<{
    ownerId: string;
    name: string;
    kind: "person" | "company";
    isFamily: boolean;
    sharePct: number;
    isLegalOwner: boolean;
  }>;
  activeLease: typeof tables.leases.$inferSelect | null;
  nextInstallment: typeof tables.installments.$inferSelect | null;
  latestConstructionPct: number | null;
}

export interface MonthlyFlow {
  /** e.g. "2026-07" */
  month: string;
  label: string;
  income: number;
  expenses: number;
}

/**
 * Last-N-months income vs expenses in base currency, scoped like
 * portfolioSummary (family share by default).
 */
export async function monthlyFlows(
  ownerScope: "family" | "all" | string = "family",
  months = 12,
  now: Date = new Date(),
): Promise<MonthlyFlow[]> {
  const summary = await portfolioSummary(ownerScope);
  const db = await getDb();
  const [rates, baseCurrency] = await Promise.all([
    getRates(),
    getBaseCurrency(),
  ]);
  const ids = summary.properties.map((s) => s.property.id);
  const shareById = new Map(
    summary.properties.map((s) => [s.property.id, s.sharePct / 100]),
  );

  const [incomes, exps] = ids.length
    ? await Promise.all([
        db
          .select()
          .from(tables.income)
          .where(inArray(tables.income.propertyId, ids)),
        db
          .select()
          .from(tables.expenses)
          .where(inArray(tables.expenses.propertyId, ids)),
      ])
    : [[], []];

  const buckets = new Map<string, MonthlyFlow>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      month: key,
      label: d.toLocaleString("en-GB", { month: "short" }),
      income: 0,
      expenses: 0,
    });
  }

  const { convert } = await import("@/lib/finance");
  for (const row of incomes) {
    const key = row.receivedOn.slice(0, 7);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.income +=
      convert(row, rates, baseCurrency) * (shareById.get(row.propertyId) ?? 0);
  }
  for (const row of exps) {
    const key = row.spentOn.slice(0, 7);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.expenses +=
      convert(row, rates, baseCurrency) * (shareById.get(row.propertyId) ?? 0);
  }
  return [...buckets.values()];
}

export interface PortfolioSummary {
  scope: { kind: "family" } | { kind: "owner"; ownerId: string; name: string } | { kind: "all" };
  baseCurrency: string;
  totals: PropertyFinancials;
  properties: ScopedProperty[];
}

/**
 * The single portfolio computation used by the dashboard, the owners page
 * and GET /api/v1/portfolio/summary. Owner scoping per §5: every figure is
 * multiplied by that owner's share; the Family profile sums across all
 * owners flagged is_family.
 */
export async function portfolioSummary(
  ownerScope: "family" | "all" | string = "family",
): Promise<PortfolioSummary> {
  const db = await getDb();
  const [rates, baseCurrency] = await Promise.all([
    getRates(),
    getBaseCurrency(),
  ]);

  const props = await db
    .select()
    .from(tables.properties)
    .where(isNull(tables.properties.deletedAt));
  const ids = props.map((p) => p.id);

  const ownersAll = await db.select().from(tables.owners);
  const ownerById = new Map(ownersAll.map((o) => [o.id, o]));

  const [links, pays, insts, leases, incomes, exps, cons] = ids.length
    ? await Promise.all([
        db
          .select()
          .from(tables.propertyOwners)
          .where(inArray(tables.propertyOwners.propertyId, ids)),
        db
          .select()
          .from(tables.payments)
          .where(inArray(tables.payments.propertyId, ids)),
        db
          .select()
          .from(tables.installments)
          .where(inArray(tables.installments.propertyId, ids)),
        db
          .select()
          .from(tables.leases)
          .where(inArray(tables.leases.propertyId, ids)),
        db
          .select()
          .from(tables.income)
          .where(inArray(tables.income.propertyId, ids)),
        db
          .select()
          .from(tables.expenses)
          .where(inArray(tables.expenses.propertyId, ids)),
        db
          .select()
          .from(tables.constructionUpdates)
          .where(inArray(tables.constructionUpdates.propertyId, ids)),
      ])
    : [[], [], [], [], [], [], []];

  const byProp = <T extends { propertyId: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const list = map.get(row.propertyId) ?? [];
      list.push(row);
      map.set(row.propertyId, list);
    }
    return map;
  };

  const paysBy = byProp(pays);
  const instsBy = byProp(insts);
  const leasesBy = byProp(leases);
  const incomeBy = byProp(incomes);
  const expBy = byProp(exps);
  const consBy = byProp(cons);
  const linksBy = byProp(links);

  const scoped: ScopedProperty[] = [];

  for (const property of props) {
    const propertyFinancials = computePropertyFinancials(
      {
        payments: paysBy.get(property.id) ?? [],
        installments: instsBy.get(property.id) ?? [],
        leases: (leasesBy.get(property.id) ?? []).map((l) => ({
          rentAmount: l.rentAmount,
          currency: l.currency,
          frequency: l.frequency,
          status: l.status,
        })),
        income: incomeBy.get(property.id) ?? [],
        expenses: expBy.get(property.id) ?? [],
        currentValue: property.currentValue
          ? { amount: property.currentValue, currency: property.currency }
          : null,
      },
      rates,
      baseCurrency,
    );

    const ownerLinks = (linksBy.get(property.id) ?? []).map((link) => {
      const owner = ownerById.get(link.ownerId);
      return {
        ownerId: link.ownerId,
        name: owner?.name ?? "Unknown",
        kind: (owner?.kind ?? "person") as "person" | "company",
        isFamily: owner?.isFamily ?? false,
        sharePct: parseFloat(link.sharePct),
        isLegalOwner: link.isLegalOwner,
      };
    });

    let sharePct: number;
    if (ownerScope === "all") {
      sharePct = 100;
    } else if (ownerScope === "family") {
      sharePct = ownerLinks
        .filter((o) => o.isFamily)
        .reduce((sum, o) => sum + o.sharePct, 0);
    } else {
      sharePct = ownerLinks
        .filter((o) => o.ownerId === ownerScope)
        .reduce((sum, o) => sum + o.sharePct, 0);
    }
    if (sharePct <= 0) continue;

    const propLeases = leasesBy.get(property.id) ?? [];
    const activeLease =
      propLeases.find((l) => l.status === "active") ?? null;

    const unpaid = (instsBy.get(property.id) ?? [])
      .filter((i) => i.status !== "paid")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const consUpdates = (consBy.get(property.id) ?? []).sort((a, b) =>
      b.updateDate.localeCompare(a.updateDate),
    );

    scoped.push({
      property,
      sharePct,
      financials: scaleByShare(propertyFinancials, sharePct),
      propertyFinancials,
      owners: ownerLinks,
      activeLease,
      nextInstallment: unpaid[0] ?? null,
      latestConstructionPct: consUpdates[0]?.progressPct ?? null,
    });
  }

  const scope =
    ownerScope === "family"
      ? ({ kind: "family" } as const)
      : ownerScope === "all"
        ? ({ kind: "all" } as const)
        : ({
            kind: "owner",
            ownerId: ownerScope,
            name: ownerById.get(ownerScope)?.name ?? "Unknown owner",
          } as const);

  return {
    scope,
    baseCurrency,
    totals: aggregateFinancials(scoped.map((s) => s.financials)),
    properties: scoped,
  };
}
