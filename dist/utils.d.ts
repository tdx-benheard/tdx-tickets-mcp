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
export declare function decodePassword(password: string): string;
/**
 * Loads environment variables from a .env file.
 *
 * @param envPath - Path to the .env file
 * @returns Record of environment variables
 */
export declare function loadEnvFile(envPath: string): Record<string, string>;
/**
 * Validates that all required environment variables are present.
 *
 * @param vars - Record of environment variables to check
 * @param required - Array of required variable names
 * @throws Error if any required variables are missing
 */
export declare function validateEnvVars(vars: Record<string, string>, required: string[]): void;
/**
 * Sleep for a specified duration (useful for retry logic).
 *
 * @param ms - Milliseconds to sleep
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Calculate exponential backoff delay.
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @param maxDelay - Maximum delay in milliseconds (default: 30000)
 * @returns Delay in milliseconds
 */
export declare function exponentialBackoff(attempt: number, baseDelay?: number, maxDelay?: number): number;
/**
 * Estimates the number of tokens in a string (rough approximation).
 * Uses ~4 characters per token as a heuristic.
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export declare function estimateTokens(text: string): number;
/**
 * Truncates data to fit within token limits while providing helpful guidance.
 *
 * @param data - The data object to potentially truncate
 * @param maxTokens - Maximum allowed tokens (default: 15000 to leave large buffer)
 * @returns Object with truncated data and metadata
 */
export declare function truncateToTokenLimit(data: any, maxTokens?: number): {
    data: any;
    truncated: boolean;
    originalCount?: number;
    returnedCount?: number;
    message?: string;
};
//# sourceMappingURL=utils.d.ts.map