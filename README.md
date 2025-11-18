# TeamDynamix Tickets API MCP Server

An MCP (Model Context Protocol) server that lets Claude interact with TeamDynamix Web API. Search tickets, manage users/groups, run reports, and more.

## What Does This Do?

This MCP server gives Claude the ability to:
- 🎫 **Search and manage tickets** - Find tickets, get details, update status, add comments
- 👥 **Look up users and groups** - Search for people and groups in your TeamDynamix instance
- 📊 **Run reports** - Execute reports with client-side filtering and pagination
- 🔄 **Work across environments** - Supports production, development, test, and canary

Once installed, ask Claude: *"Show me all open tickets assigned to John Doe"* or *"Get details for ticket #12345"*

---

## Quick Setup

### Prerequisites
- Node.js 18+ and npm
- TeamDynamix account with API access
- Claude Code
- Windows (for DPAPI password encryption)

### Installation

1. **Navigate to the server directory:**
   ```bash
   cd tdx-api-tickets-mcp
   ```

2. **Ask Claude to set it up:**

   In Claude Code, simply ask:
   > "Set up the TeamDynamix MCP server for me"

   Claude will guide you through the entire setup process interactively.

3. **Restart Claude Code** in your project directory and test:
   > "Show me all TDX reports"

### What to Expect

When you ask Claude to set up the server:
1. **Setup tool** - Claude will have you run `npm run setup` in a separate terminal
2. **Credentials** - You'll enter your TDX username/password (masked, encrypted with DPAPI)
3. **Installation** - Claude asks where you want to use the server (creates `.mcp.json` with absolute path)
4. **Restart** - Restart Claude Code to load the MCP server

Your credentials are stored in `~/.config/tdx-mcp/` (shared across projects), and `.mcp.json` is portable to other projects.

---

## Security

- **DPAPI Encryption**: Passwords encrypted using Windows Data Protection API
- **User-scoped**: Tied to your Windows user account - others cannot decrypt
- **Outside repo**: Credentials stored in `~/.config/tdx-mcp/` (not in version control)
- **Masked input**: Password never appears in terminal or chat during setup

---

## Using in Other Projects

The server configuration is **portable and reusable**:

- **Credentials are shared**: Stored in `~/.config/tdx-mcp/`, used by all projects
- **`.mcp.json` is portable**: Copy to any project and update the `args` path to absolute

**To add to another project:**

Ask Claude: *"Install the TeamDynamix MCP server to my project"*

Or manually:
```bash
cp .mcp.json /path/to/another-project/
# Edit .mcp.json and update args to absolute path:
# "args": ["C:/source/mcp/tdx-api-tickets-mcp/dist/index.js"]
```

---

## Multiple Environments

Default setup configures production only. To add test/dev/canary:

Ask Claude: *"Add development environment to TeamDynamix MCP"*

Or manually:
```bash
npm run setup-advanced
```

Each environment gets its own credential file in `~/.config/tdx-mcp/`:
- `prod-credentials.json` - Production (solutions.teamdynamix.com)
- `test-credentials.json` - Test environment
- `canary-credentials.json` - Canary environment
- `dev-credentials.json` - Development (localhost)

---

## Updating Configuration

To update credentials, change apps, or add environments:

Ask Claude: *"Update my TeamDynamix MCP server configuration"*

Claude will detect existing credentials and let you selectively update.

---

## Claude Workflows

For development projects using this MCP server, you can set up standardized Claude workflows. See "workflow examples" for more info.

---

## Documentation

- **[TOOLS.md](./TOOLS.md)** - Complete tool reference with examples (for Claude)
- **[CLAUDE.md](./CLAUDE.md)** - Quick reference (configuration, architecture, key behaviors)
- **[UNINSTALL.md](./UNINSTALL.md)** - Complete removal instructions

---

## Troubleshooting

**Claude doesn't see the MCP server:**
- Verify `.mcp.json` exists in your project root (or `~/.claude.json` for global)
- Check credentials exist: `~/.config/tdx-mcp/prod-credentials.json`
- Restart Claude Code completely (quit and reopen)

**Authentication fails:**
- Verify username/password are correct
- Check your account has API access in TeamDynamix
- Ask Claude: *"Update my TeamDynamix credentials"*

**No ticketing apps found:**
- Your account may not have access to ticketing apps
- Contact your TeamDynamix administrator

For other issues, ask Claude: *"Help troubleshoot my TeamDynamix MCP server"*

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
