const redis   = require('../services/redisService');
const Product = require('../models/Product');

exports.getTrending = async (req, res, next) => {
  try {
    const results = await redis.zrevrange('trending:products', 0, 9, true);

    const productIds = [];
    const scores     = {};
    for (let i = 0; i < results.length; i += 2) {
      productIds.push(results[i]);
      scores[results[i]] = parseFloat(results[i + 1]);
    }

    const products = await Product.find({ _id: { $in: productIds } })
      .select('name slug images basePrice avgRating')
      .lean();

    products.sort((a, b) => scores[b._id.toString()] - scores[a._id.toString()]);

    res.json({
      trending: products.map(p => ({
        ...p,
        trendingScore: scores[p._id.toString()],
      })),
    });
  } catch (err) { next(err); }
};

exports.getRecentlyViewed = async (req, res, next) => {
  try {
    const productIds = await redis.lrange(`recently:viewed:${req.user.id}`, 0, 9);
    if (!productIds.length) return res.json({ products: [] });

    const products = await Product.find({ _id: { $in: productIds } })
      .select('name slug images basePrice')
      .lean();

    res.json({ products });
  } catch (err) { next(err); }
};

exports.getUniqueVisitors = async (req, res, next) => {
  try {
    const count = await redis.pfcount(`uv:product:${req.params.id}`);
    res.json({ productId: req.params.id, uniqueVisitors: count });
  } catch (err) { next(err); }
};

exports.getSellerLeaderboard = async (req, res, next) => {
  try {
    const month   = req.query.month || new Date().toISOString().slice(0, 7);
    const results = await redis.zrevrange(`leaderboard:sellers:${month}`, 0, 9, true);
    res.json({ month, leaderboard: results });
  } catch (err) { next(err); }
};
