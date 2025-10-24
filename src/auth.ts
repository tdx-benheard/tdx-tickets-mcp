import axios from 'axios';

export interface AuthConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export class TDXAuth {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  async getToken(): Promise<string> {
    // Check if we have a valid token
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    // Get new token
    const response = await axios.post(
      `${this.config.baseUrl}/api/auth`,
      {
        UserName: this.config.username,
        Password: this.config.password
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    this.token = response.data;
    // Set expiry to 23 hours from now (leaving 1 hour buffer)
    this.tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);

    return this.token as string;
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
}