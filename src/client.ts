import axios, { AxiosInstance } from 'axios';
import { TDXAuth } from './auth.js';

export class TDXClient {
  private auth: TDXAuth;
  private baseUrl: string;
  private appIds: string[];
  private ticketAppIdCache: Map<number, string>;
  private client: AxiosInstance;
  private username: string;

  constructor(baseUrl: string, username: string, password: string, appIds: string | string[]) {
    this.baseUrl = baseUrl;
    this.username = username;
    this.appIds = Array.isArray(appIds) ? appIds : [appIds];
    this.ticketAppIdCache = new Map();
    this.auth = new TDXAuth({ baseUrl, username, password });
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 20000
    });

    // Add auth interceptor
    this.client.interceptors.request.use(async (config) => {
      const headers = await this.auth.getAuthHeaders();
      Object.assign(config.headers, headers);
      return config;
    });

    // Add response error interceptor for auth refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, will refresh on next request
          const headers = await this.auth.getAuthHeaders();
          Object.assign(error.config.headers, headers);
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  // Search tickets - uses first app ID by default or override
  async searchTickets(searchParams: any, appIdOverride?: string) {
    const appId = appIdOverride || this.appIds[0];
    const response = await this.client.post(`/api/${appId}/tickets/search`, searchParams);
    return response.data;
  }

  // Get ticket for editing - tries cached appId first, then falls back to trying all appIds
  async getTicket(ticketId: number, appIdOverride?: string) {
    // If override provided, use it directly
    if (appIdOverride) {
      const response = await this.client.get(`/api/${appIdOverride}/tickets/${ticketId}`);
      this.ticketAppIdCache.set(ticketId, appIdOverride);
      return response.data;
    }

    // Check cache first
    const cachedAppId = this.ticketAppIdCache.get(ticketId);
    if (cachedAppId) {
      try {
        const response = await this.client.get(`/api/${cachedAppId}/tickets/${ticketId}`);
        return response.data;
      } catch (error: any) {
        // If cached appId fails with 404, remove from cache and fall through
        if (error.response?.status === 404) {
          this.ticketAppIdCache.delete(ticketId);
        } else {
          throw error;
        }
      }
    }

    // Try each appId until one succeeds
    let lastError: any;
    for (const appId of this.appIds) {
      try {
        const response = await this.client.get(`/api/${appId}/tickets/${ticketId}`);
        // Cache the successful appId
        this.ticketAppIdCache.set(ticketId, appId);
        return response.data;
      } catch (error: any) {
        lastError = error;
        // Continue trying if 404, otherwise throw
        if (error.response?.status !== 404) {
          throw error;
        }
      }
    }

    // If all appIds failed, throw the last error
    throw lastError;
  }

  // Helper method to get the correct appId for a ticket
  private async getAppIdForTicket(ticketId: number, appIdOverride?: string): Promise<string> {
    // If override provided, use it
    if (appIdOverride) {
      return appIdOverride;
    }

    // Check cache first
    const cachedAppId = this.ticketAppIdCache.get(ticketId);
    if (cachedAppId) {
      return cachedAppId;
    }

    // Try to find the ticket to determine its appId
    for (const appId of this.appIds) {
      try {
        await this.client.get(`/api/${appId}/tickets/${ticketId}`);
        this.ticketAppIdCache.set(ticketId, appId);
        return appId;
      } catch (error: any) {
        if (error.response?.status !== 404) {
          throw error;
        }
      }
    }

    // If not found, return first appId as fallback
    return this.appIds[0];
  }

  // Edit ticket (full update) - uses POST per TDX API spec
  async editTicket(ticketId: number, ticketData: any, appIdOverride?: string) {
    const appId = await this.getAppIdForTicket(ticketId, appIdOverride);
    const response = await this.client.post(`/api/${appId}/tickets/${ticketId}`, ticketData);
    return response.data;
  }

  // Update ticket (partial update) - uses POST (TeamDynamix doesn't support true PATCH)
  // Note: Despite PATCH being documented, TDX requires JSON Patch format which is complex
  // For simplicity, we use POST with only the fields we want to change
  // The API will merge these with existing ticket data
  async updateTicket(ticketId: number, updateData: any, appIdOverride?: string) {
    const appId = await this.getAppIdForTicket(ticketId, appIdOverride);

    // Get current ticket to merge with updates
    const currentTicket = await this.getTicket(ticketId, appId);

    // Merge update data with current ticket (preserving required fields)
    const mergedData = {
      ...currentTicket,
      ...updateData
    };

    const response = await this.client.post(`/api/${appId}/tickets/${ticketId}`, mergedData);
    return response.data;
  }

  // Add tags to ticket
  async addTicketTags(ticketId: number, tags: string[], appIdOverride?: string) {
    const appId = await this.getAppIdForTicket(ticketId, appIdOverride);
    const response = await this.client.post(`/api/${appId}/tickets/${ticketId}/tags`, tags);
    return response.data;
  }

  // Delete tags from ticket
  async deleteTicketTags(ticketId: number, tags: string[], appIdOverride?: string) {
    const appId = await this.getAppIdForTicket(ticketId, appIdOverride);
    const response = await this.client.delete(`/api/${appId}/tickets/${ticketId}/tags`, { data: tags });
    return response.data;
  }

  // Add feed entry to ticket
  async addTicketFeedEntry(ticketId: number, feedEntry: any, appIdOverride?: string) {
    const appId = await this.getAppIdForTicket(ticketId, appIdOverride);
    const response = await this.client.post(`/api/${appId}/tickets/${ticketId}/feed`, feedEntry);
    return response.data;
  }

  // List all available reports - uses global endpoint, optionally filter by AppID
  async listReports(maxResults: number = 100, appIdOverride?: string) {
    const response = await this.client.get('/api/reports');
    let reports = response.data;

    // Filter by AppID if specified
    if (appIdOverride && Array.isArray(reports)) {
      reports = reports.filter((report: any) =>
        report.AppID?.toString() === appIdOverride || report.ApplicationID?.toString() === appIdOverride
      );
    }

    // Client-side limit to maxResults
    if (Array.isArray(reports) && maxResults > 0) {
      reports = reports.slice(0, maxResults);
    }

    return reports;
  }

  // Search reports by name - uses POST with ReportSearch body
  async searchReports(searchText: string, maxResults: number = 50, appIdOverride?: string) {
    const searchBody: any = {
      SearchText: searchText
    };

    // Use ForAppID if appIdOverride provided
    if (appIdOverride) {
      searchBody.ForAppID = parseInt(appIdOverride);
    }

    const response = await this.client.post('/api/reports/search', searchBody);
    let reports = response.data;

    // Client-side limit to maxResults
    if (Array.isArray(reports) && maxResults > 0) {
      reports = reports.slice(0, maxResults);
    }

    return reports;
  }

  // Run report by ID - uses global endpoint with optional parameters
  async runReport(reportId: number, appIdOverride?: string, withData: boolean = false, dataSortExpression: string = '') {
    const params: any = {};
    if (withData) params.withData = withData;
    if (dataSortExpression) params.dataSortExpression = dataSortExpression;

    const response = await this.client.get(`/api/reports/${reportId}`, {
      params: Object.keys(params).length > 0 ? params : undefined
    });
    return response.data;
  }

  // People API Methods

  // Get user by UID or username
  async getUser(uid?: string, username?: string) {
    if (!uid && !username) {
      throw new Error('Either uid or username must be provided');
    }

    const identifier = uid || username;
    const response = await this.client.get(`/api/people/${identifier}`);
    return response.data;
  }

  // Get current authenticated user (using username from credentials)
  async getCurrentUser() {
    const response = await this.client.get(`/api/people/${this.username}`);
    return response.data;
  }

  // Search users using lookup endpoint (restricted lookup, returns partial info)
  async searchUsers(searchText: string = '', maxResults: number = 50) {
    // Ensure maxResults is within API limits (1-100)
    const limitedResults = Math.min(Math.max(maxResults, 1), 100);

    const params: any = {
      searchText,
      maxResults: limitedResults
    };

    const response = await this.client.get('/api/people/lookup', { params });
    return response.data;
  }

  // Get user UID by username
  async getUserUid(username: string) {
    const response = await this.client.get(`/api/people/getuid/${username}`);
    return response.data;
  }

  // Groups API Methods

  // Search groups using POST search endpoint
  async searchGroups(searchText: string = '', maxResults: number = 50) {
    // Ensure maxResults is within API limits (1-100)
    const limitedResults = Math.min(Math.max(maxResults, 1), 100);

    const response = await this.client.post('/api/groups/search', {
      SearchText: searchText,
      MaxResults: limitedResults
    });
    return response.data;
  }

  // Get group by ID
  async getGroup(groupId: number) {
    const response = await this.client.get(`/api/groups/${groupId}`);
    return response.data;
  }

  // List all groups (uses POST with search body)
  async listGroups(maxResults: number = 100) {
    const response = await this.client.post('/api/groups/search', {
      MaxResults: maxResults
    });
    return response.data;
  }
}