import { TDXClient } from './client.js';

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

  async handleSearchTickets(args: any) {
    const client = this.getClient(args?.environment);
    const searchParams: any = {};

    if (args?.searchText) searchParams.SearchText = args.searchText;
    if (args?.maxResults) searchParams.MaxResults = args.maxResults;
    if (args?.statusIds) searchParams.StatusIDs = args.statusIds;
    if (args?.priorityIds) searchParams.PriorityIDs = args.priorityIds;

    const results = await client.searchTickets(searchParams, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  async handleGetTicket(args: any) {
    const client = this.getClient(args?.environment);
    if (!args?.ticketId) {
      throw new Error('ticketId is required');
    }

    const ticket = await client.getTicket(args.ticketId as number, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(ticket, null, 2),
        },
      ],
    };
  }

  async handleEditTicket(args: any) {
    const client = this.getClient(args?.environment);
    if (!args?.ticketId || !args?.ticketData) {
      throw new Error('ticketId and ticketData are required');
    }

    const result = await client.editTicket(args.ticketId as number, args.ticketData, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async handleUpdateTicket(args: any) {
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
    if (args.responsibleUid) updateData.ResponsibleUid = args.responsibleUid;
    if (args.tags) updateData.Tags = args.tags;

    const result = await client.updateTicket(args.ticketId as number, updateData, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async handleAddTicketFeed(args: any) {
    const client = this.getClient(args?.environment);
    if (!args?.ticketId || !args?.comments) {
      throw new Error('ticketId and comments are required');
    }

    const feedEntry: any = {
      Comments: args.comments,
      IsPrivate: args.isPrivate || false,
    };

    if (args.notify) feedEntry.Notify = args.notify;

    const result = await client.addTicketFeedEntry(args.ticketId as number, feedEntry, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async handleAddTicketTags(args: any) {
    const client = this.getClient(args?.environment);
    if (!args?.ticketId || !args?.tags) {
      throw new Error('ticketId and tags are required');
    }

    const result = await client.addTicketTags(args.ticketId as number, args.tags, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: 'Tags added successfully. Note: Tags are stored but not returned in GET ticket responses due to API limitations. Verify tags in the TeamDynamix UI.',
        },
      ],
    };
  }

  async handleDeleteTicketTags(args: any) {
    const client = this.getClient(args?.environment);
    if (!args?.ticketId || !args?.tags) {
      throw new Error('ticketId and tags are required');
    }

    const result = await client.deleteTicketTags(args.ticketId as number, args.tags, args?.appId);
    return {
      content: [
        {
          type: 'text',
          text: 'Tags deleted successfully.',
        },
      ],
    };
  }

  async handleListReports(args: any) {
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

  async handleSearchReports(args: any) {
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

  async handleRunReport(args: any) {
    const client = this.getClient(args?.environment);
    if (!args?.reportId) {
      throw new Error('reportId is required');
    }

    const results = await client.runReport(
      args.reportId as number,
      args?.appId,
      args?.withData || false,
      args?.dataSortExpression || ''
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  async handleGetUser(args: any) {
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

  async handleGetCurrentUser(args: any) {
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

  async handleSearchUsers(args: any) {
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

  async handleGetUserUid(args: any) {
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

  async handleSearchGroups(args: any) {
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

  async handleGetGroup(args: any) {
    const client = this.getClient(args?.environment);
    if (!args?.groupId) {
      throw new Error('groupId is required');
    }

    const group = await client.getGroup(args.groupId as number);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(group, null, 2),
        },
      ],
    };
  }

  async handleListGroups(args: any) {
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
}