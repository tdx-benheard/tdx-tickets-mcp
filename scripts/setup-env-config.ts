#!/usr/bin/env tsx
/**
 * TeamDynamix MCP Server - Interactive Environment Credential Setup Tool
 * Encrypts passwords, tests authentication, discovers apps, saves credentials
 *
 * Usage:
 *   npm run setup           (simple: production only, username + password)
 *   npm run setup-advanced  (full: choose environment, domain, etc.)
 */

import { password, select, input, confirm, checkbox } from '@inquirer/prompts';
import { execSync } from 'child_process';
import axios from 'axios';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 18) {
  console.error('\n✗ Node.js 18 or higher is required');
  console.error(`  Current version: ${nodeVersion}`);
  console.error('  Please upgrade Node.js: https://nodejs.org/');
  process.exit(1);
}

// Check for --advanced flag
const isAdvancedMode = process.argv.includes('--advanced');

console.log('');
console.log('========================================================');
console.log(' TeamDynamix MCP - Interactive Credential Setup Tool');
console.log('========================================================');
console.log('');
if (isAdvancedMode) {
  console.log('Advanced Mode: Full environment configuration');
} else {
  console.log('Simple Mode: Production environment setup');
  console.log('(Use npm run setup-advanced for other environments)');
}
console.log('');
console.log('This tool will:');
console.log('  1. Encrypt your password using Windows DPAPI');
console.log('  2. Test authentication with TeamDynamix');
console.log('  3. Discover available ticketing applications');
console.log('  4. Save credentials to ~/.config/tdx-mcp/');
console.log('');
console.log('ℹ️  If prompts don\'t respond, click this window to give it focus');
console.log('');

async function main() {
  try {
    let environment: string;
    let domain: string;

    // Step 1: Environment selection (simple vs advanced)
    if (isAdvancedMode) {
      // Advanced: Let user choose environment
      environment = await select({
        message: 'Which environment?',
        choices: [
          { name: 'Production', value: 'prod' },
          { name: 'Test', value: 'test' },
          { name: 'Canary', value: 'canary' },
          { name: 'Development', value: 'dev' },
        ],
      });
    } else {
      // Simple: Default to production
      environment = 'prod';
      console.log('Environment: Production (solutions.teamdynamix.com)');
      console.log('');
    }

    // Step 2: Domain selection (simple vs advanced)
    const defaultDomains: Record<string, string> = {
      prod: 'solutions.teamdynamix.com',
      test: 'part01-demo.teamdynamixtest.com',
      canary: 'eng.teamdynamixcanary.com',
      dev: 'localhost/TDDev',
    };

    if (isAdvancedMode) {
      // Advanced: Let user enter/modify domain
      domain = await input({
        message: 'TeamDynamix domain',
        default: defaultDomains[environment],
      });
    } else {
      // Simple: Use default production domain
      domain = defaultDomains[environment];
    }

    // Step 3: Get username
    let username = await input({
      message: 'TeamDynamix username',
    });

    if (!username) {
      console.error('\n✗ Username is required');
      process.exit(1);
    }

    // Step 4: Get password
    let plainPassword = await password({
      message: 'Enter your TeamDynamix password',
      mask: '*',
    });

    if (!plainPassword) {
      console.error('\n✗ Password is required');
      process.exit(1);
    }

    // Step 5: Test authentication (with retry loop)
    let authToken: string | null = null;

    while (!authToken) {
      // Construct base URL
      const protocol = domain.startsWith('localhost') ? 'http' : 'https';
      const baseUrl = `${protocol}://${domain}/TDWebApi`;

      console.log('\n🔍 Testing authentication...');

      try {
        const authResponse = await axios.post(
          `${baseUrl}/api/auth`,
          { UserName: username, Password: plainPassword },
          { timeout: 10000 }
        );
        authToken = authResponse.data;
        console.log('✓ Authentication successful!\n');
      } catch (error: any) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          console.error('✗ Timeout: Cannot reach server at', baseUrl);
        } else if (error.response?.status === 401) {
          console.error('✗ Authentication failed: Invalid username or password');
        } else if (error.response?.status === 403) {
          console.error('✗ Authentication failed: Access forbidden (403)');
        } else {
          console.error('✗ Authentication failed:', error.message);
        }

        const retry = await confirm({
          message: 'Would you like to try again with different credentials?',
          default: true,
        });

        if (!retry) {
          process.exit(1);
        }

        console.log('');
        domain = await input({
          message: 'TeamDynamix domain',
          default: domain,
        });

        username = await input({
          message: 'TeamDynamix username',
          default: username,
        });

        plainPassword = await password({
          message: 'TeamDynamix password',
          mask: '*',
        });

        if (!plainPassword) {
          console.error('\n✗ Password is required');
          process.exit(1);
        }
      }
    }

    // Construct final base URL for output
    const protocol = domain.startsWith('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${domain}/TDWebApi`;

    // Step 6: Fetch available applications
    console.log('🔍 Fetching available ticketing applications...');

    let selectedAppIds: string;
    try {
      const appsResponse = await axios.get(`${baseUrl}/api/applications`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      const ticketingApps = appsResponse.data.filter(
        (app: any) => app.Type === 'Ticketing' && app.Active
      );

      if (ticketingApps.length === 0) {
        console.log('\n⚠ No active ticketing applications found automatically');
        selectedAppIds = await input({
          message: 'Enter application IDs manually (comma-separated)',
        });
      } else if (ticketingApps.length === 1) {
        // Auto-select single app
        const app = ticketingApps[0];
        console.log(`\n✓ Found 1 ticketing application: ${app.Name} (ID: ${app.AppID})`);
        selectedAppIds = app.AppID.toString();
      } else {
        // Multiple apps: Show checkbox
        console.log(`\n✓ Found ${ticketingApps.length} ticketing application(s)\n`);
        console.log('ℹ️  Use SPACE to select, arrow keys (↑/↓) to navigate, ENTER when done\n');

        let selectedApps: string[] = [];
        while (selectedApps.length === 0) {
          selectedApps = await checkbox({
            message: 'Select ticketing applications to connect',
            choices: ticketingApps.map((app: any) => ({
              name: `${app.Name} (ID: ${app.AppID})`,
              value: app.AppID.toString(),
              checked: false,
            })),
            pageSize: 20,
          });

          if (selectedApps.length === 0) {
            console.error('\n❌ No applications selected!');
            console.log('   ℹ️  You must select at least one application');
            console.log('   ℹ️  Use SPACE to select, then press ENTER\n');
          }
        }

        selectedAppIds = selectedApps.join(',');
      }
    } catch (error: any) {
      console.log('\n⚠ Unable to fetch applications automatically');
      if (error.response?.status) {
        console.log(`   Error: HTTP ${error.response.status}: ${error.response.statusText}`);
      } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        console.log('   Error: Request timed out');
      } else {
        console.log(`   Error: ${error.message}`);
      }
      console.log('');
      selectedAppIds = await input({
        message: 'Enter application IDs manually (comma-separated)',
      });
    }

    // Step 7: Encrypt password (now that everything else succeeded)
    console.log('\n🔐 Encrypting password...');

    const psCommand = `Add-Type -AssemblyName System.Security; $plainText = [Console]::In.ReadToEnd().Trim(); $encrypted = [Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($plainText), $null, 'CurrentUser'); 'dpapi:' + [Convert]::ToBase64String($encrypted)`;

    const encryptedPassword = execSync(
      `powershell -NoProfile -NonInteractive -Command "${psCommand}"`,
      {
        input: plainPassword,
        encoding: 'utf8',
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    ).trim();

    if (!encryptedPassword.startsWith('dpapi:')) {
      console.error('\n✗ Encryption failed: Invalid output format');
      throw new Error('Encryption failed: Invalid output format');
    }

    console.log('✓ Password encrypted successfully!\n');

    // Step 8: Save credentials to file
    console.log('💾 Saving credentials...');

    const credDir = join(homedir(), '.config', 'tdx-mcp');
    const credFile = join(credDir, `${environment}-credentials.json`);

    // Create directory if needed
    if (!existsSync(credDir)) {
      mkdirSync(credDir, { recursive: true });
    }

    // Check if credentials already exist
    if (existsSync(credFile)) {
      const overwrite = await confirm({
        message: `Credentials for '${environment}' already exist. Overwrite?`,
        default: true,
      });
      if (!overwrite) {
        console.log('\n✗ Setup cancelled');
        process.exit(0);
      }
    }

    // Write credentials file
    const credentials = {
      TDX_BASE_URL: baseUrl,
      TDX_USERNAME: username,
      TDX_PASSWORD: encryptedPassword,
      TDX_TICKET_APP_IDS: selectedAppIds,
    };

    writeFileSync(credFile, JSON.stringify(credentials, null, 2));

    console.log(`✓ Credentials saved to ${credFile}`);
    console.log('');
    console.log('✓ Setup complete!');
    console.log('');
    console.log('Security Notes:');
    console.log('  • This encrypted password only works on this Windows user account');
    console.log('');
    console.log('Next step:');
    console.log('  Return to Claude Code and say: "complete"');
    console.log('');

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('User force closed')) {
        console.log('\n✗ Cancelled by user');
        process.exit(0);
      }
      console.error('\n✗ Setup failed:', error.message);

      if (error.message.includes('powershell')) {
        console.error('\nThis tool requires Windows with PowerShell.');
        console.error('DPAPI encryption is only available on Windows systems.');
      }
    } else {
      console.error('\n✗ Setup failed:', error);
    }
    process.exit(1);
  }
}

main();
