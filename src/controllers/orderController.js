const mongoose  = require('mongoose');
const Order     = require('../models/Order');
const Inventory = require('../models/Inventory');
const redis     = require('../services/redisService');

function generateOrderNumber() {
  return 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

exports.placeOrder = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction({
      readConcern:  { level: 'snapshot' },
      writeConcern: { w: 'majority', j: true },
    });

    const { items, shippingAddress, paymentMethod } = req.body;
    let totalAmount = 0;

    // Step 1: Check and decrement inventory (inside transaction)
    for (const item of items) {
      const inv = await Inventory.findOne(
        { product: item.productId, variantSku: item.variantSku },
        null,
        { session }
      );

      if (!inv || inv.quantity < item.quantity) {
        await session.abortTransaction();
        return res.status(409).json({
          error: `Insufficient stock for SKU: ${item.variantSku}`,
        });
      }

      await Inventory.findOneAndUpdate(
        { product: item.productId, variantSku: item.variantSku },
        { $inc: { quantity: -item.quantity } },
        { session }
      );

      totalAmount += item.price * item.quantity;
    }

    // Step 2: Create order document (inside transaction)
    const orderData = {
      orderNumber: generateOrderNumber(),
      user:        req.user.id,
      items:       items.map(i => ({
        product:    i.productId,
        variantSku: i.variantSku,
        name:       i.name,
        price:      i.price,
        quantity:   i.quantity,
        subtotal:   i.price * i.quantity,
      })),
      shippingAddress,
      paymentMethod,
      totalAmount,
      status: 'placed',
      statusHistory: [{ status: 'placed', timestamp: new Date() }],
    };

    const [order] = await Order.create([orderData], { session });

    // Step 3: Commit the MongoDB transaction
    await session.commitTransaction();

    // Step 4: Clear cart from Redis (after commit, outside transaction)
    await redis.del(`cart:${req.user.id}`);

    // Update trending leaderboard — purchases weight 2x more than views
    const month = new Date().toISOString().slice(0, 7);
    for (const item of items) {
      await redis.zincrby('trending:products', item.quantity * 2, item.productId);
    }

    // Update seller leaderboard for the month
    await redis.zincrby(`leaderboard:sellers:${month}`, order.totalAmount, order.user.toString());

    res.status(201).json({ order });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name images');
    res.json({ orders });
  } catch (err) { next(err); }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status,
        $push: { statusHistory: { status, note, timestamp: new Date() } },
      },
      { new: true }
    );
    res.json({ order });
  } catch (err) { next(err); }
};
