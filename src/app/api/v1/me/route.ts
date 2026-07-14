import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, tables } from "@/db";
import { currentUser } from "@/lib/auth/guard";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Authentication required." },
      { status: 401 },
    );
  }
  const db = await getDb();
  const [row] = await db
    .select()
    .from(tables.users)
    .where(eq(tables.users.id, user.id))
    .limit(1);
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      role: user.role,
      identifier: user.identifier,
      name: row?.name ?? null,
      email: row?.email ?? null,
      phone: row?.phone ?? null,
    },
  });
}
