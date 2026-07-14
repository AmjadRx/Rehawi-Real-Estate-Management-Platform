import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAllowlisted, parseIdentifier } from "@/lib/auth/allowlist";
import { deliverOtp } from "@/lib/auth/delivery";
import { createOtp } from "@/lib/auth/otp";

const bodySchema = z.object({ identifier: z.string().min(3).max(320) });

/**
 * Neutral by design (§3.1): the response is identical whether or not the
 * identifier is allowlisted — never reveal who is on the list.
 */
const NEUTRAL = {
  ok: true,
  message: "If this contact is authorized, a code was sent.",
};

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Enter an email address or phone number." },
      { status: 400 },
    );
  }

  const id = parseIdentifier(parsed.data.identifier);
  if (!id || !isAllowlisted(id)) {
    return NextResponse.json(NEUTRAL);
  }

  const result = await createOtp(id);
  if (!result.ok) {
    // Cooldown/rate-limit responses stay neutral too; retry-after only.
    return NextResponse.json(
      { ...NEUTRAL, retryAfterSeconds: result.reason === "cooldown" ? 60 : 3600 },
      { status: 429 },
    );
  }

  try {
    await deliverOtp(id, result.code);
  } catch (error) {
    console.error("[auth] OTP delivery failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not send the code. Try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json(NEUTRAL);
}
