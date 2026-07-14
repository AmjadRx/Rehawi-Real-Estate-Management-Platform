"use client";

import { AnimatedNumber } from "@/components/motion-primitives";
import { cn } from "@/lib/utils";

/**
 * Headline figure card. Numbers count up on first view; the caption keeps
 * units and context explicit for readability.
 */
export function StatCard({
  label,
  value,
  format,
  caption,
  emphasis = false,
  className,
}: {
  label: string;
  value: number | string;
  format?: (n: number) => string;
  caption?: string;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm md:p-5",
        emphasis && "border-primary/30 bg-primary/5",
        className,
      )}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-2xl font-semibold tabular-numbers md:text-[1.7rem]",
          emphasis && "text-primary",
        )}
      >
        {typeof value === "number" ? (
          <AnimatedNumber value={value} format={format} />
        ) : (
          value
        )}
      </p>
      {caption && (
        <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
      )}
    </div>
  );
}
