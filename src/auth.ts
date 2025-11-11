import axios from 'axios';
import { AuthConfig } from './types.js';

/**
 * Manages authentication tokens for TeamDynamix API.
 * Handles token caching, expiry, and thread-safe refresh.
 */
export class TDXAuth {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private config: AuthConfig;
  private refreshPromise: Promise<string> | null = null;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  /**
   * Gets a valid authentication token, refreshing if necessary.
   * Uses a mutex pattern to prevent concurrent refresh requests.
   *
   * @returns Promise resolving to authentication token
   * @throws Error if authentication fails
   */
  async getToken(): Promise<string> {
    // Check if we have a valid token
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start token refresh with mutex
    this.refreshPromise = this.refreshToken();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Refreshes the authentication token from the API.
   *
   * @returns Promise resolving to new authentication token
   * @throws Error if authentication fails
   */
  private async refreshToken(): Promise<string> {
    console.error(`[Auth] Refreshing token for ${this.config.username}...`);

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/api/auth`,
        {
          UserName: this.config.username,
          Password: this.config.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10s timeout for auth requests
        }
      );

      this.token = response.data;
      // Set expiry to 23 hours from now (leaving 1 hour buffer)
      this.tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);

      console.error(`[Auth] Token refreshed successfully, expires at ${this.tokenExpiry.toISOString()}`);

      return this.token as string;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          throw new Error(
            `Authentication timeout after 10s. Check that the TeamDynamix server is accessible at ${this.config.baseUrl}`
          );
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Authentication failed: Invalid username or password');
        }
        if (error.response?.status) {
          throw new Error(`Authentication failed: HTTP ${error.response.status} - ${error.response.statusText}`);
        }
      }
      throw error;
    }
  }

  /**
   * Gets authentication headers with a valid token.
   *
   * @returns Promise resolving to headers object
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Invalidates the current token, forcing a refresh on next request.
   * Useful when a 401 response is received.
   */
  invalidateToken(): void {
    console.error('[Auth] Token invalidated');
    this.token = null;
    this.tokenExpiry = null;
  }
}