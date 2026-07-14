import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, tables } from "@/db";
import { apiHandler, jsonOk, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { currentUser, requireUser } from "@/lib/auth/guard";
import { ensureUserRow } from "@/lib/users";

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
      avatarDocumentId: row?.avatarDocumentId ?? null,
      passwordSet: !!row?.passwordHash,
    },
  });
}

const patchSchema = z.object({
  name: z.string().min(1).max(120).nullish(),
  email: z.email().nullish(),
  phone: z.string().max(30).nullish(),
  avatarDocumentId: z.uuid().nullish(),
});

/** §7 v2: any signed-in user edits their own profile. */
export const PATCH = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();
  const data = await parseBody(request, patchSchema);
  await ensureUserRow(user.id);
  const db = await getDb();
  const [row] = await db
    .update(tables.users)
    .set(data)
    .where(eq(tables.users.id, user.id))
    .returning();
  await writeAudit({
    userId: user.id,
    action: "update",
    entityType: "user_profile",
    entityId: user.id,
    diff: { patch: data },
  });
  return jsonOk({
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      avatarDocumentId: row.avatarDocumentId,
    },
  });
});
