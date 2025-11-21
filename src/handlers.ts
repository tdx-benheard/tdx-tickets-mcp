import { TDXClient } from './client.js';
import { truncateToTokenLimit } from './utils.js';
import type {
  GetTicketArgs,
  EditTicketArgs,
  UpdateTicketArgs,
  AddTicketFeedArgs,
  GetTicketFeedArgs,
  TicketTagsArgs,
  ListReportsArgs,
  SearchReportsArgs,
  RunReportArgs,
  GetUserArgs,
  GetCurrentUserArgs,
  SearchUsersArgs,
  GetUserUidArgs,
  SearchGroupsArgs,
  GetGroupArgs,
  ListGroupsArgs
} from './types.js';

export class ToolHandlers {
  constructor(
    private tdxClients: Map<string, TDXClient>,
    private defaultEnvironment: string
  ) {}

  // Get the appropriate client based on environment parameter
  private getClient(environment?: string): TDXClient {
    const env = environment || this.defaultEnvironment;
    const client = this.tdxClients.get(env);

    if (!client) {
      throw new Error(`Environment '${env}' not configured. Available: ${Array.from(this.tdxClients.keys()).join(', ')}`);
    }

    return client;
  }

  /**
   * Filter ticket attributes to remove bloated choice metadata.
   * Reduces response size by ~80-85% by keeping only selected values.
   */
  private filterTicketAttributes(ticket: any): any {
    if (!ticket.Attributes || !Array.isArray(ticket.Attributes)) {
      return ticket;
    }

    const filtered = { ...ticket };
    filtered.Attributes = ticket.Attributes.map((attr: any) => {
      // Keep only essential attribute data
      const filteredAttr: any = {
        ID: attr.ID,
        Name: attr.Name,
        Value: attr.Value,
        ValueText: attr.ValueText,
      };

      // If there are choices, only include the selected one(s), not ALL possible choices
      if (attr.Choices && Array.isArray(attr.Choices) && attr.Value) {
        const selectedValues = Array.isArray(attr.Value) ? attr.Value : [attr.Value];
        filteredAttr.SelectedChoices = attr.Choices
          .filter((choice: any) => selectedValues.includes(choice.ID))
          .map((choice: any) => ({
            ID: choice.ID,
            Name: choice.Name,
          }));
      }

      return filteredAttr;
    });

    return filtered;
  }

  async handleGetTicket(args: GetTicketArgs) {
    const client = this.getClient(args?.environment);
    if (!args?.ticketId) {
      throw new Error('ticketId is required');
    }

    const ticket = await client.getTicket(args.ticketId, args?.appId);

    // Filter out bloated attribute choice data (saves ~80-85% on response size)
    const filteredTicket = this.filterTicketAttributes(ticket);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(filteredTicket, null, 2),
        },
      ],
    };
  }

  async handleEditTicket(args: EditTicketArgs) {
    const client = this.getClient(args?.environment);
    if (!args?.ticketId || !args?.ticketData) {
      throw new Error('ticketId and ticketData are required');
    }

    const result = await client.editTicket(args.ticketId, args.ticketData, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: `Ticket #${result.ID} "${result.Title}" edited successfully.`,
        },
      ],
    };
  }

  async handleUpdateTicket(args: UpdateTicketArgs) {
    const client = this.getClient(args?.environment);
    if (!args?.ticketId) {
      throw new Error('ticketId is required');
    }

    const updateData: any = {};

    if (args.statusId !== undefined) updateData.StatusID = args.statusId;
    if (args.priorityId !== undefined) updateData.PriorityID = args.priorityId;
    if (args.title) updateData.Title = args.title;
    if (args.description) updateData.Description = args.description;
    if (args.comments) updateData.Comments = args.comments;
    // Allow empty string to unassign ticket
    if (args.responsibleUid !== undefined) updateData.ResponsibleUid = args.responsibleUid;

    const result = await client.updateTicket(args.ticketId, updateData, args?.appId);

    // Filter out bloated attribute choice data and return updated ticket details
    const filteredTicket = this.filterTicketAttributes(result);

    return {
      content: [
        {
          type: 'text',
          text: `Ticket #${result.ID} "${result.Title}" updated successfully.\n\nUpdated ticket details:\n${JSON.stringify(filteredTicket, null, 2)}`,
        },
      ],
    };
  }

  async handleAddTicketFeed(args: AddTicketFeedArgs) {
    const client = this.getClient(args?.environment);
    if (!args?.ticketId || !args?.comments) {
      throw new Error('ticketId and comments are required');
    }

    const feedEntry: any = {
      Comments: args.comments,
      IsPrivate: args.isPrivate || false,
    };

    if (args.notify) feedEntry.Notify = args.notify;

    const result = await client.addTicketFeedEntry(args.ticketId, feedEntry, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: `Feed entry #${result.ID} added to ticket #${args.ticketId} successfully.`,
        },
      ],
    };
  }

  async handleGetTicketFeed(args: GetTicketFeedArgs) {
    const client = this.getClient(args?.environment);
    if (!args?.ticketId) {
      throw new Error('ticketId is required');
    }

    const top = args?.top !== undefined ? args.top : 10;
    const result = await client.getTicketFeed(args.ticketId, top, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async handleAddTicketTags(args: TicketTagsArgs) {
    const client = this.getClient(args?.environment);
    if (!args?.ticketId || !args?.tags) {
      throw new Error('ticketId and tags are required');
    }

    await client.addTicketTags(args.ticketId, args.tags, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: 'Tags added successfully. Note: Tags are stored but not returned in GET ticket responses due to API limitations. Verify tags in the TeamDynamix UI.',
        },
      ],
    };
  }

  async handleDeleteTicketTags(args: TicketTagsArgs) {
    const client = this.getClient(args?.environment);
    if (!args?.ticketId || !args?.tags) {
      throw new Error('ticketId and tags are required');
    }

    await client.deleteTicketTags(args.ticketId, args.tags, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: 'Tags deleted successfully.',
        },
      ],
    };
  }

  async handleListReports(args: ListReportsArgs) {
    const client = this.getClient(args?.environment);
    const maxResults = args?.maxResults || 100;
    const reports = await client.listReports(maxResults, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(reports, null, 2),
        },
      ],
    };
  }

  async handleSearchReports(args: SearchReportsArgs) {
    const client = this.getClient(args?.environment);
    if (!args?.searchText) {
      throw new Error('searchText is required');
    }

    const maxResults = args.maxResults || 50;
    const reports = await client.searchReports(args.searchText, maxResults, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(reports, null, 2),
        },
      ],
    };
  }

  async handleRunReport(args: RunReportArgs) {
    const client = this.getClient(args?.environment);
    if (!args?.reportId) {
      throw new Error('reportId is required');
    }

    const results = await client.runReport(
      args.reportId,
      args?.appId,
      args?.withData || false,
      args?.dataSortExpression || ''
    );

    // Validate dataSortExpression if provided and data is returned
    if (args?.dataSortExpression && results.DisplayedColumns && Array.isArray(results.DisplayedColumns)) {
      // Extract the column name from the sort expression (handle "ColumnName DESC" format)
      const sortExpr = args.dataSortExpression.trim();
      const columnName = sortExpr.replace(/\s+(ASC|DESC)\s*$/i, '').trim();

      // Check if the SortOrder was applied (means the sort was valid)
      // API returns empty array [] when sort column is invalid
      const sortWasApplied = results.SortOrder &&
                             Array.isArray(results.SortOrder) &&
                             results.SortOrder.length > 0;

      if (!sortWasApplied) {
        // Get valid column names from report metadata
        const validColumns = results.DisplayedColumns
          .map((col: any) => col.ColumnName)
          .filter((name: string) => name); // Filter out any empty names

        throw new Error(
          `Invalid sort column "${columnName}". Valid column names for this report:\n` +
          validColumns.map((col: string) => `  - ${col}`).join('\n') +
          `\n\nUse the exact ColumnName (e.g., "TicketID" not "ID"). Add " DESC" for descending order.`
        );
      }
    }

    // Apply client-side filtering and pagination if DataRows exist
    if (results.DataRows && Array.isArray(results.DataRows)) {
      let filteredRows = results.DataRows;
      const originalRowCount = filteredRows.length;

      // Apply all filters in a single pass for better performance (O(n) instead of O(3n))
      const hasFilters = args?.filterResponsibleFullName ||
                        args?.filterStatusName || args?.filterText;

      if (hasFilters) {
        // Prepare filter terms once
        const responsibleNameTerm = args?.filterResponsibleFullName?.toLowerCase();
        const statusNameTerm = args?.filterStatusName?.toLowerCase();
        const textSearchTerm = args?.filterText?.toLowerCase();

        filteredRows = filteredRows.filter((row: any) => {
          // Filter by ResponsibleFullName
          if (responsibleNameTerm && !row.ResponsibleFullName?.toLowerCase().includes(responsibleNameTerm)) {
            return false;
          }

          // Filter by StatusName
          if (statusNameTerm && !row.StatusName?.toLowerCase().includes(statusNameTerm)) {
            return false;
          }

          // Text search across all columns
          if (textSearchTerm) {
            const matchFound = Object.values(row).some((val: any) =>
              val?.toString().toLowerCase().includes(textSearchTerm)
            );
            if (!matchFound) {
              return false;
            }
          }

          return true;
        });
      }

      // Calculate pagination parameters
      let offset = 0;
      let limit: number | undefined;
      let page: number | undefined;
      let pageSize = 50;

      // Support both page/pageSize and offset/limit
      if (args?.page !== undefined) {
        page = Math.max(1, args.page); // Ensure page is at least 1
        pageSize = args?.pageSize || 50;
        offset = (page - 1) * pageSize;
        limit = pageSize;
      } else {
        offset = args?.offset || 0;
        limit = args?.limit;
        if (limit !== undefined) {
          pageSize = limit;
          page = Math.floor(offset / pageSize) + 1;
        }
      }

      const totalRowsAfterFilter = filteredRows.length;

      // Apply pagination
      let paginatedRows = filteredRows;
      if (limit !== undefined) {
        paginatedRows = filteredRows.slice(offset, offset + limit);
      } else if (offset > 0) {
        paginatedRows = filteredRows.slice(offset);
      }

      // Add pagination metadata
      if (page !== undefined || limit !== undefined) {
        const currentPage = page || Math.floor(offset / (limit || pageSize)) + 1;
        const totalPages = Math.ceil(totalRowsAfterFilter / pageSize);

        results.Pagination = {
          currentPage,
          pageSize,
          totalRows: totalRowsAfterFilter,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
          returnedRows: paginatedRows.length
        };
      }

      results.DataRows = paginatedRows;

      // Log filtering information
      if (args?.filterResponsibleFullName || args?.filterStatusName || args?.filterText) {
        if (totalRowsAfterFilter < originalRowCount) {
          console.error(`[Handlers] Filtered ${originalRowCount} rows down to ${totalRowsAfterFilter}`);
        }
      }
    }

    // Apply token limit truncation
    const { data, truncated, message } = truncateToTokenLimit(results);

    let responseText = JSON.stringify(data, null, 2);
    if (truncated && message) {
      responseText = `${message}\n\n${responseText}`;
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  }

  async handleGetUser(args: GetUserArgs) {
    const client = this.getClient(args?.environment);
    if (!args?.uid && !args?.username) {
      throw new Error('Either uid or username is required');
    }

    const user = await client.getUser(args?.uid, args?.username);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(user, null, 2),
        },
      ],
    };
  }

  async handleGetCurrentUser(args: GetCurrentUserArgs) {
    const client = this.getClient(args?.environment);
    const user = await client.getCurrentUser();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(user, null, 2),
        },
      ],
    };
  }

  async handleSearchUsers(args: SearchUsersArgs) {
    const client = this.getClient(args?.environment);
    const searchText = args?.searchText || '';
    const maxResults = args?.maxResults || 50;

    const users = await client.searchUsers(searchText, maxResults);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(users, null, 2),
        },
      ],
    };
  }

  async handleGetUserUid(args: GetUserUidArgs) {
    const client = this.getClient(args?.environment);
    if (!args?.username) {
      throw new Error('username is required');
    }

    const uid = await client.getUserUid(args.username);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ username: args.username, uid }, null, 2),
        },
      ],
    };
  }

  async handleSearchGroups(args: SearchGroupsArgs) {
    const client = this.getClient(args?.environment);
    const searchText = args?.searchText || '';
    const maxResults = args?.maxResults || 50;

    const groups = await client.searchGroups(searchText, maxResults);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(groups, null, 2),
        },
      ],
    };
  }

  async handleGetGroup(args: GetGroupArgs) {
    const client = this.getClient(args?.environment);
    if (!args?.groupId) {
      throw new Error('groupId is required');
    }

    const group = await client.getGroup(args.groupId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(group, null, 2),
        },
      ],
    };
  }

  async handleListGroups(args: ListGroupsArgs) {
    const client = this.getClient(args?.environment);
    const maxResults = args?.maxResults || 100;

    const groups = await client.listGroups(maxResults);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(groups, null, 2),
        },
      ],
    };
  }

  async handleSearchTickets(args: any) {
    const client = this.getClient(args?.environment);

    // Build search params
    const searchParams: any = {};
    if (args?.searchText) searchParams.SearchText = args.searchText;
    if (args?.statusIDs) searchParams.StatusIDs = args.statusIDs;
    if (args?.priorityIDs) searchParams.PriorityIDs = args.priorityIDs;
    if (args?.typeIDs) searchParams.TypeIDs = args.typeIDs;
    if (args?.accountIDs) searchParams.AccountIDs = args.accountIDs;
    if (args?.primaryResponsibilityUids) searchParams.PrimaryResponsibilityUids = args.primaryResponsibilityUids;
    if (args?.responsibilityUids) searchParams.ResponsibilityUids = args.responsibilityUids;
    if (args?.requestorUids) searchParams.RequestorUids = args.requestorUids;
    if (args?.parentTicketID) searchParams.ParentTicketID = args.parentTicketID;
    if (args?.createdDateFrom) searchParams.CreatedDateFrom = args.createdDateFrom;
    if (args?.createdDateTo) searchParams.CreatedDateTo = args.createdDateTo;
    if (args?.modifiedDateFrom) searchParams.ModifiedDateFrom = args.modifiedDateFrom;
    if (args?.modifiedDateTo) searchParams.ModifiedDateTo = args.modifiedDateTo;
    if (args?.completedTaskResponsibilityFilter !== undefined) {
      searchParams.CompletedTaskResponsibilityFilter = args.completedTaskResponsibilityFilter;
    }
    if (args?.maxResults) searchParams.MaxResults = args.maxResults;

    const tickets = await client.searchTickets(searchParams, args?.appId);

    // Filter to lightweight response
    const lightweightTickets = tickets.map((ticket: any) => ({
      ID: ticket.ID,
      Title: ticket.Title,
      StatusName: ticket.StatusName,
      ResponsibleFullName: ticket.ResponsibleFullName,
      ModifiedDate: ticket.ModifiedDate,
      PriorityName: ticket.PriorityName,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(lightweightTickets, null, 2),
        },
      ],
    };
  }

  async handleListTicketTasks(args: any) {
    const client = this.getClient(args?.environment);
    if (!args?.ticketId) {
      throw new Error('ticketId is required');
    }

    const tasks = await client.getTicketTasks(args.ticketId, args?.appId);

    // Filter to lightweight response
    const lightweightTasks = tasks.map((task: any) => ({
      ID: task.ID,
      Title: task.Title,
      StatusName: task.StatusName,
      ResponsibleFullName: task.ResponsibleFullName,
      StartDate: task.StartDate,
      EndDate: task.EndDate,
      PercentComplete: task.PercentComplete,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(lightweightTasks, null, 2),
        },
      ],
    };
  }

  async handleGetTicketTask(args: any) {
    const client = this.getClient(args?.environment);
    if (!args?.ticketId) {
      throw new Error('ticketId is required');
    }
    if (!args?.taskId) {
      throw new Error('taskId is required');
    }

    const task = await client.getTicketTask(args.ticketId, args.taskId, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  }

  async handleUpdateTicketTask(args: any) {
    const client = this.getClient(args?.environment);
    if (!args?.ticketId) {
      throw new Error('ticketId is required');
    }
    if (!args?.taskId) {
      throw new Error('taskId is required');
    }
    if (!args?.comments) {
      throw new Error('comments is required');
    }

    const update = {
      Comments: args.comments,
      IsPrivate: args.isPrivate || false,
      Notify: args.notify || [],
    };

    const result = await client.updateTicketTask(args.ticketId, args.taskId, update, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: `✅ Task #${args.taskId} updated successfully`,
        },
      ],
    };
  }
}