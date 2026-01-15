# Notification Setup for support@weapply.se

## Option 1: Dual Setup (Recommended) ✅

### Setup:

1. **Forward to Linear for Notifications**:
   - In Gmail/Google Workspace settings for `support@weapply.se`
   - Set up forwarding to: `wetest-b4368e9debdd@intake.linear.app`
   - This creates instant Linear tickets + notifications

2. **Keep Gmail API Service**:
   - Our service will still poll and create AI-refined tickets
   - You'll get both: instant notification + refined ticket

### Benefits:
- ✅ Instant notifications via Linear
- ✅ AI-refined tickets from our service
- ✅ Redundancy (won't miss emails)

---

## Option 2: Gmail Push Notifications (Real-time)

Use Gmail Pub/Sub to process emails immediately when they arrive.

### Setup:
1. Create Google Cloud Pub/Sub topic
2. Set up Gmail watch with Pub/Sub
3. Process emails in real-time (no polling delay)

### Benefits:
- ✅ Real-time processing (no 5-minute delay)
- ✅ More efficient (no polling)
- ⚠️ More complex setup

---

## Option 3: Linear Email Only

Just forward to Linear's email address.

### Setup:
- Forward `support@weapply.se` → `wetest-b4368e9debdd@intake.linear.app`

### Benefits:
- ✅ Simplest setup
- ✅ Instant notifications
- ❌ No AI refinement

---

## Recommendation: Option 1

Set up email forwarding to Linear for instant notifications, while keeping our Gmail API service for AI-refined tickets.

Would you like me to:
1. Set up the email forwarding configuration?
2. Set up Gmail push notifications (Option 2)?
3. Or just use Linear email (Option 3)?
