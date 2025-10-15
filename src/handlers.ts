import { TDXClient } from './client.js';

export class ToolHandlers {
  constructor(private tdxClient: TDXClient) {}

  async handleSearchTickets(args: any) {
    const searchParams: any = {};

    if (args?.searchText) searchParams.SearchText = args.searchText;
    if (args?.maxResults) searchParams.MaxResults = args.maxResults;
    if (args?.statusIds) searchParams.StatusIDs = args.statusIds;
    if (args?.priorityIds) searchParams.PriorityIDs = args.priorityIds;

    const results = await this.tdxClient.searchTickets(searchParams, args?.appId);
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
    if (!args?.ticketId) {
      throw new Error('ticketId is required');
    }

    const ticket = await this.tdxClient.getTicket(args.ticketId as number, args?.appId);
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
    if (!args?.ticketId || !args?.ticketData) {
      throw new Error('ticketId and ticketData are required');
    }

    const result = await this.tdxClient.editTicket(args.ticketId as number, args.ticketData, args?.appId);
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

    const result = await this.tdxClient.updateTicket(args.ticketId as number, updateData, args?.appId);
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
    if (!args?.ticketId || !args?.comments) {
      throw new Error('ticketId and comments are required');
    }

    const feedEntry: any = {
      Comments: args.comments,
      IsPrivate: args.isPrivate || false,
    };

    if (args.notify) feedEntry.Notify = args.notify;

    const result = await this.tdxClient.addTicketFeedEntry(args.ticketId as number, feedEntry, args?.appId);
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
    if (!args?.ticketId || !args?.tags) {
      throw new Error('ticketId and tags are required');
    }

    const result = await this.tdxClient.addTicketTags(args.ticketId as number, args.tags, args?.appId);
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
    if (!args?.ticketId || !args?.tags) {
      throw new Error('ticketId and tags are required');
    }

    const result = await this.tdxClient.deleteTicketTags(args.ticketId as number, args.tags, args?.appId);
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
    const maxResults = args?.maxResults || 100;
    const reports = await this.tdxClient.listReports(maxResults, args?.appId);
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
    if (!args?.searchText) {
      throw new Error('searchText is required');
    }

    const maxResults = args.maxResults || 50;
    const reports = await this.tdxClient.searchReports(args.searchText, maxResults, args?.appId);
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
    if (!args?.reportId) {
      throw new Error('reportId is required');
    }

    const results = await this.tdxClient.runReport(
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
}