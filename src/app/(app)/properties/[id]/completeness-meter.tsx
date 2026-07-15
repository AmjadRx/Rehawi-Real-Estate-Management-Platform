"use client";

import { CircleCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { computeCompleteness } from "@/lib/completeness";
import type { PropertyDetail } from "@/lib/property-detail";

/**
 * Profile completeness meter (§6.3 v4): % complete plus a plain read-only
 * list of the missing fields.
 */
export function CompletenessMeter({ detail }: { detail: PropertyDetail }) {
  const { pct, done, total, missing } = computeCompleteness(detail);

  if (missing.length === 0) {
    return (
      <section className="flex items-center gap-2.5 rounded-2xl border bg-card px-4 py-3 shadow-sm">
        <CircleCheck className="size-5 text-primary" aria-hidden />
        <p className="text-sm font-medium">
          Profile complete: every field is provided.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Profile completeness</h3>
        <span className="text-sm font-semibold tabular-numbers text-primary">
          {pct}%
        </span>
      </div>
      <Progress value={pct} className="mt-2" aria-label={`Profile ${pct}% complete`} />
      <p className="mt-2 text-xs text-muted-foreground">
        {done} of {total} fields provided. Missing:
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {missing.map((m) => (
          <span
            key={m.key}
            className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground"
          >
            {m.label}
          </span>
        ))}
      </div>
    </section>
  );
}
