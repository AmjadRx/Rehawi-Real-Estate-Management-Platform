# Motion AI Kit setup

This project is configured for the [Motion](https://motion.dev) AI Kit, which has two parts:

1. **Motion MCP server** — configured in [`.mcp.json`](../.mcp.json) at the repo root. Claude Code picks it up automatically. The server reads its API key from the `MOTION_TOKEN` environment variable (via `${MOTION_TOKEN}` expansion), so no secret is stored in the repo.
2. **Motion skills** — downloaded from Motion's token-gated registry into `.claude/skills/`. These require a valid key at install time and are **not** included here.

## Completing the setup

A [Motion+](https://motion.dev/plus) subscription is required.

1. Generate an API key at <https://motion.dev/dashboard/tokens>.
2. Export it in your environment (shell profile, or the Claude Code environment settings for remote sessions):

   ```sh
   export MOTION_TOKEN=<your-key>
   ```

3. Install the skills by running the official installer:

   ```sh
   npx motion-ai
   ```

   Choose **Project** scope and **Claude Code** as the agent. With `MOTION_TOKEN` set, the key prompt is pre-filled. The installer writes the skills to `.claude/skills/` and configures the MCP server (already done here — keep the env-var form in `.mcp.json` rather than letting a plaintext key be committed).

4. Run `/motion` in your agent to get started.

> **Note:** The skills fetched by the installer are Motion's licensed, subscription-gated content. Think twice before committing them to a shared or public repository.
