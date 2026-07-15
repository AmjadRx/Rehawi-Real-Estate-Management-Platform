"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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

export interface FieldDef {
  key: string;
  label: string;
  kind: "text" | "amount" | "date" | "select";
  options?: Array<[string, string]>;
  required?: boolean;
  defaultValue?: string;
}

/**
 * Compact admin "add record" dialog used for payments, installments,
 * income, expenses, leases and maintenance rows. POSTs to the property
 * sub-resource endpoint and refreshes the page data.
 */
export function AddRecordButton({
  propertyId,
  resource,
  title,
  fields,
  transform,
}: {
  propertyId: string;
  resource: string;
  title: string;
  fields: FieldDef[];
  transform?: (values: Record<string, string>) => Record<string, unknown>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? ""])),
  );

  async function submit() {
    for (const f of fields) {
      if (f.required && !values[f.key]) {
        toast.error(`${f.label} is required.`);
        return;
      }
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = transform
        ? transform(values)
        : { ...values };
      for (const [k, v] of Object.entries(payload)) {
        if (v === "") payload[k] = undefined;
      }
      const res = await fetch(
        `/api/v1/properties/${propertyId}/${resource}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(
          data.issues?.[0]
            ? `${data.issues[0].path}: ${data.issues[0].message}`
            : (data.message ?? "Could not save."),
        );
        return;
      }
      toast.success(`${title} added.`);
      setOpen(false);
      setValues(
        Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? ""])),
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3.5" aria-hidden />
        {title}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[90svh] overflow-y-auto sm:max-w-md"
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
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={`ar-${f.key}`}>
                  {f.label}
                  {f.required ? " *" : ""}
                </Label>
                {f.kind === "select" ? (
                  <Select
                    value={values[f.key]}
                    onValueChange={(v) =>
                      setValues((s) => ({ ...s, [f.key]: v }))
                    }
                  >
                    <SelectTrigger aria-label={f.label}>
                      <SelectValue placeholder={f.label} />
                    </SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map(([value, text]) => (
                        <SelectItem key={value} value={value}>
                          {text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`ar-${f.key}`}
                    type={f.kind === "date" ? "date" : "text"}
                    inputMode={f.kind === "amount" ? "decimal" : undefined}
                    enterKeyHint="done"
                    value={values[f.key]}
                    onChange={(e) =>
                      setValues((s) => ({ ...s, [f.key]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy} className="gap-2">
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
