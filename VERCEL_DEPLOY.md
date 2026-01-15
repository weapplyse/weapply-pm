# Deploy to Vercel (Serverless - No Server Needed!)

## Why Vercel?

✅ **No server to manage** - Fully serverless  
✅ **Free tier** - Generous free usage  
✅ **Automatic HTTPS** - Secure by default  
✅ **Easy deployment** - Just connect GitHub  
✅ **Auto-scaling** - Handles traffic automatically  

## Quick Setup (5 minutes)

### 1. Install Vercel CLI (Optional)

```bash
npm i -g vercel
```

### 2. Deploy to Vercel

**Option A: Via Vercel Dashboard (Easiest)**

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import `weapplyse/weapply-pm` repository
5. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

6. Add Environment Variables:
   ```
   OPENAI_API_KEY=sk-proj-...
   LINEAR_API_KEY=lin_api_...
   DEFAULT_LINEAR_TEAM=WeTest
   DEFAULT_LINEAR_PROJECT=WeapplyPM
   AUTO_CREATE_TICKETS=true
   ENABLE_AI_REFINEMENT=true
   ```

7. Click "Deploy"

**Option B: Via CLI**

```bash
cd /Users/pelle/Public/weapply-pm
vercel login
vercel --prod
```

Follow prompts and add environment variables.

### 3. Get Your Webhook URL

After deployment, you'll get a URL like:
```
https://weapply-pm.vercel.app/api/webhook/email
```

### 4. Set Up Email Forwarding

**Using Resend (Recommended):**

1. Go to [Resend Dashboard](https://resend.com)
2. Add domain `weapply.se`
3. Go to **Inbound** → **Add Domain**
4. Configure webhook URL: `https://weapply-pm.vercel.app/api/webhook/email`
5. Set up forwarding from `pm@weapply.se` → Resend inbound address

**Using SendGrid:**

1. Go to SendGrid → **Settings** → **Inbound Parse**
2. Add hostname: `pm.weapply.se`
3. Set POST URL: `https://weapply-pm.vercel.app/api/webhook/email`

### 5. Test It!

Send an email to `pm@weapply.se` and check Linear - a ticket should appear in WeTest team!

## Benefits Over Server Setup

| Feature | Server (app04) | Vercel (Serverless) |
|---------|---------------|---------------------|
| Server Management | ❌ Required | ✅ None |
| Auto-scaling | ❌ Manual | ✅ Automatic |
| HTTPS | ⚠️ Manual setup | ✅ Automatic |
| Updates | ⚠️ Manual deploy | ✅ Auto-deploy from Git |
| Cost | 💰 Server costs | 💰 Free tier |
| Monitoring | ⚠️ Manual | ✅ Built-in |

## Migration from Server

If you want to switch from app04 to Vercel:

1. Deploy to Vercel (above steps)
2. Update email forwarding webhook URL
3. Stop the service on app04 (optional)

## Troubleshooting

- **Function timeout**: Increase `maxDuration` in `vercel.json`
- **Environment variables**: Check Vercel dashboard → Settings → Environment Variables
- **Logs**: View in Vercel dashboard → Functions → Logs
