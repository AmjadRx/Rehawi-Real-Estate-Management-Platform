"use client";

import {
  Building2,
  Globe,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion-primitives";
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
import { CONTACT_ROLE_LABEL } from "@/lib/labels";

interface ContactCard {
  id: string;
  name: string;
  companyName: string | null;
  role: string;
  phones: string[];
  email: string | null;
  whatsapp: string | null;
  website: string | null;
  notes: string | null;
  properties: Array<{ id: string; name: string }>;
}

/** Role grouping order (§6.7). */
const GROUP_ORDER: Array<[string, string[]]> = [
  ["Developers & builders", ["developer", "builder"]],
  ["Representatives", ["representative"]],
  ["Property managers", ["property_manager"]],
  ["Trades", ["plumber", "electrician", "hvac"]],
  ["Utilities", ["utility"]],
  ["Legal", ["lawyer", "notary"]],
  ["Agents", ["agent"]],
  ["Insurance & accounting", ["insurance", "accountant"]],
  ["Tenants", ["tenant"]],
  ["Other", ["other"]],
];

export function DirectoryView({
  contacts,
  isAdmin,
}: {
  contacts: ContactCard[];
  isAdmin: boolean;
}) {
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.companyName?.toLowerCase().includes(q) ||
        CONTACT_ROLE_LABEL[c.role]?.toLowerCase().includes(q) ||
        c.properties.some((p) => p.name.toLowerCase().includes(q)),
    );
  }, [contacts, query]);

  const groups = GROUP_ORDER.map(([title, roles]) => ({
    title,
    items: filtered.filter((c) => roles.includes(c.role)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <FadeIn className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl">Directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {contacts.length} partner{contacts.length === 1 ? "" : "s"} and
            vendors across the portfolio
          </p>
        </div>
        {isAdmin && (
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Add contact
          </Button>
        )}
      </FadeIn>

      <FadeIn delay={0.05} className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, company, role or property…"
          className="pl-9"
          aria-label="Search contacts"
        />
      </FadeIn>

      {groups.length === 0 ? (
        <FadeIn className="rounded-2xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          No contacts match your search.
        </FadeIn>
      ) : (
        groups.map((group, gi) => (
          <FadeIn key={group.title} delay={0.05 * gi}>
            <h2 className="mb-3 text-base font-semibold">
              {group.title}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({group.items.length})
              </span>
            </h2>
            <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((contact) => (
                <StaggerItem key={contact.id}>
                  <div className="flex h-full flex-col rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{contact.name}</p>
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

                    {contact.phones.length > 0 && (
                      <p className="mt-2 text-sm tabular-numbers text-muted-foreground">
                        {contact.phones.join(" · ")}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {contact.phones[0] && (
                        <ActionChip
                          href={`tel:${contact.phones[0]}`}
                          icon={<Phone className="size-3" aria-hidden />}
                          label="Call"
                        />
                      )}
                      {contact.whatsapp && (
                        <ActionChip
                          href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                          icon={<MessageCircle className="size-3" aria-hidden />}
                          label="WhatsApp"
                          external
                        />
                      )}
                      {contact.email && (
                        <ActionChip
                          href={`mailto:${contact.email}`}
                          icon={<Mail className="size-3" aria-hidden />}
                          label="Email"
                        />
                      )}
                      {contact.website && (
                        <ActionChip
                          href={contact.website}
                          icon={<Globe className="size-3" aria-hidden />}
                          label="Website"
                          external
                        />
                      )}
                    </div>

                    {contact.properties.length > 0 && (
                      <div className="mt-auto flex flex-wrap gap-1.5 border-t pt-3 mt-3">
                        {contact.properties.map((p) => (
                          <Link
                            key={p.id}
                            href={`/properties/${p.id}`}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium hover:bg-accent"
                          >
                            <Building2 className="size-3" aria-hidden />
                            {p.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </FadeIn>
        ))
      )}

      {isAdmin && <AddContactDialog open={addOpen} onOpenChange={setAddOpen} />}
    </div>
  );
}

function ActionChip({
  href,
  icon,
  label,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent"
    >
      {icon}
      {label}
    </a>
  );
}

function AddContactDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    companyName: "",
    role: "other",
    phone: "",
    email: "",
    whatsapp: "",
  });

  async function submit() {
    if (!form.name.trim()) {
      toast.error("A name is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/v1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          companyName: form.companyName || null,
          role: form.role,
          phones: form.phone ? [form.phone] : [],
          email: form.email || null,
          whatsapp: form.whatsapp || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message ?? "Could not create the contact.");
        return;
      }
      toast.success("Contact added.");
      onOpenChange(false);
      setForm({ name: "", companyName: "", role: "other", phone: "", email: "", whatsapp: "" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const input = (key: keyof typeof form, label: string, placeholder = "") => (
    <div className="space-y-1.5">
      <Label htmlFor={`c-${key}`}>{label}</Label>
      <Input
        id={`c-${key}`}
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {input("name", "Name *")}
          {input("companyName", "Company")}
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
            >
              <SelectTrigger aria-label="Contact role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONTACT_ROLE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {input("phone", "Phone", "+971…")}
          {input("whatsapp", "WhatsApp", "+971…")}
          {input("email", "Email")}
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
