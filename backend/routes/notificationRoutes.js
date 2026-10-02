const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// ── IMPORTANT: Fixed/named routes MUST come before /:id param routes ──

// GET  /api/notifications            — paginated list for current user
router.get('/', protect, getNotifications);

// GET  /api/notifications/unread-count — unread badge count
router.get('/unread-count', protect, getUnreadCount);

// PATCH /api/notifications/mark-all-read — mark all as read
router.patch('/mark-all-read', protect, markAllAsRead);

// ── Dynamic :id routes below ──

// PATCH /api/notifications/:id/read  — mark single as read
router.patch('/:id/read', protect, markAsRead);

// DELETE /api/notifications/:id      — delete notification
router.delete('/:id', protect, deleteNotification);

module.exports = router;
