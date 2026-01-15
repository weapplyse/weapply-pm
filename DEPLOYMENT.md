# Deployment Summary

## Server Information

- **Server IP**: `13.60.13.35`
- **Service Port**: `3002` (internal)
- **Public Port**: `8080` (via nginx)
- **Service Status**: ✅ Running
- **Auto-start**: ✅ Enabled

## Webhook URLs

### Internal (on server)
- Health: `http://localhost:3002/health`
- Webhook: `http://localhost:3002/webhook/email`

### Public (from internet)
- Health: `http://13.60.13.35:8080/health`
- Webhook: `http://13.60.13.35:8080/webhook/email`

### With Domain (if configured)
- Health: `http://pm.weapply.se:8080/health`
- Webhook: `http://pm.weapply.se:8080/webhook/email`

## Service Management

```bash
# Check status
ssh ubuntu@app04 "sudo systemctl status weapply-pm.service"

# View logs
ssh ubuntu@app04 "sudo journalctl -u weapply-pm.service -f"

# Restart service
ssh ubuntu@app04 "sudo systemctl restart weapply-pm.service"

# Check nginx
ssh ubuntu@app04 "sudo systemctl status nginx"
```

## Email Forwarding Setup

### Option 1: Resend (Recommended)

1. Go to [Resend Dashboard](https://resend.com)
2. Add domain `weapply.se` (if you own it)
3. Go to **Inbound** → **Add Domain**
4. Configure webhook URL: `http://13.60.13.35:8080/webhook/email`
5. Set up email forwarding from `pm@weapply.se` to Resend's inbound address

### Option 2: SendGrid

1. Go to SendGrid → **Settings** → **Inbound Parse**
2. Add hostname: `pm.weapply.se`
3. Set POST URL: `http://13.60.13.35:8080/webhook/email`
4. Configure email forwarding

### Option 3: Postmark

1. Go to Postmark → **Servers** → **Inbound**
2. Add webhook URL: `http://13.60.13.35:8080/webhook/email`
3. Configure inbound address

## Testing

### Test Health Endpoint
```bash
curl http://13.60.13.35:8080/health
```

### Test Webhook
```bash
curl -X POST http://13.60.13.35:8080/webhook/email \
  -H "Content-Type: application/json" \
  -d '{
    "raw": "From: test@example.com\nSubject: Test\n\nTest email"
  }'
```

## Firewall

Make sure port 8080 is open:
```bash
sudo ufw allow 8080/tcp
```

## Next Steps

1. ✅ Service deployed and running
2. ✅ Nginx reverse proxy configured
3. ⏳ Set up email forwarding (Resend/SendGrid/Postmark)
4. ⏳ Configure `pm@weapply.se` to forward emails
5. ⏳ Test with real email

## Notes

- Service runs on port 3002 internally
- Nginx proxies port 8080 → 3002
- Service auto-starts on boot
- Logs available via `journalctl`
