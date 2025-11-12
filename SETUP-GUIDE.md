# TeamDynamix MCP Server - Claude-Driven Setup

This guide shows you how to set up the TeamDynamix MCP server by simply asking Claude to configure it for you. No manual npm commands needed - Claude handles everything!

## Prerequisites

- Node.js 18+ installed
- TeamDynamix account with API access
- Claude Code
- Windows (for DPAPI password encryption)

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tdx-benheard/tdx-api-tickets-mcp.git
   cd tdx-api-tickets-mcp
   ```

2. **Ask Claude to set it up:**

   In Claude Code, simply ask:
   > "Set up the TeamDynamix MCP server for me"

   Claude will handle everything: dependencies, build, configuration, and credentials.

## What Claude Does During Setup

### Step 0: Install Dependencies and Build Project

Claude will automatically:
- Run `npm install` to install dependencies
- Run `npm run build` to compile TypeScript
- Verify the build succeeded

### Step 1: Gather Configuration

Claude will ask you questions with helpful examples:

**Environment Selection:**
```
Which environment do you want to configure?
Examples: 'prod', 'dev', 'canary'
```

**Domain Entry** (examples change based on environment):
- **Production**: "Enter domain (example: 'solutions.teamdynamix.com' or 'yourcompany.teamdynamix.com')"
- **Development**: "Enter domain (example: 'localhost/TDDev')"
- **Canary**: "Enter domain (example: 'eng.teamdynamixcanary.com')"

**Username:**
```
Enter your TeamDynamix username
Example: 'john.doe@company.com'
```

**Password** - ⚠️ Security Warning:
```
⚠️ SECURITY NOTICE: You have two options for password entry:

Option 1: Enter password in this chat (will be visible in chat history)
  • Quick and easy
  • Password will be encrypted immediately with DPAPI
  • Only visible in your Claude Code chat history
  • Type 'chat' to use this option

Option 2: Use password encryption tool (RECOMMENDED - more secure)
  • Your password never appears in chat
  • Run: npm run encrypt-password
  • Tool will prompt for password securely (masked as ***)
  • Only encrypted value is output (starting with 'dpapi:')
  • Paste the encrypted value here
  • Type 'tool' to use this option

Which option do you prefer? (chat/tool)
```

**Security Notes**:
- Passwords entered in chat are visible in your chat history
- Once encrypted with DPAPI, passwords can only be decrypted by your Windows user account
- Encrypted passwords are stored in `~/.config/tdx-mcp/` (outside version control)
- The encryption tool (`npm run encrypt-password`) never exposes your password - only the encrypted result

**Alternative encryption tool** (if you prefer PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File scripts/encrypt-password.ps1
```

### Step 2: Validate Credentials

Claude will:
- Test authentication with TeamDynamix
- Fetch your available ticketing applications
- Show you a numbered list to choose from

**Example:**
```
Available ticketing applications:
[1] IT Support (ID: 129)
[2] HR Requests (ID: 245)
[3] Facilities (ID: 312)

Select apps (examples: '1', '1,2', 'all'):
```

If fetching apps fails, Claude falls back to:
```
Enter app IDs manually
Examples: '129', '129,245'
```

### Step 3: Encrypt Your Password

Claude uses Windows DPAPI to securely encrypt your password (if not already encrypted):
- Tied to your Windows user account
- Cannot be decrypted by other users
- Stored as `dpapi:AQAAANCMnd8BFdERjHoAwE...`

### Step 4: Create Configuration Files

**Credentials file** at `~/.config/tdx-mcp/{environment}-credentials.json`:
```json
{
  "TDX_BASE_URL": "https://solutions.teamdynamix.com/TDWebApi",
  "TDX_USERNAME": "john.doe@company.com",
  "TDX_PASSWORD": "dpapi:AQAAANCMnd8BFdERjHoAwE...",
  "TDX_TICKET_APP_IDS": "129,245"
}
```

### Step 5: Configure MCP Server Location

Claude asks:
```
Configure globally or for specific project?
Examples: 'global', 'project'
```

**Global Configuration:**
Updates `~/.claude.json`:
```json
{
  "mcpServers": {
    "tdx-api-tickets-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["C:\\source\\MCP\\tdx-api-tickets-mcp\\dist\\index.js"],
      "env": {
        "TDX_PROD_CREDENTIALS_FILE": "C:\\Users\\username\\.config\\tdx-mcp\\prod-credentials.json",
        "TDX_DEFAULT_ENVIRONMENT": "prod"
      }
    }
  }
}
```

**Project-Specific Configuration:**
Asks for project path:
```
Enter project directory path
Example: 'C:\source\my-project'
```

Creates/updates `.mcp.json` and `.claude/settings.local.json` in that project.

### Step 6: Final Instructions

Claude tells you:
- Where files were created
- To restart Claude Code
- How to test the setup

## Testing Your Setup

After Claude completes setup and you restart Claude Code, test by asking:

> "List available TeamDynamix reports"

or

> "Get ticket 12345"

## Multiple Environments

You can run setup multiple times for different environments:

1. First time: "Set up TeamDynamix MCP for production"
2. Second time: "Set up TeamDynamix MCP for development"
3. Third time: "Set up TeamDynamix MCP for canary"

Each creates a separate credential file (`prod-credentials.json`, `dev-credentials.json`, `canary-credentials.json`).

## Updating Configuration

### Updating Existing Credentials

To update existing configuration, ask Claude:

> "Update my TeamDynamix MCP server configuration"

Claude will:
1. **Detect existing credentials** for all environments
2. **Show current configuration**:
   ```
   Current configuration found for 'prod':
     • URL: https://solutions.teamdynamix.com/TDWebApi
     • Username: john.doe@company.com
     • App IDs: 129, 245
   ```
3. **Ask what to update**:
   - [1] Change credentials (username/password)
   - [2] Modify application selection
   - [3] Change environment settings
   - [4] Add new environment (dev/canary)

### Common Update Scenarios

**Change password**:
> "Update my TeamDynamix password"

**Add new application**:
> "Add another TeamDynamix application to my configuration"

**Switch to different apps**:
> "Change which TeamDynamix applications I'm using"

**Add development environment**:
> "Set up TeamDynamix MCP for development environment"

**Reconfigure for different project**:
> "Configure TeamDynamix MCP for another project"

### What Gets Updated

When updating:
- ✅ Existing credentials are preserved (won't ask for everything again)
- ✅ Can selectively update username, password, or apps
- ✅ Can add new environments without affecting existing ones
- ✅ Changes take effect after Claude Code restart

## Troubleshooting

### "Authentication failed"
- Verify your username and password are correct
- Check that your account has API access in TeamDynamix
- Ensure the domain is correct for your environment

### "No ticketing apps found"
- Your account may not have access to ticketing apps
- Contact your TeamDynamix administrator
- Try manually entering app IDs if you know them

### Claude doesn't see the MCP server
- Verify credentials file exists at `~/.config/tdx-mcp/{env}-credentials.json`
- Check `.mcp.json` (project) or `~/.claude.json` (global) exists
- Restart Claude Code completely (quit and reopen)
- Check Claude Code's output panel for errors

### Password encryption fails
- Requires Windows DPAPI
- Must be running on Windows
- Ensure PowerShell is available


## What Gets Created

After setup completes, you'll have:

1. **Credentials file**: `~/.config/tdx-mcp/{environment}-credentials.json`
2. **MCP configuration**: Either `~/.claude.json` (global) or project's `.mcp.json`
3. **Claude settings**: `.claude/settings.local.json` (if project-specific)

All passwords are DPAPI-encrypted for security.

## Need Help?

Just ask Claude:
- "Help me set up TeamDynamix MCP server"
- "What's my current TeamDynamix MCP configuration?"
- "Update my TeamDynamix credentials"
- "Configure TeamDynamix MCP for a new project"

Claude can guide you through the entire process interactively - from cloning to configuration!
