const crypto = require('crypto');
const Order = require('../models/Order');
const { createNotification } = require('./notificationController');

/**
 * Generate a unique sequential-style receipt number
 * Format: CB-RCP-YYYY-XXXXXX (padded random 6-digit suffix for uniqueness)
 */
const generateReceiptNumber = () => {
  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6-char hex
  return `CB-RCP-${year}-${suffix}`;
};

/**
 * Generate a cryptographically secure pickup token
 * Format: CB-PICKUP-XXXXXXXXXXXXXXXX (16 hex chars)
 */
const generatePickupToken = () => {
  return `CB-PICKUP-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
};

/**
 * @desc    Generate/Retrieve receipt for an order (idempotent)
 * @route   POST /api/orders/:id/generate-receipt
 * @access  Private (Student — own orders only)
 */
const generateReceipt = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('menuItem', 'name price category preparationTimeMinutes')
      .populate('user', 'name email studentId');

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Security: Only the order owner or admin can generate/view receipt
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      res.status(403);
      throw new Error('Not authorized to access this receipt');
    }

    // Idempotent: if receipt already exists, return it
    if (order.receiptNumber && order.pickupToken) {
      return res.json(buildReceiptPayload(order));
    }

    // Generate new receipt number and pickup token
    let receiptNumber = order.receiptNumber || generateReceiptNumber();
    let pickupToken = order.pickupToken || generatePickupToken();

    order.receiptNumber = receiptNumber;
    order.pickupToken = pickupToken;
    await order.save();

    // Notify student: receipt is ready (only on first generation)
    await createNotification({
      userId: order.user._id,
      title: 'Your Receipt Is Ready 🧾',
      message: `Receipt ${receiptNumber} is ready. Open your receipt to view the QR pickup code.`,
      type: 'RECEIPT_GENERATED',
      relatedOrderId: order._id
    });

    return res.status(201).json(buildReceiptPayload(order));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get receipt for an order (by order ID)
 * @route   GET /api/orders/:id/receipt
 * @access  Private (Student — own orders only | Admin)
 */
const getReceipt = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('menuItem', 'name price category preparationTimeMinutes')
      .populate('user', 'name email studentId');

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Security: Only the order owner or admin/staff can view receipt
    const isOwner = order.user._id.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isAdmin) {
      res.status(403);
      throw new Error('Not authorized to access this receipt');
    }

    // Auto-generate if not yet created (convenience fallback)
    if (!order.receiptNumber || !order.pickupToken) {
      order.receiptNumber = generateReceiptNumber();
      order.pickupToken = generatePickupToken();
      await order.save();
    }

    return res.json(buildReceiptPayload(order));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify pickup QR token (Chef scans student's QR)
 * @route   POST /api/orders/verify-pickup
 * @access  Private (Staff/Admin only)
 */
const verifyPickup = async (req, res, next) => {
  try {
    const { pickupToken } = req.body;

    if (!pickupToken) {
      res.status(400);
      throw new Error('Pickup token is required');
    }

    const order = await Order.findOne({ pickupToken })
      .populate('menuItem', 'name price category preparationTimeMinutes')
      .populate('user', 'name email studentId');

    if (!order) {
      return res.status(404).json({
        valid: false,
        reason: 'INVALID_TOKEN',
        message: 'This QR code is invalid or does not belong to a valid CampusBites order.'
      });
    }

    // Already collected
    if (order.status === 'Completed' || order.collectedAt) {
      return res.status(200).json({
        valid: false,
        reason: 'ALREADY_COLLECTED',
        message: 'This order has already been collected.',
        collectedAt: order.collectedAt,
        order: buildOrderSummary(order)
      });
    }

    // Cancelled orders cannot be picked up
    if (order.status === 'Cancelled') {
      return res.status(200).json({
        valid: false,
        reason: 'CANCELLED',
        message: 'This order has been cancelled and cannot be collected.',
        order: buildOrderSummary(order)
      });
    }

    // Valid order
    return res.json({
      valid: true,
      order: buildOrderSummary(order)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Confirm pickup — marks order as Completed + records collectedAt
 * @route   POST /api/orders/:id/confirm-pickup
 * @access  Private (Staff/Admin only)
 */
const confirmPickup = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('menuItem', 'name price category')
      .populate('user', 'name email studentId');

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    if (order.status === 'Completed') {
      res.status(400);
      throw new Error('This order has already been collected.');
    }

    if (order.status === 'Cancelled') {
      res.status(400);
      throw new Error('Cannot confirm pickup for a cancelled order.');
    }

    order.status = 'Completed';
    order.collectedAt = new Date();
    await order.save();

    // Notify student: order completed
    await createNotification({
      userId: order.user._id,
      title: 'Order Completed! ✅',
      message: 'Your order has been successfully collected. Enjoy your meal!',
      type: 'ORDER_COMPLETED',
      relatedOrderId: order._id
    });

    return res.json({
      success: true,
      message: 'Order pickup confirmed successfully.',
      order: buildOrderSummary(order)
    });
  } catch (error) {
    next(error);
  }
};

// ─── Helper Builders ────────────────────────────────────────────

function buildReceiptPayload(order) {
  const user = order.user;
  const menuItem = order.menuItem;

  return {
    receiptNumber: order.receiptNumber,
    pickupToken: order.pickupToken,
    orderId: order._id,
    orderDate: order.createdAt,
    student: {
      name: user?.name || 'N/A',
      studentId: user?.studentId || null,
      email: user?.email || null
    },
    item: {
      name: menuItem?.name || 'Canteen Item',
      category: menuItem?.category || '',
      unitPrice: menuItem?.price || 0,
      quantity: order.quantity,
      total: order.totalAmount
    },
    breakTimeSlot: order.breakTimeSlot,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    stripePaymentIntentId: order.stripePaymentIntentId || null,
    paidAt: order.paidAt || null,
    collectedAt: order.collectedAt || null,
    subtotal: order.totalAmount,
    totalPaid: order.totalAmount
  };
}

function buildOrderSummary(order) {
  return {
    _id: order._id,
    receiptNumber: order.receiptNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    breakTimeSlot: order.breakTimeSlot,
    collectedAt: order.collectedAt,
    paidAt: order.paidAt,
    item: {
      name: order.menuItem?.name || 'Canteen Item',
      quantity: order.quantity,
      unitPrice: order.menuItem?.price || 0,
      total: order.totalAmount
    },
    student: {
      name: order.user?.name || 'N/A',
      studentId: order.user?.studentId || null,
      email: order.user?.email || null
    }
  };
}

module.exports = {
  generateReceipt,
  getReceipt,
  verifyPickup,
  confirmPickup
};
