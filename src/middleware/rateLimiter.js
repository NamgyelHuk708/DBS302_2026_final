const redis = require('../services/redisService');

function rateLimiter({ limit = 10, windowSec = 60, keyPrefix = 'rate:limit' }) {
  return async (req, res, next) => {
    const ip  = req.ip;
    const key = `${keyPrefix}:${req.path}:${ip}`;

    const count = await redis.incr(key);

    // Set TTL only on first request in the window
    if (count === 1) await redis.expire(key, windowSec);

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));

    if (count >= limit) {
      return res.status(429).json({
        error: `Too many requests. Try again in ${windowSec} seconds.`,
      });
    }
    next();
  };
}

module.exports = rateLimiter;
