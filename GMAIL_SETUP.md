# Gmail/Google Workspace Integration Options

## Option 1: Email Forwarding (Simplest) ✅ Recommended

**No Google API key needed!**

### Using Resend (Easiest)

1. **Set up Resend Inbound**:
   - Go to [Resend Dashboard](https://resend.com)
   - Add domain `weapply.se` (if you own it)
   - Go to **Inbound** → **Add Domain**
   - Configure webhook URL: `http://app04:3002/webhook/email` (or your public URL)

2. **Configure Gmail Forwarding**:
   - Go to Gmail/Google Workspace settings
   - Set up forwarding from `pm@weapply.se` to Resend's inbound address
   - Or use Google Workspace routing rules

### Using SendGrid

1. Go to SendGrid → **Settings** → **Inbound Parse**
2. Add hostname: `pm.weapply.se`
3. Set POST URL: `http://app04:3002/webhook/email`
4. Configure Gmail forwarding to SendGrid

---

## Option 2: Gmail API (Direct Integration)

**Requires OAuth2 credentials, not just an API key**

### Setup Steps:

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable Gmail API

2. **Create OAuth2 Credentials**:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Add authorized redirect URIs
   - Download credentials JSON

3. **Set up Gmail Watch**:
   - Requires Google Cloud Pub/Sub topic
   - More complex setup

### Would you like me to:
- ✅ **Set up Option 1** (email forwarding - easiest)
- ⚙️ **Set up Option 2** (Gmail API - more complex)

---

## Current Service Status

Your service is running on: `http://app04:3002/webhook/email`

For email forwarding, you need:
- A public URL (or use ngrok for testing)
- Email forwarding service (Resend/SendGrid/Postmark)
- Configure forwarding from `pm@weapply.se`
