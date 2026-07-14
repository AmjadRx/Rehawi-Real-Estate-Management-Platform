"use client";

import { Globe2, List, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FadeIn } from "@/components/motion-primitives";
import { Badge } from "@/components/ui/badge";
import { PIN_LEGEND, type GlobePin } from "@/lib/globe";
import { STATUS_BADGE, STATUS_LABEL, TYPE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** three.js globe is client-only (§6.5): no SSR, graceful loading state. */
const GlobeCanvas = dynamic(() => import("./globe-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <Globe2 className="mr-2 size-5 animate-pulse" aria-hidden />
      Loading globe…
    </div>
  ),
});

function webglAvailable(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

const STATUS_FILTERS = [
  { value: "planned", label: "Planned" },
  { value: "under_construction", label: "Under construction" },
  { value: "completed", label: "Completed" },
] as const;

export function WorldMapView({ pins }: { pins: GlobePin[] }) {
  const [enabled, setEnabled] = useState<Set<string>>(
    () => new Set(STATUS_FILTERS.map((f) => f.value)),
  );
  const [forceList, setForceList] = useState(false);
  const hasWebgl = useMemo(webglAvailable, []);

  const visible = pins.filter((p) => enabled.has(p.status));
  const showGlobe = hasWebgl && !forceList;

  function toggle(status: string) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  return (
    <div className="relative h-[calc(100svh-8rem)] min-h-[480px] md:h-[calc(100svh-2rem)]">
      {showGlobe ? (
        <GlobeCanvas pins={visible} />
      ) : (
        <FallbackList pins={visible} />
      )}

      {/* Overlay: title + filters + legend (§6.5) */}
      <FadeIn className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-3 p-4 md:p-6">
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-xl bg-background/85 px-4 py-2.5 shadow-sm backdrop-blur">
            <h1 className="text-lg font-semibold">World Map</h1>
            <p className="text-xs text-muted-foreground">
              {visible.length} of {pins.length} assets shown
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => toggle(f.value)}
                aria-pressed={enabled.has(f.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition-colors",
                  enabled.has(f.value)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background/85 text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
            {hasWebgl && (
              <button
                type="button"
                onClick={() => setForceList((v) => !v)}
                className="rounded-full border bg-background/85 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur hover:text-foreground"
                aria-pressed={forceList}
              >
                <List className="mr-1 inline size-3.5" aria-hidden />
                {forceList ? "Globe view" : "List view"}
              </button>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl bg-background/85 p-3 shadow-sm backdrop-blur md:bottom-6 md:left-6">
        <p className="mb-2 text-xs font-semibold">Legend</p>
        <ul className="space-y-1.5">
          {PIN_LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-xs">
              <span
                className="size-2.5 rounded-full"
                style={{ background: item.color }}
                aria-hidden
              />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** 2D fallback when WebGL is unavailable (§6.5). */
function FallbackList({ pins }: { pins: GlobePin[] }) {
  return (
    <div className="mx-auto h-full w-full max-w-3xl overflow-y-auto px-4 pb-8 pt-28">
      <ul className="space-y-3">
        {pins.map((pin) => (
          <li key={pin.id}>
            <Link
              href={`/properties/${pin.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent"
            >
              <span className="flex items-center gap-3">
                <span
                  className="flex size-9 items-center justify-center rounded-full"
                  style={{ background: `${pin.color}22`, color: pin.color }}
                >
                  <MapPin className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block font-medium">{pin.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {pin.city}, {pin.country}
                  </span>
                </span>
              </span>
              <span className="flex gap-1.5">
                <Badge className={STATUS_BADGE[pin.status]}>
                  {STATUS_LABEL[pin.status]}
                </Badge>
                <Badge variant="secondary">{TYPE_LABEL[pin.type]}</Badge>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
