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
 * Process already-parsed email data and prepare for Linear ticket
 */
export async function processEmailData(
  emailData: EmailData,
  options?: {
    team?: string;
    project?: string;
  }
): Promise<ProcessEmailResult> {
  const refinedContent = await refineEmailContent(emailData);
  const ticketData = prepareTicketData(refinedContent, emailData, options);

  return {
    emailData,
    refinedContent,
    ticketData,
  };
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

  return processEmailData(emailData, options);
}

/**
 * Prepare Linear ticket data from refined content
 */
function prepareTicketData(
  refinedContent: RefinedContent,
  emailData: EmailData,
  options?: { team?: string }
): LinearTicketData {
  return {
    title: refinedContent.title || emailData.subject,
    description: buildTicketDescription(refinedContent, emailData),
    team: options?.team || config.defaultLinearTeam,
    labels: refinedContent.suggestedLabels,
    priority: refinedContent.suggestedPriority,
  };
}

function buildTicketDescription(refinedContent: RefinedContent, emailData: EmailData): string {
  const rawBody = (refinedContent.description || '').trim();
  const hasSections = /##\s*Summary/i.test(rawBody) || /##\s*(Action Items|Actions)/i.test(rawBody);
  const summary = refinedContent.summary?.trim();
  const actionItems = (refinedContent.actionItems || []).filter(Boolean);

  const parts: string[] = [];

  if (summary) {
    parts.push('## Summary', summary, '');
  }

  if (actionItems.length > 0) {
    parts.push('## Actions');
    actionItems.forEach((item) => {
      parts.push(`- [ ] ${item}`);
    });
    parts.push('');
  }

  if (!hasSections && rawBody && rawBody !== summary) {
    parts.push('## Context', rawBody, '');
  }

  if (parts.length === 0) {
    return rawBody || emailData.subject || '(No details provided)';
  }

  return parts.join('\n').trim();
}
