"use client";

import {
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import type { PropertyDetail } from "@/lib/property-detail";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<string, string> = {
  contract: "Contracts",
  title_deed: "Title deeds",
  receipt: "Receipts",
  insurance: "Insurance",
  warranty: "Warranties",
  inspection: "Inspections",
  floor_plan: "Floor plans",
  permit: "Permits",
  photo: "Photos",
  id_document: "ID documents",
  other: "Other",
};

export function DocumentsPanel({
  detail,
  canEdit,
}: {
  detail: PropertyDetail;
  canEdit: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("photo");
  const [asCover, setAsCover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState<{
    id: string;
    filename: string;
  } | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");

  // §4 v4: link-type documents, a pasted URL rendered as a hyperlink.
  async function addLink() {
    if (!linkUrl.trim() || !linkName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/v1/properties/${detail.property.id}/documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            filename: linkName.trim(),
            externalUrl: linkUrl.trim(),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Could not save the link.");
        return;
      }
      toast.success("Link added.");
      setLinkUrl("");
      setLinkName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function upload(files: FileList | File[]) {
    if (!files.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("file", file);
        form.set("category", category);
        form.set("propertyId", detail.property.id);
        if (asCover && file.type.startsWith("image/")) {
          form.set("isCover", "true");
        }
        const res = await fetch("/api/v1/uploads", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(`${file.name}: ${data.message ?? "upload failed"}`);
        } else {
          toast.success(`${file.name} uploaded.`);
        }
      }
      router.refresh();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: string, filename: string) {
    const res = await fetch(`/api/v1/files/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`${filename} moved to trash (admin can purge).`);
      router.refresh();
    } else {
      toast.error("Could not delete the file.");
    }
  }

  const grouped = new Map<string, PropertyDetail["documents"]>();
  for (const doc of detail.documents) {
    const list = grouped.get(doc.category) ?? [];
    list.push(doc);
    grouped.set(doc.category, list);
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div
          className={cn(
            "rounded-2xl border-2 border-dashed bg-card p-6 text-center transition-colors",
            dragOver && "border-primary bg-primary/5",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            upload(e.dataTransfer.files);
          }}
        >
          <UploadCloud
            className="mx-auto size-8 text-muted-foreground"
            aria-hidden
          />
          <p className="mt-2 font-medium">
            Drag & drop files here, or{" "}
            <button
              type="button"
              className="text-primary underline underline-offset-4"
              onClick={() => inputRef.current?.click()}
            >
              browse
            </button>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Images, PDF, DOCX, XLSX · up to 25 MB each
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-44" aria-label="Document category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={asCover}
                onChange={(e) => setAsCover(e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              Use as cover photo
            </label>
            {busy && (
              <Loader2
                className="size-4 animate-spin text-muted-foreground"
                aria-label="Uploading"
              />
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept="image/*,.pdf,.docx,.xlsx"
            onChange={(e) => e.target.files && upload(e.target.files)}
          />
          <div className="mt-4 border-t pt-4">
            <p className="mb-2 flex items-center justify-center gap-1.5 text-sm font-medium">
              <Link2 className="size-4" aria-hidden />
              Or add a link instead
            </p>
            <div className="mx-auto flex max-w-xl flex-wrap items-end justify-center gap-2">
              <div className="min-w-40 flex-1 space-y-1 text-start">
                <Label htmlFor="doc-link-url" className="text-xs">
                  URL
                </Label>
                <Input
                  id="doc-link-url"
                  type="url"
                  placeholder="https://"
                  enterKeyHint="next"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>
              <div className="min-w-36 flex-1 space-y-1 text-start">
                <Label htmlFor="doc-link-name" className="text-xs">
                  Display name
                </Label>
                <Input
                  id="doc-link-name"
                  placeholder="Sales contract on Drive"
                  enterKeyHint="done"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={busy || !linkUrl.trim() || !linkName.trim()}
                onClick={addLink}
              >
                Add link
              </Button>
            </div>
          </div>
        </div>
      )}

      {detail.documents.length === 0 ? (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          No documents yet.
        </p>
      ) : (
        [...grouped.entries()].map(([cat, docs]) => (
          <section
            key={cat}
            className="rounded-2xl border bg-card p-4 shadow-sm md:p-5"
          >
            <h3 className="mb-3 text-base font-semibold">
              {CATEGORY_LABEL[cat]}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({docs.length})
              </span>
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {docs.map((doc) => {
                const isLink = doc.kind === "link";
                const isImage = !!doc.mime?.startsWith("image/");
                const openHref = isLink
                  ? (doc.externalUrl ?? "#")
                  : `/api/v1/files/${doc.id}`;
                return (
                  <li
                    key={doc.id}
                    className="group overflow-hidden rounded-xl border"
                  >
                    {isImage ? (
                      <button
                        type="button"
                        className="block h-32 w-full overflow-hidden bg-muted"
                        onClick={() =>
                          setLightbox({ id: doc.id, filename: doc.filename })
                        }
                        aria-label={`Preview ${doc.filename}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/v1/files/${doc.id}`}
                          alt={doc.filename}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <a
                        href={openHref}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-32 items-center justify-center bg-muted"
                        aria-label={`Open ${doc.filename}`}
                      >
                        {isLink ? (
                          <Link2
                            className="size-10 text-muted-foreground"
                            aria-hidden
                          />
                        ) : (
                          <FileText
                            className="size-10 text-muted-foreground"
                            aria-hidden
                          />
                        )}
                      </a>
                    )}
                    <div className="flex items-center justify-between gap-2 p-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {doc.filename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(doc.uploadedAt)} ·{" "}
                          {isLink
                            ? "Link"
                            : `${((doc.sizeBytes ?? 0) / 1024 / 1024).toFixed(1)} MB`}
                          {doc.isCover && (
                            <Badge variant="secondary" className="ml-1.5">
                              Cover
                            </Badge>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0">
                        <Button asChild variant="ghost" size="icon">
                          {isLink ? (
                            <a
                              href={openHref}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${doc.filename}`}
                            >
                              <ExternalLink className="size-4" aria-hidden />
                            </a>
                          ) : (
                            <a
                              href={`/api/v1/files/${doc.id}`}
                              download={doc.filename}
                              aria-label={`Download ${doc.filename}`}
                            >
                              <Download className="size-4" aria-hidden />
                            </a>
                          )}
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(doc.id, doc.filename)}
                            aria-label={`Delete ${doc.filename}`}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="size-4" aria-hidden />
              {lightbox?.filename}
            </DialogTitle>
          </DialogHeader>
          {lightbox && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/v1/files/${lightbox.id}`}
              alt={lightbox.filename}
              className="max-h-[70svh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
