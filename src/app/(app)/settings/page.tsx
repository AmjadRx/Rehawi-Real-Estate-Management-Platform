import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, tables } from "@/db";
import { currentUser } from "@/lib/auth/guard";
import { authMode } from "@/lib/auth/mode";
import { SettingsView } from "./settings-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const db = await getDb();
  const [row] = await db
    .select()
    .from(tables.users)
    .where(eq(tables.users.id, user.id))
    .limit(1);

  return (
    <SettingsView
      identifier={user.identifier}
      role={user.role}
      profile={{
        name: row?.name ?? "",
        email: row?.email ?? "",
        phone: row?.phone ?? "",
        avatarDocumentId: row?.avatarDocumentId ?? null,
      }}
      isEmailUser={user.identifier.includes("@")}
      authMode={authMode()}
      passwordSet={!!row?.passwordHash}
    />
  );
}
