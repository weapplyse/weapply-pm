# Linear Webhook Setup Guide

## Flow Overview

1. **Email arrives** at `pm@weapply.se` (alias for `support@weapply.se`)
2. **Forwards to Linear** → `wetest-b4368e9debdd@intake.linear.app`
3. **Linear creates ticket** automatically
4. **Linear webhook triggers** our refinement service
5. **Service refines** the ticket with AI and updates it

## Setup Steps

### 1. Configure Email Forwarding

In Gmail/Google Workspace for `support@weapply.se`:
- Go to Settings → Forwarding and POP/IMAP
- Add forwarding address: `wetest-b4368e9debdd@intake.linear.app`
- Verify the forwarding address
- Enable forwarding

### 2. Create Linear Webhook

1. Go to Linear → Settings → Administration → API
2. Click "Create webhook"
3. Configure:
   - **URL**: `http://13.60.13.35:3003/webhook/linear-webhook` (or your public URL)
   - **Team**: WeTest
   - **Events**: Select "Issue created"
   - **Secret**: (optional, for security)
4. Click "Create"

### 3. Test the Flow

1. Send a test email to `pm@weapply.se`
2. Check Linear - ticket should be created immediately
3. Check server logs - webhook should trigger refinement
4. Check Linear again - ticket should be updated with refined content

## Webhook Endpoint

**URL**: `POST /webhook/linear-webhook`

**Payload**: Linear webhook format
```json
{
  "type": "Issue",
  "action": "create",
  "data": {
    "id": "issue-id",
    "identifier": "WEA-123",
    "title": "Email subject",
    "description": "Email content...",
    "team": {
      "id": "team-id"
    }
  }
}
```

## What Happens

1. Linear creates ticket from email
2. Webhook sends notification to our service
3. Service fetches issue details
4. Extracts email content from description
5. Refines with OpenAI AI
6. Updates Linear ticket with:
   - Refined title
   - Structured description
   - Action items
   - Priority suggestions
   - Labels

## Benefits

- ✅ **Instant notifications** - Linear creates ticket immediately
- ✅ **AI refinement** - Ticket gets enhanced automatically
- ✅ **No polling** - Real-time processing via webhooks
- ✅ **Reliable** - Linear handles email delivery

## Troubleshooting

### Webhook not triggering
- Check webhook URL is accessible
- Verify webhook is enabled in Linear
- Check server logs: `sudo journalctl -u weapply-pm.service -f`

### Refinement not working
- Check OpenAI API key is set
- Verify issue description contains email content
- Check logs for errors

### Issue not updating
- Verify Linear API key has write permissions
- Check if issue was created from email (has email content)
- Review update errors in logs
