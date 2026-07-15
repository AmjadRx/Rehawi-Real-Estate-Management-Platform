import { NextResponse } from "next/server";
import { authCapabilities } from "@/lib/auth/mode";

/**
 * GET /api/auth/config (public, §3.2.4 v3): which sign-in methods are
 * enabled, so the web login screen and the native app adapt automatically.
 * Reveals nothing about who is allowlisted.
 */
export async function GET() {
  return NextResponse.json({ ok: true, ...authCapabilities() });
}
