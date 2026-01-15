import { LinearTicketData } from './types.js';

/**
 * Creates a Linear ticket using the MCP Linear server
 * This function is designed to be called with the MCP linear_create_issue function
 */
export async function createLinearTicket(ticketData: LinearTicketData): Promise<{
  success: boolean;
  issueId?: string;
  error?: string;
  mcpParams?: any;
}> {
  // This function prepares the data for MCP call
  // The actual MCP call will be made by the caller using mcp_linear_create_issue
  
  const mcpParams: any = {
    title: ticketData.title,
    description: ticketData.description,
    team: ticketData.team,
  };

  if (ticketData.project) {
    mcpParams.project = ticketData.project;
  }

  if (ticketData.assignee) {
    mcpParams.assignee = ticketData.assignee;
  }

  if (ticketData.labels && ticketData.labels.length > 0) {
    mcpParams.labels = ticketData.labels;
  }

  if (ticketData.priority !== undefined) {
    mcpParams.priority = ticketData.priority;
  }

  return {
    success: true,
    mcpParams, // Return params for MCP call
  };
}
