const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a menu item name'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Please add a description']
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      min: [0, 'Price must be non-negative']
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: ['Breakfast', 'Lunch', 'Snacks', 'Beverages'],
      default: 'Lunch'
    },
    image: {
      type: String,
      default: 'uploads/default-food.jpg'
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    preparationTimeMinutes: {
      type: Number,
      default: 15
    },
    dailyStock: {
      type: Number,
      required: [true, 'Please set daily stock limit'],
      default: 50
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);
