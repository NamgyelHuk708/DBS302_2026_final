const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  rating:   { type: Number, required: true, min: 1, max: 5 },
  title:    { type: String },
  body:     { type: String },
  isVerifiedPurchase: { type: Boolean, default: false },
}, { timestamps: true });

// One review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, rating: -1 });

module.exports = mongoose.model('Review', reviewSchema);
