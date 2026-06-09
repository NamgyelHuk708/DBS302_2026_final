const jwt   = require('jsonwebtoken');
const User  = require('../models/User');
const redis = require('../services/redisService');

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const user  = await User.create({ name, email, password, role });
    const token = signToken(user);

    // Store session in Redis Hash with TTL
    const sessionKey = `session:${user._id}`;
    await redis.hset_raw(sessionKey, {
      userId:    user._id.toString(),
      role:      user.role,
      email:     user.email,
      createdAt: Date.now().toString(),
    });
    await redis.expire(sessionKey, 86400);

    res.status(201).json({ token, user });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user);

    const sessionKey = `session:${user._id}`;
    await redis.hset_raw(sessionKey, {
      userId:    user._id.toString(),
      role:      user.role,
      email:     user.email,
      createdAt: Date.now().toString(),
    });
    await redis.expire(sessionKey, 86400);

    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    res.json({ token, user });
  } catch (err) { next(err); }
};

exports.logout = async (req, res, next) => {
  try {
    await redis.del(`session:${req.user.id}`);
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
};
