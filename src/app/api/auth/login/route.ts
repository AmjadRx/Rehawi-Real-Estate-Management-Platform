import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, tables } from "@/db";
import { isAllowlisted, parseIdentifier, roleFor } from "@/lib/auth/allowlist";
import {
  checkLock,
  clearFailures,
  recordFailure,
  verifyPassword,
} from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth/session";

const bodySchema = z.object({
  email: z.string().min(3).max(320),
  password: z.string().min(1).max(200),
});

const INVALID = NextResponse.json(
  { ok: false, message: "Invalid email or password." },
  { status: 401 },
);

/** §3.2 v2 email path: email + password with DB-backed lockout. */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Enter your email and password." },
      { status: 400 },
    );
  }

  const id = parseIdentifier(parsed.data.email);
  if (!id || id.kind !== "email" || !isAllowlisted(id)) return INVALID;

  const lock = await checkLock(id.value);
  if (lock.locked) {
    return NextResponse.json(
      {
        ok: false,
        message: "Too many failed attempts. Try again in a few minutes.",
        retryAfterSeconds: lock.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  const db = await getDb();
  const [user] = await db
    .select()
    .from(tables.users)
    .where(eq(tables.users.email, id.value))
    .limit(1);

  // First-time allowlisted email: route the client into the one-time
  // verification + set-password flow instead of a dead-end failure.
  if (!user?.passwordHash) {
    return NextResponse.json(
      {
        ok: false,
        needsSetup: true,
        message: "Set up your password first. We will email you a code.",
      },
      { status: 409 },
    );
  }

  const valid = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!valid) {
    await recordFailure(id.value);
    return INVALID;
  }

  await clearFailures(id.value);
  const role = roleFor(id);
  const [updated] = await db
    .update(tables.users)
    .set({ lastLoginAt: new Date(), role })
    .where(eq(tables.users.id, user.id))
    .returning();

  const token = await signSession({
    sub: id.value,
    kind: "email",
    role,
    uid: updated.id,
    name: updated.name ?? undefined,
  });
  const response = NextResponse.json({
    ok: true,
    token,
    user: { id: updated.id, role, name: updated.name },
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
