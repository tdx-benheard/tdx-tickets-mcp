# MCP Server Configuration Guide

**CORRECT APPROACH**: MCP servers must be configured in a `.mcp.json` file at your project's root directory. DO NOT attempt to add `mcpServers` to `.claude/settings.local.json` (it will fail validation). DO NOT add project-specific MCP servers to the global `~/.claude.json` file.

## How to Configure MCP Servers for a Project

### Step 1: Create `.mcp.json` at project root

Create a `.mcp.json` file in your project's root directory (NOT in the `.claude` folder):

**Example**: `C:\source\tddev\enterprise\.mcp.json`

```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "node",
      "args": ["C:/absolute/path/to/server/dist/index.js"],
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}
```

**Important**:
- Use absolute paths in the `args` array
- The `.mcp.json` file goes in the project root, not in `.claude/` folder
- Can be version controlled for team sharing

### Step 2: Enable project MCP servers in `.claude/settings.local.json`

In your project's `.claude/settings.local.json`, ensure this setting exists:

```json
{
  "enableAllProjectMcpServers": true
}
```

**Note**: Individual permission rules like `"mcp__server-name__*"` are NOT needed when `enableAllProjectMcpServers` is set to `true`.

### Step 3: Restart Claude Code

Restart Claude Code to load the new MCP server configuration.

## Available MCP Server Configurations

Copy these configurations into your project's `.mcp.json` file.

### 1. TeamDynamix Tickets API (`tdx-api-tickets-mcp`)

For projects that need to interact with TeamDynamix tickets, reports, and ticket-related operations.

**Add to `.mcp.json`:**
```json
{
  "mcpServers": {
    "tdx-api-tickets-mcp": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:/source/mcp/tdx-api-tickets-mcp/dist/index.js"
      ],
      "env": {
        "TDX_PROD_CREDENTIALS_FILE": "C:\\Users\\ben.heard\\.config\\tdx\\prod-credentials.json",
        "TDX_DEV_CREDENTIALS_FILE": "C:\\Users\\ben.heard\\.config\\tdx\\dev-credentials.json",
        "TDX_CANARY_CREDENTIALS_FILE": "C:\\Users\\ben.heard\\.config\\tdx\\canary-credentials.json",
        "TDX_DEFAULT_ENVIRONMENT": "prod"
      }
    }
  }
}
```

**Tools provided**: `tdx_get_ticket`, `tdx_search_tickets`, `tdx_update_ticket`, `tdx_edit_ticket`, `tdx_add_ticket_feed`, `tdx_run_report`, `tdx_list_reports`, `tdx_get_current_user`

### 2. TeamDynamix Time API (`tdx-api-time-mcp`)

For projects that need to interact with TeamDynamix time entries and time tracking.

**Add to `.mcp.json`:**
```json
{
  "mcpServers": {
    "tdx-api-time-mcp": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:/source/mcp/tdx-api-time-mcp/dist/index.js"
      ],
      "env": {
        "TDX_PROD_CREDENTIALS_FILE": "C:\\Users\\ben.heard\\.config\\tdx\\prod-credentials.json",
        "TDX_DEV_CREDENTIALS_FILE": "C:\\Users\\ben.heard\\.config\\tdx\\dev-credentials.json",
        "TDX_CANARY_CREDENTIALS_FILE": "C:\\Users\\ben.heard\\.config\\tdx\\canary-credentials.json",
        "TDX_DEFAULT_ENVIRONMENT": "prod"
      }
    }
  }
}
```

**Tools provided**: `tdx_get_time_report`, `tdx_search_time_entries`, `tdx_update_time_entry`, `tdx_delete_time_entry`, `tdx_get_current_user`

### 3. Web Agent MCP (`web-agent-mcp`)

For projects that need browser automation and web interaction capabilities.

**Add to `.mcp.json`:**
```json
{
  "mcpServers": {
    "web-agent-mcp": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:/source/mcp/web-agent-mcp/dist/index.js"
      ]
    }
  }
}
```

**Tools provided**: `navigate`, `click`, `type`, `screenshot`, `query_page`, `scroll`, `wait`, `press_key`, `refresh`, `get_console_logs`

## What Doesn't Work

❌ **DO NOT** add `mcpServers` to `.claude/settings.local.json` - it will fail validation
❌ **DO NOT** use `enabledMcpjsonServers` in settings - this approach is unreliable
❌ **DO NOT** add project-specific MCP servers to global `~/.claude.json` - keep configuration local to projects

## Notes

- Changes to MCP configuration require restarting Claude Code
- Use `"enableAllProjectMcpServers": true` in `.claude/settings.local.json` to automatically approve all MCP servers in the project's `.mcp.json` file
- Environment variables in `env` are passed to the MCP server process
- For TeamDynamix APIs: Prod, dev, and canary credential files can be configured; server uses `TDX_DEFAULT_ENVIRONMENT` to choose which environment to use
