"use client";

import { ExternalLink, Loader2, MapPin, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PropertyDetail } from "@/lib/property-detail";

// MapLibre needs the browser; render client-side only.
const OsmMap = dynamic(
  () => import("@/components/osm-map").then((m) => m.OsmMap),
  { ssr: false },
);

/**
 * Location tab (§6.4): full-width MapLibre map on OpenStreetMap tiles
 * (free, no key). Admins drag the pin or edit coordinates; "Open in
 * Google Maps" stays a plain link.
 */
export function LocationPanel({
  detail,
  canEdit,
}: {
  detail: PropertyDetail;
  canEdit: boolean;
}) {
  const { property } = detail;
  const router = useRouter();
  const [lat, setLat] = useState(property.lat ?? "");
  const [lng, setLng] = useState(property.lng ?? "");
  const [busy, setBusy] = useState(false);

  const hasCoords = !!property.lat && !!property.lng;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${property.lat},${property.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [property.addressLine, property.city, property.country]
          .filter(Boolean)
          .join(", "),
      )}`;

  async function saveCoords(next?: { lat: number; lng: number }) {
    const latValue = next ? String(next.lat) : lat;
    const lngValue = next ? String(next.lng) : lng;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: latValue ? Number(latValue) : null,
          lng: lngValue ? Number(lngValue) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message ?? "Could not save coordinates.");
        return;
      }
      if (next) {
        setLat(String(next.lat));
        setLng(String(next.lng));
      }
      toast.success("Pin location updated.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border shadow-sm">
        {hasCoords ? (
          <OsmMap
            lat={parseFloat(property.lat!)}
            lng={parseFloat(property.lng!)}
            zoom={15}
            draggable={canEdit}
            onMove={(pos) =>
              saveCoords({
                lat: Math.round(pos.lat * 1e6) / 1e6,
                lng: Math.round(pos.lng * 1e6) / 1e6,
              })
            }
            className="h-[380px] w-full md:h-[460px]"
          />
        ) : (
          <div className="flex h-[240px] flex-col items-center justify-center gap-2 bg-muted/40 text-center">
            <MapPin className="size-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm font-medium">No map pin yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {canEdit
                ? "Use the address search in the edit dialog, or enter coordinates below."
                : "Coordinates have not been provided for this property."}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {canEdit && hasCoords && (
          <p className="text-xs text-muted-foreground">
            Drag the pin to correct the location; it saves automatically.
          </p>
        )}
        <Button asChild variant="outline" size="sm" className="ml-auto gap-1.5">
          <a href={mapsUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="size-3.5" aria-hidden />
            Open in Google Maps
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
          <h3 className="mb-3 text-base font-semibold">Address</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Street</dt>
              <dd className="text-right font-medium">
                {property.addressLine ?? "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">City</dt>
              <dd className="text-right font-medium">{property.city}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Postal code</dt>
              <dd className="text-right font-medium">
                {property.postalCode ?? "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Country</dt>
              <dd className="text-right font-medium">{property.country}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <MapPin className="size-4" aria-hidden />
            Coordinates
          </h3>
          {canEdit ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="loc-lat">Latitude</Label>
                  <Input
                    id="loc-lat"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    inputMode="decimal"
                    placeholder="52.5010"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loc-lng">Longitude</Label>
                  <Input
                    id="loc-lng"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    inputMode="decimal"
                    placeholder="13.4180"
                  />
                </div>
              </div>
              <Button
                onClick={() => saveCoords()}
                disabled={busy}
                className="gap-2"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-4" aria-hidden />
                )}
                Save pin location
              </Button>
              <p className="text-xs text-muted-foreground">
                Tip: the address search in the edit dialog fills these
                automatically. You can also drag the pin on the map above.
              </p>
            </div>
          ) : (
            <p className="text-sm font-medium tabular-numbers">
              {hasCoords ? `${property.lat}, ${property.lng}` : "Not set"}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
