const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

// Maximum kitchen preparation capacity per break slot (Real Business Logic Rule)
const MAX_SLOT_CAPACITY = 25;

// @desc    Create a new pre-order (with business logic validation)
// @route   POST /api/orders
// @access  Private (Student)
const createOrder = async (req, res, next) => {
  try {
    const { menuItemId, quantity, breakTimeSlot, specialInstructions, paymentMethod } = req.body;

    if (!menuItemId || !quantity || !breakTimeSlot) {
      res.status(400);
      throw new Error('Please provide menuItemId, quantity, and breakTimeSlot');
    }

    // 1. Verify primary entity (MenuItem) exists
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
      res.status(404);
      throw new Error('Selected Menu Item not found');
    }

    if (!menuItem.isAvailable) {
      res.status(400);
      throw new Error(`Sorry, "${menuItem.name}" is currently unavailable`);
    }

    // 2. Stock Check
    if (menuItem.dailyStock < quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for "${menuItem.name}". Only ${menuItem.dailyStock} left today.`);
    }

    // 3. REAL BUSINESS LOGIC RULE: Check Canteen Preparation Capacity for the selected slot
    const activeOrdersInSlotCount = await Order.countDocuments({
      breakTimeSlot,
      status: { $in: ['Pending', 'Preparing'] }
    });

    if (activeOrdersInSlotCount >= MAX_SLOT_CAPACITY) {
      res.status(400);
      throw new Error(
        `Canteen kitchen capacity reached for "${breakTimeSlot}". Maximum ${MAX_SLOT_CAPACITY} orders per break slot allowed. Please choose a different break slot!`
      );
    }

    // 4. Calculate total amount dynamically
    const totalAmount = menuItem.price * Number(quantity);

    // 5. Create Order
    const selectedPaymentMethod = paymentMethod === 'ONLINE' ? 'ONLINE' : 'CASH_ON_PICKUP';

    const order = await Order.create({
      user: req.user._id,
      menuItem: menuItem._id,
      quantity: Number(quantity),
      totalAmount,
      breakTimeSlot,
      specialInstructions: specialInstructions || '',
      status: 'Pending',
      paymentMethod: selectedPaymentMethod,
      paymentStatus: 'PENDING'
    });

    // 6. Deduct stock from MenuItem
    menuItem.dailyStock -= Number(quantity);
    if (menuItem.dailyStock <= 0) {
      menuItem.isAvailable = false;
    }
    await menuItem.save();

    // 7. Notify student: Order placed
    await createNotification({
      userId: req.user._id,
      title: 'Order Placed Successfully! 🎉',
      message: `Your order for "${menuItem.name}" has been placed. The kitchen will confirm it shortly.`,
      type: 'ORDER_PLACED',
      relatedOrderId: order._id
    });

    // 8. Notify all chefs about new order
    const chefs = await User.find({ role: 'chef' }).select('_id');
    for (const chef of chefs) {
      await createNotification({
        userId: chef._id,
        title: 'New Order Received! 🍳',
        message: `New order for "${menuItem.name}" × ${quantity} — slot: ${breakTimeSlot}.`,
        type: 'NEW_ORDER',
        relatedOrderId: order._id
      });
    }

    // Populate menuItem and user details for response
    const populatedOrder = await Order.findById(order._id)
      .populate('menuItem', 'name price category image')
      .populate('user', 'name email studentId');

    res.status(201).json(populatedOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user's orders
// @route   GET /api/orders/my-orders
// @access  Private (Student)
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('menuItem', 'name price category image preparationTimeMinutes')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (Canteen Admin/Staff view)
// @route   GET /api/orders
// @access  Private / Admin
const getAllOrders = async (req, res, next) => {
  try {
    const { status, breakTimeSlot } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (breakTimeSlot) filter.breakTimeSlot = breakTimeSlot;

    const orders = await Order.find(filter)
      .populate('menuItem', 'name price category image')
      .populate('user', 'name email studentId')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('menuItem', 'name price category image description preparationTimeMinutes')
      .populate('user', 'name email studentId');

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Only owner or admin can view order
    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      res.status(403);
      throw new Error('Not authorized to view this order');
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

// Status → notification mapping
const STATUS_NOTIFICATIONS = {
  Preparing: {
    title: 'Your Food Is Being Prepared! 👨‍🍳',
    message: 'The kitchen has started preparing your order. It will be ready soon!',
    type: 'ORDER_PREPARING'
  },
  Ready: {
    title: 'Your Order Is Ready! 🎉',
    message: 'Your food is ready for pickup! Please collect it during your selected slot.',
    type: 'ORDER_READY'
  },
  Completed: {
    title: 'Order Completed! ✅',
    message: 'Your order has been successfully collected. Enjoy your meal!',
    type: 'ORDER_COMPLETED'
  },
  Cancelled: {
    title: 'Order Cancelled',
    message: 'Your order has been cancelled.',
    type: 'ORDER_CANCELLED'
  }
};

// @desc    Update order status (State Change Workflow)
// @route   PUT /api/orders/:id/status
// @access  Private / Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'];

    if (!status || !allowedStatuses.includes(status)) {
      res.status(400);
      throw new Error(`Invalid status. Allowed values: ${allowedStatuses.join(', ')}`);
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    const previousStatus = order.status;
    order.status = status;
    const updatedOrder = await order.save();

    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate('menuItem', 'name price category image')
      .populate('user', 'name email studentId');

    // Fire notification to student if status changed meaningfully
    if (status !== previousStatus && STATUS_NOTIFICATIONS[status]) {
      const notifTemplate = STATUS_NOTIFICATIONS[status];
      const itemName = populatedOrder.menuItem?.name || 'your item';
      await createNotification({
        userId: order.user,
        title: notifTemplate.title,
        message: notifTemplate.message.replace('your item', itemName),
        type: notifTemplate.type,
        relatedOrderId: order._id
      });
    }

    res.json(populatedOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    Chef/Staff confirms cash payment upon order collection
// @route   PUT /api/orders/:id/confirm-cash-payment
// @access  Private / Admin or Staff
const confirmCashPayment = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    if (order.paymentMethod !== 'CASH_ON_PICKUP') {
      res.status(400);
      throw new Error(
        'Only Cash on Pickup orders can be manually confirmed by kitchen staff. Online payments are verified automatically via Stripe.'
      );
    }

    order.paymentStatus = 'PAID';
    order.paidAt = new Date();
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('menuItem', 'name price category image')
      .populate('user', 'name email studentId');

    // Notify student: cash payment confirmed
    await createNotification({
      userId: order.user,
      title: 'Cash Payment Confirmed 💵',
      message: 'Your cash payment has been successfully confirmed by the kitchen staff.',
      type: 'CASH_PAYMENT_CONFIRMED',
      relatedOrderId: order._id
    });

    res.json(populatedOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order (Student can cancel if status is still Pending)
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      res.status(403);
      throw new Error('Not authorized to cancel this order');
    }

    if (order.status !== 'Pending') {
      res.status(400);
      throw new Error(`Cannot cancel order once it is in "${order.status}" state.`);
    }

    order.status = 'Cancelled';
    await order.save();

    // Restore stock to MenuItem
    const menuItem = await MenuItem.findById(order.menuItem);
    if (menuItem) {
      menuItem.dailyStock += order.quantity;
      menuItem.isAvailable = true;
      await menuItem.save();
    }

    res.json({ message: 'Order cancelled successfully and stock released', order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  confirmCashPayment,
  cancelOrder
};


