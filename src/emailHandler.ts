import { parseEmail, extractTextContent } from './emailParser.js';
import { refineEmailContent } from './contentRefiner.js';
import { prepareLinearTicketData } from './linearService.js';
import { EmailData, RefinedContent, LinearTicketData } from './types.js';

export interface ProcessEmailResult {
  emailData: EmailData;
  refinedContent: RefinedContent;
  ticketData: LinearTicketData;
}

/**
 * Main handler function that processes an email and prepares it for Linear
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
  const ticketData = prepareLinearTicketData({
    refinedContent,
    emailData: {
      from: emailData.from.email,
      subject: emailData.subject,
      attachments: emailData.attachments?.map(a => ({
        filename: a.filename,
        size: a.size,
      })),
    },
    team: options?.team,
    project: options?.project,
  });

  return {
    emailData,
    refinedContent,
    ticketData,
  };
}
