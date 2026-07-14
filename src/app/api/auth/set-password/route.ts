import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, tables } from "@/db";
import { currentUser } from "@/lib/auth/guard";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { ensureUserRow } from "@/lib/users";

const bodySchema = z.object({
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
});

/**
 * §3.2 v2: called right after the one-time email verification (the
 * verify-otp session proves ownership of the email). Also serves password
 * reset, which repeats the same verification flow.
 */
export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Verify your email first." },
      { status: 401 },
    );
  }
  if (!user.identifier.includes("@")) {
    return NextResponse.json(
      { ok: false, message: "Passwords apply to email sign-in only." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  await ensureUserRow(user.id);
  const db = await getDb();
  await db
    .update(tables.users)
    .set({ passwordHash: await hashPassword(parsed.data.password) })
    .where(eq(tables.users.id, user.id));

  return NextResponse.json({ ok: true });
}
