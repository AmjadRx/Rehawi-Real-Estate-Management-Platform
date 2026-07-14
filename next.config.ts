import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  // Service worker only in production builds; dev uses live HMR.
  disable: process.env.NODE_ENV !== "production",
});

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    // CSP (§3.3): allow Google Maps + globe textures; everything else self.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.public.blob.vercel-storage.com",
      "connect-src 'self' https://maps.googleapis.com https://*.googleapis.com ws: wss:",
      "frame-src https://www.google.com https://maps.google.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "twilio"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withSerwist(withNextIntl(nextConfig));
