const User    = require('../models/User');
const Product = require('../models/Product');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('wishlist', 'name slug basePrice images');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'addresses', 'paymentPreferences'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    res.json({ user });
  } catch (err) { next(err); }
};

exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await User.findByIdAndUpdate(req.user.id, { $addToSet: { wishlist: productId } });
    res.json({ message: 'Added to wishlist' });
  } catch (err) { next(err); }
};

exports.removeFromWishlist = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $pull: { wishlist: req.params.productId } });
    res.json({ message: 'Removed from wishlist' });
  } catch (err) { next(err); }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json({ users });
  } catch (err) { next(err); }
};
