const Review  = require('../models/Review');
const Product = require('../models/Product');

exports.createReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, title, body, orderId } = req.body;

    const review = await Review.create({
      product:            productId,
      user:               req.user.id,
      order:              orderId,
      rating,
      title,
      body,
      isVerifiedPurchase: !!orderId,
    });

    // Update denormalized avgRating and reviewCount on the product
    const stats = await Review.aggregate([
      { $match: { product: review.product } },
      { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    if (stats.length) {
      await Product.findByIdAndUpdate(productId, {
        avgRating:   Math.round(stats[0].avg * 10) / 10,
        reviewCount: stats[0].count,
      });
    }

    res.status(201).json({ review });
  } catch (err) { next(err); }
};

exports.getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ product: productId })
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Review.countDocuments({ product: productId }),
    ]);

    res.json({ reviews, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err) { next(err); }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ message: 'Review deleted' });
  } catch (err) { next(err); }
};
