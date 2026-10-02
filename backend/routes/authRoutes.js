const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  getAllUsers,
  toggleUserVerification,
  uploadProfilePicture
} = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getUserProfile);
router.get('/users', protect, adminOnly, getAllUsers);
router.put('/users/:id/verify', protect, adminOnly, toggleUserVerification);
router.put('/profile/picture', protect, upload.single('profilePicture'), uploadProfilePicture);

module.exports = router;
