import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Common parameters for all tools
const environmentParam = {
  environment: {
    type: 'string' as const,
    description: 'Environment: prod/dev/canary',
    enum: ['prod', 'dev', 'canary'],
  },
};

const appIdParam = {
  appId: {
    type: 'string' as const,
    description: 'App ID override',
  },
};

const ticketIdParam = {
  ticketId: {
    type: 'number' as const,
    description: 'Ticket ID',
  },
};

const taskIdParam = {
  taskId: {
    type: 'number' as const,
    description: 'Task ID',
  },
};

export const tools: Tool[] = [
  {
    name: 'tdx_get_ticket',
    description: 'Get ticket by ID',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        ...ticketIdParam,
        ...appIdParam,
      },
      required: ['ticketId'],
    },
  },
  {
    name: 'tdx_edit_ticket',
    description: 'Edit ticket (full update - requires all fields)',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        ...ticketIdParam,
        ticketData: {
          type: 'object',
          description: 'Complete ticket data',
        },
        ...appIdParam,
      },
      required: ['ticketId', 'ticketData'],
    },
  },
  {
    name: 'tdx_update_ticket',
    description: 'Update ticket (partial update). To unassign a ticket, set responsibleUid to empty string ("").',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        ...ticketIdParam,
        statusId: {
          type: 'number',
          description: 'Status ID',
        },
        priorityId: {
          type: 'number',
          description: 'Priority ID',
        },
        title: {
          type: 'string',
          description: 'Title',
        },
        description: {
          type: 'string',
          description: 'Description',
        },
        comments: {
          type: 'string',
          description: 'Comments',
        },
        responsibleUid: {
          type: 'string',
          description: 'Responsible user UID',
        },
        ...appIdParam,
      },
      required: ['ticketId'],
    },
  },
  {
    name: 'tdx_add_ticket_feed',
    description: 'Add feed entry (comment/update) to ticket',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        ...ticketIdParam,
        comments: {
          type: 'string',
          description: 'Comment text',
        },
        isPrivate: {
          type: 'boolean',
          description: 'Private entry',
          default: false,
        },
        notify: {
          type: 'array',
          items: { type: 'string' },
          description: 'Email addresses to notify',
        },
        ...appIdParam,
      },
      required: ['ticketId', 'comments'],
    },
  },
  {
    name: 'tdx_get_ticket_feed',
    description: 'Get feed entries (comments/updates) for ticket',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        ...ticketIdParam,
        top: {
          type: 'number',
          description: 'Max entries (0 = all)',
          default: 10,
        },
        ...appIdParam,
      },
      required: ['ticketId'],
    },
  },
  {
    name: 'tdx_add_ticket_tags',
    description: 'Add tags to ticket',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        ...ticketIdParam,
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tag names',
        },
        ...appIdParam,
      },
      required: ['ticketId', 'tags'],
    },
  },
  {
    name: 'tdx_delete_ticket_tags',
    description: 'Delete tags from ticket',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        ...ticketIdParam,
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tag names',
        },
        ...appIdParam,
      },
      required: ['ticketId', 'tags'],
    },
  },
  {
    name: 'tdx_list_reports',
    description: 'List all available reports',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        maxResults: {
          type: 'number',
          description: 'Max results',
          default: 100,
        },
        ...appIdParam,
      },
    },
  },
  {
    name: 'tdx_search_reports',
    description: 'Search reports by name (use with tdx_run_report)',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        searchText: {
          type: 'string',
          description: 'Search text',
        },
        maxResults: {
          type: 'number',
          description: 'Max results',
          default: 50,
        },
        ...appIdParam,
      },
      required: ['searchText'],
    },
  },
  {
    name: 'tdx_run_report',
    description: 'Run report (preferred for multiple tickets). Supports filtering and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        reportId: {
          type: 'number',
          description: 'Report ID',
        },
        ...appIdParam,
        withData: {
          type: 'boolean',
          description: 'Include data',
          default: false,
        },
        dataSortExpression: {
          type: 'string',
          description: 'Sort by column (add " DESC" for descending)',
          default: '',
        },
        page: {
          type: 'number',
          description: 'Page number (1-based)',
        },
        pageSize: {
          type: 'number',
          description: 'Rows per page',
          default: 50,
        },
        limit: {
          type: 'number',
          description: 'Limit results to N rows',
        },
        offset: {
          type: 'number',
          description: 'Skip first N rows',
          default: 0,
        },
        filterResponsibleFullName: {
          type: 'string',
          description: 'Filter by responsible name',
        },
        filterStatusName: {
          type: 'string',
          description: 'Filter by status',
        },
        filterText: {
          type: 'string',
          description: 'Search all text columns',
        },
      },
      required: ['reportId'],
    },
  },
  {
    name: 'tdx_get_user',
    description: 'Get user by UID or username',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        uid: {
          type: 'string',
          description: 'User UID',
        },
        username: {
          type: 'string',
          description: 'Username',
        },
      },
    },
  },
  {
    name: 'tdx_get_current_user',
    description: 'Get currently authenticated user',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
      },
    },
  },
  {
    name: 'tdx_search_users',
    description: 'Search users',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        searchText: {
          type: 'string',
          description: 'Search text',
        },
        maxResults: {
          type: 'number',
          description: 'Max results',
          default: 50,
        },
      },
    },
  },
  {
    name: 'tdx_get_user_uid',
    description: 'Get user UID by username',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        username: {
          type: 'string',
          description: 'Username',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'tdx_search_groups',
    description: 'Search groups',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        searchText: {
          type: 'string',
          description: 'Search text',
        },
        maxResults: {
          type: 'number',
          description: 'Max results',
          default: 50,
        },
      },
    },
  },
  {
    name: 'tdx_get_group',
    description: 'Get group by ID',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        groupId: {
          type: 'number',
          description: 'Group ID',
        },
      },
      required: ['groupId'],
    },
  },
  {
    name: 'tdx_list_groups',
    description: 'List all groups',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        maxResults: {
          type: 'number',
          description: 'Max results',
          default: 100,
        },
      },
    },
  },
  {
    name: 'tdx_search_tickets',
    description: 'Search tickets with lightweight results. Supports filtering by status, priority, type, dates, responsible users, requestors, and parent ticket.',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        searchText: {
          type: 'string',
          description: 'Search text',
        },
        statusIDs: {
          type: 'array',
          items: { type: 'number' },
          description: 'Status IDs',
        },
        priorityIDs: {
          type: 'array',
          items: { type: 'number' },
          description: 'Priority IDs',
        },
        typeIDs: {
          type: 'array',
          items: { type: 'number' },
          description: 'Ticket type IDs',
        },
        accountIDs: {
          type: 'array',
          items: { type: 'number' },
          description: 'Account/department IDs',
        },
        responsibilityUids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Responsible user UIDs (includes task responsibility)',
        },
        primaryResponsibilityUids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Primary responsible user UIDs (excludes task responsibility)',
        },
        requestorUids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Requestor user UIDs',
        },
        parentTicketID: {
          type: 'number',
          description: 'Filter by parent ticket ID (find child tickets)',
        },
        completedTaskResponsibilityFilter: {
          type: 'boolean',
          description: 'false = active tasks, true = completed tasks',
        },
        createdDateFrom: {
          type: 'string',
          description: 'Created date from (ISO 8601 format)',
        },
        createdDateTo: {
          type: 'string',
          description: 'Created date to (ISO 8601 format)',
        },
        modifiedDateFrom: {
          type: 'string',
          description: 'Modified date from (ISO 8601 format)',
        },
        modifiedDateTo: {
          type: 'string',
          description: 'Modified date to (ISO 8601 format)',
        },
        maxResults: {
          type: 'number',
          description: 'Max results',
          default: 50,
        },
        ...appIdParam,
      },
    },
  },
  {
    name: 'tdx_list_ticket_tasks',
    description: 'Get all tasks on ticket. Returns lightweight task data.',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        ...ticketIdParam,
        ...appIdParam,
      },
      required: ['ticketId'],
    },
  },
  {
    name: 'tdx_get_ticket_task',
    description: 'Get specific task from ticket',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        ...ticketIdParam,
        ...taskIdParam,
        ...appIdParam,
      },
      required: ['ticketId', 'taskId'],
    },
  },
  {
    name: 'tdx_update_ticket_task',
    description: 'Update ticket task by adding comment',
    inputSchema: {
      type: 'object',
      properties: {
        ...environmentParam,
        ...ticketIdParam,
        ...taskIdParam,
        comments: {
          type: 'string',
          description: 'Comment text',
        },
        isPrivate: {
          type: 'boolean',
          description: 'Private comment',
          default: false,
        },
        notify: {
          type: 'array',
          items: { type: 'string' },
          description: 'Email addresses to notify',
        },
        ...appIdParam,
      },
      required: ['ticketId', 'taskId', 'comments'],
    },
  },
];