const jwt   = require('jsonwebtoken');
const redis = require('../services/redisService');

exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token provided' });

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify session still exists in Redis
    const session = await redis.hgetall(`session:${decoded.id}`);
    if (!session) return res.status(401).json({ error: 'Session expired' });

    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

exports.optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next();
    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const session = await redis.hgetall(`session:${decoded.id}`);
    if (session) req.user = { id: decoded.id, role: decoded.role };
  } catch (err) {
    // Token invalid or missing — continue as guest
  }
  next();
};

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: 'Access denied' });
  next();
};
