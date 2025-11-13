# TeamDynamix Tickets API MCP Server - Claude Reference

> **For detailed tool usage:** [TOOLS.md](./TOOLS.md)
> **For user setup guide:** [SETUP-GUIDE.md](./SETUP-GUIDE.md)

## Quick Reference

**Environments:**
- Production: `solutions.teamdynamix.com/TDWebApi` (App: 129)
- Test: `part01-demo.teamdynamixtest.com/TDWebApi` (App: TBD)
- Canary: `eng.teamdynamixcanary.com/TDWebApi` (App: TBD)
- Dev: `localhost/TDDev/TDWebApi` (App: 627)

**Credentials:** `~/.config/tdx-mcp/{env}-credentials.json` (DPAPI-encrypted)

---

## Setup Workflow

When user asks to setup/configure, follow these steps:

### 1. Get MCP Server Path
```bash
pwd  # Store as MCP_SERVER_PATH (convert /c/... to C:\... if needed)
```

### 2. Run Setup Tool
Tell user (use EXACT text, do NOT add explanations):

🚀 ACTION NEEDED:
   ↓ Copy these commands
   ↓ Open a NEW terminal window
   ↓ Paste and run

   ────────────────────────────────────
   cd {MCP_SERVER_PATH}
   npm run setup
   ────────────────────────────────────

✅ When done, return here and say: "complete"

Replace `{MCP_SERVER_PATH}` with the path from step 1.

### 3. Verify Credentials
```bash
cat "$HOME/.config/tdx-mcp/prod-credentials.json"
```
Check: valid JSON, has TDX_BASE_URL/USERNAME/PASSWORD/TICKET_APP_IDS, password starts with `dpapi:`

### 4. Install to Project
Ask where to install using AskUserQuestion:
- Option 1: `C:\source\TDDev\enterprise`
- Option 2: Don't install (use in MCP server folder only)
- Option 3: Custom path

Check directory status:
```bash
PROJECT_PATH="<path>"
MCP_ABS=$(pwd)
if [ ! -d "$PROJECT_PATH" ]; then echo "DIR_NOT_FOUND"
elif [ "$(cd "$PROJECT_PATH" && pwd)" = "$MCP_ABS" ]; then echo "SELF_REFERENCE"
elif [ -f "$PROJECT_PATH/.mcp.json" ]; then echo "FILE_EXISTS"
else echo "CREATE_NEW"; fi
```

Handle cases:
- **DIR_NOT_FOUND**: Ask to create directory
- **SELF_REFERENCE**: Already works here, pick different path
- **FILE_EXISTS**: Ask to update/keep/show
- **CREATE_NEW**: Write .mcp.json with absolute path to dist/index.js

.mcp.json template:
```json
{
  "mcpServers": {
    "tdx-api-tickets-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["C:/path/to/tdx-api-tickets-mcp/dist/index.js"],
      "env": {
        "TDX_PROD_CREDENTIALS_FILE": "~/.config/tdx-mcp/prod-credentials.json",
        "TDX_DEFAULT_ENVIRONMENT": "prod"
      }
    }
  }
}
```

### 5. Complete
Tell user:

Setup complete! **Important:** You need to start Claude Code in the installed directory (e.g., `cd <PROJECT_PATH>` then launch Claude Code) for the MCP server to be available. Once restarted in that directory, test with "Show me all TDX reports"

---

## Graceful Startup

Server starts even if credentials missing/invalid. Shows ✓/✗ status indicators:
```
✓ Loaded production environment configuration
✗ Failed to load test credentials: file not found
WARNING: Default environment 'prod' not found, falling back to: dev
```

Tools return helpful errors when credentials unavailable.

---

## Key Behaviors

**Ticket Updates:**
- `tdx_update_ticket`: Partial (auto-merges)
- `tdx_edit_ticket`: Full (all mandatory fields required)

**Reports:**
- `withData=true` returns ALL rows (90s SQL timeout only limit)
- Prefer "All Open Tickets" over team-specific reports
- When multiple match: use general report, mention others at end

**Tags:** GET doesn't return tags (API rollback), POST/DELETE work

**App ID:** Tries each configured app until found, caches result

**Auth:** JWT tokens cached 23hr, auto-refresh on 401

**Retry:** 408/429/500/502/503/504 retry 3x with exponential backoff

---

## Architecture

- `index.ts`: MCP server, credential loading, graceful startup
- `client.ts`: TDXClient, axios, retry logic
- `auth.ts`: JWT auth, token cache, thread-safe refresh
- `tools.ts`: MCP tool schemas
- `handlers.ts`: Tool implementations
- `types.ts`: TypeScript interfaces
- `utils.ts`: Password decoding (DPAPI), validation

---

## Security

- **DPAPI required**: Passwords must be `dpapi:AQAAANCMnd8...`
- **User-scoped**: Tied to Windows user account
- **Base64 validated**: Prevents command injection
- Setup tool handles encryption via PowerShell

---

## Testing

```bash
npm run test:prod    # Production
npm run test:test    # Test
npm run test:canary  # Canary
npm run test:api     # Development
```
