#!/usr/bin/env node
import { createInterface } from 'readline/promises';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, resolve } from 'path';
import { homedir } from 'os';
import axios from 'axios';
import { decodePassword } from './utils.js';
const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
});
async function question(prompt) {
    return rl.question(prompt);
}
async function passwordQuestion(prompt) {
    process.stdout.write(prompt);
    return new Promise((resolve) => {
        const stdin = process.stdin;
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');
        let password = '';
        stdin.on('data', (char) => {
            const byte = char.charCodeAt(0);
            if (byte === 3) {
                // Ctrl+C
                process.exit(0);
            }
            else if (byte === 13) {
                // Enter
                stdin.setRawMode(false);
                stdin.pause();
                process.stdout.write('\n');
                resolve(password);
            }
            else if (byte === 127 || byte === 8) {
                // Backspace
                if (password.length > 0) {
                    password = password.slice(0, -1);
                    process.stdout.write('\b \b');
                }
            }
            else {
                password += char;
                process.stdout.write('*');
            }
        });
    });
}
function encryptPasswordDPAPI(password) {
    try {
        const psCommand = `Add-Type -AssemblyName System.Security; $plain = @"
${password}
"@; $encrypted = [Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($plain), $null, 'CurrentUser'); [Convert]::ToBase64String($encrypted)`;
        const encrypted = execSync(`powershell -NoProfile -NonInteractive -Command "${psCommand}"`, {
            encoding: 'utf8',
            windowsHide: true,
        }).trim();
        return `dpapi:${encrypted}`;
    }
    catch (error) {
        console.error('\n❌ Failed to encrypt password with DPAPI.');
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
        console.error('\nThis MCP server requires DPAPI encryption for security.');
        console.error('DPAPI is only available on Windows systems.');
        throw new Error('DPAPI encryption is required but failed. Ensure you are running on Windows.');
    }
}
async function authenticate(baseUrl, username, password) {
    try {
        console.log('\n🔐 Authenticating...');
        const response = await axios.post(`${baseUrl}/api/auth`, {
            UserName: username,
            Password: password,
        });
        if (!response.data) {
            throw new Error('Authentication failed: No token returned');
        }
        console.log('✓ Authentication successful');
        return response.data;
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`Authentication failed: ${error.response?.status} - ${error.response?.statusText || error.message}`);
        }
        throw error;
    }
}
async function fetchApplications(baseUrl, token) {
    try {
        console.log('📋 Fetching available applications...');
        const response = await axios.get(`${baseUrl}/api/applications`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        console.log(`✓ Found ${response.data.length} applications`);
        return response.data;
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`Failed to fetch applications: ${error.response?.status} - ${error.response?.statusText || error.message}`);
        }
        throw error;
    }
}
function filterTicketingApps(apps) {
    return apps.filter(app => app.Type === 'Ticketing' && app.Active);
}
function getAppsByIds(allApps, appIds) {
    return appIds.map(id => allApps.find(app => app.AppID === id)).filter((app) => app !== undefined);
}
async function selectApplications(apps, currentAppIds) {
    console.log('\n📋 Available Ticketing Applications:');
    console.log('═'.repeat(60));
    apps.forEach((app, index) => {
        const isSelected = currentAppIds?.includes(app.AppID);
        const checkmark = isSelected ? ' ✓' : '';
        console.log(`[${index + 1}] ${app.Name} (ID: ${app.AppID})${checkmark}`);
        if (app.Description) {
            console.log(`    ${app.Description}`);
        }
    });
    console.log('═'.repeat(60));
    while (true) {
        const answer = await question('\nSelect applications (comma-separated numbers, e.g., "1,3" or "all"): ');
        if (answer.toLowerCase().trim() === 'all') {
            return apps.map(app => app.AppID);
        }
        const selections = answer.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const indices = selections.map(s => parseInt(s, 10) - 1);
        if (indices.every(i => i >= 0 && i < apps.length)) {
            return indices.map(i => apps[i].AppID);
        }
        console.log('❌ Invalid selection. Please enter valid numbers or "all".');
    }
}
async function selectEnvironment() {
    console.log('\n🌍 Select environment:');
    console.log('[1] Production (prod)');
    console.log('[2] Development (dev)');
    console.log('[3] Canary (canary)');
    while (true) {
        const answer = await question('\nSelect environment (1-3, default: 1): ');
        const choice = answer.trim() || '1';
        if (choice === '1')
            return 'prod';
        if (choice === '2')
            return 'dev';
        if (choice === '3')
            return 'canary';
        console.log('❌ Invalid selection. Please enter 1, 2, or 3.');
    }
}
async function selectConfigLocation() {
    console.log('\n🔧 Where should the MCP server be available?');
    console.log('[1] Global - Available in all Claude Code projects');
    console.log('[2] Specific Project - Available only in one project directory');
    while (true) {
        const answer = await question('\nSelect location (1-2, default: 2): ');
        const choice = answer.trim() || '2';
        if (choice === '1')
            return 'global';
        if (choice === '2')
            return 'project';
        console.log('❌ Invalid selection. Please enter 1 or 2.');
    }
}
async function configureGlobal(mcpServerPath, credentialsPath, environment) {
    const claudeJsonPath = join(homedir(), '.claude.json');
    console.log('\n⚙️  Configuring global MCP server in ~/.claude.json...');
    const mcpConfig = {
        type: 'stdio',
        command: 'node',
        args: [join(mcpServerPath, 'dist', 'index.js')],
        env: {
            [`TDX_${environment.toUpperCase()}_CREDENTIALS_FILE`]: credentialsPath,
            TDX_DEFAULT_ENVIRONMENT: environment,
        },
    };
    let config = {};
    if (existsSync(claudeJsonPath)) {
        try {
            config = JSON.parse(readFileSync(claudeJsonPath, 'utf8'));
        }
        catch (error) {
            console.error('Warning: Existing ~/.claude.json is invalid, creating new one');
        }
    }
    if (!config.mcpServers) {
        config.mcpServers = {};
    }
    config.mcpServers['tdx-api-tickets-mcp'] = mcpConfig;
    writeFileSync(claudeJsonPath, JSON.stringify(config, null, 2));
    console.log(`✓ Updated ${claudeJsonPath}`);
}
async function configureProject(mcpServerPath, credentialsPath, environment) {
    const projectPath = (await question('\n📁 Enter project directory path: ')).trim().replace(/['"]/g, '');
    if (!projectPath) {
        throw new Error('Project path is required');
    }
    if (!existsSync(projectPath)) {
        throw new Error(`Project directory does not exist: ${projectPath}`);
    }
    // Check if user is trying to configure the MCP server project itself
    // Use resolve() to get absolute paths and normalize path separators
    const normalizedProjectPath = resolve(projectPath);
    const normalizedMcpServerPath = resolve(mcpServerPath);
    if (normalizedProjectPath === normalizedMcpServerPath) {
        console.log('\n⚠️  You are configuring the MCP server project itself.');
        console.log('   The MCP server project already has its own .mcp.json configuration.');
        console.log('   Only other projects that want to use this MCP server need a .mcp.json file.');
        console.log('\n💡 To make this MCP server available to other projects, either:');
        console.log('   • Use "Global" configuration (available in all projects)');
        console.log('   • Run setup again and provide a different project directory path');
        throw new Error('Cannot configure MCP server project to use itself');
    }
    console.log(`\n⚙️  Configuring MCP server for project: ${projectPath}`);
    const mcpJsonPath = join(projectPath, '.mcp.json');
    const claudeSettingsDir = join(projectPath, '.claude');
    const claudeSettingsPath = join(claudeSettingsDir, 'settings.local.json');
    // Create .mcp.json
    const mcpConfig = {
        mcpServers: {
            'tdx-api-tickets-mcp': {
                type: 'stdio',
                command: 'node',
                args: [join(mcpServerPath, 'dist', 'index.js')],
                env: {
                    [`TDX_${environment.toUpperCase()}_CREDENTIALS_FILE`]: credentialsPath,
                    TDX_DEFAULT_ENVIRONMENT: environment,
                },
            },
        },
    };
    // Merge with existing .mcp.json if it exists
    let finalMcpConfig = mcpConfig;
    if (existsSync(mcpJsonPath)) {
        try {
            const existingConfig = JSON.parse(readFileSync(mcpJsonPath, 'utf8'));
            if (existingConfig.mcpServers && typeof existingConfig.mcpServers === 'object') {
                finalMcpConfig = {
                    ...existingConfig,
                    mcpServers: {
                        ...existingConfig.mcpServers,
                        'tdx-api-tickets-mcp': mcpConfig.mcpServers['tdx-api-tickets-mcp'],
                    },
                };
                console.log('✓ Updated existing .mcp.json (merged with existing servers)');
            }
            else {
                writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2));
                console.log(`✓ Created .mcp.json`);
            }
        }
        catch (error) {
            const overwriteMcp = await question(`\n⚠️  .mcp.json exists but is invalid JSON.\n   Overwrite? (y/N): `);
            if (!overwriteMcp.toLowerCase().startsWith('y')) {
                console.log('   Skipping .mcp.json creation');
                finalMcpConfig = null;
            }
        }
    }
    else {
        console.log(`✓ Created .mcp.json`);
    }
    if (finalMcpConfig) {
        writeFileSync(mcpJsonPath, JSON.stringify(finalMcpConfig, null, 2));
    }
    // Configure .claude/settings.local.json
    if (!existsSync(claudeSettingsDir)) {
        mkdirSync(claudeSettingsDir, { recursive: true });
    }
    let needsSettingsUpdate = true;
    if (existsSync(claudeSettingsPath)) {
        try {
            const settings = JSON.parse(readFileSync(claudeSettingsPath, 'utf8'));
            if (settings.enableAllProjectMcpServers === true) {
                needsSettingsUpdate = false;
            }
        }
        catch (error) {
            // Invalid JSON, will recreate
        }
    }
    if (needsSettingsUpdate) {
        const settings = existsSync(claudeSettingsPath)
            ? JSON.parse(readFileSync(claudeSettingsPath, 'utf8'))
            : {};
        settings.enableAllProjectMcpServers = true;
        writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));
        console.log(`✓ Updated .claude/settings.local.json`);
    }
}
async function main() {
    // Check if node_modules exists, install dependencies if needed
    if (!existsSync('node_modules')) {
        console.log('📦 Dependencies not found. Installing...');
        try {
            execSync('npm install', { stdio: 'inherit' });
            console.log('✓ Dependencies installed successfully\n');
        }
        catch (error) {
            console.error('❌ Failed to install dependencies. Please run "npm install" manually.');
            process.exit(1);
        }
    }
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  TeamDynamix MCP Server - Credentials Setup              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log();
    try {
        // Get MCP server path (current directory by default, where npm run setup was called from)
        const mcpServerPath = process.cwd();
        // Get environment
        const environment = await selectEnvironment();
        // Check for existing credentials
        const configDir = join(homedir(), '.config', 'tdx-mcp');
        const credentialsPath = join(configDir, `${environment}-credentials.json`);
        let baseUrl;
        let username;
        let password;
        let selectedAppIds;
        if (existsSync(credentialsPath)) {
            console.log(`\n✓ Found existing credentials for ${environment} environment`);
            const existingCreds = JSON.parse(readFileSync(credentialsPath, 'utf8'));
            console.log(`   • URL: ${existingCreds.TDX_BASE_URL}`);
            console.log(`   • Username: ${existingCreds.TDX_USERNAME}`);
            // Authenticate with existing creds to fetch app titles
            const decodedPassword = decodePassword(existingCreds.TDX_PASSWORD);
            const token = await authenticate(existingCreds.TDX_BASE_URL, existingCreds.TDX_USERNAME, decodedPassword);
            const allApps = await fetchApplications(existingCreds.TDX_BASE_URL, token);
            const ticketingApps = filterTicketingApps(allApps);
            // Show current app configuration
            const currentAppIds = existingCreds.TDX_TICKET_APP_IDS.split(',').map(id => parseInt(id.trim(), 10));
            const currentApps = getAppsByIds(ticketingApps, currentAppIds);
            console.log('\n   Current app configuration:');
            currentApps.forEach(app => {
                console.log(`   • [${app.AppID}] ${app.Name}`);
            });
            console.log('\n   Options:');
            console.log('   [1] Use existing credentials and apps');
            console.log('   [2] Update credentials (re-authenticate and re-select apps)');
            console.log('   [3] Keep credentials but modify app selection');
            const choice = await question('\n   Select option (1-3, default: 1): ');
            const option = choice.trim() || '1';
            if (option === '1') {
                // Use existing everything
                baseUrl = existingCreds.TDX_BASE_URL;
                username = existingCreds.TDX_USERNAME;
                password = existingCreds.TDX_PASSWORD; // Keep encrypted
                selectedAppIds = currentAppIds;
            }
            else if (option === '2') {
                // Update everything
                console.log('\n📍 Enter your TeamDynamix instance URL');
                console.log('   Examples:');
                console.log('   • https://solutions.teamdynamix.com/TDWebApi');
                console.log('   • http://localhost/TDDev/TDWebApi');
                baseUrl = (await question('\nBase URL: ')).trim().replace(/\/+$/, '');
                if (!baseUrl)
                    throw new Error('Base URL is required');
                username = (await question('\n👤 Username: ')).trim();
                if (!username)
                    throw new Error('Username is required');
                const plainPassword = await passwordQuestion('\n🔒 Password: ');
                if (!plainPassword)
                    throw new Error('Password is required');
                const newToken = await authenticate(baseUrl, username, plainPassword);
                const newAllApps = await fetchApplications(baseUrl, newToken);
                const newTicketingApps = filterTicketingApps(newAllApps);
                if (newTicketingApps.length === 0) {
                    throw new Error('No active ticketing applications found');
                }
                selectedAppIds = await selectApplications(newTicketingApps);
                // Encrypt password
                console.log('\n🔐 Encrypting password...');
                password = encryptPasswordDPAPI(plainPassword);
                console.log('✓ Password encrypted');
            }
            else if (option === '3') {
                // Keep credentials, modify apps
                baseUrl = existingCreds.TDX_BASE_URL;
                username = existingCreds.TDX_USERNAME;
                password = existingCreds.TDX_PASSWORD; // Keep encrypted
                selectedAppIds = await selectApplications(ticketingApps, currentAppIds);
            }
            else {
                throw new Error('Invalid option selected');
            }
        }
        else {
            // No existing credentials, prompt for everything
            console.log('\n📍 Enter your TeamDynamix instance URL');
            console.log('   Examples:');
            console.log('   • https://solutions.teamdynamix.com/TDWebApi');
            console.log('   • http://localhost/TDDev/TDWebApi');
            baseUrl = (await question('\nBase URL: ')).trim().replace(/\/+$/, '');
            if (!baseUrl)
                throw new Error('Base URL is required');
            username = (await question('\n👤 Username: ')).trim();
            if (!username)
                throw new Error('Username is required');
            const plainPassword = await passwordQuestion('\n🔒 Password: ');
            if (!plainPassword)
                throw new Error('Password is required');
            const token = await authenticate(baseUrl, username, plainPassword);
            const allApps = await fetchApplications(baseUrl, token);
            const ticketingApps = filterTicketingApps(allApps);
            if (ticketingApps.length === 0) {
                throw new Error('No active ticketing applications found');
            }
            selectedAppIds = await selectApplications(ticketingApps);
            console.log(`\n✓ Selected ${selectedAppIds.length} application(s): ${selectedAppIds.join(', ')}`);
            // Encrypt password
            console.log('\n🔐 Encrypting password...');
            password = encryptPasswordDPAPI(plainPassword);
            console.log('✓ Password encrypted');
        }
        // Save credentials
        const credentials = {
            TDX_BASE_URL: baseUrl,
            TDX_USERNAME: username,
            TDX_PASSWORD: password,
            TDX_TICKET_APP_IDS: selectedAppIds.join(','),
        };
        if (!existsSync(configDir)) {
            console.log(`\n📁 Creating directory: ${configDir}`);
            mkdirSync(configDir, { recursive: true });
        }
        console.log(`\n💾 Writing credentials to: ${credentialsPath}`);
        writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), { mode: 0o600 });
        // Configure MCP server location
        const configLocation = await selectConfigLocation();
        if (configLocation === 'global') {
            await configureGlobal(mcpServerPath, credentialsPath, environment);
        }
        else {
            await configureProject(mcpServerPath, credentialsPath, environment);
        }
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  ✅ Setup Complete!                                       ║');
        console.log('╚═══════════════════════════════════════════════════════════╝');
        console.log(`\n📄 Credentials saved to: ${credentialsPath}`);
        console.log('\n📋 Next Steps:');
        console.log('   1. Restart Claude Code to load the MCP server');
        console.log('   2. Test by asking Claude: "List available TeamDynamix reports"');
        console.log('\n💡 The MCP server is now configured and ready to use!');
    }
    catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
    finally {
        rl.close();
    }
}
main();
//# sourceMappingURL=setup-credentials.js.map