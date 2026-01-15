# Setup Guide: Email to Linear with pm@weapply.se

## Recommended Approach: Use Our Tool with Auto-Creation ✅

**Why this is better than Linear's built-in email:**
- ✅ **AI-powered refinement** - Emails are intelligently structured into well-formatted tickets
- ✅ **Automatic ticket creation** - No manual steps required
- ✅ **Better formatting** - Summaries, action items, and metadata extraction
- ✅ **Customizable** - Full control over team, project, labels, priority

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
cd /Users/pelle/Public/weapply-pm
npm install
```

### 2. Configure Environment

Create `.env` file:

```bash
cp env.template .env
```

Edit `.env` and set:

```env
OPENAI_API_KEY=your_openai_api_key_here
LINEAR_API_KEY=your_linear_api_key_here
DEFAULT_LINEAR_TEAM=Weapply
DEFAULT_LINEAR_PROJECT=WeapplyPM
AUTO_CREATE_TICKETS=true
```

### 3. Deploy the Service

You have two options:

#### Option A: Deploy to a Cloud Service (Recommended)

**Vercel/Netlify/Railway:**
1. Push code to GitHub
2. Connect to deployment service
3. Set environment variables
4. Get your webhook URL: `https://your-app.vercel.app/webhook/email`

**Example with Railway:**
```bash
railway login
railway init
railway up
railway variables set OPENAI_API_KEY=sk-proj-...
railway variables set LINEAR_API_KEY=lin_api_...
railway variables set DEFAULT_LINEAR_TEAM=Weapply
railway variables set AUTO_CREATE_TICKETS=true
```

#### Option B: Run Locally with ngrok (For Testing)

```bash
# Terminal 1: Start the service
npm run dev

# Terminal 2: Expose local port
ngrok http 3000

# Use the ngrok URL: https://xxxx.ngrok.io/webhook/email
```

### 4. Configure Email Forwarding

Set up `pm@weapply.se` to forward emails to your webhook:

#### Using Resend (Recommended)

1. Go to [Resend Dashboard](https://resend.com)
2. Add domain `weapply.se` (if not already added)
3. Go to **Inbound** → **Add Domain**
4. Configure webhook URL: `https://your-webhook-url/webhook/email`
5. Set up email forwarding rule in your email provider to forward `pm@weapply.se` emails to Resend's inbound address

#### Using SendGrid

1. Go to SendGrid → **Settings** → **Inbound Parse**
2. Add hostname: `pm.weapply.se`
3. Set POST URL: `https://your-webhook-url/webhook/email`
4. Configure email forwarding

#### Using Postmark

1. Go to Postmark → **Servers** → **Inbound**
2. Add webhook URL: `https://your-webhook-url/webhook/email`
3. Configure email forwarding

#### Using Gmail/Google Workspace

1. Set up email forwarding in Gmail settings
2. Forward `pm@weapply.se` to a service that can POST to webhook (like Zapier, Make.com, or a custom script)

### 5. Test It!

Send a test email to `pm@weapply.se`:

```
To: pm@weapply.se
Subject: Test Ticket Creation

This is a test email. It should create a Linear ticket automatically.
```

Check Linear - a new ticket should appear in the "Weapply" team under "WeapplyPM" project!

## How It Works

1. **Email arrives** at `pm@weapply.se`
2. **Email service forwards** to your webhook URL
3. **Service processes**:
   - Parses email content
   - Uses AI to refine and structure content
   - Extracts key information (title, description, action items, priority)
4. **Creates Linear ticket** automatically via Linear API
5. **Done!** Ticket appears in Linear

## Configuration Options

### Change Default Team/Project

Edit `.env`:
```env
DEFAULT_LINEAR_TEAM=Project management
DEFAULT_LINEAR_PROJECT=WeapplyPM
```

### Disable Auto-Creation

If you want to review tickets before creating:
```env
AUTO_CREATE_TICKETS=false
```

Then tickets will be prepared but not created automatically. You can create them manually via MCP or the API.

### Customize AI Refinement

Edit `src/contentRefiner.ts` to customize how emails are refined.

## Troubleshooting

### Tickets Not Creating

1. Check logs: `npm run dev` shows detailed logs
2. Verify Linear API key is correct
3. Check team name matches exactly (case-sensitive)
4. Verify project exists in Linear

### Emails Not Arriving

1. Check webhook URL is accessible
2. Verify email forwarding is configured correctly
3. Check email service logs
4. Test webhook directly: `curl -X POST https://your-url/webhook/email -H "Content-Type: message/rfc822" --data-binary @examples/test-email.eml`

### AI Refinement Not Working

1. Check OpenAI API key is set
2. Verify API key has credits/quota
3. Check logs for OpenAI errors
4. System falls back to basic refinement if AI fails

## Alternative: Linear's Built-in Email

If you prefer Linear's native email integration:

1. Go to Linear → Settings → Teams → Weapply
2. Enable "Create by email"
3. Forward `pm@weapply.se` to Linear's email address

**Limitations:**
- No AI refinement
- Basic formatting only
- Less control over ticket structure

## Support

Check the main README.md and INTEGRATION.md for more details.
