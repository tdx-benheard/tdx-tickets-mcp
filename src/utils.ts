import { execSync } from 'child_process';
import { readFileSync } from 'fs';

/**
 * Decodes a DPAPI-encrypted password.
 *
 * Required format:
 * - DPAPI (Windows only): "dpapi:AQAAANCMnd8BFdERjHoAwE/Cl+sBAAAA..."
 *
 * @param password - The DPAPI-encrypted password string
 * @returns The decrypted password
 * @throws Error if password is not DPAPI-encrypted or decryption fails
 */
export function decodePassword(password: string): string {
  // Only DPAPI-encrypted passwords are accepted
  if (!password.startsWith('dpapi:')) {
    throw new Error('Password must be DPAPI-encrypted. Use "npm run setup" to create encrypted credentials. Format: "dpapi:AQAAANCMnd8BFdERjHoAwE..."');
  }

  try {
    const encryptedPassword = password.substring(6);
    // Validate base64 format before passing to PowerShell
    if (!/^[A-Za-z0-9+/]+=*$/.test(encryptedPassword)) {
      throw new Error('Invalid DPAPI encrypted password format (must be base64)');
    }

    // Use PowerShell with proper escaping by validating input first
    // Since we validated the base64 format, it's safe to use in the command
    const psCommand = `Add-Type -AssemblyName System.Security; $encrypted = [Convert]::FromBase64String('${encryptedPassword}'); $decrypted = [Security.Cryptography.ProtectedData]::Unprotect($encrypted, $null, 'CurrentUser'); [Text.Encoding]::UTF8.GetString($decrypted)`;

    const decrypted = execSync(`powershell -NoProfile -NonInteractive -Command "${psCommand}"`, {
      encoding: 'utf8',
      windowsHide: true
    }).trim();

    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt DPAPI password: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Loads environment variables from a .env file.
 *
 * @param envPath - Path to the .env file
 * @returns Record of environment variables
 */
export function loadEnvFile(envPath: string): Record<string, string> {
  const envVars: Record<string, string> = {};

  try {
    const envFile = readFileSync(envPath, 'utf8');

    for (const line of envFile.split('\n')) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      const equalIndex = trimmed.indexOf('=');
      if (equalIndex === -1) continue;

      const key = trimmed.slice(0, equalIndex).trim();
      let value = trimmed.slice(equalIndex + 1).trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      envVars[key] = value;
    }
  } catch (error) {
    // File doesn't exist or can't be read - not necessarily an error
  }

  return envVars;
}

/**
 * Validates that all required environment variables are present.
 *
 * @param vars - Record of environment variables to check
 * @param required - Array of required variable names
 * @throws Error if any required variables are missing
 */
export function validateEnvVars(vars: Record<string, string>, required: string[]): void {
  const missing = required.filter(key => !vars[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Sleep for a specified duration (useful for retry logic).
 *
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay.
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @param maxDelay - Maximum delay in milliseconds (default: 30000)
 * @returns Delay in milliseconds
 */
export function exponentialBackoff(attempt: number, baseDelay = 1000, maxDelay = 30000): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter (±25%) to avoid thundering herd
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

/**
 * Estimates the number of tokens in a string (rough approximation).
 * Uses ~4 characters per token as a heuristic.
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncates data to fit within token limits while providing helpful guidance.
 *
 * @param data - The data object to potentially truncate
 * @param maxTokens - Maximum allowed tokens (default: 15000 to leave large buffer)
 * @returns Object with truncated data and metadata
 */
export function truncateToTokenLimit(data: any, maxTokens = 15000): { data: any; truncated: boolean; originalCount?: number; returnedCount?: number; message?: string } {
  const jsonString = JSON.stringify(data, null, 2);
  const estimatedTokens = estimateTokens(jsonString);

  if (estimatedTokens <= maxTokens) {
    return { data, truncated: false };
  }

  // Try to truncate arrays in the data
  let truncatedData = { ...data };
  let truncated = false;
  let originalCount = 0;
  let returnedCount = 0;

  // Handle array of results (ticket search, report data, etc.)
  if (Array.isArray(data)) {
    originalCount = data.length;
    // Binary search for how many items fit
    let left = 0;
    let right = data.length;
    let bestFit = 0;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const testData = data.slice(0, mid);
      const testTokens = estimateTokens(JSON.stringify(testData, null, 2));

      if (testTokens <= maxTokens) {
        bestFit = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    returnedCount = bestFit;
    truncatedData = data.slice(0, bestFit);
    truncated = true;
  }
  // Handle DataRows in report results
  else if (data.DataRows && Array.isArray(data.DataRows)) {
    originalCount = data.DataRows.length;
    // Binary search for how many rows fit
    let left = 0;
    let right = data.DataRows.length;
    let bestFit = 0;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const testData = { ...data, DataRows: data.DataRows.slice(0, mid) };
      const testTokens = estimateTokens(JSON.stringify(testData, null, 2));

      if (testTokens <= maxTokens) {
        bestFit = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    returnedCount = bestFit;
    truncatedData = { ...data, DataRows: data.DataRows.slice(0, bestFit) };
    truncated = true;
  }

  const message = truncated
    ? `Response truncated: Showing ${returnedCount} of ${originalCount} results to stay within token limits. Use 'maxResults' or 'limit' parameter to control result size, or add filters to narrow results.`
    : undefined;

  return {
    data: truncatedData,
    truncated,
    originalCount,
    returnedCount,
    message
  };
}
