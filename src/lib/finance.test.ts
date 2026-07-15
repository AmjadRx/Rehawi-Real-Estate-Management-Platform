import { describe, expect, it } from "vitest";
import {
  aggregateFinancials,
  computePropertyFinancials,
  convert,
  formatPayback,
  paybackDate,
  scaleByShare,
  type PropertyFinancials,
  type RateTable,
} from "./finance";

const rates: RateTable = { EUR: 1, USD: 0.9, AED: 0.25 };
const NOW = new Date("2026-07-01T00:00:00Z");

import type {
  ExpenseInput,
  IncomeInput,
  InstallmentInput,
  LeaseInput,
  PaymentInput,
} from "./finance";

const empty = {
  payments: [] as PaymentInput[],
  installments: [] as InstallmentInput[],
  leases: [] as LeaseInput[],
  income: [] as IncomeInput[],
  expenses: [] as ExpenseInput[],
};

describe("convert", () => {
  it("converts through EUR cross rates", () => {
    expect(convert({ amount: 100, currency: "EUR" }, rates)).toBe(100);
    expect(convert({ amount: 100, currency: "USD" }, rates)).toBeCloseTo(90);
    expect(convert({ amount: "400", currency: "AED" }, rates)).toBeCloseTo(100);
  });
  it("converts into a non-EUR base currency", () => {
    expect(
      convert({ amount: 90, currency: "EUR" }, rates, "USD"),
    ).toBeCloseTo(100);
  });
  it("treats unknown currencies as 0 rather than guessing", () => {
    expect(convert({ amount: 100, currency: "XXX" }, rates)).toBe(0);
  });
});

describe("computePropertyFinancials", () => {
  it("computes invested, outstanding and completion %", () => {
    const f = computePropertyFinancials(
      {
        ...empty,
        payments: [
          { amount: 1_000_000, currency: "EUR" },
          { amount: 500_000, currency: "EUR" },
        ],
        installments: [
          { amount: 300_000, currency: "EUR", status: "upcoming" },
          { amount: 200_000, currency: "EUR", status: "paid" }, // excluded
          { amount: 200_000, currency: "EUR", status: "overdue" },
        ],
      },
      rates,
      "EUR",
      NOW,
    );
    expect(f.invested).toBe(1_500_000);
    expect(f.outstanding).toBe(500_000);
    expect(f.completionPct).toBeCloseTo(0.75);
  });

  it("computes NOI, run-rates and cap rate", () => {
    const f = computePropertyFinancials(
      {
        ...empty,
        payments: [{ amount: 200_000, currency: "EUR" }],
        leases: [
          {
            rentAmount: 1_500,
            currency: "EUR",
            frequency: "quarterly",
            status: "active",
          },
          {
            rentAmount: 999,
            currency: "EUR",
            frequency: "monthly",
            status: "ended", // excluded
          },
        ],
        income: [
          { amount: 1_500, currency: "EUR", receivedOn: "2026-04-01" },
          { amount: 1_500, currency: "EUR", receivedOn: "2026-07-01" },
        ],
        expenses: [
          // §4 v4: a yearly standing cost counts at one twelfth per month.
          {
            amount: 1_200,
            currency: "EUR",
            spentOn: "2026-03-15",
            recurring: true,
            frequency: "yearly",
          },
          {
            amount: 500,
            currency: "EUR",
            spentOn: "2026-05-01",
            recurring: false,
            frequency: "one_time",
          },
        ],
        currentValue: { amount: 240_000, currency: "EUR" },
      },
      rates,
      "EUR",
      NOW,
    );
    // quarterly 1500 → 500/month, minus 1200/yr = 100/month recurring
    expect(f.monthlyRunRate).toBeCloseTo(400);
    expect(f.annualRunRate).toBeCloseTo(4_800);
    expect(f.grossIncome).toBe(3_000);
    expect(f.operatingExpenses).toBe(1_700);
    expect(f.netIncome).toBe(1_300);
    expect(f.capRate).toBeCloseTo(4_800 / 240_000);
    expect(f.roiToDate).toBeCloseTo(1_300 / 200_000);
    // Gross ("excluding costs", §6.2 v4) figures stay rent-based.
    expect(f.rentRunRate).toBeCloseTo(500);
    expect(f.grossAnnualRunRate).toBeCloseTo(6_000);
    expect(f.grossRoiToDate).toBeCloseTo(3_000 / 200_000);
    expect(f.grossPaybackMonths).toBeCloseTo((200_000 - 3_000) / 500);
    expect(f.opCostPct).toBeCloseTo(1_700 / 3_000);
  });

  it("percentage cost INCLUSIVE: rent 100, 5% → tenant pays 95, fee 4.75", () => {
    const f = computePropertyFinancials(
      {
        ...empty,
        leases: [
          { rentAmount: 100, currency: "EUR", frequency: "monthly", status: "active" },
        ],
        expenses: [
          {
            amount: 0,
            currency: "EUR",
            spentOn: "2026-06-01",
            recurring: true,
            frequency: "monthly",
            isPercentage: true,
            percentValue: 5,
            percentBase: "inclusive",
          },
        ],
      },
      rates,
      "EUR",
      NOW,
    );
    expect(f.rentRunRate).toBeCloseTo(95); // tenant pays 95
    expect(f.monthlyRunRate).toBeCloseTo(95 - 4.75); // management takes 4.75
  });

  it("percentage cost EXCLUSIVE: rent 100, 5% → tenant pays 100, fee 5", () => {
    const f = computePropertyFinancials(
      {
        ...empty,
        leases: [
          { rentAmount: 100, currency: "EUR", frequency: "monthly", status: "active" },
        ],
        expenses: [
          {
            amount: 0,
            currency: "EUR",
            spentOn: "2026-06-01",
            recurring: true,
            frequency: "monthly",
            isPercentage: true,
            percentValue: 5,
            percentBase: "exclusive",
          },
        ],
      },
      rates,
      "EUR",
      NOW,
    );
    expect(f.rentRunRate).toBeCloseTo(100); // tenant pays the full rent
    expect(f.monthlyRunRate).toBeCloseTo(95); // owner pays management 5
  });

  it("percentage costs combine with fixed recurring costs", () => {
    const f = computePropertyFinancials(
      {
        ...empty,
        leases: [
          { rentAmount: 1_000, currency: "EUR", frequency: "monthly", status: "active" },
        ],
        expenses: [
          {
            amount: 0,
            currency: "EUR",
            spentOn: "2026-06-01",
            recurring: true,
            isPercentage: true,
            percentValue: 10,
            percentBase: "exclusive",
          },
          {
            amount: 600,
            currency: "EUR",
            spentOn: "2026-06-01",
            recurring: false,
            frequency: "yearly",
          },
        ],
      },
      rates,
      "EUR",
      NOW,
    );
    // 1000 collected, minus 100 (10% exclusive) minus 50 (600/yr)
    expect(f.monthlyRunRate).toBeCloseTo(850);
  });

  it("frequency=monthly counts in full; legacy recurring falls back to monthly", () => {
    const base = {
      ...empty,
      leases: [
        {
          rentAmount: 1_000,
          currency: "EUR",
          frequency: "monthly",
          status: "active",
        } as const,
      ],
    };
    const withMonthly = computePropertyFinancials(
      {
        ...base,
        expenses: [
          { amount: 200, currency: "EUR", spentOn: "2026-06-01", recurring: false, frequency: "monthly" },
        ],
      },
      rates,
      "EUR",
      NOW,
    );
    expect(withMonthly.monthlyRunRate).toBeCloseTo(800);

    const legacy = computePropertyFinancials(
      {
        ...base,
        expenses: [
          { amount: 200, currency: "EUR", spentOn: "2026-06-01", recurring: true },
        ],
      },
      rates,
      "EUR",
      NOW,
    );
    expect(legacy.monthlyRunRate).toBeCloseTo(800);
  });

  it("returns null payback when not generating income", () => {
    const f = computePropertyFinancials(
      {
        ...empty,
        payments: [{ amount: 1_000_000, currency: "EUR" }],
      },
      rates,
      "EUR",
      NOW,
    );
    expect(f.paybackMonths).toBeNull();
    expect(formatPayback(f.paybackMonths)).toBe("Not yet generating income");
  });
});

describe("owner scoping", () => {
  it("scales absolute figures by share and keeps ratios", () => {
    const f = computePropertyFinancials(
      {
        ...empty,
        payments: [{ amount: 100_000, currency: "EUR" }],
        installments: [
          { amount: 100_000, currency: "EUR", status: "upcoming" },
        ],
        leases: [
          {
            rentAmount: 1_000,
            currency: "EUR",
            frequency: "monthly",
            status: "active",
          },
        ],
        income: [{ amount: 12_000, currency: "EUR", receivedOn: "2026-06-01" }],
      },
      rates,
      "EUR",
      NOW,
    );
    const half = scaleByShare(f, 50);
    expect(half.invested).toBe(50_000);
    expect(half.outstanding).toBe(50_000);
    expect(half.totalReturned).toBe(6_000);
    expect(half.monthlyRunRate).toBe(500);
    expect(half.completionPct).toBe(f.completionPct);
    expect(half.roiToDate).toBe(f.roiToDate);
    // payback identical for proportional scaling: (50k−6k)/500 = (100k−12k)/1000
    expect(half.paybackMonths).toBeCloseTo(f.paybackMonths!);
  });
});

/**
 * The owner's own 3-asset scenario (§5):
 * one rented at €500/month, one under construction, one half-paid.
 * Family profile must show €3,000,000 invested, €500/month, ≈500 years.
 */
describe("3-asset family scenario", () => {
  const rented = computePropertyFinancials(
    {
      ...empty,
      payments: [{ amount: 200_000, currency: "EUR" }],
      leases: [
        {
          rentAmount: 500,
          currency: "EUR",
          frequency: "monthly",
          status: "active",
        },
      ],
      income: Array.from({ length: 6 }, (_, i) => ({
        amount: 500,
        currency: "EUR",
        receivedOn: `2026-0${i + 1}-01`,
      })),
    },
    rates,
    "EUR",
    NOW,
  );

  const underConstruction = computePropertyFinancials(
    {
      ...empty,
      payments: [
        { amount: 1_000_000, currency: "EUR" },
        { amount: 500_000, currency: "EUR" },
        { amount: 300_000, currency: "EUR" },
      ],
      installments: [
        { amount: 350_000, currency: "EUR", status: "upcoming" },
        { amount: 350_000, currency: "EUR", status: "upcoming" },
      ],
    },
    rates,
    "EUR",
    NOW,
  );

  const halfPaid = computePropertyFinancials(
    {
      ...empty,
      payments: [{ amount: 1_000_000, currency: "EUR" }],
      installments: [
        { amount: 1_000_000, currency: "EUR", status: "upcoming" },
      ],
    },
    rates,
    "EUR",
    NOW,
  );

  const family = aggregateFinancials([rented, underConstruction, halfPaid]);

  it("totals €3,000,000 invested", () => {
    expect(family.invested).toBe(3_000_000);
  });

  it("generates €500/month", () => {
    expect(family.monthlyRunRate).toBe(500);
  });

  it("shows outstanding commitments of €1,700,000", () => {
    expect(family.outstanding).toBe(1_700_000);
  });

  it("estimates ≈500 years to full return (deliberately honest math)", () => {
    expect(family.paybackMonths).not.toBeNull();
    const years = family.paybackMonths! / 12;
    expect(years).toBeGreaterThan(499);
    expect(years).toBeLessThan(500);
    expect(Math.round(years / 10) * 10).toBe(500);
  });

  it("the rented asset's own payback is meaningful on its own", () => {
    // (200,000 − 3,000) / 500 = 394 months ≈ 32y 10m
    expect(rented.paybackMonths).toBeCloseTo(394);
    expect(formatPayback(rented.paybackMonths)).toBe("32 years, 10 months");
  });

  it("aggregate ratios are recomputed from sums, not averaged", () => {
    const expectedCompletion = 3_000_000 / (3_000_000 + 1_700_000);
    expect(family.completionPct).toBeCloseTo(expectedCompletion);
  });
});

describe("formatPayback", () => {
  const cases: Array<[number | null, string]> = [
    [null, "Not yet generating income"],
    [0, "Fully returned"],
    [1, "1 month"],
    [11, "11 months"],
    [12, "1 year"],
    [18, "1 year, 6 months"],
    [394, "32 years, 10 months"],
    // Uncapped (§6.2 v2): huge horizons are reported as-is.
    [5_994, "499 years, 6 months"],
    // Fractional months carry into years instead of showing "1 year, 12 months".
    [23.6, "2 years"],
  ];
  it.each(cases)("formats %s as %s", (months, expected) => {
    expect(formatPayback(months)).toBe(expected);
  });
});

describe("paybackDate", () => {
  const from = new Date(2026, 6, 14); // 14 July 2026

  it("is null when nothing is generating or already returned", () => {
    expect(paybackDate(null, from)).toBeNull();
    expect(paybackDate(0, from)).toBeNull();
  });

  it("projects months forward from the given date", () => {
    const d = paybackDate(18, from)!;
    expect(d.getFullYear()).toBe(2028);
    expect(d.getMonth()).toBe(0); // January 2028
  });

  it("handles multi-century horizons without capping", () => {
    const d = paybackDate(5_994, from)!;
    expect(d.getFullYear()).toBe(2526);
  });
});

describe("aggregateFinancials edge cases", () => {
  it("handles an empty portfolio", () => {
    const f = aggregateFinancials([]);
    expect(f.invested).toBe(0);
    expect(f.completionPct).toBe(1);
    expect(f.paybackMonths).toBeNull();
  });

  it("ignores null current values but sums present ones", () => {
    const a = { currentValue: 100 } as Partial<PropertyFinancials>;
    const b = { currentValue: null } as Partial<PropertyFinancials>;
    const base: PropertyFinancials = {
      invested: 0,
      outstanding: 0,
      completionPct: 1,
      grossIncome: 0,
      operatingExpenses: 0,
      netIncome: 0,
      totalReturned: 0,
      monthlyRunRate: 0,
      annualRunRate: 0,
      roiToDate: 0,
      capRate: null,
      paybackMonths: null,
      currentValue: null,
      rentRunRate: 0,
      grossAnnualRunRate: 0,
      grossRoiToDate: 0,
      grossPaybackMonths: null,
      opCostPct: null,
    };
    const f = aggregateFinancials([
      { ...base, ...a } as PropertyFinancials,
      { ...base, ...b } as PropertyFinancials,
    ]);
    expect(f.currentValue).toBe(100);
  });
});
