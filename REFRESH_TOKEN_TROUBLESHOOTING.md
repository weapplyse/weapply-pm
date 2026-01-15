# Refresh Token Troubleshooting

## Issue: invalid_grant Error

The refresh token might need to be regenerated. Here's how to get a fresh one:

### Steps to Get New Refresh Token:

1. **Go to OAuth Playground**: https://developers.google.com/oauthplayground/

2. **Clear any existing authorization**:
   - Click the gear icon (⚙️)
   - Make sure "Use your own OAuth credentials" is checked
   - Enter your credentials again

3. **Re-authorize**:
   - In left panel, find "Gmail API v1"
   - Select: `https://www.googleapis.com/auth/gmail.readonly`
   - Click "Authorize APIs"
   - Sign in with `pm@weapply.se` or `pelle@weapply.se`
   - Click "Allow"

4. **Get NEW refresh token**:
   - Click "Exchange authorization code for tokens"
   - Copy the NEW refresh token (it might be different)

5. **Update server**:
   - Share the new refresh token
   - I'll update the configuration

### Alternative: Check OAuth Client Settings

Make sure in Google Cloud Console:
- OAuth client type: "Web application"
- Authorized redirect URIs includes: `https://developers.google.com/oauthplayground`
- The client is not deleted or disabled

### Why This Happens:

- Refresh tokens can sometimes be one-time use initially
- OAuth Playground tokens might need to be refreshed
- The token might be tied to a specific session

Let me know the new refresh token and I'll update the server!
