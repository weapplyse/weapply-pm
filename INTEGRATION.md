# Integration Guide

This guide shows how to integrate the email-to-Linear tool with various email services and use the Linear MCP to create tickets.

## Using Linear MCP to Create Tickets

After processing an email, you'll receive ticket data. To create the ticket in Linear, use the MCP `mcp_linear_create_issue` function:

```typescript
// Example: Create ticket from processed email data
const ticketData = {
  title: "Fix login bug",
  description: "Users cannot log in...",
  team: "Weapply",
  project: "MyProject",
  assignee: "user@example.com",
  labels: ["bug", "urgent"],
  priority: 2
};

// Call MCP function (this happens automatically in Cursor/IDE context)
const issue = await mcp_linear_create_issue({
  title: ticketData.title,
  description: ticketData.description,
  team: ticketData.team,
  project: ticketData.project,
  assignee: ticketData.assignee,
  labels: ticketData.labels,
  priority: ticketData.priority,
});

console.log(`Created ticket: ${issue.id}`);
```

## Complete Workflow Example

### 1. Receive Email via Webhook

```bash
# Email service forwards email to your webhook
POST https://your-domain.com/webhook/email
Content-Type: message/rfc822

[Raw email content]
```

### 2. Process Email (Automatic)

The webhook automatically:
- Parses the email
- Refines content with AI
- Prepares Linear ticket data

### 3. Create Linear Ticket

You can create the ticket in two ways:

#### Option A: Manual MCP Call

After receiving the webhook response, use the ticket data to create a Linear ticket:

```typescript
// Use the ticket data from webhook response
const ticketData = webhookResponse.ticket;

// Create ticket via MCP
await mcp_linear_create_issue({
  title: ticketData.title,
  description: ticketData.description,
  team: ticketData.team,
  // ... other fields
});
```

#### Option B: Auto-Create Endpoint

Modify the `/webhook/email` endpoint to automatically create tickets, or use a separate endpoint:

```typescript
// In your handler, after processing email:
const ticketData = result.ticketData;

// Create ticket automatically
const issue = await mcp_linear_create_issue({
  title: ticketData.title,
  description: ticketData.description,
  team: ticketData.team,
  project: ticketData.project,
  assignee: ticketData.assignee,
  labels: ticketData.labels,
  priority: ticketData.priority,
});
```

## Email Service Setup

### Resend Inbound Email

1. Go to Resend Dashboard → Inbound Domains
2. Add your domain
3. Configure webhook: `https://your-domain.com/webhook/email`
4. Emails sent to `*@yourdomain.com` will be forwarded to your webhook

### SendGrid Inbound Parse

1. Go to SendGrid → Settings → Inbound Parse
2. Add hostname and POST URL: `https://your-domain.com/webhook/email`
3. Configure parsing settings
4. Emails will be forwarded automatically

### Postmark Inbound

1. Go to Postmark → Servers → Inbound
2. Add webhook URL: `https://your-domain.com/webhook/email`
3. Configure inbound address
4. Emails will be processed automatically

### Gmail API (Advanced)

For Gmail, you can use the Gmail API to watch for new emails and forward them:

```typescript
// Example Gmail watch setup
import { google } from 'googleapis';

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Watch for new emails
const res = await gmail.users.watch({
  userId: 'me',
  requestBody: {
    topicName: 'projects/YOUR_PROJECT/topics/email-received',
    labelIds: ['INBOX'],
  },
});

// Process emails from Pub/Sub topic
```

## Testing Locally

### Test with Sample Email

1. Create a sample email file (`test-email.eml`):

```
From: sender@example.com
To: recipient@example.com
Subject: Test Email
Date: Mon, 1 Jan 2024 12:00:00 +0000

This is a test email that will be converted to a Linear ticket.
```

2. Process it:

```bash
npm run create-ticket test-email.eml --team=Weapply
```

3. Use the output to create a Linear ticket via MCP

### Test Webhook Endpoint

```bash
# Start server
npm run dev

# Send test email
curl -X POST http://localhost:3000/webhook/email \
  -H "Content-Type: message/rfc822" \
  --data-binary @test-email.eml
```

## Customization

### Custom Refinement Prompts

Modify `src/contentRefiner.ts` to customize the AI refinement prompt:

```typescript
const prompt = `Your custom prompt here...`;
```

### Custom Ticket Formatting

Modify `src/linearService.ts` to customize how ticket descriptions are formatted:

```typescript
export function prepareLinearTicketData(options: CreateTicketOptions): LinearTicketData {
  // Custom formatting logic
}
```

### Team/Project Mapping

Add logic to map email senders to specific teams or projects:

```typescript
function getTeamFromEmail(email: string): string {
  if (email.includes('@client.com')) {
    return 'Client';
  }
  return 'Weapply';
}
```

## Error Handling

The service includes error handling at each step:

- **Email Parsing Errors**: Returns 400 with error message
- **AI Refinement Errors**: Falls back to basic refinement
- **Linear Creation Errors**: Returns error details for debugging

Check logs for detailed error information.
