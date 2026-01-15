# Fix Redirect URI Mismatch Error

## Problem
Error 400: redirect_uri_mismatch

This happens because OAuth Playground needs a specific redirect URI added to your OAuth client.

## Solution: Add OAuth Playground Redirect URI

### Steps:

1. **Go back to Google Cloud Console**
   - Navigate to: https://console.cloud.google.com/apis/credentials
   - Make sure project "weapply-pm" is selected

2. **Edit Your OAuth Client**
   - Find your OAuth client: "Weapply PM Email Processor" (or "Web client 1")
   - Click on it to edit

3. **Add Authorized Redirect URI**
   - Scroll down to "Authorized redirect URIs"
   - Click "+ Add URI"
   - Add this exact URI:
     ```
     https://developers.google.com/oauthplayground
     ```
   - Click "Save"

4. **Try OAuth Playground Again**
   - Go back to: https://developers.google.com/oauthplayground/
   - Follow the authorization steps again
   - It should work now!

## Alternative: Use Desktop App Type

If you want to avoid redirect URI issues, you can:

1. **Create a new OAuth client** with type "Desktop app"
2. **Use that for OAuth Playground** - Desktop apps don't need redirect URIs
3. **Get the refresh token** using the Desktop app credentials
