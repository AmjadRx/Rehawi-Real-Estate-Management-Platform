"use client";

import {
  ArrowLeft,
  Banknote,
  FileText,
  Globe,
  Landmark,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  UserRound,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

interface OwnerData {
  id: string;
  kind: string;
  name: string;
  isFamily: boolean;
  email: string | null;
  phones: string[];
  socialLinks: Record<string, string>;
  /** null for viewers: the API never sends bank details to them. */
  bankDetails: Record<string, string> | null;
  notes: string | null;
}

export function OwnerProfile({
  owner,
  properties,
  documents,
  isAdmin,
}: {
  owner: OwnerData;
  properties: Array<{
    id: string;
    name: string;
    city: string;
    country: string;
    sharePct: number;
    isLegalOwner: boolean;
  }>;
  documents: Array<{
    id: string;
    filename: string;
    category: string;
    mime: string;
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
        form.set("ownerId", owner.id);
        form.set(
          "category",
          file.type.startsWith("image/") ? "id_document" : "contract",
        );
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
          href="/owners"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Owners
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {owner.kind === "company" ? (
                <Landmark className="size-6" aria-hidden />
              ) : (
                <UserRound className="size-6" aria-hidden />
              )}
            </div>
            <div>
              <h1 className="text-2xl">{owner.name}</h1>
              <div className="mt-1 flex gap-1.5">
                <Badge variant="secondary" className="capitalize">
                  {owner.kind}
                </Badge>
                {owner.isFamily && <Badge>Family</Badge>}
              </div>
            </div>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" aria-hidden />
              Edit profile
            </Button>
          )}
        </div>
      </FadeIn>

      <div className="grid gap-4 md:grid-cols-2">
        <FadeIn delay={0.05} className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
          <h2 className="mb-3 text-base font-semibold">Contact</h2>
          <ul className="space-y-2.5 text-sm">
            {owner.email && (
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" aria-hidden />
                <a href={`mailto:${owner.email}`} className="underline-offset-4 hover:underline">
                  {owner.email}
                </a>
              </li>
            )}
            {owner.phones.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" aria-hidden />
                <a href={`tel:${p}`} className="tabular-numbers underline-offset-4 hover:underline">
                  {p}
                </a>
              </li>
            ))}
            {Object.entries(owner.socialLinks).map(([label, url]) => (
              <li key={label} className="flex items-center gap-2">
                <Globe className="size-4 text-muted-foreground" aria-hidden />
                <a href={url} target="_blank" rel="noreferrer" className="capitalize underline-offset-4 hover:underline">
                  {label}
                </a>
              </li>
            ))}
            {!owner.email && owner.phones.length === 0 && Object.keys(owner.socialLinks).length === 0 && (
              <li className="text-muted-foreground">No contact details yet.</li>
            )}
          </ul>
          {owner.notes && (
            <p className="mt-4 border-t pt-3 text-sm leading-relaxed text-muted-foreground">
              {owner.notes}
            </p>
          )}
        </FadeIn>

        {owner.bankDetails !== null && (
          <FadeIn delay={0.1} className="rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-sm md:p-5">
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
              <Banknote className="size-4" aria-hidden />
              Bank details
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Visible to admins only. Viewers never receive this data.
            </p>
            {Object.keys(owner.bankDetails).length === 0 ? (
              <p className="text-sm text-muted-foreground">None recorded.</p>
            ) : (
              <dl className="space-y-2 text-sm">
                {Object.entries(owner.bankDetails).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4">
                    <dt className="capitalize text-muted-foreground">{key}</dt>
                    <dd className="text-right font-medium tabular-numbers">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </FadeIn>
        )}
      </div>

      <FadeIn delay={0.15} className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
        <h2 className="mb-3 text-base font-semibold">Properties and shares</h2>
        {properties.length === 0 ? (
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            No property shares yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/properties/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                      {p.name}
                    </Link>
                    {p.isLegalOwner && (
                      <Badge variant="outline" className="ml-2">On paper</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.city}, {p.country}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-numbers">
                    {p.sharePct}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FadeIn>

      <FadeIn
        delay={0.2}
        className="rounded-2xl border bg-card p-4 shadow-sm md:p-5"
      >
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
            No documents linked to this owner.
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
        <EditOwnerDialog owner={owner} open={editOpen} onOpenChange={setEditOpen} />
      )}
    </div>
  );
}

function EditOwnerDialog({
  owner,
  open,
  onOpenChange,
}: {
  owner: OwnerData;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: owner.name,
    isFamily: owner.isFamily,
    email: owner.email ?? "",
    phones: owner.phones.join(", "),
    social: Object.entries(owner.socialLinks)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n"),
    bank: Object.entries(owner.bankDetails ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n"),
    notes: owner.notes ?? "",
  });

  function parsePairs(text: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (key && value) out[key] = value;
      }
    }
    return out;
  }

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/owners/${owner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          isFamily: form.isFamily,
          email: form.email || null,
          phones: form.phones
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
          socialLinks: parsePairs(form.social),
          bankDetails: parsePairs(form.bank),
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(
          data.issues?.[0]
            ? `${data.issues[0].path}: ${data.issues[0].message}`
            : (data.message ?? "Could not save."),
        );
        return;
      }
      toast.success("Owner profile saved.");
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit owner profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="eo-name">Name</Label>
            <Input
              id="eo-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.isFamily}
              onCheckedChange={(c) => setForm((f) => ({ ...f, isFamily: c }))}
            />
            Part of the family profile
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="eo-email">Email</Label>
            <Input
              id="eo-email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eo-phones">Phones (comma separated)</Label>
            <Input
              id="eo-phones"
              value={form.phones}
              onChange={(e) => setForm((f) => ({ ...f, phones: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eo-social">Social links (one per line, name: url)</Label>
            <Textarea
              id="eo-social"
              rows={2}
              placeholder={"instagram: https://instagram.com/name"}
              value={form.social}
              onChange={(e) => setForm((f) => ({ ...f, social: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eo-bank">Bank details (one per line, label: value)</Label>
            <Textarea
              id="eo-bank"
              rows={3}
              placeholder={"iban: DE00 0000 0000 0000\nbank: Deutsche Bank"}
              value={form.bank}
              onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Only admins can see these values.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eo-notes">Notes</Label>
            <Textarea
              id="eo-notes"
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
