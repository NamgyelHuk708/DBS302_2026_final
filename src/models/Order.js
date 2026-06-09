const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  product:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantSku: { type: String, required: true },
  name:       { type: String, required: true },
  price:      { type: Number, required: true },
  quantity:   { type: Number, required: true, min: 1 },
  subtotal:   { type: Number, required: true },
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  status:    { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  note:      { type: String },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Embedded — line items belong to this order only, always retrieved together
  items: [lineItemSchema],

  // Embedded — address snapshot so changes to user address don't affect past orders
  shippingAddress: {
    street:  String,
    city:    String,
    state:   String,
    zip:     String,
    country: String,
  },

  status: {
    type: String,
    enum: ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'placed',
  },

  // Embedded — audit trail of status changes
  statusHistory: [statusHistorySchema],

  totalAmount:   { type: Number, required: true },
  paymentMethod: { type: String },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
