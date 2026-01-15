import { parseEmail } from './emailParser.js';
import { refineEmailContent } from './contentRefiner.js';
import { EmailData, RefinedContent, LinearTicketData } from './types.js';
import { config } from './config.js';

export interface ProcessEmailResult {
  emailData: EmailData;
  refinedContent: RefinedContent;
  ticketData: LinearTicketData;
}

/**
 * Process email content and prepare for Linear ticket
 */
export async function processEmail(
  rawEmail: string | Buffer,
  options?: {
    team?: string;
    project?: string;
  }
): Promise<ProcessEmailResult> {
  // Parse email
  const emailData = await parseEmail(rawEmail);

  // Refine content with AI
  const refinedContent = await refineEmailContent(emailData);

  // Prepare Linear ticket data
  const ticketData = prepareTicketData(refinedContent, emailData, options);

  return {
    emailData,
    refinedContent,
    ticketData,
  };
}

/**
 * Prepare Linear ticket data from refined content
 */
function prepareTicketData(
  refinedContent: RefinedContent,
  emailData: EmailData,
  options?: { team?: string; project?: string }
): LinearTicketData {
  // Build description with structured format
  const descriptionParts: string[] = [];

  // Summary
  if (refinedContent.summary) {
    descriptionParts.push('## Summary');
    descriptionParts.push(refinedContent.summary);
    descriptionParts.push('');
  }

  // Action items
  const actionItems = refinedContent.actionItems || [];
  if (actionItems.length > 0) {
    descriptionParts.push('## Action Items');
    actionItems.forEach((item) => {
      descriptionParts.push(`- [ ] ${item}`);
    });
    descriptionParts.push('');
  }

  // Main description
  descriptionParts.push('## Details');
  descriptionParts.push(refinedContent.description);
  descriptionParts.push('');

  // Original email info
  descriptionParts.push('---');
  descriptionParts.push('');
  descriptionParts.push('**Original Email**');
  descriptionParts.push(`- From: ${emailData.from.name || emailData.from.email}`);
  descriptionParts.push(`- Subject: ${emailData.subject}`);
  if (emailData.date) {
    descriptionParts.push(`- Date: ${emailData.date.toISOString()}`);
  }

  return {
    title: refinedContent.title || emailData.subject,
    description: descriptionParts.join('\n'),
    team: options?.team || config.defaultLinearTeam,
    project: options?.project || config.defaultLinearProject || undefined,
    labels: refinedContent.suggestedLabels,
    priority: refinedContent.suggestedPriority,
  };
}
