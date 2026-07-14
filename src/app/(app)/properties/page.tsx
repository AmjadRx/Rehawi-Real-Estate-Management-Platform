import type { Metadata } from "next";
import { currentUser } from "@/lib/auth/guard";
import { portfolioSummary } from "@/lib/portfolio";
import { getDb, tables } from "@/db";
import { asc } from "drizzle-orm";
import { PropertiesView } from "./properties-view";

export const metadata: Metadata = { title: "Properties" };
export const dynamic = "force-dynamic";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const ownerFilter =
    typeof params.owner === "string" && params.owner ? params.owner : "all";

  const [user, summary, db] = await Promise.all([
    currentUser(),
    portfolioSummary(ownerFilter),
    getDb(),
  ]);
  const owners = await db
    .select()
    .from(tables.owners)
    .orderBy(asc(tables.owners.name));

  const q = typeof params.q === "string" ? params.q.toLowerCase() : "";
  const type = typeof params.type === "string" ? params.type : "";
  const status = typeof params.status === "string" ? params.status : "";
  const country = typeof params.country === "string" ? params.country : "";
  const occupancy =
    typeof params.occupancy === "string" ? params.occupancy : "";
  const city = typeof params.city === "string" ? params.city : "";
  const sort = typeof params.sort === "string" ? params.sort : "date";

  const filtered = summary.properties.filter((sp) => {
    const p = sp.property;
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (type && p.type !== type) return false;
    if (status && p.status !== status) return false;
    if (country && p.country !== country) return false;
    if (city && p.city !== city) return false;
    if (occupancy && p.occupancy !== occupancy) return false;
    return true;
  });

  // §6.3 v2 sort control
  filtered.sort((a, b) => {
    switch (sort) {
      case "name":
        return a.property.name.localeCompare(b.property.name);
      case "location":
        return (
          a.property.country.localeCompare(b.property.country) ||
          a.property.city.localeCompare(b.property.city)
        );
      case "price":
        return (
          parseFloat(b.property.purchasePrice ?? "0") -
          parseFloat(a.property.purchasePrice ?? "0")
        );
      case "income":
        return (
          b.propertyFinancials.monthlyRunRate - a.propertyFinancials.monthlyRunRate
        );
      default:
        return (
          new Date(b.property.createdAt).getTime() -
          new Date(a.property.createdAt).getTime()
        );
    }
  });

  const countries = [
    ...new Set(summary.properties.map((sp) => sp.property.country)),
  ].sort();
  const cities = [
    ...new Set(summary.properties.map((sp) => sp.property.city)),
  ].sort();

  return (
    <PropertiesView
      items={filtered.map((sp) => ({
        property: sp.property,
        financials: sp.propertyFinancials,
        activeLease: sp.activeLease,
        latestConstructionPct: sp.latestConstructionPct,
      }))}
      baseCurrency={summary.baseCurrency}
      countries={countries}
      cities={cities}
      owners={owners.map((o) => ({ id: o.id, name: o.name }))}
      isAdmin={user?.role === "admin"}
    />
  );
}
