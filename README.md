# Rehawi Estates — Real Estate Management Platform

Private, family-only platform for the family's real-estate portfolio:
properties, ownership shares, financials (invested, returned, ROI, payback),
contracts & documents, contacts, Google Maps locations and a 3D world map.
Built with Next.js 15 (App Router), TypeScript, Tailwind + shadcn/ui,
Drizzle + Neon Postgres, Vercel Blob, and Motion for animations — installable
as a PWA. Full specification: `rehawi-platform-architecture.md` (repo root of
the planning docs).

## Local development

```sh
npm install
cp .env.example .env.local   # defaults work out of the box
npm run dev
```

- With no `DATABASE_URL`, an embedded PGlite database is created under
  `.data/pg`, migrated, and seeded with the 3-asset demo scenario
  (development only — production is never seeded).
- With no Resend/Twilio keys, sign-in codes are printed to the dev server
  console: use `dev@example.com` (admin) or `viewer@example.com` (viewer)
  and copy the 5-digit code from the terminal.
- `npm test` runs the finance-engine unit tests; `npm run build` produces the
  production build incl. the service worker.

## Production (Vercel)

1. Import the repo in Vercel; add **Neon** and **Blob** from the Marketplace.
2. Set the §11 environment variables (see `.env.example`).
3. `vercel.json` schedules the daily FX-rate refresh and reminder generation
   crons (authenticated with `CRON_SECRET`).
4. Migrations are additive-only and run with `npm run db:migrate`
   (`drizzle-kit migrate`) against `DATABASE_URL`.
5. Nightly encrypted backups: copy `docs/backups/backup.yml` into the private
   `rehawi-estates-backups` repo — see `docs/backups/README.md`.

## Security model (§3)

- Allowlisted emails/phones only (`ALLOWED_*`/`ADMIN_*` env vars) with
  5-digit OTP sign-in via Resend/Twilio; jose JWT httpOnly session cookies;
  `Authorization: Bearer` supported for the future native app.
- Middleware re-validates the allowlist on every request — removing someone
  from the env vars revokes access immediately.
- Viewers are read-only (mutating methods rejected). Every mutation is
  admin-only, zod-validated, and written to the audit log.
- Files live in private Blob storage and are only served through the
  session-checked `/api/v1/files/[id]` proxy. Documents and properties are
  soft-deleted. `robots.txt` disallows everything.

## CSS Studio setup

CSS Studio is installed as a dev dependency and starts automatically in
development (`src/components/providers.tsx`), never in production builds.
Its MCP server is configured in [`.mcp.json`](.mcp.json); the skill lives in
`.claude/skills/studio/`. Run `/studio` in your agent to start editing.

## Motion AI Kit setup

The `motion` MCP server is configured in [`.mcp.json`](.mcp.json) and reads
your Motion+ API key from the `MOTION_TOKEN` environment variable (generate
at <https://motion.dev/dashboard/tokens>). The Motion skills are
license-gated Motion+ content, so they are **not** committed to this public
repository (see `.gitignore`); install them locally with `npx motion-ai`.
