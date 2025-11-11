/**
 * TeamDynamix API Type Definitions
 */

/**
 * Configuration for connecting to a TeamDynamix environment
 */
export interface EnvironmentConfig {
  baseUrl: string;
  username: string;
  password: string;
  appIds: string[];
  timeout?: number;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  baseUrl: string;
  username: string;
  password: string;
}

/**
 * TeamDynamix Ticket entity
 */
export interface Ticket {
  ID: number;
  Title: string;
  Description: string;
  StatusID: number;
  StatusName?: string;
  PriorityID: number;
  PriorityName?: string;
  TypeID?: number;
  TypeName?: string;
  AccountID?: number;
  AccountName?: string;
  SourceID?: number;
  SourceName?: string;
  ImpactID?: number;
  ImpactName?: string;
  UrgencyID?: number;
  UrgencyName?: string;
  RequestorUid?: string;
  RequestorName?: string;
  RequestorEmail?: string;
  ResponsibleUid?: string;
  ResponsibleFullName?: string;
  ResponsibleEmail?: string;
  ResponsibleGroupID?: number;
  ResponsibleGroupName?: string;
  CreatedDate?: string;
  ModifiedDate?: string;
  CreatedUid?: string;
  CreatedFullName?: string;
  ModifiedUid?: string;
  ModifiedFullName?: string;
  AppID?: number;
  AppName?: string;
  Comments?: string;
  Tags?: string[];
  Attributes?: TicketAttribute[];
  Attachments?: Attachment[];
  [key: string]: any; // Allow additional fields
}

/**
 * Partial ticket data for updates
 */
export interface TicketUpdate {
  StatusID?: number;
  PriorityID?: number;
  Title?: string;
  Description?: string;
  Comments?: string;
  ResponsibleUid?: string;
  ResponsibleGroupID?: number;
  Tags?: string[];
  [key: string]: any;
}

/**
 * Ticket search parameters
 */
export interface TicketSearchParams {
  SearchText?: string;
  MaxResults?: number;
  StatusIDs?: number[];
  PriorityIDs?: number[];
  TypeIDs?: number[];
  AccountIDs?: number[];
  PrimaryResponsibilityUids?: string[]; // Primary responsible person (excludes task responsibility)
  ResponsibilityUids?: string[]; // Responsible person including task responsibility
  CompletedTaskResponsibilityFilter?: boolean; // Filter for completed (true) or active (false) task assignments
  RequestorUids?: string[];
  CreatedDateFrom?: string;
  CreatedDateTo?: string;
  ModifiedDateFrom?: string;
  ModifiedDateTo?: string;
  [key: string]: any;
}

/**
 * Ticket attribute (custom field)
 */
export interface TicketAttribute {
  ID: number;
  Name: string;
  Value?: string;
  ValueText?: string;
}

/**
 * Attachment metadata
 */
export interface Attachment {
  ID: number;
  Name: string;
  Size: number;
  CreatedDate: string;
  CreatedFullName?: string;
}

/**
 * Ticket feed entry (comment/update)
 */
export interface FeedEntry {
  ID: number;
  Body: string;
  IsPrivate: boolean;
  CreatedDate: string;
  CreatedUid?: string;
  CreatedFullName?: string;
  CreatedEmail?: string;
  ItemID?: number;
  ItemType?: string;
  Comments?: string;
  Notify?: string[];
}

/**
 * Feed entry creation parameters
 */
export interface CreateFeedEntry {
  Comments: string;
  IsPrivate?: boolean;
  Notify?: string[];
}

/**
 * Report metadata
 */
export interface Report {
  ID: number;
  Name: string;
  Description?: string;
  AppID?: number;
  ApplicationID?: number;
  CategoryID?: number;
  CategoryName?: string;
  IsActive?: boolean;
  MaxResults?: number;
  CreatedDate?: string;
  ModifiedDate?: string;
  CreatedFullName?: string;
  ModifiedFullName?: string;
}

/**
 * Report search parameters
 */
export interface ReportSearchParams {
  SearchText?: string;
  ForAppID?: number;
  MaxResults?: number;
}

/**
 * Pagination metadata for paginated responses
 */
export interface PaginationMetadata {
  currentPage: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  returnedRows: number;
}

/**
 * Report data with results
 */
export interface ReportData {
  ID: number;
  Name: string;
  Description?: string;
  Columns?: ReportColumn[];
  DataRows?: any[][];
  MaxResults?: number;
  SortExpression?: string;
  Pagination?: PaginationMetadata;
}

/**
 * Report column definition
 */
export interface ReportColumn {
  Name: string;
  DisplayName?: string;
  DataType?: string;
  Width?: number;
}

/**
 * User entity (partial - from People API)
 */
export interface User {
  UID: string;
  UserName: string;
  FullName?: string;
  FirstName?: string;
  LastName?: string;
  MiddleName?: string;
  PrimaryEmail?: string;
  AlternateEmail?: string;
  ExternalID?: string;
  AlternateID?: string;
  IsActive?: boolean;
  SecurityRoleID?: number;
  SecurityRoleName?: string;
  [key: string]: any;
}

/**
 * User lookup result (restricted info from lookup endpoint)
 */
export interface UserLookup {
  UID: string;
  UserName: string;
  FullName: string;
  PrimaryEmail?: string;
}

/**
 * User search parameters
 */
export interface UserSearchParams {
  searchText?: string;
  maxResults?: number;
}

/**
 * Group entity
 */
export interface Group {
  ID: number;
  Name: string;
  Description?: string;
  IsActive?: boolean;
  CreatedDate?: string;
  ModifiedDate?: string;
  [key: string]: any;
}

/**
 * Group search parameters
 */
export interface GroupSearchParams {
  SearchText?: string;
  MaxResults?: number;
}

/**
 * API Error response
 */
export interface ApiError {
  statusCode: number;
  message: string;
  details?: any;
  endpoint?: string;
  timestamp?: string;
}

/**
 * MCP Tool arguments base
 */
export interface ToolArgs {
  environment?: string;
  appId?: string;
}

/**
 * Tool argument interfaces for type safety
 */
export interface GetTicketArgs extends ToolArgs {
  ticketId: number;
}

export interface EditTicketArgs extends ToolArgs {
  ticketId: number;
  ticketData: Partial<Ticket>;
}

export interface UpdateTicketArgs extends ToolArgs {
  ticketId: number;
  statusId?: number;
  priorityId?: number;
  title?: string;
  description?: string;
  comments?: string;
  responsibleUid?: string;
  tags?: string[];
}

export interface AddTicketFeedArgs extends ToolArgs {
  ticketId: number;
  comments: string;
  isPrivate?: boolean;
  notify?: string[];
}

export interface GetTicketFeedArgs extends ToolArgs {
  ticketId: number;
  top?: number;
}

export interface TicketTagsArgs extends ToolArgs {
  ticketId: number;
  tags: string[];
}

export interface ListReportsArgs extends ToolArgs {
  maxResults?: number;
}

export interface SearchReportsArgs extends ToolArgs {
  searchText: string;
  maxResults?: number;
}

export interface RunReportArgs extends ToolArgs {
  reportId: number;
  withData?: boolean;
  dataSortExpression?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
  filterResponsibleFullName?: string;
  filterStatusName?: string;
  filterText?: string;
}

export interface GetUserArgs extends ToolArgs {
  uid?: string;
  username?: string;
}

export interface GetCurrentUserArgs extends ToolArgs {}

export interface SearchUsersArgs extends ToolArgs {
  searchText?: string;
  maxResults?: number;
}

export interface GetUserUidArgs extends ToolArgs {
  username: string;
}

export interface SearchGroupsArgs extends ToolArgs {
  searchText?: string;
  maxResults?: number;
}

export interface GetGroupArgs extends ToolArgs {
  groupId: number;
}

export interface ListGroupsArgs extends ToolArgs {
  maxResults?: number;
}

/**
 * HTTP retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  retryableStatusCodes: number[];
  baseDelay: number;
  maxDelay: number;
}
