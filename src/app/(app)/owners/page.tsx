import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { currentUser } from "@/lib/auth/guard";
import { monthlyFlows, portfolioSummary } from "@/lib/portfolio";
import { OwnersView } from "./owners-view";

export const metadata: Metadata = { title: "Owners" };
export const dynamic = "force-dynamic";

export default async function OwnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope =
    typeof params.owner === "string" && params.owner ? params.owner : "family";

  const [summary, flows, db, user] = await Promise.all([
    portfolioSummary(scope),
    monthlyFlows(scope, 12),
    getDb(),
    currentUser(),
  ]);
  const owners = await db
    .select()
    .from(tables.owners)
    .orderBy(asc(tables.owners.name));

  return (
    <OwnersView
      summary={JSON.parse(JSON.stringify(summary))}
      flows={flows}
      owners={owners.map((o) => ({
        id: o.id,
        name: o.name,
        kind: o.kind,
        isFamily: o.isFamily,
      }))}
      scope={scope}
      isAdmin={user?.role === "admin"}
    />
  );
}
