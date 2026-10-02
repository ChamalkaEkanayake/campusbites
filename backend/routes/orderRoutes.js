const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  confirmCashPayment,
  cancelOrder
} = require('../controllers/orderController');
const {
  generateReceipt,
  getReceipt,
  verifyPickup,
  confirmPickup
} = require('../controllers/receiptController');
const { protect, staffOnly } = require('../middleware/authMiddleware');

// ── IMPORTANT: Fixed/named routes MUST come before /:id param routes ──

// Student routes (no :id conflict)
router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);

// Pickup QR verification — fixed path, MUST be before /:id routes
router.post('/verify-pickup', protect, staffOnly, verifyPickup);

// Admin/Staff list — fixed path, MUST be before /:id routes
router.get('/', protect, staffOnly, getAllOrders);

// ── Dynamic :id routes below ──
router.get('/:id', protect, getOrderById);
router.put('/:id/cancel', protect, cancelOrder);
router.put('/:id/status', protect, staffOnly, updateOrderStatus);
router.put('/:id/confirm-cash-payment', protect, staffOnly, confirmCashPayment);

// Receipt routes
router.post('/:id/generate-receipt', protect, generateReceipt);
router.get('/:id/receipt', protect, getReceipt);

// Pickup confirmation
router.post('/:id/confirm-pickup', protect, staffOnly, confirmPickup);

module.exports = router;
