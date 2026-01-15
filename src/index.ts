import express, { Request, Response } from 'express';
import { processEmail } from './emailHandler.js';
import { createLinearTicketViaAPI } from './linearApiClient.js';
import { config } from './config.js';
import gmailRouter from './gmailApiEndpoint.js';

const app = express();

// Middleware
app.use(express.raw({ type: 'message/rfc822', limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: 'text/plain', limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Gmail API endpoint
app.use('/gmail', gmailRouter);

// Main webhook endpoint for receiving emails
app.post('/webhook/email', async (req: Request, res: Response) => {
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
    res.json({
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
        message: 'Auto-create disabled. Use MCP mcp_linear_create_issue or Linear API to create the ticket.',
      },
    });
  } catch (error) {
    console.error('Error processing email:', error);
    res.status(500).json({
      error: 'Failed to process email',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Endpoint to create Linear ticket (uses MCP)
app.post('/create-ticket', async (req: Request, res: Response) => {
  try {
    const { ticketData, autoCreate } = req.body;
    
    if (!ticketData) {
      return res.status(400).json({ error: 'ticketData is required' });
    }

    // If autoCreate is true, we'll attempt to create via MCP
    // Otherwise, return the prepared data for manual MCP call
    if (autoCreate) {
      // Note: In a real implementation, you would call the MCP function here
      // For now, we return instructions
      res.json({
        success: true,
        message: 'Auto-create enabled. Use MCP mcp_linear_create_issue function with the ticketData below.',
        ticketData,
        mcpParams: {
          title: ticketData.title,
          description: ticketData.description,
          team: ticketData.team,
          project: ticketData.project,
          assignee: ticketData.assignee,
          labels: ticketData.labels,
          priority: ticketData.priority,
        },
      });
    } else {
      res.json({
        success: true,
        message: 'Ticket data prepared. Use MCP mcp_linear_create_issue function to create the ticket.',
        ticketData,
      });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Failed to create ticket',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Email to Linear service running on port ${PORT}`);
  console.log(`📧 Webhook endpoint: http://localhost:${PORT}/webhook/email`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
