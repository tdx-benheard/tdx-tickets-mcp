import axios, { AxiosInstance, AxiosError } from 'axios';
import { TDXAuth } from './auth.js';
import { exponentialBackoff, sleep } from './utils.js';
import type {
  Ticket,
  TicketUpdate,
  TicketSearchParams,
  FeedEntry,
  CreateFeedEntry,
  Report,
  ReportSearchParams,
  ReportData,
  User,
  UserLookup,
  UserSearchParams,
  Group,
  GroupSearchParams,
  RetryConfig,
  TicketTask,
  TaskFeedUpdate
} from './types.js';

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  baseDelay: 1000,
  maxDelay: 30000
};

/**
 * TeamDynamix API Client
 * Handles all API interactions with authentication, retry logic, and error handling.
 */
export class TDXClient {
  private auth: TDXAuth;
  private baseUrl: string;
  private appIds: string[];
  private ticketAppIdCache: Map<number, string>;
  private client: AxiosInstance;
  private username: string;
  private timeout: number;
  private retryConfig: RetryConfig;

  constructor(
    baseUrl: string,
    username: string,
    password: string,
    appIds: string | string[],
    timeout: number = 20000,
    retryConfig: Partial<RetryConfig> = {}
  ) {
    if (!baseUrl || !username || !password) {
      throw new Error('baseUrl, username, and password are required');
    }

    this.baseUrl = baseUrl;
    this.username = username;
    this.appIds = Array.isArray(appIds) ? appIds : [appIds];

    if (this.appIds.length === 0) {
      throw new Error('At least one application ID is required');
    }

    this.ticketAppIdCache = new Map();
    this.timeout = timeout;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.auth = new TDXAuth({ baseUrl, username, password });

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: this.timeout
    });

    // Add auth interceptor
    this.client.interceptors.request.use(async (config) => {
      const headers = await this.auth.getAuthHeaders();
      Object.assign(config.headers, headers);
      return config;
    });

    // Add response error interceptor for auth refresh (with retry limit)
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If there's no config, we can't retry
        if (!originalRequest) {
          return Promise.reject(error);
        }

        // Prevent infinite retry loop
        if (originalRequest._retryCount === undefined) {
          originalRequest._retryCount = 0;
        }

        // Handle 401 Unauthorized - token expired
        if (error.response?.status === 401 && originalRequest._retryCount < 1) {
          originalRequest._retryCount++;
          console.error('[Client] Received 401, invalidating token and retrying...');

          // Invalidate token and get a fresh one
          this.auth.invalidateToken();
          const headers = await this.auth.getAuthHeaders();
          Object.assign(originalRequest.headers, headers);

          return this.client.request(originalRequest);
        }

        // Handle retryable errors
        if (
          this.retryConfig.retryableStatusCodes.includes(error.response?.status) &&
          originalRequest._retryCount < this.retryConfig.maxRetries
        ) {
          originalRequest._retryCount++;
          const delay = exponentialBackoff(
            originalRequest._retryCount - 1,
            this.retryConfig.baseDelay,
            this.retryConfig.maxDelay
          );

          console.error(
            `[Client] Retrying request (${originalRequest._retryCount}/${this.retryConfig.maxRetries}) ` +
            `after ${delay}ms due to ${error.response?.status} error`
          );

          await sleep(delay);
          return this.client.request(originalRequest);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Search for tickets based on search criteria.
   *
   * @param searchParams - Search parameters (text, status, priority, etc.)
   * @param appIdOverride - Optional app ID to override default
   * @returns Array of matching tickets
   */
  async searchTickets(searchParams: TicketSearchParams, appIdOverride?: string): Promise<Ticket[]> {
    const appId = appIdOverride || this.appIds[0];

    // Enforce maxResults limit
    const params = { ...searchParams };
    if (params.MaxResults && params.MaxResults > 1000) {
      console.error('[Client] Warning: MaxResults capped at 1000');
      params.MaxResults = 1000;
    }

    const response = await this.client.post(`/api/${appId}/tickets/search`, params);
    return response.data;
  }

  /**
   * Get a single ticket by ID.
   * Automatically discovers the correct app ID if not cached.
   *
   * @param ticketId - The ticket ID to retrieve
   * @param appIdOverride - Optional app ID to override discovery
   * @returns The ticket data
   * @throws Error if ticket not found in any configured app
   */
  async getTicket(ticketId: number, appIdOverride?: string): Promise<Ticket> {
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
      } catch (error) {
        // If cached appId fails, remove from cache and fall through
        // This handles 404s, permission changes, or app migrations
        if (axios.isAxiosError(error)) {
          console.error(`[Client] Cached app ID ${cachedAppId} failed for ticket ${ticketId}, invalidating cache`);
          this.ticketAppIdCache.delete(ticketId);
        } else {
          throw error;
        }
      }
    }

    // Try each appId until one succeeds
    let lastError: Error | undefined;
    for (const appId of this.appIds) {
      try {
        const response = await this.client.get(`/api/${appId}/tickets/${ticketId}`);
        // Cache the successful appId
        this.ticketAppIdCache.set(ticketId, appId);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          lastError = error;
          // Continue trying if 404, otherwise throw
          if (error.response?.status !== 404) {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    // If all appIds failed, throw the last error
    throw lastError || new Error(`Ticket ${ticketId} not found in any configured application`);
  }

  /**
   * Helper method to get the correct appId for a ticket.
   * Uses cache or discovers by trying each configured app.
   *
   * @param ticketId - The ticket ID
   * @param appIdOverride - Optional app ID override
   * @returns The app ID for the ticket
   */
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
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status !== 404) {
          throw error;
        }
      }
    }

    // If not found, return first appId as fallback
    return this.appIds[0];
  }

  /**
   * Edit a ticket with full replacement (all fields required).
   *
   * @param ticketId - The ticket ID to edit
   * @param ticketData - Complete ticket data
   * @param appIdOverride - Optional app ID override
   * @returns The updated ticket
   */
  async editTicket(ticketId: number, ticketData: Partial<Ticket>, appIdOverride?: string): Promise<Ticket> {
    const appId = await this.getAppIdForTicket(ticketId, appIdOverride);
    const response = await this.client.post(`/api/${appId}/tickets/${ticketId}`, ticketData);
    return response.data;
  }

  /**
   * Update a ticket with partial data (auto-merges with existing ticket).
   * This is preferred over editTicket for most use cases.
   *
   * @param ticketId - The ticket ID to update
   * @param updateData - Partial ticket data to update
   * @param appIdOverride - Optional app ID override
   * @returns The updated ticket
   */
  async updateTicket(ticketId: number, updateData: TicketUpdate, appIdOverride?: string): Promise<Ticket> {
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

  /**
   * Add tags to a ticket.
   *
   * @param ticketId - The ticket ID
   * @param tags - Array of tag names to add
   * @param appIdOverride - Optional app ID override
   */
  async addTicketTags(ticketId: number, tags: string[], appIdOverride?: string): Promise<void> {
    const appId = await this.getAppIdForTicket(ticketId, appIdOverride);
    await this.client.post(`/api/${appId}/tickets/${ticketId}/tags`, tags);
  }

  /**
   * Delete tags from a ticket.
   *
   * @param ticketId - The ticket ID
   * @param tags - Array of tag names to delete
   * @param appIdOverride - Optional app ID override
   */
  async deleteTicketTags(ticketId: number, tags: string[], appIdOverride?: string): Promise<void> {
    const appId = await this.getAppIdForTicket(ticketId, appIdOverride);
    try {
      await this.client.delete(`/api/${appId}/tickets/${ticketId}/tags`, { data: tags });
    } catch (error) {
      // 304 Not Modified means the tags don't exist on the ticket (nothing to delete)
      // This is a success case - the desired end state is achieved (tags are not on the ticket)
      if (axios.isAxiosError(error) && error.response?.status === 304) {
        return;
      }
      throw error;
    }
  }

  /**
   * Add a feed entry (comment/update) to a ticket.
   *
   * @param ticketId - The ticket ID
   * @param feedEntry - Feed entry data (comments, privacy, notifications)
   * @param appIdOverride - Optional app ID override
   * @returns The created feed entry
   */
  async addTicketFeedEntry(ticketId: number, feedEntry: CreateFeedEntry, appIdOverride?: string): Promise<FeedEntry> {
    const appId = await this.getAppIdForTicket(ticketId, appIdOverride);
    const response = await this.client.post(`/api/${appId}/tickets/${ticketId}/feed`, feedEntry);
    return response.data;
  }

  /**
   * Get feed entries (comments/updates) for a ticket.
   *
   * @param ticketId - The ticket ID
   * @param top - Maximum number of entries to return (0 = all)
   * @param appIdOverride - Optional app ID override
   * @returns Array of feed entries
   */
  async getTicketFeed(ticketId: number, top: number = 10, appIdOverride?: string): Promise<FeedEntry[]> {
    const appId = await this.getAppIdForTicket(ticketId, appIdOverride);
    const params: Record<string, number> = {};
    if (top > 0) params.top = top;

    const response = await this.client.get(`/api/${appId}/tickets/${ticketId}/feed`, {
      params: Object.keys(params).length > 0 ? params : undefined
    });
    return response.data;
  }

  /**
   * List all available reports.
   *
   * @param maxResults - Maximum number of reports to return
   * @param appIdOverride - Optional app ID to filter by
   * @returns Array of report metadata
   */
  async listReports(maxResults: number = 100, appIdOverride?: string): Promise<Report[]> {
    const response = await this.client.get('/api/reports');
    let reports = response.data;

    // Filter by AppID if specified
    if (appIdOverride && Array.isArray(reports)) {
      reports = reports.filter((report: Report) =>
        report.AppID?.toString() === appIdOverride || report.ApplicationID?.toString() === appIdOverride
      );
    }

    // Client-side limit to maxResults
    if (Array.isArray(reports) && maxResults > 0) {
      reports = reports.slice(0, maxResults);
    }

    return reports;
  }

  /**
   * Search for reports by name.
   *
   * @param searchText - Text to search for in report names
   * @param maxResults - Maximum number of results
   * @param appIdOverride - Optional app ID to filter by
   * @returns Array of matching reports
   */
  async searchReports(searchText: string, maxResults: number = 50, appIdOverride?: string): Promise<Report[]> {
    const searchBody: ReportSearchParams = {
      SearchText: searchText
    };

    // Use ForAppID if appIdOverride provided
    if (appIdOverride) {
      searchBody.ForAppID = parseInt(appIdOverride);
    }

    const response = await this.client.post('/api/reports/search', searchBody);
    let reports = response.data;

    // Prioritize reports starting with "All" to the top
    if (Array.isArray(reports) && reports.length > 1) {
      reports = reports.sort((a, b) => {
        const aStartsWithAll = /^All\s/i.test(a.Name || '');
        const bStartsWithAll = /^All\s/i.test(b.Name || '');

        if (aStartsWithAll && !bStartsWithAll) return -1;
        if (!aStartsWithAll && bStartsWithAll) return 1;
        return 0; // Maintain API order for other reports
      });
    }

    // Client-side limit to maxResults
    if (Array.isArray(reports) && maxResults > 0) {
      reports = reports.slice(0, maxResults);
    }

    return reports;
  }

  /**
   * Run a report and optionally retrieve its data.
   *
   * @param reportId - The report ID to run
   * @param appIdOverride - Optional app ID override
   * @param withData - Whether to include report data rows
   * @param dataSortExpression - Optional sort expression
   * @returns Report metadata and optionally data
   */
  async runReport(
    reportId: number,
    appIdOverride?: string,
    withData: boolean = false,
    dataSortExpression: string = ''
  ): Promise<ReportData> {
    const params: Record<string, string | boolean> = {};
    if (withData) params.withData = withData;
    if (dataSortExpression) params.dataSortExpression = dataSortExpression;

    const response = await this.client.get(`/api/reports/${reportId}`, {
      params: Object.keys(params).length > 0 ? params : undefined
    });
    return response.data;
  }

  // ===== People API Methods =====

  /**
   * Get a user by UID or username.
   *
   * @param uid - User UID (GUID)
   * @param username - Username (alternative to UID)
   * @returns User data
   */
  async getUser(uid?: string, username?: string): Promise<User> {
    if (!uid && !username) {
      throw new Error('Either uid or username must be provided');
    }

    const identifier = uid || username;
    const response = await this.client.get(`/api/people/${identifier}`);
    return response.data;
  }

  /**
   * Get the currently authenticated user.
   *
   * @returns Current user data
   */
  async getCurrentUser(): Promise<User> {
    const response = await this.client.get(`/api/people/${this.username}`);
    return response.data;
  }

  /**
   * Search for users (returns restricted lookup results).
   *
   * @param searchText - Search text (name, email, username)
   * @param maxResults - Maximum results (1-100)
   * @returns Array of user lookup results
   */
  async searchUsers(searchText: string = '', maxResults: number = 50): Promise<UserLookup[]> {
    // Ensure maxResults is within API limits (1-100)
    const limitedResults = Math.min(Math.max(maxResults, 1), 100);

    const params = {
      searchText,
      maxResults: limitedResults
    };

    const response = await this.client.get('/api/people/lookup', { params });
    return response.data;
  }

  /**
   * Get a user's UID by username.
   *
   * @param username - Username to look up
   * @returns User UID (GUID)
   */
  async getUserUid(username: string): Promise<string> {
    const response = await this.client.get(`/api/people/getuid/${username}`);
    return response.data;
  }

  // ===== Groups API Methods =====

  /**
   * Search for groups.
   *
   * @param searchText - Search text
   * @param maxResults - Maximum results (1-100)
   * @returns Array of matching groups
   */
  async searchGroups(searchText: string = '', maxResults: number = 50): Promise<Group[]> {
    // Ensure maxResults is within API limits (1-100)
    const limitedResults = Math.min(Math.max(maxResults, 1), 100);

    const response = await this.client.post('/api/groups/search', {
      SearchText: searchText,
      MaxResults: limitedResults
    });
    return response.data;
  }

  /**
   * Get a group by ID.
   *
   * @param groupId - Group ID
   * @returns Group data
   */
  async getGroup(groupId: number): Promise<Group> {
    const response = await this.client.get(`/api/groups/${groupId}`);
    return response.data;
  }

  /**
   * List all groups.
   *
   * @param maxResults - Maximum number of groups to return
   * @returns Array of groups
   */
  async listGroups(maxResults: number = 100): Promise<Group[]> {
    const response = await this.client.post('/api/groups/search', {
      MaxResults: maxResults
    });
    return response.data;
  }

  // ===== Ticket Tasks API Methods =====

  /**
   * Get all tasks on a ticket.
   *
   * @param ticketId - The ticket ID
   * @param appIdOverride - Optional app ID to override discovery
   * @returns Array of ticket tasks
   */
  async getTicketTasks(ticketId: number, appIdOverride?: string): Promise<TicketTask[]> {
    const appId = appIdOverride || await this.findAppIdForTicket(ticketId);
    const response = await this.client.get(`/api/${appId}/tickets/${ticketId}/tasks`);
    return response.data;
  }

  /**
   * Get a single task by ID from a ticket.
   *
   * @param ticketId - The ticket ID
   * @param taskId - The task ID
   * @param appIdOverride - Optional app ID to override discovery
   * @returns The task data
   */
  async getTicketTask(ticketId: number, taskId: number, appIdOverride?: string): Promise<TicketTask> {
    const appId = appIdOverride || await this.findAppIdForTicket(ticketId);
    const response = await this.client.get(`/api/${appId}/tickets/${ticketId}/tasks/${taskId}`);
    return response.data;
  }

  /**
   * Update a ticket task via feed entry (adds comment/update).
   *
   * @param ticketId - The ticket ID
   * @param taskId - The task ID
   * @param update - Task update parameters (comments, privacy, notifications)
   * @param appIdOverride - Optional app ID to override discovery
   * @returns The updated task data
   */
  async updateTicketTask(
    ticketId: number,
    taskId: number,
    update: TaskFeedUpdate,
    appIdOverride?: string
  ): Promise<any> {
    const appId = appIdOverride || await this.findAppIdForTicket(ticketId);
    const response = await this.client.post(
      `/api/${appId}/tickets/${ticketId}/tasks/${taskId}/feed`,
      update
    );
    return response.data;
  }

  /**
   * Helper method to find which app ID a ticket belongs to.
   * Checks cache first, then tries each configured app.
   *
   * @param ticketId - The ticket ID
   * @returns The app ID where the ticket was found
   * @throws Error if ticket not found in any configured app
   */
  private async findAppIdForTicket(ticketId: number): Promise<string> {
    // Check cache first
    const cachedAppId = this.ticketAppIdCache.get(ticketId);
    if (cachedAppId) {
      return cachedAppId;
    }

    // Try each appId
    for (const appId of this.appIds) {
      try {
        await this.client.get(`/api/${appId}/tickets/${ticketId}`);
        this.ticketAppIdCache.set(ticketId, appId);
        return appId;
      } catch (error) {
        // Ticket not in this app, try next
        continue;
      }
    }

    throw new Error(`Ticket ${ticketId} not found in any configured app: ${this.appIds.join(', ')}`);
  }
}