const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register a new user (Student, Chef / Kitchen Staff, or Admin)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, username, email, password, phone, gender, studentId, role, isAdmin } = req.body;

    const userRole = role || (isAdmin ? 'admin' : 'student');

    // 0. Secret key check for privileged roles (admin & chef)
    if (userRole === 'admin' || userRole === 'chef') {
      const { adminSecretKey } = req.body;
      if (!adminSecretKey || adminSecretKey !== process.env.ADMIN_SECRET_KEY) {
        res.status(403);
        throw new Error('Invalid staff secret key. Contact your system administrator.');
      }
    }

    // 1. Validation according to Role
    if (userRole === 'admin') {
      // Admin requires Username and Password
      if (!username || !password) {
        res.status(400);
        throw new Error('Admin registration requires a Username and Password');
      }
    } else if (userRole === 'chef') {
      // Kitchen Staff / Chef requires Name, Email, Password, Phone Number, Gender
      if (!name || !email || !password || !phone || !gender) {
        res.status(400);
        throw new Error('Chef registration requires Name, Email, Password, Phone Number, and Gender');
      }
    } else {
      // Student requires Name, Email, Password
      if (!name || !email || !password) {
        res.status(400);
        throw new Error('Student registration requires Name, Email, and Password');
      }
    }

    // Check for existing user by Email or Username
    const query = [];
    if (email) query.push({ email: email.toLowerCase().trim() });
    if (username) query.push({ username: username.toLowerCase().trim() });

    if (query.length > 0) {
      const userExists = await User.findOne({ $or: query });
      if (userExists) {
        res.status(400);
        throw new Error('User already exists with this Email or Username');
      }
    }

    // Determine values for DB entry
    const finalUsername = username ? username.toLowerCase().trim() : '';
    const finalEmail = email
      ? email.toLowerCase().trim()
      : userRole === 'admin'
      ? `${finalUsername}@admin.campusbites.lk`
      : '';

    const isVerified = userRole === 'chef' ? false : true;

    const user = await User.create({
      name: name || finalUsername || 'Admin',
      username: finalUsername,
      email: finalEmail,
      password,
      phone: phone || '',
      gender: gender || '',
      studentId: studentId || '',
      role: userRole,
      isAdmin: userRole === 'admin',
      isVerified
    });

    if (user) {
      // Notify all admins when a new chef registers
      if (userRole === 'chef') {
        const admins = await User.find({ role: 'admin' }).select('_id');
        for (const admin of admins) {
          await createNotification({
            userId: admin._id,
            title: 'New Chef Registration 👨‍🍳',
            message: `Chef "${user.name}" (${user.email}) has registered and is awaiting verification.`,
            type: 'CHEF_REGISTERED'
          });
        }
      }

      res.status(201).json({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        studentId: user.studentId,
        role: user.role,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        profilePicture: user.profilePicture || '',
        token: generateToken(user._id)
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data provided');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token (Supports Email or Username)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || '').toLowerCase().trim();

    if (!identifier || !password) {
      res.status(400);
      throw new Error('Please enter your Username/Email and Password');
    }

    // Find by email OR username
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        studentId: user.studentId,
        role: user.role,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified ?? true,
        profilePicture: user.profilePicture || '',
        token: generateToken(user._id)
      });
    } else {
      res.status(401);
      throw new Error('Invalid Username/Email or Password');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/me
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registered users (Admin only)
// @route   GET /api/auth/users
// @access  Private / Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    let query = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { username: searchRegex },
        { phone: searchRegex },
        { studentId: searchRegex }
      ];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle chef / user verification status (Admin only)
// @route   PUT /api/auth/users/:id/verify
// @access  Private / Admin
const toggleUserVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user.isVerified = req.body.isVerified !== undefined ? req.body.isVerified : !user.isVerified;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      message: `User ${user.name} verification set to ${user.isVerified}`
    });
  } catch (error) {
    next(error);
  }
};

const fs = require('fs');
const path = require('path');

const normaliseImagePath = (filePath) =>
  filePath.replace(/\\/g, '/').replace(/^\//, '');

// @desc    Upload / Update User Profile Picture
// @route   PUT /api/auth/profile/picture
// @access  Private
const uploadProfilePicture = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (!req.file) {
      res.status(400);
      throw new Error('Please upload an image file');
    }

    // Delete old profile picture if exists
    if (user.profilePicture) {
      const oldPath = normaliseImagePath(user.profilePicture);
      const absoluteOldPath = path.join(__dirname, '..', oldPath);
      if (fs.existsSync(absoluteOldPath)) {
        try {
          fs.unlinkSync(absoluteOldPath);
        } catch (err) {
          console.error('Failed to delete old profile picture:', err);
        }
      }
    }

    user.profilePicture = normaliseImagePath(req.file.path);
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      studentId: user.studentId,
      role: user.role,
      isAdmin: user.isAdmin,
      isVerified: user.isVerified,
      profilePicture: user.profilePicture
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  getAllUsers,
  toggleUserVerification,
  uploadProfilePicture
};
