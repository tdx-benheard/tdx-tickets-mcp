# TeamDynamix Tickets API MCP Server - Claude Reference

> **For detailed tool usage and examples, see [TOOLS.md](./TOOLS.md)**

## Quick Reference

**Active Environments:**
- **Production**: `https://solutions.teamdynamix.com/TDWebApi` (App ID: 129)
- **Development**: `http://localhost/TDDev/TDWebApi` (App ID: 627)
- **Canary**: `https://eng.teamdynamixcanary.com/TDWebApi` (App ID: TBD)

**Credential Directory:** `~/.config/tdx-mcp/` (Windows: `C:\Users\username\.config\tdx-mcp\`)

## Configuration

**Setup**: When the user asks to setup or configure the MCP server, follow the **MCP Server Setup Workflow** below.

**Documentation:**
- **[SETUP-GUIDE.md](./SETUP-GUIDE.md)** - User-facing setup guide (what to expect)
- **[TOOLS.md](./TOOLS.md)** - Complete tool reference with all parameters and examples
- **[README.md](./README.md)** - Human-readable setup and configuration guide

---

## MCP Server Setup Workflow

When the user requests setup (e.g., "Set up the TeamDynamix MCP server"), follow these steps exactly:

### Step 0: Install Dependencies and Build

**IMPORTANT**: Always run these first, even if user already cloned the repo.

1. **Check if in correct directory**:
   ```bash
   test -f package.json && echo "✓ In correct directory" || echo "✗ Not in MCP server directory"
   ```
   - If not in directory, ask user for path or help them navigate

2. **Install dependencies**:
   ```bash
   npm install
   ```
   - If fails, report error and stop
   - Common issue: Node.js not installed or wrong version

3. **Build TypeScript**:
   ```bash
   npm run build
   ```
   - If fails, report error and stop
   - This creates `dist/index.js` required for MCP server

4. **Verify build succeeded**:
   ```bash
   test -f dist/index.js && echo "✓ Build successful" || echo "✗ Build failed"
   ```

### Step 1: Gather Configuration

Ask the user these questions with examples:

**1. Environment**:
```
Which environment do you want to configure?
Examples: 'prod', 'dev', 'canary'
```

**2. Domain** (examples based on environment):
- If **prod**: `Enter your TeamDynamix domain (example: 'solutions.teamdynamix.com' or 'yourcompany.teamdynamix.com')`
- If **dev**: `Enter your TeamDynamix domain (example: 'localhost/TDDev')`
- If **canary**: `Enter your TeamDynamix domain (example: 'eng.teamdynamixcanary.com')`

Construct the full URL from domain:
- **prod**: `https://{domain}/TDWebApi`
- **dev**: `http://{domain}/TDWebApi` (note: http for localhost)
- **canary**: `https://{domain}/TDWebApi`

**3. Username**:
```
Enter your TeamDynamix username (example: 'john.doe@company.com')
```

**4. Password** - **SECURITY WARNING REQUIRED**:
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

**If user chooses 'chat'**:
- Ask: `Enter your TeamDynamix password (will be encrypted immediately):`
- Immediately encrypt it using PowerShell DPAPI command
- Do NOT echo the password back

**If user chooses 'tool'**:
- Tell them to run: `npm run encrypt-password`
- User enters password in their terminal (masked)
- Ask: `Paste the encrypted password (starting with 'dpapi:'):`
- Validate it starts with 'dpapi:'

**Alternative tool** (if npm not available):
- PowerShell: `powershell -ExecutionPolicy Bypass -File scripts/encrypt-password.ps1`

### Step 2: Validate Credentials

**IMPORTANT**: Always test authentication before saving anything.

1. **If user provided plaintext password**, encrypt it first:
   ```powershell
   powershell -Command "Add-Type -AssemblyName System.Security; $plain = 'PLAINTEXT_PASSWORD_HERE'; $encrypted = [Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($plain), $null, 'CurrentUser'); 'dpapi:' + [Convert]::ToBase64String($encrypted)"
   ```

2. **Decrypt password for testing** (only if encrypted):
   ```powershell
   powershell -Command "Add-Type -AssemblyName System.Security; $encrypted = 'BASE64_PART_HERE'; $decrypted = [Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($encrypted), $null, 'CurrentUser'); [Text.Encoding]::UTF8.GetString($decrypted)"
   ```

3. **Test authentication**:
   ```bash
   npx tsx -e "
   import axios from 'axios';
   const baseUrl = 'BASE_URL_HERE';
   const username = 'USERNAME_HERE';
   const password = 'DECRYPTED_PASSWORD_HERE';
   axios.post(\`\${baseUrl}/api/auth\`, { UserName: username, Password: password }, { timeout: 10000 })
     .then(r => console.log('✓ Authentication successful'))
     .catch(e => {
       if (e.code === 'ECONNABORTED') console.error('✗ Timeout: Cannot reach server');
       else if (e.response?.status === 401) console.error('✗ Invalid username or password');
       else console.error('✗ Authentication failed:', e.message);
       process.exit(1);
     });
   "
   ```
   - If fails, report error and ask user to verify credentials
   - Do NOT proceed if authentication fails

### Step 3: Fetch Available Applications

1. **Get authentication token** (from Step 2, or re-authenticate)

2. **Fetch applications**:
   ```bash
   npx tsx -e "
   import axios from 'axios';
   const baseUrl = 'BASE_URL_HERE';
   const token = 'TOKEN_HERE';
   axios.get(\`\${baseUrl}/api/applications\`, {
     headers: { Authorization: \`Bearer \${token}\`, 'Content-Type': 'application/json' },
     timeout: 10000
   })
     .then(r => {
       const apps = r.data.filter(a => a.Type === 'Ticketing' && a.Active);
       console.log(JSON.stringify(apps));
     })
     .catch(e => {
       console.error('✗ Failed to fetch applications:', e.message);
       process.exit(1);
     });
   "
   ```

3. **Display apps to user**:
   ```
   Available ticketing applications:
   [1] IT Support (ID: 129)
   [2] HR Requests (ID: 245)
   [3] Facilities (ID: 312)

   Select applications (examples: '1', '1,2', 'all'):
   ```

4. **Parse user selection**:
   - 'all' → use all app IDs
   - '1,2,3' → parse numbers, get corresponding app IDs
   - Validate selections are valid indices

5. **Fallback if fetch fails**:
   ```
   Unable to fetch applications automatically.
   Enter application IDs manually (comma-separated, example: '129,245'):
   ```

### Step 4: Create Credentials File

1. **Determine paths**:
   ```bash
   # Windows
   CONFIG_DIR="$HOME/.config/tdx-mcp"
   CREDS_FILE="$CONFIG_DIR/${environment}-credentials.json"
   ```

2. **Create directory if needed**:
   ```bash
   mkdir -p "$HOME/.config/tdx-mcp"
   ```

3. **Create credentials JSON**:
   ```json
   {
     "TDX_BASE_URL": "https://solutions.teamdynamix.com/TDWebApi",
     "TDX_USERNAME": "username",
     "TDX_PASSWORD": "dpapi:AQAAANCMnd8BFdERjHoAwE...",
     "TDX_TICKET_APP_IDS": "129,245"
   }
   ```

4. **Write file** using Write tool

5. **Verify file created**:
   ```bash
   test -f "$HOME/.config/tdx-mcp/${environment}-credentials.json" && echo "✓ Credentials saved"
   ```

### Step 5: Configure MCP Server Location

Ask user:
```
Where should the MCP server be available?

[1] Global - Available in all Claude Code projects
[2] Project - Available only in a specific project

Examples: '1' for global, '2' for project
```

**If user chooses Global (1)**:

1. **Get paths**:
   ```bash
   CLAUDE_JSON="$HOME/.claude.json"
   MCP_SERVER_PATH=$(pwd)
   CREDS_PATH="$HOME/.config/tdx-mcp/${environment}-credentials.json"
   ```

2. **Read existing config** (if exists):
   ```bash
   test -f "$HOME/.claude.json" && cat "$HOME/.claude.json"
   ```

3. **Merge or create config**:
   ```json
   {
     "mcpServers": {
       "tdx-api-tickets-mcp": {
         "type": "stdio",
         "command": "node",
         "args": ["/absolute/path/to/tdx-api-tickets-mcp/dist/index.js"],
         "env": {
           "TDX_PROD_CREDENTIALS_FILE": "/absolute/path/.config/tdx-mcp/prod-credentials.json",
           "TDX_DEFAULT_ENVIRONMENT": "prod"
         }
       }
     }
   }
   ```
   **IMPORTANT**: Use absolute paths (result of `pwd`) not relative paths!

4. **Write config** using Write tool

**If user chooses Project (2)**:

1. **Ask for project path**:
   ```
   Enter the project directory path (example: 'C:\source\my-project'):
   ```

2. **Validate path exists**:
   ```bash
   test -d "PROJECT_PATH" && echo "✓ Directory exists" || echo "✗ Directory not found"
   ```
   - If not found, ask again

3. **Check not configuring self**:
   ```bash
   # Compare absolute paths
   PROJECT_ABS=$(cd "PROJECT_PATH" && pwd)
   MCP_ABS=$(pwd)
   if [ "$PROJECT_ABS" = "$MCP_ABS" ]; then
     echo "✗ Cannot configure MCP server project to use itself"
     # Suggest using global config instead
   fi
   ```

4. **Create `.mcp.json`** in project directory:
   - Check if exists, merge if valid JSON
   - Use absolute path to dist/index.js
   - Use absolute path to credentials file

5. **Create `.claude/settings.local.json`**:
   ```json
   {
     "enableAllProjectMcpServers": true
   }
   ```

### Step 6: Completion

Report to user:
```
✓ Setup complete!

Files created:
  • Credentials: ~/.config/tdx-mcp/prod-credentials.json
  • MCP config: ~/.claude.json (or project/.mcp.json)

Next steps:
  1. Restart Claude Code (quit and reopen)
  2. Test by asking: "List available TeamDynamix reports"
```

---

## Updating Existing Configuration

If user asks to update/modify existing setup:

1. **Detect existing credentials**:
   ```bash
   ls "$HOME/.config/tdx-mcp/"
   ```

2. **Show current config**:
   ```bash
   cat "$HOME/.config/tdx-mcp/${environment}-credentials.json"
   ```

3. **Ask what to update**:
   ```
   Current configuration found for 'prod':
     • URL: https://solutions.teamdynamix.com/TDWebApi
     • Username: john.doe@company.com
     • App IDs: 129, 245

   What would you like to update?
   [1] Change credentials (username/password)
   [2] Modify application selection
   [3] Change environment settings
   [4] Add new environment (dev/canary)

   Select option (1-4):
   ```

4. **Apply updates** and re-save credentials file

---

## Error Handling

**Authentication timeout**:
```
✗ Authentication timeout after 10s.
  Check that the TeamDynamix server is accessible at {url}
```

**Invalid credentials**:
```
✗ Authentication failed: Invalid username or password
  Please verify your credentials are correct
```

**Build failure**:
```
✗ Build failed. Check that:
  • Node.js 18+ is installed
  • You're in the correct directory
  • package.json exists
```

**Network errors**:
```
✗ Cannot reach server at {url}
  Check that:
  • URL is correct
  • You have network connectivity
  • Server is online
```

**Credential files** (`~/.config/tdx-mcp/prod-credentials.json`, `dev-credentials.json`, `canary-credentials.json`):
```json
{
  "TDX_BASE_URL": "https://solutions.teamdynamix.com/TDWebApi",
  "TDX_USERNAME": "username",
  "TDX_PASSWORD": "dpapi:AQAAANCMnd8BFdERjHoAwE...",
  "TDX_TICKET_APP_IDS": "129"
}
```
**Password encryption**:
- **DPAPI encryption required** (Windows only): `"TDX_PASSWORD": "dpapi:AQAAANCMnd8BFdERjHoAwE..."`
- Claude handles password encryption during setup using PowerShell DPAPI commands
- Passwords are tied to your Windows user account and cannot be decrypted by others

**Environment variables**:
- `TDX_PROD_CREDENTIALS_FILE`: Path to prod credentials
- `TDX_DEV_CREDENTIALS_FILE`: Path to dev credentials
- `TDX_CANARY_CREDENTIALS_FILE`: Path to canary credentials
- `TDX_DEFAULT_ENVIRONMENT`: "prod", "dev", or "canary" (default: "prod")

**Using environments**: All tools accept optional `environment` parameter ("prod"/"dev"/"canary")
```javascript
tdx_get_ticket({ ticketId: 12345 })  // uses default (prod)
tdx_get_ticket({ ticketId: 555058, environment: "dev" })
tdx_get_ticket({ ticketId: 789, environment: "canary" })
```

## Testing
- Development: `npm run test:api`
- Production: `npm run test:prod`
- Canary: `npm run test:canary`

## Key API Behaviors

**Ticket Updates**:
- `tdx_update_ticket`: Partial update (auto-merges with current ticket)
- `tdx_edit_ticket`: Full update (requires all mandatory fields)

**Tags**: GET ticket does NOT return tags (API rollback #27053287). POST/DELETE work correctly.

**Reports**:
- `withData=true` returns ALL rows (no MaxResults limit). 90s SQL timeout only limit.
- API does NOT expose report filter criteria/WHERE clauses. Only returns: columns, sort order, max results, metadata.

**App ID Discovery**: Server tries each configured app ID until ticket found, then caches result.

**Field Names**: Tools use camelCase, API uses PascalCase (auto-converted).

## Architecture
- `index.ts`: MCP server, credential loading
- `client.ts`: TDXClient with axios, retry logic, error handling
- `auth.ts`: JWT tokens (24hr validity, 23hr cache per environment, thread-safe refresh)
- `tools.ts`: MCP tool schemas
- `handlers.ts`: Tool implementations
- `types.ts`: TypeScript interfaces for all API entities
- `utils.ts`: Shared utilities (password decoding, env validation, retry helpers)

## Error Handling & Resilience
- **401 Unauthorized**: Automatically invalidates token and retries once
- **Retryable errors** (408, 429, 500, 502, 503, 504): Automatic retry with exponential backoff (max 3 retries)
- **Timeout**: 20 seconds default (configurable per client)
- **Token refresh**: Thread-safe mutex prevents concurrent refresh requests
- **Cache invalidation**: Ticket app ID cache cleared on any error, not just 404s

## Security
- **DPAPI encryption required**: All passwords must be DPAPI-encrypted (Windows Data Protection API)
- **Password validation**: DPAPI encrypted data validated as base64 before decryption (prevents injection)
- **Input validation**: Base64 format validated with regex before PowerShell execution
- **No command injection**: Password decryption uses validated input only
- **User-scoped**: DPAPI ties encryption to Windows user account - others cannot decrypt

## Known Issues
- MCP server requires restart after code changes
- **FIXED**: ~~401 retry can infinite loop if token refresh fails~~ (now limited to 1 retry)
- **FIXED**: ~~Command injection vulnerability in DPAPI decryption~~ (now validates input)
