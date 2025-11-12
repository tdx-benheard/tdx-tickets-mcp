#!/usr/bin/env tsx
/**
 * TeamDynamix MCP Server - Password Encryption Tool (TypeScript)
 * Encrypts passwords using Windows DPAPI for secure storage
 *
 * Usage: npm run encrypt-password
 */

import { password } from '@inquirer/prompts';
import { execSync } from 'child_process';

console.log('');
console.log('===============================================');
console.log(' TeamDynamix MCP - Password Encryption Tool');
console.log('===============================================');
console.log('');
console.log('This tool encrypts your TeamDynamix password using Windows DPAPI.');
console.log('The encrypted password can only be decrypted by your Windows user account.');
console.log('');

async function main() {
  try {
    // Get password securely (masked input)
    const plainPassword = await password({
      message: 'Enter your TeamDynamix password',
      mask: '*',
    });

    if (!plainPassword) {
      console.error('\n✗ Password is required');
      process.exit(1);
    }

    console.log('\n🔐 Encrypting password...');

    // Encrypt using DPAPI via PowerShell
    // Password is piped to stdin, never appears in command line or output
    const psCommand = `
      Add-Type -AssemblyName System.Security
      $plainText = [Console]::In.ReadToEnd().Trim()
      $encrypted = [Security.Cryptography.ProtectedData]::Protect(
        [Text.Encoding]::UTF8.GetBytes($plainText),
        $null,
        'CurrentUser'
      )
      'dpapi:' + [Convert]::ToBase64String($encrypted)
    `.trim();

    const encryptedPassword = execSync(
      `powershell -NoProfile -NonInteractive -Command "${psCommand}"`,
      {
        input: plainPassword,
        encoding: 'utf8',
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'], // Ensure stdin/stdout/stderr are piped
      }
    ).trim();

    if (!encryptedPassword.startsWith('dpapi:')) {
      throw new Error('Encryption failed: Invalid output format');
    }

    console.log('✓ Password encrypted successfully!\n');
    console.log('Encrypted password (use this in your credentials file):\n');
    console.log(encryptedPassword);
    console.log('');
    console.log('Copy this value to your credentials JSON file:');
    console.log(`  "TDX_PASSWORD": "${encryptedPassword}"`);
    console.log('');
    console.log('Security Notes:');
    console.log('  • This encrypted password only works on this Windows user account');
    console.log('  • It cannot be decrypted by other users or on other computers');
    console.log('  • Store the credentials file securely (outside version control)');
    console.log('');

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('User force closed')) {
        console.log('\n✗ Cancelled by user');
        process.exit(0);
      }
      console.error('\n✗ Encryption failed:', error.message);

      if (error.message.includes('powershell')) {
        console.error('\nThis tool requires Windows with PowerShell.');
        console.error('DPAPI encryption is only available on Windows systems.');
      }
    } else {
      console.error('\n✗ Encryption failed:', error);
    }
    process.exit(1);
  }
}

main();
