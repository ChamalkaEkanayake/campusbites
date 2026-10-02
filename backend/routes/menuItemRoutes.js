const express = require('express');
const router = express.Router();
const {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} = require('../controllers/menuItemController');
const { protect, staffOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public routes for browsing food menu
router.get('/', getMenuItems);
router.get('/:id', getMenuItemById);

// Protected routes for Admin/Staff menu item CRUD with file upload middleware
router.post('/', protect, staffOnly, upload.single('image'), createMenuItem);
router.put('/:id', protect, staffOnly, upload.single('image'), updateMenuItem);
router.delete('/:id', protect, staffOnly, deleteMenuItem);

module.exports = router;
