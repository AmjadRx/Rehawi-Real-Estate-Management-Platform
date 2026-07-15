import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, tables } from "@/db";
import { isAllowlisted, parseIdentifier, roleFor } from "@/lib/auth/allowlist";
import { verifyOtp } from "@/lib/auth/otp";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth/session";

const bodySchema = z.object({
  identifier: z.string().min(3).max(320),
  code: z.string().regex(/^\d{5}$/),
});

export async function POST(request: NextRequest) {
  try {
    return await handleVerify(request);
  } catch (error) {
    // A thrown error here is almost always missing deployment config
    // (SESSION_SECRET, OTP_PEPPER, DATABASE_URL). Say so instead of a blank 500.
    console.error("[auth] verify-otp failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Sign-in is unavailable because the server is missing configuration. Check that SESSION_SECRET, OTP_PEPPER and DATABASE_URL are set, then redeploy.",
      },
      { status: 500 },
    );
  }
}

async function handleVerify(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Enter the 5-digit code." },
      { status: 400 },
    );
  }

  const id = parseIdentifier(parsed.data.identifier);
  if (!id || !isAllowlisted(id)) {
    return NextResponse.json(
      { ok: false, message: "That code is not valid." },
      { status: 401 },
    );
  }

  const result = await verifyOtp(id, parsed.data.code);
  if (!result.ok) {
    const message =
      result.reason === "expired"
        ? "That code has expired. Request a new one."
        : result.reason === "too_many_attempts"
          ? "Too many attempts. Request a new code."
          : "That code is not valid.";
    return NextResponse.json({ ok: false, message }, { status: 401 });
  }

  // Upsert the user row for this identifier (§3.2.3)
  const db = await getDb();
  const column = id.kind === "email" ? tables.users.email : tables.users.phone;
  const role = roleFor(id);
  const [existing] = await db
    .select()
    .from(tables.users)
    .where(eq(column, id.value))
    .limit(1);

  let user = existing;
  if (user) {
    [user] = await db
      .update(tables.users)
      .set({ lastLoginAt: new Date(), role })
      .where(eq(tables.users.id, user.id))
      .returning();
  } else {
    [user] = await db
      .insert(tables.users)
      .values({
        email: id.kind === "email" ? id.value : null,
        phone: id.kind === "phone" ? id.value : null,
        role,
        lastLoginAt: new Date(),
      })
      .returning();
  }

  const token = await signSession({
    sub: id.value,
    kind: id.kind,
    role,
    uid: user.id,
    name: user.name ?? undefined,
  });

  const response = NextResponse.json({
    ok: true,
    token, // for the native app (§12) — web uses the httpOnly cookie
    user: {
      id: user.id,
      role,
      name: user.name,
      passwordSet: !!user.passwordHash,
    },
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
