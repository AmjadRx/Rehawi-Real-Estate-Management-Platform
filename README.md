# Rehawi Real Estate Management Platform

## CSS Studio setup

[CSS Studio](https://cssstudio.ai) is installed as a dev dependency (`cssstudio`), with its `css-studio` MCP server configured in [`.mcp.json`](.mcp.json) and the `studio` skill in `.claude/skills/studio/` and `.agents/skills/studio/` (installed via `npx cssstudio install`).

**When app code is added to this repo**, initialise CSS Studio in the app's entry point so it runs only in development and is never shipped to end users:

```javascript
import { startStudio } from "cssstudio";

if (process.env.NODE_ENV === "development") {
  startStudio();
}
```

After restarting your agent, run `/studio` to start editing.

## Motion AI Kit setup

This repo is configured to use the [Motion](https://motion.dev) AI Kit (MCP server + skills) with AI coding agents such as Claude Code.

### MCP server

The `motion` MCP server is configured at project scope in [`.mcp.json`](.mcp.json). It reads your Motion+ API key from the `MOTION_TOKEN` environment variable, so no secrets live in this repo. Set it before starting your agent:

- **Locally:** `export MOTION_TOKEN=<your key>` (generate one at <https://motion.dev/dashboard/tokens> — requires [Motion+](https://motion.dev/plus)).
- **Claude Code on the web:** add `MOTION_TOKEN` to the environment's variables in the environment settings.

### Skills

The Motion skills (animation best practices, docs search, CSS spring generation, performance audit, transition preview) are license-gated Motion+ content, so they are **not** committed to this public repository (see `.gitignore`). Install them into your local checkout with:

```sh
npx motion-ai
```

Choose **Project** scope and the agents you use (e.g. Claude Code). The installer writes the skills to `.claude/skills/motion/` and configures the MCP server. Once installed, run `/motion` in your agent to get started.
