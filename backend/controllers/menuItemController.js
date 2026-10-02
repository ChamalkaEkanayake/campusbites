const MenuItem = require('../models/MenuItem');
const fs = require('fs');
const path = require('path');

// Helper: normalise multer path to forward-slash relative path (e.g. uploads/filename.jpg)
const normaliseImagePath = (filePath) =>
  filePath.replace(/\\/g, '/').replace(/^\//, '');

// @desc    Get all menu items
// @route   GET /api/menu-items
// @access  Public
const getMenuItems = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    let query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const items = await MenuItem.find(query).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single menu item by ID
// @route   GET /api/menu-items/:id
// @access  Public
const getMenuItemById = async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error('Menu item not found');
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new menu item (with image upload)
// @route   POST /api/menu-items
// @access  Private / Admin
const createMenuItem = async (req, res, next) => {
  try {
    const { name, description, price, category, preparationTimeMinutes, dailyStock, isAvailable } = req.body;

    if (!name || !description || !price) {
      res.status(400);
      throw new Error('Please provide name, description, and price');
    }

    let imagePath = 'uploads/default-food.jpg';
    if (req.file) {
      // Normalise path: forward slashes, no leading slash
      imagePath = normaliseImagePath(req.file.path);
      console.log(`✅ Image uploaded: ${req.file.originalname} → saved as: ${imagePath}`);
    } else {
      console.warn('⚠️  No image file received — using default image. Check Content-Type header and FormData construction.');
    }

    const menuItem = await MenuItem.create({
      name,
      description,
      price: Number(price),
      category: category || 'Lunch',
      image: imagePath,
      preparationTimeMinutes: preparationTimeMinutes ? Number(preparationTimeMinutes) : 15,
      dailyStock: dailyStock !== undefined ? Number(dailyStock) : 50,
      isAvailable: isAvailable !== undefined ? isAvailable : true
    });

    res.status(201).json(menuItem);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a menu item
// @route   PUT /api/menu-items/:id
// @access  Private / Admin
const updateMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      res.status(404);
      throw new Error('Menu item not found');
    }

    const { name, description, price, category, preparationTimeMinutes, dailyStock, isAvailable } = req.body;

    if (name) item.name = name;
    if (description) item.description = description;
    if (price !== undefined) item.price = Number(price);
    if (category) item.category = category;
    if (preparationTimeMinutes !== undefined) item.preparationTimeMinutes = Number(preparationTimeMinutes);
    if (dailyStock !== undefined) item.dailyStock = Number(dailyStock);
    if (isAvailable !== undefined) item.isAvailable = isAvailable;

    if (req.file) {
      // Remove old image file if it's not the default
      const oldImagePath = normaliseImagePath(item.image || '');
      if (oldImagePath && oldImagePath !== 'uploads/default-food.jpg') {
        const absoluteOldPath = path.join(__dirname, '..', oldImagePath);
        if (fs.existsSync(absoluteOldPath)) {
          try {
            fs.unlinkSync(absoluteOldPath);
          } catch (err) {
            console.error('Failed to delete old image file:', err);
          }
        }
      }
      item.image = normaliseImagePath(req.file.path);
    }

    const updatedItem = await item.save();
    res.json(updatedItem);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a menu item
// @route   DELETE /api/menu-items/:id
// @access  Private / Admin
const deleteMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      res.status(404);
      throw new Error('Menu item not found');
    }

    // Delete image file if exists (use absolute path for Windows compatibility)
    const imagePath = normaliseImagePath(item.image || '');
    if (imagePath && imagePath !== 'uploads/default-food.jpg') {
      const absoluteImagePath = path.join(__dirname, '..', imagePath);
      if (fs.existsSync(absoluteImagePath)) {
        try {
          fs.unlinkSync(absoluteImagePath);
        } catch (err) {
          console.error('Failed to delete image file:', err);
        }
      }
    }

    await item.deleteOne();
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
};
