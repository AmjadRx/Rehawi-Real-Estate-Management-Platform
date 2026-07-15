/**
 * Financial engine (§5) — pure functions, no I/O.
 *
 * Every amount is stored untouched in its original currency; conversion to
 * the base display currency happens here, at computation time, using the
 * `exchange_rates` table (rate_to_eur per currency). All ratio figures are
 * recomputed from converted sums — never averaged.
 */

export type Money = { amount: string | number; currency: string };

export type PaymentInput = Money;
export type InstallmentInput = Money & {
  status: "upcoming" | "due" | "paid" | "overdue";
};
export type LeaseInput = {
  rentAmount: string | number;
  currency: string;
  frequency: "monthly" | "quarterly" | "yearly";
  status: "active" | "ended";
};
export type IncomeInput = Money & { receivedOn: string | Date };
export type ExpenseInput = Money & {
  spentOn: string | Date;
  recurring: boolean;
  /**
   * §4 v4: "one_time" | "monthly" | "yearly" (typed as string because the
   * column is text). Older rows may lack it; `recurring` is the fallback.
   */
  frequency?: string;
  /**
   * Percentage costs (cost bar): a share of the rent instead of a fixed
   * amount. inclusive: the tenant pays rent*(1-p) and the fee is p of that
   * collected amount (rent 100, 5% inclusive: tenant pays 95, fee 4.75).
   * exclusive: the tenant pays the full rent and the fee is p of it
   * (rent 100, 5% exclusive: tenant pays 100, fee 5).
   */
  isPercentage?: boolean;
  percentValue?: string | number | null;
  percentBase?: string | null;
};

/** Fraction (0 to 1) of a percentage cost row; 0 for fixed rows. */
export function percentFraction(e: ExpenseInput): number {
  if (!e.isPercentage || e.percentValue === null || e.percentValue === undefined) {
    return 0;
  }
  const pct = toNumber(e.percentValue);
  return pct > 0 ? Math.min(pct, 100) / 100 : 0;
}

/**
 * Rent flow with percentage costs applied (cost bar):
 * - tenantPays: the nominal rent minus all INCLUSIVE percentages.
 * - percentageCosts: inclusive fees are p of the collected (reduced) rent;
 *   exclusive fees are p of the nominal rent.
 */
export function applyPercentageCosts(
  nominalRent: number,
  expenses: ExpenseInput[],
): { tenantPays: number; percentageCosts: number } {
  const inclusive = expenses.filter(
    (e) => percentFraction(e) > 0 && e.percentBase === "inclusive",
  );
  const exclusive = expenses.filter(
    (e) => percentFraction(e) > 0 && e.percentBase !== "inclusive",
  );
  const inclusiveSum = sum(inclusive.map(percentFraction));
  const tenantPays = Math.max(0, nominalRent * (1 - inclusiveSum));
  const percentageCosts =
    sum(inclusive.map((e) => percentFraction(e) * tenantPays)) +
    sum(exclusive.map((e) => percentFraction(e) * nominalRent));
  return { tenantPays, percentageCosts };
}

/** currency code → rate to EUR (EUR itself must be 1). */
export type RateTable = Record<string, number>;

export interface PropertyFinancialInputs {
  payments: PaymentInput[];
  installments: InstallmentInput[];
  leases: LeaseInput[];
  income: IncomeInput[];
  expenses: ExpenseInput[];
  currentValue?: Money | null;
}

export interface PropertyFinancials {
  /** Σ payments — money put in (base currency). */
  invested: number;
  /** Σ unpaid installments (upcoming | due | overdue). */
  outstanding: number;
  /** invested ÷ (invested + outstanding); 1 when nothing outstanding. */
  completionPct: number;
  grossIncome: number;
  operatingExpenses: number;
  /** grossIncome − operatingExpenses (NOI). */
  netIncome: number;
  /** Cumulative net income to date. */
  totalReturned: number;
  /** Active leases normalized to monthly − average monthly recurring expenses. */
  monthlyRunRate: number;
  annualRunRate: number;
  /** totalReturned ÷ invested; 0 when nothing invested. */
  roiToDate: number;
  /** annual NOI run-rate ÷ current value; null when no current value. */
  capRate: number | null;
  /**
   * Months until (invested − returned) is repaid by the monthly run-rate.
   * null when the run-rate is ≤ 0 ("Not yet generating income").
   */
  paybackMonths: number | null;
  currentValue: number | null;
  /**
   * Gross ("excluding costs", §6.2 v4) figures: rent-based run-rates and
   * the payback/ROI they imply, before operating expenses.
   */
  rentRunRate: number;
  grossAnnualRunRate: number;
  grossRoiToDate: number;
  grossPaybackMonths: number | null;
  /** operating expenses ÷ gross income; null when there is no income yet. */
  opCostPct: number | null;
}

const MONTHS_PER_PERIOD: Record<LeaseInput["frequency"], number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

export function toNumber(v: string | number): number {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Convert an amount to the base currency through EUR cross rates.
 * Unknown currencies convert at 0 — deliberately visible in the UI rather
 * than silently wrong; the admin rates screen exists to fix them.
 */
export function convert(
  money: Money,
  rates: RateTable,
  baseCurrency = "EUR",
): number {
  const amount = toNumber(money.amount);
  const from = rates[money.currency.toUpperCase()];
  const base = rates[baseCurrency.toUpperCase()];
  if (from === undefined || !base) return 0;
  return (amount * from) / base;
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export function totalInvested(
  payments: PaymentInput[],
  rates: RateTable,
  base = "EUR",
): number {
  return sum(payments.map((p) => convert(p, rates, base)));
}

export function outstandingCommitment(
  installments: InstallmentInput[],
  rates: RateTable,
  base = "EUR",
): number {
  return sum(
    installments
      .filter((i) => i.status !== "paid")
      .map((i) => convert(i, rates, base)),
  );
}

export function monthlyRentRunRate(
  leases: LeaseInput[],
  rates: RateTable,
  base = "EUR",
): number {
  return sum(
    leases
      .filter((l) => l.status === "active")
      .map(
        (l) =>
          convert({ amount: l.rentAmount, currency: l.currency }, rates, base) /
          MONTHS_PER_PERIOD[l.frequency],
      ),
  );
}

/**
 * Standing monthly cost (§4 v4): each expense entry declares its frequency.
 * monthly counts in full, yearly counts at one twelfth, one_time entries
 * affect totals but not the run-rate. Older rows without a frequency fall
 * back to the legacy `recurring` flag (treated as monthly).
 */
export function monthlyRecurringExpenses(
  expenses: ExpenseInput[],
  rates: RateTable,
  base = "EUR",
): number {
  return sum(
    expenses.map((e) => {
      if (e.isPercentage) return 0; // rent-relative, handled separately
      const frequency = e.frequency ?? (e.recurring ? "monthly" : "one_time");
      if (frequency === "monthly") return convert(e, rates, base);
      if (frequency === "yearly") return convert(e, rates, base) / 12;
      return 0;
    }),
  );
}

export function computePropertyFinancials(
  inputs: PropertyFinancialInputs,
  rates: RateTable,
  base = "EUR",
  // Kept for signature compatibility; run-rates no longer depend on dates.
  _now: Date = new Date(),
): PropertyFinancials {
  const invested = totalInvested(inputs.payments, rates, base);
  const outstanding = outstandingCommitment(inputs.installments, rates, base);
  const grossIncome = sum(inputs.income.map((i) => convert(i, rates, base)));
  const operatingExpenses = sum(
    inputs.expenses.map((e) => convert(e, rates, base)),
  );
  const netIncome = grossIncome - operatingExpenses;
  const totalReturned = netIncome;

  // Cost bar: percentage costs reshape the rent flow. Inclusive shares
  // reduce what the tenant pays; the collected amount is the gross figure.
  const nominalRent = monthlyRentRunRate(inputs.leases, rates, base);
  const { tenantPays, percentageCosts } = applyPercentageCosts(
    nominalRent,
    inputs.expenses,
  );
  const rentRunRate = tenantPays;
  const monthlyRunRate =
    tenantPays -
    percentageCosts -
    monthlyRecurringExpenses(inputs.expenses, rates, base);
  const annualRunRate = monthlyRunRate * 12;

  const committed = invested + outstanding;
  const completionPct = committed > 0 ? invested / committed : 1;
  const roiToDate = invested > 0 ? totalReturned / invested : 0;

  const currentValue = inputs.currentValue
    ? convert(inputs.currentValue, rates, base)
    : null;
  const capRate =
    currentValue && currentValue > 0 ? annualRunRate / currentValue : null;

  const paybackMonths =
    monthlyRunRate > 0
      ? Math.max(0, (invested - totalReturned) / monthlyRunRate)
      : null;

  return {
    invested,
    outstanding,
    completionPct,
    grossIncome,
    operatingExpenses,
    netIncome,
    totalReturned,
    monthlyRunRate,
    annualRunRate,
    roiToDate,
    capRate,
    paybackMonths,
    currentValue,
    rentRunRate,
    grossAnnualRunRate: rentRunRate * 12,
    grossRoiToDate: invested > 0 ? grossIncome / invested : 0,
    grossPaybackMonths:
      rentRunRate > 0
        ? Math.max(0, (invested - grossIncome) / rentRunRate)
        : null,
    opCostPct: grossIncome > 0 ? operatingExpenses / grossIncome : null,
  };
}

/** Scale a property's figures by an ownership share (0–100). */
export function scaleByShare(
  f: PropertyFinancials,
  sharePct: number,
): PropertyFinancials {
  const s = sharePct / 100;
  const invested = f.invested * s;
  const outstanding = f.outstanding * s;
  const grossIncome = f.grossIncome * s;
  const totalReturned = f.totalReturned * s;
  const monthlyRunRate = f.monthlyRunRate * s;
  const rentRunRate = f.rentRunRate * s;
  return {
    ...f,
    invested,
    outstanding,
    grossIncome,
    operatingExpenses: f.operatingExpenses * s,
    netIncome: f.netIncome * s,
    totalReturned,
    monthlyRunRate,
    annualRunRate: monthlyRunRate * 12,
    completionPct: f.completionPct, // ratio: share-invariant
    roiToDate: f.roiToDate, // ratio: share-invariant
    capRate: f.capRate,
    currentValue: f.currentValue !== null ? f.currentValue * s : null,
    paybackMonths:
      monthlyRunRate > 0
        ? Math.max(0, (invested - totalReturned) / monthlyRunRate)
        : null,
    rentRunRate,
    grossAnnualRunRate: rentRunRate * 12,
    grossRoiToDate: f.grossRoiToDate, // ratio: share-invariant
    grossPaybackMonths:
      rentRunRate > 0
        ? Math.max(0, (invested - grossIncome) / rentRunRate)
        : null,
    opCostPct: f.opCostPct, // ratio: share-invariant
  };
}

/** Aggregate several (already share-scaled) property figures into a portfolio. */
export function aggregateFinancials(
  items: PropertyFinancials[],
): PropertyFinancials {
  const invested = sum(items.map((i) => i.invested));
  const outstanding = sum(items.map((i) => i.outstanding));
  const grossIncome = sum(items.map((i) => i.grossIncome));
  const operatingExpenses = sum(items.map((i) => i.operatingExpenses));
  const netIncome = grossIncome - operatingExpenses;
  const totalReturned = sum(items.map((i) => i.totalReturned));
  const monthlyRunRate = sum(items.map((i) => i.monthlyRunRate));
  const values = items
    .map((i) => i.currentValue)
    .filter((v): v is number => v !== null);
  const currentValue = values.length ? sum(values) : null;
  const annualRunRate = monthlyRunRate * 12;
  const rentRunRate = sum(items.map((i) => i.rentRunRate));
  const committed = invested + outstanding;
  return {
    invested,
    outstanding,
    completionPct: committed > 0 ? invested / committed : 1,
    grossIncome,
    operatingExpenses,
    netIncome,
    totalReturned,
    monthlyRunRate,
    annualRunRate,
    roiToDate: invested > 0 ? totalReturned / invested : 0,
    capRate:
      currentValue && currentValue > 0 ? annualRunRate / currentValue : null,
    paybackMonths:
      monthlyRunRate > 0
        ? Math.max(0, (invested - totalReturned) / monthlyRunRate)
        : null,
    currentValue,
    rentRunRate,
    grossAnnualRunRate: rentRunRate * 12,
    grossRoiToDate: invested > 0 ? grossIncome / invested : 0,
    grossPaybackMonths:
      rentRunRate > 0
        ? Math.max(0, (invested - grossIncome) / rentRunRate)
        : null,
    opCostPct: grossIncome > 0 ? operatingExpenses / grossIncome : null,
  };
}

/**
 * Split payback months into calendar parts. Uncapped (§6.2 v2): a 499-year
 * payback is reported as-is, never clamped to a "99+ years" style cap.
 */
export function paybackParts(
  paybackMonths: number | null,
): { kind: "none" } | { kind: "done" } | { kind: "time"; years: number; months: number } {
  if (paybackMonths === null) return { kind: "none" };
  const total = Math.round(paybackMonths);
  if (total <= 0) return { kind: "done" };
  return { kind: "time", years: Math.floor(total / 12), months: total % 12 };
}

/**
 * Render payback months as "X years, Y months", or the honest fallback when
 * the portfolio is not generating income.
 */
export function formatPayback(paybackMonths: number | null): string {
  const parts = paybackParts(paybackMonths);
  if (parts.kind === "none") return "Not yet generating income";
  if (parts.kind === "done") return "Fully returned";
  const { years, months } = parts;
  const y = `${years} year${years === 1 ? "" : "s"}`;
  const m = `${months} month${months === 1 ? "" : "s"}`;
  if (years === 0) return m;
  if (months === 0) return y;
  return `${y}, ${m}`;
}

/**
 * Projected calendar date when the invested capital is fully returned
 * (§6.2 v2), or null when nothing is being generated / already returned.
 */
export function paybackDate(
  paybackMonths: number | null,
  from: Date = new Date(),
): Date | null {
  if (paybackMonths === null) return null;
  const total = Math.round(paybackMonths);
  if (total <= 0) return null;
  const d = new Date(from.getTime());
  d.setMonth(d.getMonth() + total);
  return d;
}
