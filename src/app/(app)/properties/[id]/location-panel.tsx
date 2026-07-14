"use client";

import { Loader2, MapPin, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PropertyDetail } from "@/lib/property-detail";

/**
 * Location tab (§6.4): full-width map, coordinates, address fields.
 * Uses the keyless Google Maps embed for display; admins adjust the pin by
 * editing coordinates (manual pin-drop fallback per §1 — the JS-API
 * draggable marker activates automatically once
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is configured on a deployment).
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
  const query = hasCoords
    ? `${property.lat},${property.lng}`
    : [property.addressLine, property.city, property.country]
        .filter(Boolean)
        .join(", ");
  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${hasCoords ? 15 : 11}&output=embed`;

  async function saveCoords() {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: lat ? Number(lat) : null,
          lng: lng ? Number(lng) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message ?? "Could not save coordinates.");
        return;
      }
      toast.success("Coordinates updated.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border shadow-sm">
        <iframe
          title={`Map of ${property.name}`}
          src={embedSrc}
          className="h-[380px] w-full md:h-[460px]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
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
            {property.googlePlaceId && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Place ID</dt>
                <dd className="truncate text-right font-mono text-xs">
                  {property.googlePlaceId}
                </dd>
              </div>
            )}
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
              <Button onClick={saveCoords} disabled={busy} className="gap-2">
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-4" aria-hidden />
                )}
                Save pin location
              </Button>
              <p className="text-xs text-muted-foreground">
                Right-click any spot in Google Maps → click the coordinates to
                copy them, then paste here.
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
