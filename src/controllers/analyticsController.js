const Order     = require('../models/Order');
const Inventory = require('../models/Inventory');
require('../models/Product');

exports.monthlyRevenue = async (req, res, next) => {
  try {
    const pipeline = [
      { $match: { status: { $in: ['delivered', 'confirmed'] } } },
      { $group: {
        _id: {
          year:  { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        totalRevenue:  { $sum: '$totalAmount' },
        orderCount:    { $sum: 1 },
        avgOrderValue: { $avg: '$totalAmount' },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $project: {
        _id:           0,
        year:          '$_id.year',
        month:         '$_id.month',
        totalRevenue:  { $round: ['$totalRevenue', 2] },
        orderCount:    1,
        avgOrderValue: { $round: ['$avgOrderValue', 2] },
      }},
    ];

    const result = await Order.aggregate(pipeline);
    res.json({ monthlyRevenue: result });
  } catch (err) { next(err); }
};

exports.topProducts = async (req, res, next) => {
  try {
    const pipeline = [
      { $match: { status: { $in: ['delivered', 'confirmed', 'shipped'] } } },
      { $unwind: '$items' },
      { $group: {
        _id:          '$items.product',
        productName:  { $first: '$items.name' },
        totalSold:    { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.subtotal' },
        orderCount:   { $sum: 1 },
      }},
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      { $lookup: {
        from:         'products',
        localField:   '_id',
        foreignField: '_id',
        as:           'productDetails',
      }},
      { $project: {
        productName:  1,
        totalSold:    1,
        totalRevenue: { $round: ['$totalRevenue', 2] },
        orderCount:   1,
        avgRating:    { $arrayElemAt: ['$productDetails.avgRating', 0] },
      }},
    ];

    const result = await Order.aggregate(pipeline);
    res.json({ topProducts: result });
  } catch (err) { next(err); }
};

exports.lowStockReport = async (req, res, next) => {
  try {
    const items = await Inventory.find({
      $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
    })
      .populate('product', 'name slug')
      .sort({ quantity: 1 });

    res.json({ lowStockItems: items });
  } catch (err) { next(err); }
};

// Most viewed (HyperLogLog UV count from Redis) vs most purchased (from orders)
exports.viewedVsPurchased = async (req, res, next) => {
  try {
    const redis = require('../services/redisService');

    // Top 10 most purchased from orders aggregate
    const purchasedPipeline = [
      { $match: { status: { $in: ['delivered', 'confirmed', 'shipped'] } } },
      { $unwind: '$items' },
      { $group: {
        _id:         '$items.product',
        productName: { $first: '$items.name' },
        totalSold:   { $sum: '$items.quantity' },
      }},
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ];
    const purchased = await Order.aggregate(purchasedPipeline);

    // For each product, fetch the UV estimate from Redis HyperLogLog
    const results = await Promise.all(purchased.map(async (p) => {
      const uvCount = await redis.pfcount(`uv:product:${p._id}`);
      return {
        productId:   p._id,
        productName: p.productName,
        totalSold:   p.totalSold,
        uniqueViews: uvCount,
        conversionRate: uvCount > 0
          ? ((p.totalSold / uvCount) * 100).toFixed(2) + '%'
          : 'N/A',
      };
    }));

    res.json({ viewedVsPurchased: results });
  } catch (err) { next(err); }
};
