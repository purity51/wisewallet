# Twilio SMS Setup Guide for Wisewallet

## Step 1: Create a Twilio Account
1. Go to [twilio.com](https://console.twilio.com)
2. Sign up or log in
3. Get your **Account SID** and **Auth Token** from the dashboard
4. Purchase or claim a phone number (or use your trial number)

## Step 2: Set Up Environment Variables
1. Copy `.env.example` to `.env`
2. Fill in your Twilio credentials:
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_PHONE_NUMBER=+1234567890
   FRONTEND_URL=http://localhost:8000
   PORT=3001
   ```

## Step 3: Configure Twilio Webhook
1. In Twilio Console, go to **Phone Numbers** → your number
2. Scroll to **Messaging**
3. Set **Incoming Messages** webhook to:
   ```
   http://your-public-url.com/webhook/sms
   ```
   (Or for local testing, use ngrok: `ngrok http 3001`)
4. Save

## Step 4: Run the Backend
```bash
cd backend
npm install
npm start
```

## Step 5: Forward M-PESA SMS to Your Twilio Number
1. When you receive an M-PESA SMS, forward it to your Twilio number
2. The backend will automatically parse and queue the transaction
3. The frontend will fetch and import it when you enable SMS sync

## Testing Without Twilio
- Manually paste M-PESA messages in **Transactions** page (still works)
- Enable SMS in **Predictions** page to set up phone registration
- Backend will queue any SMS received at `/webhook/sms`

## Local Testing with ngrok
```bash
# Terminal 1: Start backend
npm start

# Terminal 2: Expose to internet
ngrok http 3001

# Copy the ngrok URL to Twilio webhook (e.g., https://abc123.ngrok.io/webhook/sms)
```

## API Endpoints
- `POST /webhook/sms` — Twilio calls this with incoming SMS
- `POST /register-phone` — Register user phone for tracking
- `GET /transactions/:phone` — Fetch queued transactions
- `POST /clear-queue/:phone` — Clear transaction queue (testing)
- `GET /health` — Health check
