const redis = require('../services/redisService');

const CART_TTL = 60 * 60 * 24 * 7; // 7 days

function getCartKey(req) {
  return req.user ? `cart:${req.user.id}` : `cart:guest:${req.guestId}`;
}

exports.getCart = async (req, res, next) => {
  try {
    const cart = await redis.hgetall(getCartKey(req)) || {};
    res.json({ cart });
  } catch (err) { next(err); }
};

exports.addToCart = async (req, res, next) => {
  try {
    const { productId, variantSku, name, price, quantity = 1 } = req.body;
    const key   = getCartKey(req);
    const field = `${productId}:${variantSku}`;

    const existing = await redis.hget(key, field);
    const qty = existing ? existing.quantity + quantity : quantity;

    await redis.hset(key, field, { productId, variantSku, name, price, quantity: qty });
    await redis.expire(key, CART_TTL);

    res.json({ message: 'Added to cart', field, quantity: qty });
  } catch (err) { next(err); }
};

exports.updateCart = async (req, res, next) => {
  try {
    const { productId, variantSku, quantity } = req.body;
    const key   = getCartKey(req);
    const field = `${productId}:${variantSku}`;

    if (quantity <= 0) {
      await redis.hdel(key, field);
      return res.json({ message: 'Item removed' });
    }

    const existing = await redis.hget(key, field);
    if (!existing) return res.status(404).json({ error: 'Item not in cart' });

    await redis.hset(key, field, { ...existing, quantity });
    res.json({ message: 'Cart updated' });
  } catch (err) { next(err); }
};

exports.clearCart = async (req, res, next) => {
  try {
    await redis.del(getCartKey(req));
    res.json({ message: 'Cart cleared' });
  } catch (err) { next(err); }
};
