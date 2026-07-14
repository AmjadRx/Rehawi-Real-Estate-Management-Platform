"use client";

import {
  ArrowLeft,
  Building2,
  Contact2,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FadeIn } from "@/components/motion-primitives";
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
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { CONTACT_ROLE_LABEL } from "@/lib/labels";

interface ContactData {
  id: string;
  name: string;
  companyName: string | null;
  role: string;
  phones: string[];
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
}

export function ContactProfile({
  contact,
  properties,
  documents,
  isAdmin,
}: {
  contact: ContactData;
  properties: Array<{
    id: string;
    name: string;
    city: string;
    country: string;
    relationshipNote: string | null;
  }>;
  documents: Array<{
    id: string;
    filename: string;
    category: string;
    uploadedAt: string;
  }>;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadDocs(files: FileList) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("file", file);
        form.set("contactId", contact.id);
        form.set("category", file.type.startsWith("image/") ? "photo" : "contract");
        const res = await fetch("/api/v1/uploads", { method: "POST", body: form });
        if (!res.ok) {
          const data = await res.json();
          toast.error(`${file.name}: ${data.message ?? "upload failed"}`);
        }
      }
      router.refresh();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <FadeIn className="space-y-4">
        <Link
          href="/directory"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Directory
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Contact2 className="size-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl">{contact.name}</h1>
              <div className="mt-1 flex items-center gap-1.5">
                <Badge variant="secondary">{CONTACT_ROLE_LABEL[contact.role]}</Badge>
                {contact.companyName && (
                  <span className="text-sm text-muted-foreground">
                    {contact.companyName}
                  </span>
                )}
              </div>
            </div>
          </div>
          {isAdmin && (
            <Button variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" aria-hidden />
              Edit contact
            </Button>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.05} className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
        <h2 className="mb-3 text-base font-semibold">Details</h2>
        <ul className="grid gap-2.5 text-sm sm:grid-cols-2">
          {contact.phones.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" aria-hidden />
              <a href={`tel:${p}`} className="tabular-numbers underline-offset-4 hover:underline">
                {p}
              </a>
            </li>
          ))}
          {contact.whatsapp && (
            <li className="flex items-center gap-2">
              <MessageCircle className="size-4 text-muted-foreground" aria-hidden />
              <a
                href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-4 hover:underline"
              >
                WhatsApp
              </a>
            </li>
          )}
          {contact.email && (
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" aria-hidden />
              <a href={`mailto:${contact.email}`} className="underline-offset-4 hover:underline">
                {contact.email}
              </a>
            </li>
          )}
          {contact.website && (
            <li className="flex items-center gap-2">
              <Globe className="size-4 text-muted-foreground" aria-hidden />
              <a href={contact.website} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                Website
              </a>
            </li>
          )}
          {contact.address && (
            <li className="flex items-center gap-2 sm:col-span-2">
              <MapPin className="size-4 text-muted-foreground" aria-hidden />
              {contact.address}
            </li>
          )}
        </ul>
        {contact.notes && (
          <p className="mt-4 border-t pt-3 text-sm leading-relaxed text-muted-foreground">
            {contact.notes}
          </p>
        )}
      </FadeIn>

      <FadeIn delay={0.1} className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
        <h2 className="mb-3 text-base font-semibold">Linked properties</h2>
        {properties.length === 0 ? (
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            Not linked to any property yet.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {properties.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/properties/${p.id}`}
                  className="flex items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-accent"
                >
                  <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span>
                    <span className="block text-sm font-medium">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.city}, {p.country}
                      {p.relationshipNote ? `: ${p.relationshipNote}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </FadeIn>

      <FadeIn delay={0.15} className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Documents</h2>
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="size-4" aria-hidden />
                )}
                Add document
              </Button>
              <input
                ref={fileRef}
                type="file"
                multiple
                hidden
                accept="image/*,.pdf,.docx,.xlsx"
                onChange={(e) => e.target.files && uploadDocs(e.target.files)}
              />
            </>
          )}
        </div>
        {documents.length === 0 ? (
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            No documents attached.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {documents.map((doc) => (
              <li key={doc.id}>
                <a
                  href={`/api/v1/files/${doc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent"
                >
                  <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{doc.filename}</span>
                    <span className="block text-xs capitalize text-muted-foreground">
                      {doc.category.replace(/_/g, " ")} · {formatDate(doc.uploadedAt)}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </FadeIn>

      {isAdmin && (
        <EditContactDialog contact={contact} open={editOpen} onOpenChange={setEditOpen} />
      )}
    </div>
  );
}

function EditContactDialog({
  contact,
  open,
  onOpenChange,
}: {
  contact: ContactData;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: contact.name,
    companyName: contact.companyName ?? "",
    role: contact.role,
    phones: contact.phones.join(", "),
    email: contact.email ?? "",
    whatsapp: contact.whatsapp ?? "",
    address: contact.address ?? "",
    website: contact.website ?? "",
    notes: contact.notes ?? "",
  });

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          companyName: form.companyName || null,
          role: form.role,
          phones: form.phones.split(",").map((p) => p.trim()).filter(Boolean),
          email: form.email || null,
          whatsapp: form.whatsapp || null,
          address: form.address || null,
          website: form.website || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message ?? "Could not save the contact.");
        return;
      }
      toast.success("Contact saved.");
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const input = (key: keyof typeof form, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`ec-${key}`}>{label}</Label>
      <Input
        id={`ec-${key}`}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {input("name", "Name")}
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
          {input("phones", "Phones (comma separated)")}
          {input("whatsapp", "WhatsApp")}
          {input("email", "Email")}
          {input("website", "Website")}
          {input("address", "Address")}
          <div className="space-y-1.5">
            <Label htmlFor="ec-notes">Notes</Label>
            <Textarea
              id="ec-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="gap-2">
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
