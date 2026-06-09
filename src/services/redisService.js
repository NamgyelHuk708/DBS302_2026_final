const { getRedis } = require('../config/redis');

const redisService = {

  // ── String operations ──────────────────────────────────────────────────────
  async get(key) {
    const val = await getRedis().get(key);
    return val ? JSON.parse(val) : null;
  },

  async set(key, value, ttlSeconds = null) {
    const str = JSON.stringify(value);
    if (ttlSeconds) {
      await getRedis().setex(key, ttlSeconds, str);
    } else {
      await getRedis().set(key, str);
    }
  },

  async del(...keys) {
    return getRedis().del(...keys);
  },

  async incr(key) {
    return getRedis().incr(key);
  },

  async expire(key, ttl) {
    return getRedis().expire(key, ttl);
  },

  // ── Hash operations ────────────────────────────────────────────────────────
  async hset(key, field, value) {
    return getRedis().hset(key, field, JSON.stringify(value));
  },

  async hget(key, field) {
    const val = await getRedis().hget(key, field);
    return val ? JSON.parse(val) : null;
  },

  async hgetall(key) {
    const data = await getRedis().hgetall(key);
    if (!data) return null;
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, JSON.parse(v)])
    );
  },

  async hdel(key, ...fields) {
    return getRedis().hdel(key, ...fields);
  },

  async hset_raw(key, obj) {
    const flat = Object.entries(obj).flatMap(([k, v]) => [k, JSON.stringify(v)]);
    return getRedis().hset(key, ...flat);
  },

  // ── List operations ────────────────────────────────────────────────────────
  async lpush(key, value, maxLen = 20) {
    const r = getRedis();
    await r.lpush(key, JSON.stringify(value));
    await r.ltrim(key, 0, maxLen - 1);
  },

  async lrange(key, start = 0, stop = -1) {
    const vals = await getRedis().lrange(key, start, stop);
    return vals.map(v => JSON.parse(v));
  },

  // ── Sorted Set operations ──────────────────────────────────────────────────
  async zadd(key, score, member) {
    return getRedis().zadd(key, score, member);
  },

  async zincrby(key, increment, member) {
    return getRedis().zincrby(key, increment, member);
  },

  async zrevrange(key, start = 0, stop = 9, withScores = false) {
    if (withScores) {
      return getRedis().zrevrange(key, start, stop, 'WITHSCORES');
    }
    return getRedis().zrevrange(key, start, stop);
  },

  // ── HyperLogLog ────────────────────────────────────────────────────────────
  async pfadd(key, ...elements) {
    return getRedis().pfadd(key, ...elements);
  },

  async pfcount(key) {
    return getRedis().pfcount(key);
  },
};

module.exports = redisService;
