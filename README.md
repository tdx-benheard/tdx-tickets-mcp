# TeamDynamix Tickets API MCP Server

An MCP (Model Context Protocol) server that lets Claude interact with TeamDynamix Web API. Search tickets, manage users/groups, run reports, and more.

## What Does This Do?

This MCP server gives Claude the ability to:
- 🎫 **Search and manage tickets** - Find tickets, get details, update status, add comments
- 👥 **Look up users and groups** - Search for people and groups in your TeamDynamix instance
- 📊 **Run reports** - Execute reports with client-side filtering and pagination
- 🔄 **Work across environments** - Supports production, development, and canary

Once installed, ask Claude: *"Show me all open tickets assigned to John Doe"* or *"Get details for ticket #12345"*

---

## Quick Setup

### Prerequisites
- Node.js 18+ and npm
- TeamDynamix account with API access
- Claude Code
- Windows (for DPAPI password encryption)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tdx-benheard/tdx-api-tickets-mcp.git
   cd tdx-api-tickets-mcp
   ```

2. **Ask Claude to set it up:**

   In Claude Code, simply ask:
   > "Set up the TeamDynamix MCP server for me"

   Claude will automatically:
   - Install dependencies and build the project
   - Ask for your environment (prod/dev/canary) and TeamDynamix domain
   - Ask for username and password
   - Test authentication and fetch available ticketing apps
   - Encrypt your password with DPAPI
   - Create all configuration files
   - Set up global or project-specific configuration

   See **[SETUP-GUIDE.md](./SETUP-GUIDE.md)** for detailed instructions.

3. **Restart Claude Code** and test:

   Ask Claude: *"List available TeamDynamix reports"*

---

## Security

- **DPAPI Encryption Required**: Passwords are encrypted using Windows Data Protection API
- Credentials stored in `~/.config/tdx-mcp/` (outside project directory)
- DPAPI ties encryption to your Windows user account - others cannot decrypt
- Password format: `"TDX_PASSWORD": "dpapi:AQAAANCMnd8BFdERjHoAwE..."`
- **Encryption tool**: Run `npm run encrypt-password` for secure password entry (never visible in chat)

---

## Multiple Environments

Run setup for each environment to create separate credential files:
- `prod-credentials.json` - Production
- `dev-credentials.json` - Development
- `canary-credentials.json` - Canary

Claude can then specify environment in tool calls: `{ ticketId: 12345, environment: "dev" }`

## Updating Configuration

To update credentials, change apps, or add environments:

> "Update my TeamDynamix MCP server configuration"

Claude will detect existing credentials and let you:
- Change password or username
- Modify which applications are selected
- Add new environments (dev/canary)
- Reconfigure for different projects

See **[SETUP-GUIDE.md](./SETUP-GUIDE.md#updating-configuration)** for detailed update scenarios.

---

## Troubleshooting

### Authentication fails
- Verify username/password are correct
- Check that your account has API access in TeamDynamix
- Ensure domain is correct for your environment

### Claude doesn't see the MCP server
- Verify credentials file exists at `~/.config/tdx-mcp/prod-credentials.json`
- Check `.mcp.json` (project) or `~/.claude.json` (global) exists
- Restart Claude Code completely (quit and reopen)
- Check Claude Code output panel for errors

### No ticketing applications found
- Your account may not have access to ticketing apps
- Contact your TeamDynamix administrator

### Password encryption fails
- Requires Windows DPAPI - must be running on Windows
- Ensure PowerShell is available

See **[SETUP-GUIDE.md](./SETUP-GUIDE.md)** for more troubleshooting help.

---

## Documentation

- **[SETUP-GUIDE.md](./SETUP-GUIDE.md)** - Detailed Claude-driven setup instructions
- **[TOOLS.md](./TOOLS.md)** - Complete tool reference with examples (for Claude)
- **[CLAUDE.md](./CLAUDE.md)** - Quick reference (configuration, architecture, key behaviors)
- **[UNINSTALL.md](./UNINSTALL.md)** - Complete removal instructions

---

## Development

```bash
npm run build      # Build TypeScript
npm run dev        # Watch mode
npm run test:api   # Test dev environment
npm run test:prod  # Test prod environment
```

---

## License

[Your License Here]

## Support

For issues and feature requests, see [GitHub Issues](https://github.com/tdx-benheard/tdx-api-tickets-mcp/issues).
