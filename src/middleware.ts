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
  "/api/auth/login",
  "/api/auth/setup",
  "/api/auth/config",
  "/api/auth/logout",
  "/api/health",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sw.js",
  "/icons",
  "/offline",
];

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * §3.3 v4: ALLOWED_EMAILS users are strictly VIEW-ONLY. Their only
 * permitted mutations are auth flows, their own profile, their own
 * password, and the avatar upload that own-profile editing needs (the
 * uploads route rejects property-attached uploads for non-admins).
 */
function viewerMayMutate(method: string, pathname: string): boolean {
  if (pathname === "/api/v1/me" && method === "PATCH") return true;
  if (pathname === "/api/v1/me/password" && method === "POST") return true;
  if (pathname === "/api/auth/set-password" && method === "POST") return true;
  if (pathname === "/api/v1/uploads" && method === "POST") return true;
  return false;
}

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * CORS (§7 v4, required for the mobile app): origins listed in
 * CORS_ORIGINS get credentialed CORS on all /api routes. Never a wildcard
 * together with credentials. Native app requests have no Origin header and
 * pass through regardless.
 */
function corsOriginFor(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const allowed = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return allowed.includes(origin.replace(/\/$/, "")) ? origin : null;
}

function applyCors(response: NextResponse, origin: string | null): NextResponse {
  if (!origin) return response;
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type",
  );
  response.headers.append("Vary", "Origin");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api");
  const corsOrigin = isApi ? corsOriginFor(request) : null;

  // Preflight requests carry no credentials and must answer before auth.
  if (isApi && request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    preflight.headers.set("Access-Control-Max-Age", "86400");
    return applyCors(preflight, corsOrigin);
  }

  if (isPublic(pathname)) {
    return applyCors(NextResponse.next(), corsOrigin);
  }

  // Vercel Cron (§7/§13.9): cron endpoints may authenticate with the
  // CRON_SECRET bearer token instead of a session. The routes re-check it.
  const bearer = request.headers.get("authorization");
  const CRON_PATHS = ["/api/v1/rates/refresh", "/api/v1/reminders/generate"];
  if (
    CRON_PATHS.includes(pathname) &&
    process.env.CRON_SECRET &&
    bearer === `Bearer ${process.env.CRON_SECRET}`
  ) {
    return applyCors(NextResponse.next(), corsOrigin);
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
      return applyCors(
        NextResponse.json(
          { ok: false, message: "Authentication required." },
          { status: 401 },
        ),
        corsOrigin,
      );
    }
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(login);
  }

  // Roles (§3.3 v4): viewers are strictly read-only; the few own-account
  // exceptions live in viewerMayMutate.
  if (
    session.role !== "admin" &&
    isApi &&
    MUTATING_METHODS.has(request.method) &&
    !viewerMayMutate(request.method, pathname)
  ) {
    return applyCors(
      NextResponse.json(
        { ok: false, message: "This action requires an admin." },
        { status: 403 },
      ),
      corsOrigin,
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

  return applyCors(response, corsOrigin);
}

export const config = {
  // Everything except Next internals and static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico|woff2?)$).*)"],
};
