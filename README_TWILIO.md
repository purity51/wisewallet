# Wisewallet + Twilio SMS Integration

## Quick Start

### 1. Set Up Backend (5 min)
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Twilio credentials
npm start
```

### 2. Get Twilio Credentials (5 min)
1. Create account at [twilio.com](https://console.twilio.com)
2. Note your **Account SID** and **Auth Token**
3. Get a phone number (or use trial number)

### 3. Configure Twilio Webhook
In Twilio Console:
- Phone Numbers → Your Number
- Messaging → Incoming Messages → Set to: `http://YOUR-PUBLIC-URL/webhook/sms`
- Save

### 4. Open the App
```bash
# In a separate terminal
python -m http.server 8000
# Navigate to http://localhost:8000
```

### 5. Enable SMS in the App
- Go to **Predictions** page
- Enter your phone number in "Get alerts via messages"
- Click **Enable SMS**
- Start forwarding M-PESA SMS to your Twilio number

## How It Works

```
M-PESA Message → Twilio → Backend (/webhook/sms) → App (polls every 30s) → Dashboard + Alerts
```

1. **Twilio receives M-PESA SMS** sent to your business/trial number
2. **Webhook sends to backend** at `/webhook/sms`
3. **Backend parses & queues** the transaction
4. **Frontend polls** every 30 seconds for new transactions
5. **Dashboard auto-updates** with new spending data

## Environment Variables

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
FRONTEND_URL=http://localhost:8000
PORT=3001
```

## Testing Without Twilio

1. **Keep using manual paste** on Transactions page (still works!)
2. **Backend is ready** to receive webhooks anytime
3. **Enable SMS** on Predictions to register your phone
4. **Polling will start** automatically once registered

## API Endpoints

- `POST /webhook/sms` — Twilio sends SMS here
- `POST /register-phone` — Register user phone for tracking
- `GET /transactions/:phone` — Fetch queued transactions
- `GET /health` — Health check

## Troubleshooting

**Backend not receiving SMS?**
- Check Twilio webhook URL is public (use ngrok for local testing)
- Verify Account SID and Auth Token

**Frontend not fetching transactions?**
- Check browser console for CORS errors
- Ensure `FRONTEND_URL` matches your actual URL
- Verify polling is running: check Chrome DevTools Network tab

**SMS not being parsed?**
- Paste the raw M-PESA message to backend at debug endpoint
- Backend logs will show parse results

## Production Deployment

For production:
1. Use a real database instead of in-memory queue
2. Deploy backend to Heroku/AWS/GCP
3. Update `BACKEND_URL` in frontend code
4. Set up proper CORS and authentication
5. Use environment variables for all secrets
