import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { currentUser } from "@/lib/auth/guard";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <AppShell role={user.role} identifier={user.identifier}>
      {children}
    </AppShell>
  );
}
