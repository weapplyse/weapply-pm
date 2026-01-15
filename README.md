# Weapply PM - Email to Linear

AI-powered email refinement for Linear tickets.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Email arrives at pm@weapply.se                             │
└─────────────────────┬───────────────────────────────────────┘
                      │ (forwarded to Linear intake)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Linear creates ticket from email                           │
└─────────────────────┬───────────────────────────────────────┘
                      │ (webhook)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  https://pm.weapply.se/webhook/linear                       │
│                                                             │
│  • Receives webhook from Linear                             │
│  • Refines content with OpenAI                              │
│  • Updates ticket with:                                     │
│    - Clean title                                            │
│    - Structured description                                 │
│    - Action items                                           │
│    - Priority suggestion                                    │
│    - Labels                                                 │
└─────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Environment Variables

```bash
cp env.template .env
# Edit .env with your values
```

Required:
- `OPENAI_API_KEY` - For AI refinement
- `LINEAR_API_KEY` - For updating tickets
- `LINEAR_WEBHOOK_SECRET` - For webhook security

### 2. Linear Configuration

1. **Email Forwarding**:
   - Forward `pm@weapply.se` → Linear intake email

2. **Webhook**:
   - URL: `https://pm.weapply.se/webhook/linear`
   - Events: Issue created
   - Team: WeTest

### 3. Run

```bash
npm install
npm run build
npm start
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/webhook/linear` | POST | Linear webhook endpoint |

## Development

```bash
npm run dev     # Run with hot reload
npm run build   # Compile TypeScript
npm start       # Run production build
```

## Server Deployment

Running on `ubuntu@app04` as a systemd service:

```bash
# Check status
sudo systemctl status weapply-pm

# View logs
sudo journalctl -u weapply-pm -f

# Restart
sudo systemctl restart weapply-pm
```

## Project Structure

```
src/
├── index.ts              # Express server
├── config.ts             # Configuration
├── linearWebhookHandler.ts   # Webhook handler
├── linearApiClient.ts    # Linear API client
├── emailHandler.ts       # Email processing
├── emailParser.ts        # Email parsing
├── contentRefiner.ts     # AI refinement (OpenAI)
└── types.ts              # TypeScript types
```

## License

MIT
