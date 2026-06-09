const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  sku:    { type: String, required: true },
  size:   { type: String },
  color:  { type: String },
  price:  { type: Number, required: true },
  stock:  { type: Number, default: 0 },
  images: [String],
}, { _id: true });

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true, lowercase: true },
  description: { type: String },
  brand:       { type: String },

  // Referenced — categories exist independently, queried alone
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  seller:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Embedded — variants always shown with a product
  variants: [variantSchema],

  basePrice: { type: Number, required: true },

  // Polymorphic attributes — Map allows any key per category
  // e.g., { ram: "16GB", storage: "512GB" } for laptops
  //        { fabric: "cotton", fit: "slim" } for clothing
  attributes: { type: Map, of: mongoose.Schema.Types.Mixed },

  tags:   [String],
  images: [String],

  isActive:   { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },

  // Denormalized averages — avoids joining reviews on every list view
  avgRating:   { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  viewCount:   { type: Number, default: 0 },
  salesCount:  { type: Number, default: 0 },
}, { timestamps: true });

// Text index for full-text search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Compound index — common filter: category + price range + active
productSchema.index({ category: 1, basePrice: 1, isActive: 1 });

productSchema.index({ seller: 1 });

module.exports = mongoose.model('Product', productSchema);
