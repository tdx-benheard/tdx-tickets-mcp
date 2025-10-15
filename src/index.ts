import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TDXClient } from './client.js';
import { tools } from './tools.js';
import { ToolHandlers } from './handlers.js';

// Load credentials from file or environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to load JSON credentials file
function loadCredentialsFile(filePath: string): Record<string, string> {
  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load credentials file: ${filePath}`);
    throw error;
  }
}

// Check if TDX_CREDENTIALS_FILE is set
const credentialsFile = process.env.TDX_CREDENTIALS_FILE;
if (credentialsFile) {
  // Load from credentials file
  const credentials = loadCredentialsFile(credentialsFile);
  // Set environment variables from file (only if not already set)
  Object.entries(credentials).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
} else {
  // Fallback to .env file for backward compatibility
  const envPath = join(__dirname, '..', '.env');
  if (existsSync(envPath)) {
    const envFile = readFileSync(envPath, 'utf8');
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      const equalIndex = trimmed.indexOf('=');
      if (equalIndex === -1) continue;

      const key = trimmed.slice(0, equalIndex).trim();
      let value = trimmed.slice(equalIndex + 1).trim();

      // Remove surrounding quotes (single or double)
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Only set if not already in environment
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

// Get configuration from environment variables
const TDX_BASE_URL = process.env.TDX_BASE_URL || '';
const TDX_USERNAME = process.env.TDX_USERNAME || '';
const TDX_PASSWORD = process.env.TDX_PASSWORD || '';
const TDX_APP_ID = process.env.TDX_APP_ID || '';

if (!TDX_BASE_URL || !TDX_USERNAME || !TDX_PASSWORD || !TDX_APP_ID) {
  console.error('Missing required environment variables: TDX_BASE_URL, TDX_USERNAME, TDX_PASSWORD, TDX_APP_ID');
  console.error('Set TDX_CREDENTIALS_FILE environment variable to point to a JSON credentials file, or use .env file');
  process.exit(1);
}

// Parse comma-separated app IDs
const appIds = TDX_APP_ID.split(',').map(id => id.trim()).filter(id => id.length > 0);

if (appIds.length === 0) {
  console.error('TDX_APP_ID must contain at least one valid application ID');
  process.exit(1);
}

// Initialize TDX client
const tdxClient = new TDXClient(TDX_BASE_URL, TDX_USERNAME, TDX_PASSWORD, appIds);

// Initialize tool handlers
const handlers = new ToolHandlers(tdxClient);

// Create MCP server
const server = new Server(
  {
    name: 'tdx-api-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'tdx_search_tickets':
        return await handlers.handleSearchTickets(args);

      case 'tdx_get_ticket':
        return await handlers.handleGetTicket(args);

      case 'tdx_edit_ticket':
        return await handlers.handleEditTicket(args);

      case 'tdx_update_ticket':
        return await handlers.handleUpdateTicket(args);

      case 'tdx_add_ticket_feed':
        return await handlers.handleAddTicketFeed(args);

      case 'tdx_add_ticket_tags':
        return await handlers.handleAddTicketTags(args);

      case 'tdx_delete_ticket_tags':
        return await handlers.handleDeleteTicketTags(args);

      case 'tdx_list_reports':
        return await handlers.handleListReports(args);

      case 'tdx_search_reports':
        return await handlers.handleSearchReports(args);

      case 'tdx_run_report':
        return await handlers.handleRunReport(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});