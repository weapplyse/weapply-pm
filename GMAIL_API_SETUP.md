# Gmail API Setup Guide

## Overview

This setup allows the service to:
1. ✅ **Fetch emails** directly from `pm@weapply.se` Gmail inbox
2. ✅ **Refine emails** with OpenAI AI
3. ✅ **Create Linear tickets** automatically in WeTest team

## Setup Steps

### 1. Create Google Cloud Project & Enable Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable **Gmail API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Gmail API"
   - Click **Enable**

### 2. Create OAuth2 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure OAuth consent screen:
   - User Type: **Internal** (if using Google Workspace) or **External**
   - App name: "Weapply PM Email Processor"
   - Scopes: Add `https://www.googleapis.com/auth/gmail.readonly`
4. Create OAuth client:
   - Application type: **Desktop app** (or **Web application**)
   - Name: "Weapply PM"
   - Click **Create**
5. **Download the credentials JSON** (you'll need `client_id` and `client_secret`)

### 3. Get Refresh Token

You need to authorize the app and get a refresh token:

**Option A: Using Google OAuth Playground (Easiest)**

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) → Check "Use your own OAuth credentials"
3. Enter your `client_id` and `client_secret`
4. In the left panel, find **Gmail API v1**
5. Select `https://www.googleapis.com/auth/gmail.readonly`
6. Click **Authorize APIs**
7. Sign in with the `pm@weapply.se` account
8. Click **Exchange authorization code for tokens**
9. Copy the **Refresh token**

**Option B: Using a Script**

```bash
# Run this script to get refresh token
node scripts/get-refresh-token.js
```

### 4. Configure Environment Variables

Add to your `.env` file:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
```

### 5. Test the Integration

**Option A: Manual API Call**

```bash
curl -X POST http://localhost:3002/gmail/process \
  -H "Content-Type: application/json" \
  -d '{"maxEmails": 5}'
```

**Option B: Run Poller Script**

```bash
npm run build
node dist/gmailPoller.js
```

### 6. Set Up Automatic Polling

**Option A: Cron Job (Linux/Mac)**

```bash
# Edit crontab
crontab -e

# Add this line to check every 5 minutes
*/5 * * * * cd /path/to/weapply-pm && node dist/gmailPoller.js >> /var/log/gmail-poller.log 2>&1
```

**Option B: Systemd Timer (Linux)**

Create `/etc/systemd/system/gmail-poller.service`:
```ini
[Unit]
Description=Gmail to Linear Poller
After=network.target

[Service]
Type=oneshot
User=ubuntu
WorkingDirectory=/home/ubuntu/weapply-pm
EnvironmentFile=/home/ubuntu/weapply-pm/.env
ExecStart=/usr/bin/node dist/gmailPoller.js
```

Create `/etc/systemd/system/gmail-poller.timer`:
```ini
[Unit]
Description=Run Gmail poller every 5 minutes

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

Enable:
```bash
sudo systemctl enable gmail-poller.timer
sudo systemctl start gmail-poller.timer
```

**Option C: API Endpoint (Call from external scheduler)**

Set up a cron job or scheduled task to call:
```
POST http://your-server/gmail/process
```

## How It Works

1. **Poller runs** (every 5 minutes or on-demand)
2. **Fetches unread emails** from `pm@weapply.se` inbox
3. **Processes each email**:
   - Parses email content
   - Refines with OpenAI AI
   - Extracts key information
4. **Creates Linear ticket** in WeTest team
5. **Marks email as read** after successful processing

## API Endpoints

### `POST /gmail/process`

Manually trigger email processing.

**Request:**
```json
{
  "maxEmails": 10,
  "team": "WeTest",
  "project": "WeapplyPM"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "processed": 5,
    "created": 5,
    "errors": 0
  }
}
```

## Troubleshooting

### "Gmail API not initialized"
- Check environment variables are set correctly
- Verify credentials are valid

### "Invalid credentials"
- Regenerate refresh token
- Check OAuth consent screen is configured

### "Insufficient permissions"
- Ensure Gmail API is enabled
- Check OAuth scopes include `gmail.readonly`

### Emails not being fetched
- Verify `pm@weapply.se` account has emails
- Check emails are unread
- Review logs for errors

## Security Notes

- ✅ Refresh token never expires (unless revoked)
- ✅ Only reads emails (no write access)
- ✅ Scoped to `gmail.readonly` only
- ⚠️ Store credentials securely (use environment variables)
- ⚠️ Don't commit credentials to git

## Next Steps

1. ✅ Set up Gmail API credentials
2. ✅ Configure environment variables
3. ✅ Test with `/gmail/process` endpoint
4. ✅ Set up automatic polling (cron/systemd)
5. ✅ Monitor logs for any issues
