import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processEmail } from '../src/emailHandler.js';
import { createLinearTicketViaAPI } from '../src/linearApiClient.js';
import { config } from '../src/config.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Received email webhook');
    
    // Get raw email data (could be from various email services)
    let rawEmail: Buffer | string;
    
    if (req.headers['content-type']?.includes('message/rfc822')) {
      // Raw email format
      rawEmail = req.body as Buffer;
    } else if (req.body.raw || req.body.email) {
      // JSON payload with email data
      rawEmail = req.body.raw || req.body.email;
    } else {
      // Try to parse as text/plain
      rawEmail = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    if (!rawEmail || (typeof rawEmail === 'string' && rawEmail.length === 0)) {
      return res.status(400).json({ error: 'No email data provided' });
    }

    // Process email (parse, refine, prepare ticket)
    const result = await processEmail(rawEmail, {
      team: req.body.team || req.query.team as string,
      project: req.body.project || req.query.project as string,
    });

    console.log(`Processed email from ${result.emailData.from.email}: ${result.ticketData.title}`);

    // Auto-create ticket if enabled
    let ticketCreationResult = null;
    if (config.autoCreateTickets) {
      console.log('Auto-creating Linear ticket...');
      ticketCreationResult = await createLinearTicketViaAPI(result.ticketData);
      
      if (ticketCreationResult.success) {
        console.log(`✓ Ticket created: ${ticketCreationResult.issueUrl}`);
      } else {
        console.error(`✗ Failed to create ticket: ${ticketCreationResult.error}`);
      }
    }

    // Return the prepared ticket data
    return res.json({
      success: true,
      email: {
        from: result.emailData.from.email,
        subject: result.emailData.subject,
      },
      ticket: result.ticketData,
      refined: {
        summary: result.refinedContent.summary,
        actionItems: result.refinedContent.actionItems,
      },
      linearTicket: ticketCreationResult || {
        message: 'Auto-create disabled. Use Linear API to create the ticket.',
      },
    });
  } catch (error) {
    console.error('Error processing email:', error);
    return res.status(500).json({
      error: 'Failed to process email',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
