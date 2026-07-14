"use client";

import { ArrowLeft, Building2, ExternalLink, MapPin, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FadeIn } from "@/components/motion-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { countryFlag } from "@/lib/format";
import {
  OCCUPANCY_LABEL,
  STATUS_BADGE,
  STATUS_LABEL,
  TYPE_LABEL,
} from "@/lib/labels";
import type { PropertyDetail } from "@/lib/property-detail";
import { PropertyFormDialog, type PropertyFormValues } from "../property-form";

export function PropertyHeader({
  detail,
  isAdmin,
  owners,
}: {
  detail: PropertyDetail;
  isAdmin: boolean;
  owners: Array<{ id: string; name: string }>;
}) {
  const { property } = detail;
  const [editOpen, setEditOpen] = useState(false);

  const mapsUrl =
    property.lat && property.lng
      ? `https://www.google.com/maps/search/?api=1&query=${property.lat},${property.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [property.addressLine, property.city, property.country]
            .filter(Boolean)
            .join(", "),
        )}`;

  const initial: PropertyFormValues = {
    id: property.id,
    name: property.name,
    type: property.type,
    status: property.status,
    occupancy: property.occupancy,
    currency: property.currency,
    purchasePrice: property.purchasePrice ?? "",
    currentValue: property.currentValue ?? "",
    country: property.country,
    city: property.city,
    addressLine: property.addressLine ?? "",
    postalCode: property.postalCode ?? "",
    lat: property.lat ?? "",
    lng: property.lng ?? "",
    sizeSqm: property.sizeSqm ?? "",
    yearBuilt: property.yearBuilt ? String(property.yearBuilt) : "",
    description: property.description ?? "",
  };

  return (
    <FadeIn className="space-y-4">
      <Link
        href="/properties"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All properties
      </Link>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="relative flex h-44 items-end bg-gradient-to-br from-primary/30 via-primary/10 to-muted md:h-56">
          {property.coverPhotoId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/v1/files/${property.coverPhotoId}`}
              alt={`${property.name} cover photo`}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <Building2
              className="absolute right-6 top-6 size-12 text-primary/30"
              aria-hidden
            />
          )}
          <div className="relative w-full bg-gradient-to-t from-black/60 via-black/25 to-transparent p-4 pt-14 md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={STATUS_BADGE[property.status]}>
                {STATUS_LABEL[property.status]}
              </Badge>
              <Badge variant="secondary">{TYPE_LABEL[property.type]}</Badge>
              {property.occupancy !== "n/a" && (
                <Badge variant="secondary">
                  {OCCUPANCY_LABEL[property.occupancy]}
                </Badge>
              )}
            </div>
            <h1 className="mt-2 text-2xl text-white md:text-3xl">
              {property.name}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {countryFlag(property.country)}{" "}
            {[property.addressLine, property.city, property.country]
              .filter(Boolean)
              .join(", ")}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={mapsUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" aria-hidden />
                Open in Google Maps
              </a>
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-3.5" aria-hidden />
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <PropertyFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          owners={owners}
          initial={initial}
          initialOwners={detail.owners.map((o) => ({
            ownerId: o.ownerId,
            sharePct: o.sharePct,
            isLegalOwner: o.isLegalOwner,
          }))}
        />
      )}
    </FadeIn>
  );
}
