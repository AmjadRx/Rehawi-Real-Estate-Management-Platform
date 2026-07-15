import { createHash, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, tables } from "@/db";
import { isAllowlisted, parseIdentifier, roleFor } from "@/lib/auth/allowlist";
import { authMode, envUsers } from "@/lib/auth/mode";
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

const invalid = () =>
  NextResponse.json(
    { ok: false, message: "Invalid email or password." },
    { status: 401 },
  );

/**
 * Constant-time comparison (§3.2.4 v3): hash both sides so length never
 * leaks, then timingSafeEqual on equal-length digests.
 */
function envPasswordMatches(expected: string | undefined, given: string) {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected ?? "").digest();
  return timingSafeEqual(a, b) && expected !== undefined;
}

/**
 * §3.2 email path. AUTH_MODE=env_password (v3 default): passwords come from
 * AUTH_USERS env vars, zero external services. AUTH_MODE=otp: argon2id hash
 * in users.password_hash, set after a one-time email verification.
 */
export async function POST(request: NextRequest) {
  try {
    return await handleLogin(request);
  } catch (error) {
    // A thrown error here is almost always missing deployment config
    // (SESSION_SECRET, DATABASE_URL). Say so instead of a blank 500.
    console.error("[auth] login failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Sign-in is unavailable because the server is missing configuration. Check that SESSION_SECRET and DATABASE_URL are set, then redeploy.",
      },
      { status: 500 },
    );
  }
}

async function handleLogin(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Enter your email and password." },
      { status: 400 },
    );
  }

  const id = parseIdentifier(parsed.data.email);
  if (!id || id.kind !== "email" || !isAllowlisted(id)) return invalid();

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

  if (authMode() === "env_password") {
    if (!envPasswordMatches(envUsers().get(id.value), parsed.data.password)) {
      await recordFailure(id.value);
      return invalid();
    }
  } else {
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
      return invalid();
    }
  }

  await clearFailures(id.value);
  const role = roleFor(id);
  const [row] = user
    ? await db
        .update(tables.users)
        .set({ lastLoginAt: new Date(), role })
        .where(eq(tables.users.id, user.id))
        .returning()
    : await db
        .insert(tables.users)
        .values({ email: id.value, role, lastLoginAt: new Date() })
        .returning();

  const token = await signSession({
    sub: id.value,
    kind: "email",
    role,
    uid: row.id,
    name: row.name ?? undefined,
  });
  const response = NextResponse.json({
    ok: true,
    token,
    user: { id: row.id, role, name: row.name },
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
