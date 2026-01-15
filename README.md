# Email to Linear Ticket Converter

A tool that receives emails and converts them into refined Linear tickets using AI-powered content refinement.

## Features

- 📧 **Email Parsing**: Parses raw email messages (RFC 822 format)
- 🤖 **AI Refinement**: Uses OpenAI to refine and structure email content into well-formatted Linear tickets
- 🎫 **Linear Integration**: Creates tickets in Linear using the Linear MCP server
- 📎 **Attachment Support**: Handles email attachments
- 🔄 **Thread Support**: Can process email conversations and threads
- ⚙️ **Configurable**: Customizable team, project, labels, and priority settings

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key (for content refinement)
- Linear API key (configured via MCP)

### Installation

1. Clone or navigate to this directory
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Configure your `.env` file:

```env
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
DEFAULT_LINEAR_TEAM=Weapply
DEFAULT_LINEAR_PROJECT=
ENABLE_AI_REFINEMENT=true
```

### Linear MCP Configuration

The Linear MCP server should be configured in your Cursor/IDE settings with:
- **API Name**: WeapplyPM
- **API Key**: Your Linear API key (set via environment variable `LINEAR_API_KEY`)

## Usage

### 1. Start the Webhook Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

### 2. Send Emails to the Webhook

#### Option A: Direct Webhook Endpoint

Send a POST request to `/webhook/email` with the raw email:

```bash
curl -X POST http://localhost:3000/webhook/email \
  -H "Content-Type: message/rfc822" \
  --data-binary @email.eml
```

#### Option B: JSON Payload

```bash
curl -X POST http://localhost:3000/webhook/email \
  -H "Content-Type: application/json" \
  -d '{
    "raw": "From: sender@example.com\nSubject: Test\n\nEmail body...",
    "team": "Weapply",
    "project": "MyProject"
  }'
```

### 3. Create Linear Tickets

The webhook endpoint returns processed ticket data. To actually create the ticket in Linear, use the MCP function:

```typescript
// Using MCP linear_create_issue function
mcp_linear_create_issue({
  title: ticketData.title,
  description: ticketData.description,
  team: ticketData.team,
  project: ticketData.project,
  assignee: ticketData.assignee,
  labels: ticketData.labels,
  priority: ticketData.priority
})
```

### 4. CLI Tool

You can also process emails directly from the command line:

```bash
npm run build
node dist/createTicket.js email.eml --team=Weapply --project=MyProject
```

## API Endpoints

### `POST /webhook/email`

Receives and processes an email, returning refined ticket data.

**Request:**
- Content-Type: `message/rfc822` (raw email) or `application/json`
- Body: Raw email content or JSON with `raw` or `email` field

**Response:**
```json
{
  "success": true,
  "email": {
    "from": "sender@example.com",
    "subject": "Email Subject"
  },
  "ticket": {
    "title": "Refined Title",
    "description": "Formatted description...",
    "team": "Weapply",
    "project": "MyProject",
    "assignee": "user@example.com",
    "labels": ["label1", "label2"],
    "priority": 3
  },
  "refined": {
    "summary": "Brief summary...",
    "actionItems": ["Action 1", "Action 2"]
  }
}
```

### `POST /create-ticket`

Creates a Linear ticket from prepared ticket data (requires MCP integration).

**Request:**
```json
{
  "ticketData": {
    "title": "Ticket Title",
    "description": "Description",
    "team": "Weapply",
    "project": "MyProject"
  },
  "autoCreate": false
}
```

### `GET /health`

Health check endpoint.

## Email Service Integration

### Resend

Configure Resend to forward emails to your webhook:

1. Set up an inbound email address in Resend
2. Configure webhook forwarding to: `https://your-domain.com/webhook/email`
3. Emails will be automatically processed

### SendGrid

1. Set up Inbound Parse in SendGrid
2. Configure POST URL to: `https://your-domain.com/webhook/email`
3. Emails will be forwarded automatically

### Postmark

1. Set up Inbound webhook in Postmark
2. Configure webhook URL: `https://your-domain.com/webhook/email`
3. Emails will be processed automatically

### Custom IMAP/POP3

You can create a separate service that polls an email inbox and sends emails to the webhook endpoint.

## Content Refinement

The AI refinement process:

1. **Extracts key information** from the email
2. **Creates a concise title** (max 100 characters)
3. **Formats the description** with proper structure
4. **Generates a summary** (2-3 sentences)
5. **Suggests labels** based on content
6. **Determines priority** (0-4 scale)
7. **Extracts action items** from the email
8. **Suggests assignee** if context allows

## Configuration

Environment variables:

- `PORT`: Server port (default: 3000)
- `OPENAI_API_KEY`: OpenAI API key for content refinement
- `DEFAULT_LINEAR_TEAM`: Default Linear team name or ID
- `DEFAULT_LINEAR_PROJECT`: Default Linear project name or ID (optional)
- `ENABLE_AI_REFINEMENT`: Enable/disable AI refinement (default: true)
- `MAX_EMAIL_LENGTH`: Maximum email length for processing (default: 5000)
- `WEBHOOK_SECRET`: Optional secret for webhook authentication

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Type check
npm run type-check
```

## Project Structure

```
src/
  ├── index.ts              # Main Express server
  ├── emailParser.ts        # Email parsing logic
  ├── contentRefiner.ts     # AI content refinement
  ├── linearService.ts      # Linear ticket preparation
  ├── linearMCPHandler.ts   # MCP integration handler
  ├── emailHandler.ts       # Main email processing handler
  ├── createTicket.ts       # CLI tool
  ├── types.ts              # TypeScript types
  └── config.ts             # Configuration
```

## Troubleshooting

### Linear MCP Not Working

- Verify MCP configuration in Cursor/IDE settings
- Check that API key is correct
- Ensure API name matches "WeapplyPM"

### OpenAI Refinement Failing

- Verify `OPENAI_API_KEY` is set correctly
- Check API quota/limits
- System will fall back to basic refinement if AI fails

### Email Parsing Issues

- Ensure email is in RFC 822 format
- Check Content-Type header is set correctly
- Verify email content is not corrupted

## License

MIT
