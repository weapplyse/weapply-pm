/**
 * Example integration showing how to use the email handler
 * and create Linear tickets via MCP
 * 
 * This file demonstrates the complete flow from email to Linear ticket
 */

import { processEmail } from './emailHandler.js';
import { readFileSync } from 'fs';

/**
 * Example: Process an email and prepare for Linear ticket creation
 */
export async function processEmailToLinear(
  emailPath: string,
  options?: { team?: string; project?: string }
) {
  // Read email file
  const rawEmail = readFileSync(emailPath);

  // Process email (parse + refine)
  const result = await processEmail(rawEmail, options);

  // Return ticket data ready for MCP
  return {
    ticketData: result.ticketData,
    emailInfo: {
      from: result.emailData.from.email,
      subject: result.emailData.subject,
    },
    refined: result.refinedContent,
  };
}

/**
 * Example: Complete flow with automatic ticket creation
 * Note: This requires MCP to be available in the calling context
 */
export async function processAndCreateTicket(
  emailPath: string,
  options?: { team?: string; project?: string; autoCreate?: boolean }
) {
  const result = await processEmailToLinear(emailPath, options);

  if (options?.autoCreate) {
    // In a real implementation, you would call the MCP function here:
    // const issue = await mcp_linear_create_issue({
    //   title: result.ticketData.title,
    //   description: result.ticketData.description,
    //   team: result.ticketData.team,
    //   project: result.ticketData.project,
    //   assignee: result.ticketData.assignee,
    //   labels: result.ticketData.labels,
    //   priority: result.ticketData.priority,
    // });
    // return { ...result, issueId: issue.id };

    console.log('Auto-create enabled. Use MCP mcp_linear_create_issue function.');
    console.log('Ticket data:', JSON.stringify(result.ticketData, null, 2));
  }

  return result;
}
