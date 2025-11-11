# TeamDynamix Tickets API MCP Server

An MCP (Model Context Protocol) server that lets Claude Code and Claude Desktop interact with TeamDynamix Web API. Search tickets, manage users/groups, run reports, and more.

## What Does This Do?

This MCP server gives Claude the ability to:
- 🎫 **Search and manage TeamDynamix tickets** - Find tickets by various criteria, get details, update status, add comments
- 👥 **Look up users and groups** - Search for people and groups in your TeamDynamix instance
- 📊 **Run reports** - Execute TeamDynamix reports with client-side filtering and pagination
- 🔄 **Work across environments** - Supports production, development, and canary environments

**For Claude Code users:** Once installed, you can ask Claude questions like "Show me all open tickets assigned to John Doe" or "Get details for ticket #12345" and Claude will use this MCP server to fetch the data directly from TeamDynamix.

---

## Claude Code Quick Setup

**TL;DR for Claude Code users:**
```bash
git clone https://github.com/tdx-benheard/tdx-api-tickets-mcp.git
cd tdx-api-tickets-mcp
npm run setup
# Follow the prompts, then restart Claude Code
```

That's it! The setup wizard handles everything: dependencies, credentials, encryption, and Claude Code configuration.

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- TeamDynamix account with API access
- Claude Desktop or Claude Code (VS Code extension)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tdx-benheard/tdx-api-tickets-mcp.git
   cd tdx-api-tickets-mcp
   ```

2. **Run interactive setup:**
   ```bash
   npm run setup
   ```

   The setup script will automatically install dependencies and build the project if needed.

   The setup wizard will:
   - Detect existing credentials and let you reuse or update them
   - Show current app configuration with titles (if credentials exist)
   - Authenticate and fetch available ticketing applications
   - Let you select which applications to use (marks currently selected apps with ✓)
   - Encrypt your password (DPAPI on Windows, base64 on other platforms)
   - Ask where to configure: **Global** (all projects) or **Specific Project** (one directory)
   - Create credentials file at `~/.config/tdx-mcp/{environment}-credentials.json`
   - Configure either `~/.claude.json` (global) or project's `.mcp.json` + settings

   **Example:**
   ```
   🌍 Select environment:
   [1] Production (prod)
   [2] Development (dev)
   [3] Canary (canary)

   Select environment (1-3, default: 1): 1

   📍 Enter your TeamDynamix instance URL
   Base URL: https://solutions.teamdynamix.com/TDWebApi

   👤 Username: user@example.com
   🔒 Password: ********

   ✓ Authentication successful
   ✓ Found 15 applications

   📋 Available Ticketing Applications:
   ═══════════════════════════════════════════════════════════
   [1] IT Support (ID: 129)
       Customer and IT support requests
   [2] HR Requests (ID: 245)
       Human resources ticketing
   [3] Facilities (ID: 312)
       Building and facilities management
   ═══════════════════════════════════════════════════════════

   Select applications (comma-separated numbers, e.g., "1,3" or "all"): 1

   ✓ Selected 1 application(s): 129
   🔐 Encrypting password...
   ✓ Password encrypted
   💾 Writing credentials to: ~/.config/tdx-mcp/prod-credentials.json
   ⚙️  Creating .mcp.json for Claude Code...
   ✓ Created .mcp.json
   ⚙️  Configuring .claude/settings.local.json...
   ✓ Updated .claude/settings.local.json

   ╔═══════════════════════════════════════════════════════════╗
   ║  ✅ Setup Complete!                                       ║
   ╚═══════════════════════════════════════════════════════════╝

   📄 Files created:
      • Credentials: ~/.config/tdx-mcp/prod-credentials.json
      • MCP config: .mcp.json
      • Claude settings: .claude/settings.local.json

   📋 Next Steps:
      1. Restart Claude Code to load the MCP server
      2. Test by asking Claude: "List available TeamDynamix reports"

   💡 The MCP server is now configured and ready to use!
   ```

3. **Restart Claude Code** to load the MCP server.

4. **Test:** Ask Claude "List available TeamDynamix reports"

### Re-running Setup

You can run `npm run setup` multiple times to:
- Add the MCP server to additional projects (choose "Specific Project")
- Configure for global use after initially configuring for one project
- Update credentials when they change (choose "Update credentials")
- Modify which ticket applications are selected (choose "Modify app selection")
- Add additional environments (dev, canary) by selecting a different environment

The setup script is non-destructive and will:
- Reuse existing credentials when possible
- Merge with existing `.mcp.json` files (won't overwrite other MCP servers)
- Preserve existing `.claude/settings.local.json` settings

---

## Manual Setup (Advanced)

If you prefer manual configuration:

1. Create credentials directory and file:
   ```bash
   mkdir -p ~/.config/tdx-mcp
   ```

   Create `~/.config/tdx-mcp/prod-credentials.json`:
   ```json
   {
     "TDX_BASE_URL": "https://your-instance.teamdynamix.com/TDWebApi",
     "TDX_USERNAME": "your.username@example.com",
     "TDX_PASSWORD": "your-password",
     "TDX_TICKET_APP_IDS": "129"
   }
   ```

2. Create `.mcp.json` in project root (use absolute paths):
   ```json
   {
     "mcpServers": {
       "tdx-api-tickets-mcp": {
         "type": "stdio",
         "command": "node",
         "args": ["/absolute/path/to/tdx-api-tickets-mcp/dist/index.js"],
         "env": {
           "TDX_PROD_CREDENTIALS_FILE": "/absolute/path/to/.config/tdx-mcp/prod-credentials.json",
           "TDX_DEFAULT_ENVIRONMENT": "prod"
         }
       }
     }
   }
   ```

3. Create `.claude/settings.local.json`:
   ```json
   {
     "enableAllProjectMcpServers": true
   }
   ```

4. Restart Claude Code

---

## Troubleshooting

### Setup fails with "Authentication failed"
- Verify your username and password are correct
- Ensure `TDX_BASE_URL` ends with `/TDWebApi`
- Check that your account has API access enabled in TeamDynamix
- Confirm you're using the correct TeamDynamix instance URL

### Claude Code doesn't see the MCP server
- Verify `.mcp.json` exists in your project root
- Check `.claude/settings.local.json` has `"enableAllProjectMcpServers": true`
- Ensure the credentials file exists at `~/.config/tdx-mcp/prod-credentials.json`
- Restart Claude Code completely (quit and reopen, not just reload window)
- Check Claude Code's output panel for MCP server errors

### "No active ticketing applications found"
- Your account may not have access to any ticketing applications
- Contact your TeamDynamix administrator to verify permissions
- Try selecting "Development" environment if you have dev access

### Password encryption fails (Windows)
- The setup script will automatically fall back to base64 encoding
- This is less secure but still encoded - consider using DPAPI-encrypted passwords manually
- See the password format examples in the Manual Setup section

---

## Features

- **Report-Based Ticket Search** - Efficient searching/listing via reports with client-side filtering and pagination
- **Ticket Management** - Get by ID, update, comment on tickets
- **User/Group Lookup** - Search and retrieve TeamDynamix users and groups
- **Multi-Environment** - Support for production, development, and canary environments

## What's New

**Recent Enhancements (2025-11-10):**
- 🔄 Removed `tdx_search_tickets` tool entirely - forces report-based searching (more efficient)
- ✨ Added pagination with metadata (`page`, `pageSize`, `hasNextPage`)
- ✨ Added report filtering (`filterResponsibleFullName`, `filterStatusName`, `filterText`)
- 🛡️ Token limit protection with automatic truncation
- 📝 Comprehensive tool documentation in [TOOLS.md](./TOOLS.md)
- 📋 Simplified tool set: Reports for searching, `tdx_get_ticket` for details

## Documentation

- **[TOOLS.md](./TOOLS.md)** - Complete tool reference with examples (for Claude)
- **[CLAUDE.md](./CLAUDE.md)** - Quick reference for Claude (configuration, key behaviors, architecture)

## Multiple Environments

Create separate credential files for each environment:
- `prod-credentials.json` - Production
- `dev-credentials.json` - Development
- `canary-credentials.json` - Canary

Reference them in your configuration:
```json
"env": {
  "TDX_PROD_CREDENTIALS_FILE": "/path/to/prod-credentials.json",
  "TDX_DEV_CREDENTIALS_FILE": "/path/to/dev-credentials.json",
  "TDX_CANARY_CREDENTIALS_FILE": "/path/to/canary-credentials.json",
  "TDX_DEFAULT_ENVIRONMENT": "prod"
}
```

Claude can then use: `{ ticketId: 12345, environment: "dev" }`

## Security

- Credentials stored outside project directory
- Never committed to version control
- Supports plain text, Base64, or Windows DPAPI-encrypted passwords
- File format: `"TDX_PASSWORD": "dpapi:AQAAANCMnd8BFdERjHoAwE..."`

## Development

```bash
npm run build      # Build TypeScript
npm run dev        # Watch mode
npm run test:api   # Test dev environment
npm run test:prod  # Test prod environment
```

## API Endpoints

The server uses these TeamDynamix API endpoints:
- `POST /api/auth` - Authentication (sends `{UserName, Password}`)
- `POST /api/{appId}/tickets/search` - Search tickets
- `GET /api/{appId}/tickets/{id}` - Get ticket
- `POST /api/{appId}/tickets/{id}` - Update ticket
- `POST /api/{appId}/tickets/{id}/feed` - Add comment
- `GET /api/reports/{id}` - Run report
- `POST /api/people/lookup` - Search users
- `POST /api/groups/search` - Search groups

## License

[Your License Here]

## Support

For issues and feature requests, see [GitHub Issues](https://github.com/tdx-benheard/tdx-api-tickets-mcp/issues).
