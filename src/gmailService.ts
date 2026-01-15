import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { processEmail } from './emailHandler.js';
import { createLinearTicketViaAPI } from './linearApiClient.js';
import { config } from './config.js';

let gmail: any = null;
let oauth2Client: OAuth2Client | null = null;

/**
 * Initialize Gmail API with OAuth2 credentials
 */
export function initGmailAPI(credentials: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}) {
  oauth2Client = new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret,
    'https://developers.google.com/oauthplayground' // Must match OAuth Playground redirect URI
  );

  oauth2Client.setCredentials({
    refresh_token: credentials.refreshToken,
  });

  gmail = google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Fetch unread emails from pm@weapply.se inbox
 */
export async function fetchUnreadEmails(maxResults: number = 10): Promise<any[]> {
  if (!gmail) {
    throw new Error('Gmail API not initialized. Call initGmailAPI first.');
  }

  try {
    // Search for unread emails
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults,
    });

    const messages = response.data.messages || [];
    return messages;
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
}

/**
 * Get full email content by message ID
 */
export async function getEmailContent(messageId: string): Promise<string> {
  if (!gmail) {
    throw new Error('Gmail API not initialized.');
  }

  try {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'raw',
    });

    // Decode base64 email content
    const rawEmail = Buffer.from(response.data.raw, 'base64').toString('utf-8');
    return rawEmail;
  } catch (error) {
    console.error(`Error fetching email ${messageId}:`, error);
    throw error;
  }
}

/**
 * Mark email as read
 */
export async function markAsRead(messageId: string): Promise<void> {
  if (!gmail) {
    throw new Error('Gmail API not initialized.');
  }

  try {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
  } catch (error) {
    console.error(`Error marking email ${messageId} as read:`, error);
  }
}

/**
 * Process emails from Gmail and create Linear tickets
 */
export async function processGmailEmails(options?: {
  team?: string;
  project?: string;
  maxEmails?: number;
}): Promise<{
  processed: number;
  created: number;
  errors: number;
}> {
  if (!gmail) {
    throw new Error('Gmail API not initialized. Call initGmailAPI first.');
  }

  let processed = 0;
  let created = 0;
  let errors = 0;

  try {
    // Fetch unread emails
    const messages = await fetchUnreadEmails(options?.maxEmails || 10);
    console.log(`Found ${messages.length} unread emails`);

    for (const message of messages) {
      try {
        // Get email content
        const rawEmail = await getEmailContent(message.id);
        
        // Process email (parse + refine)
        const result = await processEmail(rawEmail, {
          team: options?.team,
          project: options?.project,
        });

        console.log(`Processing email from ${result.emailData.from.email}: ${result.ticketData.title}`);

        // Create Linear ticket
        if (config.autoCreateTickets) {
          const ticketResult = await createLinearTicketViaAPI(result.ticketData);
          
          if (ticketResult.success) {
            console.log(`✓ Ticket created: ${ticketResult.issueUrl}`);
            created++;
            
            // Mark email as read after successful processing
            await markAsRead(message.id);
          } else {
            console.error(`✗ Failed to create ticket: ${ticketResult.error}`);
            errors++;
          }
        }

        processed++;
      } catch (error) {
        console.error(`Error processing email ${message.id}:`, error);
        errors++;
      }
    }

    return { processed, created, errors };
  } catch (error) {
    console.error('Error processing Gmail emails:', error);
    throw error;
  }
}
