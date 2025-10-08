# TeamDynamix API MCP Server

## Current Status (2025-10-05)

**Completed:**
- ✅ Multi-app ID support with automatic ticket discovery and caching
- ✅ All ticket operations (search, get, update, edit, add feed)
- ✅ Report operations fixed to match API spec (POST for search, withData parameter)
- ✅ App ID discovery documentation
- ✅ Comprehensive troubleshooting guide
- ✅ Multiple instance support with separate credentials per environment
- ✅ Credential file loading via `TDX_CREDENTIALS_FILE` environment variable

**Tested & Working:**
- ✅ Authentication (JWT tokens with 23hr caching)
- ✅ Ticket search, get, update operations
- ✅ Report listing (returns all reports)
- ✅ Report running with data (withData=true confirmed working via direct API test)
- ✅ Credential loading from JSON files
- ✅ Multiple server instances (production + development) with separate credentials

**Known Issues:**
- ⚠️ MCP server requires restart after code changes for tools to reflect updates

**Active Environments:**
- **Production**: `https://solutions.teamdynamix.com/TDWebApi` (App ID: 129)
- **Development**: `http://localhost/TDDM/TDWorkManagement` (App ID: 627)

## Documentation
- **TeamDynamix Web API**: The API documentation is available at your TeamDynamix base URL (e.g., `https://solutions.teamdynamix.com/TDWebApi/` or `http://localhost/TDDev/TDWebApi/`)
- **MCP SDK**: https://github.com/modelcontextprotocol/sdk

## Configuration

### Option 1: Credential Files (Recommended for Multiple Environments)

Create JSON credential files in `~/.config/tdx/`:

**Production** (`~/.config/tdx/prod-credentials.json`):
```json
{
  "TDX_BASE_URL": "https://solutions.teamdynamix.com/TDWebApi",
  "TDX_USERNAME": "your-username",
  "TDX_PASSWORD": "your-password",
  "TDX_APP_ID": "129"
}
```

**Development** (`~/.config/tdx/dev-credentials.json`):
```json
{
  "TDX_BASE_URL": "http://localhost/TDDM/TDWorkManagement",
  "TDX_USERNAME": "your-dev-username",
  "TDX_PASSWORD": "your-dev-password",
  "TDX_APP_ID": "627"
}
```

**Configure MCP Servers** in `~/.claude.json` (Claude Code) or `claude_desktop_config.json` (Claude Desktop):

**Claude Code (`~/.claude.json`)**:
```json
{
  "mcpServers": {
    "tdx-api-mcp-prod": {
      "type": "stdio",
      "command": "node",
      "args": ["C:/source/mcp/tdx-api-mcp/dist/index.js"],
      "env": {
        "TDX_CREDENTIALS_FILE": "C:\\Users\\[username]\\.config\\tdx\\prod-credentials.json"
      }
    },
    "tdx-api-mcp-dev": {
      "type": "stdio",
      "command": "node",
      "args": ["C:/source/mcp/tdx-api-mcp/distindex.js"],
      "env": {
        "TDX_CREDENTIALS_FILE": "C:\\Users\\[username]\\.config\\tdx\\dev-credentials.json"
      }
    }
  }
}
```

**Claude Desktop (`claude_desktop_config.json`)**:
```json
{
  "mcpServers": {
    "tdx-api-mcp-prod": {
      "command": "node",
      "args": ["c:/source/mcp/tdx-api-mcp/dist/index.js"],
      "cwd": "c:/source/mcp/tdx-api-mcp",
      "env": {
        "TDX_CREDENTIALS_FILE": "C:\\Users\\[username]\\.config\\tdx\\prod-credentials.json"
      }
    },
    "tdx-api-mcp-dev": {
      "command": "node",
      "args": ["c:/source/mcp/tdx-api-mcp/dist/index.js"],
      "cwd": "c:/source/mcp/tdx-api-mcp",
      "env": {
        "TDX_CREDENTIALS_FILE": "C:\\Users\\[username]\\.config\\tdx\\dev-credentials.json"
      }
    }
  }
}
```

**Key Differences**:
- **Claude Code**: Uses `dist/` directory, includes `"type": "stdio"`
- **Claude Desktop**: Uses `dist/` directory, includes `"cwd"` field, omits `"type"`
- **Server naming**: Use descriptive names like `tdx-api-mcp-prod` and `tdx-api-mcp-dev`

**Benefits:**
- Multiple instances with separate credentials
- Credentials stored outside project directory
- No risk of committing credentials to git
- Easy to switch between environments

### Option 2: .env File (Legacy/Single Environment)

Create a `.env` file in the project root:

```env
TDX_BASE_URL=https://your-instance.teamdynamix.com/TDWebApi
TDX_USERNAME=your-username
TDX_PASSWORD=your-password
TDX_APP_ID=627
```

**Important:** Base URL must include the API path:
- Production: `https://instance.teamdynamix.com/TDWebApi`
- Sandbox: `https://instance.teamdynamix.com/SBTDWebApi`
- Local dev: `http://localhost/TDDev/TDWebApi` or `http://localhost/TDDM/TDWorkManagement`

**TDX_APP_ID Configuration:**
- **Required** - TeamDynamix API requires an application ID for all ticket operations
- **Single app**: `TDX_APP_ID=627` (only search in IT ticketing app)
- **Multiple apps**: `TDX_APP_ID=627,11,2` (comma-separated, enables auto-discovery)
- **How to find**: Check the URL when viewing a ticket in TeamDynamix frontend (e.g., `/Apps/627/Tickets/...`)
- **Common app IDs**: 2 (IT), 11 (Facilities), 627 (custom apps vary by organization)

**Note**: Fallback to `.env` file is maintained for backward compatibility.

## Testing

Test the API without restarting Claude Desktop:

**Development Environment:**
```bash
npm run test:api
```

**Production Environment:**
```bash
npx tsx src/test-prod.ts
```

These run direct API tests against TDXClient operations. Fast iteration: edit code → test → debug.

**Test Validation:**
- Both test suites verify that at least 1 ticket and 1 report are found
- Tests fail explicitly if API returns empty results
- Development: 4 tests (auth, search tickets, list reports, get ticket)
- Production: 5 tests (adds report execution with data validation)

## Architecture

### Files
- `index.ts` - MCP server entry point, tool routing, credential loading (JSON file or .env)
- `client.ts` - TDXClient with axios interceptors
- `auth.ts` - JWT token management (24hr validity, cached 23hr)
- `tools.ts` - MCP tool schemas
- `handlers.ts` - Tool implementations, camelCase→PascalCase conversion
- `test.ts` - Direct API testing script

### Credential Loading Flow
1. Check for `TDX_CREDENTIALS_FILE` environment variable
2. If set → Load JSON file and populate `process.env`
3. If not set → Fallback to `.env` file parsing (backward compatibility)
4. Validate required variables: `TDX_BASE_URL`, `TDX_USERNAME`, `TDX_PASSWORD`, `TDX_APP_ID`
5. Parse comma-separated `TDX_APP_ID` into array
6. Initialize TDXClient with credentials

### Authentication Flow
1. POST `/api/auth` with `{ username, password }` → JWT token
2. Token cached for 23 hours (1hr buffer before 24hr expiry)
3. Auto-refresh on 401 responses
4. Each server instance maintains its own token cache (isolated per environment)

### Request Flow
MCP call → Handler → Transform params → HTTP request → Auth interceptor adds JWT → Response

### Multiple Instance Architecture
- Each MCP server instance runs as a separate process
- Separate credential files → separate authentication tokens
- No shared state between production and development instances
- Tools prefixed by server name (e.g., `mcp__tdx-api-mcp-prod__tdx_get_ticket`, `mcp__tdx-api-mcp-dev__tdx_get_ticket`)
- Both instances can run simultaneously with different credentials and API endpoints

## API Endpoints

```
POST   /api/auth                        # Authentication
POST   /api/{appId}/tickets/search      # Search tickets
GET    /api/{appId}/tickets/{id}        # Get ticket (Note: Does NOT return tags due to API rollback)
POST   /api/{appId}/tickets/{id}        # Edit (full update)
PATCH  /api/{appId}/tickets/{id}        # Update (partial)
POST   /api/{appId}/tickets/{id}/feed   # Add comment
POST   /api/{appId}/tickets/{id}/tags   # Add tags (returns empty string on success)
DELETE /api/{appId}/tickets/{id}/tags   # Delete tags (returns empty string on success)
GET    /api/reports                     # List reports (global, filter by AppID)
POST   /api/reports/search              # Search reports (global, filter by AppID)
GET    /api/reports/{id}                # Run report
```

**Important Note on Tags:**
- POST and DELETE `/tags` endpoints work correctly
- Tags are stored in database and visible in TeamDynamix UI
- GET ticket endpoint does NOT return tags due to an API rollback (July 2025, problem #27053287)
- Empty string `""` response from tag endpoints indicates success
- See `Tag rollback issue.md` for complete details

**Important Note on Report Data:**
- When running reports with `withData=true`, ALL matching data is returned (no row limit enforced)
- The `MaxResults` property on reports is not enforced by the API when retrieving data
- 90-second SQL command timeout is the only practical limit
- Large reports may be slow, timeout, or cause memory issues
- Consider using reports with pre-configured filters to limit result size

## App ID Discovery

The MCP server implements automatic app ID discovery for ticket operations when multiple app IDs are configured.

### How It Works

1. **Ticket Lookup** - When you request a ticket by ID without specifying an app:
   - Checks cache first (if ticket was retrieved before)
   - Tries each configured app ID in order: `GET /api/627/tickets/{id}`, `GET /api/11/tickets/{id}`, etc.
   - Returns first successful match
   - Caches the successful app ID for that ticket

2. **Performance** - Cached app IDs mean subsequent requests go directly to the correct app

3. **Why This Is Necessary** - TeamDynamix API requires app ID in URL path:
   - ✅ Valid: `GET /api/627/tickets/555058`
   - ❌ Invalid: `GET /api/tickets/555058` (returns 404)

### Discovering Your App IDs

**Method 1: Frontend URL** (Recommended)
- Open a ticket in TeamDynamix web interface
- Check URL: `https://your-instance.teamdynamix.com/TDNext/Apps/627/Tickets/...`
- The number after `/Apps/` is your app ID

**Method 2: Trial and Error**
- Try common app IDs: `TDX_APP_ID=2,11,627`
- Server will automatically find which ones you have access to

## Field Name Conversions

API uses PascalCase, MCP tools use camelCase:

| MCP Tool (camelCase) | TDX API (PascalCase) |
|---------------------|---------------------|
| `searchText` | `SearchText` |
| `maxResults` | `MaxResults` |
| `statusIds` | `StatusIDs` |
| `priorityIds` | `PriorityIDs` |
| `comments` | `Comments` |
| `isPrivate` | `IsPrivate` |

## Constraints

### Edit Ticket (PUT) Requirements
Must include at least one of:
- `RequestorEmail`
- `RequestorUid`
- `AccountID`

### Non-Editable Fields (if ticket converted to task)
- `StartDate`, `EndDate`, `EstimatedMinutes`
- `ResponsibleGroupID`, `ResponsibleUid`
- `StatusID` (if task not completed)

## Settings

- HTTP timeout: 20 seconds
- Token expiry: 23 hours (hardcoded)
- Error format: `{ content: [{ type: 'text', text: 'Error: ...' }], isError: true }`

## Multiple Instances & Environment Management

### Running Multiple Instances Simultaneously

You can run production and development instances at the same time:

1. **Configure both in your MCP config** (as shown in Configuration section above)
2. **Restart Claude Desktop or Claude Code** to load both servers
3. **Verify both servers loaded**:
   - **Claude Desktop**: Check MCP icon in bottom-right - both `tdx-api-mcp-prod` and `tdx-api-mcp-dev` should be listed
   - **Claude Code**: Use `/mcp` command - should show both server instances
4. **Tool naming**: Tools from each instance are prefixed with server name:
   - Production: `mcp__tdx-api-mcp-prod__tdx_get_ticket`
   - Development: `mcp__tdx-api-mcp-dev__tdx_get_ticket`

### Switching Between Environments

When using multiple instances, specify which environment in your request:

```
Examples:
- "Get ticket 12345 from production"
- "Search development tickets for bug reports"
- "Use the production server to list reports"
- "Update ticket 555058 in development"
```

The AI will automatically use the correct server instance based on your instruction.

### Adding More Environments

To add additional environments (staging, testing, etc.):

1. Create new credential file: `~/.config/tdx/staging-credentials.json`
2. Add new entry to `mcpServers` in your config:
   ```json
   "tdx-staging": {
     "type": "stdio",
     "command": "node",
     "args": ["C:/source/mcp/tdx-api-mcp/dist/index.js"],
     "env": {
       "TDX_CREDENTIALS_FILE": "C:\\Users\\[username]\\.config\\tdx\\staging-credentials.json"
     }
   }
   ```
3. Restart Claude Desktop/Code

### Security Best Practices

- **Never commit credential files to git** - Add `*.config/tdx/*.json` to `.gitignore`
- **Use restrictive file permissions** - Credential files should only be readable by your user account
- **Separate credentials per environment** - Don't reuse production credentials in development
- **Regular password rotation** - Update credential files when passwords change

## Troubleshooting

### Multiple Instance Issues

**Problem**: Tools not showing up with server prefix
- **Cause**: Server names in config not matching expected format
- **Solution**: Use descriptive names like `tdx-production`, verify with `/mcp` command

**Problem**: Wrong credentials being used
- **Cause**: `TDX_CREDENTIALS_FILE` path incorrect or file not found
- **Solution**: Verify file paths, check server logs for "Failed to load credentials file" errors

**Problem**: Both instances connecting to same environment
- **Cause**: Both pointing to same credentials file
- **Solution**: Double-check `TDX_CREDENTIALS_FILE` paths in config, ensure each points to different file

### App ID Issues

**Problem**: Ticket not found (404 error)
- **Cause**: Ticket doesn't exist in any of your configured app IDs
- **Solution**: Verify ticket exists in TeamDynamix frontend, check which app it belongs to, add that app ID to `TDX_APP_ID`

**Problem**: Slow ticket lookups with many app IDs
- **Cause**: Server tries each app ID sequentially on first lookup
- **Solution**:
  - Order app IDs by frequency of use (most common first)
  - After first lookup, results are cached and fast
  - Consider reducing to only apps you actively use

**Problem**: Cannot access tickets from certain apps
- **Cause**: User permissions in TeamDynamix
- **Solution**: Request access from TeamDynamix admin, verify you can see tickets in web interface first

## Known Issues

1. **401 retry loop** - client.ts:28-34 can infinite loop if token refresh fails
2. **Weak typing** - Heavy use of `any` types throughout

## Potential Improvements

- Add retry limit to 401 handler (prevent infinite loop)
- Define TypeScript interfaces for API models
- Add structured logging
- Make timeout/expiry configurable
- Add input validation (Zod)
- Enable TypeScript strict mode
