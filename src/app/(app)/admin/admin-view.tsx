"use client";

import {
  BellPlus,
  Check,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FadeIn } from "@/components/motion-primitives";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

interface Rate {
  currency: string;
  rateToEur: string;
  source: string;
  updatedAt: string;
}

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  at: string;
}

interface Reminder {
  id: string;
  kind: string;
  dueDate: string;
  message: string;
  resolved: boolean;
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

interface AdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: string;
  passwordSet: boolean;
  lastLoginAt: string | null;
}

export function AdminView({
  baseCurrency,
  allowlist,
  rates,
  audit,
  reminders,
  users,
}: {
  baseCurrency: string;
  allowlist: {
    emails: string[];
    phones: string[];
    adminEmails: string[];
    adminPhones: string[];
  };
  rates: Rate[];
  audit: AuditRow[];
  reminders: Reminder[];
  users: AdminUser[];
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [override, setOverride] = useState({ currency: "", rate: "" });
  const [newReminder, setNewReminder] = useState({ dueDate: "", message: "" });
  const [auditFilter, setAuditFilter] = useState("all");
  const [base, setBase] = useState(baseCurrency);

  const entityTypes = useMemo(
    () => [...new Set(audit.map((a) => a.entityType))].sort(),
    [audit],
  );
  const filteredAudit =
    auditFilter === "all"
      ? audit
      : audit.filter((a) => a.entityType === auditFilter);

  async function run(key: string, fn: () => Promise<Response>, okMsg: string) {
    setBusyKey(key);
    try {
      const res = await fn();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Request failed.");
        return;
      }
      toast.success(okMsg);
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <FadeIn>
        <h1 className="text-2xl md:text-3xl">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Access, rates, audit trail and reminders.
        </p>
      </FadeIn>

      <div className="grid gap-4 lg:grid-cols-2">
        <FadeIn delay={0.05}>
          <Section
            title="Allowlist"
            description="Who can sign in. Managed in Vercel → Settings → Environment Variables (ALLOWED_/ADMIN_ EMAILS & PHONES); a redeploy applies changes, and removal locks a member out on their next request."
          >
            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1.5 font-medium">Admins</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...allowlist.adminEmails, ...allowlist.adminPhones].map(
                    (v) => (
                      <Badge key={v} className="gap-1">
                        <ShieldCheck className="size-3" aria-hidden />
                        {v}
                      </Badge>
                    ),
                  )}
                </div>
              </div>
              <div>
                <p className="mb-1.5 font-medium">Viewers & members</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...allowlist.emails, ...allowlist.phones].length === 0 ? (
                    <span className="text-muted-foreground">None listed</span>
                  ) : (
                    [...allowlist.emails, ...allowlist.phones].map((v) => (
                      <Badge key={v} variant="secondary">
                        {v}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 border-t pt-3">
              <p className="mb-1.5 text-sm font-medium">Accounts & passwords</p>
              <p className="mb-2 text-xs text-muted-foreground">
                Forgotten password (§3.2 v4): clear the hash, then the member
                repeats first-time setup with the family setup code.
              </p>
              <ul className="space-y-1.5">
                {users.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    No accounts yet. They appear after first sign-in or setup.
                  </li>
                )}
                {users.map((u) => (
                  <li
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">
                        {u.email ?? u.phone ?? u.name ?? u.id.slice(0, 8)}
                      </span>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {u.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {u.passwordSet ? "password set" : "no password"}
                      </span>
                    </span>
                    {u.passwordSet && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyKey === `clearpw-${u.id}`}
                        onClick={() =>
                          run(
                            `clearpw-${u.id}`,
                            () =>
                              fetch(`/api/v1/users/${u.id}/clear-password`, {
                                method: "POST",
                              }),
                            "Password cleared. They can redo setup with the family code.",
                          )
                        }
                      >
                        Clear password
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </Section>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Section
            title="Base currency"
            description="All portfolio figures convert to this currency for display. Original amounts are never modified."
          >
            <div className="flex items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="base-currency">Currency code</Label>
                <Input
                  id="base-currency"
                  value={base}
                  onChange={(e) => setBase(e.target.value.toUpperCase())}
                  maxLength={3}
                  className="w-28 uppercase tabular-numbers"
                />
              </div>
              <Button
                disabled={busyKey === "base" || base.length !== 3}
                className="gap-2"
                onClick={() =>
                  run(
                    "base",
                    () =>
                      fetch("/api/v1/settings", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ baseCurrency: base }),
                      }),
                    `Base currency set to ${base}.`,
                  )
                }
              >
                {busyKey === "base" && (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                )}
                Save
              </Button>
            </div>
          </Section>
        </FadeIn>
      </div>

      <FadeIn delay={0.15}>
        <Section
          title="Exchange rates"
          description="Refreshed daily by Vercel Cron from open.er-api.com. Manual overrides (e.g. SYP) are never overwritten by the feed."
          action={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={busyKey === "refresh"}
              onClick={() =>
                run(
                  "refresh",
                  () => fetch("/api/v1/rates/refresh", { method: "POST" }),
                  "Rates refreshed.",
                )
              }
            >
              {busyKey === "refresh" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-4" aria-hidden />
              )}
              Refresh now
            </Button>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Rate → EUR</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.currency}>
                  <TableCell className="font-medium">{rate.currency}</TableCell>
                  <TableCell className="text-right tabular-numbers">
                    {parseFloat(rate.rateToEur).toPrecision(6)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={rate.source === "manual" ? "default" : "secondary"}
                    >
                      {rate.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(rate.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="ov-currency">Currency</Label>
              <Input
                id="ov-currency"
                placeholder="SYP"
                maxLength={3}
                className="w-24 uppercase"
                value={override.currency}
                onChange={(e) =>
                  setOverride((o) => ({
                    ...o,
                    currency: e.target.value.toUpperCase(),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ov-rate">Rate to EUR</Label>
              <Input
                id="ov-rate"
                placeholder="0.00007"
                inputMode="decimal"
                className="w-36 tabular-numbers"
                value={override.rate}
                onChange={(e) =>
                  setOverride((o) => ({ ...o, rate: e.target.value }))
                }
              />
            </div>
            <Button
              variant="outline"
              disabled={
                busyKey === "override" ||
                override.currency.length !== 3 ||
                !parseFloat(override.rate)
              }
              onClick={() =>
                run(
                  "override",
                  () =>
                    fetch("/api/v1/rates", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        currency: override.currency,
                        rateToEur: parseFloat(override.rate),
                      }),
                    }),
                  `Manual rate saved for ${override.currency}.`,
                )
              }
            >
              Set manual override
            </Button>
          </div>
        </Section>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Section
          title="Reminders"
          description="Installment and lease reminders are generated daily by cron; custom ones can be added here."
          action={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={busyKey === "generate"}
              onClick={() =>
                run(
                  "generate",
                  () => fetch("/api/v1/reminders/generate", { method: "POST" }),
                  "Reminder generation complete.",
                )
              }
            >
              {busyKey === "generate" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <BellPlus className="size-4" aria-hidden />
              )}
              Generate now
            </Button>
          }
        >
          <ul className="space-y-2">
            {reminders.length === 0 && (
              <li className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                No reminders.
              </li>
            )}
            {reminders.map((reminder) => (
              <li
                key={reminder.id}
                className="flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5"
              >
                <div>
                  <p
                    className={`text-sm font-medium ${reminder.resolved ? "text-muted-foreground line-through" : ""}`}
                  >
                    {reminder.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(reminder.dueDate)} ·{" "}
                    {reminder.kind.replace(/_/g, " ")}
                  </p>
                </div>
                {!reminder.resolved && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    disabled={busyKey === reminder.id}
                    onClick={() =>
                      run(
                        reminder.id,
                        () =>
                          fetch(`/api/v1/reminders/${reminder.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ resolved: true }),
                          }),
                        "Reminder resolved.",
                      )
                    }
                  >
                    <Check className="size-4" aria-hidden />
                    Resolve
                  </Button>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="rem-date">Due date</Label>
              <Input
                id="rem-date"
                type="date"
                className="w-40"
                value={newReminder.dueDate}
                onChange={(e) =>
                  setNewReminder((r) => ({ ...r, dueDate: e.target.value }))
                }
              />
            </div>
            <div className="min-w-56 flex-1 space-y-1.5">
              <Label htmlFor="rem-message">Message</Label>
              <Input
                id="rem-message"
                placeholder="e.g. Renew building insurance"
                value={newReminder.message}
                onChange={(e) =>
                  setNewReminder((r) => ({ ...r, message: e.target.value }))
                }
              />
            </div>
            <Button
              variant="outline"
              disabled={
                busyKey === "addrem" ||
                !newReminder.dueDate ||
                !newReminder.message.trim()
              }
              onClick={() =>
                run(
                  "addrem",
                  () =>
                    fetch("/api/v1/reminders", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        kind: "custom",
                        dueDate: newReminder.dueDate,
                        message: newReminder.message,
                      }),
                    }),
                  "Reminder added.",
                )
              }
            >
              Add reminder
            </Button>
          </div>
        </Section>
      </FadeIn>

      <FadeIn delay={0.25}>
        <Section
          title="Audit log"
          description="Every create, update and delete, with who and when. Latest 100 entries."
          action={
            <Select value={auditFilter} onValueChange={setAuditFilter}>
              <SelectTrigger className="w-44" aria-label="Filter by entity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {entityTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="hidden md:table-cell">ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAudit.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(row.at).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {row.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">
                    {row.entityType.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="hidden max-w-40 truncate font-mono text-xs text-muted-foreground md:table-cell">
                    {row.entityId ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      </FadeIn>
    </div>
  );
}
