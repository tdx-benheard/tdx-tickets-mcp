import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
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

// Environment configuration structure
interface EnvironmentConfig {
  baseUrl: string;
  username: string;
  password: string;
  appIds: string[];
}

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

// Parse environment configuration from credentials
function parseEnvironmentConfig(credentials: Record<string, string>): EnvironmentConfig {
  const baseUrl = credentials.TDX_BASE_URL || '';
  const username = credentials.TDX_USERNAME || '';
  let password = credentials.TDX_PASSWORD || '';
  const appIdsStr = credentials.TDX_TICKET_APP_IDS || '';

  if (!baseUrl || !username || !password || !appIdsStr) {
    throw new Error('Missing required configuration: TDX_BASE_URL, TDX_USERNAME, TDX_PASSWORD, TDX_TICKET_APP_IDS');
  }

  // Decode base64 password if prefixed with "base64:"
  if (password.startsWith('base64:')) {
    try {
      const encodedPassword = password.substring(7); // Remove "base64:" prefix
      password = Buffer.from(encodedPassword, 'base64').toString('utf8');
      console.error('Decoded base64-encoded password');
    } catch (error) {
      throw new Error('Failed to decode base64 password: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
  // Decrypt DPAPI password if prefixed with "dpapi:"
  else if (password.startsWith('dpapi:')) {
    try {
      const encryptedPassword = password.substring(6); // Remove "dpapi:" prefix
      const psCommand = `Add-Type -AssemblyName System.Security; [Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String('${encryptedPassword}'), $null, 'CurrentUser'))`;
      password = execSync(`powershell -Command "${psCommand}"`, { encoding: 'utf8' }).trim();
      console.error('Decrypted DPAPI-encrypted password');
    } catch (error) {
      throw new Error('Failed to decrypt DPAPI password: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  const appIds = appIdsStr.split(',').map(id => id.trim()).filter(id => id.length > 0);
  if (appIds.length === 0) {
    throw new Error('TDX_TICKET_APP_IDS must contain at least one valid application ID');
  }

  return { baseUrl, username, password, appIds };
}

// Load environment configurations
const environments = new Map<string, EnvironmentConfig>();

// Try to load production credentials
const prodCredsFile = process.env.TDX_PROD_CREDENTIALS_FILE;
if (prodCredsFile && existsSync(prodCredsFile)) {
  try {
    const prodCreds = loadCredentialsFile(prodCredsFile);
    environments.set('prod', parseEnvironmentConfig(prodCreds));
    console.error('Loaded production environment configuration');
  } catch (error) {
    console.error('Failed to load production credentials:', error);
  }
}

// Try to load development credentials
const devCredsFile = process.env.TDX_DEV_CREDENTIALS_FILE;
if (devCredsFile && existsSync(devCredsFile)) {
  try {
    const devCreds = loadCredentialsFile(devCredsFile);
    environments.set('dev', parseEnvironmentConfig(devCreds));
    console.error('Loaded development environment configuration');
  } catch (error) {
    console.error('Failed to load development credentials:', error);
  }
}

// Fallback: Try legacy single credential file or .env
if (environments.size === 0) {
  const legacyCredsFile = process.env.TDX_CREDENTIALS_FILE;
  let legacyConfig: EnvironmentConfig | null = null;

  if (legacyCredsFile && existsSync(legacyCredsFile)) {
    // Load from legacy credentials file
    try {
      const credentials = loadCredentialsFile(legacyCredsFile);
      legacyConfig = parseEnvironmentConfig(credentials);
      console.error('Loaded legacy credentials file (TDX_CREDENTIALS_FILE)');
    } catch (error) {
      console.error('Failed to load legacy credentials file:', error);
    }
  } else {
    // Try .env file for backward compatibility
    const envPath = join(__dirname, '..', '.env');
    if (existsSync(envPath)) {
      const envVars: Record<string, string> = {};
      const envFile = readFileSync(envPath, 'utf8');

      for (const line of envFile.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const equalIndex = trimmed.indexOf('=');
        if (equalIndex === -1) continue;

        const key = trimmed.slice(0, equalIndex).trim();
        let value = trimmed.slice(equalIndex + 1).trim();

        // Remove surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        envVars[key] = value;
      }

      try {
        legacyConfig = parseEnvironmentConfig(envVars);
        console.error('Loaded legacy .env file');
      } catch (error) {
        console.error('Failed to parse .env file:', error);
      }
    }
  }

  if (legacyConfig) {
    // Default to 'prod' for legacy single-environment setup
    environments.set('prod', legacyConfig);
  }
}

// Ensure at least one environment is configured
if (environments.size === 0) {
  console.error('No environment configurations found!');
  console.error('Set TDX_PROD_CREDENTIALS_FILE and/or TDX_DEV_CREDENTIALS_FILE environment variables');
  console.error('Or use legacy TDX_CREDENTIALS_FILE or .env file');
  process.exit(1);
}

// Get default environment from config (defaults to 'prod')
const defaultEnvironment = process.env.TDX_DEFAULT_ENVIRONMENT || 'prod';
if (!environments.has(defaultEnvironment)) {
  console.error(`Default environment '${defaultEnvironment}' not found in configurations`);
  console.error(`Available environments: ${Array.from(environments.keys()).join(', ')}`);
  process.exit(1);
}

console.error(`Default environment: ${defaultEnvironment}`);
console.error(`Available environments: ${Array.from(environments.keys()).join(', ')}`);

// Initialize TDX clients for each environment
const tdxClients = new Map<string, TDXClient>();
for (const [env, config] of environments.entries()) {
  tdxClients.set(env, new TDXClient(config.baseUrl, config.username, config.password, config.appIds));
}

// Initialize tool handlers with client map and default environment
const handlers = new ToolHandlers(tdxClients, defaultEnvironment);

// Create MCP server
const server = new Server(
  {
    name: 'tdx-api-tickets-mcp',
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

      case 'tdx_get_user':
        return await handlers.handleGetUser(args);

      case 'tdx_get_current_user':
        return await handlers.handleGetCurrentUser(args);

      case 'tdx_search_users':
        return await handlers.handleSearchUsers(args);

      case 'tdx_get_user_uid':
        return await handlers.handleGetUserUid(args);

      case 'tdx_search_groups':
        return await handlers.handleSearchGroups(args);

      case 'tdx_get_group':
        return await handlers.handleGetGroup(args);

      case 'tdx_list_groups':
        return await handlers.handleListGroups(args);

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