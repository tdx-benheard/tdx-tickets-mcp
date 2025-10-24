# TeamDynamix Tickets API MCP Server

An MCP (Model Context Protocol) server for interacting with the TeamDynamix Web API. This server provides tools for managing tickets, people, groups, and running reports through the TeamDynamix platform.

## Prerequisites

- **Node.js** 18+ and npm installed
- Access to a TeamDynamix instance with valid credentials
- **Claude Desktop** or **Claude Code** (VS Code extension) installed

## Setup

1. **Clone or download this repository** to your local machine

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. **Create credential files**:

   Create a directory for credentials (if it doesn't exist):
   - **Windows**: `C:\Users\YourUsername\.config\tdx\`
   - **macOS/Linux**: `~/.config/tdx/`

   Create credential JSON file(s):

   **Production** (`prod-credentials.json`):
   ```json
   {
     "TDX_BASE_URL": "https://your-instance.teamdynamix.com/TDWebApi",
     "TDX_USERNAME": "your.username@example.com",
     "TDX_PASSWORD": "your-password",
     "TDX_TICKET_APP_IDS": "129"
   }
   ```

   **Development** (optional - `dev-credentials.json`):
   ```json
   {
     "TDX_BASE_URL": "http://localhost/TDDev/TDWebApi",
     "TDX_USERNAME": "your-dev-username",
     "TDX_PASSWORD": "your-dev-password",
     "TDX_TICKET_APP_IDS": "627"
   }
   ```

   **Important Notes:**
   - Replace `your-instance.teamdynamix.com` with your actual TeamDynamix instance URL
   - `TDX_BASE_URL` must include `/TDWebApi` at the end
   - To find your **App ID**: Open a ticket in TeamDynamix and check the URL (e.g., `/Apps/129/Tickets/...` - the number after `/Apps/` is your App ID)
   - You can specify multiple app IDs separated by commas: `"129,2,11"`
   - If you only need one environment, just create `prod-credentials.json`

5. **Configure Claude Desktop or Claude Code**:

   You can configure the MCP server at different scopes:

   ### Option A: User-Level Configuration (Global)

   Available for all projects when you open Claude.

   **For Claude Desktop:**

   Find and edit `claude_desktop_config.json`:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

   Add this configuration (replace paths with your actual paths):
   ```json
   {
     "mcpServers": {
       "tdx-api-tickets-mcp": {
         "command": "node",
         "args": ["/absolute/path/to/tdx-api-tickets-mcp/dist/index.js"],
         "cwd": "/absolute/path/to/tdx-api-tickets-mcp",
         "env": {
           "TDX_PROD_CREDENTIALS_FILE": "/absolute/path/to/.config/tdx/prod-credentials.json",
           "TDX_DEV_CREDENTIALS_FILE": "/absolute/path/to/.config/tdx/dev-credentials.json",
           "TDX_DEFAULT_ENVIRONMENT": "prod"
         }
       }
     }
   }
   ```

   **For Claude Code (User-Level):**

   Edit `~/.claude.json` (creates automatically when you install Claude Code):
   ```json
   {
     "mcpServers": {
       "tdx-api-tickets-mcp": {
         "type": "stdio",
         "command": "node",
         "args": ["/absolute/path/to/tdx-api-tickets-mcp/dist/index.js"],
         "env": {
           "TDX_PROD_CREDENTIALS_FILE": "/absolute/path/to/.config/tdx/prod-credentials.json",
           "TDX_DEV_CREDENTIALS_FILE": "/absolute/path/to/.config/tdx/dev-credentials.json",
           "TDX_DEFAULT_ENVIRONMENT": "prod"
         }
       }
     }
   }
   ```

   ### Option B: Project-Level Configuration (Recommended for Development)

   Only available when Claude Code is opened in that specific project directory.

   **For Claude Code (Project-Level):**

   Create a `.clauderc` file in your **project root directory**:
   ```json
   {
     "mcpServers": {
       "tdx-api-tickets-mcp": {
         "type": "stdio",
         "command": "node",
         "args": ["/absolute/path/to/tdx-api-tickets-mcp/dist/index.js"],
         "env": {
           "TDX_PROD_CREDENTIALS_FILE": "/absolute/path/to/.config/tdx/prod-credentials.json",
           "TDX_DEV_CREDENTIALS_FILE": "/absolute/path/to/.config/tdx/dev-credentials.json",
           "TDX_DEFAULT_ENVIRONMENT": "prod"
         }
       }
     }
   }
   ```

   **Benefits of project-level configuration:**
   - Only loads when working in that project
   - Can use different MCP servers for different projects
   - Can be committed to git (but **never commit credential files!**)
   - Team members can use the same MCP server configuration

   **Important:** Add `.clauderc` to your project's `.gitignore` if it contains any sensitive paths or information.

   ---

   **Path Examples:**
   - Windows: `"C:\\Users\\YourUsername\\projects\\tdx-api-tickets-mcp\\dist\\index.js"`
   - macOS/Linux: `"/Users/yourname/projects/tdx-api-tickets-mcp/dist/index.js"`

   **Notes:**
   - Use absolute paths (not relative like `./` or `../`)
   - On Windows, use double backslashes `\\` or forward slashes `/`
   - If you only have production credentials, omit `TDX_DEV_CREDENTIALS_FILE`
   - Project-level config (`.clauderc`) takes precedence over user-level config

6. **Restart Claude Desktop/Code** to load the new MCP server

7. **Verify installation**: In Claude, try asking "List available TeamDynamix reports" - if configured correctly, the server will respond with your reports.

See [CLAUDE.md](./CLAUDE.md) for detailed configuration, troubleshooting, and advanced features.

## Security

Credentials are stored outside the project directory:
- **Recommended**: Use credential JSON files in `~/.config/tdx/`
- **Legacy**: `.env` file in project root (backward compatible)
- Credential files are gitignored and never committed to version control
- Supports multiple environments with separate credentials (prod, dev, etc.)

### Important Security Notes:
- Never commit credential files to git
- Set restrictive file permissions (read-only for your user)
- Consider using file system encryption (Windows EFS, etc.)
- Use separate credentials per environment
- Rotate passwords regularly

## Available Tools

**Environment Selection:** All tools support an optional `environment` parameter:
- `environment` (string, optional): Environment to use - "prod" or "dev" (defaults to "prod")
- Example: `{ ticketId: 12345, environment: "dev" }` to use development environment

### Ticket Management

#### `tdx_search_tickets`
Search for TeamDynamix tickets using various criteria.

**Parameters:**
- `environment` (string, optional): Environment to use - "prod" or "dev" (default: "prod")
- `searchText` (string, optional): Text to search for in tickets
- `maxResults` (number, optional): Maximum number of results to return (default: 50)
- `statusIds` (array of numbers, optional): Array of status IDs to filter by
- `priorityIds` (array of numbers, optional): Array of priority IDs to filter by
- `appId` (string, optional): TeamDynamix application ID to search in

---

#### `tdx_get_ticket`
Get a TeamDynamix ticket by ID.

**Parameters:**
- `ticketId` (number, required): ID of the ticket to retrieve
- `appId` (string, optional): TeamDynamix application ID (auto-detected if not provided)

---

#### `tdx_edit_ticket`
Edit a TeamDynamix ticket (full update - requires all fields).

**Parameters:**
- `ticketId` (number, required): ID of the ticket to edit
- `ticketData` (object, required): Complete ticket data for update
- `appId` (string, optional): TeamDynamix application ID (auto-detected if not provided)

**Important**: The ticketData object must include at least one of:
- `RequestorEmail` (string)
- `RequestorUid` (string)
- `AccountID` (number)

**Common Ticket Object Fields:**
```javascript
{
  // Required (at least one)
  RequestorEmail: "user@example.com",
  RequestorUid: "user-uid",
  AccountID: 123,

  // Common fields
  Title: "Ticket title",
  Description: "Ticket description",
  StatusID: 456,
  PriorityID: 789,
  TypeID: 101,
  TypeCategoryID: 102,

  // Assignment
  ResponsibleGroupID: 201,
  ResponsibleUid: "responsible-uid",

  // Dates
  StartDate: "2024-01-01T00:00:00Z",
  EndDate: "2024-01-15T00:00:00Z",

  // Other common fields
  ImpactID: 301,
  UrgencyID: 302,
  SourceID: 303,
  ServiceID: 401,
  ServiceOfferingID: 402,
  EstimatedMinutes: 120,

  // Location
  LocationID: 501,
  LocationRoomID: 502,

  // Custom attributes (if applicable)
  Attributes: [
    {
      ID: 1001,
      Value: "Custom value"
    }
  ]
}
```

**Note**: Some fields become non-editable if the ticket has been converted to a task (StartDate, EndDate, EstimatedMinutes, ResponsibleGroupID, ResponsibleUid, StatusID if task not completed).

---

#### `tdx_update_ticket`
Update a TeamDynamix ticket (partial update).

**Parameters:**
- `ticketId` (number, required): ID of the ticket to update
- `statusId` (number, optional): New status ID for the ticket
- `priorityId` (number, optional): New priority ID for the ticket
- `title` (string, optional): New title for the ticket
- `description` (string, optional): New description for the ticket
- `comments` (string, optional): Comments to add to the ticket update
- `appId` (string, optional): TeamDynamix application ID (auto-detected if not provided)

---

#### `tdx_add_ticket_feed`
Add a feed entry (comment/update) to a TeamDynamix ticket.

**Parameters:**
- `ticketId` (number, required): ID of the ticket to add feed entry to
- `comments` (string, required): The comment text to add
- `isPrivate` (boolean, optional): Whether the feed entry should be private (default: false)
- `notify` (array of strings, optional): Array of email addresses to notify
- `appId` (string, optional): TeamDynamix application ID (auto-detected if not provided)

---

#### `tdx_add_ticket_tags`
Add tags to a TeamDynamix ticket.

**Parameters:**
- `ticketId` (number, required): ID of the ticket to add tags to
- `tags` (array of strings, required): Array of tag names to add
- `appId` (string, optional): TeamDynamix application ID (auto-detected if not provided)

**Important Notes:**
- Tags are successfully stored in the database and visible in the TeamDynamix UI
- Due to an API rollback, tags are **NOT returned** in `tdx_get_ticket` responses
- To verify tags were added, check the ticket in the TeamDynamix web interface
- Returns success message when tags are added (empty response body = success)

---

#### `tdx_delete_ticket_tags`
Delete tags from a TeamDynamix ticket.

**Parameters:**
- `ticketId` (number, required): ID of the ticket to delete tags from
- `tags` (array of strings, required): Array of tag names to delete
- `appId` (string, optional): TeamDynamix application ID (auto-detected if not provided)

**Note:** Returns success message when tags are deleted.

---

### People Management

#### `tdx_get_user`
Get a TeamDynamix user by UID or username.

**Parameters:**
- `uid` (string, optional): User UID (GUID) to retrieve
- `username` (string, optional): Username to retrieve (alternative to uid)

**Note:** Either `uid` or `username` must be provided.

---

#### `tdx_get_current_user`
Get the currently authenticated TeamDynamix user (based on credentials).

**Parameters:** None

---

#### `tdx_search_users`
Search for TeamDynamix users.

**Parameters:**
- `searchText` (string, optional): Text to search for in user records (name, email, username)
- `maxResults` (number, optional): Maximum number of results to return (default: 50, max: 100)

---

#### `tdx_get_user_uid`
Get a user UID (GUID) by username.

**Parameters:**
- `username` (string, required): Username to look up

---

### Group Management

#### `tdx_search_groups`
Search for TeamDynamix groups.

**Parameters:**
- `searchText` (string, optional): Text to search for in group names
- `maxResults` (number, optional): Maximum number of results to return (default: 50, max: 100)

---

#### `tdx_get_group`
Get a TeamDynamix group by ID.

**Parameters:**
- `groupId` (number, required): Group ID to retrieve

---

#### `tdx_list_groups`
List all available TeamDynamix groups.

**Parameters:**
- `maxResults` (number, optional): Maximum number of results to return (default: 100)

---

### Report Management

#### `tdx_list_reports`
List all available TeamDynamix reports.

**Parameters:**
- `maxResults` (number, optional): Maximum number of results to return (default: 100)
- `appId` (string, optional): Filter reports by TeamDynamix application ID

---

#### `tdx_search_reports`
Search for TeamDynamix reports by name.

**Parameters:**
- `searchText` (string, required): Text to search for in report names
- `maxResults` (number, optional): Maximum number of results to return (default: 50)
- `appId` (string, optional): Filter reports by TeamDynamix application ID

---

#### `tdx_run_report`
Run a TeamDynamix report by ID and get the results.

**Parameters:**
- `reportId` (number, required): ID of the report to run
- `withData` (boolean, optional): Include report data in response (default: false)
- `dataSortExpression` (string, optional): Sort expression for report data
- `appId` (string, optional): TeamDynamix application ID

**Important Notes:**
- When `withData=true`, the API returns **ALL** matching rows (no limit enforced)
- The `MaxResults` property on reports is not enforced when retrieving data via API
- Reports are limited only by the 90-second SQL command timeout
- Large reports may be slow, timeout, or cause memory/network issues
- Reports cannot accept runtime filters/parameters - they use pre-configured filters only

## Development

### Project Structure
```
tdx-api-tickets-mcp/
├── src/
│   ├── index.ts      # Main server entry point
│   ├── client.ts     # TDX API client
│   ├── auth.ts       # Authentication handling
│   ├── tools.ts      # Tool schemas
│   └── handlers.ts   # Tool implementation handlers
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts
- `npm run build` - Build the TypeScript code
- `npm run dev` - Build in watch mode for development
- `npm start` - Run the built server
- `npm run test:api` - Test development environment API

### Testing
```bash
# Test development environment
npm run test:api

# Test production environment
npm run test:prod
```

Tests validate:
- Authentication
- Ticket search (≥1 ticket found)
- Report listing (≥1 report found)
- Ticket retrieval
- Report execution with data (production only)

## Authentication

The server uses JWT authentication with the TeamDynamix API:
- Tokens cached for 23 hours (1-hour buffer before 24hr expiry)
- Automatic refresh on 401 responses
- Each server instance maintains its own token cache

## Error Handling

All tools include error handling that returns descriptive error messages. Common errors include:
- Missing required parameters
- Authentication failures
- API timeouts (20-second timeout configured)
- Invalid ticket or report IDs

## API Endpoints Used

The server interacts with the following TeamDynamix API endpoints:

**Authentication:**
- `POST /api/auth` - Authentication

**Tickets:**
- `POST /api/{appId}/tickets/search` - Search tickets
- `GET /api/{appId}/tickets/{id}` - Get ticket
- `POST /api/{appId}/tickets/{id}` - Edit ticket (full update)
- `POST /api/{appId}/tickets/{id}` - Update ticket (partial update via fetch+merge)
- `POST /api/{appId}/tickets/{id}/feed` - Add feed entry
- `POST /api/{appId}/tickets/{id}/tags` - Add tags to ticket
- `DELETE /api/{appId}/tickets/{id}/tags` - Delete tags from ticket

**Reports:**
- `GET /api/reports` - List reports
- `POST /api/reports/search` - Search reports
- `GET /api/reports/{id}` - Run report

**People:**
- `GET /api/people/{uid}` - Get user by UID
- `GET /api/people/{username}` - Get user by username
- `GET /api/people/getuid/{username}` - Get user UID by username
- `GET /api/people/lookup` - Search users

**Groups:**
- `POST /api/groups/search` - Search/list groups
- `GET /api/groups/{id}` - Get group by ID

## Additional Documentation

For detailed information about configuration, troubleshooting, and advanced features, see [CLAUDE.md](./CLAUDE.md).