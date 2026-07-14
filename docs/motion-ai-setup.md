# Motion AI Kit setup

This repo is configured for the [Motion](https://motion.dev) AI Kit (`npx motion-ai`),
which has two parts:

1. **Motion MCP server** — configured in [`.mcp.json`](../.mcp.json) at project scope
   for Claude Code. The server is pinned to `motion-studio-mcp@6.1.0` from the Motion
   registry and reads its API key from the `MOTION_TOKEN` environment variable
   (expanded via `${MOTION_TOKEN}` so no secret is committed to git).
2. **Motion skills** — fetched at install time from Motion's token-gated registry into
   `.claude/skills/`. These require a valid Motion+ API key and are **not yet installed**.

## Finishing the install

A Motion+ subscription is required. Generate an API key at
<https://motion.dev/dashboard/tokens>, then either:

- **Locally:** run `MOTION_TOKEN=<your-key> npx motion-ai` in the repo root, choose
  *Project* scope and *Claude Code*, and let it install the skills. (It will also
  rewrite `.mcp.json` with the literal key — revert that hunk to keep using the
  `${MOTION_TOKEN}` env reference before committing.)
- **In Claude Code on the web:** add `MOTION_TOKEN` as an environment variable in the
  environment settings, then ask Claude to finish the Motion AI Kit install
  (fetch the skills into `.claude/skills/`).

Once the skills are installed, run `/motion` in your agent to get started.
