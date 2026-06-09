const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name:     { type: String, required: true, unique: true },
  slug:     { type: String, required: true, unique: true, lowercase: true },
  parent:   { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  level:    { type: Number, default: 0 },
  imageUrl: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
