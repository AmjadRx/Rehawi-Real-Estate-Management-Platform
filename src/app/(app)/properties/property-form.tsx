"use client";

import { ChevronDown, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import {
  EXPENSE_CATEGORY_LABEL,
  OCCUPANCY_LABEL,
  PAYMENT_KIND_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
} from "@/lib/labels";

interface OwnerOption {
  id: string;
  name: string;
}

interface OwnerShare {
  ownerId: string;
  sharePct: number;
  isLegalOwner: boolean;
}

export interface PropertyFormValues {
  id?: string;
  name: string;
  type: string;
  status: string;
  occupancy: string;
  currency: string;
  purchasePrice: string;
  currentValue: string;
  country: string;
  city: string;
  addressLine: string;
  postalCode: string;
  lat: string;
  lng: string;
  sizeSqm: string;
  yearBuilt: string;
  floors: string;
  units: string;
  description: string;
  notes: string;
}

const EMPTY: PropertyFormValues = {
  name: "",
  type: "residential",
  status: "completed",
  occupancy: "n/a",
  currency: "EUR",
  purchasePrice: "",
  currentValue: "",
  country: "",
  city: "",
  addressLine: "",
  postalCode: "",
  lat: "",
  lng: "",
  sizeSqm: "",
  yearBuilt: "",
  floors: "",
  units: "",
  description: "",
  notes: "",
};

/** Optional wizard rows (§6.3 v3) submitted after the property is created. */
interface PaymentRow {
  kind: string;
  amount: string;
  paidOn: string;
  milestoneLabel: string;
}
interface InstallmentRow {
  label: string;
  dueDate: string;
  amount: string;
}
interface ExpenseRow {
  category: string;
  amount: string;
  recurring: boolean;
}
interface LeaseDraft {
  tenantName: string;
  rentAmount: string;
  frequency: string;
  startDate: string;
  depositAmount: string;
}
interface ConstructionDraft {
  progressPct: string;
  note: string;
}

const EMPTY_LEASE: LeaseDraft = {
  tenantName: "",
  rentAmount: "",
  frequency: "monthly",
  startDate: "",
  depositAmount: "",
};

/**
 * §6.3 v3: guided but skippable. Collapsed sections read as an offer, not a
 * requirement; skipped data is simply never sent.
 */
function OptionalSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-start"
      >
        <span className="text-sm font-semibold">{title}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {open ? "Hide" : (hint ?? "Optional")}
          <ChevronDown
            className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </span>
      </button>
      {open && <div className="space-y-3 border-t p-3.5">{children}</div>}
    </section>
  );
}

export function PropertyFormDialog({
  open,
  onOpenChange,
  owners,
  initial,
  initialOwners,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owners: OwnerOption[];
  initial?: PropertyFormValues;
  initialOwners?: OwnerShare[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<PropertyFormValues>(initial ?? EMPTY);
  const [shares, setShares] = useState<OwnerShare[]>(
    initialOwners ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const extractRef = useRef<HTMLInputElement>(null);
  const isEdit = !!initial?.id;

  // §6.3 v3 guided intake: every section offered but skippable. These rows
  // are posted right after the property is created; nothing is invented.
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [lease, setLease] = useState<LeaseDraft>(EMPTY_LEASE);
  const [construction, setConstruction] = useState<ConstructionDraft>({
    progressPct: "",
    note: "",
  });

  const shareTotal = useMemo(
    () => shares.reduce((sum, s) => sum + (s.sharePct || 0), 0),
    [shares],
  );

  const set = (key: keyof PropertyFormValues) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const field = (
    key: keyof PropertyFormValues,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`pf-${key}`}>{label}</Label>
      <Input
        id={`pf-${key}`}
        value={values[key]}
        onChange={(e) => set(key)(e.target.value)}
        enterKeyHint="done"
        {...props}
      />
    </div>
  );

  const selectField = (
    key: keyof PropertyFormValues,
    label: string,
    options: Array<[string, string]>,
  ) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={values[key]} onValueChange={set(key)}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([value, text]) => (
            <SelectItem key={value} value={value}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  /**
   * §6.3 v2 "Autofill from documents": send screenshots/photos/PDFs to
   * /api/v1/extract and prefill the form with the returned draft. The
   * draft only fills fields; nothing is saved until the user submits.
   */
  async function autofill(files: FileList) {
    if (files.length === 0) return;
    setExtracting(true);
    try {
      const formData = new FormData();
      for (const file of Array.from(files)) formData.append("files", file);
      const res = await fetch("/api/v1/extract", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Autofill failed. Fill the form manually.");
        return;
      }
      const draft = (data.draft ?? {}) as Record<string, unknown>;
      const patch: Partial<PropertyFormValues> = {};
      const put = (key: keyof PropertyFormValues, raw: unknown) => {
        if (raw === null || raw === undefined || raw === "") return;
        patch[key] = String(raw);
      };
      put("name", draft.name);
      if (
        typeof draft.type === "string" &&
        ["residential", "commercial", "land", "mixed"].includes(draft.type)
      ) {
        patch.type = draft.type;
      }
      if (
        typeof draft.status === "string" &&
        ["planned", "under_construction", "completed"].includes(draft.status)
      ) {
        patch.status = draft.status;
      }
      put("purchasePrice", draft.purchasePrice);
      put("currentValue", draft.currentValue);
      if (typeof draft.currency === "string" && draft.currency.length === 3) {
        patch.currency = draft.currency.toUpperCase();
      }
      put("country", draft.country);
      put("city", draft.city);
      put("addressLine", draft.addressLine);
      put("postalCode", draft.postalCode);
      put("sizeSqm", draft.sizeSqm);
      put("yearBuilt", draft.yearBuilt);
      put("floors", draft.floors);
      put("units", draft.units);
      put("description", draft.description);
      put("notes", draft.notes);

      const filled = Object.keys(patch).length;
      setValues((v) => ({ ...v, ...patch }));
      if (filled > 0) {
        toast.success(
          `Filled ${filled} field${filled === 1 ? "" : "s"} from your documents. Review everything before saving.`,
        );
      } else {
        toast.info("No property details were found in these files.");
      }
    } finally {
      setExtracting(false);
      if (extractRef.current) extractRef.current.value = "";
    }
  }

  async function submit() {
    if (!values.name || !values.country || !values.city) {
      toast.error("Name, country and city are required.");
      return;
    }
    if (shares.length > 0 && Math.abs(shareTotal - 100) > 0.01) {
      toast.error(`Ownership shares must sum to 100% (currently ${shareTotal}%).`);
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: values.name,
        type: values.type,
        status: values.status,
        occupancy: values.occupancy,
        currency: values.currency || "EUR",
        purchasePrice: values.purchasePrice || null,
        currentValue: values.currentValue || null,
        country: values.country,
        city: values.city,
        addressLine: values.addressLine || null,
        postalCode: values.postalCode || null,
        lat: values.lat ? Number(values.lat) : null,
        lng: values.lng ? Number(values.lng) : null,
        sizeSqm: values.sizeSqm ? Number(values.sizeSqm) : null,
        yearBuilt: values.yearBuilt ? Number(values.yearBuilt) : null,
        floors: values.floors ? Number(values.floors) : null,
        units: values.units ? Number(values.units) : null,
        description: values.description || null,
        notes: values.notes || null,
      };

      const res = await fetch(
        isEdit ? `/api/v1/properties/${initial!.id}` : "/api/v1/properties",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Could not save the property.");
        return;
      }

      const propertyId = isEdit ? initial!.id : data.property.id;
      if (shares.length > 0) {
        const ownersRes = await fetch(
          `/api/v1/properties/${propertyId}/owners`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ owners: shares }),
          },
        );
        if (!ownersRes.ok) {
          const od = await ownersRes.json();
          toast.error(od.message ?? "Property saved, but owners failed.");
        }
      }

      // §6.3 v3: optional wizard sections become real records post-create.
      if (!isEdit) {
        const today = new Date().toISOString().slice(0, 10);
        const currency = values.currency || "EUR";
        const records: Array<[string, object]> = [
          ...payments
            .filter((p) => p.amount && p.paidOn)
            .map((p): [string, object] => [
              "payments",
              {
                kind: p.kind,
                amount: p.amount,
                currency,
                paidOn: p.paidOn,
                milestoneLabel: p.milestoneLabel || null,
              },
            ]),
          ...installments
            .filter((i) => i.label && i.dueDate && i.amount)
            .map((i): [string, object] => [
              "installments",
              { label: i.label, dueDate: i.dueDate, amount: i.amount, currency },
            ]),
          ...expenses
            .filter((e) => e.amount)
            .map((e): [string, object] => [
              "expenses",
              {
                category: e.category,
                amount: e.amount,
                currency,
                spentOn: today,
                recurring: e.recurring,
              },
            ]),
        ];
        if (lease.tenantName && lease.rentAmount && lease.startDate) {
          records.push([
            "leases",
            {
              tenantName: lease.tenantName,
              rentAmount: lease.rentAmount,
              currency,
              frequency: lease.frequency,
              startDate: lease.startDate,
              depositAmount: lease.depositAmount || null,
            },
          ]);
        }
        if (values.status !== "completed" && construction.progressPct !== "") {
          records.push([
            "construction-updates",
            {
              updateDate: today,
              progressPct: Number(construction.progressPct),
              note: construction.note || null,
            },
          ]);
        }

        let failures = 0;
        for (const [resource, body] of records) {
          const res = await fetch(
            `/api/v1/properties/${propertyId}/${resource}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            },
          );
          if (!res.ok) failures += 1;
        }
        if (failures > 0) {
          toast.warning(
            `Property saved, but ${failures} record${failures === 1 ? "" : "s"} could not be added. Add them on the property page.`,
          );
        }
      }

      toast.success(isEdit ? "Property updated." : "Property added.");
      onOpenChange(false);
      if (!isEdit) {
        setValues(EMPTY);
        setPayments([]);
        setInstallments([]);
        setExpenses([]);
        setLease(EMPTY_LEASE);
        setConstruction({ progressPct: "", note: "" });
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90svh] overflow-y-auto sm:max-w-2xl"
        // §16: keep the focused input visible above the on-screen keyboard.
        onFocusCapture={(e) => {
          const el = e.target as HTMLElement;
          if (el.matches("input, textarea, select")) {
            setTimeout(
              () => el.scrollIntoView({ block: "center", behavior: "smooth" }),
              120,
            );
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit property" : "Add property"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the property details."
              : "Details, location, ownership and financial basics."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!isEdit && (
            <section className="rounded-xl border border-dashed bg-muted/40 p-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <Sparkles className="size-4 text-primary" aria-hidden />
                    Autofill from documents
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Optional: upload listing screenshots, photos or PDFs. AI
                    drafts the fields below for your review. Nothing is saved
                    until you submit.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={extracting}
                  onClick={() => extractRef.current?.click()}
                >
                  {extracting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Sparkles className="size-4" aria-hidden />
                  )}
                  {extracting ? "Reading documents" : "Choose files"}
                </Button>
                <input
                  ref={extractRef}
                  type="file"
                  hidden
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  onChange={(e) => e.target.files && autofill(e.target.files)}
                />
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Basics
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                {field("name", "Name *", { placeholder: "Kreuzberg Apartment" })}
              </div>
              {selectField("type", "Type", Object.entries(TYPE_LABEL))}
              {selectField("status", "Status", Object.entries(STATUS_LABEL))}
              {selectField(
                "occupancy",
                "Occupancy",
                Object.entries(OCCUPANCY_LABEL).map(([v, l]) => [
                  v,
                  v === "n/a" ? "Not applicable" : l,
                ]),
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-description">Description</Label>
              <Textarea
                id="pf-description"
                value={values.description}
                onChange={(e) => set("description")(e.target.value)}
                rows={3}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Specifications
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {field("sizeSqm", "Size (m²)", { inputMode: "decimal" })}
              {field("yearBuilt", "Year built", { inputMode: "numeric" })}
              {field("floors", "Floors", { inputMode: "numeric" })}
              {field("units", "Units", { inputMode: "numeric" })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Location
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {field("country", "Country *", { placeholder: "Germany" })}
              {field("city", "City *", { placeholder: "Berlin" })}
              <div className="sm:col-span-2">
                {field("addressLine", "Address", {
                  placeholder: "Street and number",
                })}
              </div>
              {field("postalCode", "Postal code")}
              <div className="grid grid-cols-2 gap-3">
                {field("lat", "Latitude", { inputMode: "decimal" })}
                {field("lng", "Longitude", { inputMode: "decimal" })}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: paste coordinates from Google Maps (right-click a spot →
              copy). A draggable map pin appears on the property page.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Financial basics
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {field("currency", "Currency", { placeholder: "EUR", maxLength: 3 })}
              {field("purchasePrice", "Purchase price", { inputMode: "decimal" })}
              {field("currentValue", "Current value", { inputMode: "decimal" })}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Owners & shares
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  setShares((s) => [
                    ...s,
                    {
                      ownerId: owners[0]?.id ?? "",
                      sharePct: Math.max(0, 100 - shareTotal),
                      isLegalOwner: s.length === 0,
                    },
                  ])
                }
                disabled={owners.length === 0}
              >
                <Plus className="size-3.5" aria-hidden />
                Add owner
              </Button>
            </div>
            {owners.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Create owners on the Owners page first.
              </p>
            )}
            {shares.map((share, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-2 rounded-lg border p-2.5"
              >
                <Select
                  value={share.ownerId}
                  onValueChange={(v) =>
                    setShares((s) =>
                      s.map((row, j) => (j === i ? { ...row, ownerId: v } : row)),
                    )
                  }
                >
                  <SelectTrigger className="w-44" aria-label="Owner">
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                  <Input
                    className="w-20 tabular-numbers"
                    inputMode="decimal"
                    value={share.sharePct || ""}
                    aria-label="Share percent"
                    onChange={(e) =>
                      setShares((s) =>
                        s.map((row, j) =>
                          j === i
                            ? { ...row, sharePct: parseFloat(e.target.value) || 0 }
                            : row,
                        ),
                      )
                    }
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={share.isLegalOwner}
                    onCheckedChange={(checked) =>
                      setShares((s) =>
                        s.map((row, j) =>
                          j === i ? { ...row, isLegalOwner: checked } : row,
                        ),
                      )
                    }
                  />
                  On paper
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  aria-label="Remove owner"
                  onClick={() => setShares((s) => s.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
            {shares.length > 0 && (
              <p
                className={
                  Math.abs(shareTotal - 100) < 0.01
                    ? "text-sm text-muted-foreground"
                    : "text-sm font-medium text-destructive"
                }
              >
                Shares total: {shareTotal}% {Math.abs(shareTotal - 100) < 0.01 ? "✓" : "(must be 100%)"}
              </p>
            )}
          </section>

          {!isEdit && (
            <>
              <OptionalSection
                title="Payments made"
                hint="Down payments, fees, taxes"
              >
                {payments.map((p, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 items-end gap-2 rounded-lg border p-2.5 sm:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">Kind</Label>
                      <Select
                        value={p.kind}
                        onValueChange={(v) =>
                          setPayments((s) =>
                            s.map((row, j) => (j === i ? { ...row, kind: v } : row)),
                          )
                        }
                      >
                        <SelectTrigger aria-label="Payment kind">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PAYMENT_KIND_LABEL).map(([v, l]) => (
                            <SelectItem key={v} value={v}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Amount ({values.currency})</Label>
                      <Input
                        inputMode="decimal"
                        enterKeyHint="done"
                        value={p.amount}
                        onChange={(e) =>
                          setPayments((s) =>
                            s.map((row, j) =>
                              j === i ? { ...row, amount: e.target.value } : row,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Paid on</Label>
                      <Input
                        type="date"
                        enterKeyHint="done"
                        value={p.paidOn}
                        onChange={(e) =>
                          setPayments((s) =>
                            s.map((row, j) =>
                              j === i ? { ...row, paidOn: e.target.value } : row,
                            ),
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove payment"
                      onClick={() =>
                        setPayments((s) => s.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    setPayments((s) => [
                      ...s,
                      { kind: "down_payment", amount: "", paidOn: "", milestoneLabel: "" },
                    ])
                  }
                >
                  <Plus className="size-3.5" aria-hidden />
                  Add payment
                </Button>
              </OptionalSection>

              <OptionalSection
                title="Installment schedule"
                hint="Milestones and due dates"
              >
                {installments.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 items-end gap-2 rounded-lg border p-2.5 sm:grid-cols-[1.4fr_1fr_1fr_auto]"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">Milestone</Label>
                      <Input
                        enterKeyHint="done"
                        placeholder="Foundation complete"
                        value={row.label}
                        onChange={(e) =>
                          setInstallments((s) =>
                            s.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)),
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Due date</Label>
                      <Input
                        type="date"
                        enterKeyHint="done"
                        value={row.dueDate}
                        onChange={(e) =>
                          setInstallments((s) =>
                            s.map((r, j) => (j === i ? { ...r, dueDate: e.target.value } : r)),
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Amount ({values.currency})</Label>
                      <Input
                        inputMode="decimal"
                        enterKeyHint="done"
                        value={row.amount}
                        onChange={(e) =>
                          setInstallments((s) =>
                            s.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)),
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove installment"
                      onClick={() =>
                        setInstallments((s) => s.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    setInstallments((s) => [
                      ...s,
                      { label: "", dueDate: "", amount: "" },
                    ])
                  }
                >
                  <Plus className="size-3.5" aria-hidden />
                  Add installment
                </Button>
              </OptionalSection>

              <OptionalSection title="Lease" hint="Tenant and rent">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tenant name</Label>
                    <Input
                      enterKeyHint="done"
                      value={lease.tenantName}
                      onChange={(e) =>
                        setLease((l) => ({ ...l, tenantName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rent ({values.currency})</Label>
                    <Input
                      inputMode="decimal"
                      enterKeyHint="done"
                      value={lease.rentAmount}
                      onChange={(e) =>
                        setLease((l) => ({ ...l, rentAmount: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Frequency</Label>
                    <Select
                      value={lease.frequency}
                      onValueChange={(v) => setLease((l) => ({ ...l, frequency: v }))}
                    >
                      <SelectTrigger aria-label="Rent frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Start date</Label>
                    <Input
                      type="date"
                      enterKeyHint="done"
                      value={lease.startDate}
                      onChange={(e) =>
                        setLease((l) => ({ ...l, startDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Deposit (optional)</Label>
                    <Input
                      inputMode="decimal"
                      enterKeyHint="done"
                      value={lease.depositAmount}
                      onChange={(e) =>
                        setLease((l) => ({ ...l, depositAmount: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Past and future start dates are both fine. The lease is saved
                  only when tenant, rent and start date are filled in.
                </p>
              </OptionalSection>

              {values.status !== "completed" && (
                <OptionalSection
                  title="Construction status"
                  hint="Progress so far"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Progress (%)</Label>
                      <Input
                        inputMode="numeric"
                        enterKeyHint="done"
                        value={construction.progressPct}
                        onChange={(e) =>
                          setConstruction((c) => ({
                            ...c,
                            progressPct: e.target.value.replace(/\D/g, "").slice(0, 3),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Note (optional)</Label>
                      <Input
                        enterKeyHint="done"
                        placeholder="Facade started"
                        value={construction.note}
                        onChange={(e) =>
                          setConstruction((c) => ({ ...c, note: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </OptionalSection>
              )}

              <OptionalSection
                title="Recurring expenses"
                hint="Taxes, insurance, fees"
              >
                {expenses.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 items-end gap-2 rounded-lg border p-2.5 sm:grid-cols-[1.2fr_1fr_auto_auto]"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">Category</Label>
                      <Select
                        value={row.category}
                        onValueChange={(v) =>
                          setExpenses((s) =>
                            s.map((r, j) => (j === i ? { ...r, category: v } : r)),
                          )
                        }
                      >
                        <SelectTrigger aria-label="Expense category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(EXPENSE_CATEGORY_LABEL).map(([v, l]) => (
                            <SelectItem key={v} value={v}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Amount ({values.currency})</Label>
                      <Input
                        inputMode="decimal"
                        enterKeyHint="done"
                        value={row.amount}
                        onChange={(e) =>
                          setExpenses((s) =>
                            s.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)),
                          )
                        }
                      />
                    </div>
                    <label className="flex items-center gap-2 pb-2 text-sm">
                      <Switch
                        checked={row.recurring}
                        onCheckedChange={(checked) =>
                          setExpenses((s) =>
                            s.map((r, j) => (j === i ? { ...r, recurring: checked } : r)),
                          )
                        }
                      />
                      Monthly
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove expense"
                      onClick={() => setExpenses((s) => s.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    setExpenses((s) => [
                      ...s,
                      { category: "maintenance", amount: "", recurring: true },
                    ])
                  }
                >
                  <Plus className="size-3.5" aria-hidden />
                  Add expense
                </Button>
              </OptionalSection>

              <OptionalSection title="Notes" hint="Anything worth remembering">
                <Textarea
                  aria-label="Notes"
                  rows={3}
                  value={values.notes}
                  onChange={(e) => set("notes")(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Photos, documents and contacts can be added on the property
                  page right after saving.
                </p>
              </OptionalSection>
            </>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="gap-2">
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {isEdit ? "Save changes" : "Add property"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
