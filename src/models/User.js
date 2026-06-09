const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label:    { type: String },
  street:   { type: String, required: true },
  city:     { type: String, required: true },
  state:    { type: String },
  zip:      { type: String },
  country:  { type: String, default: 'BT' },
  isDefault:{ type: Boolean, default: false },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['customer', 'seller', 'admin'], default: 'customer' },

  // Embedded — addresses change with the user record, always accessed together
  addresses: [addressSchema],

  // Embedded — small array, always needed with user profile
  paymentPreferences: [{
    type:     { type: String, enum: ['card', 'paypal', 'cod'] },
    last4:    String,
    isDefault:{ type: Boolean, default: false },
  }],

  // Referenced — wishlist products are large, lazy-loaded separately
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  isActive:    { type: Boolean, default: true },
  lastLoginAt: { type: Date },
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
