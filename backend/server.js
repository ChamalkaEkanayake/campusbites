const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Initialize Express App
const app = express();

// Connect to MongoDB Atlas
connectDB();

// Core Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature']
}));

// Stripe Webhook Endpoint REQUIRES Raw Body parser BEFORE express.json()
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  require('./controllers/paymentController').handleStripeWebhook
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static food uploads — Cross-Origin-Resource-Policy allows browser img tags to load them
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Campus Canteen Pre-order API is live!',
    timestamp: new Date().toISOString()
  });
});

// API Routes Registration
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/menu-items', require('./routes/menuItemRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global Centralized Error Handler
app.use(errorHandler);

// Start Express Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Canteen Backend Server running on port ${PORT}`);
  scheduleDailyStockReset();
});

// ─────────────────────────────────────────────
// Daily Stock Reset — fires at midnight every day
// Resets dailyStock to 50 and re-enables all items
// ─────────────────────────────────────────────
const MenuItem = require('./models/MenuItem');

function getMsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // next midnight
  return midnight.getTime() - now.getTime();
}

async function resetDailyStock() {
  try {
    const result = await MenuItem.updateMany(
      {},
      { $set: { dailyStock: 50, isAvailable: true } }
    );
    console.log(
      `✅ Daily stock reset at ${new Date().toISOString()} — ${result.modifiedCount} menu items refreshed.`
    );
  } catch (err) {
    console.error('❌ Failed to reset daily stock:', err.message);
  }
}

function scheduleDailyStockReset() {
  const msUntilMidnight = getMsUntilMidnight();
  console.log(
    `⏰ Daily stock reset scheduled in ${Math.round(msUntilMidnight / 60000)} minutes (at midnight).`
  );

  // Fire once at midnight, then repeat every 24 hours
  setTimeout(() => {
    resetDailyStock();
    setInterval(resetDailyStock, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}
