const Stripe = require('stripe');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

// Initialize Stripe with secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key');

const MAX_SLOT_CAPACITY = 25;

/**
 * @desc    Create Stripe Checkout Session for Online Payment
 * @route   POST /api/payments/create-checkout-session
 * @access  Private (Student)
 */
const createCheckoutSession = async (req, res, next) => {
  try {
    const { menuItemId, quantity, breakTimeSlot, specialInstructions } = req.body;

    if (!menuItemId || !quantity || !breakTimeSlot) {
      res.status(400);
      throw new Error('Please provide menuItemId, quantity, and breakTimeSlot');
    }

    // 1. Verify MenuItem exists & is available
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

    // 3. Check Canteen Preparation Capacity for the selected slot
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

    // 4. Calculate total amount TRUSTED server-side
    const totalAmount = menuItem.price * Number(quantity);

    // 5. Create pending Order in DB
    const order = await Order.create({
      user: req.user._id,
      menuItem: menuItem._id,
      quantity: Number(quantity),
      totalAmount,
      breakTimeSlot,
      specialInstructions: specialInstructions || '',
      status: 'Pending',
      paymentMethod: 'ONLINE',
      paymentStatus: 'PENDING'
    });

    // 6. Deduct stock from MenuItem
    menuItem.dailyStock -= Number(quantity);
    if (menuItem.dailyStock <= 0) {
      menuItem.isAvailable = false;
    }
    await menuItem.save();

    // 7. Base client URL for redirects
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:8081';

    // 8. Create Stripe Checkout Session (LKR Currency)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'lkr',
            product_data: {
              name: menuItem.name,
              description: `SLIIT Canteen Pre-order (${breakTimeSlot})`
            },
            unit_amount: Math.round(menuItem.price * 100) // Smallest currency unit for LKR
          },
          quantity: Number(quantity)
        }
      ],
      mode: 'payment',
      success_url: `${clientUrl}/?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}&status=success`,
      cancel_url: `${clientUrl}/?order_id=${order._id}&status=cancelled`,
      metadata: {
        orderId: order._id.toString(),
        userId: req.user._id.toString()
      },
      customer_email: req.user.email || undefined
    });

    // 9. Save stripeSessionId to Order
    order.stripeSessionId = session.id;
    await order.save();

    // 10. Notify student that order placed + payment pending
    await createNotification({
      userId: req.user._id,
      title: 'Order Placed Successfully! 🎉',
      message: `Your order for "${menuItem.name}" has been placed. Complete your payment to confirm.`,
      type: 'ORDER_PLACED',
      relatedOrderId: order._id
    });

    // 11. Notify chefs about new order
    const chefs = await User.find({ role: 'chef' }).select('_id');
    for (const chef of chefs) {
      await createNotification({
        userId: chef._id,
        title: 'New Order Received! 🍳',
        message: `New online order for "${menuItem.name}" × ${quantity} — slot: ${breakTimeSlot}.`,
        type: 'NEW_ORDER',
        relatedOrderId: order._id
      });
    }

    res.status(201).json({
      checkoutUrl: session.url,
      sessionId: session.id,
      orderId: order._id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify Stripe Checkout Session & update payment status
 * @route   GET /api/payments/verify-session/:sessionId
 * @access  Private (Student)
 */
const verifySession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      res.status(400);
      throw new Error('Stripe session ID is required');
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      res.status(404);
      throw new Error('Stripe checkout session not found');
    }

    const orderId = session.metadata?.orderId;
    let order;

    if (orderId) {
      order = await Order.findById(orderId);
    } else {
      order = await Order.findOne({ stripeSessionId: sessionId });
    }

    if (!order) {
      res.status(404);
      throw new Error('Associated order not found for this payment session');
    }

    // Verify student ownership
    if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      res.status(403);
      throw new Error('Not authorized to verify this payment');
    }

    // Check payment status from Stripe
    const wasAlreadyPaid = order.paymentStatus === 'PAID';
    if (session.payment_status === 'paid' && !wasAlreadyPaid) {
      order.paymentStatus = 'PAID';
      order.paidAt = new Date();
      if (session.payment_intent) {
        order.stripePaymentIntentId = session.payment_intent.toString();
      }
      await order.save();

      // Notify student: payment successful (only once, not on repeat verify calls)
      await createNotification({
        userId: order.user,
        title: 'Payment Successful! 💳',
        message: 'Your online payment has been completed successfully. Your order is confirmed!',
        type: 'PAYMENT_SUCCESS',
        relatedOrderId: order._id
      });
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('menuItem', 'name price category image preparationTimeMinutes')
      .populate('user', 'name email studentId');

    res.json({
      success: true,
      paymentStatus: order.paymentStatus,
      order: populatedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Stripe Webhook Listener for async payment events
 * @route   POST /api/payments/webhook
 * @access  Public (Stripe Signature Verified)
 */
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const isPlaceholderSecret = !webhookSecret || webhookSecret.includes('xxxxxxxx') || webhookSecret.includes('YOUR_');
    if (!isPlaceholderSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // Fallback for local dev mode when Stripe CLI is not listening
      console.log('ℹ️ Webhook running in Dev Mode (Signature check skipped for placeholder secret)');
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error(`⚠️ Webhook Signature Verification Failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (orderId && session.payment_status === 'paid') {
        const order = await Order.findById(orderId);
        if (order && order.paymentStatus !== 'PAID') {
          order.paymentStatus = 'PAID';
          order.paidAt = new Date();
          if (session.payment_intent) {
            order.stripePaymentIntentId = session.payment_intent.toString();
          }
          await order.save();
          console.log(`✅ Payment Webhook: Order #${order._id} marked as PAID via Stripe.`);
          // Notify student via webhook (async path, only fires if verifySession missed it)
          await createNotification({
            userId: order.user,
            title: 'Payment Successful! 💳',
            message: 'Your online payment has been completed successfully. Your order is confirmed!',
            type: 'PAYMENT_SUCCESS',
            relatedOrderId: order._id
          });
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });
      if (order) {
        order.paymentStatus = 'FAILED';
        await order.save();
        console.log(`❌ Payment Webhook: Order #${order._id} payment failed.`);
        await createNotification({
          userId: order.user,
          title: 'Payment Failed ❌',
          message: 'Your payment could not be completed. Please try placing your order again.',
          type: 'PAYMENT_FAILED',
          relatedOrderId: order._id
        });
      }
      break;
    }

    default:
      console.log(`Unhandled Stripe event type ${event.type}`);
  }

  res.status(200).json({ received: true });
};

module.exports = {
  createCheckoutSession,
  verifySession,
  handleStripeWebhook
};
