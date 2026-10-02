const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: [
        'ORDER_PLACED',
        'ORDER_ACCEPTED',
        'ORDER_PREPARING',
        'ORDER_READY',
        'ORDER_COMPLETED',
        'ORDER_CANCELLED',
        'PAYMENT_SUCCESS',
        'PAYMENT_FAILED',
        'CASH_PAYMENT_CONFIRMED',
        'RECEIPT_GENERATED',
        'NEW_ORDER',           // Chef: new order arrived
        'CHEF_REGISTERED',     // Admin: new chef awaiting verification
        'SYSTEM'
      ],
      default: 'SYSTEM'
    },
    relatedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast user-specific notification queries (newest first)
notificationSchema.index({ userId: 1, createdAt: -1 });
// Index for fast unread count lookups
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
