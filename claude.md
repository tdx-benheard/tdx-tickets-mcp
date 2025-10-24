# TeamDynamix Tickets API MCP Server

## Active Environments
- **Production**: `https://solutions.teamdynamix.com/TDWebApi` (App ID: 129)
- **Development**: `http://localhost/TDDev/TDWebApi` (App ID: 627)

## Configuration

**Credential files** (`~/.config/tdx/prod-credentials.json`, `dev-credentials.json`):
```json
{
  "TDX_BASE_URL": "https://solutions.teamdynamix.com/TDWebApi",
  "TDX_USERNAME": "username",
  "TDX_PASSWORD": "password",
  "TDX_TICKET_APP_IDS": "129"
}
```
**Password encoding**: Passwords can be base64-encoded with `"base64:"` prefix: `"TDX_PASSWORD": "base64:Qm...=="`

**Environment variables**:
- `TDX_PROD_CREDENTIALS_FILE`: Path to prod credentials
- `TDX_DEV_CREDENTIALS_FILE`: Path to dev credentials
- `TDX_DEFAULT_ENVIRONMENT`: "prod" or "dev" (default: "prod")

**Using environments**: All tools accept optional `environment` parameter ("prod"/"dev")
```javascript
tdx_get_ticket({ ticketId: 12345 })  // uses default (prod)
tdx_get_ticket({ ticketId: 555058, environment: "dev" })
```

## Testing
- Development: `npm run test:api`
- Production: `npm run test:prod`

## Key API Behaviors

**Ticket Updates**:
- `tdx_update_ticket`: Partial update (auto-merges with current ticket)
- `tdx_edit_ticket`: Full update (requires all mandatory fields)

**Tags**: GET ticket does NOT return tags (API rollback #27053287). POST/DELETE work correctly.

**Reports**: `withData=true` returns ALL rows (no MaxResults limit). 90s SQL timeout only limit.

**App ID Discovery**: Server tries each configured app ID until ticket found, then caches result.

**Field Names**: Tools use camelCase, API uses PascalCase (auto-converted).

## Architecture
- `index.ts`: MCP server, credential loading
- `client.ts`: TDXClient with axios
- `auth.ts`: JWT tokens (24hr validity, 23hr cache per environment)
- `tools.ts`: MCP tool schemas
- `handlers.ts`: Tool implementations

## Known Issues
- MCP server requires restart after code changes
- 401 retry can infinite loop if token refresh fails
