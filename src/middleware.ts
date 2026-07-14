import { NextRequest, NextResponse } from "next/server";
import { isAllowlisted, parseIdentifier } from "@/lib/auth/allowlist";
import {
  SESSION_COOKIE,
  SESSION_RENEW_AFTER_SECONDS,
  sessionCookieOptions,
  signSession,
  verifySession,
} from "@/lib/auth/session";

/** Paths reachable without a session (§3.2.4). */
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/request-otp",
  "/api/auth/verify-otp",
  "/api/auth/logout",
  "/api/health",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sw.js",
  "/icons",
  "/offline",
];

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api");

  if (isPublic(pathname)) return NextResponse.next();

  // Vercel Cron (§7): the rates-refresh endpoint may authenticate with the
  // CRON_SECRET bearer token instead of a session. The route re-checks it.
  const bearer = request.headers.get("authorization");
  if (
    pathname === "/api/v1/rates/refresh" &&
    process.env.CRON_SECRET &&
    bearer === `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.next();
  }
  const token =
    request.cookies.get(SESSION_COOKIE)?.value ??
    (bearer?.startsWith("Bearer ") ? bearer.slice(7) : undefined);

  const session = token ? await verifySession(token) : null;

  // Revocation (§3.2.5): re-validate against the CURRENT allowlist on every
  // request — removal from env vars cuts access immediately.
  const identifier = session ? parseIdentifier(session.sub) : null;
  const authorized = !!session && !!identifier && isAllowlisted(identifier);

  if (!authorized) {
    if (isApi) {
      return NextResponse.json(
        { ok: false, message: "Authentication required." },
        { status: 401 },
      );
    }
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(login);
  }

  // Viewer role (§3.3): reject any mutating method outside /api/auth/*
  if (
    session.role !== "admin" &&
    isApi &&
    MUTATING_METHODS.has(request.method)
  ) {
    return NextResponse.json(
      { ok: false, message: "Viewers have read-only access." },
      { status: 403 },
    );
  }

  // Forward identity to route handlers & server components
  const headers = new Headers(request.headers);
  headers.set("x-rehawi-user-id", session.uid);
  headers.set("x-rehawi-role", session.role);
  headers.set("x-rehawi-identifier", session.sub);
  const response = NextResponse.next({ request: { headers } });

  // Sliding renewal: re-issue the cookie once a day of age is exceeded
  const ageSeconds = Math.floor(Date.now() / 1000) - (session.iat ?? 0);
  if (
    ageSeconds > SESSION_RENEW_AFTER_SECONDS &&
    request.cookies.get(SESSION_COOKIE)
  ) {
    const fresh = await signSession({
      sub: session.sub,
      kind: session.kind,
      role: session.role,
      uid: session.uid,
      name: session.name,
    });
    response.cookies.set(SESSION_COOKIE, fresh, sessionCookieOptions());
  }

  return response;
}

export const config = {
  // Everything except Next internals and static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico|woff2?)$).*)"],
};
