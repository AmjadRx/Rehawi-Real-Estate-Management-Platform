import { createHash, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, tables } from "@/db";
import { isAllowlisted, parseIdentifier, roleFor } from "@/lib/auth/allowlist";
import { authMode, setupCodeConfigured } from "@/lib/auth/mode";
import {
  checkLock,
  clearFailures,
  hashPassword,
  recordFailure,
} from "@/lib/auth/password";
import { checkPasswordRules } from "@/lib/auth/password-rules";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth/session";

const bodySchema = z.object({
  email: z.string().min(3).max(320),
  setupCode: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
});

const INVALID = {
  ok: false,
  message: "Invalid email or setup code.",
};

/** Constant-time comparison: hash both sides so length never leaks. */
function codeMatches(expected: string | undefined, given: string) {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected ?? "").digest();
  return timingSafeEqual(a, b) && expected !== undefined;
}

/**
 * POST /api/auth/setup (§3.2 v4): first-time password creation. An
 * allowlisted email plus the one-time family SETUP_CODE creates the user's
 * own password (argon2id in users.password_hash). Wrong codes count toward
 * the same lockout as wrong passwords, so the code cannot be brute forced.
 */
export async function POST(request: NextRequest) {
  try {
    return await handleSetup(request);
  } catch (error) {
    console.error("[auth] setup failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Setup is unavailable because the server is missing configuration. Check that SESSION_SECRET and DATABASE_URL are set, then redeploy.",
      },
      { status: 500 },
    );
  }
}

async function handleSetup(request: NextRequest) {
  if (authMode() !== "db_password") {
    return NextResponse.json(
      { ok: false, message: "Setup codes are not enabled. Request an email code instead." },
      { status: 501 },
    );
  }
  if (!setupCodeConfigured()) {
    return NextResponse.json(
      { ok: false, message: "First-time setup is not configured. Set SETUP_CODE, then redeploy." },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Enter your email, the family setup code, and a password." },
      { status: 400 },
    );
  }

  const id = parseIdentifier(parsed.data.email);
  if (!id || id.kind !== "email" || !isAllowlisted(id)) {
    return NextResponse.json(INVALID, { status: 401 });
  }

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

  if (!codeMatches(process.env.SETUP_CODE, parsed.data.setupCode)) {
    await recordFailure(id.value);
    return NextResponse.json(INVALID, { status: 401 });
  }

  const db = await getDb();
  const [existing] = await db
    .select()
    .from(tables.users)
    .where(eq(tables.users.email, id.value))
    .limit(1);

  // Setup only creates a FIRST password. Changing one requires the current
  // password (/api/v1/me/password); forgotten ones are cleared by an admin.
  if (existing?.passwordHash) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "A password already exists for this email. Sign in with it, or ask the family admin to reset it.",
      },
      { status: 409 },
    );
  }

  const rules = checkPasswordRules(parsed.data.password, id.value);
  if (!rules.valid) {
    return NextResponse.json(
      {
        ok: false,
        message: "The password does not meet the rules yet.",
        rules: rules.rules.filter((r) => r.required && !r.ok).map((r) => r.label),
      },
      { status: 422 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const role = roleFor(id);
  const [row] = existing
    ? await db
        .update(tables.users)
        .set({ passwordHash, role, lastLoginAt: new Date() })
        .where(eq(tables.users.id, existing.id))
        .returning()
    : await db
        .insert(tables.users)
        .values({ email: id.value, passwordHash, role, lastLoginAt: new Date() })
        .returning();

  await clearFailures(id.value);

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
