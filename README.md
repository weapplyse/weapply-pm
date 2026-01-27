# Weapply PM

AI-powered email → Linear ticket refinement system using GPT-4o.

## How It Works

```
Email → pm@weapply.se → Linear Intake → Webhook → AI Refinement → Structured Ticket
```

1. Email arrives at `pm@weapply.se`
2. Linear creates a ticket (via email forwarding)
3. Our webhook receives the event
4. GPT-4o refines the content:
   - Clean, actionable title
   - Summary + action items
   - Labels, priority, routing
5. Ticket moves to Backlog with proper structure

## Features

| Feature | Description |
|---------|-------------|
| **AI Refinement** | GPT-4o cleans up messy emails into actionable tickets |
| **Language Detection** | Swedish emails → Swedish output, English → English |
| **Smart Routing** | Auto-routes to Mail Inbox, Clients, or External projects |
| **Client Labels** | Auto-creates `Client: domain.com` labels for external senders |
| **Urgency Detection** | Keyword analysis for priority (urgent, ASAP, critical) |
| **Slack Alerts** | Notifies channel when urgent tickets are created |
| **Thread Tracking** | Links related tickets from same sender/thread |
| **Image Analysis** | GPT-4 Vision analyzes screenshots/mockups |
| **Manual Refinement** | Move any ticket to "Refine Queue" for AI processing |

## Project Structure

```
src/
├── index.ts                # Express server (port 3002)
├── linearWebhookHandler.ts # Main webhook logic
├── contentRefiner.ts       # GPT-4o prompt & refinement
├── emailRouting.ts         # Sender detection & routing
├── urgencyDetector.ts      # Priority keyword analysis
├── threadTracker.ts        # Duplicate/thread detection
├── imageAnalyzer.ts        # GPT-4 Vision for images
├── attachmentHandler.ts    # File attachment processing
├── slackNotifier.ts        # Urgent ticket notifications
├── linearApiClient.ts      # Linear GraphQL API
├── emailParser.ts          # Email content extraction
├── config.ts               # Environment config
└── types.ts                # TypeScript types

tests/
├── urgencyDetector.test.ts # 13 tests
└── emailRouting.test.ts    # 25 tests
```

## Setup

### 1. Environment

```bash
cp env.template .env
```

Required variables:
```bash
PORT=3002
OPENAI_API_KEY=sk-...           # GPT-4o for refinement
LINEAR_API_KEY=lin_api_...      # Linear API access
LINEAR_WEBHOOK_SECRET=...       # Webhook signature verification
SLACK_WEBHOOK_URL=...           # Urgent ticket alerts (optional)
DEFAULT_LINEAR_TEAM=WeApply - AI Tickets
ENABLE_AI_REFINEMENT=true
```

### 2. Linear Configuration

**Email Forwarding:**
- Forward `pm@weapply.se` → Linear team intake email

**Webhook:**
- URL: `https://pm.weapply.se/webhook/linear-webhook`
- Events: Issue created, Issue updated
- Team: WeApply - AI Tickets

### 3. Run

```bash
npm install
npm run build
npm start
```

## Commands

```bash
# Development
npm run dev          # Hot reload
npm run build        # Compile TypeScript
npm run test         # Run tests
npm run test:watch   # Watch mode

# Production (systemd)
sudo systemctl status weapply-pm     # Check status
sudo journalctl -u weapply-pm -f     # View logs
sudo systemctl restart weapply-pm    # Restart
```

## Email Routing

| Sender Type | Route | Labels |
|-------------|-------|--------|
| @weapply.se direct | Mail Inbox | Email |
| @weapply.se forwarded | Clients | Internal Forward, Client:x |
| Business domain | Clients | External Direct, Client:x |
| Personal email (gmail, etc) | External | Unknown Sender |

## Priority Detection

| Priority | Triggers |
|----------|----------|
| **Urgent (1)** | urgent, ASAP, critical, production down, security |
| **High (2)** | customer impact, deadline, important client |
| **Normal (3)** | Standard requests (default) |
| **Low (4)** | no rush, nice to have, future consideration |

## Label Categories

| Category | Options |
|----------|---------|
| **Type** | Bug, Feature, Task, Support, Meeting, Hotfix |
| **Dept** | Development, Design, PM, Accounting, Sales |
| **Tech** | Frontend, Backend, AI/ML, Integration |
| **Source** | Email, Internal Forward, External Direct, Slack |
| **Client** | Auto-created: `Client: domain.com` |

## Manual Refinement

To refine any ticket with AI:
1. Create/find a ticket in Linear
2. Move it to **Refine Queue** project
3. System automatically refines and routes it

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/webhook/linear-webhook` | POST | Linear webhook |

## Linear Projects

| Project | Purpose |
|---------|---------|
| Mail Inbox | Refined email tickets |
| Clients | Known client tickets |
| External | Unknown external senders |
| Slack Intake | Tickets from Slack |
| Refine Queue | Manual AI refinement trigger |
| Linear Automation | System feature tracking |

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Server**: Express.js
- **AI**: OpenAI GPT-4o
- **API**: Linear GraphQL
- **Testing**: Vitest
- **Deployment**: systemd on Ubuntu

## License

MIT
