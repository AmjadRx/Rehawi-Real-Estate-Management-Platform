"use client";

import {
  CalendarClock,
  HardHat,
  Mail,
  MessageCircle,
  Phone,
  Wrench,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { StatCard } from "@/components/stat-card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPayback, paybackDate } from "@/lib/finance";
import {
  countryFlag,
  formatDate,
  formatMoney,
  formatMonthYear,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import {
  CONTACT_ROLE_LABEL,
  EXPENSE_CATEGORY_LABEL,
  INSTALLMENT_STATUS_BADGE,
  MAINTENANCE_PRIORITY_BADGE,
  PAYMENT_KIND_LABEL,
} from "@/lib/labels";
import type { PropertyDetail } from "@/lib/property-detail";
import { CompletenessMeter } from "./completeness-meter";
import { CostsPanel } from "./costs-panel";
import { DocumentsPanel } from "./documents-panel";
import { LocationPanel } from "./location-panel";
import { AddRecordButton, type FieldDef } from "./record-forms";

const contentSpring = {
  type: "spring",
  bounce: 0,
  visualDuration: 0.3,
} as const;

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/** Key-facts entry: skipped fields display "Not provided" (§6.3 v3). */
function Fact({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: string | null;
  numeric?: boolean;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          value
            ? `mt-0.5 font-medium ${numeric ? "tabular-numbers" : ""}`
            : "mt-0.5 text-sm italic text-muted-foreground"
        }
      >
        {value ?? "Not provided"}
      </dd>
    </div>
  );
}

const dateFields = (label: string, key: string): FieldDef[] => [
  { key, label, kind: "date", required: true },
];

/** Admin control: link an existing directory contact to this property. */
function LinkContactControl({
  propertyId,
  allContacts,
  linkedIds,
}: {
  propertyId: string;
  allContacts: Array<{
    id: string;
    name: string;
    role: string;
    companyName: string | null;
  }>;
  linkedIds: string[];
}) {
  const available = allContacts.filter((c) => !linkedIds.includes(c.id));

  async function link(contactId: string) {
    const res = await fetch(`/api/v1/properties/${propertyId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    if (res.ok) window.location.reload();
  }

  if (available.length === 0) return null;
  return (
    <select
      className="h-9 rounded-md border bg-background px-2 text-sm"
      aria-label="Link a contact"
      defaultValue=""
      onChange={(e) => e.target.value && link(e.target.value)}
    >
      <option value="" disabled>
        + Link contact…
      </option>
      {available.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
          {c.companyName ? `, ${c.companyName}` : ""}
        </option>
      ))}
    </select>
  );
}

export function PropertyTabs({
  detail,
  canEdit,
  allContacts,
  tab,
  onTabChange,
}: {
  detail: PropertyDetail;
  canEdit: boolean;
  allContacts: Array<{
    id: string;
    name: string;
    role: string;
    companyName: string | null;
  }>;
  tab: string;
  onTabChange: (tab: string) => void;
}) {
  const { property, financials, baseCurrency } = detail;
  const showConstruction = property.status !== "completed";
  const showLease =
    property.occupancy === "rented" || detail.leases.length > 0;

  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "financials", label: "Financials" },
    { value: "payments", label: "Payments" },
    ...(showConstruction
      ? [{ value: "construction", label: "Construction" }]
      : []),
    ...(showLease ? [{ value: "lease", label: "Lease & Income" }] : []),
    { value: "documents", label: "Documents" },
    { value: "contacts", label: "Contacts" },
    { value: "location", label: "Location" },
    { value: "maintenance", label: "Maintenance" },
  ];

  const currency = property.currency;

  // Gross/True toggle (§6.2/§6.4 v4) for this property's own figures.
  const [includeCosts, setIncludeCosts] = useState(true);
  const finPayback = includeCosts
    ? financials.paybackMonths
    : financials.grossPaybackMonths;

  return (
    <Tabs value={tab} onValueChange={onTabChange}>
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <TabsList className="w-max">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, transform: "translateY(10px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          exit={{ opacity: 0, transform: "translateY(-6px)" }}
          transition={contentSpring}
          className="mt-4 space-y-4"
        >
          {tab === "overview" && (
            <>
              <CompletenessMeter detail={detail} />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Invested"
                  value={financials.invested}
                  format={(n) => formatMoney(n, baseCurrency, { compact: true })}
                />
                <StatCard
                  label="Returned to date"
                  value={financials.totalReturned}
                  format={(n) => formatMoney(n, baseCurrency, { compact: true })}
                />
                <StatCard
                  label="Monthly run-rate"
                  value={financials.monthlyRunRate}
                  format={(n) => formatMoney(n, baseCurrency)}
                />
                <StatCard
                  label="Paid of total price"
                  value={formatPercent(financials.completionPct)}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Section title="Key facts">
                  {/* §6.3 v3: skipped fields read "Not provided", never invented. */}
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <Fact
                      label="Purchase price"
                      value={
                        property.purchasePrice
                          ? formatMoney(property.purchasePrice, currency)
                          : null
                      }
                      numeric
                    />
                    <Fact
                      label="Current value"
                      value={
                        property.currentValue
                          ? formatMoney(property.currentValue, currency)
                          : null
                      }
                      numeric
                    />
                    <Fact
                      label="Size"
                      value={
                        property.sizeSqm
                          ? `${formatNumber(parseFloat(property.sizeSqm))} m²`
                          : null
                      }
                    />
                    <Fact
                      label="Year built"
                      value={property.yearBuilt ? String(property.yearBuilt) : null}
                    />
                    <Fact
                      label="Floors"
                      value={property.floors !== null ? formatNumber(property.floors) : null}
                    />
                    <Fact
                      label="Units"
                      value={property.units !== null ? formatNumber(property.units) : null}
                    />
                    <div>
                      <dt className="text-muted-foreground">Location</dt>
                      <dd className="mt-0.5 font-medium">
                        {countryFlag(property.country)} {property.city},{" "}
                        {property.country}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Currency</dt>
                      <dd className="mt-0.5 font-medium">{currency}</dd>
                    </div>
                  </dl>
                  {property.description ? (
                    <p className="mt-4 border-t pt-3 text-sm leading-relaxed text-muted-foreground">
                      {property.description}
                    </p>
                  ) : (
                    <p className="mt-4 border-t pt-3 text-sm italic text-muted-foreground">
                      Description not provided.
                    </p>
                  )}
                </Section>

                <Section title="Owners & shares">
                  {detail.owners.length === 0 ? (
                    <Empty>No owners recorded yet.</Empty>
                  ) : (
                    <ul className="space-y-2.5">
                      {detail.owners.map((o) => (
                        <li
                          key={o.ownerId}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/owners/${o.ownerId}`}
                              className="font-medium underline-offset-4 hover:underline"
                            >
                              {o.name}
                            </Link>
                            {o.isLegalOwner && (
                              <Badge variant="outline">On paper</Badge>
                            )}
                            {o.isFamily && (
                              <Badge variant="secondary">Family</Badge>
                            )}
                          </div>
                          <div className="flex w-32 items-center gap-2">
                            <Progress value={o.sharePct} className="h-2" />
                            <span className="w-11 text-right text-sm font-semibold tabular-numbers">
                              {o.sharePct}%
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              </div>
            </>
          )}

          {tab === "financials" && (
            <>
              <div
                className="inline-flex rounded-full border bg-card p-1 shadow-sm"
                role="group"
                aria-label="Excluding costs / Including costs"
              >
                {([
                  [false, "Excluding costs"],
                  [true, "Including costs"],
                ] as const).map(([value, label]) => (
                  <button
                    key={String(value)}
                    type="button"
                    aria-pressed={includeCosts === value}
                    onClick={() => setIncludeCosts(value)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                      includeCosts === value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Total invested"
                  value={financials.invested}
                  format={(n) => formatMoney(n, baseCurrency, { compact: true })}
                />
                <StatCard
                  label={includeCosts ? "Net income (NOI)" : "Gross income"}
                  value={includeCosts ? financials.netIncome : financials.grossIncome}
                  format={(n) => formatMoney(n, baseCurrency)}
                  caption={
                    includeCosts
                      ? `Expenses to date: ${formatMoney(financials.operatingExpenses, baseCurrency)}`
                      : financials.opCostPct !== null
                        ? `${formatPercent(financials.opCostPct)} of income goes to costs`
                        : undefined
                  }
                />
                <StatCard
                  label={includeCosts ? "True ROI to date" : "Gross ROI to date"}
                  value={formatPercent(
                    includeCosts ? financials.roiToDate : financials.grossRoiToDate,
                    2,
                  )}
                />
                <StatCard
                  label="Payback estimate"
                  value={formatPayback(finPayback)}
                  caption={
                    [
                      paybackDate(finPayback)
                        ? `Projected: ${formatMonthYear(paybackDate(finPayback))}`
                        : null,
                      financials.capRate !== null
                        ? `Cap rate ${formatPercent(financials.capRate, 1)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(". ") || undefined
                  }
                />
              </div>

              {/* Cost bar: only completed properties carry running costs;
                  planned and under-construction ones have none to manage. */}
              {property.status === "completed" && (
                <CostsPanel detail={detail} canEdit={canEdit} />
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <Section
                  title="Income"
                  action={
                    canEdit && (
                      <AddRecordButton
                        propertyId={property.id}
                        resource="income"
                        title="Add income"
                        fields={[
                          { key: "amount", label: "Amount", kind: "amount", required: true },
                          { key: "currency", label: "Currency", kind: "text", defaultValue: currency, required: true },
                          ...dateFields("Received on", "receivedOn"),
                          {
                            key: "kind",
                            label: "Kind",
                            kind: "select",
                            defaultValue: "rent",
                            options: [
                              ["rent", "Rent"],
                              ["other", "Other"],
                            ],
                          },
                        ]}
                      />
                    )
                  }
                >
                  {detail.income.length === 0 ? (
                    <Empty>No income recorded.</Empty>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Kind</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...detail.income].reverse().map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{formatDate(row.receivedOn)}</TableCell>
                            <TableCell className="capitalize">{row.kind}</TableCell>
                            <TableCell className="text-right font-medium tabular-numbers">
                              {formatMoney(row.amount, row.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Section>

                <Section
                  title="Expenses"
                  action={
                    canEdit && (
                      <AddRecordButton
                        propertyId={property.id}
                        resource="expenses"
                        title="Add expense"
                        fields={[
                          { key: "amount", label: "Amount", kind: "amount", required: true },
                          { key: "currency", label: "Currency", kind: "text", defaultValue: currency, required: true },
                          ...dateFields("Spent on", "spentOn"),
                          {
                            key: "category",
                            label: "Category",
                            kind: "select",
                            defaultValue: "maintenance",
                            options: Object.entries(EXPENSE_CATEGORY_LABEL),
                          },
                          {
                            key: "frequency",
                            label: "Frequency",
                            kind: "select",
                            defaultValue: "one_time",
                            options: [
                              ["one_time", "One time"],
                              ["monthly", "Monthly"],
                              ["yearly", "Yearly"],
                            ],
                          },
                        ]}
                      />
                    )
                  }
                >
                  {detail.expenses.length === 0 ? (
                    <Empty>No expenses recorded.</Empty>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...detail.expenses].reverse().map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{formatDate(row.spentOn)}</TableCell>
                            <TableCell>
                              {EXPENSE_CATEGORY_LABEL[row.category]}
                              {row.frequency === "monthly"
                                ? " · monthly"
                                : row.frequency === "yearly"
                                  ? " · yearly"
                                  : ""}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-numbers">
                              {formatMoney(row.amount, row.currency)}
                              {row.frequency === "yearly" && (
                                <span className="block text-xs font-normal text-muted-foreground">
                                  {formatMoney(
                                    parseFloat(row.amount) / 12,
                                    row.currency,
                                  )}{" "}
                                  monthly
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Section>
              </div>
            </>
          )}

          {tab === "payments" && (
            <>
              <Section title="Progress">
                <div className="flex items-center gap-4">
                  <Progress
                    value={financials.completionPct * 100}
                    className="h-3 flex-1"
                  />
                  <span className="text-sm font-semibold tabular-numbers">
                    {formatPercent(financials.completionPct)} of price paid
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatMoney(financials.invested, baseCurrency)} paid ·{" "}
                  {formatMoney(financials.outstanding, baseCurrency)} outstanding
                </p>
              </Section>

              <div className="grid gap-4 lg:grid-cols-2">
                <Section
                  title="Payments made"
                  action={
                    canEdit && (
                      <AddRecordButton
                        propertyId={property.id}
                        resource="payments"
                        title="Add payment"
                        fields={[
                          { key: "amount", label: "Amount", kind: "amount", required: true },
                          { key: "currency", label: "Currency", kind: "text", defaultValue: currency, required: true },
                          ...dateFields("Paid on", "paidOn"),
                          {
                            key: "kind",
                            label: "Kind",
                            kind: "select",
                            defaultValue: "installment",
                            options: Object.entries(PAYMENT_KIND_LABEL),
                          },
                          { key: "milestoneLabel", label: "Milestone", kind: "text" },
                        ]}
                      />
                    )
                  }
                >
                  {detail.payments.length === 0 ? (
                    <Empty>No payments recorded.</Empty>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Kind</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...detail.payments].reverse().map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              {formatDate(row.paidOn)}
                              {row.milestoneLabel && (
                                <span className="block text-xs text-muted-foreground">
                                  {row.milestoneLabel}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{PAYMENT_KIND_LABEL[row.kind]}</TableCell>
                            <TableCell className="text-right font-medium tabular-numbers">
                              {formatMoney(row.amount, row.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Section>

                <Section
                  title="Installment schedule"
                  action={
                    canEdit && (
                      <AddRecordButton
                        propertyId={property.id}
                        resource="installments"
                        title="Add installment"
                        fields={[
                          { key: "label", label: "Label", kind: "text", required: true },
                          ...dateFields("Due date", "dueDate"),
                          { key: "amount", label: "Amount", kind: "amount", required: true },
                          { key: "currency", label: "Currency", kind: "text", defaultValue: currency, required: true },
                          {
                            key: "status",
                            label: "Status",
                            kind: "select",
                            defaultValue: "upcoming",
                            options: [
                              ["upcoming", "Upcoming"],
                              ["due", "Due"],
                              ["paid", "Paid"],
                              ["overdue", "Overdue"],
                            ],
                          },
                        ]}
                      />
                    )
                  }
                >
                  {detail.installments.length === 0 ? (
                    <Empty>No installment schedule.</Empty>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Milestone</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.installments.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">{row.label}</TableCell>
                            <TableCell>{formatDate(row.dueDate)}</TableCell>
                            <TableCell>
                              <Badge className={INSTALLMENT_STATUS_BADGE[row.status]}>
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-numbers">
                              {formatMoney(row.amount, row.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Section>
              </div>
            </>
          )}

          {tab === "construction" && showConstruction && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <StatCard
                  label="Build progress"
                  value={
                    detail.constructionUpdates.at(-1)?.progressPct != null
                      ? `${detail.constructionUpdates.at(-1)!.progressPct}%`
                      : "-"
                  }
                  caption="Latest reported"
                />
                <StatCard
                  label="Price paid"
                  value={formatPercent(financials.completionPct)}
                />
                <StatCard
                  label="Next installment"
                  value={
                    detail.installments.find((i) => i.status !== "paid")
                      ? formatMoney(
                          detail.installments.find((i) => i.status !== "paid")!
                            .amount,
                          detail.installments.find((i) => i.status !== "paid")!
                            .currency,
                        )
                      : "-"
                  }
                  caption={
                    detail.installments.find((i) => i.status !== "paid")
                      ? `Due ${formatDate(
                          detail.installments.find((i) => i.status !== "paid")!
                            .dueDate,
                        )}`
                      : undefined
                  }
                />
              </div>

              <Section
                title="Updates"
                action={
                  canEdit && (
                    <AddRecordButton
                      propertyId={property.id}
                      resource="construction-updates"
                      title="Add update"
                      fields={[
                        ...dateFields("Date", "updateDate"),
                        { key: "progressPct", label: "Progress %", kind: "amount", required: true },
                        { key: "note", label: "Note", kind: "text" },
                      ]}
                      transform={(v) => ({
                        updateDate: v.updateDate,
                        progressPct: Number(v.progressPct),
                        note: v.note || undefined,
                      })}
                    />
                  )
                }
              >
                {detail.constructionUpdates.length === 0 ? (
                  <Empty>No construction updates yet.</Empty>
                ) : (
                  <ol className="relative space-y-5 border-l pl-5">
                    {[...detail.constructionUpdates].reverse().map((u) => (
                      <li key={u.id} className="relative">
                        <span
                          className="absolute -left-[26px] top-1 flex size-3 items-center justify-center rounded-full bg-primary"
                          aria-hidden
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <HardHat className="size-4 text-muted-foreground" aria-hidden />
                          <span className="font-medium">{u.progressPct}% complete</span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(u.updateDate)}
                          </span>
                        </div>
                        {u.note && (
                          <p className="mt-1 text-sm text-muted-foreground">{u.note}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </Section>
            </>
          )}

          {tab === "lease" && showLease && (
            <>
              {detail.leases.map((lease) => {
                const expiresDays = lease.endDate
                  ? Math.ceil(
                      (new Date(lease.endDate).getTime() - Date.now()) /
                        86_400_000,
                    )
                  : null;
                return (
                  <div key={lease.id} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard
                      label="Rent"
                      value={`${formatMoney(lease.rentAmount, lease.currency)}/${
                        lease.frequency === "monthly"
                          ? "mo"
                          : lease.frequency === "quarterly"
                            ? "qtr"
                            : "yr"
                      }`}
                      caption={`Tenant: ${lease.tenantName}`}
                    />
                    <StatCard
                      label="Lease status"
                      value={lease.status === "active" ? "Active" : "Ended"}
                      caption={`${formatDate(lease.startDate)} → ${
                        lease.endDate ? formatDate(lease.endDate) : "open-ended"
                      }`}
                    />
                    <StatCard
                      label="Deposit"
                      value={
                        lease.depositAmount
                          ? formatMoney(lease.depositAmount, lease.currency)
                          : "-"
                      }
                    />
                    <StatCard
                      label="Expires in"
                      value={
                        expiresDays === null
                          ? "-"
                          : expiresDays > 0
                            ? `${expiresDays} days`
                            : "Expired"
                      }
                      emphasis={expiresDays !== null && expiresDays <= 60}
                    />
                  </div>
                );
              })}

              <Section
                title="Income received"
                action={
                  canEdit && (
                    <AddRecordButton
                      propertyId={property.id}
                      resource="income"
                      title="Add income"
                      fields={[
                        { key: "amount", label: "Amount", kind: "amount", required: true },
                        { key: "currency", label: "Currency", kind: "text", defaultValue: currency, required: true },
                        ...dateFields("Received on", "receivedOn"),
                      ]}
                    />
                  )
                }
              >
                {detail.income.length === 0 ? (
                  <Empty>No income recorded yet.</Empty>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Kind</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...detail.income].reverse().map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDate(row.receivedOn)}</TableCell>
                          <TableCell className="capitalize">{row.kind}</TableCell>
                          <TableCell className="text-right font-medium tabular-numbers">
                            {formatMoney(row.amount, row.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Section>

              {canEdit && detail.leases.length === 0 && (
                <AddRecordButton
                  propertyId={property.id}
                  resource="leases"
                  title="Add lease"
                  fields={[
                    { key: "tenantName", label: "Tenant", kind: "text", required: true },
                    { key: "rentAmount", label: "Rent", kind: "amount", required: true },
                    { key: "currency", label: "Currency", kind: "text", defaultValue: currency, required: true },
                    {
                      key: "frequency",
                      label: "Frequency",
                      kind: "select",
                      defaultValue: "monthly",
                      options: [
                        ["monthly", "Monthly"],
                        ["quarterly", "Quarterly"],
                        ["yearly", "Yearly"],
                      ],
                    },
                    ...dateFields("Start date", "startDate"),
                  ]}
                />
              )}
            </>
          )}

          {tab === "documents" && (
            <DocumentsPanel detail={detail} canEdit={canEdit} />
          )}

          {tab === "contacts" && (
            <Section
              title="Linked contacts"
              action={
                canEdit && (
                  <LinkContactControl
                    propertyId={property.id}
                    allContacts={allContacts}
                    linkedIds={detail.contacts.map((c) => c.contact.id)}
                  />
                )
              }
            >
              {detail.contacts.length === 0 ? (
                <Empty>No contacts linked to this property.</Empty>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {detail.contacts.map(({ contact, relationshipNote }) => (
                    <li
                      key={contact.id}
                      className="rounded-xl border p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          {contact.companyName && (
                            <p className="text-sm text-muted-foreground">
                              {contact.companyName}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary">
                          {CONTACT_ROLE_LABEL[contact.role]}
                        </Badge>
                      </div>
                      {relationshipNote && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {relationshipNote}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {contact.phones[0] && (
                          <a
                            href={`tel:${contact.phones[0]}`}
                            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent"
                          >
                            <Phone className="size-3" aria-hidden />
                            Call
                          </a>
                        )}
                        {contact.whatsapp && (
                          <a
                            href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent"
                          >
                            <MessageCircle className="size-3" aria-hidden />
                            WhatsApp
                          </a>
                        )}
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent"
                          >
                            <Mail className="size-3" aria-hidden />
                            Email
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {tab === "location" && (
            <LocationPanel detail={detail} canEdit={canEdit} />
          )}

          {tab === "maintenance" && (
            <Section
              title="Work orders"
              action={
                canEdit && (
                  <AddRecordButton
                    propertyId={property.id}
                    resource="maintenance"
                    title="Add work order"
                    fields={[
                      { key: "title", label: "Title", kind: "text", required: true },
                      {
                        key: "priority",
                        label: "Priority",
                        kind: "select",
                        defaultValue: "med",
                        options: [
                          ["low", "Low"],
                          ["med", "Medium"],
                          ["high", "High"],
                          ["urgent", "Urgent"],
                        ],
                      },
                      ...dateFields("Opened on", "openedOn"),
                      { key: "description", label: "Description", kind: "text" },
                    ]}
                  />
                )
              }
            >
              {detail.maintenance.length === 0 ? (
                <Empty>No open work orders. 🎉</Empty>
              ) : (
                <ul className="space-y-3">
                  {detail.maintenance.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Wrench className="size-4 text-muted-foreground" aria-hidden />
                        <div>
                          <p className="font-medium">{m.title}</p>
                          {m.description && (
                            <p className="text-sm text-muted-foreground">
                              {m.description}
                            </p>
                          )}
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarClock className="size-3" aria-hidden />
                            Opened {formatDate(m.openedOn)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={MAINTENANCE_PRIORITY_BADGE[m.priority]}>
                          {m.priority}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {m.status.replace("_", " ")}
                        </Badge>
                        {m.cost && (
                          <span className="text-sm font-medium tabular-numbers">
                            {formatMoney(m.cost, m.currency ?? currency)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}
        </motion.div>
      </AnimatePresence>
    </Tabs>
  );
}
