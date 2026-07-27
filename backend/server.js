const express = require('express');
const cors = require('cors');
require('dotenv').config();
const twilio = require('twilio');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8000',
  credentials: true
}));

const PORT = process.env.PORT || 3001;

// In-memory storage for transaction webhooks (in production, use a database)
const transactionQueue = {};

// Helper: Parse M-PESA text into transaction object
function parseMpesaMessage(line) {
  const amountMatch = line.match(/(?:Ksh|KES|KSh|sh|\bK\s*sh\b)\s*([\d,]+(?:\.\d+)?)/i);
  if (!amountMatch) return null;

  const amount = parseInt(amountMatch[1].replace(/,/g, ''), 10);
  if (!amount) return null;

  const isIncome = /received|credited|paid to you|deposit|salary|pension|refund|cashback/i.test(line);
  
  const categoryMap = {
    'rent': 'recurring',
    'postpaid': 'recurring',
    'electricity': 'recurring',
    'bill': 'recurring',
    'subscription': 'recurring',
    'insurance': 'recurring',
    'loan': 'recurring',
    'grocer': 'essential',
    'supermarket': 'essential',
    'pharm': 'essential',
    'fuel': 'essential',
    'transport': 'essential',
    'taxi': 'essential',
    'uber': 'essential',
    'bus': 'essential',
    'matatu': 'essential',
    'market': 'essential',
    'shop': 'impulse',
    'mall': 'impulse',
    'coffee': 'impulse',
    'dining': 'impulse',
    'restaurant': 'impulse',
    'bar': 'impulse',
    'movie': 'impulse',
    'entertainment': 'impulse',
    'amazon': 'impulse',
    'shopping': 'impulse',
    'purchase': 'impulse'
  };

  let category = 'essential';
  const lower = line.toLowerCase();
  for (const [keyword, cat] of Object.entries(categoryMap)) {
    if (lower.includes(keyword)) {
      category = cat;
      break;
    }
  }

  const placeMatch = line.match(/(?:to|from)\s+([A-Za-z0-9&@#\-\.\s]{3,40})(?=\s|$)/i);
  const description = placeMatch ? placeMatch[1].trim() : line.slice(0, 28).trim();

  const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  let txDate = new Date().toISOString().slice(0, 10);
  if (dateMatch) {
    const parts = dateMatch[1].split(/[/\-]/).map(Number);
    const [a, b, c] = parts;
    const year = c < 100 ? 2000 + c : c;
    const month = a > 12 ? b : a;
    const day = a > 12 ? a : b;
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) {
      txDate = parsed.toISOString().slice(0, 10);
    }
  }

  const timeMatch = line.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/);
  const time = timeMatch ? timeMatch[1].toUpperCase() : '';

  return {
    date: txDate,
    name: description,
    meta: time ? `${time} · Imported` : 'Imported',
    category,
    type: isIncome ? 'income' : 'expense',
    amount: isIncome ? amount : -amount,
    source: 'sms'
  };
}

// Webhook endpoint - receives SMS from Twilio
app.post('/webhook/sms', (req, res) => {
  const from = req.body.From;
  const body = req.body.Body;

  console.log(`[SMS] From: ${from}, Body: ${body}`);

  // Parse M-PESA message
  const transaction = parseMpesaMessage(body);
  if (!transaction) {
    console.log('[SMS] No valid M-PESA amount found');
    return res.status(200).send('OK');
  }

  // Store transaction for user (keyed by phone if available)
  if (!transactionQueue[from]) {
    transactionQueue[from] = [];
  }
  transaction.id = `sms_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  transactionQueue[from].push(transaction);

  console.log(`[SMS] Parsed transaction:`, transaction);

  res.status(200).send('OK');
});

// Register endpoint - user provides their phone to enable SMS tracking
app.post('/register-phone', (req, res) => {
  const { userId, phone } = req.body;
  if (!userId || !phone) {
    return res.status(400).json({ error: 'userId and phone required' });
  }

  console.log(`[Register] User ${userId} registered phone: ${phone}`);
  
  res.status(200).json({
    success: true,
    message: `Phone ${phone} registered. M-PESA SMS will be automatically tracked.`,
    instructions: `Forward your M-PESA notifications to ${process.env.TWILIO_PHONE_NUMBER}`
  });
});

// Fetch pending transactions for a phone
app.get('/transactions/:phone', (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  const transactions = transactionQueue[phone] || [];

  console.log(`[Fetch] Retrieved ${transactions.length} transactions for ${phone}`);

  // Return and clear queue
  res.status(200).json({
    transactions,
    count: transactions.length
  });

  delete transactionQueue[phone];
});

// Clear pending transactions (for testing)
app.post('/clear-queue/:phone', (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  delete transactionQueue[phone];
  res.status(200).json({ message: 'Queue cleared' });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Wisewallet backend listening on port ${PORT}`);
  console.log(`📱 Twilio webhook ready at http://localhost:${PORT}/webhook/sms`);
  console.log(`💾 Frontend URL: ${process.env.FRONTEND_URL}`);
});
