"use client";

import { Building2, Plus, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  FadeIn,
  HoverLift,
  Stagger,
  StaggerItem,
} from "@/components/motion-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney, formatPercent, countryFlag } from "@/lib/format";
import type { PropertyFinancials } from "@/lib/finance";
import {
  OCCUPANCY_LABEL,
  STATUS_BADGE,
  STATUS_LABEL,
  TYPE_LABEL,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { PropertyFormDialog } from "./property-form";

interface Item {
  property: {
    id: string;
    name: string;
    type: string;
    status: string;
    occupancy: string;
    currency: string;
    country: string;
    city: string;
    coverPhotoId: string | null;
  };
  financials: PropertyFinancials;
  activeLease: { rentAmount: string; currency: string; frequency: string } | null;
  latestConstructionPct: number | null;
}

export function PropertiesView({
  items,
  baseCurrency,
  countries,
  cities,
  owners,
  isAdmin,
}: {
  items: Item[];
  baseCurrency: string;
  countries: string[];
  cities: string[];
  owners: Array<{ id: string; name: string }>;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value && value !== "all") next.set(key, value);
      else next.delete(key);
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  const filterSelect = (
    key: string,
    label: string,
    options: Array<[string, string]>,
  ) => (
    <Select
      value={params.get(key) ?? "all"}
      onValueChange={(v) => setParam(key, v)}
    >
      <SelectTrigger className="w-full sm:w-44" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}: all</SelectItem>
        {options.map(([value, text]) => (
          <SelectItem key={value} value={value}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <FadeIn className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl">Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} propert{items.length === 1 ? "y" : "ies"} in the
            portfolio
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="size-4" aria-hidden />
          Add property
        </Button>
      </FadeIn>

      <FadeIn delay={0.05} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              defaultValue={params.get("q") ?? ""}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder="Search by name…"
              className="pl-9"
              aria-label="Search properties"
            />
          </div>
          <Button
            variant="outline"
            className="gap-2 sm:hidden"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters
          </Button>
        </div>
        <div
          className={cn(
            "flex-wrap gap-2 sm:flex",
            showFilters ? "flex" : "hidden",
          )}
        >
          {filterSelect("type", "Type", Object.entries(TYPE_LABEL))}
          {filterSelect("status", "Status", Object.entries(STATUS_LABEL))}
          {filterSelect(
            "country",
            "Country",
            countries.map((c) => [c, c]),
          )}
          {filterSelect(
            "city",
            "City",
            cities.map((c) => [c, c]),
          )}
          {filterSelect(
            "occupancy",
            "Occupancy",
            Object.entries(OCCUPANCY_LABEL).filter(([v]) => v !== "n/a"),
          )}
          {filterSelect(
            "owner",
            "Owner",
            [["family", "Family (all)"], ...owners.map((o) => [o.id, o.name] as [string, string])],
          )}
          {filterSelect("sort", "Sort", [
            ["name", "Name"],
            ["location", "Location"],
            ["date", "Date added"],
            ["price", "Purchase price"],
            ["income", "Monthly income"],
          ])}
        </div>
      </FadeIn>

      {items.length === 0 ? (
        <FadeIn
          delay={0.1}
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-20 text-center"
        >
          <Building2 className="size-10 text-muted-foreground/60" aria-hidden />
          <div>
            <p className="font-medium">No properties match</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try clearing a filter{isAdmin ? " or add your first property" : ""}.
            </p>
          </div>
        </FadeIn>
      ) : (
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <StaggerItem key={item.property.id}>
              <PropertyCard item={item} baseCurrency={baseCurrency} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <PropertyFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        owners={owners}
      />
    </div>
  );
}

function keyFigure(item: Item, baseCurrency: string) {
  const { property, financials, activeLease } = item;
  if (activeLease) {
    return {
      label: "Rent",
      value: `${formatMoney(activeLease.rentAmount, activeLease.currency)}/${
        activeLease.frequency === "monthly"
          ? "mo"
          : activeLease.frequency === "quarterly"
            ? "qtr"
            : "yr"
      }`,
    };
  }
  if (property.status !== "completed") {
    return {
      label: "Paid",
      value: `${formatPercent(financials.completionPct)} of price`,
    };
  }
  return {
    label: "Invested",
    value: formatMoney(financials.invested, baseCurrency, { compact: true }),
  };
}

function PropertyCard({
  item,
  baseCurrency,
}: {
  item: Item;
  baseCurrency: string;
}) {
  const { property, financials } = item;
  const figure = keyFigure(item, baseCurrency);

  return (
    <HoverLift className="h-full">
      <Link
        href={`/properties/${property.id}`}
        className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
      >
        {/* Cover */}
        <div
          className="relative flex h-36 items-end bg-gradient-to-br from-primary/25 via-primary/10 to-muted"
          aria-hidden={!property.coverPhotoId}
        >
          {property.coverPhotoId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/v1/files/${property.coverPhotoId}`}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <Building2
              className="absolute right-4 top-4 size-8 text-primary/40"
              aria-hidden
            />
          )}
          <div className="relative flex w-full items-center gap-1.5 bg-gradient-to-t from-black/45 to-transparent p-3 pt-8">
            <Badge className={STATUS_BADGE[property.status]}>
              {STATUS_LABEL[property.status]}
            </Badge>
            <Badge variant="secondary">{TYPE_LABEL[property.type]}</Badge>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h3 className="text-lg leading-snug">{property.name}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {countryFlag(property.country)} {property.city},{" "}
              {property.country}
            </p>
          </div>

          <div className="mt-auto flex items-end justify-between border-t pt-3">
            <div>
              <p className="text-xs text-muted-foreground">{figure.label}</p>
              <p className="text-base font-semibold tabular-numbers">
                {figure.value}
              </p>
            </div>
            {property.status !== "completed" && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-sm font-medium tabular-numbers">
                  {formatMoney(financials.outstanding, baseCurrency, {
                    compact: true,
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </Link>
    </HoverLift>
  );
}
