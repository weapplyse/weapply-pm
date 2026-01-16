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
  options?: { team?: string; project?: string }
): LinearTicketData {
  return {
    title: refinedContent.title || emailData.subject,
    description: buildTicketDescription(refinedContent, emailData),
    team: options?.team || config.defaultLinearTeam,
    project: options?.project || config.defaultLinearProject || undefined,
    labels: refinedContent.suggestedLabels,
    priority: refinedContent.suggestedPriority,
  };
}

function buildTicketDescription(refinedContent: RefinedContent, emailData: EmailData): string {
  const body = (refinedContent.description || '').trim();
  const hasSummary = /##\s*Summary/i.test(body);
  const hasActions = /##\s*(Action Items|Actions)/i.test(body);

  if (hasSummary || hasActions) {
    return body;
  }

  const descriptionParts: string[] = [];

  if (refinedContent.summary) {
    descriptionParts.push('## Summary');
    descriptionParts.push(refinedContent.summary);
    descriptionParts.push('');
  }

  const actionItems = refinedContent.actionItems || [];
  if (actionItems.length > 0) {
    descriptionParts.push('## Action Items');
    actionItems.forEach((item) => {
      descriptionParts.push(`- [ ] ${item}`);
    });
    descriptionParts.push('');
  }

  if (body) {
    descriptionParts.push('## Details');
    descriptionParts.push(body);
    descriptionParts.push('');
  }

  if (descriptionParts.length === 0) {
    return emailData.subject || '(No details provided)';
  }

  return descriptionParts.join('\n').trim();
}
