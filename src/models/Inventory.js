const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product:           { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantSku:        { type: String, required: true },
  quantity:          { type: Number, required: true, min: 0 },
  reserved:          { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  warehouse:         { type: String, default: 'main' },
}, { timestamps: true });

// Compound unique: one record per product-variant
inventorySchema.index({ product: 1, variantSku: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
