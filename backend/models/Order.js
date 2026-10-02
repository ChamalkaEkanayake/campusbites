const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order must belong to a user']
    },
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: [true, 'Order must reference a menu item']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1
    },
    totalAmount: {
      type: Number,
      required: true
    },
    breakTimeSlot: {
      type: String,
      required: [true, 'Please select a break time slot'],
      enum: [
        'Morning Break (10:30 AM - 10:45 AM)',
        'Lunch Break (12:30 PM - 01:15 PM)',
        'Evening Break (03:30 PM - 03:45 PM)'
      ]
    },
    status: {
      type: String,
      enum: ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'],
      default: 'Pending'
    },
    specialInstructions: {
      type: String,
      trim: true,
      default: ''
    },
    paymentMethod: {
      type: String,
      enum: ['ONLINE', 'CASH_ON_PICKUP'],
      default: 'CASH_ON_PICKUP',
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING'
    },
    stripeSessionId: {
      type: String,
      default: null
    },
    stripePaymentIntentId: {
      type: String,
      default: null
    },
    paidAt: {
      type: Date,
      default: null
    },
    // ─── Receipt & QR Pickup Fields ───────────────────────────
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true, // null values won't conflict on uniqueness
      default: null
    },
    pickupToken: {
      type: String,
      unique: true,
      sparse: true, // null values won't conflict on uniqueness
      default: null
    },
    collectedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
