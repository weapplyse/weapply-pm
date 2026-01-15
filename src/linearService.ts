import { RefinedContent, LinearTicketData } from './types.js';
import { config } from './config.js';

// Note: This service uses the Linear MCP server through function calls
// The actual MCP integration happens in the main handler

export interface CreateTicketOptions {
  refinedContent: RefinedContent;
  emailData: {
    from: string;
    subject: string;
    attachments?: Array<{ filename: string; size: number }>;
  };
  team?: string;
  project?: string;
}

export function prepareLinearTicketData(
  options: CreateTicketOptions
): LinearTicketData {
  const { refinedContent, emailData, team, project } = options;

  // Build description with metadata
  let description = refinedContent.description;
  
  // Add summary if available
  if (refinedContent.summary) {
    description = `## Summary\n${refinedContent.summary}\n\n---\n\n## Details\n${description}`;
  }

  // Add action items if available
  if (refinedContent.actionItems && refinedContent.actionItems.length > 0) {
    description += `\n\n## Action Items\n${refinedContent.actionItems.map(item => `- ${item}`).join('\n')}`;
  }

  // Add email metadata
  description += `\n\n---\n\n*Original email from: ${emailData.from}*`;
  
  if (emailData.attachments && emailData.attachments.length > 0) {
    description += `\n*Attachments: ${emailData.attachments.map(a => a.filename).join(', ')}*`;
  }

  return {
    title: refinedContent.title,
    description,
    team: team || config.defaultLinearTeam,
    project: project || config.defaultLinearProject || undefined,
    assignee: refinedContent.suggestedAssignee,
    labels: refinedContent.suggestedLabels,
    priority: refinedContent.suggestedPriority,
  };
}
